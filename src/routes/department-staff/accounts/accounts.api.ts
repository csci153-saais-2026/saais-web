import { apiClient, unwrapApiResult, type ApiSchema, type OperationQuery } from '@/lib/api'

export const accountsPageSize = 20
export const accountsMaxOffset = 100_000
const ACCOUNT_LOOKAHEAD_LIMIT = accountsPageSize + 1

export type DepartmentAccount = ApiSchema<'AccountSummary'>

const staffResendRoles = new Set<ApiSchema<'RoleType'>>([
  'student',
  'adviser',
  'department_staff',
  'department_head',
])
const resendableInvitationStates = new Set(['pending', 'expired', 'revoked', 'declined'])

/** Eligibility is derived only from the token-free account lifecycle fields returned by the server. */
export function canResendDepartmentInvitation(
  account: DepartmentAccount,
  actingProfileId: string,
): boolean {
  const { profile } = account
  const invitationStatus = profile.invitation_status
  const roles = [...new Set([
    ...(account.role_assignments ?? []).map(assignment => assignment.role),
    ...(profile.roles?.length ? profile.roles : [profile.role]),
  ])]
  return profile.id !== actingProfileId
    && profile.status === 'invited'
    && invitationStatus !== null
    && invitationStatus !== undefined
    && resendableInvitationStates.has(invitationStatus)
    && roles.length > 0
    && roles.every(role => staffResendRoles.has(role))
}

/** Revocation is narrower than resend: only a pending invited account in the active department qualifies. */
export function canRevokeDepartmentInvitation(
  account: DepartmentAccount,
  actingProfileId: string,
  departmentId: string,
): boolean {
  const { profile } = account
  const roles = [...new Set([
    ...(account.role_assignments ?? []).map(assignment => assignment.role),
    ...(profile.roles?.length ? profile.roles : [profile.role]),
  ])]
  const inDepartment = profile.department_id === departmentId
    || account.role_assignments?.some(assignment => assignment.department_id === departmentId) === true
    || account.student_organization?.department_id === departmentId

  return Boolean(departmentId)
    && profile.id !== actingProfileId
    && inDepartment
    && profile.status === 'invited'
    && profile.invitation_status === 'pending'
    && roles.length > 0
    && roles.every(role => staffResendRoles.has(role))
}

export interface DepartmentAccountsPage {
  accounts: DepartmentAccount[]
  hasNext: boolean
}

export async function resendDepartmentAccountInvitation(
  profileId: string,
): Promise<ApiSchema<'ResendInviteResponse'>> {
  const result = await apiClient.POST('/functions/v1/accounts/{profile_id}/resend-invite', {
    params: { path: { profile_id: profileId } },
  })
  return unwrapApiResult<ApiSchema<'ResendInviteResponse'>>(result)
}

export async function revokeDepartmentAccountInvitation(
  profileId: string,
): Promise<ApiSchema<'Profile'>> {
  const result = await apiClient.POST('/functions/v1/accounts/{profile_id}/revoke-invite', {
    params: { path: { profile_id: profileId } },
  })
  return unwrapApiResult<ApiSchema<'Profile'>>(result)
}

export type DepartmentAccountsFilters = Pick<
  OperationQuery<'listAccounts'>,
  'search' | 'role'
> & {
  offset: number
}

type DepartmentAccountsQuery = Pick<
  OperationQuery<'listAccounts'>,
  'department_id' | 'faculty_id' | 'search' | 'role'
> & Pick<OperationQuery<'listAccounts'>, 'limit' | 'offset'>

export async function listDepartmentAccounts(
  scope: Pick<OperationQuery<'listAccounts'>, 'department_id' | 'faculty_id'>,
  filters: DepartmentAccountsFilters,
  signal?: AbortSignal,
): Promise<DepartmentAccountsPage> {
  if (!scope.department_id) {
    throw new Error('Account directory reads require an authorized department assignment.')
  }
  if (
    !Number.isSafeInteger(filters.offset) ||
    filters.offset < 0 ||
    filters.offset > accountsMaxOffset
  ) {
    throw new RangeError('The requested account page is outside the supported range.')
  }
  const search = filters.search?.trim()
  if (search && search.length > 150) {
    throw new TypeError('Account search must be 150 characters or fewer.')
  }

  const query: DepartmentAccountsQuery = {
    department_id: scope.department_id,
    limit: ACCOUNT_LOOKAHEAD_LIMIT,
    offset: filters.offset,
    ...(scope.faculty_id ? { faculty_id: scope.faculty_id } : {}),
    ...(search ? { search } : {}),
    ...(filters.role ? { role: filters.role } : {}),
  }

  const result = await apiClient.GET('/functions/v1/accounts', {
    params: { query },
    signal,
  })
  const accounts = unwrapApiResult<DepartmentAccount[]>(result)
  if (!Array.isArray(accounts)) {
    throw new Error('The account directory returned invalid data.')
  }
  if (accounts.length > ACCOUNT_LOOKAHEAD_LIMIT) {
    throw new Error('The account directory exceeded its bounded page size.')
  }

  return {
    accounts: accounts.slice(0, accountsPageSize),
    hasNext: accounts.length > accountsPageSize,
  }
}
