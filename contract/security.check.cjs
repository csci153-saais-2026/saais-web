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
  const invite = spec.paths['/functions/v1/auth/invite'].post;
  assert.ok(invite['x-required-roles'].includes('department_staff'));
  assert.equal(invite['x-access-scope'].department_staff, 'department-scoped-student-adviser-staff-and-head-invites-only');
  assert.equal(invite['x-access-scope'].department_head, 'department-scoped-student-adviser-staff-and-head-invites-only');
  for (const catalogDeleteRoute of [
    '/functions/v1/catalog/faculty/{id}',
    '/functions/v1/catalog/department/{id}',
    '/functions/v1/catalog/program/{id}',
  ]) {
    const del = spec.paths[catalogDeleteRoute].delete;
    assert.ok(del, catalogDeleteRoute);
    assert.deepEqual(del['x-required-roles'], ['admin'], catalogDeleteRoute);
    assert.ok(del.responses['204'], catalogDeleteRoute);
    assert.ok(del.responses['404'], catalogDeleteRoute);
    assert.ok(del.responses['409'], catalogDeleteRoute);
  }
});

test('department closure and course projections follow the reviewed contract', () => {
  const reopen = spec.paths['/functions/v1/school-terms/{school_term_id}/reopen-encoding'].post;
  assert.deepEqual(reopen['x-required-roles'], ['department_head', 'department_staff', 'admin']);
  assert.deepEqual(spec.paths['/functions/v1/school-terms/{school_term_id}/override'].put['x-required-roles'], ['admin']);
  for (const id of ['recordGrades', 'encodeTermGrades', 'correctGrades', 'deleteOpenTermAttempt', 'correctPrerequisiteGrade', 'resolveGradeFlag', 'importGradesBatch']) {
    assert.ok(operations.find(({ operation }) => operation.operationId === id)?.operation['x-department-closure'], id);
  }
  for (const name of ['Course', 'CourseInsert', 'CourseUpdate']) {
    assert.equal(schemas[name].properties.lecture_hours, undefined, name);
    assert.equal(schemas[name].properties.lab_hours, undefined, name);
  }
  assert.equal(spec.paths['/rest/v1/advising_note'].get['x-access-scope'].student, 'own-notes-including-archived-read-only');
});

test('reassignment authority and notification sources match the reviewed contract', () => {
  for (const operationId of ['reassignAdviser', 'bulkReassignAdvisers']) {
    const operation = operations.find(item => item.operation.operationId === operationId)?.operation;
    assert.deepEqual(operation?.['x-required-roles'], ['department_head', 'department_staff'], operationId);
  }
  const known = new Set(operations.map(({ operation }) => operation.operationId));
  for (const event of spec['x-saais-notification-triggers'].event_driven) {
    for (const source of event.source_operations ?? []) assert.ok(known.has(source), `${event.event_type}: ${source}`);
  }
  assert.match(spec.paths['/functions/v1/students/{student_id}/notes'].post.description, /active and archived/);
  assert.match(spec['x-saais-invariants'].dean_roles, /may exist alone/);
  assert.ok(schemas.StaffRoleInviteRequest.properties.role.enum.includes('dean'));
  assert.ok(!schemas.StaffRoleInviteRequest.required.includes('role_assignments'));
  assert.match(spec.paths['/functions/v1/auth/invite'].post.description, /Dean may hold only the Dean role/);
});

test('transfers preserve adviser assignment and outside credits cannot double-count', () => {
  const approval = schemas.CurriculumTransferDecisionRequest.oneOf.find(item => item.properties.decision.const === 'approved');
  const rejection = schemas.CurriculumTransferDecisionRequest.oneOf.find(item => item.properties.decision.const === 'rejected');
  assert.equal(schemas.CurriculumAssignmentRequest.properties.new_adviser_id, undefined);
  assert.equal(approval.properties.new_adviser_id, undefined);
  assert.equal(rejection.properties.new_adviser_id, undefined);
  for (const operationId of ['assignStudentCurriculum', 'decideCurriculumTransfer']) {
    const operation = operations.find(item => item.operation.operationId === operationId).operation;
    assert.match(operation.description, /does not itself change the student's adviser assignment/);
    assert.match(operation.description, /zero-gap/);
  }
  const credit = operations.find(item => item.operation.operationId === 'createOutsideCredit').operation;
  assert.match(credit.description, /duplicate live credit/);
  assert.match(credit.description, /slot already satisfied/);
  assert.equal(schemas.OutsideCreditCreateRequest.properties.units.exclusiveMinimum, 0);
  const grade = new RegExp(schemas.OutsideCreditCreateRequest.properties.grade.pattern);
  for (const value of ['1.00', '2.75', '3.00']) assert.ok(grade.test(value), value);
  for (const value of ['0.75', '3.01', '5.00', 'INC']) assert.ok(!grade.test(value), value);
});

test('authenticated operations specify roles, scope and failure responses', () => {
  for (const { route, operation } of operations) {
    assert.ok(operation['x-access-scope'], route);
    assert.ok(operation.responses['429'], route);
    const security = operation.security ?? spec.security;
    if (!security.some(requirement => Object.hasOwn(requirement, 'bearerAuth'))) continue;
    assert.ok(operation['x-required-roles']?.length, route);
    for (const role of operation['x-required-roles']) {
      assert.ok(['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin'].includes(role), route);
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
  const preSessionInviteRoutes = new Set([
    '/functions/v1/auth/verify-invite',
    '/functions/v1/auth/preview-invite',
    '/functions/v1/auth/decline-invite',
  ]);
  for (const { route, operation } of operations) {
    const security = operation.security ?? spec.security;
    if (preSessionInviteRoutes.has(route)) {
      assert.deepEqual(security, [{ supabaseProjectKey: [] }], route);
      assert.deepEqual(operation['x-required-roles'], [], route);
      assert.ok(operation.responses['401'], route);
    } else {
      assert.deepEqual(security, [{ supabaseProjectKey: [], bearerAuth: [] }], route);
    }
    assert.ok(!route.startsWith('/auth/v1/'), 'Managed Auth paths must stay SDK-owned');
  }
  assert.equal(spec['x-supabase-auth-integration'].google_oauth.flow_type, 'pkce');
  assert.equal(spec['x-supabase-auth-integration'].email_password.password_policy.min_length, 12);
  assert.equal(schemas.VerifyInviteRequest.properties.password.minLength, 12);
  assert.equal(schemas.VerifyInviteRequest.properties.password.maxLength, 128);
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

test('JSON write request strings have finite bounds', () => {
  const fixedFormats = new Set(['uuid', 'date', 'date-time', 'time']);
  const visit = (value, label, refs = new Set()) => {
    if (value?.$ref) {
      if (refs.has(value.$ref)) return;
      refs = new Set(refs).add(value.$ref);
      value = resolve(value);
    }
    if (!value || typeof value !== 'object') return;
    const types = Array.isArray(value.type) ? value.type : [value.type];
    if (types.includes('string') && !value.enum && !Object.hasOwn(value, 'const') && !fixedFormats.has(value.format)) {
      assert.ok(Number.isInteger(value.maxLength) && value.maxLength > 0, `${label} requires maxLength`);
    }
    for (const [name, child] of Object.entries(value.properties || {})) visit(child, `${label}.${name}`, refs);
    if (value.items) visit(value.items, `${label}[]`, refs);
    if (typeof value.additionalProperties === 'object') visit(value.additionalProperties, `${label}.*`, refs);
    for (const [pattern, child] of Object.entries(value.patternProperties || {})) visit(child, `${label}[${pattern}]`, refs);
    for (const key of ['oneOf', 'anyOf', 'allOf']) for (const child of value[key] || []) visit(child, label, refs);
  };
  assert.throws(() => visit({ additionalProperties: { type: 'string' } }, 'map'), /maxLength/);
  assert.throws(() => visit({ patternProperties: { '^x': { type: 'string' } } }, 'map'), /maxLength/);
  visit({ additionalProperties: { type: 'string', maxLength: 10 } }, 'bounded-map');
  for (const { route, method, operation } of operations.filter(item => item.method !== 'get')) {
    const body = resolve(operation.requestBody)?.content?.['application/json']?.schema;
    if (body) visit(body, `${method} ${route}`);
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

test('student access is restricted to reads plus allowlisted self-service writes, and internal remarks/AI stay staff-only', () => {
  const allowedStudentWrites = new Set([
    'post /functions/v1/students/{student_id}/grade-flags',
    'put /functions/v1/students/{student_id}/photo',
    'delete /functions/v1/students/{student_id}/photo',
    'post /functions/v1/notifications/mark-read',
    'post /functions/v1/audit/view-event',
  ]);
  for (const { route, method, operation } of operations) {
    if (operation['x-required-roles']?.includes('student') && method !== 'get') {
      assert.ok(allowedStudentWrites.has(`${method} ${route}`), `${method} ${route}`);
    }
    if (
      route.includes('attempt_remark') ||
      route.endsWith('/remarks') ||
      route.endsWith('/notes') ||
      route.includes('/notes/') ||
      route.endsWith('/assistant')
    ) {
      assert.ok(!operation['x-required-roles'].includes('student'), route);
    }
  }
  for (const key of allowedStudentWrites) {
    const [method, route] = key.split(' ');
    const operation = spec.paths[route]?.[method];
    assert.ok(operation?.['x-required-roles']?.includes('student'), key);
    const scope = operation['x-access-scope'];
    if (route === '/functions/v1/audit/view-event') {
      assert.equal(scope, 'authorized-record-viewer', key);
      assert.match(operation.description, /Students may log events only for their own authorized record/);
    } else {
      assert.equal(typeof scope === 'string' ? scope : scope?.student, 'own-records', key);
    }
  }
  assert.ok(spec.paths['/rest/v1/advising_note'].get['x-required-roles'].includes('student'));
  assert.equal(spec.paths['/rest/v1/advising_note'].get['x-access-scope'].student, 'own-notes-including-archived-read-only');
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
  assert.ok(schemas.ProgramInsert.required.includes('department_id'));
  assert.ok(!schemas.ProgramInsert.required.includes('initial_curriculum'));
  assert.deepEqual(schemas.StudentPhotoUpdateRequest.properties.mime_type.enum, ['image/jpeg', 'image/png']);
  assert.equal(schemas.StudentPhotoUpdateRequest.properties.file_size_bytes.maximum, 2097152);
  for (const event of ['sign_in_succeeded', 'login_rejected', 'password_changed']) {
    assert.ok(!schemas.AuditViewEventRequest.properties.event_type.enum.includes(event), event);
  }
  assert.ok(schemas.AuditViewEventRequest.properties.event_type.enum.includes('report_viewed'));
  assert.equal(schemas.CurriculumTransferDecisionRequest.oneOf.length, 2);
  for (const [name, field] of [['AcademicSummary', 'gwa'], ['TermGrades', 'gwa'], ['ShiftPreviewResponse', 'projected_gwa']]) {
    assert.equal(schemas[name].properties[field].multipleOf, undefined, 'Weighted GWA is not a quarter-step grade');
  }
});


test('student invitation requires a non-null initial adviser', () => {
  const student = schemas.StudentInviteRequest;
  assert.ok(student.required.includes('adviser_id'));
  assert.equal(student.properties.adviser_id.type, 'string');
  assert.equal(student.properties.adviser_id.format, 'uuid');
  assert.ok(schemas.StudentBatchImportRowInput.required.includes('adviser_id'));
  assert.equal(schemas.StudentBatchImportRowInput.properties.adviser_id.type, 'string');
  assert.match(schemas.InviteRequest.description, /other invite variants cannot add a student role/);
  assert.match(spec['x-saais-invariants'].student_profile, /active initial adviser/);
});


test('passed courses cannot be retaken through grade entry or import', () => {
  assert.deepEqual(schemas.RepeatableType.enum, ['none']);
  assert.match(spec['x-saais-invariants'].course_retakes, /no new attempt/);
  for (const id of ['recordGrades', 'encodeTermGrades', 'importGradesBatch']) {
    assert.match(operations.find(x => x.operation.operationId === id).operation.description, /pass/i, id);
  }
});


test('department closure permits only first timely INC completion', () => {
  const route = spec.paths['/functions/v1/students/{student_id}/attempts/{attempt_id}/inc-completion'];
  assert.match(route.post.description, /department.*closed encoding/);
  assert.match(route.post.description, /before\/on existing deadline/);
  assert.match(route.patch.description, /blocked by a department encoding closure/);
});


test('cross-department transfers retain the assigned adviser until destination reassignment', () => {
  const transfer = operations.find(x => x.operation.operationId === 'decideCurriculumTransfer').operation;
  const single = operations.find(x => x.operation.operationId === 'reassignAdviser').operation;
  const bulk = operations.find(x => x.operation.operationId === 'bulkReassignAdvisers').operation;
  assert.match(transfer.description, /existing adviser remains current/);
  assert.match(transfer.description, /does not grant broader access/);
  assert.match(single.description, /destination department.s Head or Staff/);
  assert.match(single.description, /current adviser belongs to the former department/);
  assert.match(bulk.description, /student.s current destination department/);
  assert.deepEqual(single['x-required-roles'], ['department_head', 'department_staff']);
});


test('closure scope and semester retake history reflect confirmed rules', () => {
  for (const id of ['recordGrades', 'encodeTermGrades', 'correctGrades', 'importGradesBatch']) {
    const op = operations.find(x => x.operation.operationId === id).operation;
    assert.match(op['x-department-closure'], /student.s current department/);
    assert.match(op['x-department-closure'], /another department/);
  }
  const summary = operations.find(x => x.operation.operationId === 'getAcademicSummary').operation;
  assert.match(summary.description, /earlier failure counts in cumulative GWA/);
  assert.match(summary.description, /replaces the failure in cumulative GWA/);
  assert.match(summary.description, /marked Repeated and excluded/);
  assert.match(summary.description, /including INC and DR, do not replace/);
  assert.match(summary.description, /does not add a second cumulative contribution/);
  assert.match(summary.description, /grade times its units divided by total included units/);
  assert.doesNotMatch(summary.description, /weighting remains pending/);
  assert.ok(schemas.AttemptResult.required.includes('is_repeated'));
  assert.ok(schemas.AttemptResult.required.includes('counts_toward_cumulative_gwa'));
});
