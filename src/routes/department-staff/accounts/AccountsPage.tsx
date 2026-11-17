import { useSearchParams } from 'react-router'
import { DataTablePanel, type Column } from '@/components/features/data-table-panel'
import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/features/form-field'
import { SearchInput } from '@/components/features/search-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDepartmentAccounts } from '@/hooks/use-department-accounts'
import { ApiClientError, type ApiSchema } from '@/lib/api'
import { useStaffScope } from '../shared/use-staff-scope'
import { accountsMaxOffset, accountsPageSize, canResendDepartmentInvitation, type DepartmentAccount } from './accounts.api'
import { useResendDepartmentInvitation } from '@/hooks/use-resend-department-invitation'
import InviteAccountDialog from './InviteAccountDialog'

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

function resendFailureMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isConflict) return `${error.message} Account status was refreshed; resend only if the server still shows an eligible invitation.`
    if (error.isRateLimited) {
      return error.retryAfterSeconds === null
        ? 'The server is rate limiting invitation resends. Wait before trying again.'
        : `The server is rate limiting invitation resends. Try again in ${error.retryAfterSeconds} seconds.`
    }
    if (error.isForbidden) return error.message
    if (error.isNetworkError) return 'The resend result is uncertain. Account status was refreshed; check it before trying again.'
    return error.message
  }
  return error instanceof Error ? error.message : 'The invitation could not be resent.'
}

function InvitationActions({ account, actingProfileId }: { account: DepartmentAccount; actingProfileId: string }) {
  const resend = useResendDepartmentInvitation()
  if (!canResendDepartmentInvitation(account, actingProfileId)) {
    return <span className="text-muted-foreground">No resend action</span>
  }

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant="outline"
        disabled={resend.isPending || resend.isSuccess}
        onClick={() => resend.mutate(account.profile.id)}
      >
        {resend.isPending ? 'Resending…' : resend.isSuccess ? 'Invitation resent' : 'Resend invitation'}
      </Button>
      {resend.isSuccess && (
        <p role="status" className="max-w-56 text-xs text-muted-foreground">
          {resend.data.message} Expires {new Date(resend.data.invitation_expires_at).toLocaleString()}.
        </p>
      )}
      {resend.isError && <p role="alert" className="max-w-56 text-xs text-destructive">{resendFailureMessage(resend.error)}</p>}
    </div>
  )
}

function parseOffset(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 0
  const offset = Number(value)
  if (!Number.isSafeInteger(offset)) return 0
  return Math.min(Math.floor(offset / accountsPageSize) * accountsPageSize, accountsMaxOffset)
}

function parseRole(value: string | null): ApiSchema<'RoleType'> | '' {
  return value && Object.hasOwn(roleLabels, value)
    ? value as ApiSchema<'RoleType'>
    : ''
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
  const search = searchParams.get('q') ?? ''
  const role = parseRole(searchParams.get('role'))
  const offset = parseOffset(searchParams.get('offset'))
  const accounts = useDepartmentAccounts({ search, role: role || undefined, offset })
  const accountColumns = scope.status === 'ready'
    ? [...columns, {
      header: 'Invitation',
      className: 'min-w-52',
      cell: (account: DepartmentAccount) => (
        <div className="space-y-1">
          <span className="capitalize">{account.profile.invitation_status ?? 'Unavailable'}</span>
          {account.profile.invitation_expires_at && <p className="text-xs text-muted-foreground">Expires {new Date(account.profile.invitation_expires_at).toLocaleDateString()}</p>}
        </div>
      ),
    }, {
      header: 'Actions',
      className: 'min-w-52',
      cell: (account: DepartmentAccount) => <InvitationActions account={account} actingProfileId={scope.profileId} />,
    } satisfies Column<DepartmentAccount>]
    : columns

  function updateFilters(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    next.delete('offset')
    setSearchParams(next, { replace: true })
  }

  function updateOffset(nextOffset: number) {
    const next = new URLSearchParams(searchParams)
    if (nextOffset <= 0) next.delete('offset')
    else next.set('offset', String(Math.min(nextOffset, accountsMaxOffset)))
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="-mt-6 space-y-5 md:-mt-(--content-pad-top)">
      <PageHeading
        title="Accounts and roles"
        subtitle="Read-only account directory for your authorized department."
        actions={scope.status === 'ready' ? <InviteAccountDialog /> : undefined}
      />

      {scope.status === 'ready' && (
        <Panel title="Find accounts" description="Organization scope is fixed to your approved Department Staff assignment.">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <FormField label="Search accounts" htmlFor="accounts-search" hint="Search by name or institutional email.">
              <SearchInput
                id="accounts-search"
                value={search}
                maxLength={150}
                placeholder="Search accounts"
                onChange={event => updateFilters({ q: event.target.value })}
              />
            </FormField>
            <FormField label="Role" htmlFor="accounts-role">
              <Select value={role || 'all'} onValueChange={value => updateFilters({ role: value === 'all' ? '' : value })}>
                <SelectTrigger id="accounts-role" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </Panel>
      )}

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
          columns={accountColumns}
          rows={accounts.data.accounts}
          rowKey={account => account.profile.id}
          empty={search || role ? 'No accounts match the current search and role filters.' : 'No accounts are listed for this department.'}
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
