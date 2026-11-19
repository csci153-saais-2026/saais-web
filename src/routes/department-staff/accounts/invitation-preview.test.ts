import { beforeEach, describe, expect, it } from 'vitest'
import { getMockDatabase, MOCK_IDS, MOCK_PERSONAS, resetMockDatabase } from '@/mocks'
import {
  buildDepartmentInvitePreview,
  departmentInviteRoles,
  type DepartmentInviteFormValues,
  type DepartmentInviteContext,
} from './invitation-preview'

function context(): DepartmentInviteContext {
  const db = getMockDatabase()
  return {
    canInvitePrivilegedRoles: true,
    ownEmail: MOCK_PERSONAS.department_staff.email,
    departmentId: MOCK_IDS.deptDcst,
    facultyId: MOCK_IDS.facultyComputing,
    programs: db.programs,
    curriculumVersions: db.curriculumVersions,
    advisers: db.profiles
      .filter(profile => profile.status === 'active' && profile.roles?.includes('adviser') && profile.department_id === MOCK_IDS.deptDcst)
      .map(profile => ({ id: profile.id, label: profile.full_name })),
  }
}

function values(role: DepartmentInviteFormValues['role']): DepartmentInviteFormValues {
  return {
    email: 'new.person@vsu.edu.ph',
    full_name: 'New Person',
    role,
    additional_roles: [],
    student_number: '26-1-00042',
    program_id: MOCK_IDS.programBscs,
    curriculum_version_id: MOCK_IDS.curriculumBscs2024,
    adviser_id: MOCK_IDS.adviserPrimary,
    entry_year: '',
  }
}

beforeEach(() => resetMockDatabase())

describe('department invitation preview validation', () => {
  it.each(departmentInviteRoles)('builds an exact scoped generated payload for %s', role => {
    const result = buildDepartmentInvitePreview(values(role), context())

    expect(result.ok).toBe(true)
    if (result.ok === false) return
    expect(result.roles).toEqual([role])
    expect(result.payload).toMatchObject({
      email: 'new.person@vsu.edu.ph',
      full_name: 'New Person',
      role,
    })
    if (role === 'admin') {
      expect(result.payload).not.toHaveProperty('faculty_id')
      expect(result.payload).not.toHaveProperty('department_id')
    } else if (role !== 'student') {
      expect(result.payload).toMatchObject({
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
      })
    }
  })

  it('includes required student fields and scoped secondary assignments in a multi-role student request', () => {
    const input = values('student')
    input.additional_roles = ['adviser', 'department_staff']
    input.entry_year = '2026'
    const result = buildDepartmentInvitePreview(input, context())

    expect(result.ok).toBe(true)
    if (result.ok === false) return
    expect(result.payload).toMatchObject({
      role: 'student',
      student_number: '26-1-00042',
      program_id: MOCK_IDS.programBscs,
      curriculum_version_id: MOCK_IDS.curriculumBscs2024,
      adviser_id: MOCK_IDS.adviserPrimary,
      entry_year: 2026,

    })
  })

  it.each(['admin', 'dean'] as const)('rejects %s invitations and secondary roles without Admin authority', role => {
    expect(buildDepartmentInvitePreview(values(role), { ...context(), canInvitePrivilegedRoles: false }).ok).toBe(false)
    expect(buildDepartmentInvitePreview({ ...values('adviser'), additional_roles: [role] }, { ...context(), canInvitePrivilegedRoles: false }).ok).toBe(false)
  })

  it('rejects malformed, non-institutional, and self email identities', () => {
    for (const email of ['not-an-email', 'user@vsu.edu.ph.example', 'user@mail.vsu.edu.ph']) {
      const input = values('adviser')
      input.email = email
      const result = buildDepartmentInvitePreview(input, context())
      expect(result.ok).toBe(false)
      if (result.ok === false) expect(result.errors.join(' ')).toContain('@vsu.edu.ph')
    }

    const self = values('department_head')
    self.email = MOCK_PERSONAS.department_staff.email
    const selfResult = buildDepartmentInvitePreview(self, context())
    expect(selfResult.ok).toBe(false)
    if (selfResult.ok === false) expect(selfResult.errors.join(' ')).toContain('own account')
  })

  it('requires canonical student number and matching active program curriculum and adviser', () => {
    const input = values('student')
    input.student_number = '2026-42'
    input.curriculum_version_id = MOCK_IDS.curriculumBscsDraft
    input.adviser_id = 'foreign-or-ineligible-adviser'

    const result = buildDepartmentInvitePreview(input, context())
    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.errors.join(' ')).toContain('YY-N-NNNNN')
      expect(result.errors.join(' ')).toContain('active curriculum version')
      expect(result.errors.join(' ')).toContain('eligible active initial adviser')
    }
  })

  it('rejects foreign department programs and missing approved scope', () => {
    const foreign = values('student')
    const foreignResult = buildDepartmentInvitePreview(foreign, {
      ...context(),
      departmentId: MOCK_IDS.deptDabe,
      facultyId: MOCK_IDS.facultyEngineering,
    })
    expect(foreignResult.ok).toBe(false)
    if (foreignResult.ok === false) expect(foreignResult.errors.join(' ')).toContain('authorized department')

    const noScope = buildDepartmentInvitePreview(values('adviser'), {
      ...context(),
      departmentId: null,
      facultyId: null,
    })
    expect(noScope.ok).toBe(false)
    if (noScope.ok === false) expect(noScope.errors.join(' ')).toContain('approved assignment')
  })

  it('offers Dean and Admin and ignores additional roles for students', () => {
    const input = values('student')
    input.additional_roles = ['admin' as DepartmentInviteFormValues['role']]
    const result = buildDepartmentInvitePreview(input, context())
    expect(result.ok).toBe(true)

    expect(departmentInviteRoles).toContain('dean')
    expect(departmentInviteRoles).toContain('admin')
  })
})
