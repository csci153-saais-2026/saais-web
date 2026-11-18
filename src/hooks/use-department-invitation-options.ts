import { useQuery } from '@tanstack/react-query'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import { listDepartmentInvitationOptions } from '@/routes/department-staff/accounts/invitation.api'

export function useDepartmentInvitationOptions() {
  const scope = useStaffScope()
  const activeScope = scope.status === 'ready' ? scope : null

  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? '',
      activeScope?.departmentId ?? '',
      'department-invitation-options',
    ),
    queryFn: ({ signal }) => {
      if (!activeScope) throw new Error('Invitation references require an authorized Department Staff assignment.')
      return listDepartmentInvitationOptions(activeScope.departmentId, signal)
    },
    enabled: activeScope !== null,
    retry: false,
  })
}
