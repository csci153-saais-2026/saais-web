// Real PostgreSQL tests with a minimal Supabase Auth schema stand-in.
// No hosted databases, production credentials, or Docker images are touched.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const bin = process.env.PG_BINARY_DIR || 'C:/Program Files/PostgreSQL/18/bin';
const executable = name => path.join(bin, process.platform === 'win32' ? name + '.exe' : name);
const data = path.resolve('supabase/.temp/jerome-pg');
const database = 'saais_jerome_' + Date.now();
const args = ['-h', '127.0.0.1', '-p', '55432', '-U', 'postgres'];
function run(name, options, quiet = false) {
  return cp.execFileSync(executable(name), options, { encoding: 'utf8', stdio: quiet ? 'pipe' : 'inherit' });
}
let started = false, created = false;
try {
  if (!fs.existsSync(path.join(data, 'PG_VERSION'))) run('initdb', ['-D', data, '-A', 'trust', '-U', 'postgres', '--no-locale', '--encoding=UTF8']);
  run('pg_ctl', ['-D', data, '-l', path.resolve('supabase/.temp/jerome-pg.log'), '-o', '-h 127.0.0.1 -p 55432', '-w', 'start']);
  started = true;
  run('createdb', [...args, database]);
  created = true;
  const migrations = fs.readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')).sort().map(name => 'supabase/migrations/' + name);
  const tests = fs.readdirSync('supabase/tests').filter(name => name.endsWith('.sql') && name !== 'bootstrap.sql' && name !== 'fixtures.sql').sort().map(name => 'supabase/tests/' + name);
  for (const file of ['supabase/tests/bootstrap.sql', ...migrations, ...(fs.existsSync('supabase/tests/fixtures.sql') ? ['supabase/tests/fixtures.sql'] : []), ...tests]) {
    console.log('Checking ' + file);
    try { run('psql', [...args, '-d', database, '-v', 'ON_ERROR_STOP=1', '-1', '-f', file], true); }
    catch (error) { process.stderr.write(error.stdout || ''); process.stderr.write(error.stderr || ''); throw Error('Failed: ' + file); }
  }
  console.log('All migrations and SQL test files passed.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (created) run('dropdb', [...args, database]);
  if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
}
