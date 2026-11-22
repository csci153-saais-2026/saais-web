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
