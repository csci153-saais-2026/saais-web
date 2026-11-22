// Invoked by test-database.cjs while its disposable PostgreSQL server is alive.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import assert from "node:assert/strict";
const run = promisify(execFile);
const [bin, database] = process.argv.slice(2);
const psql = path.join(bin, process.platform === "win32" ? "psql.exe" : "psql");
const args = [
  "-h",
  "127.0.0.1",
  "-p",
  "55432",
  "-U",
  "postgres",
  "-d",
  database,
  "-qAt",
  "-v",
  "ON_ERROR_STOP=1",
  "-v",
  "VERBOSITY=verbose",
];
const sql = `begin;
 select test.login(2);
 select public.jerome_operation('createOutsideCredit',
   '{"student_id":"00000005-0000-4000-8000-000000000000"}',
   jsonb_build_object('entry_type','transferee','origin_school','Concurrent Test School','original_course_code','RACE101',
     'original_course_title','Concurrent Subject','units',3,'grade','2.00','reason','Concurrent write test',
     'destination_curriculum_term_course_id',(select value->>'id' from test.records where name='race_slot')));
 select pg_sleep(0.2);
 commit;`;
const results = await Promise.allSettled([
  run(psql, [...args, "-c", sql]),
  run(psql, [...args, "-c", sql]),
]);
assert.equal(
  results.filter((result) => result.status === "fulfilled").length,
  1,
  "Exactly one concurrent write must commit",
);
const failure = results.find((result) => result.status === "rejected");
assert.match(
  failure.reason.stderr,
  /PT409/,
  "The other writer must receive a controlled conflict",
);
const verify = `select test.assert((select count(*)=1 from public.outside_credit where origin_school='Concurrent Test School' and revoked_at is null),'duplicate live credit after concurrent writes');
 select test.assert((select count(*)=1 from public.audit_log_entry a join public.outside_credit c on c.id=a.entity_id where c.origin_school='Concurrent Test School' and a.action='createOutsideCredit'),'duplicate or absent audit after concurrent writes');`;
await run(psql, [...args, "-c", verify]);
console.log(
  "Concurrent duplicate writes: one committed, one rejected; academic and audit rows remain consistent.",
);

const student = "00000019-0000-4000-8000-000000000000";
const reassign = (adviser) => `
  select test.login(2);
  select public.matt_operation('reassignAdviser', '{"student_id":"${student}"}',
    '{"adviser_id":"${adviser}","start_date":"2026-02-01","reason":"Overlapping reassignment"}');
`;
const first = run(psql, [
  ...args,
  "-c",
  `begin; set application_name = 'saais_adviser_handoff'; ${reassign("00000008-0000-4000-8000-000000000000")} select pg_sleep(2); commit;`,
]);
const observed = `select exists(select 1 from pg_stat_activity
  where application_name = 'saais_adviser_handoff' and wait_event = 'PgSleep');`;
let holdingLock = false;
for (let poll = 0; poll < 30 && !holdingLock; poll++) {
  const result = await run(psql, [...args, "-c", observed]);
  holdingLock = result.stdout.trim() === "t";
}
assert.ok(
  holdingLock,
  "First reassignment must be open before starting the competing transaction",
);

const second = run(psql, [
  ...args,
  "-c",
  reassign("00000004-0000-4000-8000-000000000000"),
]);
const handoff = await Promise.allSettled([first, second]);
assert.equal(handoff[0].status, "fulfilled");
assert.equal(handoff[1].status, "rejected");
assert.match(handoff[1].reason.stderr, /PT409/);
await run(psql, [
  ...args,
  "-c",
  `select test.assert((select count(*) = 2 and count(*) filter (where end_date is null) = 1
      from public.adviser_assignment where student_id = '${student}'), 'Overlapping reassignment changed history twice');
    select test.assert((select count(*) = 1 from public.audit_log_entry
      where student_id = '${student}' and action = 'reassignAdviser' and reason = 'Overlapping reassignment'),
      'Exactly one audited reassignment must commit');`,
]);
console.log(
  "Overlapping adviser reassignments: one committed and one conflicted.",
);

// A filtered result request must not run the expensive attempt helper for other students.
const explain = await run(psql, [
  ...args,
  "-c",
  `select test.login(1);
  explain (analyze, format json) select * from saais_api.attempt_result
  where student_id = '00000005-0000-4000-8000-000000000000';`,
]);
const plan = JSON.parse(explain.stdout.slice(explain.stdout.indexOf("[")))[0]
  .Plan;
function findAttemptHelper(node) {
  if (node["Function Name"] === "read_attempt_results") return node;
  for (const child of node.Plans || []) {
    const found = findAttemptHelper(child);
    if (found) return found;
  }
  return null;
}
const helper = findAttemptHelper(plan);
assert.ok(helper, "The query plan includes the attempt-result helper");
assert.equal(
  helper["Actual Loops"],
  1,
  "The helper runs for only the requested student",
);

// Two issued invitations give independent, bounded budget keys.
const firstHash = "a".repeat(64);
const secondHash = "b".repeat(64);
await run(psql, [
  ...args,
  "-c",
  `insert into saais_private.account_invitation(profile_id, token_hash) values
  ('00000001-0000-4000-8000-000000000000', '${firstHash}'),
  ('00000002-0000-4000-8000-000000000000', '${secondHash}');`,
]);
for (const operation of [
  "previewInviteToken",
  "verifyInviteToken",
  "declineInviteToken",
]) {
  await run(psql, [
    ...args,
    "-c",
    `insert into saais_private.public_invitation_budget(operation, token_hash, window_start, count)
    values ('${operation}', '${firstHash}', now(), 59)`,
  ]);
  const admit = (hash) =>
    `select public.saais_invitation_service('${operation}', 'admit', '{}', null, null, null, '${hash}');`;
  const requests = await Promise.allSettled(
    Array.from({ length: 6 }, () =>
      run(psql, [...args, "-c", admit(firstHash)]),
    ),
  );
  assert.equal(
    requests.filter((result) => result.status === "fulfilled").length,
    1,
  );
  for (const result of requests.filter(
    (result) => result.status === "rejected",
  )) {
    assert.match(result.reason.stderr, /PT429/);
  }
  // Exhausting one invitation must not prevent a different invitation from progressing.
  await run(psql, [
    ...args,
    "-c",
    `${admit(secondHash)}
    select test.assert((select count = 60 from saais_private.public_invitation_budget
      where operation = '${operation}' and token_hash = '${firstHash}'), 'First token consumes only its last slot');
    select test.assert((select count = 1 from saais_private.public_invitation_budget
      where operation = '${operation}' and token_hash = '${secondHash}'), 'Second token has its own budget');
    update saais_private.public_invitation_budget set window_start = now() - interval '61 seconds'
      where operation = '${operation}' and token_hash = '${firstHash}';
    ${admit(firstHash)}
    select test.assert((select count = 1 from saais_private.public_invitation_budget
      where operation = '${operation}' and token_hash = '${firstHash}'), 'The next window restores capacity');`,
  ]);
  const unknown = await Promise.allSettled([
    run(psql, [...args, "-c", admit("c".repeat(64))]),
  ]);
  assert.equal(unknown[0].status, "rejected");
  assert.match(unknown[0].reason.stderr, /PT404/);
  await run(psql, [
    ...args,
    "-c",
    `select test.assert(not exists(select 1 from saais_private.public_invitation_budget
    where token_hash = '${"c".repeat(64)}'), 'Unknown tokens cannot create budget rows');`,
  ]);
}
await run(psql, [
  ...args,
  "-c",
  `delete from saais_private.account_invitation where token_hash in ('${firstHash}', '${secondHash}');
  select test.assert(not exists(select 1 from saais_private.public_invitation_budget where token_hash in ('${firstHash}', '${secondHash}')),
    'Deleting invitations removes their budget rows');`,
]);
console.log(
  "Concurrent invitation budgets isolate issued tokens and discard unknown tokens.",
);

const admin = "00000001-0000-4000-8000-000000000000";
const adminSession = "00000001-0000-4000-8000-000000000001";
await run(psql, [
  ...args,
  "-c",
  `insert into saais_private.request_budget
    select '${admin}', date_trunc('minute', now()) + minute * interval '1 minute', 120
    from generate_series(0, 1) minute
    on conflict on constraint request_budget_pkey do update set count = 120`,
]);
const exhausted = await Promise.allSettled(
  Array.from({ length: 6 }, () =>
    run(psql, [
      ...args,
      "-c",
      `select public.saais_invitation_service('inviteUser', 'admit', '{}', '${admin}', '${adminSession}');`,
    ]),
  ),
);
for (const result of exhausted) {
  assert.equal(result.status, "rejected");
  assert.match(result.reason.stderr, /PT429/);
}
await run(psql, [
  ...args,
  "-c",
  `select test.assert(not exists(select 1 from saais_private.request_budget
    where actor_id = '${admin}' and count > 120), 'Concurrent admissions cannot overspend the shared budget');`,
]);
console.log(
  "Concurrent authenticated admissions fail after exhausting the shared budget.",
);
