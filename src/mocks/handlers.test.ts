import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  API_ERROR_CODES,
  createSaaisApiClient,
  hasApiErrorCode,
  isApiClientError,
  parseContentRange,
  postgrestFilter,
  unwrapApiResult,
} from '@/lib/api'
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  MOCK_PERSONAS,
  resetMockDatabase,
   resolveMockPersonaFromAuthHeader,
} from './index'
import { saaisMockServer } from './node'

const BASE_URL = 'https://saais-mock.supabase.co'
const TEST_API_KEY = 'sb_publishable_mock_key'

beforeAll(() => {
  saaisMockServer.listen()
})

afterEach(() => {
  saaisMockServer.resetHandlers()
  resetMockDatabase()
  logoutMockPersona()
})

afterAll(() => {
  saaisMockServer.close()
})

describe('MSW contract handlers & role-based authorization (Issue #43)', () => {
  it('resolves named and shorthand mock persona tokens accurately', () => {
    expect(
      resolveMockPersonaFromAuthHeader(`Bearer ${MOCK_PERSONAS.adviser.token}`)
        ?.key,
    ).toBe('adviser')
    expect(
      resolveMockPersonaFromAuthHeader('Bearer mock-jwt:dean_dept_head')?.key,
    ).toBe('dean_dept_head')
    expect(resolveMockPersonaFromAuthHeader('Bearer admin-jwt')?.key).toBe(
      'admin',
    )
    expect(resolveMockPersonaFromAuthHeader(null)).toBeNull()
  })

  it('handles pre-session invitation preview, verify (12-128 char policy), and decline without Bearer token', async () => {
    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      mode: 'mock',
    })

    const preview = unwrapApiResult(
      await client.POST('/functions/v1/auth/preview-invite', {
        body: { token: 'valid-single-use-invite-token' },
      }),
    )
    expect(preview.valid).toBe(true)
    expect(preview.role).toBe('student')
    expect(preview.program_code).toBe('BSCS')

    // Rejects short (<12 char) password per contract policy
    const weakVerify = await client.POST('/functions/v1/auth/verify-invite', {
      body: { token: 'valid-single-use-invite-token', password: 'short' },
    })
    expect(weakVerify.response.status).toBe(400)

    const verify = unwrapApiResult(
      await client.POST('/functions/v1/auth/verify-invite', {
        body: {
          token: 'valid-single-use-invite-token',
          password: 'ValidStrongPassword2026!',
        },
      }),
    )
    expect(verify.success).toBe(true)

    const decline = unwrapApiResult(
      await client.POST('/functions/v1/auth/decline-invite', {
        body: { token: 'valid-single-use-invite-token', reason: 'Declined' },
      }),
    )
    expect(decline.invitation_status).toBe('declined')
  })

  it('enforces Student self-only access on PostgREST projections and student Edge Functions', async () => {
    loginAsMockPersona('student')
    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      mode: 'mock',
    })

    // Own profile, adviser assignment, and academic summary succeed
    const profiles = unwrapApiResult(await client.GET('/rest/v1/profile'))
    expect(profiles).toHaveLength(1)
    expect(profiles[0]?.id).toBe(MOCK_IDS.studentPrimary)

    const assignments = unwrapApiResult(
      await client.GET('/rest/v1/adviser_assignment', {
        params: {
          query: {
            select:
              'id,adviser_id,adviser_name,adviser_email,adviser_faculty_name,adviser_consultation_hours,student_id,start_date',
            student_id: postgrestFilter.eq(MOCK_IDS.studentPrimary),
          },
        },
      }),
    )
    expect(assignments[0]?.adviser_name).toBe(MOCK_PERSONAS.adviser.fullName)
    expect(assignments[0]?.adviser_consultation_hours).toBeTruthy()

    const ownSummary = unwrapApiResult(
      await client.GET('/functions/v1/students/{student_id}/academic-summary', {
        params: { path: { student_id: MOCK_IDS.studentPrimary } },
      }),
    )
    expect(ownSummary.student_id).toBe(MOCK_IDS.studentPrimary)

    // Reading another student's academic summary or checklist is denied with 403
    const otherSummary = await client.GET(
      '/functions/v1/students/{student_id}/academic-summary',
      {
        params: { path: { student_id: MOCK_IDS.studentSecondary } },
      },
    )
    expect(otherSummary.response.status).toBe(403)

    // Student cannot call staff roster or account invite
    const rosterAttempt = await client.GET('/functions/v1/students')
    expect(rosterAttempt.response.status).toBe(403)
  })

  it('enforces Department Staff provisioning boundaries (student/adviser/staff in own dept vs admin/dean forbidden)', async () => {
    loginAsMockPersona('department_staff')
    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      mode: 'mock',
    })

    // Allowed: inviting an adviser within DCST
    const allowedInvite = unwrapApiResult(
      await client.POST('/functions/v1/auth/invite', {
        body: {
          role: 'adviser',
          email: 'new.adviser.mock@vsu.edu.ph',
          full_name: 'Prof. New Adviser',
          faculty_id: MOCK_IDS.facultyComputing,
          department_id: MOCK_IDS.deptDcst,
        },
      }),
    )
    expect(allowedInvite.success).toBe(true)
    expect(allowedInvite.invitation_status).toBe('pending')

    // Denied: Department Staff attempting to provision an Admin or Dean
    const deniedAdminInvite = await client.POST('/functions/v1/auth/invite', {
      body: {
        role: 'admin',
        email: 'rogue.admin@vsu.edu.ph',
        full_name: 'Rogue Admin',
      },
    })
    expect(deniedAdminInvite.response.status).toBe(403)

    // Denied: Department Staff attempting to provision in another department
    const crossDeptInvite = await client.POST('/functions/v1/auth/invite', {
      body: {
        role: 'adviser',
        email: 'cross.dept@vsu.edu.ph',
        full_name: 'Cross Dept Adviser',
        faculty_id: MOCK_IDS.facultyEngineering,
        department_id: MOCK_IDS.deptDabe,
      },
    })
    expect(crossDeptInvite.response.status).toBe(403)
  })

  it('supports Adviser workflows including 409 ENROLLMENT_CONFIRMATION_REQUIRED, recommendations, and plan saving', async () => {
    loginAsMockPersona('adviser')
    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      mode: 'mock',
    })

    const roster = unwrapApiResult(
      await client.GET('/functions/v1/students', {
        params: { query: { assignment_scope: 'current' } },
      }),
    )
    expect(roster.total_count).toBe(1)
    expect(roster.items[0]?.student_number).toBe('24-1-00101')

    const recsResponse = await client.GET(
      '/functions/v1/students/{student_id}/recommendations',
      {
        params: {
          path: { student_id: MOCK_IDS.studentPrimary },
          query: { school_term_id: MOCK_IDS.term2026Sem1Open },
        },
      },
    )
    expect(recsResponse.response.headers.get('X-Excluded-Count')).toBe('3')
    const recs = unwrapApiResult(recsResponse)
    expect(recs[0]?.excluded_summary?.total_excluded).toBe(3)

    // Recording midterm grade without confirmed_enrollment returns 409 ENROLLMENT_CONFIRMATION_REQUIRED
    const unconfirmed = await client.POST(
      '/functions/v1/students/{student_id}/record-grades',
      {
        params: { path: { student_id: MOCK_IDS.studentPrimary } },
        body: {
          school_term_id: MOCK_IDS.term2026Sem1Open,
          course_offering_id: MOCK_IDS.offeringCsci198,
          curriculum_term_course_id: MOCK_IDS.slotFreeElective1,
          midterm_grade: 1.5,
          confirmed_enrollment: false,
          continue_with_prerequisite_override: false,
        },
      },
    )
    expect(unconfirmed.response.status).toBe(409)
    try {
      unwrapApiResult(unconfirmed)
    } catch (err) {
      expect(isApiClientError(err)).toBe(true)
      expect(
        hasApiErrorCode(err, API_ERROR_CODES.ENROLLMENT_CONFIRMATION_REQUIRED),
      ).toBe(true)
    }

    // Re-submitting with confirmed_enrollment: true succeeds
    const confirmed = unwrapApiResult(
      await client.POST('/functions/v1/students/{student_id}/record-grades', {
        params: { path: { student_id: MOCK_IDS.studentPrimary } },
        body: {
          school_term_id: MOCK_IDS.term2026Sem1Open,
          course_offering_id: MOCK_IDS.offeringCsci198,
          curriculum_term_course_id: MOCK_IDS.slotFreeElective1,
          midterm_grade: 1.5,
          confirmed_enrollment: true,
          continue_with_prerequisite_override: false,
        },
      }),
    )
    expect(confirmed.midterm_grade).toBe(1.5)
    expect(confirmed.curriculum_term_course_id).toBe(MOCK_IDS.slotFreeElective1)
  })

  it('supports Department Head, Dean, and Admin catalog/reporting/audit flows and resets state cleanly', async () => {
    loginAsMockPersona('department_head')
    const client = createSaaisApiClient({
      baseUrl: BASE_URL,
      apiKey: TEST_API_KEY,
      mode: 'mock',
    })

    // Department Head can close department encoding, but not institution-wide encoding
    const deptClose = unwrapApiResult(
      await client.POST(
        '/functions/v1/school-terms/{school_term_id}/close-encoding',
        {
          params: { path: { school_term_id: MOCK_IDS.term2026Sem1Open } },
          body: { scope: 'department', department_id: MOCK_IDS.deptDcst },
        },
      ),
    )
    expect(deptClose.department_closures?.[0]?.is_closed).toBe(true)

    const instCloseForbidden = await client.POST(
      '/functions/v1/school-terms/{school_term_id}/close-encoding',
      {
        params: { path: { school_term_id: MOCK_IDS.term2026Sem1Open } },
        body: { scope: 'institution' },
      },
    )
    expect(instCloseForbidden.response.status).toBe(403)

    // Switch to Admin and verify 409 dependency guard on faculty deletion + unreferenced faculty deletion
    loginAsMockPersona('admin')
    const deleteReferencedFaculty = await client.DELETE(
      '/functions/v1/catalog/faculty/{id}',
      {
        params: { path: { id: MOCK_IDS.facultyComputing } },
      },
    )
    expect(deleteReferencedFaculty.response.status).toBe(409)

    const createdFaculty = unwrapApiResult(
      await client.POST('/functions/v1/catalog/faculty', {
        body: { code: 'FVM', name: 'Faculty of Veterinary Medicine' },
      }),
    )
    expect(getMockDatabase().faculties).toHaveLength(3)

    const deleteNewFaculty = await client.DELETE(
      '/functions/v1/catalog/faculty/{id}',
      {
        params: { path: { id: createdFaculty.id } },
      },
    )
    expect(deleteNewFaculty.response.status).toBe(204)
    expect(getMockDatabase().faculties).toHaveLength(2)

    // Audit log closed date-range filter and Content-Range header
    const auditRes = await client.GET('/rest/v1/audit_log_entry', {
      params: {
        query: {
          and: postgrestFilter.createdAtBetween(
            '2026-08-01T00:00:00Z',
            '2026-12-31T23:59:59Z',
          ),
          limit: 20,
        },
      },
    })
    const auditRows = unwrapApiResult(auditRes)
    expect(auditRows.length).toBeGreaterThanOrEqual(2)
    expect(
      parseContentRange(auditRes.response.headers.get('Content-Range'))?.total,
    ).toBe(2)

    // Resetting restores initial database state
    resetMockDatabase()
    expect(getMockDatabase().faculties).toHaveLength(2)
  })
})
