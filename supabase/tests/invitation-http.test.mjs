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

function request(path, body, signedIn = false) {
  return new Request(env.url + path, {
    method: "POST",
    headers: {
      apikey: env.publicKey,
      "Content-Type": "application/json",
      ...(signedIn
        ? { Authorization: `Bearer header.${payload}.signature` }
        : {}),
    },
    body: JSON.stringify(body),
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
      if (rpc.p_stage === "prepare")
        return Response.json({ reservation_id: id, auth_ready: true });
      assert.match(rpc.p_token, /^[0-9a-f]{64}$/);
      return Response.json({ profile_id: id, success: true });
    },
  });
  const response = await handler(request("/auth/invite", invite, true));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { profile_id: id, success: true });
  assert.deepEqual(calls, ["prepare", "finish"]);
});
