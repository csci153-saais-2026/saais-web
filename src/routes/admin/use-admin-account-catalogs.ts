import { useCallback, useEffect, useState } from 'react'
import {
  apiClient,
  unwrapApiResult,
  type ApiSchema,
  type OperationQuery,
} from '@/lib/api'
import { getAccountRoles } from './admin-accounts-model'

type FacultyOption = Pick<ApiSchema<'Faculty'>, 'id' | 'name'>
type DepartmentOption = Pick<
  ApiSchema<'Department'>,
  'id' | 'name' | 'faculty_id'
>
type ProgramOption = Pick<
  ApiSchema<'Program'>,
  'id' | 'code' | 'name' | 'department_id'
>
type CurriculumOption = Pick<
  ApiSchema<'CurriculumVersion'>,
  'id' | 'program_id' | 'version_label' | 'status'
>

export interface AdviserOption {
  readonly id: string
  readonly fullName: string
  readonly facultyId: string | null
  readonly departmentId: string | null
}

interface AccountCatalogs {
  readonly faculties: FacultyOption[]
  readonly departments: DepartmentOption[]
  readonly programs: ProgramOption[]
  readonly curricula: CurriculumOption[]
  readonly advisers: AdviserOption[]
}

interface CatalogRequestState {
  readonly key: number
  readonly catalogs: AccountCatalogs
  readonly error: string | null
}

const EMPTY_CATALOGS: AccountCatalogs = {
  faculties: [],
  departments: [],
  programs: [],
  curricula: [],
  advisers: [],
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
      apiClient
        .GET('/rest/v1/program', {
          params: {
            query: {
              select: 'id,code,name,department_id',
              order: 'name.asc',
              limit: 1000,
            },
          },
        })
        .then(unwrapApiResult),
      apiClient
        .GET('/rest/v1/curriculum_version', {
          params: {
            query: {
              select: 'id,program_id,version_label,status',
              order: 'version_label.asc',
              limit: 1000,
            },
          },
        })
        .then(unwrapApiResult),
      apiClient
        .GET('/functions/v1/accounts', {
          params: {
            query: {
              role: 'adviser',
              limit: 1000,
              offset: 0,
            } satisfies OperationQuery<'listAccounts'>,
          },
        })
        .then(unwrapApiResult),
    ])
      .then(([faculties, departments, programs, curricula, accounts]) => {
        if (!active) return
        setRequestState({
          key: reloadCount,
          catalogs: {
            faculties,
            departments,
            programs,
            curricula,
            advisers: accounts
              .filter(
                (account) =>
                  account.profile.status === 'active' &&
                  getAccountRoles(account).includes('adviser'),
              )
              .map((account) => {
                const assignment = account.role_assignments?.find(
                  (roleAssignment) => roleAssignment.role === 'adviser',
                )
                return {
                  id: account.profile.id,
                  fullName: account.profile.full_name,
                  facultyId:
                    assignment?.faculty_id ?? account.profile.faculty_id ?? null,
                  departmentId:
                    assignment?.department_id ??
                    account.profile.department_id ??
                    null,
                }
              }),
          },
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
