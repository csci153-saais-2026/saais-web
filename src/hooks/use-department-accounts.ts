import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import {
  listDepartmentAccounts,
  type DepartmentAccountsFilters,
} from '@/routes/department-staff/accounts/accounts.api'

export function useDepartmentAccounts(filters: DepartmentAccountsFilters) {
  const scope = useStaffScope()
  const { roleAssignments } = useAuth()
  const activeScope = scope.status === 'ready' ? scope : null
  const assignedFacultyId = activeScope
    ? roleAssignments.find(assignment =>
      assignment.profile_id === activeScope.profileId
      && assignment.role === 'department_staff'
      && assignment.department_id === activeScope.departmentId,
    )?.faculty_id ?? undefined
    : undefined

  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? '',
      activeScope?.departmentId ?? '',
      'accounts',
      {
        search: filters.search ?? '',
        role: filters.role ?? '',
        offset: filters.offset,
        facultyId: assignedFacultyId ?? '',
      },
    ),
    queryFn: ({ signal }) => {
      if (!activeScope) {
        throw new Error('Account directory requests require an authorized Department Staff assignment.')
      }
      return listDepartmentAccounts(
        { department_id: activeScope.departmentId, faculty_id: assignedFacultyId },
        filters,
        signal,
      )
    },
    enabled: activeScope !== null,
    retry: false,
  })
}
