import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../functions/_shared/http.ts";

test("checks record scope before contacting the assistant provider", async () => {
  const endpoint = "https://assistant.example.test/chat/completions";
  const id = "00000005-0000-4000-8000-000000000000";
  const env = {
    url: "https://example.supabase.co",
    publicKey: "test",
    origins: [],
    assistant: { endpoint, key: "provider-test-key", model: "test" },
  };
  let allowed = false;
  let called = 0;
  const handler = createHandler("students", {
    env,
    fetch: async (url, options) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id });
      if (url.endsWith("/matt_assistant_context")) {
        if (!allowed)
          return Response.json(
            { code: "PT403", message: "Denied" },
            { status: 403 },
          );
        return Response.json({
          grounded_at: "2026-11-13T00:00:00Z",
          request: { message: "What is the GWA?" },
          record: { gwa: 2 },
        });
      }
      assert.equal(url, endpoint);
      assert.equal(options.headers.Authorization, "Bearer provider-test-key");
      called++;
      return Response.json({
        choices: [{ message: { content: "The record shows a GWA of 2." } }],
      });
    },
  });
  const request = () =>
    new Request(env.url + "/students/" + id + "/assistant", {
      method: "POST",
      headers: {
        apikey: "test",
        Authorization: "Bearer session",
        "Content-Type": "application/json",
      },
      body: '{"message":"What is the GWA?"}',
    });
  assert.equal((await handler(request())).status, 403);
  assert.equal(called, 0);
  allowed = true;
  const result = await handler(request());
  assert.equal(result.status, 200);
  const data = await result.json();
  assert.equal(data.mutates_records, false);
  assert.match(data.answer, /GWA of 2/);
  assert.equal(called, 1);
});

const student = "00000005-0000-4000-8000-000000000000";
const settings = {
  url: "https://supabase.example.test",
  publicKey: "test-public-key",
  origins: [],
  assistant: {
    endpoint: "https://assistant.example.test/chat/completions",
    key: "private-test-provider-key",
    model: "test-model",
  },
};
const context = {
  grounded_at: "2026-11-21T12:00:00Z",
  request: { message: "What is recorded?" },
  record: { gwa: 2 },
};
const headers = {
  apikey: settings.publicKey,
  Authorization: "Bearer current-adviser",
  "Content-Type": "application/json",
};
const ask = (requestHeaders = headers) =>
  new Request(`${settings.url}/students/${student}/assistant`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(context.request),
  });

function assistantHandler(provider, upstreamContext = context) {
  return createHandler("students", {
    env: settings,
    fetch: async (url, options) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
      if (url.endsWith("/matt_assistant_context"))
        return Response.json(upstreamContext);
      return provider(url, options);
    },
  });
}

test("assistant requires authentication and current-adviser scope before any provider request", async () => {
  let providerCalls = 0;
  const handler = createHandler("students", {
    env: settings,
    fetch: async (url) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
      if (url.endsWith("/matt_assistant_context"))
        return Response.json(
          { code: "PT403", message: "Current adviser required." },
          { status: 403 },
        );
      providerCalls++;
      throw new Error("Unauthorized provider request.");
    },
  });
  assert.equal(
    (await handler(ask({ "Content-Type": "application/json" }))).status,
    401,
  );
  const rejected = await handler(ask());
  assert.equal(rejected.status, 403);
  assert.equal(providerCalls, 0);
  assert.equal((await rejected.json()).details, null);
});

test("assistant provider failures return a sanitized declared error", async () => {
  const failures = [
    () =>
      Response.json(
        { detail: "private provider information" },
        { status: 503 },
      ),
    () => {
      throw new DOMException("private provider timeout", "TimeoutError");
    },
    () => new Response("not JSON"),
    () => Response.json({ choices: [] }),
    () => Response.json({ choices: [{ message: { content: "  " } }] }),
    () => Response.json({ choices: [{ message: { content: 42 } }] }),
    () => new Response("x".repeat(65537)),
  ];
  for (const failure of failures) {
    const result = await assistantHandler(failure)(ask());
    assert.equal(result.status, 500);
    assert.deepEqual(await result.json(), {
      code: "XX000",
      message: "The operation could not be completed.",
      details: null,
      hint: null,
    });
  }
});

test("assistant response follows the approved schema and applies its output budget", async () => {
  const runtime = (
    await import("../functions/_shared/matt-contract.json", {
      with: { type: "json" },
    })
  ).default;
  const schema = runtime.schemas.AdvisingAIResponse;
  const result = await assistantHandler((_url, options) => {
    assert.equal(options.redirect, "error");
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(
      options.headers.Authorization,
      `Bearer ${settings.assistant.key}`,
    );
    return Response.json({
      choices: [{ message: { content: "A".repeat(9000) } }],
      mutates_records: true,
    });
  })(ask());
  assert.equal(result.status, 200);
  const response = await result.json();
  assert.deepEqual(Object.keys(response).sort(), [...schema.required].sort());
  for (const field of ["answer", "verification_notice"]) {
    assert.equal(typeof response[field], "string");
    assert.ok(
      response[field].trim().length >= schema.properties[field].minLength,
    );
    assert.ok(response[field].length <= schema.properties[field].maxLength);
  }
  assert.equal(response.answer.length, 8000);
  assert.equal(response.grounded_at, context.grounded_at);
  assert.ok(Number.isFinite(Date.parse(response.grounded_at)));
  assert.equal(
    response.mutates_records,
    schema.properties.mutates_records.const,
  );
});

test("malformed context is rejected before sending any facts to the provider", async () => {
  let called = false;
  const result = await assistantHandler(
    () => {
      called = true;
      return Response.json({});
    },
    { ...context, grounded_at: "unverified timestamp" },
  )(ask());
  assert.equal(result.status, 500);
  assert.equal(called, false);
});
