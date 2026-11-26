import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler, operationsFor } from "../functions/_shared/http.ts";
import catalog from "../functions/_shared/contract.json" with { type: "json" };
import academic from "../functions/_shared/academic-contract.json" with { type: "json" };
import { mattRoutes } from "../functions/_shared/academic-routes.ts";

const id = "00000005-0000-4000-8000-000000000000";
const env = {
  url: "https://supabase.example.test",
  publicKey: "test-public-key",
  serviceKey: "test-service-key",
  origins: [],
  assistant: {
    endpoint: "https://assistant.example.test/chat/completions",
    key: "test-provider-key",
    model: "test-model",
  },
};
const headers = {
  apikey: env.publicKey,
  Authorization: "Bearer test-session",
  "Content-Type": "application/json",
};
const registered = [
  ...catalog.operations,
  ...academic.operations.filter((operation) => mattRoutes.has(operation.id)),
];

function request(operation) {
  return new Request(env.url + operation.path.replace(/\{[^}]+\}/g, id), {
    method: operation.method,
    headers,
    ...(operation.bodyRequired ? { body: "{}" } : {}),
  });
}

test("the shared router registers all 81 operations once and forwards to the correct RPC", async () => {
  assert.equal(registered.length, 81);
  assert.equal(new Set(registered.map((operation) => operation.id)).size, 81);
  assert.equal(
    new Set(registered.map((operation) => operation.method + operation.path))
      .size,
    81,
  );
  for (const operation of registered) {
    const group = operation.path.split("/")[3];
    const fromGroup = operationsFor(group);
    assert.equal(
      fromGroup.filter((candidate) => candidate.id === operation.id).length,
      1,
    );
    // Photo upload has a validation and trusted-copy workflow, exercised separately.
    if (operation.id === "uploadStudentPhoto") continue;
    const calls = [];
    const handler = createHandler(group, {
      env,
      fetch: async (url, options) => {
        if (url.endsWith("/auth/v1/user")) return Response.json({ id });
        calls.push({ url, body: JSON.parse(options.body) });
        if (url.endsWith("/saais_record_assistant_turn")) {
          assert.equal(
            options.headers.Authorization,
            `Bearer ${env.serviceKey}`,
          );
          return new Response(null, { status: 204 });
        }
        if (url === env.assistant.endpoint) {
          return Response.json({
            choices: [{ message: { content: "Sample academic answer." } }],
          });
        }
        if (operation.status === null) {
          return Response.json(
            { code: "PT409", message: "Saved attempts must be preserved." },
            { status: 409 },
          );
        }
        if (operation.id === "askAdvisingAssistant") {
          return Response.json({
            grounded_at: "2026-11-21T00:00:00Z",
            request: { message: "Question" },
            record: {},
          });
        }
        if (operation.id === "listRecommendations")
          return Response.json({ excluded_count: 2, rows: [] });
        return Response.json({ operation: operation.id });
      },
    });
    const response = await handler(request(operation));
    assert.equal(response.status, operation.status ?? 409, operation.id);
    const assistant = operation.id === "askAdvisingAssistant";
    const rpc = assistant
      ? "matt_assistant_context"
      : mattRoutes.has(operation.id)
        ? "matt_operation"
        : "jerome_operation";
    assert.equal(calls[0].url, `${env.url}/rest/v1/rpc/${rpc}`, operation.id);
    assert.equal(calls.length, assistant ? 3 : 1, operation.id);
    if (!assistant) assert.equal(calls[0].body.p_operation, operation.id);
    if (operation.id === "listRecommendations") {
      assert.equal(response.headers.get("X-Excluded-Count"), "2");
      assert.deepEqual(await response.json(), []);
    }
  }
});

test("the reject-only delete route cannot emit a success response from an unexpected upstream", async () => {
  const operation = registered.find(
    (entry) => entry.id === "deleteOpenTermAttempt",
  );
  assert.equal(operation.status, null);
  const handler = createHandler("students", {
    env,
    fetch: async (url) =>
      url.endsWith("/user") ? Response.json({ id }) : Response.json({}),
  });
  assert.equal((await handler(request(operation))).status, 500);
});

test("student reads forward typed allowlisted query values and reject duplicated or unknown filters", async () => {
  let calls = 0;
  const handler = createHandler("students", {
    env,
    fetch: async (url, options) => {
      calls++;
      if (url.endsWith("/user")) return Response.json({ id });
      assert.deepEqual(JSON.parse(options.body).p_params, {
        limit: 5,
        offset: 0,
        search: "sample",
      });
      return Response.json({ items: [], total_count: 0 });
    },
  });
  const response = await handler(
    new Request(env.url + "/students?limit=5&offset=0&search=sample", {
      headers,
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
  for (const query of ["limit=5&limit=10", "limit=5.5", "actor_id=spoofed"]) {
    assert.equal(
      (await handler(new Request(env.url + "/students?" + query, { headers })))
        .status,
      400,
    );
  }
  assert.equal(calls, 2);
});
