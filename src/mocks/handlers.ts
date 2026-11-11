import { http, HttpResponse } from 'msw'
import type { ApiSchema } from '@/lib/api/types'
import {
  canAccessDepartment,
  canAccessFaculty,
  hasMockRole,
  MOCK_IDS,
  MOCK_PERSONAS,
  resolveMockPersonaFromAuthHeader,
  type MockPersona,
  type SaaisRole,
} from './personas'
import { getMockDatabase } from './store'

let syntheticUuidCounter = 100

function alreadyPassedCourse(studentId: string, offeringId: string, existingAttemptId?: string): boolean {
  const db = getMockDatabase()
  const courseId = db.courseOfferings.find(o => o.id === offeringId)?.course_id
  return Boolean(courseId && db.attemptResults.some(a => a.student_id === studentId && a.id !== existingAttemptId && a.effective_status === 'passed' && db.courseOfferings.some(o => o.id === a.course_offering_id && o.course_id === courseId)))
}

const departmentInviteRoles = new Set(['student', 'adviser', 'department_staff', 'department_head'])

function canManageDepartmentInvite(persona: MockPersona, profile: ApiSchema<'Profile'>): boolean {
  if (persona.roles.includes('admin')) return true
  const roles = profile.roles?.length ? profile.roles : [profile.role]
  return profile.id !== persona.profileId && !!persona.departmentId &&
    profile.department_id === persona.departmentId && roles.every(role => departmentInviteRoles.has(role))
}

function departmentEncodingClosed(studentId: string, termId: string): boolean {
  const db = getMockDatabase()
  const departmentId = db.profiles.find(p => p.id === studentId)?.department_id
  return !!departmentId && db.departmentTermEncodings.some(c =>
    c.department_id === departmentId && c.school_term_id === termId && c.is_closed)
}

function attemptEncodingClosed(studentId: string, attemptId: string): boolean {
  const db = getMockDatabase()
  const attempt = db.attemptResults.find(a => a.id === attemptId && a.student_id === studentId)
  const termId = db.courseOfferings.find(o => o.id === attempt?.course_offering_id)?.school_term_id
  return !!termId && departmentEncodingClosed(studentId, termId)
}

function encodingClosedResponse() {
  return errorJson(409, 'TERM_LOCKED', 'Grade encoding is closed for this department and term.')
}

function nextSyntheticUuid(): string {
  syntheticUuidCounter += 1
  const hex = syntheticUuidCounter.toString(16).padStart(12, '0')
  return `99999999-0000-4000-8000-${hex}`
}

function errorJson(
  status: number,
  code: string,
  message: string,
  details: string | null = null,
  hint: string | null = null,
) {
  const payload: ApiSchema<'Error'> = {
    code,
    message,
    details,
    hint,
  }
  return HttpResponse.json(payload, { status })
}

function requireApiKey(request: Request): Response | null {
  const apiKey = request.headers.get('apikey')?.trim()
  if (!apiKey) {
    return errorJson(
      401,
      'MISSING_API_KEY',
      'Supabase publishable API key (apikey header) is required.',
      null,
      'Include the apikey header on every request.',
    )
  }
  return null
}

function authenticateRequest(
  request: Request,
  allowedRoles?: readonly SaaisRole[],
): { persona: MockPersona } | { response: Response } {
  const missingKey = requireApiKey(request)
  if (missingKey) {
    return { response: missingKey }
  }

  const persona = resolveMockPersonaFromAuthHeader(
    request.headers.get('Authorization'),
  )
  if (!persona) {
    return {
      response: errorJson(
        401,
        'PGRST301',
        'Valid user Bearer access token is required.',
        null,
        'Provide Authorization: Bearer <access_token>.',
      ),
    }
  }

  if (allowedRoles && !hasMockRole(persona, allowedRoles)) {
    return {
      response: errorJson(
        403,
        'INSUFFICIENT_PRIVILEGE',
        `Role '${persona.primaryRole}' is not authorized for this operation.`,
        `Allowed roles: ${allowedRoles.join(', ')}`,
        null,
      ),
    }
  }

  return { persona }
}

function matchesPostgrestOperator(
  fieldValue: unknown,
  filterExpr: string,
): boolean {
  if (filterExpr === 'is.null') {
    return fieldValue === null || fieldValue === undefined
  }
  if (filterExpr === 'not.is.null') {
    return fieldValue !== null && fieldValue !== undefined
  }
  if (filterExpr.startsWith('eq.')) {
    const target = filterExpr.slice(3)
    return String(fieldValue) === target
  }
  if (filterExpr.startsWith('neq.')) {
    const target = filterExpr.slice(4)
    return String(fieldValue) !== target
  }
  if (filterExpr.startsWith('in.(') && filterExpr.endsWith(')')) {
    const items = filterExpr
      .slice(4, -1)
      .split(',')
      .map((s) => s.trim())
    return items.includes(String(fieldValue))
  }
  if (filterExpr.startsWith('ilike.')) {
    const pattern = filterExpr
      .slice(6)
      .replace(/^\*+|\*+$/g, '')
      .replace(/^%+|%+$/g, '')
      .toLowerCase()
    return String(fieldValue ?? '')
      .toLowerCase()
      .includes(pattern)
  }
  if (filterExpr.startsWith('like.')) {
    const pattern = filterExpr
      .slice(5)
      .replace(/^\*+|\*+$/g, '')
      .replace(/^%+|%+$/g, '')
    return String(fieldValue ?? '').includes(pattern)
  }
  if (filterExpr.startsWith('gte.')) {
    return String(fieldValue ?? '') >= filterExpr.slice(4)
  }
  if (filterExpr.startsWith('lte.')) {
    return String(fieldValue ?? '') <= filterExpr.slice(4)
  }
  if (filterExpr.startsWith('gt.')) {
    return String(fieldValue ?? '') > filterExpr.slice(3)
  }
  if (filterExpr.startsWith('lt.')) {
    return String(fieldValue ?? '') < filterExpr.slice(3)
  }
  return true
}

function applyPostgrestQuery<T extends object>(
  rows: readonly T[],
  url: URL,
): Response {
  const reservedParams = new Set(['select', 'order', 'limit', 'offset', 'and', 'or'])
  let filtered = [...rows]

  url.searchParams.forEach((value, key) => {
    if (reservedParams.has(key)) return
    filtered = filtered.filter((row) => {
      const record = row as Record<string, unknown>
      return matchesPostgrestOperator(record[key], value)
    })
  })

  const andParam = url.searchParams.get('and')
  if (andParam) {
    const m =
      /^\(created_at\.gte\.([^,]+),created_at\.lte\.([^)]+)\)$/.exec(andParam)
    if (m && m[1] && m[2]) {
      const from = m[1]
      const to = m[2]
      filtered = filtered.filter((row) => {
        const createdAt = String(
          (row as Record<string, unknown>).created_at ?? '',
        )
        return createdAt >= from && createdAt <= to
      })
    }
  }

  const limitParam = url.searchParams.get('limit')
  const offsetParam = url.searchParams.get('offset')
  const total = filtered.length
  const offset = offsetParam ? Math.max(0, Number.parseInt(offsetParam, 10)) : 0
  const limit = limitParam
    ? Math.max(1, Number.parseInt(limitParam, 10))
    : Math.max(total, 20)

  const paged = filtered.slice(offset, offset + limit)
  const contentRange =
    paged.length > 0
      ? `${offset}-${offset + paged.length - 1}/${total}`
      : `*/${total}`

  return HttpResponse.json(paged, {
    status: 200,
    headers: {
      'Content-Range': contentRange,
    },
  })
}

function canAccessStudentRecord(
  persona: MockPersona,
  studentId: string,
): boolean {
  if (persona.roles.includes('admin')) return true
  if (persona.roles.includes('student')) {
    return persona.profileId === studentId
  }
  const db = getMockDatabase()
  const org = db.studentOrganizations.find((s) => s.student_id === studentId)
  if (!org) return true
  if (persona.roles.includes('dean')) {
    return canAccessFaculty(persona, org.faculty_id)
  }
  return canAccessDepartment(persona, org.department_id)
}

export const saaisMswHandlers = [
  // ===========================================================================
  // 1. Pre-login / Public & Auth Edge Functions
  // ===========================================================================
  http.get('*/functions/v1/health', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    return HttpResponse.json({
      status: 'ok',
      service: 'saais-api',
      timestamp: '2026-11-10T08:00:00Z',
    })
  }),

  http.post('*/functions/v1/auth/preview-invite', async ({ request }) => {
    const missingKey = requireApiKey(request)
    if (missingKey) return missingKey
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'PreviewInviteRequest'>
      | null
    if (!body?.token || body.token.trim().length < 8) {
      return errorJson(400, 'INVALID_TOKEN', 'Invitation token is invalid.')
    }
    if (body.token === 'expired-invite-token') {
      return errorJson(409, 'INVITE_EXPIRED', 'Invitation token has expired.')
    }
    const response: ApiSchema<'PreviewInviteResponse'> = {
      valid: true,
      status: 'pending',
      email: MOCK_PERSONAS.student_secondary.email,
      full_name: MOCK_PERSONAS.student_secondary.fullName,
      role: 'student',
      roles: ['student'],
      faculty_name: 'Faculty of Computing',
      department_name: 'Department of Computer Science and Technology',
      program_code: 'BSCS',
      expires_at: '2026-12-31T23:59:59Z',
    }
    return HttpResponse.json(response, { status: 200 })
  }),

  http.post('*/functions/v1/auth/verify-invite', async ({ request }) => {
    const missingKey = requireApiKey(request)
    if (missingKey) return missingKey
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'VerifyInviteRequest'>
      | null
    if (!body?.token || !body?.password) {
      return errorJson(400, 'INVALID_INPUT', 'Token and password are required.')
    }
    if (body.password.length < 12 || body.password.length > 128) {
      return errorJson(
        400,
        'WEAK_PASSWORD',
        'Password must be between 12 and 128 characters.',
      )
    }
    const response: ApiSchema<'VerifyInviteResponse'> = {
      success: true,
      message: 'Account successfully activated.',
    }
    return HttpResponse.json(response, { status: 200 })
  }),

  http.post('*/functions/v1/auth/decline-invite', async ({ request }) => {
    const missingKey = requireApiKey(request)
    if (missingKey) return missingKey
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'DeclineInviteRequest'>
      | null
    if (!body?.token) {
      return errorJson(400, 'INVALID_TOKEN', 'Invitation token is required.')
    }
    const response: ApiSchema<'DeclineInviteResponse'> = {
      success: true,
      message: 'Invitation declined.',
      invitation_status: 'declined',
    }
    return HttpResponse.json(response, { status: 200 })
  }),

  http.post('*/functions/v1/auth/invite', async ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const { persona } = auth
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'InviteRequest'>
      | null
    if (!body || !body.email || !body.full_name || !body.role) {
      return errorJson(400, 'INVALID_INPUT', 'Missing required invite fields.')
    }
    if (body.email.toLowerCase() === persona.email.toLowerCase()) {
      return errorJson(403, 'INSUFFICIENT_PRIVILEGE', 'Cannot assign roles to yourself.')
    }

    if (!persona.roles.includes('admin')) {
      const assignments = body.role_assignments ?? []
      if (!departmentInviteRoles.has(body.role) || assignments.some(a => !departmentInviteRoles.has(a.role))) {
        return errorJson(
          403,
          'INSUFFICIENT_PRIVILEGE',
          `Department Head / Staff cannot provision role '${body.role}'.`,
          'Only student, adviser, department_staff, and department_head are allowed within caller department.',
        )
      }
      if (
        'department_id' in body &&
        body.department_id &&
        body.department_id !== persona.departmentId
      ) {
        return errorJson(
          403,
          'INSUFFICIENT_PRIVILEGE',
          'Cannot provision accounts outside your assigned department.',
        )
      }
      const program = body.role === 'student'
        ? getMockDatabase().programs.find(p => p.id === body.program_id)
        : undefined
      if (assignments.some(a => (a.department_id && a.department_id !== persona.departmentId) ||
            (a.faculty_id && a.faculty_id !== persona.facultyId)) ||
          (body.role === 'student' && (!program || program.department_id !== persona.departmentId)) ||
          ('faculty_id' in body && body.faculty_id && body.faculty_id !== persona.facultyId)) {
        return errorJson(403, 'INSUFFICIENT_PRIVILEGE', 'Cannot provision this account within your department.')
      }
    }

    const db = getMockDatabase()
    if (
      db.profiles.some(
        (p) => p.email.toLowerCase() === body.email.toLowerCase(),
      )
    ) {
      return errorJson(
        409,
        'DUPLICATE_EMAIL',
        `An account with email '${body.email}' already exists.`,
      )
    }

    if (body.role !== 'student' && body.role_assignments?.some(a => a.role === 'student')) {
      return errorJson(400, 'INVALID_INPUT', 'Student roles require student provisioning details and an initial adviser.')
    }
    if (body.role === 'student') {
      const adviser = db.profiles.find(p => p.id === body.adviser_id && p.status === 'active' && p.roles?.includes('adviser'))
      const program = db.programs.find(p => p.id === body.program_id)
      const curriculum = db.curriculumVersions.find(c => c.id === body.curriculum_version_id && c.program_id === body.program_id && c.status === 'active')
      if (!body.adviser_id || !adviser || !program || !curriculum || adviser.department_id !== program.department_id) {
        return errorJson(400, 'INVALID_INPUT', 'An eligible active adviser and matching active curriculum are required.')
      }
    }

    const newProfileId = nextSyntheticUuid()
    db.profiles.push({
      id: newProfileId,
      role: body.role,
      roles: [...new Set([body.role, ...(body.role_assignments ?? []).map(a => a.role)])],
      email: body.email,
      full_name: body.full_name,
      student_number:
        body.role === 'student' && 'student_number' in body
          ? body.student_number
          : null,
      status: 'invited',
      invitation_status: 'pending',
      invitation_sent_at: '2026-11-10T08:00:00Z',
      invitation_expires_at: '2026-11-17T08:00:00Z',
      created_at: '2026-11-10T08:00:00Z',
      updated_at: '2026-11-10T08:00:00Z',
      faculty_id: persona.facultyId ?? MOCK_IDS.facultyComputing,
      department_id: persona.departmentId ?? MOCK_IDS.deptDcst,
      avatar_url: null,
      consultation_hours: null,
    })

    if (body.role === 'student') {
      const adviser = db.profiles.find(p => p.id === body.adviser_id)!
      const program = db.programs.find(p => p.id === body.program_id)!
      const assignmentId = nextSyntheticUuid()
      db.studentCurriculumAssignments.push({ id: assignmentId, student_id: newProfileId, curriculum_version_id: body.curriculum_version_id, start_date: '2026-11-10', end_date: null, change_note: 'Initial curriculum assignment', created_at: '2026-11-10T08:00:00Z' })
      db.studentOrganizations.push({ student_id: newProfileId, student_curriculum_assignment_id: assignmentId, curriculum_version_id: body.curriculum_version_id, program_id: body.program_id, department_id: program.department_id, faculty_id: adviser.faculty_id, adviser_id: body.adviser_id, entry_year: body.entry_year ?? null })
      db.adviserAssignments.push({ id: nextSyntheticUuid(), student_id: newProfileId, adviser_id: body.adviser_id, adviser_name: adviser.full_name, adviser_email: adviser.email, adviser_faculty_name: null, adviser_consultation_hours: adviser.consultation_hours ?? null, start_date: '2026-11-10', end_date: null, handed_over_to_adviser_id: null, handed_over_to_name: null, handover_label: null, created_at: '2026-11-10T08:00:00Z' })
    }

    const response: ApiSchema<'InviteResponse'> = {
      success: true,
      message: 'Invitation email dispatched successfully.',
      profile_id: newProfileId,
      invitation_status: 'pending',
      invitation_sent_at: '2026-11-10T08:00:00Z',
      invitation_expires_at: '2026-11-17T08:00:00Z',
    }
    return HttpResponse.json(response, { status: 201 })
  }),

  // ===========================================================================
  // 2. PostgREST Read Projections (/rest/v1/*)
  // ===========================================================================
  http.get('*/rest/v1/profile', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.profiles.filter((p) => p.id === persona.profileId)
      : db.profiles
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/role_assignment', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.roleAssignments.filter((r) => r.profile_id === persona.profileId)
      : db.roleAssignments
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/faculty', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    return applyPostgrestQuery(
      getMockDatabase().faculties,
      new URL(request.url),
    )
  }),

  http.get('*/rest/v1/department', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    return applyPostgrestQuery(
      getMockDatabase().departments,
      new URL(request.url),
    )
  }),

  http.get('*/rest/v1/program', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    return applyPostgrestQuery(getMockDatabase().programs, new URL(request.url))
  }),

  http.get('*/rest/v1/curriculum_version', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    return applyPostgrestQuery(
      getMockDatabase().curriculumVersions,
      new URL(request.url),
    )
  }),

  http.get('*/rest/v1/curriculum_term', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    return applyPostgrestQuery(
      getMockDatabase().curriculumTerms,
      new URL(request.url),
    )
  }),

  http.get('*/rest/v1/curriculum_term_course', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    return applyPostgrestQuery(
      getMockDatabase().curriculumTermCourses,
      new URL(request.url),
    )
  }),

  http.get('*/rest/v1/course', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    return applyPostgrestQuery(getMockDatabase().courses, new URL(request.url))
  }),

  http.get('*/rest/v1/prerequisite', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    return applyPostgrestQuery(
      getMockDatabase().prerequisites,
      new URL(request.url),
    )
  }),

  http.get('*/rest/v1/curriculum_pair_equivalence', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    return applyPostgrestQuery(
      getMockDatabase().curriculumPairEquivalences,
      new URL(request.url),
    )
  }),

  http.get('*/rest/v1/school_term', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    return applyPostgrestQuery(
      getMockDatabase().schoolTerms,
      new URL(request.url),
    )
  }),

  http.get('*/rest/v1/department_term_encoding', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    return applyPostgrestQuery(
      getMockDatabase().departmentTermEncodings,
      new URL(request.url),
    )
  }),

  http.get('*/rest/v1/course_offering', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    return applyPostgrestQuery(
      getMockDatabase().courseOfferings,
      new URL(request.url),
    )
  }),

  http.get('*/rest/v1/adviser_assignment', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.adviserAssignments.filter((a) => a.student_id === persona.profileId)
      : db.adviserAssignments
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/student_curriculum_assignment', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.studentCurriculumAssignments.filter(
          (a) => a.student_id === persona.profileId,
        )
      : db.studentCurriculumAssignments
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/student_organization', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.studentOrganizations.filter(
          (s) => s.student_id === persona.profileId,
        )
      : db.studentOrganizations
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/attempt', ({ request }) => {
    const auth = authenticateRequest(request, [
      'student',
      'adviser',
      'department_head',
      'dean',
      'admin',
    ])
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.attempts.filter((a) => a.student_id === persona.profileId)
      : db.attempts
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/attempt_result', ({ request }) => {
    const auth = authenticateRequest(request, [
      'student',
      'adviser',
      'department_head',
      'dean',
      'admin',
    ])
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.attemptResults.filter((a) => a.student_id === persona.profileId)
      : db.attemptResults
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/inc_resolution', ({ request }) => {
    const auth = authenticateRequest(request, [
      'student',
      'adviser',
      'department_head',
      'dean',
      'admin',
    ])
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.incResolutions.filter((a) => a.student_id === persona.profileId)
      : db.incResolutions
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/elective_mapping', ({ request }) => {
    const auth = authenticateRequest(request, [
      'student',
      'adviser',
      'department_head',
      'dean',
      'admin',
    ])
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.electiveMappings.filter((a) => a.student_id === persona.profileId)
      : db.electiveMappings
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/equivalency_decision', ({ request }) => {
    const auth = authenticateRequest(request, [
      'student',
      'adviser',
      'department_head',
      'dean',
      'admin',
    ])
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.equivalencyDecisions.filter(
          (a) => a.student_id === persona.profileId,
        )
      : db.equivalencyDecisions
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/outside_credit', ({ request }) => {
    const auth = authenticateRequest(request, [
      'student',
      'adviser',
      'department_head',
      'dean',
      'admin',
    ])
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.outsideCredits.filter((a) => a.student_id === persona.profileId)
      : db.outsideCredits
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/curriculum_transfer_request', ({ request }) => {
    const auth = authenticateRequest(request, [
      'student',
      'adviser',
      'department_head',
      'dean',
      'admin',
    ])
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.curriculumTransferRequests.filter(
          (a) => a.student_id === persona.profileId,
        )
      : db.curriculumTransferRequests
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/advising_plan', ({ request }) => {
    const auth = authenticateRequest(request, [
      'student',
      'adviser',
      'department_head',
      'dean',
      'admin',
    ])
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.advisingPlans.filter((a) => a.student_id === persona.profileId)
      : db.advisingPlans
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/advising_plan_item', ({ request }) => {
    const auth = authenticateRequest(request, [
      'student',
      'adviser',
      'department_head',
      'dean',
      'admin',
    ])
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.advisingPlanItems.filter((a) => a.student_id === persona.profileId)
      : db.advisingPlanItems
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/advising_note', ({ request }) => {
    const auth = authenticateRequest(request, [
      'student',
      'adviser',
      'department_head',
      'dean',
      'admin',
    ])
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.advisingNotes.filter((a) => a.student_id === persona.profileId)
      : db.advisingNotes
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/attempt_remark', ({ request }) => {
    const auth = authenticateRequest(request, [
      'adviser',
      'department_head',
      'dean',
      'admin',
    ])
    if ('response' in auth) return auth.response
    const db = getMockDatabase()
    return applyPostgrestQuery(db.attemptRemarks, new URL(request.url))
  }),

  http.get('*/rest/v1/grade_flag', ({ request }) => {
    const auth = authenticateRequest(request, [
      'student',
      'adviser',
      'department_head',
      'dean',
      'admin',
    ])
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = persona.roles.includes('student')
      ? db.gradeFlags.filter((a) => a.student_id === persona.profileId)
      : db.gradeFlags
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/notification', ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    const { persona } = auth
    const db = getMockDatabase()
    const rows = db.notifications.filter(
      (n) => n.recipient_id === persona.profileId,
    )
    return applyPostgrestQuery(rows, new URL(request.url))
  }),

  http.get('*/rest/v1/system_settings', ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'dean',
      'department_head',
      'adviser',
    ])
    if ('response' in auth) return auth.response
    return applyPostgrestQuery(
      getMockDatabase().systemSettings,
      new URL(request.url),
    )
  }),

  http.get('*/rest/v1/audit_log', ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'dean',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    return applyPostgrestQuery(
      getMockDatabase().auditLogEntries,
      new URL(request.url),
    )
  }),

  http.get('*/rest/v1/audit_log_entry', ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'dean',
      'department_head',
      'adviser',
    ])
    if ('response' in auth) return auth.response
    return applyPostgrestQuery(
      getMockDatabase().auditLogEntries,
      new URL(request.url),
    )
  }),

  // ===========================================================================
  // 3. Accounts & Directory Edge Functions
  // ===========================================================================
  http.get('*/functions/v1/accounts', ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'dean',
      'department_head',
      'department_staff',
      'adviser',
    ])
    if ('response' in auth) return auth.response
    const db = getMockDatabase()
    const summaries: ApiSchema<'AccountSummary'>[] = db.profiles.map(
      (profile) => ({
        profile,
        role_assignments: db.roleAssignments.filter(
          (r) => r.profile_id === profile.id,
        ),
        student_organization:
          db.studentOrganizations.find((s) => s.student_id === profile.id) ??
          null,
      }),
    )
    return HttpResponse.json(summaries, { status: 200 })
  }),

  http.patch('*/functions/v1/accounts/:profile_id', async ({ request, params }) => {
    const auth = authenticateRequest(request, ['admin'])
    if ('response' in auth) return auth.response
    const profileId = String(params.profile_id)
    const db = getMockDatabase()
    const profile = db.profiles.find((p) => p.id === profileId)
    if (!profile) {
      return errorJson(404, 'NOT_FOUND', 'Profile not found.')
    }
    const body = (await request.json().catch(() => ({}))) as ApiSchema<'AdminProfileUpdate'>
    const updated: ApiSchema<'Profile'> = {
      ...profile,
      ...(body.full_name !== undefined ? { full_name: body.full_name } : {}),
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.consultation_hours !== undefined
        ? { consultation_hours: body.consultation_hours }
        : {}),
      updated_at: '2026-11-10T09:00:00Z',
    }
    const idx = db.profiles.findIndex((p) => p.id === profileId)
    db.profiles[idx] = updated
    return HttpResponse.json(updated, { status: 200 })
  }),

  http.post(
    '*/functions/v1/accounts/:profile_id/resend-invite',
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'department_head',
        'department_staff',
      ])
      if ('response' in auth) return auth.response
      const profileId = String(params.profile_id)
      const db = getMockDatabase()
      const profile = db.profiles.find((p) => p.id === profileId)
      if (!profile) {
        return errorJson(404, 'NOT_FOUND', 'Account not found.')
      }
      if (!canManageDepartmentInvite(auth.persona, profile)) {
        return errorJson(403, 'INSUFFICIENT_PRIVILEGE', 'Cannot manage this invitation.')
      }
      const res: ApiSchema<'ResendInviteResponse'> = {
        success: true,
        message: 'Invitation regenerated and dispatched.',
        profile_id: profileId,
        invitation_status: 'pending',
        invitation_sent_at: '2026-11-10T09:00:00Z',
        invitation_expires_at: '2026-11-17T09:00:00Z',
      }
      return HttpResponse.json(res, { status: 200 })
    },
  ),

  http.post(
    '*/functions/v1/accounts/:profile_id/revoke-invite',
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'department_head',
        'department_staff',
      ])
      if ('response' in auth) return auth.response
      const profileId = String(params.profile_id)
      const db = getMockDatabase()
      const profile = db.profiles.find((p) => p.id === profileId)
      if (!profile) {
        return errorJson(404, 'NOT_FOUND', 'Account not found.')
      }
      if (!canManageDepartmentInvite(auth.persona, profile)) {
        return errorJson(403, 'INSUFFICIENT_PRIVILEGE', 'Cannot manage this invitation.')
      }
      const updated: ApiSchema<'Profile'> = {
        ...profile,
        status: 'disabled',
        invitation_status: 'revoked',
      }
      const idx = db.profiles.findIndex((p) => p.id === profileId)
      db.profiles[idx] = updated
      return HttpResponse.json(updated, { status: 200 })
    },
  ),

  // ===========================================================================
  // 4. Catalog & Term Management (/functions/v1/catalog/* & /school-terms/*)
  // ===========================================================================
  http.post('*/functions/v1/catalog/faculty', async ({ request }) => {
    const auth = authenticateRequest(request, ['admin'])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'FacultyInsert'>
      | null
    if (!body?.name) {
      return errorJson(400, 'INVALID_INPUT', 'Faculty name is required.')
    }
    const created: ApiSchema<'Faculty'> = {
      id: nextSyntheticUuid(),
      code: body.code ?? null,
      name: body.name,
      letterhead_prefix: body.letterhead_prefix ?? null,
      letterhead_name: body.letterhead_name ?? null,
      dean_name: null,
    }
    getMockDatabase().faculties.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('*/functions/v1/catalog/faculty/:id', async ({ request, params }) => {
    const auth = authenticateRequest(request, ['admin'])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.faculties.findIndex((f) => f.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Faculty not found.')
    const body = (await request.json().catch(() => ({}))) as ApiSchema<'FacultyUpdate'>
    const updated: ApiSchema<'Faculty'> = { ...db.faculties[idx]!, ...body }
    db.faculties[idx] = updated
    return HttpResponse.json(updated, { status: 200 })
  }),

  http.delete('*/functions/v1/catalog/faculty/:id', ({ request, params }) => {
    const auth = authenticateRequest(request, ['admin'])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.faculties.findIndex((f) => f.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Faculty not found.')
    if (db.departments.some((d) => d.faculty_id === id)) {
      return errorJson(
        409,
        'DEPENDENT_RECORDS_EXIST',
        'Cannot delete a faculty that still has dependent departments.',
      )
    }
    db.faculties.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/functions/v1/catalog/department', async ({ request }) => {
    const auth = authenticateRequest(request, ['admin'])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'DepartmentInsert'>
      | null
    if (!body?.name || !body?.faculty_id) {
      return errorJson(400, 'INVALID_INPUT', 'Department name and faculty_id are required.')
    }
    const created: ApiSchema<'Department'> = {
      id: nextSyntheticUuid(),
      faculty_id: body.faculty_id,
      code: body.code ?? null,
      name: body.name,
      letterhead_prefix: body.letterhead_prefix ?? null,
      letterhead_name: body.letterhead_name ?? null,
      department_head_name: null,
      dean_name: null,
    }
    getMockDatabase().departments.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('*/functions/v1/catalog/department/:id', async ({ request, params }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
    ])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.departments.findIndex((d) => d.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Department not found.')
    const body = (await request.json().catch(() => ({}))) as ApiSchema<'DepartmentUpdate'>
    const updated: ApiSchema<'Department'> = { ...db.departments[idx]!, ...body }
    db.departments[idx] = updated
    return HttpResponse.json(updated, { status: 200 })
  }),

  http.delete('*/functions/v1/catalog/department/:id', ({ request, params }) => {
    const auth = authenticateRequest(request, ['admin'])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.departments.findIndex((d) => d.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Department not found.')
    if (db.programs.some((p) => p.department_id === id)) {
      return errorJson(
        409,
        'DEPENDENT_RECORDS_EXIST',
        'Cannot delete a department that still has dependent programs.',
      )
    }
    db.departments.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/functions/v1/catalog/program', async ({ request }) => {
    const auth = authenticateRequest(request, ['admin'])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'ProgramInsert'>
      | null
    if (!body?.code || !body?.name || !body?.department_id) {
      return errorJson(400, 'INVALID_INPUT', 'Program code, name, and department_id are required.')
    }
    const created: ApiSchema<'Program'> = {
      id: nextSyntheticUuid(),
      code: body.code,
      name: body.name,
      nominal_duration: body.nominal_duration ?? 4,
      status: body.status ?? 'active',
      department_id: body.department_id,
    }
    getMockDatabase().programs.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('*/functions/v1/catalog/program/:id', async ({ request, params }) => {
    const auth = authenticateRequest(request, ['admin'])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.programs.findIndex((p) => p.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Program not found.')
    const body = (await request.json().catch(() => ({}))) as ApiSchema<'ProgramUpdate'>
    const updated: ApiSchema<'Program'> = { ...db.programs[idx]!, ...body }
    db.programs[idx] = updated
    return HttpResponse.json(updated, { status: 200 })
  }),

  http.delete('*/functions/v1/catalog/program/:id', ({ request, params }) => {
    const auth = authenticateRequest(request, ['admin'])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.programs.findIndex((p) => p.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Program not found.')
    if (db.curriculumVersions.some((c) => c.program_id === id)) {
      return errorJson(
        409,
        'DEPENDENT_RECORDS_EXIST',
        'Cannot delete a program that has curriculum versions.',
      )
    }
    db.programs.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/functions/v1/catalog/curriculum_version', async ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const created: ApiSchema<'CurriculumVersion'> = {
      id: nextSyntheticUuid(),
      program_id: String(body.program_id ?? MOCK_IDS.programBscs),
      version_label: String(body.version_label ?? 'BSCS 2026-2027 v1'),
      effective_start: String(body.effective_start ?? '2026-08-01'),
      effective_end: null,
      delinquency_threshold: Number(body.delinquency_threshold ?? 24),
      total_units: Number(body.total_units ?? 162),
      status: 'draft',
      enrolled_student_count: 0,
    }
    getMockDatabase().curriculumVersions.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('*/functions/v1/catalog/curriculum_version/:id', async ({ request, params }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.curriculumVersions.findIndex((c) => c.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Curriculum version not found.')
    const body = (await request.json().catch(() => ({}))) as ApiSchema<'CurriculumVersionUpdate'>
    const updated: ApiSchema<'CurriculumVersion'> = {
      ...db.curriculumVersions[idx]!,
      ...body,
    }
    db.curriculumVersions[idx] = updated
    return HttpResponse.json(updated, { status: 200 })
  }),

  http.delete('*/functions/v1/catalog/curriculum_version/:id', ({ request, params }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.curriculumVersions.findIndex((c) => c.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Curriculum version not found.')
    if ((db.curriculumVersions[idx]?.enrolled_student_count ?? 0) > 0) {
      return errorJson(
        409,
        'DEPENDENT_RECORDS_EXIST',
        'Cannot delete a curriculum version with enrolled students.',
      )
    }
    db.curriculumVersions.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/functions/v1/catalog/curriculum_term', async ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'CurriculumTermInsert'>
      | null
    if (!body?.curriculum_version_id) {
      return errorJson(400, 'INVALID_INPUT', 'curriculum_version_id is required.')
    }
    const created: ApiSchema<'CurriculumTerm'> = {
      id: nextSyntheticUuid(),
      curriculum_version_id: body.curriculum_version_id,
      year_level: body.year_level,
      term_sequence: body.term_sequence,
    }
    getMockDatabase().curriculumTerms.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('*/functions/v1/catalog/curriculum_term/:id', async ({ request, params }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.curriculumTerms.findIndex((t) => t.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Curriculum term not found.')
    const body = (await request.json().catch(() => ({}))) as ApiSchema<'CurriculumTermUpdate'>
    const updated: ApiSchema<'CurriculumTerm'> = {
      ...db.curriculumTerms[idx]!,
      ...body,
    }
    db.curriculumTerms[idx] = updated
    return HttpResponse.json(updated, { status: 200 })
  }),

  http.delete('*/functions/v1/catalog/curriculum_term/:id', ({ request, params }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.curriculumTerms.findIndex((t) => t.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Curriculum term not found.')
    db.curriculumTerms.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/functions/v1/catalog/curriculum_term_course', async ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'CurriculumTermCourseInsert'>
      | null
    if (!body?.curriculum_term_id) {
      return errorJson(400, 'INVALID_INPUT', 'curriculum_term_id is required.')
    }
    const created: ApiSchema<'CurriculumTermCourse'> = {
      id: nextSyntheticUuid(),
      curriculum_term_id: body.curriculum_term_id,
      course_id: body.course_id ?? null,
      is_elective_slot: body.is_elective_slot,
      slot_type: body.slot_type,
      slot_label: body.slot_label ?? null,
      nominal_units: body.nominal_units,
    }
    getMockDatabase().curriculumTermCourses.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('*/functions/v1/catalog/curriculum_term_course/:id', async ({ request, params }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.curriculumTermCourses.findIndex((c) => c.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Curriculum slot not found.')
    const body = (await request.json().catch(() => ({}))) as ApiSchema<'CurriculumTermCourseUpdate'>
    const updated: ApiSchema<'CurriculumTermCourse'> = {
      ...db.curriculumTermCourses[idx]!,
      ...body,
    }
    db.curriculumTermCourses[idx] = updated
    return HttpResponse.json(updated, { status: 200 })
  }),

  http.delete('*/functions/v1/catalog/curriculum_term_course/:id', ({ request, params }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.curriculumTermCourses.findIndex((c) => c.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Curriculum slot not found.')
    db.curriculumTermCourses.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/functions/v1/catalog/course', async ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'CourseInsert'>
      | null
    if (!body?.code || !body?.title || !body?.department_id) {
      return errorJson(400, 'INVALID_INPUT', 'code, title, and department_id are required.')
    }
    const created: ApiSchema<'Course'> = {
      id: nextSyntheticUuid(),
      department_id: body.department_id,
      code: body.code,
      title: body.title,
      category: body.category ?? 'major',
        units: body.units,
      is_elective: body.is_elective ?? false,
      status: body.status ?? 'active',
      repeatable_type: body.repeatable_type ?? 'none',
    }
    getMockDatabase().courses.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('*/functions/v1/catalog/course/:id', async ({ request, params }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.courses.findIndex((c) => c.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Course not found.')
    const body = (await request.json().catch(() => ({}))) as ApiSchema<'CourseUpdate'>
    const updated: ApiSchema<'Course'> = { ...db.courses[idx]!, ...body }
    db.courses[idx] = updated
    return HttpResponse.json(updated, { status: 200 })
  }),

  http.delete('*/functions/v1/catalog/course/:id', ({ request, params }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.courses.findIndex((c) => c.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Course not found.')
    if (db.curriculumTermCourses.some((s) => s.course_id === id)) {
      return errorJson(
        409,
        'DEPENDENT_RECORDS_EXIST',
        'Cannot delete a course referenced by a curriculum slot.',
      )
    }
    db.courses.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/functions/v1/catalog/prerequisite', async ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'PrerequisiteInsert'>
      | null
    if (!body?.course_id || !body?.prerequisite_course_id) {
      return errorJson(400, 'INVALID_INPUT', 'course_id and prerequisite_course_id are required.')
    }
    const created: ApiSchema<'Prerequisite'> = {
      id: nextSyntheticUuid(),
      course_id: body.course_id,
      prerequisite_course_id: body.prerequisite_course_id,
      type: body.type,
    }
    getMockDatabase().prerequisites.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.delete('*/functions/v1/catalog/prerequisite/:id', ({ request, params }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.prerequisites.findIndex((p) => p.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Prerequisite not found.')
    db.prerequisites.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/functions/v1/catalog/curriculum-pair-equivalences', async ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'CurriculumPairEquivalenceInsert'>
      | null
    if (!body?.from_curriculum_version_id || !body?.to_curriculum_version_id) {
      return errorJson(400, 'INVALID_INPUT', 'Source and target curriculum versions are required.')
    }
    const created: ApiSchema<'CurriculumPairEquivalence'> = {
      id: nextSyntheticUuid(),
      from_curriculum_version_id: body.from_curriculum_version_id,
      to_curriculum_version_id: body.to_curriculum_version_id,
      source_course_id: body.source_course_id,
      target_course_id: body.target_course_id,
      note: body.note ?? null,
      created_by: auth.persona.profileId,
      created_at: '2026-11-10T09:00:00Z',
    }
    getMockDatabase().curriculumPairEquivalences.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.delete('*/functions/v1/catalog/curriculum-pair-equivalences/:id', ({ request, params }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.curriculumPairEquivalences.findIndex((e) => e.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Equivalence rule not found.')
    db.curriculumPairEquivalences.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/functions/v1/catalog/school_term', async ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'SchoolTermInsert'>
      | null
    if (!body?.start_year || !body?.end_year || !body?.term_type || !body?.ends_on) {
      return errorJson(400, 'INVALID_INPUT', 'Missing required school term fields.')
    }
    const created: ApiSchema<'SchoolTerm'> = {
      id: nextSyntheticUuid(),
      start_year: body.start_year,
      end_year: body.end_year,
      term_type: body.term_type,
      school_year: `${body.start_year} - ${body.end_year}`,
      is_locked: body.is_locked ?? false,
      override_flag: false,
      override_actor_id: null,
      override_at: null,
      starts_on: body.starts_on ?? null,
      ends_on: body.ends_on,
      encoding_deadline: body.encoding_deadline ?? null,
      closed_by: null,
      closed_at: null,
      closure_note: null,
      default_inc_deadline: `${body.start_year + 1}-12-18`,
      chronological_key: body.start_year * 10 + 1,
    }
    getMockDatabase().schoolTerms.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('*/functions/v1/catalog/school_term/:id', async ({ request, params }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.schoolTerms.findIndex((t) => t.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'School term not found.')
    const body = (await request.json().catch(() => ({}))) as ApiSchema<'SchoolTermUpdate'>
    const updated: ApiSchema<'SchoolTerm'> = { ...db.schoolTerms[idx]!, ...body }
    db.schoolTerms[idx] = updated
    return HttpResponse.json(updated, { status: 200 })
  }),

  http.post('*/functions/v1/catalog/course_offering', async ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'CourseOfferingInsert'>
      | null
    if (!body?.school_term_id || !body?.course_id) {
      return errorJson(400, 'INVALID_INPUT', 'school_term_id and course_id are required.')
    }
    const created: ApiSchema<'CourseOffering'> = {
      id: nextSyntheticUuid(),
      school_term_id: body.school_term_id,
      course_id: body.course_id,
      section: body.section ?? 'A',
      schedule: body.schedule ?? 'MWF 08:00-09:00',
      instructor: body.instructor ?? null,
      is_by_request: body.is_by_request ?? false,
    }
    getMockDatabase().courseOfferings.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch('*/functions/v1/catalog/course_offering/:id', async ({ request, params }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.courseOfferings.findIndex((o) => o.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Course offering not found.')
    const body = (await request.json().catch(() => ({}))) as ApiSchema<'CourseOfferingUpdate'>
    const updated: ApiSchema<'CourseOffering'> = {
      ...db.courseOfferings[idx]!,
      ...body,
    }
    db.courseOfferings[idx] = updated
    return HttpResponse.json(updated, { status: 200 })
  }),

  http.delete('*/functions/v1/catalog/course_offering/:id', ({ request, params }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const id = String(params.id)
    const db = getMockDatabase()
    const idx = db.courseOfferings.findIndex((o) => o.id === id)
    if (idx === -1) return errorJson(404, 'NOT_FOUND', 'Course offering not found.')
    db.courseOfferings.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(
    '*/functions/v1/school-terms/:school_term_id/close-encoding',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'department_head',
        'department_staff',
      ])
      if ('response' in auth) return auth.response
      const { persona } = auth
      const schoolTermId = String(params.school_term_id)
      const db = getMockDatabase()
      const idx = db.schoolTerms.findIndex((t) => t.id === schoolTermId)
      if (idx === -1) return errorJson(404, 'NOT_FOUND', 'School term not found.')

      const body = (await request.json().catch(() => ({ scope: 'department' }))) as ApiSchema<'SchoolTermCloseEncodingRequest'>
      if (body.scope === 'institution' && !persona.roles.includes('admin')) {
        return errorJson(
          403,
          'INSUFFICIENT_PRIVILEGE',
          'Institution-wide term encoding closure is restricted to System Admin.',
        )
      }

      const targetDeptId = body.department_id ?? persona.departmentId ?? MOCK_IDS.deptDcst
      if ((body.scope ?? 'department') === 'department' && persona.roles.includes('admin') && !body.department_id) {
        return errorJson(400, 'INVALID_INPUT', 'department_id is required for an admin department closure.')
      }
      if (
        (body.scope ?? 'department') === 'department' &&
        !persona.roles.includes('admin') &&
        targetDeptId !== persona.departmentId
      ) {
        return errorJson(
          403,
          'INSUFFICIENT_PRIVILEGE',
          'Cannot close encoding for another department.',
        )
      }

      const closure: ApiSchema<'DepartmentTermEncodingClosure'> = {
        id: MOCK_IDS.deptEncodingDcstOpen,
        school_term_id: schoolTermId,
        department_id: targetDeptId,
        is_closed: true,
        closed_by: persona.profileId,
        closed_at: '2026-11-10T09:00:00Z',
        closure_note: body.closure_note ?? 'Department grade encoding closed.',
      }
      if ((body.scope ?? 'department') === 'department') {
        const closureIndex = db.departmentTermEncodings.findIndex(c => c.school_term_id === schoolTermId && c.department_id === targetDeptId)
        if (closureIndex < 0) db.departmentTermEncodings.push(closure)
        else db.departmentTermEncodings[closureIndex] = { ...closure, id: db.departmentTermEncodings[closureIndex]!.id }
      }

      const updated: ApiSchema<'SchoolTerm'> = {
        ...db.schoolTerms[idx]!,
        ...(body.scope === 'institution'
          ? {
              is_locked: true,
              closed_by: persona.profileId,
              closed_at: '2026-11-10T09:00:00Z',
            }
          : {}),
        closure_note: body.closure_note ?? null,
        department_closures: [closure],
      }
      db.schoolTerms[idx] = updated
      return HttpResponse.json(updated, { status: 200 })
    },
  ),

  http.post('*/functions/v1/school-terms/:school_term_id/reopen-encoding', async ({ request, params }) => {
    const auth = authenticateRequest(request, ['admin', 'department_head', 'department_staff'])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => ({}))) as ApiSchema<'SchoolTermCloseEncodingRequest'>
    if (body.scope === 'institution') return errorJson(400, 'INVALID_INPUT', 'Only department closures can be reopened here.')
    const isAdmin = auth.persona.roles.includes('admin')
    if (isAdmin && !body.department_id) return errorJson(400, 'INVALID_INPUT', 'department_id is required.')
    const departmentId = body.department_id ?? auth.persona.departmentId
    if (!isAdmin && departmentId !== auth.persona.departmentId) return errorJson(403, 'INSUFFICIENT_PRIVILEGE', 'Cannot reopen another department.')
    const db = getMockDatabase()
    const index = db.departmentTermEncodings.findIndex(c => c.school_term_id === String(params.school_term_id) && c.department_id === departmentId)
    if (index < 0) return errorJson(404, 'NOT_FOUND', 'Department closure not found.')
    const updated = { ...db.departmentTermEncodings[index]!, is_closed: false }
    db.departmentTermEncodings[index] = updated
    return HttpResponse.json(updated)
  }),

  http.put(
    '*/functions/v1/school-terms/:school_term_id/override',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ['admin'])
      if ('response' in auth) return auth.response
      const schoolTermId = String(params.school_term_id)
      const db = getMockDatabase()
      const idx = db.schoolTerms.findIndex((t) => t.id === schoolTermId)
      if (idx === -1) return errorJson(404, 'NOT_FOUND', 'School term not found.')
      const body = (await request.json().catch(() => ({ enabled: false }))) as ApiSchema<'SchoolTermOverrideRequest'>
      const updated: ApiSchema<'SchoolTerm'> = {
        ...db.schoolTerms[idx]!,
        override_flag: Boolean(body.enabled),
        override_actor_id: auth.persona.profileId,
        override_at: '2026-11-10T09:00:00Z',
      }
      db.schoolTerms[idx] = updated
      return HttpResponse.json(updated, { status: 200 })
    },
  ),

  // ===========================================================================
  // 5. Student Roster, Academic Views & Advising Edge Functions
  // ===========================================================================
  http.get('*/functions/v1/students', ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'dean',
      'department_head',
      'department_staff',
      'adviser',
    ])
    if ('response' in auth) return auth.response
    const url = new URL(request.url)
    const scope = url.searchParams.get('assignment_scope') ?? 'all'

    const items: ApiSchema<'StudentRosterItem'>[] = [
      {
        student_id: MOCK_IDS.studentPrimary,
        student_number: '24-1-01798',
        full_name: MOCK_PERSONAS.student.fullName,
        email: MOCK_PERSONAS.student.email,
        avatar_url: null,
        status: 'active',
        faculty_id: MOCK_IDS.facultyComputing,
        faculty_name: 'Faculty of Computing',
        department_id: MOCK_IDS.deptDcst,
        department_name: 'Department of Computer Science and Technology',
        program_id: MOCK_IDS.programBscs,
        program_code: 'BSCS',
        program_name: 'Bachelor of Science in Computer Science',
        curriculum_version_id: MOCK_IDS.curriculumBscs2024,
        curriculum_label: 'BSCS 2024-2025 v1',
        entry_year: 2024,
        year_level: 3,
        gwa: 1.75,
        earned_units: 36,
        required_units: 162,
        standing: 'good_standing',
        is_delinquent: false,
        deficiencies_count: 1,
        open_inc_count: 1,
        lapsed_inc_count: 0,
        nearest_inc_deadline: '2027-05-30',
        nearest_inc_days_remaining: 201,
        open_flags_count: 1,
        assignment_status: 'active',
        adviser_id: MOCK_IDS.adviserPrimary,
        adviser_name: MOCK_PERSONAS.adviser.fullName,
        adviser_assigned_since: '2024-08-01',
        handover_label: null,
        last_activity_at: '2026-10-10T08:00:00Z',
      },
      {
        student_id: MOCK_IDS.studentSecondary,
        student_number: '23-1-02121',
        full_name: MOCK_PERSONAS.student_secondary.fullName,
        email: MOCK_PERSONAS.student_secondary.email,
        avatar_url: null,
        status: 'invited',
        faculty_id: MOCK_IDS.facultyComputing,
        faculty_name: 'Faculty of Computing',
        department_id: MOCK_IDS.deptDcst,
        department_name: 'Department of Computer Science and Technology',
        program_id: MOCK_IDS.programBscs,
        program_code: 'BSCS',
        program_name: 'Bachelor of Science in Computer Science',
        curriculum_version_id: MOCK_IDS.curriculumBscs2024,
        curriculum_label: 'BSCS 2024-2025 v1',
        entry_year: 2024,
        year_level: 1,
        gwa: null,
        earned_units: 0,
        required_units: 162,
        standing: 'good_standing',
        is_delinquent: false,
        deficiencies_count: 0,
        open_inc_count: 0,
        lapsed_inc_count: 0,
        nearest_inc_deadline: null,
        nearest_inc_days_remaining: null,
        open_flags_count: 0,
        assignment_status: 'unassigned',
        adviser_id: null,
        adviser_name: null,
        adviser_assigned_since: null,
        handover_label: null,
        last_activity_at: null,
      },
    ]

    const filtered = items.filter((item) => {
      if (scope === 'current' || scope === 'my_active_advisees') {
        return item.assignment_status === 'active'
      }
      if (scope === 'past' || scope === 'my_handed_over_advisees') {
        return item.assignment_status === 'past'
      }
      if (scope === 'unassigned') {
        return item.assignment_status === 'unassigned'
      }
      return true
    })

    const response: ApiSchema<'StudentRosterResponse'> = {
      total_count: filtered.length,
      unassigned_count: filtered.filter(
        (i) => i.assignment_status === 'unassigned',
      ).length,
      with_deficiencies_count: filtered.filter((i) => i.deficiencies_count > 0)
        .length,
      flagged_count: filtered.filter((i) => i.open_flags_count > 0).length,
      open_inc_students_count: filtered.filter((i) => i.open_inc_count > 0)
        .length,
      standing_counts: {
        good_standing: filtered.length,
        warning: 0,
        probation: 0,
        dismissed: 0,
      },
      items: filtered,
    }
    return HttpResponse.json(response, { status: 200 })
  }),

  http.get(
    '*/functions/v1/students/:student_id/academic-summary',
    ({ request, params }) => {
      const auth = authenticateRequest(request)
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      if (!canAccessStudentRecord(auth.persona, studentId)) {
        return errorJson(
          403,
          'INSUFFICIENT_PRIVILEGE',
          'Not authorized to view this student academic summary.',
        )
      }
      const summary: ApiSchema<'AcademicSummary'> = {
        student_id: studentId,
        gwa: 1.75,
        earned_units: 36,
        required_units: 162,
        counted_units: 36,
        failed_units: 0,
        in_progress_units: 3,
        remaining_units: 126,
        failure_pct: 0,
        standing: 'good_standing',
        year_level: 3,
        slots_satisfied: 12,
        total_slots: 54,
        open_inc_count: 1,
        lapsed_inc_count: 0,
        open_flags_count: 1,
        deficiencies_count: 1,
        deficiencies: [
          {
            kind: 'open_inc',
            attempt_id: MOCK_IDS.attemptCsci102Inc,
            course_code: 'CSCI 102',
            course_title: 'Computer Programming 1',
            term_label: '2nd Sem 2025-2026',
            inc_deadline: '2027-05-30',
            days_remaining: 201,
            detail: 'Missing final laboratory project submission.',
          },
        ],
        is_delinquent: false,
        computed_at: '2026-11-10T08:00:00Z',
      }
      return HttpResponse.json(summary, { status: 200 })
    },
  ),

  http.get(
    '*/functions/v1/students/:student_id/checklist',
    ({ request, params }) => {
      const auth = authenticateRequest(request)
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      if (!canAccessStudentRecord(auth.persona, studentId)) {
        return errorJson(
          403,
          'INSUFFICIENT_PRIVILEGE',
          'Not authorized to view this student checklist.',
        )
      }
      const checklist: ApiSchema<'ChecklistSlotResult'>[] = [
        {
          curriculum_term_course_id: MOCK_IDS.slotCsci101,
          status: 'passed',
          required_units: 3,
          earned_units: 3,
          source_attempt_id: null,
          satisfaction_source: 'Outside credit',
          credited_course_code: 'CMSC 11',
          credited_course_title: 'Introduction to Computer Science',
          attempts: [],
          grade_fix_history: [],
        },
        {
          curriculum_term_course_id: MOCK_IDS.slotCsci102,
          status: 'inc',
          required_units: 3,
          earned_units: 0,
          source_attempt_id: MOCK_IDS.attemptCsci102Inc,
          satisfaction_source: null,
          attempts: [
            {
              attempt_id: MOCK_IDS.attemptCsci102Inc,
              school_term_id: MOCK_IDS.term2025Sem2Closed,
              term_label: '2nd Sem 2025-2026',
              midterm_status: 'graded',
              midterm_grade: 2.0,
              final_grade: null,
              recorded_status: 'inc',
              completion_grade: null,
              effective_status: 'inc',
              inc_deadline: '2027-05-30',
              instructor: 'Prof. Maria Clara Santos',
            },
          ],
          grade_fix_history: [],
        },
      ]
      return HttpResponse.json(checklist, { status: 200 })
    },
  ),

  http.get(
    '*/functions/v1/students/:student_id/grades',
    ({ request, params }) => {
      const auth = authenticateRequest(request)
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      if (!canAccessStudentRecord(auth.persona, studentId)) {
        return errorJson(
          403,
          'INSUFFICIENT_PRIVILEGE',
          'Not authorized to view this student grades.',
        )
      }
      const db = getMockDatabase()
      const termGrades: ApiSchema<'TermGrades'>[] = [
        {
          school_term_id: MOCK_IDS.term2026Sem1Open,
          school_year: '2026 - 2027',
          term_type: '1st Semester',
          chronological_key: 20261,
          gwa: 1.75,
          attempts: db.attemptResults.filter((a) => a.student_id === studentId),
        },
      ]
      return HttpResponse.json(termGrades, { status: 200 })
    },
  ),

  http.get(
    '*/functions/v1/students/:student_id/course-offerings',
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      if (!canAccessStudentRecord(auth.persona, studentId)) {
        return errorJson(403, 'INSUFFICIENT_PRIVILEGE', 'Out of scope.')
      }
      const db = getMockDatabase()
      const options: ApiSchema<'CourseOfferingOption'>[] = [
        {
          offering: db.courseOfferings[1]!,
          code: 'CSCI 153',
          title: 'Software Engineering',
        units: 3,
          group: 'program',
          direct_curriculum_slot_id: MOCK_IDS.slotCsci153,
          instructor_options: [
            'Dr. Jose Rizalino Gomez',
            'Prof. Maria Clara Santos',
          ],
          has_unmet_strict_prerequisites: true,
          unmet_prerequisites: [
            {
              prerequisite_course_id: MOCK_IDS.courseCsci102,
              code: 'CSCI 102',
              title: 'Computer Programming 1',
              type: 'strict',
              current_status: 'inc',
              latest_attempt_id: MOCK_IDS.attemptCsci102Inc,
              latest_final_grade: null,
            },
          ],
        },
      ]
      return HttpResponse.json(options, { status: 200 })
    },
  ),

  http.get(
    '*/functions/v1/students/:student_id/recommendations',
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      if (!canAccessStudentRecord(auth.persona, studentId)) {
        return errorJson(403, 'INSUFFICIENT_PRIVILEGE', 'Out of scope.')
      }
      const recs: ApiSchema<'Recommendation'>[] = [
        {
          course_offering_id: MOCK_IDS.offeringCsci198,
          curriculum_term_course_id: MOCK_IDS.slotFreeElective1,
          code: 'CSCI 198',
          title: 'Special Topics in Artificial Intelligence',
        units: 3,
          why: 'Satisfies CS Elective 1 slot in 3rd Year 1st Semester.',
          badges: ['Elective'],
          excluded_summary: {
            total_excluded: 3,
            completed_count: 1,
            enrolled_count: 1,
            not_offered_count: 1,
          },
        },
      ]
      return HttpResponse.json(recs, {
        status: 200,
        headers: {
          'X-Excluded-Count': '3',
        },
      })
    },
  ),

  // ===========================================================================
  // 6. Grade Recording, Encoding, Corrections, INC & Flags
  // ===========================================================================
  http.post(
    '*/functions/v1/students/:student_id/record-grades',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      if (!canAccessStudentRecord(auth.persona, studentId)) {
        return errorJson(403, 'INSUFFICIENT_PRIVILEGE', 'Out of scope.')
      }
      const body = (await request.json().catch(() => null)) as
        | ApiSchema<'RecordGradesRequest'>
        | null
      if (!body?.school_term_id || !body?.course_offering_id) {
        return errorJson(400, 'INVALID_INPUT', 'school_term_id and course_offering_id are required.')
      }
      if (departmentEncodingClosed(studentId, body.school_term_id)) return encodingClosedResponse()
      if (alreadyPassedCourse(studentId, body.course_offering_id)) return errorJson(409, 'COURSE_ALREADY_PASSED', 'A passed course cannot be retaken.')
      if (
        body.midterm_grade !== undefined &&
        body.midterm_grade !== null &&
        !body.confirmed_enrollment
      ) {
        return errorJson(
          409,
          'ENROLLMENT_CONFIRMATION_REQUIRED',
          'Confirm new course enrollment before recording a midterm grade.',
          'No existing attempt found for the selected course offering.',
          'Re-submit with confirmed_enrollment=true.',
        )
      }

      const recordedStatus: ApiSchema<'AttemptStatus'> =
        body.midterm_status === 'dr'
          ? 'dr'
          : body.status
            ? body.status
            : body.final_grade !== undefined && body.final_grade !== null
              ? body.final_grade <= 3.0
                ? 'passed'
                : 'failed'
              : 'currently_enrolled'

      const result: ApiSchema<'AttemptResult'> = {
        id: nextSyntheticUuid(),
        student_id: studentId,
        course_offering_id: body.course_offering_id,
        curriculum_term_course_id:
          body.curriculum_term_course_id ?? MOCK_IDS.slotCsci153,
        recorded_status: recordedStatus,
        midterm_status: body.midterm_status ?? 'graded',
        midterm_grade: body.midterm_grade ?? null,
        final_grade: body.midterm_status === 'dr' ? null : (body.final_grade ?? null),
        inc_deadline: recordedStatus === 'inc' ? '2027-12-18' : null,
        instructor: body.instructor ?? 'Dr. Jose Rizalino Gomez',
        prerequisite_override: Boolean(body.continue_with_prerequisite_override),
        prerequisite_grade_override: false,
        grade_fix_history: [],
        units_attempted: 3,
        revision: 1,
        created_at: '2026-11-10T09:00:00Z',
        updated_at: '2026-11-10T09:00:00Z',
        completion_grade: null,
        resolved_at: null,
        effective_status: recordedStatus,
        gwa_grade: body.final_grade ?? null,
        is_lapsed_inc: false,
      }
      getMockDatabase().attemptResults.push(result)
      return HttpResponse.json(result, { status: 200 })
    },
  ),

  http.post(
    '*/functions/v1/students/:student_id/encode-grades',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const body = (await request.json().catch(() => null)) as
        | ApiSchema<'EncodeTermGradesRequest'>
        | null
      if (!body?.school_term_id || !Array.isArray(body.rows)) {
        return errorJson(400, 'INVALID_INPUT', 'school_term_id and rows are required.')
      }
      if (departmentEncodingClosed(studentId, body.school_term_id)) return encodingClosedResponse()
      if (body.rows.some(row => alreadyPassedCourse(studentId, row.course_offering_id, row.attempt_id ?? undefined))) return errorJson(409, 'COURSE_ALREADY_PASSED', 'A passed course cannot be retaken.')
      const results: ApiSchema<'AttemptResult'>[] = body.rows.map((row) => ({
        id: row.attempt_id ?? nextSyntheticUuid(),
        student_id: studentId,
        course_offering_id: row.course_offering_id,
        curriculum_term_course_id:
          row.curriculum_term_course_id ?? MOCK_IDS.slotCsci153,
        recorded_status: row.status ?? 'currently_enrolled',
        midterm_status: row.midterm_status ?? 'graded',
        midterm_grade: row.midterm_grade ?? null,
        final_grade: row.final_grade ?? null,
        inc_deadline: null,
        instructor: row.instructor ?? 'Dr. Jose Rizalino Gomez',
        prerequisite_override: Boolean(row.continue_with_prerequisite_override),
        prerequisite_grade_override: false,
        grade_fix_history: [],
        units_attempted: 3,
        revision: 1,
        created_at: '2026-11-10T09:00:00Z',
        updated_at: '2026-11-10T09:00:00Z',
        completion_grade: null,
        resolved_at: null,
        effective_status: row.status ?? 'currently_enrolled',
        gwa_grade: row.final_grade ?? null,
        is_lapsed_inc: false,
      }))
      return HttpResponse.json(results, { status: 200 })
    },
  ),

  http.patch(
    '*/functions/v1/students/:student_id/attempts/:attempt_id/grades',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const attemptId = String(params.attempt_id)
      if (attemptEncodingClosed(studentId, attemptId)) return encodingClosedResponse()
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
      const result: ApiSchema<'AttemptResult'> = {
        id: attemptId,
        student_id: studentId,
        course_offering_id: MOCK_IDS.offeringCsci153,
        curriculum_term_course_id: MOCK_IDS.slotCsci153,
        recorded_status: 'passed',
        midterm_status: 'graded',
        midterm_grade: Number(body.midterm_grade ?? 1.75),
        final_grade: Number(body.final_grade ?? 1.5),
        inc_deadline: null,
        instructor: 'Dr. Jose Rizalino Gomez',
        prerequisite_override: false,
        prerequisite_grade_override: false,
        grade_fix_history: [
          {
            changed_at: '2026-11-10T09:00:00Z',
            old_grade: 1.75,
            new_grade: Number(body.final_grade ?? 1.5),
            actor_name: auth.persona.fullName,
            summary: String(body.reason ?? 'Grade correction'),
          },
        ],
        units_attempted: 3,
        revision: Number(body.expected_revision ?? 1) + 1,
        created_at: '2026-08-15T08:00:00Z',
        updated_at: '2026-11-10T09:00:00Z',
        completion_grade: null,
        resolved_at: null,
        effective_status: 'passed',
        gwa_grade: Number(body.final_grade ?? 1.5),
        is_lapsed_inc: false,
      }
      return HttpResponse.json(result, { status: 200 })
    },
  ),

  http.delete(
    '*/functions/v1/students/:student_id/attempts/:attempt_id',
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      if (attemptEncodingClosed(String(params.student_id), String(params.attempt_id))) return encodingClosedResponse()
      return new HttpResponse(null, { status: 204 })
    },
  ),

  http.post(
    '*/functions/v1/students/:student_id/attempts/:attempt_id/prerequisite-grade',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const attemptId = String(params.attempt_id)
      if (attemptEncodingClosed(studentId, attemptId)) return encodingClosedResponse()
      const body = (await request.json().catch(() => ({}))) as ApiSchema<'PrerequisiteGradeCorrectionRequest'>
      const result: ApiSchema<'AttemptResult'> = {
        id: attemptId,
        student_id: studentId,
        course_offering_id: MOCK_IDS.offeringCsci102,
        curriculum_term_course_id: MOCK_IDS.slotCsci102,
        recorded_status: 'passed',
        midterm_status: 'graded',
        midterm_grade: 2.0,
        final_grade: body.final_grade ?? 2.25,
        inc_deadline: null,
        instructor: 'Prof. Maria Clara Santos',
        prerequisite_override: false,
        prerequisite_grade_override: true,
        grade_fix_history: [],
        units_attempted: 3,
        revision: (body.expected_revision ?? 1) + 1,
        created_at: '2026-05-20T08:00:00Z',
        updated_at: '2026-11-10T09:00:00Z',
        completion_grade: null,
        resolved_at: null,
        effective_status: 'passed',
        gwa_grade: body.final_grade ?? 2.25,
        is_lapsed_inc: false,
      }
      return HttpResponse.json(result, { status: 200 })
    },
  ),

  http.post(
    '*/functions/v1/students/:student_id/attempts/:attempt_id/inc-completion',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const attemptId = String(params.attempt_id)
      const body = (await request.json().catch(() => ({}))) as ApiSchema<'INCCompletionRequest'>
      const resolution: ApiSchema<'INCResolution'> = {
        id: MOCK_IDS.incResolution1,
        student_id: studentId,
        attempt_id: attemptId,
        completion_grade: body.completion_grade ?? 2.0,
        resolved_by: auth.persona.profileId,
        resolved_at: '2026-11-10T09:00:00Z',
        updated_by: auth.persona.profileId,
        updated_at: '2026-11-10T09:00:00Z',
        effective_status: (body.completion_grade ?? 2.0) <= 3.0 ? 'passed' : 'failed',
      }
      getMockDatabase().incResolutions.push(resolution)
      return HttpResponse.json(resolution, { status: 201 })
    },
  ),

  http.patch(
    '*/functions/v1/students/:student_id/attempts/:attempt_id/inc-completion',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const attemptId = String(params.attempt_id)
      const body = (await request.json().catch(() => ({}))) as ApiSchema<'INCCompletionCorrectionRequest'>
      const resolution: ApiSchema<'INCResolution'> = {
        id: MOCK_IDS.incResolution1,
        student_id: studentId,
        attempt_id: attemptId,
        completion_grade: body.completion_grade ?? 1.75,
        resolved_by: auth.persona.profileId,
        resolved_at: '2026-11-10T09:00:00Z',
        updated_by: auth.persona.profileId,
        updated_at: '2026-11-10T09:05:00Z',
        effective_status: (body.completion_grade ?? 1.75) <= 3.0 ? 'passed' : 'failed',
      }
      return HttpResponse.json(resolution, { status: 200 })
    },
  ),

  http.post(
    '*/functions/v1/students/:student_id/grade-flags',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ['student', 'admin'])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      if (!canAccessStudentRecord(auth.persona, studentId)) {
        return errorJson(403, 'INSUFFICIENT_PRIVILEGE', 'Cannot flag another student grade.')
      }
      const body = (await request.json().catch(() => null)) as
        | ApiSchema<'GradeFlagCreateRequest'>
        | null
      if (!body?.attempt_id || !body?.details) {
        return errorJson(400, 'INVALID_INPUT', 'attempt_id and details are required.')
      }
      const flag: ApiSchema<'GradeFlag'> = {
        id: nextSyntheticUuid(),
        student_id: studentId,
        attempt_id: body.attempt_id,
        reported_stage: body.reported_stage ?? 'midterm',
        reported_grade_text: body.reported_grade_text ?? null,
        issue_type: body.issue_type,
        details: body.details,
        status: 'open',
        resolution_action: null,
        corrected_grade: null,
        corrected_status: null,
        resolution_note: null,
        resolved_by: null,
        resolved_at: null,
        created_at: '2026-11-10T09:00:00Z',
        updated_at: '2026-11-10T09:00:00Z',
      }
      getMockDatabase().gradeFlags.push(flag)
      return HttpResponse.json(flag, { status: 201 })
    },
  ),

  http.post(
    '*/functions/v1/grade-flags/:flag_id/resolve',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const flagId = String(params.flag_id)
      const body = (await request.json().catch(() => ({}))) as ApiSchema<'GradeFlagResolveRequest'>
      const flag = getMockDatabase().gradeFlags.find(f => f.id === flagId)
      if (body.resolution_action !== 'reject' && flag?.attempt_id && attemptEncodingClosed(flag.student_id, flag.attempt_id)) return encodingClosedResponse()
      const resolved: ApiSchema<'GradeFlag'> = {
        id: flagId,
        student_id: MOCK_IDS.studentPrimary,
        attempt_id: MOCK_IDS.attemptCsci153Open,
        reported_stage: 'midterm',
        reported_grade_text: '1.50',
        issue_type: 'wrong_grade',
        details: 'Class card shows 1.50 for midterm exam computation.',
        status: body.resolution_action === 'reject' ? 'rejected' : 'corrected',
        resolution_action: body.resolution_action ?? 'correct',
        corrected_grade: body.corrected_grade ?? 1.5,
        corrected_status: body.corrected_status ?? null,
        resolution_note: body.resolution_note ?? 'Verified against class card.',
        resolved_by: auth.persona.profileId,
        resolved_at: '2026-11-10T09:00:00Z',
        created_at: '2026-10-10T08:00:00Z',
        updated_at: '2026-11-10T09:00:00Z',
      }
      return HttpResponse.json(resolved, { status: 200 })
    },
  ),

  http.post('*/functions/v1/grades/import', async ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'dean',
      'department_head',
      'adviser',
    ])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'GradeBatchImportRequest'>
      | null
    if (!body?.mode || !body?.school_term_id || !Array.isArray(body.rows)) {
      return errorJson(400, 'INVALID_INPUT', 'mode, school_term_id, and rows are required.')
    }
    const db = getMockDatabase()
    if (body.rows.some(row => {
      const student = db.profiles.find(p => p.student_number === row.student_number)
      return student && departmentEncodingClosed(student.id, body.school_term_id)
    })) return encodingClosedResponse()
    const passed = (row: ApiSchema<'GradeBatchImportRequest'>['rows'][number]) => {
      const student = db.profiles.find(p => p.student_number === row.student_number)
      const course = db.courses.find(c => c.code === row.course_code)
      const offering = db.courseOfferings.find(o => o.course_id === course?.id && o.school_term_id === body.school_term_id)
      return Boolean(student && offering && alreadyPassedCourse(student.id, offering.id))
    }
    const validCount = body.rows.filter(row => !passed(row)).length
    const response: ApiSchema<'GradeBatchImportResponse'> = {
      mode: body.mode,
      valid_count: validCount,
      warning_count: 0,
      error_count: body.rows.length - validCount,
      imported_count: body.mode === 'commit' ? validCount : 0,
      results: body.rows.map((r) => ({
        row_number: r.row_number,
        student_number: r.student_number,
        course_code: r.course_code,
        outcome: passed(r) ? 'error' : body.mode === 'commit' ? 'imported' : 'valid',
        message: passed(r) ? 'A passed course cannot be retaken.' : 'Validated successfully.',
      })),
    }
    return HttpResponse.json(response, { status: 200 })
  }),

  // ===========================================================================
  // 7. Electives, Equivalencies, Outside Credits, Transfers & Assignments
  // ===========================================================================
  http.put(
    '*/functions/v1/students/:student_id/adviser',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ['department_head', 'department_staff'])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const body = (await request.json().catch(() => ({}))) as ApiSchema<'AdviserReassignmentRequest'>
      const db = getMockDatabase()
      const student = db.profiles.find(p => p.id === studentId)
      const adviser = db.profiles.find(p => p.id === body.adviser_id)
      if (!student || !adviser) return errorJson(404, 'NOT_FOUND', 'Student or adviser not found.')
      if (!auth.persona.departmentId || student.department_id !== auth.persona.departmentId || adviser.department_id !== auth.persona.departmentId) {
        return errorJson(403, 'INSUFFICIENT_PRIVILEGE', 'Reassignment is limited to your department.')
      }
      if (!adviser.roles?.includes('adviser') || adviser.status !== 'active') return errorJson(409, 'INVALID_ADVISER', 'Choose an active adviser in the department.')
      const assignment: ApiSchema<'AdviserAssignment'> = {
        id: nextSyntheticUuid(),
        adviser_id: body.adviser_id ?? MOCK_IDS.adviserPrimary,
        adviser_name: MOCK_PERSONAS.adviser.fullName,
        adviser_email: MOCK_PERSONAS.adviser.email,
        adviser_faculty_name: 'Faculty of Computing',
        adviser_consultation_hours: 'Tue & Thu, 13:00–16:00',
        student_id: studentId,
        start_date: body.start_date ?? '2026-11-10',
        end_date: null,
        handed_over_to_adviser_id: null,
        handed_over_to_name: null,
        handover_label: null,
        created_at: '2026-11-10T09:00:00Z',
      }
      return HttpResponse.json([assignment], { status: 200 })
    },
  ),

  http.post(
    '*/functions/v1/adviser-assignments/bulk-reassign',
    async ({ request }) => {
      const auth = authenticateRequest(request, ['department_head', 'department_staff'])
      if ('response' in auth) return auth.response
      const body = (await request.json().catch(() => ({}))) as ApiSchema<'BulkAdviserReassignmentRequest'>
      const studentIds = body.student_ids ?? [MOCK_IDS.studentPrimary]
      const db = getMockDatabase()
      const adviser = db.profiles.find(p => p.id === body.adviser_id)
      const students = studentIds.map(id => db.profiles.find(p => p.id === id))
      if (!adviser || students.some(student => !student)) return errorJson(404, 'NOT_FOUND', 'Student or adviser not found.')
      if (!auth.persona.departmentId || adviser.department_id !== auth.persona.departmentId || students.some(student => student?.department_id !== auth.persona.departmentId)) {
        return errorJson(403, 'INSUFFICIENT_PRIVILEGE', 'Reassignment is limited to your department.')
      }
      if (!adviser.roles?.includes('adviser') || adviser.status !== 'active') return errorJson(409, 'INVALID_ADVISER', 'Choose an active adviser in the department.')
      const assignments: ApiSchema<'AdviserAssignment'>[] = studentIds.map(
        (studentId) => ({
          id: nextSyntheticUuid(),
          adviser_id: body.adviser_id ?? MOCK_IDS.adviserPrimary,
          adviser_name: MOCK_PERSONAS.adviser.fullName,
          adviser_email: MOCK_PERSONAS.adviser.email,
          adviser_faculty_name: 'Faculty of Computing',
          adviser_consultation_hours: 'Tue & Thu, 13:00–16:00',
          student_id: studentId,
          start_date: body.effective_since ?? '2026-11-10',
          end_date: null,
          handed_over_to_adviser_id: null,
          handed_over_to_name: null,
          handover_label: null,
          created_at: '2026-11-10T09:00:00Z',
        }),
      )
      const res: ApiSchema<'BulkAdviserReassignmentResponse'> = {
        reassigned_count: assignments.length,
        assignments,
      }
      return HttpResponse.json(res, { status: 200 })
    },
  ),

  http.put(
    '*/functions/v1/students/:student_id/curriculum',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'department_head',
        'department_staff',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const body = (await request.json().catch(() => ({}))) as ApiSchema<'CurriculumAssignmentRequest'>
      const org: ApiSchema<'StudentOrganization'> = {
        student_id: studentId,
        student_curriculum_assignment_id: nextSyntheticUuid(),
        curriculum_version_id:
          body.curriculum_version_id ?? MOCK_IDS.curriculumBscs2024,
        program_id: body.program_id ?? MOCK_IDS.programBscs,
        department_id: MOCK_IDS.deptDcst,
        faculty_id: MOCK_IDS.facultyComputing,
        adviser_id: MOCK_IDS.adviserPrimary,
        entry_year: 2024,
      }
      return HttpResponse.json(org, { status: 200 })
    },
  ),

  http.post(
    '*/functions/v1/students/:student_id/elective-mappings',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const body = (await request.json().catch(() => ({}))) as ApiSchema<'ElectiveMappingRequest'>
      const mapping: ApiSchema<'ElectiveMapping'> = {
        id: nextSyntheticUuid(),
        attempt_id: body.attempt_id ?? MOCK_IDS.attemptCsci153Open,
        curriculum_term_course_id:
          body.curriculum_term_course_id ?? MOCK_IDS.slotFreeElective1,
        mapped_by: auth.persona.profileId,
        units_credited: 3,
        created_at: '2026-11-10T09:00:00Z',
        updated_at: '2026-11-10T09:00:00Z',
        student_id: studentId,
        revoked_at: null,
      }
      return HttpResponse.json(mapping, { status: 201 })
    },
  ),

  http.patch(
    '*/functions/v1/students/:student_id/elective-mappings/:decision_id',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const decisionId = String(params.decision_id)
      const body = (await request.json().catch(() => ({}))) as ApiSchema<'ElectiveMappingUpdate'>
      const mapping: ApiSchema<'ElectiveMapping'> = {
        id: decisionId,
        attempt_id: body.attempt_id ?? MOCK_IDS.attemptCsci153Open,
        curriculum_term_course_id:
          body.curriculum_term_course_id ?? MOCK_IDS.slotFreeElective1,
        mapped_by: auth.persona.profileId,
        units_credited: 3,
        created_at: '2026-08-20T08:00:00Z',
        updated_at: '2026-11-10T09:00:00Z',
        student_id: studentId,
        revoked_at: null,
      }
      return HttpResponse.json(mapping, { status: 200 })
    },
  ),

  http.post(
    '*/functions/v1/students/:student_id/elective-mappings/:decision_id/revoke',
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const decisionId = String(params.decision_id)
      const mapping: ApiSchema<'ElectiveMapping'> = {
        id: decisionId,
        attempt_id: MOCK_IDS.attemptCsci153Open,
        curriculum_term_course_id: MOCK_IDS.slotFreeElective1,
        mapped_by: auth.persona.profileId,
        units_credited: 3,
        created_at: '2026-08-20T08:00:00Z',
        updated_at: '2026-11-10T09:00:00Z',
        student_id: studentId,
        revoked_at: '2026-11-10T09:00:00Z',
      }
      return HttpResponse.json(mapping, { status: 200 })
    },
  ),

  http.post(
    '*/functions/v1/students/:student_id/equivalencies',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const body = (await request.json().catch(() => ({}))) as ApiSchema<'EquivalencyDecisionRequest'>
      const eq: ApiSchema<'EquivalencyDecision'> = {
        id: nextSyntheticUuid(),
        attempt_id: body.attempt_id ?? MOCK_IDS.attemptCsci102Inc,
        destination_curriculum_term_course_id:
          body.destination_curriculum_term_course_id ?? MOCK_IDS.slotCsci102,
        decision_type: body.decision_type ?? 'transfer_equivalency',
        decided_by: auth.persona.profileId,
        decided_at: '2026-11-10T09:00:00Z',
        units_credited: 3,
        student_id: studentId,
        updated_at: '2026-11-10T09:00:00Z',
        revoked_at: null,
      }
      return HttpResponse.json(eq, { status: 201 })
    },
  ),

  http.patch(
    '*/functions/v1/students/:student_id/equivalencies/:decision_id',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const decisionId = String(params.decision_id)
      const body = (await request.json().catch(() => ({}))) as ApiSchema<'EquivalencyDecisionEdit'>
      const eq: ApiSchema<'EquivalencyDecision'> = {
        id: decisionId,
        attempt_id: body.attempt_id ?? MOCK_IDS.attemptCsci102Inc,
        destination_curriculum_term_course_id:
          body.destination_curriculum_term_course_id ?? MOCK_IDS.slotCsci102,
        decision_type: body.decision_type ?? 'transfer_equivalency',
        decided_by: auth.persona.profileId,
        decided_at: '2026-08-20T08:00:00Z',
        units_credited: 3,
        student_id: studentId,
        updated_at: '2026-11-10T09:00:00Z',
        revoked_at: null,
      }
      return HttpResponse.json(eq, { status: 200 })
    },
  ),

  http.post(
    '*/functions/v1/students/:student_id/equivalencies/:decision_id/revoke',
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const decisionId = String(params.decision_id)
      const eq: ApiSchema<'EquivalencyDecision'> = {
        id: decisionId,
        attempt_id: MOCK_IDS.attemptCsci102Inc,
        destination_curriculum_term_course_id: MOCK_IDS.slotCsci102,
        decision_type: 'transfer_equivalency',
        decided_by: auth.persona.profileId,
        decided_at: '2026-08-20T08:00:00Z',
        units_credited: 3,
        student_id: studentId,
        updated_at: '2026-11-10T09:00:00Z',
        revoked_at: '2026-11-10T09:00:00Z',
      }
      return HttpResponse.json(eq, { status: 200 })
    },
  ),

  http.post(
    '*/functions/v1/students/:student_id/outside-credits',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const body = (await request.json().catch(() => ({}))) as ApiSchema<'OutsideCreditCreateRequest'>
      const credit: ApiSchema<'OutsideCredit'> = {
        id: nextSyntheticUuid(),
        student_id: studentId,
        entry_type: body.entry_type ?? 'transferee',
        origin_school: body.origin_school ?? 'UP Cebu',
        original_course_code: body.original_course_code ?? 'CMSC 11',
        original_course_title:
          body.original_course_title ?? 'Introduction to Computer Science',
        units: body.units ?? 3,
        grade: body.grade ?? '1.50',
        destination_curriculum_term_course_id:
          body.destination_curriculum_term_course_id ?? MOCK_IDS.slotCsci101,
        units_credited: 3,
        decided_by: auth.persona.profileId,
        decided_at: '2026-11-10T09:00:00Z',
        revoked_at: null,
        updated_at: '2026-11-10T09:00:00Z',
      }
      return HttpResponse.json(credit, { status: 201 })
    },
  ),

  http.post(
    '*/functions/v1/students/:student_id/outside-credits/:credit_id/revoke',
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const creditId = String(params.credit_id)
      const credit: ApiSchema<'OutsideCredit'> = {
        id: creditId,
        student_id: studentId,
        entry_type: 'transferee',
        origin_school: 'UP Cebu',
        original_course_code: 'CMSC 11',
        original_course_title: 'Introduction to Computer Science',
        units: 3,
        grade: '1.50',
        destination_curriculum_term_course_id: MOCK_IDS.slotCsci101,
        units_credited: 3,
        decided_by: auth.persona.profileId,
        decided_at: '2026-08-10T08:00:00Z',
        revoked_at: '2026-11-10T09:00:00Z',
        updated_at: '2026-11-10T09:00:00Z',
      }
      return HttpResponse.json(credit, { status: 200 })
    },
  ),

  http.post(
    '*/functions/v1/students/:student_id/curriculum-transfers',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const body = (await request.json().catch(() => ({}))) as ApiSchema<'CurriculumTransferEndorseRequest'>
      const req: ApiSchema<'CurriculumTransferRequest'> = {
        id: nextSyntheticUuid(),
        student_id: studentId,
        from_curriculum_version_id: MOCK_IDS.curriculumBscs2020,
        to_curriculum_version_id:
          body.to_curriculum_version_id ?? MOCK_IDS.curriculumBscs2024,
        endorsed_by: auth.persona.profileId,
        endorsement_note: body.endorsement_note ?? 'Endorsed by adviser.',
        status: 'pending',
        decided_by: null,
        decided_at: null,
        decision_note: null,
        carried_units: 36,
        created_at: '2026-11-10T09:00:00Z',
        updated_at: '2026-11-10T09:00:00Z',
      }
      return HttpResponse.json(req, { status: 201 })
    },
  ),

  http.post(
    '*/functions/v1/curriculum-transfers/:transfer_id/decision',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ['admin', 'department_head'])
      if ('response' in auth) return auth.response
      const transferId = String(params.transfer_id)
      const body = (await request.json().catch(() => ({ decision: 'approved' }))) as ApiSchema<'CurriculumTransferDecisionRequest'>
      const req: ApiSchema<'CurriculumTransferRequest'> = {
        id: transferId,
        student_id: MOCK_IDS.studentPrimary,
        from_curriculum_version_id: MOCK_IDS.curriculumBscs2020,
        to_curriculum_version_id: MOCK_IDS.curriculumBscs2024,
        endorsed_by: MOCK_IDS.adviserPrimary,
        endorsement_note: 'Endorsed transition to 2024 BSCS curriculum.',
        status: body.decision,
        decided_by: auth.persona.profileId,
        decided_at: '2026-11-10T09:00:00Z',
        decision_note: body.decision_note ?? null,
        carried_units: 36,
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-11-10T09:00:00Z',
      }
      return HttpResponse.json(req, { status: 200 })
    },
  ),

  http.post('*/functions/v1/students/import', async ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'department_head',
      'department_staff',
    ])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'StudentBatchImportRequest'>
      | null
    if (!body?.mode || !Array.isArray(body.rows)) {
      return errorJson(400, 'INVALID_INPUT', 'mode and rows are required.')
    }
    const db = getMockDatabase()
    const valid = (r: ApiSchema<'StudentBatchImportRowInput'>) => {
      const adviser = db.profiles.find(p => p.id === r.adviser_id && p.status === 'active' && p.roles?.includes('adviser'))
      const program = db.programs.find(p => p.id === r.program_id)
      return Boolean(adviser && program && adviser.department_id === program.department_id && db.curriculumVersions.some(c => c.id === r.curriculum_version_id && c.program_id === r.program_id && c.status === 'active'))
    }
    const validCount = body.rows.filter(valid).length
    const res: ApiSchema<'StudentBatchImportResponse'> = {
      mode: body.mode,
      valid_count: validCount,
      warning_count: 0,
      error_count: body.rows.length - validCount,
      imported_count: body.mode === 'commit' ? validCount : 0,
      results: body.rows.map((r) => ({
        row_number: r.row_number,
        student_number: r.student_number,
        email: r.email,
        outcome: valid(r) ? (body.mode === 'commit' ? 'imported' : 'valid') : 'error',
        message: valid(r) ? 'Validated successfully.' : 'An eligible active adviser and matching active curriculum are required.',
      })),
    }
    return HttpResponse.json(res, { status: 200 })
  }),

  // ===========================================================================
  // 8. Advising Plans, Notes, Remarks, Shift Preview, AI Assistant & Photos
  // ===========================================================================
  http.put(
    '*/functions/v1/students/:student_id/plans/:school_term_id',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const schoolTermId = String(params.school_term_id)
      const body = (await request.json().catch(() => ({}))) as ApiSchema<'AdvisingPlanSaveRequest'>
      const planId = MOCK_IDS.advisingPlan1
      const plan: ApiSchema<'AdvisingPlan'> = {
        id: planId,
        student_id: studentId,
        school_term_id: schoolTermId,
        student_curriculum_assignment_id:
          body.expected_curriculum_assignment_id ??
          MOCK_IDS.studentCurrAssignment1,
        created_by: auth.persona.profileId,
        updated_by: auth.persona.profileId,
        created_at: '2026-08-12T08:00:00Z',
        updated_at: '2026-11-10T09:00:00Z',
        revision: (body.expected_revision ?? 0) + 1,
      }
      const items: ApiSchema<'AdvisingPlanItem'>[] = (body.items ?? []).map(
        (item, idx) => ({
          id: nextSyntheticUuid(),
          advising_plan_id: planId,
          student_id: studentId,
          school_term_id: schoolTermId,
          course_offering_id: item.course_offering_id,
          curriculum_term_course_id: item.curriculum_term_course_id ?? null,
          display_order: idx + 1,
          created_at: '2026-11-10T09:00:00Z',
        }),
      )
      const res: ApiSchema<'AdvisingPlanResponse'> = { plan, items }
      return HttpResponse.json(res, { status: 200 })
    },
  ),

  http.post(
    '*/functions/v1/students/:student_id/notes',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const body = (await request.json().catch(() => null)) as
        | ApiSchema<'NoteRequest'>
        | null
      if (!body?.body_text) {
        return errorJson(400, 'INVALID_INPUT', 'body_text is required.')
      }
      const note: ApiSchema<'AdvisingNote'> = {
        id: nextSyntheticUuid(),
        student_id: studentId,
        authored_by: auth.persona.profileId,
        author_name: auth.persona.fullName,
        author_role_label: 'Adviser',
        body_text: body.body_text,
        is_archived: false,
        archived_at: null,
        archived_by: null,
        created_at: '2026-11-10T09:00:00Z',
      }
      getMockDatabase().advisingNotes.push(note)
      return HttpResponse.json(note, { status: 201 })
    },
  ),

  http.patch(
    '*/functions/v1/students/:student_id/notes/:note_id',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const noteId = String(params.note_id)
      const body = (await request.json().catch(() => ({ is_archived: true }))) as ApiSchema<'NoteArchiveUpdateRequest'>
      const note: ApiSchema<'AdvisingNote'> = {
        id: noteId,
        student_id: studentId,
        authored_by: auth.persona.profileId,
        author_name: auth.persona.fullName,
        author_role_label: 'Adviser',
        body_text: 'Archived advising note.',
        is_archived: Boolean(body.is_archived),
        archived_at: body.is_archived ? '2026-11-10T09:00:00Z' : null,
        archived_by: body.is_archived ? auth.persona.profileId : null,
        created_at: '2026-08-12T09:00:00Z',
      }
      return HttpResponse.json(note, { status: 200 })
    },
  ),

  http.post(
    '*/functions/v1/students/:student_id/remarks',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
      const remark: ApiSchema<'AttemptRemark'> = {
        id: nextSyntheticUuid(),
        student_id: studentId,
        authored_by: auth.persona.profileId,
        body_text: String(body.body_text ?? 'Adviser remark'),
        created_at: '2026-11-10T09:00:00Z',
        attempt_id: (body.attempt_id as string | null) ?? MOCK_IDS.attemptCsci102Inc,
        curriculum_term_course_id:
          (body.curriculum_term_course_id as string | null) ?? MOCK_IDS.slotCsci102,
      }
      return HttpResponse.json(remark, { status: 201 })
    },
  ),

  http.post(
    '*/functions/v1/students/:student_id/shift-preview',
    ({ request }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const preview: ApiSchema<'ShiftPreviewResponse'> = {
        carried_units: 33,
        lost_units: 3,
        projected_gwa: 1.72,
        mutates_records: false,
      }
      return HttpResponse.json(preview, { status: 200 })
    },
  ),

  http.post(
    '*/functions/v1/students/:student_id/assistant',
    async ({ request }) => {
      const auth = authenticateRequest(request, [
        'admin',
        'dean',
        'department_head',
        'adviser',
      ])
      if ('response' in auth) return auth.response
      const body = (await request.json().catch(() => null)) as
        | ApiSchema<'AdvisingAIRequest'>
        | null
      if (!body?.message) {
        return errorJson(400, 'INVALID_INPUT', 'message is required.')
      }
      const res: ApiSchema<'AdvisingAIResponse'> = {
        answer:
          'Juan M. Dela Cruz has 1 open INC in CSCI 102 (deadline 2027-05-30) and is eligible to take CSCI 198 as CS Elective 1.',
        verification_notice:
          'Verify all prerequisite and standing decisions against the official curriculum checklist.',
        grounded_at: '2026-11-10T09:00:00Z',
        mutates_records: false,
      }
      return HttpResponse.json(res, { status: 200 })
    },
  ),

  http.put(
    '*/functions/v1/students/:student_id/photo',
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ['student', 'admin'])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      if (!canAccessStudentRecord(auth.persona, studentId)) {
        return errorJson(
          403,
          'INSUFFICIENT_PRIVILEGE',
          'Cannot update another student profile photo.',
        )
      }
      const body = (await request.json().catch(() => null)) as
        | ApiSchema<'StudentPhotoUpdateRequest'>
        | null
      if (!body?.avatar_url || !body?.mime_type || !body?.file_size_bytes) {
        return errorJson(
          400,
          'INVALID_INPUT',
          'avatar_url, mime_type, and file_size_bytes are required.',
        )
      }
      if (body.file_size_bytes > 2097152) {
        return errorJson(
          400,
          'FILE_TOO_LARGE',
          'Profile photo must not exceed 2 MB (2,097,152 bytes).',
        )
      }
      const db = getMockDatabase()
      const profile =
        db.profiles.find((p) => p.id === studentId) ?? db.profiles[0]!
      const updated: ApiSchema<'Profile'> = {
        ...profile,
        avatar_url: body.avatar_url,
        updated_at: '2026-11-10T09:00:00Z',
      }
      return HttpResponse.json(updated, { status: 200 })
    },
  ),

  http.delete(
    '*/functions/v1/students/:student_id/photo',
    ({ request, params }) => {
      const auth = authenticateRequest(request, ['student', 'admin'])
      if ('response' in auth) return auth.response
      const studentId = String(params.student_id)
      if (!canAccessStudentRecord(auth.persona, studentId)) {
        return errorJson(
          403,
          'INSUFFICIENT_PRIVILEGE',
          'Cannot remove another student profile photo.',
        )
      }
      const db = getMockDatabase()
      const profile =
        db.profiles.find((p) => p.id === studentId) ?? db.profiles[0]!
      const updated: ApiSchema<'Profile'> = {
        ...profile,
        avatar_url: null,
        updated_at: '2026-11-10T09:00:00Z',
      }
      return HttpResponse.json(updated, { status: 200 })
    },
  ),

  // ===========================================================================
  // 9. Notifications, Reports, Settings & Audit Edge Functions
  // ===========================================================================
  http.post('*/functions/v1/notifications/mark-read', async ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => ({
      mark_all: true,
      is_read: true,
    }))) as ApiSchema<'MarkNotificationsReadRequest'>
    const db = getMockDatabase()
    let updatedCount = 0
    for (const n of db.notifications) {
      if (n.recipient_id === auth.persona.profileId) {
        if (
          body.mark_all ||
          body.notification_id === n.id ||
          body.notification_ids?.includes(n.id)
        ) {
          n.is_read = body.is_read ?? true
          updatedCount += 1
        }
      }
    }
    const res: ApiSchema<'MarkNotificationsReadResponse'> = {
      updated_count: updatedCount,
    }
    return HttpResponse.json(res, { status: 200 })
  }),

  http.post(
    '*/functions/v1/notifications/evaluate-alerts',
    async ({ request }) => {
      const auth = authenticateRequest(request, ['admin', 'department_head'])
      if ('response' in auth) return auth.response
      const body = (await request.json().catch(() => ({ dry_run: false }))) as ApiSchema<'EvaluateAlertsRequest'>
      const res: ApiSchema<'EvaluateAlertsResponse'> = {
        reference_date: body.reference_date ?? '2026-11-10',
        dry_run: Boolean(body.dry_run),
        evaluated_counts: {
          inc_deadline_approaching: 1,
          inc_lapsed: 0,
          standing_threshold_alert: 0,
          encoding_deadline_approaching: 0,
          unassigned_students_pending: 1,
          invitation_expiring_soon: 0,
          backup_overdue_reminder: 0,
          skipped_duplicates: 0,
          total_created: 2,
        },
        created_notifications: [],
      }
      return HttpResponse.json(res, { status: 200 })
    },
  ),

  http.get('*/functions/v1/reports/adviser-dashboard', ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'dean',
      'department_head',
      'adviser',
    ])
    if ('response' in auth) return auth.response
    const report: ApiSchema<'AdviserDashboardReport'> = {
      adviser_id: auth.persona.profileId,
      total_advisees: 1,
      standing_counts: {
        good_standing: 1,
        warning: 0,
        probation: 0,
        dismissed: 0,
      },
      open_grade_flags_count: 1,
      pending_inc_count: 1,
      expiring_inc_soon_count: 0,
      lapsed_inc_count: 0,
      mean_gwa: 1.75,
      year_level_counts: [{ year_level: 3, student_count: 1 }],
      batch_curriculum_gwa: [
        {
          entry_year: 2024,
          program_id: MOCK_IDS.programBscs,
          program_code: 'BSCS',
          curriculum_version_id: MOCK_IDS.curriculumBscs2024,
          curriculum_label: 'BSCS 2024-2025 v1',
          student_count: 1,
          mean_gwa: 1.75,
          good_standing_count: 1,
          at_risk_count: 0,
        },
      ],
      advisees_with_deficiencies: [],
      computed_at: '2026-11-10T09:00:00Z',
    }
    return HttpResponse.json(report, { status: 200 })
  }),

  http.get('*/functions/v1/reports/department', ({ request }) => {
    const auth = authenticateRequest(request, [
      'admin',
      'dean',
      'department_head',
    ])
    if ('response' in auth) return auth.response
    const report: ApiSchema<'DepartmentReport'> = {
      department_id: MOCK_IDS.deptDcst,
      total_students: 2,
      with_deficiencies_count: 1,
      unassigned_students_count: 1,
      open_grade_flags_count: 1,
      pending_transfers_count: 1,
      encoding_progress_pct: 85,
      average_gwa: 1.75,
      standing_counts: {
        good_standing: 2,
        warning: 0,
        probation: 0,
        dismissed: 0,
      },
      adviser_caseloads: [
        {
          adviser_id: MOCK_IDS.adviserPrimary,
          adviser_name: MOCK_PERSONAS.adviser.fullName,
          student_count: 1,
          at_risk_count: 0,
        },
      ],
      bottleneck_courses: [
        {
          course_id: MOCK_IDS.courseCsci102,
          code: 'CSCI 102',
          title: 'Computer Programming 1',
          fail_or_inc_rate: 12.5,
          affected_count: 1,
        },
      ],
      computed_at: '2026-11-10T09:00:00Z',
    }
    return HttpResponse.json(report, { status: 200 })
  }),

  http.get('*/functions/v1/reports/faculty', ({ request }) => {
    const auth = authenticateRequest(request, ['admin', 'dean'])
    if ('response' in auth) return auth.response
    const report: ApiSchema<'FacultyReport'> = {
      faculty_id: MOCK_IDS.facultyComputing,
      total_students: 2,
      with_deficiencies_count: 1,
      average_gwa: 1.75,
      standing_counts: {
        good_standing: 2,
        warning: 0,
        probation: 0,
        dismissed: 0,
      },
      open_inc_count: 1,
      at_risk_total_count: 0,
      encoding_progress_pct: 85,
      department_summaries: [
        {
          department_id: MOCK_IDS.deptDcst,
          department_name: 'Department of Computer Science and Technology',
          student_count: 2,
          average_gwa: 1.75,
          at_risk_count: 0,
        },
      ],
      computed_at: '2026-11-10T09:00:00Z',
    }
    return HttpResponse.json(report, { status: 200 })
  }),

  http.put('*/functions/v1/settings', async ({ request }) => {
    const auth = authenticateRequest(request, ['admin', 'department_head'])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => ({}))) as ApiSchema<'SystemSettingsUpdateRequest'>
    const db = getMockDatabase()
    const current = db.systemSettings[0]!
    const warning = body.warning_pct ?? current.warning_pct
    const probation = body.probation_pct ?? current.probation_pct
    const dismissal = body.dismissal_pct ?? current.dismissal_pct
    if (!(warning > 0 && warning < probation && probation < dismissal && dismissal <= 100)) {
      return errorJson(
        400,
        'INVALID_THRESHOLDS',
        'Thresholds must satisfy 0 < warning_pct < probation_pct < dismissal_pct <= 100.',
      )
    }
    const updated: ApiSchema<'SystemSettings'> = {
      ...current,
      warning_pct: warning,
      probation_pct: probation,
      dismissal_pct: dismissal,
      sender_email: body.sender_email ?? current.sender_email,
      updated_at: '2026-11-10T09:00:00Z',
    }
    db.systemSettings[0] = updated
    return HttpResponse.json(updated, { status: 200 })
  }),

  http.post('*/functions/v1/settings/record-backup', async ({ request }) => {
    const auth = authenticateRequest(request, ['admin', 'department_head'])
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => ({}))) as ApiSchema<'RecordBackupRequest'>
    const db = getMockDatabase()
    const current = db.systemSettings[0]!
    const updated: ApiSchema<'SystemSettings'> = {
      ...current,
      last_backup_at: body.completed_at ?? '2026-11-10T09:00:00Z',
      last_backup_by: auth.persona.profileId,
      last_backup_reference: body.backup_reference ?? 'BKP-2026-11-10-001',
      last_backup_location:
        body.storage_location ?? 'vsu-saais-backups/2026-11-10.dump',
      last_backup_scope: body.scope ?? 'institution_wide',
      updated_at: '2026-11-10T09:00:00Z',
    }
    db.systemSettings[0] = updated
    return HttpResponse.json(updated, { status: 200 })
  }),

  http.post('*/functions/v1/audit/view-event', async ({ request }) => {
    const auth = authenticateRequest(request)
    if ('response' in auth) return auth.response
    const body = (await request.json().catch(() => null)) as
      | ApiSchema<'AuditViewEventRequest'>
      | null
    if (!body?.event_type) {
      return errorJson(400, 'INVALID_INPUT', 'event_type is required.')
    }
    const entityType = body.report_type ?? 'student_record'
    const entry: ApiSchema<'AuditLogEntry'> = {
      id: nextSyntheticUuid(),
      actor_id: auth.persona.profileId,
      actor_name: auth.persona.fullName,
      actor_role: auth.persona.primaryRole,
      student_id: body.student_id ?? null,
      student_name: body.student_id ? MOCK_PERSONAS.student.fullName : null,
      student_number: body.student_id ? '24-1-00101' : null,
      target_label: body.details ?? entityType,
      action: body.event_type,
      action_category: body.event_type.includes('export') ? 'export' : 'view',
      entity_type: entityType,
      entity_id: body.student_id ?? null,
      details_summary: body.details ?? `Recorded ${body.event_type}`,
      old_value: null,
      new_value: null,
      reason: null,
      created_at: '2026-11-10T09:00:00Z',
    }
    getMockDatabase().auditLogEntries.push(entry)
    return HttpResponse.json(entry, { status: 201 })
  }),
]
