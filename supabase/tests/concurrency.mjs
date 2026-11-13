// Invoked by test-database.cjs while its disposable PostgreSQL server is alive.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import assert from 'node:assert/strict';
const run = promisify(execFile);
const [bin, database] = process.argv.slice(2);
const psql = path.join(bin, process.platform === 'win32' ? 'psql.exe' : 'psql');
const args = ['-h', '127.0.0.1', '-p', '55432', '-U', 'postgres', '-d', database, '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'];
const sql = `begin;
 select test.login(2);
 select public.jerome_operation('createOutsideCredit',
   '{"student_id":"00000005-0000-4000-8000-000000000000"}',
   jsonb_build_object('entry_type','transferee','origin_school','Concurrent Test School','original_course_code','RACE101',
     'original_course_title','Concurrent Subject','units',3,'grade','2.00','reason','Concurrent write test',
     'destination_curriculum_term_course_id',(select value->>'id' from test.records where name='race_slot')));
 select pg_sleep(0.2);
 commit;`;
const results = await Promise.allSettled([run(psql, [...args, '-c', sql]), run(psql, [...args, '-c', sql])]);
assert.equal(results.filter(result => result.status === 'fulfilled').length, 1, 'Exactly one concurrent write must commit');
const failure = results.find(result => result.status === 'rejected');
assert.match(failure.reason.stderr, /PT409/, 'The other writer must receive a controlled conflict');
const verify = `select test.assert((select count(*)=1 from public.outside_credit where origin_school='Concurrent Test School' and revoked_at is null),'duplicate live credit after concurrent writes');
 select test.assert((select count(*)=1 from public.audit_log_entry a join public.outside_credit c on c.id=a.entity_id where c.origin_school='Concurrent Test School' and a.action='createOutsideCredit'),'duplicate or absent audit after concurrent writes');`;
await run(psql, [...args, '-c', verify]);
console.log('Concurrent duplicate writes: one committed, one rejected; academic and audit rows remain consistent.');
