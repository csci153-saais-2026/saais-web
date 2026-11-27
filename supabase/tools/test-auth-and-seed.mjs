import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const cli = process.env.SAAIS_SUPABASE_CLI || "supabase";
const workdir = process.env.SAAIS_SUPABASE_WORKDIR;
const docker = process.env.SAAIS_DOCKER_CLI || "docker";
const container = process.env.SAAIS_TEST_DB_CONTAINER || "supabase_db_saais";
const args = [
  "status",
  "-o",
  "json",
  ...(workdir ? ["--workdir", workdir] : []),
];
const env = JSON.parse(
  execFileSync(cli, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }),
);
const base = env.API_URL;
const publicKey = env.ANON_KEY;
const serviceKey = env.SERVICE_ROLE_KEY;
const sql = (statement) =>
  execFileSync(
    docker,
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      statement,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
async function auth(path, key, method, body) {
  const response = await fetch(`${base}/auth/v1${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: response.status,
    body: await response.json().catch(() => ({})),
  };
}

test("real Auth rejects public signup but allows an exact reserved staff-provisioned identity", async () => {
  const id = randomUUID();
  const email = `hook-${id}@vsu.edu.ph`;
  const createdUserIds = new Set();
  sql(`insert into saais_private.invite_reservation(id,email,requested_by,request)
    select '${id}','${email}',id,'{}'::jsonb from public.profile where role='admin' and status='active' limit 1`);
  try {
    for (const body of [
      {
        email,
        password: "ValidPassword123",
        data: { saais_provisioning_id: id },
      },
      {
        email,
        password: "ValidPassword123",
        app_metadata: { saais_provisioning_id: id },
      },
      { email: `not-reserved-${id}@vsu.edu.ph`, password: "ValidPassword123" },
    ]) {
      const result = await auth("/signup", publicKey, "POST", body);
      const unexpectedId = result.body.user?.id ?? result.body.id;
      if (result.status < 300 && unexpectedId) createdUserIds.add(unexpectedId);
      assert.equal(
        result.status,
        403,
        "Public signup must be rejected by the hook",
      );
    }
    const created = await auth("/admin/users", serviceKey, "POST", {
      email,
      email_confirm: true,
      app_metadata: { saais_provisioning_id: id },
    });
    assert.equal(
      created.status,
      200,
      "Reserved service provisioning must succeed",
    );
    if (created.body.id) createdUserIds.add(created.body.id);
    assert.ok(created.body.id);
  } finally {
    for (const userId of createdUserIds) {
      await auth(`/admin/users/${userId}`, serviceKey, "DELETE");
    }
    sql(`delete from saais_private.invite_reservation where id='${id}'`);
  }
});

test("the seeded dataset covers the milestone and agreed retake rule", () => {
  const checks = [
    "(select count(*)>=2 from public.program where status='active')",
    "(select count(distinct type)=3 from public.prerequisite where type in ('strict','co_requisite','recommended'))",
    "exists (select 1 from public.course c join public.course_offering o on o.course_id=c.id where c.status='discontinued' and o.is_by_request)",
    "exists (select 1 from public.school_term where is_locked)",
    "(select count(*)>=2 from public.profile where role='student')",
    "(select count(*)>=2 from public.profile where role='adviser')",
    "exists (select 1 from public.profile where role='admin')",
    "exists (select 1 from saais_private.matt_effective_attempts('00000000-0000-4000-8001-000000000001') where attempt_id='80000000-0000-4000-8010-000000000001' and is_repeated and not counts_toward_cumulative_gwa)",
    "exists (select 1 from saais_private.matt_effective_attempts('00000000-0000-4000-8001-000000000001') where attempt_id='80000000-0000-4000-8010-000000000002' and counts_toward_cumulative_gwa)",
    "exists (select 1 from saais_private.matt_effective_attempts('00000000-0000-4000-8001-000000000002') where attempt_id='80000000-0000-4000-8010-000000000003' and counts_toward_cumulative_gwa and not is_repeated)",
  ];
  assert.equal(sql(`select (${checks.join(" and ")})::text`), "true");
});
