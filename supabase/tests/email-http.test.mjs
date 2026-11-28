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
  SAAIS_GMAIL_CLIENT_ID: "gmail-client-id",
  SAAIS_GMAIL_CLIENT_SECRET: "gmail-client-secret",
  SAAIS_GMAIL_REFRESH_TOKEN: "gmail-refresh-token",
  SAAIS_MAIL_FROM: "SAAIS Advising <fixture@gmail.com>",
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

function decodeMime(rawBase64Url) {
  const mime = Buffer.from(rawBase64Url, "base64url").toString("utf8");
  const [headerBlock, bodyBase64] = mime.split("\r\n\r\n");
  const body = Buffer.from(bodyBase64, "base64").toString("utf8");
  return { headerBlock, body };
}

test("mail delivery refreshes OAuth once per run and retries transient Gmail API errors", async () => {
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
  let tokenRefreshes = 0;
  let sendAttempts = 0;
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
    if (url === "https://oauth2.googleapis.com/token") {
      tokenRefreshes++;
      const params = new URLSearchParams(options.body);
      assert.equal(params.get("client_id"), "gmail-client-id");
      assert.equal(params.get("client_secret"), "gmail-client-secret");
      assert.equal(params.get("refresh_token"), "gmail-refresh-token");
      assert.equal(params.get("grant_type"), "refresh_token");
      return Response.json({ access_token: "access-token-1" });
    }
    assert.equal(
      url,
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    );
    assert.equal(options.headers.Authorization, "Bearer access-token-1");
    sendAttempts++;
    const { headerBlock, body } = decodeMime(JSON.parse(options.body).raw);
    assert.match(headerBlock, /^From: "SAAIS Advising" <fixture@gmail\.com>/m);
    assert.match(headerBlock, /^To: mail-fixture@example\.test$/m);
    assert.ok(body.includes("/invite#token="));
    return new Response(null, { status: sendAttempts === 1 ? 429 : 200 });
  });

  assert.equal((await send(handler, "wrong")).status, 401);
  assert.equal((await send(handler)).status, 200);
  assert.equal((await send(handler)).status, 200);
  assert.equal(tokenRefreshes, 2);
  assert.deepEqual(outcomes, ["retry", "sent"]);
});

test("token refresh failures retry claimed mail and permanent 400 rejections mark failed", async () => {
  const mail = {
    id,
    lease: session,
    kind: "notification",
    email: "mail-fixture@example.test",
    subject: "Advising update — review required",
    message: "Sign in to SAAIS to read your new notification.",
    token: null,
  };
  const outcomes = [];
  let failToken = true;
  const handler = createMailHandler(
    readMailEnvironment(
      (name) =>
        ({
          ...settings,
          SAAIS_MAIL_FROM: undefined,
          SAAIS_MAIL_ALLOWED_RECIPIENTS: mail.email,
        })[name],
    ),
    async (url, options) => {
      if (url.endsWith("/saais_claim_email")) return Response.json([mail]);
      if (url.endsWith("/saais_finish_email")) {
        outcomes.push(JSON.parse(options.body).p_outcome);
        return new Response(null, { status: 204 });
      }
      if (url === "https://oauth2.googleapis.com/token") {
        if (failToken) return new Response(null, { status: 400 });
        return Response.json({ access_token: "access-token-2" });
      }
      const { headerBlock, body } = decodeMime(JSON.parse(options.body).raw);
      assert.doesNotMatch(headerBlock, /^From:/m);
      assert.match(headerBlock, /^Subject: =\?UTF-8\?B\?/m);
      assert.equal(body, mail.message);
      return new Response(null, { status: 400 });
    },
  );

  assert.equal((await send(handler)).status, 200);
  failToken = false;
  assert.equal((await send(handler)).status, 200);
  assert.deepEqual(outcomes, ["retry", "failed"]);
});

test("empty queues do not request an OAuth access token", async () => {
  const config = readMailEnvironment(
    (name) =>
      ({ ...settings, SAAIS_MAIL_ALLOWED_RECIPIENTS: "allowed@example.test" })[
        name
      ],
  );
  const handler = createMailHandler(config, async (url) => {
    if (url.endsWith("/saais_claim_email")) return Response.json([]);
    throw new Error(`Unexpected upstream call: ${url}`);
  });
  assert.equal((await send(handler)).status, 200);
});

test("Gmail MIME normalizes folded headers and encodes UTF-8 subjects and display names", async () => {
  const mail = {
    id,
    lease: session,
    kind: "notification",
    email: "mail-fixture@example.test",
    subject: "Advising update\r\n– review required",
    message: "Sign in to SAAIS to read your new notification.",
    token: null,
  };
  const config = readMailEnvironment(
    (name) =>
      ({
        ...settings,
        SAAIS_MAIL_FROM: "José Reyes <fixture@gmail.com>",
        SAAIS_MAIL_ALLOWED_RECIPIENTS: mail.email,
      })[name],
  );
  let headers = "";
  const outcomes = [];
  const handler = createMailHandler(config, async (url, options) => {
    if (url.endsWith("/saais_claim_email")) return Response.json([mail]);
    if (url.endsWith("/saais_finish_email")) {
      outcomes.push(JSON.parse(options.body).p_outcome);
      return new Response(null, { status: 204 });
    }
    if (url === "https://oauth2.googleapis.com/token") {
      return Response.json({ access_token: "test-access-token" });
    }
    headers = decodeMime(JSON.parse(options.body).raw).headerBlock;
    return Response.json({ id: "fixture-gmail-message" });
  });

  assert.equal((await send(handler)).status, 200);
  assert.deepEqual(outcomes, ["sent"]);
  const encode = (text) =>
    `=?UTF-8?B?${Buffer.from(text).toString("base64")}?=`;
  assert.deepEqual(headers.split("\r\n").slice(0, 3), [
    `From: ${encode("José Reyes")} <fixture@gmail.com>`,
    `To: ${mail.email}`,
    `Subject: ${encode("Advising update – review required")}`,
  ]);

  let invalidSenderCalls = 0;
  const invalidSenderHandler = createMailHandler(
    { ...config, sender: "José\r\nReyes <fixture@gmail.com>" },
    async () => {
      invalidSenderCalls++;
      return Response.json([]);
    },
  );
  assert.equal((await send(invalidSenderHandler)).status, 503);
  assert.equal(invalidSenderCalls, 0);
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
        if (url === "https://oauth2.googleapis.com/token") {
          return Response.json({ access_token: "access-token" });
        }
        text = decodeMime(JSON.parse(options.body).raw).body;
        return new Response(null, { status: 200 });
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
        if (url === "https://oauth2.googleapis.com/token") {
          return Response.json({ access_token: "access-token" });
        }
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
        assert.equal(
          url,
          "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        );
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
