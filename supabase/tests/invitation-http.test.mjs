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

test("only an Auth email_exists error can resume invitation provisioning", async () => {
  for (const [code, expected] of [
    ["email_exists", 409],
    ["validation_failed", 500],
  ]) {
    const stages = [];
    const handler = createHandler("auth", {
      env,
      fetch: async (url, options) => {
        if (String(url).endsWith("/auth/v1/user")) return Response.json({ id });
        if (String(url).endsWith("/auth/v1/admin/users")) {
          return Response.json(
            { code: 422, error_code: code },
            { status: 422 },
          );
        }
        const { p_stage } = JSON.parse(options.body);
        stages.push(p_stage);
        if (p_stage === "admit") return Response.json({});
        if (p_stage === "prepare") return Response.json({ reservation_id: id });
        assert.equal(p_stage, "finish");
        return Response.json(
          { code: "PT409", message: "Email is already in use." },
          { status: 409 },
        );
      },
    });
    const response = await handler(
      request(
        "/auth/invite",
        {
          email: "synthetic@vsu.edu.ph",
        },
        true,
      ),
    );
    assert.equal(response.status, expected);
    assert.deepEqual(
      stages,
      code === "email_exists"
        ? ["admit", "prepare", "finish"]
        : ["admit", "prepare"],
    );
  }
});

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
        assert.match(rpc.p_token, /^[0-9a-f]{64}$/);
        assert.notEqual(rpc.p_token, token);
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
  test(`${operation} isolates invitation budgets and rejects malformed tokens`, async () => {
    const admitted = new Map();
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
          assert.match(rpc.p_token, /^[0-9a-f]{64}$/);
          assert.equal(rpc.p_actor, null);
          calls.push("admit");
          const count = (admitted.get(rpc.p_token) || 0) + 1;
          admitted.set(rpc.p_token, count);
          return count > 1
            ? Response.json(budgetError, { status: 429 })
            : Response.json({});
        }
        calls.push(rpc.p_stage);
        return Response.json({ profile_id: id, success: true });
      },
    });
    const first = await handler(request(`/auth/${route}`, { ...body, token }));
    assert.equal(first.status, 200);
    assert.deepEqual(calls, ["admit", ...allowedStages]);
    await assertLimited(
      await handler(request(`/auth/${route}`, { ...body, token })),
    );
    const other = await handler(
      request(`/auth/${route}`, { ...body, token: "b".repeat(64) }),
    );
    assert.equal(other.status, 200);
    const before = calls.length;
    assert.equal(
      (await handler(request(`/auth/${route}`, { ...body, token: "invalid" })))
        .status,
      404,
    );
    assert.equal(calls.length, before);
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

test("importStudentsBatch passes a deterministic batch_key on commit finish without extra post-commit RPCs", async () => {
  const row1 = {
    row_number: 1,
    email: "import-1@vsu.edu.ph",
    full_name: "Student One",
    student_number: "26-1-00001",
    program_id: id,
    curriculum_version_id: id,
    adviser_id: id,
  };
  const row2 = {
    row_number: 2,
    email: "import-2@vsu.edu.ph",
    full_name: "Student Two",
    student_number: "26-1-00002",
    program_id: id,
    curriculum_version_id: id,
    adviser_id: id,
  };
  const profile1 = "00000001-0000-4000-8000-000000000101";

  const previewStages = [];
  const previewHandler = createHandler("students", {
    env,
    fetch: async (url, options) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id });
      const rpc = JSON.parse(options.body);
      previewStages.push(rpc.p_stage);
      assert.equal(rpc.p_body.batch_key, undefined);
      return Response.json({});
    },
  });
  const previewRes = await previewHandler(
    request("/students/import", { mode: "preview", rows: [row1] }, true),
  );
  assert.equal(previewRes.status, 200);
  assert.deepEqual(previewStages, ["admit", "validate", "preview"]);

  const finishKeys = [];
  const commitHandler = createHandler("students", {
    env,
    fetch: async (url, options) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id });
      const rpc = JSON.parse(options.body);
      if (rpc.p_stage === "admit" || rpc.p_stage === "validate")
        return Response.json({});
      if (rpc.p_stage === "prepare") {
        assert.equal(rpc.p_body.batch_key, undefined);
        if (rpc.p_body.row_number === 1)
          return Response.json({ reservation_id: id, auth_ready: true });
        return Response.json(
          { code: "PT409", message: "Duplicate student." },
          { status: 409 },
        );
      }
      if (rpc.p_stage === "finish") {
        assert.match(rpc.p_body.batch_key, /^[0-9a-f]{64}$/);
        finishKeys.push(rpc.p_body.batch_key);
        return Response.json({ profile_id: profile1, success: true });
      }
      throw new Error(`Unexpected stage: ${rpc.p_stage}`);
    },
  });
  const commitRes = await commitHandler(
    request("/students/import", { mode: "commit", rows: [row1, row2] }, true),
  );
  assert.equal(commitRes.status, 200);
  const commitJson = await commitRes.json();
  assert.equal(commitJson.imported_count, 1);
  assert.equal(commitJson.error_count, 1);

  const retryRes = await commitHandler(
    request("/students/import", { mode: "commit", rows: [row2, row1] }, true),
  );
  assert.equal(retryRes.status, 200);
  assert.equal(finishKeys.length, 2);
  assert.equal(finishKeys[0], finishKeys[1]);
});

test("student imports reject whitespace variants of a student number before provisioning", async () => {
  const first = {
    row_number: 1,
    email: "first@vsu.edu.ph",
    full_name: "Student One",
    student_number: "26-1-00001",
    program_id: id,
    curriculum_version_id: id,
    adviser_id: id,
  };
  const second = {
    ...first,
    row_number: 2,
    email: "second@vsu.edu.ph",
    student_number: " 26-1-00001 ",
  };
  for (const mode of ["preview", "commit"]) {
    const stages = [];
    const handler = createHandler("students", {
      env,
      fetch: async (url, options) => {
        if (url.endsWith("/auth/v1/user")) return Response.json({ id });
        const rpc = JSON.parse(options.body);
        stages.push(rpc.p_stage);
        if (rpc.p_stage === "preview" || rpc.p_stage === "prepare")
          assert.equal(rpc.p_body.row_number, 1);
        if (rpc.p_stage === "prepare")
          return Response.json({ reservation_id: id, auth_ready: true });
        if (rpc.p_stage === "finish")
          return Response.json({ profile_id: id, success: true });
        return Response.json({});
      },
    });
    const response = await handler(
      request("/students/import", { mode, rows: [first, second] }, true),
    );
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.error_count, 1);
    assert.equal(payload.results[1].row_number, 2);
    assert.match(
      payload.results[1].message,
      /Duplicate row, email, or student number/,
    );
    assert.deepEqual(
      stages,
      mode === "preview"
        ? ["admit", "validate", "preview"]
        : ["admit", "validate", "prepare", "finish"],
    );
  }
});
