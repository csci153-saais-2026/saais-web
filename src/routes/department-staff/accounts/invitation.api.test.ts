import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import type { ApiSchema } from '@/lib/api'
import { getMockDatabase, loginAsMockPersona, logoutMockPersona, MOCK_IDS, MOCK_PERSONAS, resetMockDatabase } from '@/mocks'
import { saaisMockServer } from '@/mocks/node'
import { sendDepartmentInvitation } from './invitation.api'

vi.mock('@/lib/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    apiClient: actual.createSaaisApiClient({
      baseUrl: 'http://localhost:3000',
      mode: 'mock',
      getAccessToken: () => 'mock-jwt:department_staff',
      fetch: (...args) => globalThis.fetch(...args),
    }),
  }
})

function scopedPayload(
  role: 'student' | 'adviser' | 'department_staff' | 'department_head',
  email: string,
): ApiSchema<'InviteRequest'> {
  const base = { email, full_name: `Invite ${role}` }
  if (role === 'student') {
    return {
      ...base,
      role,
      student_number: '26-1-00991',
      program_id: MOCK_IDS.programBscs,
      curriculum_version_id: MOCK_IDS.curriculumBscs2024,
      adviser_id: MOCK_IDS.adviserPrimary,
    }
  }
  if (role === 'adviser') {
    return { ...base, role, faculty_id: MOCK_IDS.facultyComputing, department_id: MOCK_IDS.deptDcst }
  }
  return { ...base, role, faculty_id: MOCK_IDS.facultyComputing, department_id: MOCK_IDS.deptDcst }
}

beforeAll(() => saaisMockServer.listen())
beforeEach(() => {
  resetMockDatabase()
  loginAsMockPersona('department_staff')
})
afterEach(() => {
  saaisMockServer.resetHandlers()
  resetMockDatabase()
  logoutMockPersona()
})
afterAll(() => saaisMockServer.close())

describe('department account invitation API', () => {
  it.each(['student', 'adviser', 'department_staff', 'department_head'] as const)(
    'sends the exact generated %s request through the existing MSW provisioning handler',
    async role => {
      const payload = scopedPayload(role, `step37-${role}@vsu.edu.ph`)
      const response = await sendDepartmentInvitation(payload)

      expect(response).toMatchObject({
        success: true,
        invitation_status: 'pending',
        message: 'Invitation email dispatched successfully.',
      })
      expect(response.profile_id).toBeTruthy()
      const profile = getMockDatabase().profiles.find(item => item.id === response.profile_id)
      expect(profile?.email).toBe(payload.email)
      expect(profile?.status).toBe('invited')
      if (role === 'student') {
        expect(getMockDatabase().studentOrganizations.some(item => item.student_id === response.profile_id)).toBe(true)
        expect(getMockDatabase().adviserAssignments.some(item => item.student_id === response.profile_id && item.adviser_id === MOCK_IDS.adviserPrimary)).toBe(true)
        expect(getMockDatabase().studentCurriculumAssignments.some(item => item.student_id === response.profile_id && item.curriculum_version_id === MOCK_IDS.curriculumBscs2024)).toBe(true)
      }
    },
  )

  it('returns the server 403 for a self-grant and a foreign-department grant', async () => {
    await expect(sendDepartmentInvitation(scopedPayload('department_head', MOCK_PERSONAS.department_staff.email)))
      .rejects.toMatchObject({ status: 403, isForbidden: true, message: 'Cannot assign roles to yourself.' })

    const foreign = scopedPayload('department_head', 'foreign.scope@vsu.edu.ph') as ApiSchema<'InviteRequest'> & { department_id: string; faculty_id: string }
    foreign.department_id = MOCK_IDS.deptDabe
    foreign.faculty_id = MOCK_IDS.facultyEngineering
    await expect(sendDepartmentInvitation(foreign))
      .rejects.toMatchObject({ status: 403, isForbidden: true, message: 'Cannot provision accounts outside your assigned department.' })
    expect(getMockDatabase().profiles.some(profile => profile.email === 'foreign.scope@vsu.edu.ph')).toBe(false)
  })

  it('surfaces duplicate identity conflicts without creating another profile', async () => {
    const existingEmail = MOCK_PERSONAS.student.email
    const existingCount = getMockDatabase().profiles.filter(profile => profile.email === existingEmail).length

    await expect(sendDepartmentInvitation(scopedPayload('adviser', existingEmail)))
      .rejects.toMatchObject({ status: 409, isConflict: true, code: 'DUPLICATE_EMAIL' })
    expect(getMockDatabase().profiles.filter(profile => profile.email === existingEmail)).toHaveLength(existingCount)
  })

  it('normalizes network failures and does not retry the provisioning POST', async () => {
    let calls = 0
    saaisMockServer.use(http.post('*/functions/v1/auth/invite', () => {
      calls += 1
      return HttpResponse.error()
    }))

    await expect(sendDepartmentInvitation(scopedPayload('adviser', 'network.fail@vsu.edu.ph')))
      .rejects.toMatchObject({ status: 0, isNetworkError: true })
    expect(calls).toBe(1)
  })
})
