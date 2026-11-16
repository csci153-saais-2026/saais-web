import { Panel } from '@/components/features/panel'
import {
  useStaffScope,
} from './shared/use-staff-scope'
import { StaffScopeProvider } from './shared/staff-scope-provider'

function DepartmentStaffContent() {
  const scope = useStaffScope()

  return (
    <div className="space-y-6">
      <Panel
        title="Department Staff Operations"
        description="Department student records, term encoding closures, and adviser assignments."
      >
        <div className="p-6 text-sm text-muted-foreground border rounded-md bg-muted/20">
          {scope.status === 'loading' && (
            <p role="status">Loading your authorized department scope…</p>
          )}
          {scope.status === 'clearing' && (
            <p role="status">Switching department scope…</p>
          )}
          {scope.status === 'unavailable' && (
            <p role="alert">
              {scope.reason === 'unauthenticated'
                ? 'Sign in to access Department Staff operations.'
                : scope.reason === 'role-not-assigned'
                  ? 'A Department Staff role assignment is required to continue.'
                  : 'No department scope is assigned to your Department Staff role.'}
            </p>
          )}
          {scope.status === 'select-department' && (
            <label className="flex max-w-md flex-col gap-2 text-foreground">
              Choose an authorized department
              <select
                value={scope.selectedDepartmentId ?? ''}
                onChange={(event) => scope.selectDepartment(event.target.value)}
                className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="" disabled>
                  Select a department
                </option>
                {scope.departmentIds.map((departmentId) => (
                  <option key={departmentId} value={departmentId}>
                    Department {departmentId}
                  </option>
                ))}
              </select>
            </label>
          )}
          {scope.status === 'ready' && (
            <>
              {scope.departmentIds.length > 1 && (
                <label className="flex max-w-md flex-col gap-2 text-foreground">
                  Active department
                  <select
                    value={scope.selectedDepartmentId}
                    onChange={(event) =>
                      scope.selectDepartment(event.target.value)
                    }
                    className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {scope.departmentIds.map((departmentId) => (
                      <option key={departmentId} value={departmentId}>
                        Department {departmentId}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="mt-2">
                Staff requests are scoped to department {scope.departmentId}.
              </p>
            </>
          )}
        </div>
      </Panel>
    </div>
  )
}

export default function DepartmentStaffPortal() {
  return (
    <StaffScopeProvider>
      <DepartmentStaffContent />
    </StaffScopeProvider>
  )
}

