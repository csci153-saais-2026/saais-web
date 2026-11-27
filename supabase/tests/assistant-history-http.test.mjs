import assert from "node:assert/strict";
import { test } from "node:test";
import { createHandler } from "../functions/_shared/http.ts";

const student = "00000005-0000-4000-8000-000000000000";
const adviser = "00000004-0000-4000-8000-000000000000";
const env = {
  url: "https://supabase.example.test",
  publicKey: "public-key",
  origins: [],
};
const url = env.url + `/students/${student}/assistant`;
const header = { apikey: env.publicKey, Authorization: "Bearer user-token" };

test("assistant history uses the caller's authorization and only calls the scoped read RPC", async () => {
  const history = [
    { role: "user", content: "Question" },
    { role: "assistant", content: "Answer" },
  ];
  for (const scoped of [true, false]) {
    const contacted = [];
    const handler = createHandler("students", {
      env,
      fetch: async (endpoint, options) => {
        contacted.push(new URL(endpoint).pathname);
        if (endpoint.endsWith("/auth/v1/user"))
          return Response.json({ id: adviser });
        assert.equal(
          endpoint,
          env.url + "/rest/v1/rpc/saais_get_assistant_history",
        );
        assert.equal(options.headers.Authorization, header.Authorization);
        assert.deepEqual(JSON.parse(options.body), { p_student_id: student });
        return scoped
          ? Response.json(history)
          : Response.json(
              {
                code: "PT403",
                message: "Student is outside your adviser assignment.",
              },
              { status: 403 },
            );
      },
    });
    const result = await handler(new Request(url, { headers: header }));
    assert.equal(result.status, scoped ? 200 : 403);
    assert.deepEqual(contacted, [
      "/auth/v1/user",
      "/rest/v1/rpc/saais_get_assistant_history",
    ]);
    if (scoped) assert.deepEqual(await result.json(), history);
  }
});
