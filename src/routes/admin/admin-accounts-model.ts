import type {
  ApiSchema,
  OperationQuery,
} from '@/lib/api'

export const ACCOUNT_PAGE_SIZE = 20
export const ACCOUNT_FETCH_LIMIT = ACCOUNT_PAGE_SIZE + 1
export const ALL_ACCOUNTS_FILTER = 'all'

export type AccountRole = ApiSchema<'RoleType'>
export type AccountSummary = ApiSchema<'AccountSummary'>
export type AccountQuery = OperationQuery<'listAccounts'>

export const accountRoles: readonly {
  value: AccountRole
  label: string
}[] = [
  { value: 'student', label: 'Student' },
  { value: 'adviser', label: 'Adviser' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'department_staff', label: 'Department Staff' },
  { value: 'dean', label: 'Dean' },
  { value: 'admin', label: 'System Admin' },
]

export const profileStatuses: readonly {
  value: ApiSchema<'ProfileStatus'>
  label: string
}[] = [
  { value: 'invited', label: 'Invited' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
]

export const invitationStatuses: readonly {
  value: ApiSchema<'InvitationStatus'>
  label: string
}[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'expired', label: 'Expired' },
  { value: 'declined', label: 'Declined' },
  { value: 'revoked', label: 'Revoked' },
]

export interface AccountFilters {
  readonly search: string
  readonly role: AccountRole | typeof ALL_ACCOUNTS_FILTER
  readonly facultyId: string
  readonly departmentId: string
}

export function buildAccountQuery(
  filters: AccountFilters,
  page: number,
): AccountQuery {
  const query: AccountQuery = {
    limit: ACCOUNT_FETCH_LIMIT,
    offset: page * ACCOUNT_PAGE_SIZE,
  }
  const search = filters.search.trim()

  if (search) query.search = search
  if (filters.role !== ALL_ACCOUNTS_FILTER) query.role = filters.role
  if (filters.facultyId !== ALL_ACCOUNTS_FILTER) {
    query.faculty_id = filters.facultyId
  }
  if (filters.departmentId !== ALL_ACCOUNTS_FILTER) {
    query.department_id = filters.departmentId
  }

  return query
}

export function getAccountRoles(account: AccountSummary): AccountRole[] {
  return Array.from(
    new Set([
      account.profile.role,
      ...(account.role_assignments ?? []).map((assignment) => assignment.role),
      ...(account.profile.roles ?? []),
    ]),
  )
}

export function getAccountRoleLabel(role: AccountRole): string {
  return accountRoles.find((option) => option.value === role)?.label ?? role
}

export function validateAccountIdentity(
  fullName: string,
  email: string,
): { fullName: string | null; email: string | null } {
  const name = fullName.trim()
  const normalizedEmail = email.trim()
  return {
    fullName:
      name.length === 0
        ? 'Enter the account holder’s full name.'
        : name.length > 150
          ? 'Full name must be 150 characters or fewer.'
          : null,
    email:
      normalizedEmail.length === 0
        ? 'Enter a VSU email address.'
        : normalizedEmail.length > 254 ||
            !/^[^\s@]+@vsu\.edu\.ph$/i.test(normalizedEmail)
          ? 'Use an institutional email ending in @vsu.edu.ph.'
          : null,
  }
}
