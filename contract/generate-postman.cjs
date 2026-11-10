const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const ALL_ROLES = [
  'student',
  'adviser',
  'department_head',
  'department_staff',
  'dean',
  'admin',
]

const PUBLIC_PATHS = new Set([
  '/functions/v1/auth/preview-invite',
  '/functions/v1/auth/verify-invite',
  '/functions/v1/auth/decline-invite',
])

const PATH_PARAM_VARS = {
  student_id: '{{student_id}}',
  attempt_id: '{{attempt_id}}',
  school_term_id: '{{school_term_id}}',
  profile_id: '{{profile_id}}',
  flag_id: '{{flag_id}}',
  transfer_id: '{{transfer_id}}',
  decision_id: '{{decision_id}}',
  credit_id: '{{credit_id}}',
  note_id: '{{note_id}}',
  id: '{{catalog_entity_id}}',
}

const SAMPLE_BODIES = {
  inviteUser: {
    role: 'student',
    email: 'new.student.placeholder@vsu.edu.ph',
    full_name: 'Synthetic Student Placeholder',
    student_number: '26-1-00901',
    program_id: '{{program_id}}',
    curriculum_version_id: '{{curriculum_version_id}}',
    adviser_id: '{{adviser_id}}',
    entry_year: 2026,
  },
  previewInviteToken: {
    token: '{{invite_token}}',
  },
  verifyInviteToken: {
    token: '{{invite_token}}',
    password: '{{new_account_password}}',
  },
  declineInviteToken: {
    token: '{{invite_token}}',
    reason: 'Declined in API collection verification.',
  },
  updateProfile: {
    full_name: 'Updated Synthetic Name',
    status: 'active',
    consultation_hours: 'Tue & Thu, 13:00–16:00',
  },
  resendAccountInvite: {},
  revokeAccountInvite: {
    reason: 'Invitation revoked during verification.',
  },
  createFaculty: {
    code: 'FVM',
    name: 'Faculty of Veterinary Medicine',
    letterhead_prefix: 'Office of the Dean',
    letterhead_name: 'Faculty of Veterinary Medicine',
  },
  updateFaculty: {
    name: 'Faculty of Computing (Updated)',
  },
  createDepartment: {
    faculty_id: '{{faculty_id}}',
    code: 'DSW',
    name: 'Department of Software Engineering',
  },
  updateDepartment: {
    letterhead_prefix: 'Office of the Department Head',
  },
  createProgram: {
    department_id: '{{department_id}}',
    code: 'BSSE',
    name: 'Bachelor of Science in Software Engineering',
    nominal_duration: 4,
    status: 'active',
  },
  updateProgram: {
    name: 'Bachelor of Science in Computer Science',
    status: 'active',
  },
  createCurriculumVersion: {
    program_id: '{{program_id}}',
    version_label: 'BSCS 2026-2027 v1',
    effective_start: '2026-08-01',
    delinquency_threshold: 24,
    total_units: 162,
    status: 'draft',
  },
  updateCurriculumVersion: {
    version_label: 'BSCS 2024-2025 v1',
    status: 'active',
  },
  createCurriculumTerm: {
    curriculum_version_id: '{{curriculum_version_id}}',
    year_level: 2,
    term_sequence: 1,
    slots: [],
  },
  updateCurriculumTerm: {
    year_level: 2,
    term_sequence: 1,
  },
  createCurriculumTermCourse: {
    curriculum_term_id: '{{curriculum_term_id}}',
    course_id: '{{course_id}}',
    is_elective_slot: false,
    slot_type: 'required',
    nominal_units: 3,
  },
  updateCurriculumTermCourse: {
    nominal_units: 3,
    slot_type: 'required',
  },
  createCourse: {
    department_id: '{{department_id}}',
    code: 'CSCI 199',
    title: 'Undergraduate Capstone Project',
    category: 'major',
    lecture_hours: 2,
    lab_hours: 3,
    units: 3,
    is_elective: false,
    status: 'active',
    repeatable_type: 'none',
  },
  updateCourse: {
    title: 'Software Engineering (Updated)',
    status: 'active',
  },
  createPrerequisite: {
    course_id: '{{course_id}}',
    prerequisite_course_id: '{{prerequisite_course_id}}',
    type: 'strict',
  },
  createCurriculumPairEquivalence: {
    from_curriculum_version_id: '{{prior_curriculum_version_id}}',
    to_curriculum_version_id: '{{curriculum_version_id}}',
    source_course_id: '{{course_id}}',
    target_course_id: '{{course_id}}',
    note: 'Direct curriculum equivalence',
  },
  createSchoolTerm: {
    start_year: 2027,
    end_year: 2028,
    term_type: '1st Semester',
    starts_on: '2027-08-09',
    ends_on: '2027-12-17',
    encoding_deadline: '2028-01-05',
    is_locked: false,
  },
  updateSchoolTerm: {
    encoding_deadline: '2027-01-10',
  },
  createCourseOffering: {
    school_term_id: '{{school_term_id}}',
    course_id: '{{course_id}}',
    section: 'B',
    schedule: 'TTh 13:00-14:30',
    instructor: 'Prof. Maria Clara Santos',
    is_by_request: false,
  },
  updateCourseOffering: {
    section: 'A',
    instructor: 'Dr. Jose Rizalino Gomez',
  },
  closeSchoolTermEncoding: {
    scope: 'department',
    department_id: '{{department_id}}',
    closure_note: 'All department grade sheets verified.',
  },
  reopenDepartmentTermEncoding: {
    scope: 'department',
    department_id: '{{department_id}}',
  },
  setSchoolTermOverride: {
    enabled: true,
  },
  reassignAdviser: {
    adviser_id: '{{adviser_id}}',
    start_date: '2026-11-10',
    reason: 'Regular caseload balancing.',
  },
  bulkReassignAdvisers: {
    student_ids: ['{{student_id}}'],
    adviser_id: '{{adviser_id}}',
    effective_since: '2026-11-10',
    reason: 'Faculty study leave handover.',
  },
  assignStudentCurriculum: {
    program_id: '{{program_id}}',
    curriculum_version_id: '{{curriculum_version_id}}',
    start_date: '2026-11-10',
    reason: 'Approved curriculum version assignment.',
  },
  recordGrades: {
    school_term_id: '{{school_term_id}}',
    course_offering_id: '{{course_offering_id}}',
    curriculum_term_course_id: '{{curriculum_term_course_id}}',
    midterm_status: 'graded',
    midterm_grade: 1.75,
    final_grade: 1.5,
    confirmed_enrollment: true,
    continue_with_prerequisite_override: true,
    prerequisite_override_reason: 'Department-approved co-enrollment.',
  },
  encodeTermGrades: {
    school_term_id: '{{school_term_id}}',
    rows: [
      {
        course_offering_id: '{{course_offering_id}}',
        curriculum_term_course_id: '{{curriculum_term_course_id}}',
        midterm_status: 'graded',
        midterm_grade: 1.75,
        final_grade: 1.5,
        status: 'passed',
        continue_with_prerequisite_override: true,
      },
    ],
  },
  correctGrades: {
    expected_revision: 1,
    status: 'passed',
    midterm_grade: 1.75,
    final_grade: 1.5,
    reason: 'Verified against official instructor grade sheet.',
  },
  correctPrerequisiteGrade: {
    expected_revision: 1,
    final_grade: 2.0,
    reason: 'Verified historical prerequisite completion.',
  },
  completeINC: {
    completion_grade: 2.0,
    reason: 'Submitted final laboratory project within completion deadline.',
  },
  correctINCCompletion: {
    completion_grade: 1.75,
    reason: 'Recomputed completion grade per approved form.',
    expected_updated_at: '2026-11-10T09:00:00Z',
  },
  createElectiveMapping: {
    attempt_id: '{{attempt_id}}',
    curriculum_term_course_id: '{{elective_slot_id}}',
    justification: 'Approved CS technical elective credit.',
  },
  updateElectiveMapping: {
    attempt_id: '{{attempt_id}}',
    curriculum_term_course_id: '{{elective_slot_id}}',
    justification: 'Updated elective slot mapping.',
    expected_updated_at: '2026-08-20T08:00:00Z',
  },
  revokeElectiveMapping: {
    reason: 'Re-mapped to alternate elective slot.',
    expected_updated_at: '2026-08-20T08:00:00Z',
  },
  createEquivalencyDecision: {
    attempt_id: '{{attempt_id}}',
    destination_curriculum_term_course_id: '{{curriculum_term_course_id}}',
    decision_type: 'transfer_equivalency',
    justification: 'Approved syllabus equivalency.',
  },
  updateEquivalencyDecision: {
    attempt_id: '{{attempt_id}}',
    destination_curriculum_term_course_id: '{{curriculum_term_course_id}}',
    decision_type: 'transfer_equivalency',
    justification: 'Updated equivalency justification.',
    expected_updated_at: '2026-08-20T08:00:00Z',
  },
  revokeEquivalencyDecision: {
    reason: 'Superseded by updated curriculum assignment.',
    expected_updated_at: '2026-08-20T08:00:00Z',
  },
  saveAdvisingPlan: {
    expected_revision: 1,
    expected_curriculum_assignment_id: '{{student_curriculum_assignment_id}}',
    items: [
      {
        course_offering_id: '{{course_offering_id}}',
        curriculum_term_course_id: '{{curriculum_term_course_id}}',
      },
    ],
  },
  addAdvisingNote: {
    body_text: 'Advised student to prioritize CSCI 102 INC completion.',
  },
  updateAdvisingNoteArchiveState: {
    is_archived: true,
  },
  addAttemptRemark: {
    attempt_id: '{{attempt_id}}',
    curriculum_term_course_id: '{{curriculum_term_course_id}}',
    body_text: 'Pending laboratory project submission.',
  },
  previewCurriculumShift: {
    curriculum_version_id: '{{curriculum_version_id}}',
  },
  askAdvisingAssistant: {
    message: 'What courses are recommended for next semester?',
    history: [],
  },
  createGradeFlag: {
    attempt_id: '{{attempt_id}}',
    reported_stage: 'midterm',
    reported_grade_text: '1.50',
    issue_type: 'wrong_grade',
    details: 'Class card indicates 1.50 on midterm exam.',
  },
  resolveGradeFlag: {
    resolution_action: 'correct',
    corrected_grade: 1.5,
    resolution_note: 'Confirmed with instructor class record.',
    expected_revision: 1,
  },
  importGradesBatch: {
    mode: 'preview',
    school_term_id: '{{school_term_id}}',
    rows: [
      {
        row_number: 1,
        student_number: '24-1-00101',
        course_code: 'CSCI 153',
        midterm_grade: 1.75,
        final_grade: 1.5,
        status: 'passed',
      },
    ],
  },
  endorseCurriculumTransfer: {
    to_curriculum_version_id: '{{curriculum_version_id}}',
    endorsement_note: 'Endorsed transition to 2024 BSCS curriculum.',
  },
  decideCurriculumTransfer: {
    decision: 'approved',
    decision_note: 'Approved by Department Head.',
  },
  createOutsideCredit: {
    entry_type: 'transferee',
    origin_school: 'University of the Philippines Cebu',
    original_course_code: 'CMSC 11',
    original_course_title: 'Introduction to Computer Science',
    units: 3,
    grade: '1.50',
    destination_curriculum_term_course_id: '{{curriculum_term_course_id}}',
    reason: 'Validated official transcript of records.',
  },
  revokeOutsideCredit: {
    reason: 'Revoked for administrative correction.',
    expected_updated_at: '2026-08-10T08:00:00Z',
  },
  importStudentsBatch: {
    mode: 'preview',
    rows: [
      {
        row_number: 1,
        student_number: '26-1-00902',
        full_name: 'Synthetic Batch Student',
        email: 'batch.student.placeholder@vsu.edu.ph',
        program_id: '{{program_id}}',
        curriculum_version_id: '{{curriculum_version_id}}',
        adviser_id: '{{adviser_id}}',
        entry_year: 2026,
      },
    ],
  },
  markNotificationsRead: {
    mark_all: true,
    is_read: true,
  },
  evaluateScheduledNotifications: {
    reference_date: '2026-11-10',
    department_id: '{{department_id}}',
    dry_run: true,
  },
  updateSystemSettings: {
    department_id: '{{department_id}}',
    warning_pct: 25,
    probation_pct: 50,
    dismissal_pct: 75,
    sender_email: 'saais-noreply@vsu.edu.ph',
  },
  recordCompletedBackup: {
    department_id: '{{department_id}}',
    backup_label: 'Scheduled Weekly Backup',
    backup_reference: 'BKP-2026-11-10-001',
    storage_location: 'vsu-saais-backups/2026-11-10.dump',
    scope: 'institution_wide',
    completed_at: '2026-11-10T09:00:00Z',
  },
  recordAuditViewEvent: {
    event_type: 'report_viewed',
    report_type: 'department',
    details: 'Viewed DCST department cohort analytics report.',
  },
  uploadStudentPhoto: {
    avatar_url:
      'https://saais-test.supabase.co/storage/v1/object/authenticated/student-photos/00000000-0000-4000-8000-000000000101/avatar.png',
    storage_object_path:
      'student-photos/00000000-0000-4000-8000-000000000101/avatar.png',
    mime_type: 'image/png',
    file_size_bytes: 204800,
  },
}

function bundleOpenApiSpec() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'saais-postman-'))
  const outPath = path.join(tmpDir, 'openapi.json')
  try {
    execFileSync(
      process.execPath,
      [
        'node_modules/@redocly/cli/bin/cli.js',
        'bundle',
        'contract/openapi.yaml',
        '--config',
        'contract/redocly.yaml',
        '--output',
        outPath,
      ],
      { stdio: 'pipe' },
    )
    return JSON.parse(fs.readFileSync(outPath, 'utf8'))
  } finally {
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
    fs.rmdirSync(tmpDir)
  }
}

function resolveRef(spec, refObj) {
  if (!refObj || !refObj.$ref) return refObj
  return refObj.$ref
    .slice(2)
    .split('/')
    .reduce((acc, part) => (acc ? acc[part] : undefined), spec)
}

function toPostmanPathVariableUrl(openApiRoute, method = 'get') {
  const isDelete = method.toLowerCase() === 'delete'
  return openApiRoute.replace(/\{([^}]+)\}/g, (_, paramName) => {
    if (paramName === 'id' || paramName === 'mapping_id') {
      if (openApiRoute.includes('/catalog/faculty/')) {
        return isDelete ? '{{faculty_empty_id}}' : '{{faculty_id}}'
      }
      if (openApiRoute.includes('/catalog/department/')) {
        return isDelete ? '{{department_empty_id}}' : '{{department_id}}'
      }
      if (openApiRoute.includes('/catalog/program/')) {
        return isDelete ? '{{program_empty_id}}' : '{{program_id}}'
      }
      if (
        openApiRoute.includes('/catalog/curriculum-version/') ||
        openApiRoute.includes('/catalog/curriculum_version/')
      ) {
        return isDelete
          ? '{{prior_curriculum_version_id}}'
          : '{{curriculum_version_id}}'
      }
      if (
        openApiRoute.includes('/catalog/curriculum-term-course/') ||
        openApiRoute.includes('/catalog/curriculum_term_course/')
      ) {
        return '{{curriculum_term_course_id}}'
      }
      if (
        openApiRoute.includes('/catalog/curriculum-term/') ||
        openApiRoute.includes('/catalog/curriculum_term/')
      ) {
        return isDelete
          ? '{{curriculum_term_empty_id}}'
          : '{{curriculum_term_id}}'
      }
      if (
        openApiRoute.includes('/catalog/course-offering/') ||
        openApiRoute.includes('/catalog/course_offering/') ||
        openApiRoute.includes('/course-offerings/')
      ) {
        return '{{course_offering_id}}'
      }
      if (openApiRoute.includes('/catalog/course/')) {
        return isDelete ? '{{course_unreferenced_id}}' : '{{course_id}}'
      }
      if (openApiRoute.includes('/catalog/prerequisite/')) {
        return '{{prerequisite_id}}'
      }
      if (openApiRoute.includes('/catalog/curriculum-pair-equivalence')) {
        return '{{equivalence_id}}'
      }
      if (
        openApiRoute.includes('/catalog/school_term/') ||
        openApiRoute.includes('/school-terms/')
      ) {
        return '{{school_term_id}}'
      }
      if (openApiRoute.includes('/elective-mappings/')) {
        return '{{elective_mapping_id}}'
      }
    }
    return PATH_PARAM_VARS[paramName] || `{{${paramName}}}`
  })
}

function buildQueryParams(spec, operation) {
  const params = (operation.parameters || []).map((p) => resolveRef(spec, p))
  const queryItems = []

  for (const param of params) {
    if (!param || param.in !== 'query') continue
    const schema = resolveRef(spec, param.schema) || {}
    let defaultValue = ''

    if (param.name === 'select') {
      defaultValue =
        Array.isArray(schema.enum) && schema.enum.length > 0
          ? schema.enum[0]
          : 'id'
    } else if (param.name === 'student_id') {
      defaultValue =
        schema.format === 'uuid'
          ? '{{student_id}}'
          : 'eq.{{student_id}}'
    } else if (param.name === 'school_term_id') {
      defaultValue =
        schema.format === 'uuid'
          ? '{{school_term_id}}'
          : 'eq.{{school_term_id}}'
    } else if (param.name === 'department_id') {
      defaultValue =
        schema.format === 'uuid'
          ? '{{department_id}}'
          : 'eq.{{department_id}}'
    } else if (param.name === 'faculty_id') {
      defaultValue =
        schema.format === 'uuid' ? '{{faculty_id}}' : 'eq.{{faculty_id}}'
    } else if (param.name === 'program_id') {
      defaultValue =
        schema.format === 'uuid' ? '{{program_id}}' : 'eq.{{program_id}}'
    } else if (param.name === 'curriculum_version_id') {
      defaultValue =
        schema.format === 'uuid'
          ? '{{curriculum_version_id}}'
          : 'eq.{{curriculum_version_id}}'
    } else if (param.name === 'limit') {
      defaultValue = '20'
    } else if (param.name === 'offset') {
      defaultValue = '0'
    } else if (param.example !== undefined) {
      defaultValue = String(param.example)
    } else if (schema.default !== undefined) {
      defaultValue = String(schema.default)
    }

    if (param.required || param.name === 'select' || param.name === 'limit') {
      queryItems.push({
        key: param.name,
        value: defaultValue,
        description: param.description || '',
        disabled: false,
      })
    } else {
      queryItems.push({
        key: param.name,
        value: defaultValue,
        description: param.description || '',
        disabled: true,
      })
    }
  }

  return queryItems
}

function choosePrimaryRole(requiredRoles) {
  if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
    return 'admin'
  }
  const preference = [
    'student',
    'adviser',
    'department_staff',
    'department_head',
    'dean',
    'admin',
  ]
  for (const role of preference) {
    if (requiredRoles.includes(role)) {
      return role
    }
  }
  return requiredRoles[0]
}

function chooseUnauthorizedRole(requiredRoles) {
  if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
    return null
  }
  for (const candidate of ALL_ROLES) {
    if (!requiredRoles.includes(candidate)) {
      return candidate
    }
  }
  return null
}

function createPostmanRequestItem({
  name,
  method,
  openApiRoute,
  operationId,
  description,
  headers,
  queryItems,
  bodyObj,
  expectedStatuses,
}) {
  const postmanRoute = toPostmanPathVariableUrl(openApiRoute, method)
  const activeQuery = queryItems.filter((q) => !q.disabled)
  const queryString =
    activeQuery.length > 0
      ? '?' +
        activeQuery
          .map((q) => `${encodeURIComponent(q.key)}=${q.value}`)
          .join('&')
      : ''
  const rawUrl = `{{base_url}}${postmanRoute}${queryString}`

  const pathSegments = postmanRoute.replace(/^\//, '').split('/')

  const request = {
    method: method.toUpperCase(),
    header: headers,
    url: {
      raw: rawUrl,
      host: ['{{base_url}}'],
      path: pathSegments,
      query: queryItems,
    },
    description,
  }

  if (bodyObj !== undefined) {
    request.body = {
      mode: 'raw',
      raw: JSON.stringify(bodyObj, null, 2),
      options: {
        raw: {
          language: 'json',
        },
      },
    }
  }

  const statusListStr = JSON.stringify(expectedStatuses)
  const testLines = [
    `pm.test("${operationId} — status is one of ${statusListStr}", function () {`,
    `  pm.expect(${statusListStr}).to.include(pm.response.code);`,
    `});`,
  ]
  if (expectedStatuses.some((s) => s >= 400)) {
    testLines.push(
      `pm.test("${operationId} — error response includes sanitized code and message", function () {`,
      `  if (pm.response.code >= 400 && pm.response.headers.get("Content-Type")?.includes("application/json")) {`,
      `    const body = pm.response.json();`,
      `    pm.expect(body).to.be.an("object");`,
      `    pm.expect(body.code || body.error || body.message).to.be.ok;`,
      `  }`,
      `});`,
    )
  }

  return {
    name,
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: testLines,
        },
      },
    ],
    request,
    response: [],
  }
}

function generatePostmanArtifacts() {
  const spec = bundleOpenApiSpec()
  const methods = ['get', 'post', 'put', 'patch', 'delete']
  const folderMap = new Map()
  let operationCount = 0

  for (const [route, pathItem] of Object.entries(spec.paths)) {
    for (const method of methods) {
      const op = pathItem[method]
      if (!op) continue
      operationCount += 1

      const operationId = op.operationId || `${method}_${route}`
      const tag = (op.tags && op.tags[0]) || 'General'
      const isPublic = PUBLIC_PATHS.has(route)
      const requiredRoles =
        op['x-required-roles'] || (isPublic ? [] : ALL_ROLES)
      const accessScope = op['x-access-scope'] || {}
      const primaryRole = choosePrimaryRole(requiredRoles)
      const deniedRole = chooseUnauthorizedRole(requiredRoles)

      const queryItems = buildQueryParams(spec, op)
      const hasBody = Boolean(op.requestBody)
      const bodyObj = hasBody ? (SAMPLE_BODIES[operationId] ?? {}) : undefined

      const successStatuses = Object.keys(op.responses || {})
        .map((c) => Number.parseInt(c, 10))
        .filter((c) => c >= 200 && c < 300)
      const expected2xx =
        successStatuses.length > 0 ? successStatuses : [200, 201, 204]

      const authHeaders = [
        {
          key: 'apikey',
          value: '{{supabase_publishable_key}}',
          type: 'text',
        },
      ]
      if (!isPublic) {
        authHeaders.push({
          key: 'Authorization',
          value: `Bearer {{token_${primaryRole}}}`,
          type: 'text',
        })
      }
      if (hasBody) {
        authHeaders.push({
          key: 'Content-Type',
          value: 'application/json',
          type: 'text',
        })
      }

      const opSummary = op.summary || operationId
      const roleSummary = isPublic
        ? 'Public / Pre-Session (`apikey` only; no user Bearer token)'
        : `Authorized roles: ${requiredRoles.join(', ')}`
      const scopeSummary =
        Object.keys(accessScope).length > 0
          ? `\nScope rules: \`${JSON.stringify(accessScope)}\``
          : ''

      const authorizedItem = createPostmanRequestItem({
        name: `Authorized (${isPublic ? 'public apikey' : primaryRole}) — ${method.toUpperCase()} ${route}`,
        method,
        openApiRoute: route,
        operationId,
        description: `${opSummary}\n\n- **Operation ID**: \`${operationId}\`\n- **${roleSummary}**${scopeSummary}`,
        headers: authHeaders,
        queryItems,
        bodyObj,
        expectedStatuses: expected2xx,
      })

      // Build Denied (401/403) counterpart
      let deniedItem
      if (!isPublic && deniedRole) {
        const deniedHeaders = [
          {
            key: 'apikey',
            value: '{{supabase_publishable_key}}',
            type: 'text',
          },
          {
            key: 'Authorization',
            value: `Bearer {{token_${deniedRole}}}`,
            type: 'text',
          },
        ]
        if (hasBody) {
          deniedHeaders.push({
            key: 'Content-Type',
            value: 'application/json',
            type: 'text',
          })
        }
        deniedItem = createPostmanRequestItem({
          name: `Denied (Unauthorized role: ${deniedRole}) — ${method.toUpperCase()} ${route}`,
          method,
          openApiRoute: route,
          operationId,
          description: `Verifies that role \`${deniedRole}\` is rejected with HTTP 403 Forbidden (\`INSUFFICIENT_PRIVILEGE\`) on \`${operationId}\`.`,
          headers: deniedHeaders,
          queryItems,
          bodyObj,
          expectedStatuses: [403],
        })
      } else {
        // Endpoint allows all 6 roles or is public -> test missing/invalid credentials (401)
        const unauthHeaders = isPublic
          ? [] // omit apikey on public route to trigger 401 MISSING_API_KEY
          : [
              {
                key: 'apikey',
                value: '{{supabase_publishable_key}}',
                type: 'text',
              },
            ] // omit Authorization Bearer token on protected route to trigger 401
        if (hasBody) {
          unauthHeaders.push({
            key: 'Content-Type',
            value: 'application/json',
            type: 'text',
          })
        }
        deniedItem = createPostmanRequestItem({
          name: `Denied (Unauthenticated / Missing Credentials) — ${method.toUpperCase()} ${route}`,
          method,
          openApiRoute: route,
          operationId,
          description: `Verifies that unauthenticated requests to \`${operationId}\` are rejected with HTTP 401 Unauthorized.`,
          headers: unauthHeaders,
          queryItems,
          bodyObj,
          expectedStatuses: [401],
        })
      }

      if (!folderMap.has(tag)) {
        folderMap.set(tag, [])
      }
      folderMap.get(tag).push({
        name: `[${method.toUpperCase()}] ${route} (${operationId})`,
        description: `${opSummary}\n\n${roleSummary}${scopeSummary}`,
        item: [authorizedItem, deniedItem],
      })
    }
  }

  // Dedicated Cross-Scope & Domain Conflict Matrix Folder
  const crossScopeMatrixFolder = {
    name: '00. Role & Scope Authorization Scenarios',
    description:
      'Targeted cross-role, cross-department, cross-student, and domain-conflict verification scenarios across all 6 SAAIS roles.',
    item: [
      createPostmanRequestItem({
        name: 'Student Self-Access (Allowed 200) — GET /functions/v1/students/{student_id}/academic-summary',
        method: 'get',
        openApiRoute: '/functions/v1/students/{student_id}/academic-summary',
        operationId: 'getAcademicSummary_selfAllowed',
        description: 'Student reads their own academic summary (200 OK).',
        headers: [
          {
            key: 'apikey',
            value: '{{supabase_publishable_key}}',
            type: 'text',
          },
          {
            key: 'Authorization',
            value: 'Bearer {{token_student}}',
            type: 'text',
          },
        ],
        queryItems: [],
        bodyObj: undefined,
        expectedStatuses: [200],
      }),
      createPostmanRequestItem({
        name: 'Student Cross-Student Access (Denied 403) — GET /functions/v1/students/{other_student_id}/academic-summary',
        method: 'get',
        openApiRoute:
          '/functions/v1/students/00000000-0000-4000-8000-000000000102/academic-summary',
        operationId: 'getAcademicSummary_crossStudentDenied',
        description:
          'Student attempting to read another student record is rejected with 403 Forbidden.',
        headers: [
          {
            key: 'apikey',
            value: '{{supabase_publishable_key}}',
            type: 'text',
          },
          {
            key: 'Authorization',
            value: 'Bearer {{token_student}}',
            type: 'text',
          },
        ],
        queryItems: [],
        bodyObj: undefined,
        expectedStatuses: [403],
      }),
      createPostmanRequestItem({
        name: 'Department Staff Provisioning Admin Role (Denied 403) — POST /functions/v1/auth/invite',
        method: 'post',
        openApiRoute: '/functions/v1/auth/invite',
        operationId: 'inviteUser_staffAdminEscalationDenied',
        description:
          'Department Staff attempting to provision an Admin account is rejected with 403 Forbidden.',
        headers: [
          {
            key: 'apikey',
            value: '{{supabase_publishable_key}}',
            type: 'text',
          },
          {
            key: 'Authorization',
            value: 'Bearer {{token_department_staff}}',
            type: 'text',
          },
          { key: 'Content-Type', value: 'application/json', type: 'text' },
        ],
        queryItems: [],
        bodyObj: {
          role: 'admin',
          email: 'unauthorized.admin.placeholder@vsu.edu.ph',
          full_name: 'Unauthorized Admin Escalation',
        },
        expectedStatuses: [403],
      }),
      createPostmanRequestItem({
        name: 'Department Head Closing Institution-Wide Encoding (Denied 403) — POST /functions/v1/school-terms/{school_term_id}/close-encoding',
        method: 'post',
        openApiRoute:
          '/functions/v1/school-terms/{school_term_id}/close-encoding',
        operationId: 'closeSchoolTermEncoding_deptHeadInstitutionDenied',
        description:
          'Department Head attempting to close institution-wide encoding (`scope: institution`) is rejected with 403 Forbidden.',
        headers: [
          {
            key: 'apikey',
            value: '{{supabase_publishable_key}}',
            type: 'text',
          },
          {
            key: 'Authorization',
            value: 'Bearer {{token_department_head}}',
            type: 'text',
          },
          { key: 'Content-Type', value: 'application/json', type: 'text' },
        ],
        queryItems: [],
        bodyObj: {
          scope: 'institution',
          closure_note: 'Unauthorized institution-wide closure attempt',
        },
        expectedStatuses: [403],
      }),
      createPostmanRequestItem({
        name: 'Adviser Record Midterm Without Confirmation (Conflict 409) — POST /functions/v1/students/{student_id}/record-grades',
        method: 'post',
        openApiRoute: '/functions/v1/students/{student_id}/record-grades',
        operationId: 'recordGrades_unconfirmedConflict409',
        description:
          'Recording a midterm grade on a new offering with confirmed_enrollment=false returns 409 ENROLLMENT_CONFIRMATION_REQUIRED.',
        headers: [
          {
            key: 'apikey',
            value: '{{supabase_publishable_key}}',
            type: 'text',
          },
          {
            key: 'Authorization',
            value: 'Bearer {{token_adviser}}',
            type: 'text',
          },
          { key: 'Content-Type', value: 'application/json', type: 'text' },
        ],
        queryItems: [],
        bodyObj: {
          school_term_id: '{{school_term_id}}',
          course_offering_id: '{{course_offering_id}}',
          midterm_grade: 1.75,
          confirmed_enrollment: false,
          continue_with_prerequisite_override: false,
        },
        expectedStatuses: [409],
      }),
    ],
  }

  const collection = {
    info: {
      _postman_id: '00000000-0000-4000-8000-5aa15c011ec7',
      name: 'SAAIS OpenAPI 3.1 Contract Collection (6 Roles)',
      description:
        'Generated directly from `contract/openapi.yaml`. Covers operations across all 6 SAAIS roles (`student`, `adviser`, `department_head`, `department_staff`, `dean`, `admin`) with both authorized (`2xx`) and unauthorized/denied (`401`/`403`/`409`) verification requests. Uses placeholder variables and synthetic test IDs only.',
      schema:
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [
      crossScopeMatrixFolder,
      ...Array.from(folderMap.entries()).map(([tagName, items]) => ({
        name: tagName,
        item: items,
      })),
    ],
  }

  const mockEnvironment = {
    id: '00000000-0000-4000-8000-5aa15e000001',
    name: 'SAAIS Local Mock / Prism Environment',
    values: [
      { key: 'base_url', value: 'http://127.0.0.1:4010', enabled: true },
      {
        key: 'supabase_publishable_key',
        value: 'saais-mock-publishable-key',
        enabled: true,
      },
      {
        key: 'token_student',
        value: 'mock-jwt:student:00000000-0000-4000-8000-000000000101',
        enabled: true,
      },
      {
        key: 'token_adviser',
        value: 'mock-jwt:adviser:00000000-0000-4000-8000-000000000201',
        enabled: true,
      },
      {
        key: 'token_department_head',
        value: 'mock-jwt:department_head:00000000-0000-4000-8000-000000000301',
        enabled: true,
      },
      {
        key: 'token_department_staff',
        value: 'mock-jwt:department_staff:00000000-0000-4000-8000-000000000401',
        enabled: true,
      },
      {
        key: 'token_dean',
        value: 'mock-jwt:dean:00000000-0000-4000-8000-000000000501',
        enabled: true,
      },
      {
        key: 'token_admin',
        value: 'mock-jwt:admin:00000000-0000-4000-8000-000000000601',
        enabled: true,
      },
      {
        key: 'student_id',
        value: '00000000-0000-4000-8000-000000000101',
        enabled: true,
      },
      {
        key: 'profile_id',
        value: '00000000-0000-4000-8000-000000000102',
        enabled: true,
      },
      {
        key: 'adviser_id',
        value: '00000000-0000-4000-8000-000000000201',
        enabled: true,
      },
      {
        key: 'faculty_id',
        value: '10000000-0000-4000-8000-000000000001',
        enabled: true,
      },
      {
        key: 'faculty_empty_id',
        value: '10000000-0000-4000-8000-000000000003',
        enabled: true,
      },
      {
        key: 'department_id',
        value: '20000000-0000-4000-8000-000000000001',
        enabled: true,
      },
      {
        key: 'department_empty_id',
        value: '20000000-0000-4000-8000-000000000003',
        enabled: true,
      },
      {
        key: 'program_id',
        value: '30000000-0000-4000-8000-000000000001',
        enabled: true,
      },
      {
        key: 'program_empty_id',
        value: '30000000-0000-4000-8000-000000000002',
        enabled: true,
      },
      {
        key: 'curriculum_version_id',
        value: '40000000-0000-4000-8000-000000000001',
        enabled: true,
      },
      {
        key: 'prior_curriculum_version_id',
        value: '40000000-0000-4000-8000-000000000002',
        enabled: true,
      },
      {
        key: 'curriculum_term_id',
        value: '41000000-0000-4000-8000-000000000001',
        enabled: true,
      },
      {
        key: 'curriculum_term_empty_id',
        value: '41000000-0000-4000-8000-000000000004',
        enabled: true,
      },
      {
        key: 'curriculum_term_course_id',
        value: '42000000-0000-4000-8000-000000000003',
        enabled: true,
      },
      {
        key: 'elective_slot_id',
        value: '42000000-0000-4000-8000-000000000004',
        enabled: true,
      },
      {
        key: 'course_id',
        value: '50000000-0000-4000-8000-000000000003',
        enabled: true,
      },
      {
        key: 'course_unreferenced_id',
        value: '50000000-0000-4000-8000-000000000004',
        enabled: true,
      },
      {
        key: 'prerequisite_course_id',
        value: '50000000-0000-4000-8000-000000000002',
        enabled: true,
      },
      {
        key: 'prerequisite_id',
        value: '51000000-0000-4000-8000-000000000002',
        enabled: true,
      },
      {
        key: 'equivalence_id',
        value: '52000000-0000-4000-8000-000000000001',
        enabled: true,
      },
      {
        key: 'school_term_id',
        value: '60000000-0000-4000-8000-000000000002',
        enabled: true,
      },
      {
        key: 'course_offering_id',
        value: '62000000-0000-4000-8000-000000000001',
        enabled: true,
      },
      {
        key: 'student_curriculum_assignment_id',
        value: '71000000-0000-4000-8000-000000000001',
        enabled: true,
      },
      {
        key: 'attempt_id',
        value: '80000000-0000-4000-8000-000000000002',
        enabled: true,
      },
      {
        key: 'elective_mapping_id',
        value: '81000000-0000-4000-8000-000000000001',
        enabled: true,
      },
      {
        key: 'decision_id',
        value: '82000000-0000-4000-8000-000000000001',
        enabled: true,
      },
      {
        key: 'credit_id',
        value: '84000000-0000-4000-8000-000000000001',
        enabled: true,
      },
      {
        key: 'transfer_id',
        value: '85000000-0000-4000-8000-000000000001',
        enabled: true,
      },
      {
        key: 'note_id',
        value: '87000000-0000-4000-8000-000000000001',
        enabled: true,
      },
      {
        key: 'flag_id',
        value: '89000000-0000-4000-8000-000000000001',
        enabled: true,
      },
      {
        key: 'catalog_entity_id',
        value: '40000000-0000-4000-8000-000000000002',
        enabled: true,
      },
      {
        key: 'invite_token',
        value: 'synthetic-single-use-invite-token-2026',
        enabled: true,
      },
      {
        key: 'new_account_password',
        value: 'SyntheticPass!2026',
        enabled: true,
      },
    ],
    _postman_variable_scope: 'environment',
  }

  const stagingEnvironment = {
    id: '00000000-0000-4000-8000-5aa15e000002',
    name: 'SAAIS Supabase Staging Environment (Placeholders Only)',
    values: mockEnvironment.values.map((entry) => ({
      key: entry.key,
      value: `<PLACEHOLDER_${entry.key.toUpperCase()}>`,
      enabled: true,
    })),
    _postman_variable_scope: 'environment',
  }

  const outDir = path.join(process.cwd(), 'contract', 'postman')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(
    path.join(outDir, 'saais-api.postman_collection.json'),
    JSON.stringify(collection, null, 2) + '\n',
  )
  fs.writeFileSync(
    path.join(outDir, 'saais-mock.postman_environment.json'),
    JSON.stringify(mockEnvironment, null, 2) + '\n',
  )
  fs.writeFileSync(
    path.join(outDir, 'saais-staging.postman_environment.json'),
    JSON.stringify(stagingEnvironment, null, 2) + '\n',
  )

  console.log(
    `Generated Postman collection covering ${operationCount} OpenAPI operations at contract/postman/saais-api.postman_collection.json`,
  )
}

generatePostmanArtifacts()
