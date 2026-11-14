import { describe, expect, it } from 'vitest'
import {
  ACCOUNT_FETCH_LIMIT,
  ACCOUNT_PAGE_SIZE,
  buildAccountQuery,
  getAccountRoles,
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
})
