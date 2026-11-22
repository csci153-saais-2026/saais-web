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
const settings = {
  SUPABASE_URL: env.url,
  SUPABASE_SERVICE_ROLE_KEY: env.serviceKey,
  SAAIS_MAIL_WORKER_SECRET: "worker-secret",
  SAAIS_RESEND_API_KEY: "transport-key",
  SAAIS_MAIL_FROM: "fixture@example.test",
  SAAIS_SITE_URL: "https://site.example.test",
};

function send(handler, secret = "worker-secret") {
  return handler(
    new Request(env.url, {
      method: "POST",
      headers: { "x-saais-mail-secret": secret },
    }),
  );
}

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
      ({ ...settings, SAAIS_MAIL_ALLOWED_RECIPIENTS: mail.email })[name],
  );
  const keys = [];
  const outcomes = [];
  const handler = createMailHandler(config, async (url, options) => {
    if (url.endsWith("/saais_claim_email")) {
      assert.deepEqual(JSON.parse(options.body).p_allowed_recipients, [
        mail.email,
      ]);
      return Response.json([mail]);
    }
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
  assert.equal((await send(handler, "wrong")).status, 401);
  assert.equal((await send(handler)).status, 200);
  assert.equal((await send(handler)).status, 200);
  assert.equal(keys[0], keys[1]);
  assert.deepEqual(outcomes, ["retry", "sent"]);
});

test("missing or empty recipient configuration blocks claims and provider calls", async () => {
  for (const environment of [undefined, "staging", "test", "production"]) {
    for (const recipients of [undefined, "", " , "]) {
      if (environment === "production" && recipients === undefined) continue;
      const config = readMailEnvironment(
        (name) =>
          ({
            ...settings,
            SAAIS_MAIL_ENVIRONMENT: environment,
            SAAIS_MAIL_ALLOWED_RECIPIENTS: recipients,
          })[name],
      );
      let calls = 0;
      const handler = createMailHandler(config, async () => {
        calls++;
        throw new Error("Unconfigured delivery must make no upstream request");
      });
      assert.equal((await send(handler)).status, 503);
      assert.equal(calls, 0);
    }
  }
});

test("an unapproved queued invitation is held, then sent after the allowlist is corrected", async () => {
  const mail = {
    id,
    lease: session,
    kind: "invitation",
    email: "mail-fixture@example.test",
    subject: "Invitation",
    message: null,
    token,
  };
  let state = "queued";
  let providerCalls = 0;
  const worker = (recipients) =>
    createMailHandler(
      readMailEnvironment(
        (name) =>
          ({
            ...settings,
            SAAIS_MAIL_ALLOWED_RECIPIENTS: recipients,
          })[name],
      ),
      async (url, options) => {
        const body = JSON.parse(options.body);
        if (url.endsWith("/saais_claim_email")) {
          if (
            state !== "queued" ||
            !body.p_allowed_recipients.includes(mail.email)
          ) {
            return Response.json([]);
          }
          state = "leased";
          return Response.json([mail]);
        }
        if (url.endsWith("/saais_finish_email")) {
          assert.equal(state, "leased");
          assert.equal(body.p_outcome, "sent");
          assert.equal(body.p_lease, session);
          state = "sent";
          return new Response(null, { status: 204 });
        }
        assert.equal(url, "https://api.resend.com/emails");
        assert.deepEqual(body.to, [mail.email]);
        providerCalls++;
        return new Response(null, { status: 200 });
      },
    );

  assert.equal((await send(worker("another@example.test"))).status, 200);
  assert.equal(state, "queued");
  assert.equal(providerCalls, 0);

  const result = await send(worker(" MAIL-FIXTURE@example.test "));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).sent, 1);
  assert.equal(state, "sent");
  assert.equal(providerCalls, 1);
});

test("explicit production mode preserves unrestricted claims when no list is supplied", async () => {
  const config = readMailEnvironment(
    (name) =>
      ({
        ...settings,
        SAAIS_MAIL_ENVIRONMENT: "production",
      })[name],
  );
  const handler = createMailHandler(config, async (url, options) => {
    assert.match(url, /\/saais_claim_email$/);
    assert.deepEqual(JSON.parse(options.body), { p_allowed_recipients: null });
    return Response.json([]);
  });
  assert.equal((await send(handler)).status, 200);
});
