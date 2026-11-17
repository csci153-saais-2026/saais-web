import { apiClient, unwrapApiResult, type ApiSchema, type OperationQuery } from '@/lib/api'

export const accountsPageSize = 20
export const accountsMaxOffset = 100_000
const ACCOUNT_LOOKAHEAD_LIMIT = accountsPageSize + 1

export type DepartmentAccount = ApiSchema<'AccountSummary'>

export interface DepartmentAccountsPage {
  accounts: DepartmentAccount[]
  hasNext: boolean
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
