// Run the original baseline lint/security checks without changing contract/.
const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const revision = 'cfa620c97c2a506537825edc1323f37ee5f843b3';
const folder = path.resolve('supabase/.temp/pinned-contract');
fs.mkdirSync(folder, { recursive: true });
for (const file of ['openapi.yaml', 'redocly.yaml']) fs.writeFileSync(path.join(folder, file), cp.execFileSync('git', ['show', revision + ':contract/' + file]));
const cli = path.resolve('node_modules/@redocly/cli/bin/cli.js');
const yaml = path.join(folder, 'openapi.yaml');
const config = path.join(folder, 'redocly.yaml');
const original = cp.execFileSync('git', ['show', revision + ':contract/security.check.cjs'], { encoding: 'utf8' });
// Only relocate file paths: all assertions remain byte-for-byte unchanged.
const redirected = original.replace("'node_modules/@redocly/cli/bin/cli.js'", JSON.stringify(cli))
  .replace("'contract/openapi.yaml'", JSON.stringify(yaml)).replace("'contract/redocly.yaml'", JSON.stringify(config));
fs.writeFileSync(path.join(folder, 'security.check.cjs'), redirected);
cp.execFileSync(process.execPath, [cli, 'lint', yaml, '--config', config], { stdio: 'inherit' });
cp.execFileSync(process.execPath, ['--test', path.join(folder, 'security.check.cjs')], { stdio: 'inherit' });
