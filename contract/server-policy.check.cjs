const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const yaml = require('js-yaml');

test('server URL policy rejects HTTP at root, path and operation level', () => {
  const original = yaml.load(fs.readFileSync('contract/openapi.yaml', 'utf8'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saais-server-policy-'));
  try {
    for (const level of ['root', 'path', 'operation']) {
      const spec = structuredClone(original);
      const route = Object.keys(spec.paths)[0];
      const method = Object.keys(spec.paths[route]).find(k => ['get', 'post', 'put', 'patch', 'delete'].includes(k));
      const target = level === 'root' ? spec : level === 'path' ? spec.paths[route] : spec.paths[route][method];
      target.servers = [{ url: 'http://insecure.example.test' }];
      const file = path.join(dir, `${level}.json`);
      fs.writeFileSync(file, JSON.stringify(spec));
      const result = spawnSync(process.execPath, [path.join(path.dirname(require.resolve('@stoplight/spectral-cli/package.json')), 'dist/index.js'), 'lint', file, '--ruleset', 'contract/.spectral.yaml', '--fail-severity', 'error'], { encoding: 'utf8' });
      assert.notEqual(result.status, 0, level);
      assert.match(result.stdout + result.stderr, /saais-server-https-or-local-sandbox/, level);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
