import { useCallback, useEffect, useState } from 'react'
import { apiClient, unwrapApiResult } from '@/lib/api'
import type { AccountQuery, AccountSummary } from './admin-accounts-model'

interface AccountRequestState {
  readonly key: string
  readonly accounts: AccountSummary[]
  readonly error: string | null
}

export function useAdminAccounts(query: AccountQuery) {
  const [requestState, setRequestState] = useState<AccountRequestState>({
    key: '',
    accounts: [],
    error: null,
  })
  const [reloadCount, setReloadCount] = useState(0)
  const queryKey = JSON.stringify(query)
  const requestKey = `${queryKey}:${reloadCount}`
  const loading = requestState.key !== requestKey

  useEffect(() => {
    let active = true

    void apiClient
      .GET('/functions/v1/accounts', { params: { query } })
      .then(unwrapApiResult)
      .then((accounts) => {
        if (active) {
          setRequestState({ key: requestKey, accounts, error: null })
        }
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setRequestState({
          key: requestKey,
          accounts: [],
          error:
            requestError instanceof Error
              ? requestError.message
              : 'Accounts could not be loaded.',
        })
      })

    return () => {
      active = false
    }
  }, [query, requestKey])

  const reload = useCallback(() => {
    setReloadCount((count) => count + 1)
  }, [])

  return {
    accounts: requestState.key === requestKey ? requestState.accounts : [],
    error: requestState.key === requestKey ? requestState.error : null,
    loading,
    reload,
  }
}
