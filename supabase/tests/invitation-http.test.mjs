import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler, operationsFor } from "../functions/_shared/http.ts";
import {
  createMailHandler,
  readMailEnvironment,
} from "../functions/_shared/mail.ts";

const id = "00000001-0000-4000-8000-000000000000";
const session = "00000001-0000-4000-8000-000000000001";
const payload = Buffer.from(JSON.stringify({ session_id: session })).toString(
  "base64url",
);
const env = {
  url: "https://supabase.example.test",
  publicKey: "public-key",
  serviceKey: "service-key",
  origins: [],
};
const token = "a".repeat(64);

function request(path, body, signedIn = false, extraHeaders = {}) {
  return new Request(env.url + path, {
    method: "POST",
    headers: {
      apikey: env.publicKey,
      "Content-Type": "application/json",
      ...extraHeaders,
      ...(signedIn
        ? { Authorization: `Bearer header.${payload}.signature` }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("pre-login invitations use the public key and forward a hash to the service RPC", async () => {
  assert.deepEqual(
    operationsFor("auth")
      .map((operation) => operation.id)
      .sort(),
    [
      "declineInviteToken",
      "inviteUser",
      "previewInviteToken",
      "verifyInviteToken",
    ],
  );
  const handler = createHandler("auth", {
    env,
    fetch: async (url, options) => {
      assert.match(url, /\/rpc\/saais_invitation_service$/);
      const rpc = JSON.parse(options.body);
      if (rpc.p_stage === "admit") {
        assert.deepEqual(rpc.p_body, {});
        assert.equal(rpc.p_token, null);
        return Response.json({});
      }
      assert.equal(rpc.p_actor, null);
      assert.notEqual(rpc.p_token, token);
      assert.equal(rpc.p_token, rpc.p_body.token);
      assert.equal(options.headers.apikey, env.serviceKey);
      return Response.json({ valid: true });
    },
  });
  const response = await handler(request("/auth/preview-invite", { token }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { valid: true });
  assert.equal((await handler(request("/auth/invite", {}))).status, 401);
});

test("invitation creation resumes after Auth exists and does not send credentials to the browser", async () => {
  const calls = [];
  const invite = {
    email: "synthetic-fixture@vsu.edu.ph",
    role: "admin",
    full_name: "Fixture",
  };
  const handler = createHandler("auth", {
    env,
    fetch: async (url, options) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id });
      const rpc = JSON.parse(options.body);
      calls.push(rpc.p_stage);
      assert.equal(rpc.p_actor, id);
      assert.equal(rpc.p_session, session);
      if (rpc.p_stage === "admit") return Response.json({});
      if (rpc.p_stage === "prepare")
        return Response.json({ reservation_id: id, auth_ready: true });
      assert.match(rpc.p_token, /^[0-9a-f]{64}$/);
      return Response.json({ profile_id: id, success: true });
    },
  });
  const response = await handler(request("/auth/invite", invite, true));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { profile_id: id, success: true });
  assert.deepEqual(calls, ["admit", "prepare", "finish"]);
});

const budgetError = {
  code: "PT429",
  message: "Request budget exceeded. Retry after 60 seconds.",
};

async function assertLimited(response) {
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.deepEqual(await response.json(), {
    ...budgetError,
    details: null,
    hint: null,
  });
}

for (const [route, operation, body, allowedStages] of [
  ["preview-invite", "previewInviteToken", {}, ["start"]],
  [
    "verify-invite",
    "verifyInviteToken",
    { password: "ValidPassword123" },
    ["start", "auth", "finishRedemption"],
  ],
  ["decline-invite", "declineInviteToken", { reason: "Declined" }, ["start"]],
]) {
  test(`${operation} admits before token or Auth work and stops all limited requests`, async () => {
    const calls = [];
    const handler = createHandler("auth", {
      env,
      fetch: async (url, options) => {
        if (url.includes("/auth/v1/admin/users/")) {
          calls.push("auth");
          return new Response(null, { status: 200 });
        }
        assert.match(url, /\/rpc\/saais_invitation_service$/);
        const rpc = JSON.parse(options.body);
        assert.equal(rpc.p_operation, operation);
        if (rpc.p_stage === "admit") {
          assert.deepEqual(rpc.p_body, {});
          assert.equal(rpc.p_token, null);
          assert.equal(rpc.p_actor, null);
          calls.push("admit");
          return calls.length === 1
            ? Response.json({})
            : Response.json(budgetError, { status: 429 });
        }
        calls.push(rpc.p_stage);
        return Response.json({ profile_id: id, success: true });
      },
    });
    const allowed = await handler(
      request(`/auth/${route}`, { ...body, token }),
    );
    assert.equal(allowed.status, 200);
    assert.deepEqual(calls, ["admit", ...allowedStages]);
    const limited = await Promise.all(
      ["b", "c", "d", "e"].map((character, index) =>
        handler(
          request(
            `/auth/${route}`,
            { ...body, token: character.repeat(64) },
            false,
            {
              "x-forwarded-for": `192.0.2.${index + 1}`,
              "x-client-id": character,
            },
          ),
        ),
      ),
    );
    for (const response of limited) await assertLimited(response);
    assert.deepEqual(
      calls.slice(1 + allowedStages.length),
      Array(4).fill("admit"),
    );
  });
}

for (const [group, path, operation] of [
  ["auth", "/auth/invite", "inviteUser"],
  ["accounts", `/accounts/${id}/resend-invite`, "resendAccountInvite"],
  ["accounts", `/accounts/${id}/revoke-invite`, "revokeAccountInvite"],
  ["students", "/students/import", "importStudentsBatch"],
]) {
  test(`${operation} stops when its authenticated request budget is exhausted`, async () => {
    const calls = [];
    const handler = createHandler(group, {
      env,
      fetch: async (url, options) => {
        if (url.endsWith("/auth/v1/user")) {
          calls.push("verify identity");
          return Response.json({ id });
        }
        calls.push(url);
        assert.match(url, /\/rpc\/saais_invitation_service$/);
        const rpc = JSON.parse(options.body);
        assert.equal(rpc.p_operation, operation);
        assert.equal(rpc.p_stage, "admit");
        assert.deepEqual(rpc.p_body, {});
        assert.equal(rpc.p_actor, id);
        assert.equal(rpc.p_session, session);
        return Response.json(budgetError, { status: 429 });
      },
    });
    const body = operation === "resendAccountInvite" ? undefined : {};
    await assertLimited(await handler(request(path, body, true)));
    assert.deepEqual(calls, [
      "verify identity",
      `${env.url}/rest/v1/rpc/saais_invitation_service`,
    ]);
  });
}
