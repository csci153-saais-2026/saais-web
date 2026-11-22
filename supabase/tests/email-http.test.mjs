import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createMailHandler,
  readMailEnvironment,
} from "../functions/_shared/mail.ts";

const id = "00000001-0000-4000-8000-000000000000";
const session = "00000001-0000-4000-8000-000000000001";
const env = { url: "https://supabase.example.test", serviceKey: "service-key" };
const token = "a".repeat(64);

test("mail delivery retries transient failures with the same provider idempotency key", async () => {
  const mail = {
    id,
    lease: session,
    kind: "invitation",
    email: "mail-fixture@example.test",
    subject: "Invitation",
    message: null,
    token,
  };
  const config = readMailEnvironment(
    (name) =>
      ({
        SUPABASE_URL: env.url,
        SUPABASE_SERVICE_ROLE_KEY: env.serviceKey,
        SAAIS_MAIL_WORKER_SECRET: "worker-secret",
        SAAIS_RESEND_API_KEY: "transport-key",
        SAAIS_MAIL_FROM: "fixture@example.test",
        SAAIS_SITE_URL: "https://site.example.test",
        SAAIS_MAIL_ALLOWED_RECIPIENTS: mail.email,
      })[name],
  );
  const keys = [];
  const outcomes = [];
  const handler = createMailHandler(config, async (url, options) => {
    if (url.endsWith("/saais_claim_email")) return Response.json([mail]);
    if (url.endsWith("/saais_finish_email")) {
      outcomes.push(JSON.parse(options.body).p_outcome);
      return new Response(null, { status: 204 });
    }
    assert.equal(url, "https://api.resend.com/emails");
    keys.push(options.headers["Idempotency-Key"]);
    const sent = JSON.parse(options.body);
    assert.deepEqual(sent.to, [mail.email]);
    assert.ok(sent.text.includes("/invite#token="));
    return new Response(null, { status: keys.length === 1 ? 429 : 200 });
  });
  const send = (secret) =>
    handler(
      new Request(env.url, {
        method: "POST",
        headers: { "x-saais-mail-secret": secret },
      }),
    );
  assert.equal((await send("wrong")).status, 401);
  assert.equal((await send("worker-secret")).status, 200);
  assert.equal((await send("worker-secret")).status, 200);
  assert.equal(keys[0], keys[1]);
  assert.deepEqual(outcomes, ["retry", "sent"]);
});
