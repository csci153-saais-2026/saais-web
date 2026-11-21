import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import type { ApiSchema } from '@/lib/api'
import { getMockDatabase, loginAsMockPersona, logoutMockPersona, MOCK_IDS, MOCK_PERSONAS, resetMockDatabase } from '@/mocks'
import { saaisMockServer } from '@/mocks/node'
import { canResendDepartmentInvitation, canRevokeDepartmentInvitation, resendDepartmentAccountInvitation, revokeDepartmentAccountInvitation } from './accounts.api'
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

  it('enables resend only from eligible server account state within Staff scope', () => {
    const database = getMockDatabase()
    const eligibleProfile = database.profiles.find(profile => profile.id === MOCK_IDS.studentSecondary)!
    const eligible = {
      profile: eligibleProfile,
      role_assignments: database.roleAssignments.filter(assignment => assignment.profile_id === eligibleProfile.id),
      student_organization: database.studentOrganizations.find(item => item.student_id === eligibleProfile.id) ?? null,
    } satisfies ApiSchema<'AccountSummary'>
    const activeProfile = database.profiles.find(profile => profile.id === MOCK_IDS.studentPrimary)!
    const activeAccount = { ...eligible, profile: activeProfile }
    const deanProfile = database.profiles.find(profile => profile.id === MOCK_IDS.deanDeptHeadComputing)!
    const deanAccount = {
      ...eligible,
      profile: { ...deanProfile, status: 'invited' as const, invitation_status: 'pending' as const },
    }
    const missingState = { ...eligible, profile: { ...eligibleProfile, invitation_status: null } }

    expect(canResendDepartmentInvitation(eligible, MOCK_PERSONAS.department_staff.profileId)).toBe(true)
    for (const invitation_status of ['expired', 'revoked', 'declined'] as const) {
      expect(canResendDepartmentInvitation({
        ...eligible,
        profile: { ...eligibleProfile, invitation_status },
      }, MOCK_PERSONAS.department_staff.profileId)).toBe(true)
    }
    expect(canResendDepartmentInvitation(activeAccount, MOCK_PERSONAS.department_staff.profileId)).toBe(false)
    expect(canResendDepartmentInvitation(deanAccount, MOCK_PERSONAS.department_staff.profileId)).toBe(false)
    expect(canResendDepartmentInvitation(eligible, eligibleProfile.id)).toBe(false)
    expect(canResendDepartmentInvitation(missingState, MOCK_PERSONAS.department_staff.profileId)).toBe(false)
  })

  it('resends through the dedicated operation and reads the updated server lifecycle fields', async () => {
    const profileId = MOCK_IDS.studentSecondary
    const result = await resendDepartmentAccountInvitation(profileId)

    expect(result).toMatchObject({
      success: true,
      profile_id: profileId,
      invitation_status: 'pending',
      message: 'Invitation regenerated and dispatched.',
    })
    expect(getMockDatabase().profiles.find(profile => profile.id === profileId)).toMatchObject({
      status: 'invited',
      invitation_status: 'pending',
      invitation_sent_at: result.invitation_sent_at,
      invitation_expires_at: result.invitation_expires_at,
    })
  })

  it('surfaces stale-state and foreign-scope resend denials as 409 and 403', async () => {
    await expect(resendDepartmentAccountInvitation(MOCK_IDS.studentPrimary))
      .rejects.toMatchObject({ status: 409, isConflict: true, code: 'INVITATION_NOT_RESENDABLE' })
    await expect(resendDepartmentAccountInvitation(MOCK_IDS.studentOtherDept))
      .rejects.toMatchObject({ status: 403, isForbidden: true })
  })

  it('surfaces rate limiting without replaying the resend request', async () => {
    let calls = 0
    saaisMockServer.use(http.post('*/functions/v1/accounts/:profile_id/resend-invite', () => {
      calls += 1
      return HttpResponse.json({ code: 'RATE_LIMITED', message: 'Wait before retrying.' }, {
        status: 429,
        headers: { 'Retry-After': '30' },
      })
    }))

    await expect(resendDepartmentAccountInvitation(MOCK_IDS.studentSecondary))
      .rejects.toMatchObject({ status: 429, isRateLimited: true, retryAfterSeconds: 30 })
    expect(calls).toBe(1)
  })

  it('allows revocation only for pending, invited, in-department non-self accounts', () => {
    const database = getMockDatabase()
    const profile = database.profiles.find(item => item.id === MOCK_IDS.studentSecondary)!
    const account = {
      profile,
      role_assignments: database.roleAssignments.filter(item => item.profile_id === profile.id),
      student_organization: database.studentOrganizations.find(item => item.student_id === profile.id) ?? null,
    } satisfies ApiSchema<'AccountSummary'>

    expect(canRevokeDepartmentInvitation(account, MOCK_PERSONAS.department_staff.profileId, MOCK_IDS.deptDcst)).toBe(true)
    expect(canRevokeDepartmentInvitation(account, profile.id, MOCK_IDS.deptDcst)).toBe(false)
    expect(canRevokeDepartmentInvitation(account, MOCK_PERSONAS.department_staff.profileId, MOCK_IDS.deptDabe)).toBe(false)
    expect(canRevokeDepartmentInvitation({ ...account, profile: { ...profile, status: 'active' } }, MOCK_PERSONAS.department_staff.profileId, MOCK_IDS.deptDcst)).toBe(false)
    expect(canRevokeDepartmentInvitation({ ...account, profile: { ...profile, invitation_status: 'expired' } }, MOCK_PERSONAS.department_staff.profileId, MOCK_IDS.deptDcst)).toBe(false)
    const deanProfile = database.profiles.find(item => item.id === MOCK_IDS.deanDeptHeadComputing)!
    expect(canRevokeDepartmentInvitation({ ...account, profile: { ...deanProfile, status: 'invited', invitation_status: 'pending' } }, MOCK_PERSONAS.department_staff.profileId, MOCK_IDS.deptDcst)).toBe(false)
  })

  it('revokes only the invitation state and retains the invited profile and roles', async () => {
    const profileId = MOCK_IDS.studentSecondary
    const before = getMockDatabase().profiles.find(profile => profile.id === profileId)!
    const roles = [...(before.roles ?? [])]
    const result = await revokeDepartmentAccountInvitation(profileId)

    expect(result).toMatchObject({
      id: profileId,
      status: 'invited',
      invitation_status: 'revoked',
      roles,
    })
    expect(getMockDatabase().profiles.find(profile => profile.id === profileId)).toMatchObject({
      status: 'invited',
      invitation_status: 'revoked',
      roles,
    })
    expect(getMockDatabase().profiles.some(profile => profile.id === profileId)).toBe(true)
  })

  it('surfaces stale-state conflicts and foreign-scope denials without touching account rows', async () => {
    const profileId = MOCK_IDS.studentSecondary
    const database = getMockDatabase()
    const profile = database.profiles.find(item => item.id === profileId)!
    database.profiles[database.profiles.findIndex(item => item.id === profileId)] = { ...profile, invitation_status: 'expired' }
    await expect(revokeDepartmentAccountInvitation(profileId))
      .rejects.toMatchObject({ status: 409, isConflict: true, code: 'INVITATION_NOT_REVOCABLE' })

    await expect(revokeDepartmentAccountInvitation(MOCK_IDS.studentOtherDept))
      .rejects.toMatchObject({ status: 403, isForbidden: true })
    expect(getMockDatabase().profiles.find(item => item.id === profileId)?.status).toBe('invited')
  })
})
