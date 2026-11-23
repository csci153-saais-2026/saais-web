import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../functions/_shared/http.ts";
import { readAssistantConfig } from "../functions/_shared/matt-assistant.ts";

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

test("supports native Google Gemini generateContent requests and filters internal thought parts", async () => {
  const vars = {
    SAAIS_ASSISTANT_GEMINI_API_KEY: "gemini-secret-key",
    SAAIS_ASSISTANT_GEMINI_MODEL: "gemini-2.5-flash",
  };
  const assistant = readAssistantConfig((name) => vars[name]);
  assert.ok(assistant);
  assert.equal(assistant.provider, "gemini");
  assert.equal(assistant.protocol, "gemini");
  assert.equal(
    assistant.endpoint,
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  );

  let capturedUrl = "";
  let capturedHeaders;
  let capturedBody;
  const handler = createHandler("students", {
    env: { ...settings, assistant },
    fetch: async (url, options) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
      if (url.endsWith("/matt_assistant_context"))
        return Response.json({
          grounded_at: "2026-11-21T12:00:00Z",
          request: {
            message: "What is recorded?",
            history: [
              { role: "user", content: "Prior question" },
              { role: "assistant", content: "Prior answer" },
            ],
          },
          record: { gwa: 1.75 },
        });
      capturedUrl = url;
      capturedHeaders = options.headers;
      capturedBody = JSON.parse(options.body);
      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                { text: "Internal reasoning", thought: true },
                { text: "The student record shows a GWA of 1.75." },
              ],
            },
          },
        ],
      });
    },
  });

  const response = await handler(ask());
  assert.equal(response.status, 200);
  assert.equal(capturedUrl, assistant.endpoint);
  assert.equal(capturedHeaders["x-goog-api-key"], "gemini-secret-key");
  assert.equal(capturedHeaders.Authorization, undefined);
  assert.equal(capturedBody.generationConfig.maxOutputTokens, 800);
  assert.equal(capturedBody.contents.length, 3);
  assert.equal(capturedBody.contents[0].role, "user");
  assert.equal(capturedBody.contents[1].role, "model");
  assert.equal(capturedBody.contents[2].role, "user");
  const data = await response.json();
  assert.equal(data.answer, "The student record shows a GWA of 1.75.");
  assert.equal(data.mutates_records, false);
});

test("orders configured Gemini, NVIDIA NIM, and OpenAI-compatible providers and falls back on upstream failure", async () => {
  const vars = {
    SAAIS_ASSISTANT_PROVIDERS: "gemini,nvidia,openai",
    SAAIS_ASSISTANT_GEMINI_API_KEY: "gemini-key",
    SAAIS_ASSISTANT_GEMINI_MODEL: "gemini-2.5-flash",
    SAAIS_ASSISTANT_NVIDIA_API_KEY: "nvidia-key",
    SAAIS_ASSISTANT_NVIDIA_MODEL: "meta/llama-3.3-70b-instruct",
    SAAIS_ASSISTANT_OPENAI_ENDPOINT:
      "https://openai-compatible.example.test/v1/chat/completions",
    SAAIS_ASSISTANT_OPENAI_API_KEY: "openai-key",
    SAAIS_ASSISTANT_OPENAI_MODEL: "gpt-4o-mini",
  };
  const assistant = readAssistantConfig((name) => vars[name]);
  assert.ok(assistant);
  assert.equal(assistant.providers?.length, 3);
  assert.deepEqual(
    assistant.providers.map((item) => item.provider),
    ["gemini", "nvidia", "openai"],
  );

  const attempted = [];
  const handler = createHandler("students", {
    env: { ...settings, assistant },
    fetch: async (url, options) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
      if (url.endsWith("/matt_assistant_context"))
        return Response.json(context);
      attempted.push({ url, options });
      if (url.includes("generativelanguage.googleapis.com")) {
        return Response.json(
          { error: { message: "Quota exceeded" } },
          { status: 429 },
        );
      }
      if (url === "https://integrate.api.nvidia.com/v1/chat/completions") {
        const body = JSON.parse(options.body);
        assert.equal(body.model, "meta/llama-3.3-70b-instruct");
        assert.equal(body.max_tokens, 800);
        assert.equal(options.headers.Authorization, "Bearer nvidia-key");
        return Response.json({
          choices: [
            {
              message: {
                content: [
                  {
                    type: "text",
                    text: "NVIDIA NIM fallback answer from academic facts.",
                  },
                ],
              },
            },
          ],
        });
      }
      throw new Error("Should not reach third provider when second succeeds");
    },
  });

  const response = await handler(ask());
  assert.equal(response.status, 200);
  assert.equal(attempted.length, 2);
  const data = await response.json();
  assert.equal(data.answer, "NVIDIA NIM fallback answer from academic facts.");
});

test("rejects non-HTTPS, credential-bearing, or path-injecting provider configs", () => {
  assert.equal(
    readAssistantConfig(
      (name) =>
        ({
          SAAIS_ASSISTANT_ENDPOINT: "http://insecure.example.test/v1/chat",
          SAAIS_ASSISTANT_API_KEY: "key",
          SAAIS_ASSISTANT_MODEL: "model",
        })[name],
    ),
    undefined,
  );
  assert.equal(
    readAssistantConfig(
      (name) =>
        ({
          SAAIS_ASSISTANT_ENDPOINT:
            "https://user:pass@assistant.example.test/v1/chat",
          SAAIS_ASSISTANT_API_KEY: "key",
          SAAIS_ASSISTANT_MODEL: "model",
        })[name],
    ),
    undefined,
  );
  assert.equal(
    readAssistantConfig(
      (name) =>
        ({
          SAAIS_ASSISTANT_GEMINI_API_KEY: "key",
          SAAIS_ASSISTANT_GEMINI_MODEL: "../malicious-path",
        })[name],
    ),
    undefined,
  );
});
