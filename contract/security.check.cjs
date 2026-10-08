const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Use the declared Redocly dependency to parse/resolve the actual contract.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'saais-contract-'));
const output = path.join(directory, 'openapi.json');
let spec;
try {
  execFileSync(process.execPath, [
    'node_modules/@redocly/cli/bin/cli.js', 'bundle', 'contract/openapi.yaml',
    '--config', 'contract/redocly.yaml', '--output', output,
  ], { stdio: 'pipe' });
  spec = JSON.parse(fs.readFileSync(output, 'utf8'));
} finally {
  if (fs.existsSync(output)) fs.unlinkSync(output);
  fs.rmdirSync(directory);
}
const resolve = value => value?.$ref
  ? value.$ref.slice(2).split('/').reduce((object, key) => object[key], spec)
  : value;
const methods = new Set(['get', 'post', 'put', 'patch', 'delete']);
const operations = Object.entries(spec.paths).flatMap(([route, item]) =>
  Object.entries(item).filter(([method]) => methods.has(method))
    .map(([method, operation]) => ({ route, method, operation })));
const schemas = spec.components.schemas;
const studentPath = '/functions/v1/students/{student_id}';

test('raw table endpoints cannot bypass transactional write guards', () => {
  for (const { route, method } of operations) {
    if (route.startsWith('/rest/v1/')) assert.equal(method, 'get', route);
  }
  assert.deepEqual(spec.paths['/functions/v1/accounts/{profile_id}'].patch['x-required-roles'], ['admin']);
  assert.equal(spec.paths['/rest/v1/profile'].patch, undefined);
});

test('authenticated operations specify roles, scope and failure responses', () => {
  for (const { route, operation } of operations) {
    assert.ok(operation['x-access-scope'], route);
    assert.ok(operation.responses['429'], route);
    const security = operation.security ?? spec.security;
    if (!security.some(requirement => Object.hasOwn(requirement, 'bearerAuth'))) continue;
    assert.ok(operation['x-required-roles']?.length, route);
    for (const role of operation['x-required-roles']) {
      assert.ok(['student', 'adviser', 'admin'].includes(role), route);
    }
    assert.ok(operation.responses['403'], route);
  }
});

test('Supabase project key and user JWT are AND requirements with a pre-login invitation exception', () => {
  const projectKey = spec.components.securitySchemes.supabaseProjectKey;
  assert.equal(projectKey.type, 'apiKey');
  assert.equal(projectKey.in, 'header');
  assert.equal(projectKey.name, 'apikey');
  assert.deepEqual(spec.security, [{ supabaseProjectKey: [], bearerAuth: [] }]);
  for (const { route, operation } of operations) {
    const security = operation.security ?? spec.security;
    if (route === '/functions/v1/auth/verify-invite') {
      assert.deepEqual(security, [{ supabaseProjectKey: [] }]);
      assert.deepEqual(operation['x-required-roles'], []);
      assert.ok(operation.responses['401']);
    } else {
      assert.deepEqual(security, [{ supabaseProjectKey: [], bearerAuth: [] }], route);
    }
    assert.ok(!route.startsWith('/auth/v1/'), 'Managed Auth paths must stay SDK-owned');
  }
  assert.equal(spec['x-supabase-auth-integration'].google_oauth.flow_type, 'pkce');
  assert.ok(!Object.hasOwn(schemas.VerifyInviteResponse.properties, 'access_token'));
  assert.ok(!Object.hasOwn(schemas.VerifyInviteResponse.properties, 'refresh_token'));
  const errors = spec.components.responses['401Unauthorized'].content['application/json'].schema.anyOf;
  assert.ok(errors.some(error => error.$ref.endsWith('/SupabaseGatewayAuthError')));
});

test('write bodies reject extra properties and client-controlled audit fields', () => {
  const forbidden = new Set(['id', 'created_by', 'created_at', 'updated_by', 'updated_at',
    'override_actor_id', 'override_at', 'resolved_by', 'resolved_at', 'mapped_by',
    'decided_by', 'decided_at', 'units_attempted', 'units_credited']);
  const visit = (value, label) => {
    const schema = resolve(value);
    if (!schema || typeof schema !== 'object') return;
    if (schema.type === 'object' || schema.properties) {
      assert.equal(schema.additionalProperties, false, label);
      for (const [field, child] of Object.entries(schema.properties || {})) {
        assert.ok(!forbidden.has(field), `${label}.${field}`);
        visit(child, `${label}.${field}`);
      }
    }
    if (schema.items) visit(schema.items, label);
    for (const key of ['oneOf', 'allOf', 'anyOf']) {
      for (const child of schema[key] || []) {
        // Constraint-only branches inherit the closed parent object.
        if (child.$ref || child.type === 'object') visit(child, label);
      }
    }
  };
  for (const { route, operation } of operations) {
    const body = resolve(operation.requestBody)?.content?.['application/json']?.schema;
    if (body) visit(body, route);
  }
});

test('table reads are bounded, reject embedded projections and use valid UUID filters', () => {
  for (const { route, operation } of operations.filter(value => value.route.startsWith('/rest/v1/'))) {
    const parameters = operation.parameters.map(resolve);
    const parameter = name => parameters.find(value => value.name === name);
    assert.equal(parameter('limit').schema.maximum, 1000, route);
    assert.ok(parameter('offset').schema.maximum, route);
    const projection = new RegExp(parameter('select').schema.pattern);
    assert.ok(projection.test(parameter('select').schema.default), route);
    assert.ok(new RegExp(parameter('order').schema.pattern).test(parameter('order').schema.default), route);
    for (const invalid of ['*', '*,profile(*)', 'profile(id)', ...(operation['x-required-roles'].includes('student') ? ['reason', 'override_reason'] : [])]) {
      assert.equal(projection.test(invalid), false, `${route}: ${invalid}`);
    }
  }
  const filter = new RegExp(spec.components.parameters.idQueryParam.schema.pattern);
  const id = '12345678-1234-1234-1234-123456789abc';
  for (const valid of [`eq.${id}`, `neq.${id}`, `in.(${id},${id})`]) assert.ok(filter.test(valid));
  for (const invalid of [`in.${id}`, 'eq.not-a-uuid', `in.(${Array(51).fill(id).join(',')})`]) {
    assert.equal(filter.test(invalid), false);
  }
});

test('student access remains read-only and internal notes stay staff-only', () => {
  for (const { route, method, operation } of operations) {
    if (operation['x-required-roles']?.includes('student')) assert.equal(method, 'get', route);
    if (route.includes('advising_note') || route.endsWith('/notes') || route.endsWith('/assistant')) {
      assert.ok(!operation['x-required-roles'].includes('student'), route);
    }
  }
  assert.deepEqual(spec.paths[`${studentPath}/assistant`].post['x-required-roles'], ['adviser']);
});

test('grade recording and correction are separate, with original prerequisite and INC results', () => {
  assert.deepEqual(schemas.RecordGradesRequest.required, ['school_term_id', 'course_offering_id']);
  assert.equal(schemas.RecordGradesRequest.properties.final_grade.maximum, 5);
  assert.equal(schemas.PrerequisiteGradeCorrectionRequest.properties.final_grade.maximum, 3);
  assert.ok(schemas.PrerequisiteGradeCorrectionRequest.required.includes('reason'));
  assert.ok(schemas.GradeCorrectionRequest.required.includes('expected_revision'));
  const completion = spec.paths[`${studentPath}/attempts/{attempt_id}/inc-completion`];
  assert.ok(completion.post && completion.patch);
  assert.ok(schemas.INCCompletionCorrectionRequest.required.includes('expected_updated_at'));
  assert.ok(schemas.SchoolTermInsert.required.includes('ends_on'));
  for (const [name, field] of [['AcademicSummary', 'gwa'], ['TermGrades', 'gwa'], ['ShiftPreviewResponse', 'projected_gwa']]) {
    assert.equal(schemas[name].properties[field].multipleOf, undefined, 'Weighted GWA is not a quarter-step grade');
  }
});
