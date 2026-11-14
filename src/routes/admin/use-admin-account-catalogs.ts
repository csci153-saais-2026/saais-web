import { useCallback, useEffect, useState } from 'react'
import { apiClient, unwrapApiResult, type ApiSchema } from '@/lib/api'

type FacultyOption = Pick<ApiSchema<'Faculty'>, 'id' | 'name'>
type DepartmentOption = Pick<
  ApiSchema<'Department'>,
  'id' | 'name' | 'faculty_id'
>

interface AccountCatalogs {
  readonly faculties: FacultyOption[]
  readonly departments: DepartmentOption[]
}

interface CatalogRequestState {
  readonly key: number
  readonly catalogs: AccountCatalogs
  readonly error: string | null
}

const EMPTY_CATALOGS: AccountCatalogs = {
  faculties: [],
  departments: [],
}

export function useAdminAccountCatalogs() {
  const [reloadCount, setReloadCount] = useState(0)
  const [requestState, setRequestState] = useState<CatalogRequestState>({
    key: -1,
    catalogs: EMPTY_CATALOGS,
    error: null,
  })

  useEffect(() => {
    let active = true
    void Promise.all([
      apiClient
        .GET('/rest/v1/faculty', {
          params: {
            query: { select: 'id,name', order: 'name.asc', limit: 1000 },
          },
        })
        .then(unwrapApiResult),
      apiClient
        .GET('/rest/v1/department', {
          params: {
            query: {
              select: 'id,name,faculty_id',
              order: 'name.asc',
              limit: 1000,
            },
          },
        })
        .then(unwrapApiResult),
    ])
      .then(([faculties, departments]) => {
        if (!active) return
        setRequestState({
          key: reloadCount,
          catalogs: { faculties, departments },
          error: null,
        })
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setRequestState({
          key: reloadCount,
          catalogs: EMPTY_CATALOGS,
          error:
            requestError instanceof Error
              ? requestError.message
              : 'Faculty and department options could not be loaded.',
        })
      })

    return () => {
      active = false
    }
  }, [reloadCount])

  const reload = useCallback(() => {
    setReloadCount((count) => count + 1)
  }, [])

  return {
    ...requestState.catalogs,
    error: requestState.key === reloadCount ? requestState.error : null,
    loading: requestState.key !== reloadCount,
    reload,
  }
}
