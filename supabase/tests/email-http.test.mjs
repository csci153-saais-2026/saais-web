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
const webhookUrl = "https://script.google.com/macros/s/AKfycb_fixture/exec";
const settings = {
  SUPABASE_URL: env.url,
  SUPABASE_SERVICE_ROLE_KEY: env.serviceKey,
  SAAIS_MAIL_WORKER_SECRET: "worker-secret",
  SAAIS_GOOGLE_MAILER_URL: webhookUrl,
  SAAIS_GOOGLE_MAILER_SECRET: "gas-secret",
  SAAIS_MAIL_FROM: "SAAIS Advising <fixture@vsu.edu.ph>",
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

test("mail delivery retries transient Apps Script errors with the same idempotencyKey", async () => {
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
  assert.equal(config.senderName, "SAAIS Advising");

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
    assert.equal(url, webhookUrl);
    assert.equal(options.redirect, "follow");
    const sent = JSON.parse(options.body);
    keys.push(sent.idempotencyKey);
    assert.equal(sent.secret, "gas-secret");
    assert.equal(sent.to, mail.email);
    assert.equal(sent.fromName, "SAAIS Advising");
    assert.ok(sent.text.includes("/invite#token="));

    if (keys.length === 1) {
      return Response.json({ ok: false, retry: true, error: "quota" });
    }
    if (keys.length === 2) {
      return new Response("<html>Apps Script error</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }
    return Response.json({ ok: true });
  });

  assert.equal((await send(handler, "wrong")).status, 401);
  assert.equal((await send(handler)).status, 200);
  assert.equal((await send(handler)).status, 200);
  assert.equal((await send(handler)).status, 200);
  assert.equal(keys[0], keys[1]);
  assert.equal(keys[1], keys[2]);
  assert.deepEqual(outcomes, ["retry", "retry", "sent"]);
});

test("Apps Script permanent rejections mark mail failed and Workspace URLs are accepted", async () => {
  const workspaceUrl =
    "https://script.google.com/a/macros/vsu.edu.ph/s/AKfycb_ws/exec";
  const mail = {
    id,
    lease: session,
    kind: "notification",
    email: "bad-recipient@example.test",
    subject: "Notification",
    message: "Check your account.",
    token: null,
  };
  const finished = [];
  const handler = createMailHandler(
    readMailEnvironment(
      (name) =>
        ({
          ...settings,
          SAAIS_GOOGLE_MAILER_URL: workspaceUrl,
          SAAIS_MAIL_FROM: undefined,
          SAAIS_MAIL_ALLOWED_RECIPIENTS: mail.email,
        })[name],
    ),
    async (url, options) => {
      if (url.endsWith("/saais_claim_email")) return Response.json([mail]);
      if (url.endsWith("/saais_finish_email")) {
        finished.push(JSON.parse(options.body).p_outcome);
        return new Response(null, { status: 204 });
      }
      assert.equal(url, workspaceUrl);
      assert.equal(JSON.parse(options.body).fromName, "SAAIS");
      return Response.json({ ok: false, retry: false, error: "invalid" });
    },
  );
  assert.equal((await send(handler)).status, 200);
  assert.deepEqual(finished, ["failed"]);
});

test("invalid Apps Script URLs fail closed with 503", async () => {
  for (const badUrl of [
    "",
    "http://script.google.com/macros/s/AKfycb_fixture/exec",
    "https://evil.example.test/macros/s/AKfycb_fixture/exec",
    "https://script.google.com/macros/s/AKfycb_fixture/dev",
    "https://user:pass@script.google.com/macros/s/AKfycb_fixture/exec",
  ]) {
    let calls = 0;
    const handler = createMailHandler(
      readMailEnvironment(
        (name) =>
          ({
            ...settings,
            SAAIS_GOOGLE_MAILER_URL: badUrl,
            SAAIS_MAIL_ALLOWED_RECIPIENTS: "allowed@example.test",
          })[name],
      ),
      async () => {
        calls++;
        throw new Error("Invalid mailer URL must make no upstream request");
      },
    );
    assert.equal((await send(handler)).status, 503);
    assert.equal(calls, 0);
  }
});

test("invitation links keep the site's base path", async () => {
  const mail = {
    id,
    lease: session,
    kind: "invitation",
    email: "mail-fixture@example.test",
    subject: "Invitation",
    message: null,
    token,
  };
  for (const [site, expected] of [
    ["https://host.example.test", "https://host.example.test/invite"],
    [
      "https://host.example.test/saais",
      "https://host.example.test/saais/invite",
    ],
    [
      "https://host.example.test/saais/",
      "https://host.example.test/saais/invite",
    ],
  ]) {
    let text = "";
    const handler = createMailHandler(
      readMailEnvironment(
        (name) =>
          ({
            ...settings,
            SAAIS_SITE_URL: site,
            SAAIS_MAIL_ALLOWED_RECIPIENTS: mail.email,
          })[name],
      ),
      async (url, options) => {
        if (url.endsWith("/saais_claim_email")) return Response.json([mail]);
        if (url.endsWith("/saais_finish_email"))
          return new Response(null, { status: 204 });
        text = JSON.parse(options.body).text;
        return Response.json({ ok: true });
      },
    );
    assert.equal((await send(handler)).status, 200);
    assert.ok(text.includes(`${expected}#token=${token}`), text);
  }
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
        assert.equal(url, webhookUrl);
        assert.equal(body.to, mail.email);
        providerCalls++;
        return Response.json({ ok: true });
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

test("a claimed disallowed recipient is marked failed without sending email", async () => {
  const config = readMailEnvironment(
    (name) =>
      ({ ...settings, SAAIS_MAIL_ALLOWED_RECIPIENTS: "allowed@example.test" })[
        name
      ],
  );
  const finished = [];
  const handler = createMailHandler(config, async (url, options) => {
    if (url.endsWith("/saais_claim_email")) {
      return Response.json([
        {
          id,
          lease: session,
          kind: "notification",
          email: "blocked@example.test",
        },
      ]);
    }
    assert.ok(url.endsWith("/saais_finish_email"));
    finished.push(JSON.parse(options.body));
    return new Response(null, { status: 204 });
  });
  assert.equal((await send(handler)).status, 200);
  assert.deepEqual(finished, [
    { p_id: id, p_kind: "notification", p_lease: session, p_outcome: "failed" },
  ]);
});

test("mail delivery runs optional photo cleanup hook without failing mail responses", async () => {
  const config = readMailEnvironment(
    (name) =>
      ({ ...settings, SAAIS_MAIL_ALLOWED_RECIPIENTS: "allowed@example.test" })[
        name
      ],
  );
  let sweeps = 0;
  const handler = createMailHandler(config, async () => Response.json([]), {
    reconcilePhotos: async () => {
      sweeps++;
      throw new Error("transient storage outage");
    },
  });
  assert.equal((await send(handler)).status, 200);
  assert.equal(sweeps, 1);
});
