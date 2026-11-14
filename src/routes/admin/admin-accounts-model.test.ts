import { describe, expect, it } from 'vitest'
import {
  ACCOUNT_FETCH_LIMIT,
  ACCOUNT_PAGE_SIZE,
  buildAccountInviteRequest,
  buildAccountQuery,
  getAccountRoles,
  validateAccountInvite,
  type AccountInviteValues,
  validateAccountIdentity,
  type AccountSummary,
} from './admin-accounts-model'

const account: AccountSummary = {
  profile: {
    id: 'profile-1',
    role: 'adviser',
    roles: ['adviser', 'department_head'],
    email: 'alex@vsu.edu.ph',
    full_name: 'Alex Adviser',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  role_assignments: [
    {
      id: 'role-1',
      profile_id: 'profile-1',
      role: 'adviser',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'role-2',
      profile_id: 'profile-1',
      role: 'department_head',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  student_organization: null,
}

const studentInvite: AccountInviteValues = {
  fullName: 'New Student',
  email: 'new.student@vsu.edu.ph',
  primaryRole: 'student',
  additionalRoles: [],
  facultyId: '',
  departmentId: '',
  studentNumber: '26-1-00001',
  programId: 'program-1',
  curriculumVersionId: 'curriculum-1',
  adviserId: 'adviser-1',
  entryYear: '2026',
}

const departments = [
  { id: 'department-1', faculty_id: 'faculty-1' },
  { id: 'department-2', faculty_id: 'faculty-2' },
]
const programs = [{ id: 'program-1', department_id: 'department-1' }]
const curricula = [
  {
    id: 'curriculum-1',
    program_id: 'program-1',
    status: 'active',
  },
]
const advisers = [
  { id: 'adviser-1', department_id: 'department-1' },
]

describe('admin accounts model', () => {
  it('builds a bounded list query and omits unset filters', () => {
    expect(
      buildAccountQuery(
        {
          search: '  Alex  ',
          role: 'all',
          facultyId: 'all',
          departmentId: 'all',
        },
        2,
      ),
    ).toEqual({
      limit: ACCOUNT_FETCH_LIMIT,
      offset: 2 * ACCOUNT_PAGE_SIZE,
      search: 'Alex',
    })
  })

  it('includes selected role and organization filters', () => {
    expect(
      buildAccountQuery(
        {
          search: '',
          role: 'adviser',
          facultyId: 'faculty-1',
          departmentId: 'department-1',
        },
        0,
      ),
    ).toEqual({
      limit: ACCOUNT_FETCH_LIMIT,
      offset: 0,
      role: 'adviser',
      faculty_id: 'faculty-1',
      department_id: 'department-1',
    })
  })

  it('returns unique roles including the primary role', () => {
    expect(getAccountRoles(account)).toEqual(['adviser', 'department_head'])
  })

  it('validates trimmed identity and institutional email', () => {
    expect(validateAccountIdentity('  Alex Adviser ', ' alex@vsu.edu.ph ')).toEqual({
      fullName: null,
      email: null,
    })
    expect(validateAccountIdentity(' ', 'alex@example.com')).toEqual({
      fullName: 'Enter the account holder’s full name.',
      email: 'Use an institutional email ending in @vsu.edu.ph.',
    })
    expect(validateAccountIdentity('x'.repeat(151), 'alex@vsu.edu.ph')).toEqual({
      fullName: 'Full name must be 150 characters or fewer.',
      email: null,
    })
  })

  it('builds a student invitation with required academic assignments', () => {
    expect(buildAccountInviteRequest(studentInvite)).toEqual({
      email: 'new.student@vsu.edu.ph',
      full_name: 'New Student',
      role: 'student',
      student_number: '26-1-00001',
      program_id: 'program-1',
      curriculum_version_id: 'curriculum-1',
      adviser_id: 'adviser-1',
      entry_year: 2026,
    })
  })

  it('builds role assignments with their selected organization', () => {
    expect(
      buildAccountInviteRequest({
        ...studentInvite,
        primaryRole: 'admin',
        additionalRoles: ['department_head'],
        facultyId: 'faculty-1',
        departmentId: 'department-1',
      }),
    ).toEqual({
      email: 'new.student@vsu.edu.ph',
      full_name: 'New Student',
      role: 'admin',
      role_assignments: [
        {
          role: 'department_head',
          faculty_id: 'faculty-1',
          department_id: 'department-1',
        },
      ],
    })
  })

  it('validates self-assignment and required student fields', () => {
    expect(
      validateAccountInvite(
        { ...studentInvite, email: 'self@vsu.edu.ph', programId: '' },
        'self@vsu.edu.ph',
        departments,
        programs,
        curricula,
        advisers,
      ),
    ).toEqual({
      email: 'You cannot assign roles to your own account.',
      programId: 'Select a program.',
      curriculumVersionId:
        'Select a curriculum version for the chosen program.',
    })
  })

  it('rejects mismatched curriculum, adviser, and role organization', () => {
    expect(
      validateAccountInvite(
        {
          ...studentInvite,
          additionalRoles: ['department_head'],
          facultyId: 'faculty-2',
          departmentId: 'department-1',
          curriculumVersionId: 'wrong-curriculum',
          adviserId: 'adviser-2',
        },
        '',
        departments,
        programs,
        curricula,
        advisers,
      ),
    ).toMatchObject({
      departmentId: 'Choose a department in the selected faculty.',
      curriculumVersionId: 'Select an active curriculum.',
      adviserId: 'Select an active eligible adviser.',
    })
  })
})
