import { apiClient, unwrapApiResult, type ApiSchema, type OperationQuery } from '@/lib/api'

export const accountsPageSize = 20
export const accountsMaxOffset = 100_000
const ACCOUNT_LOOKAHEAD_LIMIT = accountsPageSize + 1

export type DepartmentAccount = ApiSchema<'AccountSummary'>

export interface DepartmentAccountsPage {
  accounts: DepartmentAccount[]
  hasNext: boolean
}

type DepartmentAccountsQuery = Pick<OperationQuery<'listAccounts'>, 'department_id'> & {
  limit?: number
  offset: number
}

export async function listDepartmentAccounts(
  query: DepartmentAccountsQuery,
  signal?: AbortSignal,
): Promise<DepartmentAccountsPage> {
  if (!query.department_id) {
    throw new Error('Account directory reads require an authorized department assignment.')
  }
  if (
    !Number.isSafeInteger(query.offset) ||
    query.offset < 0 ||
    query.offset > accountsMaxOffset
  ) {
    throw new RangeError('The requested account page is outside the supported range.')
  }

  const result = await apiClient.GET('/functions/v1/accounts', {
    params: { query: { ...query, limit: ACCOUNT_LOOKAHEAD_LIMIT } },
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
