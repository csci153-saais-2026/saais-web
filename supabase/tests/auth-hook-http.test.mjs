import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createAuthHookHandler,
  signStandardWebhook,
} from "../functions/_shared/auth-hook.ts";

const env = {
  url: "https://supabase.example.test",
  serviceKey: "service-key",
  hookSecret: `v1,whsec_${Buffer.from("super-secret-hook-key-32-bytes!!").toString("base64")}`,
};

async function signedRequest(path, body, timestamp = 1_700_000_000) {
  const raw = JSON.stringify(body);
  const webhookId = "msg_test_1";
  const signature = await signStandardWebhook(
    env.hookSecret,
    webhookId,
    timestamp,
    raw,
  );
  return new Request(env.url + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "webhook-id": webhookId,
      "webhook-timestamp": String(timestamp),
      "webhook-signature": signature,
    },
    body: raw,
  });
}

test("auth-hook rejects unsigned, tampered, or stale webhook requests before touching the database", async () => {
  let dbCalls = 0;
  const handler = createAuthHookHandler(
    env,
    async () => {
      dbCalls++;
      return Response.json({ allowed: true });
    },
    () => 1_700_000_000,
  );

  const unsigned = await handler(
    new Request(env.url + "/auth-hook/before-user-created", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: { email: "user@gmail.com" } }),
    }),
  );
  assert.equal(unsigned.status, 401);

  const stale = await handler(
    await signedRequest(
      "/auth-hook/before-user-created",
      { user: { email: "user@gmail.com" } },
      1_699_999_000,
    ),
  );
  assert.equal(stale.status, 401);

  const tampered = await signedRequest("/auth-hook/before-user-created", {
    user: { email: "user@vsu.edu.ph" },
  });
  const tamperedRes = await handler(
    new Request(tampered.url, {
      method: "POST",
      headers: tampered.headers,
      body: JSON.stringify({ user: { email: "other@vsu.edu.ph" } }),
    }),
  );
  assert.equal(tamperedRes.status, 401);
  assert.equal(dbCalls, 0);
});

test("auth-hook durably evaluates before-user-created and custom-access-token via service RPCs", async () => {
  const calls = [];
  const handler = createAuthHookHandler(
    env,
    async (url, options) => {
      calls.push({ url, options });
      assert.equal(options.headers.Authorization, "Bearer service-key");
      assert.equal(options.headers["Content-Profile"], "public");
      const { p_event } = JSON.parse(options.body);
      if (url.endsWith("/saais_evaluate_before_user_created")) {
        if (p_event.user?.email === "outsider@gmail.com") {
          return Response.json({
            allowed: false,
            http_code: 403,
            message:
              "This institutional account is not pre-registered. Contact your department administrator.",
          });
        }
        return Response.json({ allowed: true });
      }
      if (url.endsWith("/saais_evaluate_access_token")) {
        if (p_event.user_id === "00000010-0000-4000-8000-000000000000") {
          return Response.json({
            allowed: false,
            http_code: 403,
            message: "This institutional account is disabled.",
          });
        }
        return Response.json({ allowed: true });
      }
      throw new Error(url);
    },
    () => 1_700_000_000,
  );

  const rejectedSignup = await handler(
    await signedRequest("/auth-hook/before-user-created", {
      user: { email: "outsider@gmail.com" },
    }),
  );
  assert.equal(rejectedSignup.status, 403);
  const rejectedBody = await rejectedSignup.json();
  assert.equal(rejectedBody.error.http_code, 403);

  const allowedSignup = await handler(
    await signedRequest("/auth-hook/before-user-created", {
      user: { email: "student@vsu.edu.ph" },
    }),
  );
  assert.equal(allowedSignup.status, 200);
  assert.deepEqual(await allowedSignup.json(), {});

  const disabledLogin = await handler(
    await signedRequest("/auth-hook/custom-access-token", {
      user_id: "00000010-0000-4000-8000-000000000000",
      claims: { sub: "00000010-0000-4000-8000-000000000000" },
    }),
  );
  assert.equal(disabledLogin.status, 403);

  const activeLogin = await handler(
    await signedRequest("/auth-hook/custom-access-token", {
      user_id: "00000005-0000-4000-8000-000000000000",
      claims: { sub: "00000005-0000-4000-8000-000000000000", role: "authenticated" },
    }),
  );
  assert.equal(activeLogin.status, 200);
  assert.deepEqual(await activeLogin.json(), {
    claims: { sub: "00000005-0000-4000-8000-000000000000", role: "authenticated" },
  });
  assert.equal(calls.length, 4);
});
