// Run against the repository's synthetic seed on a disposable local Supabase stack.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { test } from "node:test";

test("signed-in student sees only safe attempt results through PostgREST", async () => {
  const {
    API_URL: api,
    ANON_KEY: anon,
    SERVICE_ROLE_KEY: service,
  } = JSON.parse(
    execFileSync("supabase", ["status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  assert.ok(
    ["127.0.0.1", "localhost", "[::1]"].includes(new URL(api).hostname),
  );
  assert.ok(anon && service, "Local project keys must be available");

  const studentId = "00000000-0000-4000-8000-000000000101";
  const email = "24-1-01798@vsu.edu.ph";
  const password = randomBytes(24).toString("base64url") + "Aa1!";
  const passwordUpdate = await fetch(
    `${api}/auth/v1/admin/users/${studentId}`,
    {
      method: "PUT",
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    },
  );
  assert.equal(passwordUpdate.status, 200, "Update the local fixture password");
  const login = await fetch(`${api}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(
    login.status,
    200,
    "Sign in to obtain a genuine student session",
  );
  const { access_token: token, user } = await login.json();
  assert.equal(user.id, studentId);

  const headers = { apikey: anon, Authorization: `Bearer ${token}` };
  async function list(query) {
    const response = await fetch(`${api}/rest/v1/attempt_result${query}`, {
      headers: { ...headers, "Accept-Profile": "saais_api" },
    });
    return { status: response.status, body: await response.json() };
  }

  const ordinary = await list(
    "?select=id,student_id,final_grade,effective_status&limit=100",
  );
  assert.equal(ordinary.status, 200);
  assert.ok(ordinary.body.length > 0, "The fixture has its own attempts");
  for (const row of ordinary.body) {
    assert.equal(row.student_id, studentId);
    assert.deepEqual(Object.keys(row).sort(), [
      "effective_status",
      "final_grade",
      "id",
      "student_id",
    ]);
  }
  const wildcard = await list("?select=*&limit=100");
  assert.equal(wildcard.status, 200);
  assert.equal(wildcard.body.length, ordinary.body.length);
  for (const row of wildcard.body) {
    assert.equal(row.student_id, studentId);
    assert.ok(!Object.hasOwn(row, "grade_fix_history"));
  }
  assert.deepEqual(await list(`?student_id=neq.${studentId}`), {
    status: 200,
    body: [],
  });
  const column = await list("?select=grade_fix_history");
  assert.equal(column.status, 400);
  assert.equal(column.body.code, "42703");

  for (const [name, input] of [
    ["read_attempt_results", { p_student: studentId }],
    ["matt_grade_fix_history", { p_attempt_id: ordinary.body[0].id }],
    ["matt_attempt_result", { p_attempt_id: ordinary.body[0].id }],
  ]) {
    for (const [schema, expected] of [
      ["public", 404],
      ["saais_private", 406],
    ]) {
      const rpc = await fetch(`${api}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Profile": schema,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      assert.equal(rpc.status, expected, `${schema}.${name}`);
    }
  }
});
