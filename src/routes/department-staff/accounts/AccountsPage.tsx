import { useSearchParams } from 'react-router'
import { DataTablePanel, type Column } from '@/components/features/data-table-panel'
import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDepartmentAccounts } from '@/hooks/use-department-accounts'
import { ApiClientError, type ApiSchema } from '@/lib/api'
import { useStaffScope } from '../shared/use-staff-scope'
import { accountsMaxOffset, accountsPageSize, type DepartmentAccount } from './accounts.api'

const roleLabels: Record<ApiSchema<'RoleType'>, string> = {
  student: 'Student',
  adviser: 'Adviser',
  department_staff: 'Department Staff',
  department_head: 'Department Head',
  dean: 'Dean',
  admin: 'Admin',
}

const columns: Column<DepartmentAccount>[] = [
  {
    header: 'Name',
    cell: account => <span className="font-medium text-foreground">{account.profile.full_name || 'Name unavailable'}</span>,
  },
  {
    header: 'Institutional email',
    cell: account => account.profile.email || 'Email unavailable',
  },
  {
    header: 'Status',
    cell: account => <Badge variant={account.profile.status === 'active' ? 'secondary' : account.profile.status === 'disabled' ? 'destructive' : 'outline'}>
      {account.profile.status === 'active' ? 'Active' : account.profile.status === 'disabled' ? 'Disabled' : account.profile.status === 'invited' ? 'Invited' : 'Status unavailable'}
    </Badge>,
  },
  {
    header: 'Roles',
    className: 'min-w-48 whitespace-normal',
    cell: account => {
      const roles = [...new Set([
        ...(account.role_assignments ?? []).map(assignment => assignment.role),
        ...(account.profile.roles?.length ? account.profile.roles : [account.profile.role]),
      ])]
      return roles.length ? (
        <div className="flex flex-wrap gap-1.5" aria-label={`Roles for ${account.profile.full_name || 'account'}`}>
          {roles.map((role, index) => <Badge key={`${role}-${index}`} variant="outline">{roleLabels[role] ?? role}</Badge>)}
        </div>
      ) : <span>No roles assigned</span>
    },
  },
]

function parseOffset(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 0
  const offset = Number(value)
  if (!Number.isSafeInteger(offset)) return 0
  return Math.min(Math.floor(offset / accountsPageSize) * accountsPageSize, accountsMaxOffset)
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'Your account is not permitted to view accounts in this department.'
    if (error.isAuthError) return 'Your session could not be verified. Sign in again and retry.'
    if (error.isNetworkError) return 'Could not reach the account directory. Check your connection and retry.'
    return error.message
  }
  return error instanceof Error ? error.message : 'The account directory could not be loaded.'
}

export default function AccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const scope = useStaffScope()
  const offset = parseOffset(searchParams.get('offset'))
  const accounts = useDepartmentAccounts(offset)

  function updateOffset(nextOffset: number) {
    const next = new URLSearchParams(searchParams)
    if (nextOffset <= 0) next.delete('offset')
    else next.set('offset', String(nextOffset))
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="-mt-6 space-y-5 md:-mt-(--content-pad-top)">
      <PageHeading title="Accounts and roles" subtitle="Read-only account directory for your authorized department." />

      {scope.status !== 'ready' && (
        <Panel title="Accounts and roles">
          <p role="alert" className="p-5 text-sm text-destructive">A resolved Department Staff assignment is required to view this directory.</p>
        </Panel>
      )}

      {scope.status === 'ready' && accounts.isPending && (
        <Panel title="Department accounts" description="Names, institutional email, status, and assigned roles.">
          <p role="status" className="p-6 text-sm text-muted-foreground">Loading department accounts...</p>
        </Panel>
      )}

      {scope.status === 'ready' && accounts.isError && (
        <Panel title="Department accounts" description="Names, institutional email, status, and assigned roles.">
          <div className="space-y-4 p-6">
            <p role="alert" className="text-sm text-destructive">{errorMessage(accounts.error)}</p>
            <Button type="button" variant="outline" onClick={() => { void accounts.refetch() }} disabled={accounts.isFetching}>
              {accounts.isFetching ? 'Retrying...' : 'Retry'}
            </Button>
          </div>
        </Panel>
      )}

      {scope.status === 'ready' && accounts.isSuccess && (
        <DataTablePanel
          title="Department accounts"
          description="Read-only directory. Account status and role assignments are managed by authorized account owners."
          columns={columns}
          rows={accounts.data.accounts}
          rowKey={account => account.profile.id}
          empty="No accounts are listed for this department."
          footer={(
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {accounts.data.accounts.length
                  ? `Showing ${offset + 1}-${offset + accounts.data.accounts.length}`
                  : `No accounts on page ${offset / accountsPageSize + 1}`}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => updateOffset(offset - accountsPageSize)} disabled={offset === 0 || accounts.isFetching}>Previous</Button>
                <Button type="button" variant="outline" onClick={() => updateOffset(offset + accountsPageSize)} disabled={!accounts.data.hasNext || accounts.isFetching}>Next</Button>
              </div>
            </div>
          )}
        />
      )}
    </div>
  )
}
