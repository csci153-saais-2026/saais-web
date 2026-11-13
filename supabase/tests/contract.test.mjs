import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import snapshot from '../functions/_shared/contract.json' with { type: 'json' };
const require = createRequire(import.meta.url);
const YAML = require('yaml');
test('the generated runtime snapshot matches the assigned Git contract, not the older working tree', () => {
  const contract = YAML.parse(execFileSync('git', ['show', snapshot.revision + ':contract/openapi.yaml'], { encoding: 'utf8' }));
  assert.equal(contract.info.version, '0.3.0');
  for (const operation of snapshot.operations) {
    const source = contract.paths[operation.path][operation.method.toLowerCase()];
    assert.equal(source.operationId, operation.id);
    assert.deepEqual(source['x-required-roles'], operation.roles);
    assert.deepEqual(source['x-access-scope'], operation.scope);
    assert.deepEqual(source.requestBody?.content['application/json'].schema || null, operation.input);
    assert.ok(source.responses[operation.status]);
    assert.deepEqual(source.responses[operation.status].content?.['application/json'].schema || null, operation.output);
  }
  for (const [name, schema] of Object.entries(snapshot.schemas)) assert.deepEqual(schema, contract.components.schemas[name]);
  const sql = readFileSync('supabase/migrations/20261112000400_jerome_contract.sql', 'utf8');
  assert.deepEqual(JSON.parse(sql.split('$contract$')[1]), snapshot);
});
