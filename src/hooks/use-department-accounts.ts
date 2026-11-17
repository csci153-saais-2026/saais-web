import { useQuery } from '@tanstack/react-query'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import { listDepartmentAccounts } from '@/routes/department-staff/accounts/accounts.api'

export function useDepartmentAccounts(offset: number) {
  const scope = useStaffScope()
  const activeScope = scope.status === 'ready' ? scope : null

  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? '',
      activeScope?.departmentId ?? '',
      'accounts',
      { offset },
    ),
    queryFn: ({ signal }) => {
      if (!activeScope) {
        throw new Error('Account directory requests require an authorized Department Staff assignment.')
      }
      return listDepartmentAccounts({ department_id: activeScope.departmentId, offset }, signal)
    },
    enabled: activeScope !== null,
    retry: false,
  })
}
