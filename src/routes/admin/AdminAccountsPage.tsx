import { useMemo, useState } from 'react'
import { FormField } from '@/components/features/form-field'
import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { SearchInput } from '@/components/features/search-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ApiSchema } from '@/lib/api'
import {
  ACCOUNT_PAGE_SIZE,
  ALL_ACCOUNTS_FILTER,
  accountRoles,
  buildAccountQuery,
  getAccountRoleLabel,
  getAccountRoles,
  type AccountRole,
} from './admin-accounts-model'
import { useAdminAccountCatalogs } from './use-admin-account-catalogs'
import { useAdminAccounts } from './use-admin-accounts'

type Faculty = ApiSchema<'Faculty'>
type Department = ApiSchema<'Department'>
type Account = ApiSchema<'AccountSummary'>

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <FormField label={label} htmlFor={id}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full" disabled={disabled}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </FormField>
  )
}

function getOrganization(
  account: Account,
  departmentsById: ReadonlyMap<string, Department>,
  facultiesById: ReadonlyMap<string, Faculty>,
): string {
  const profile = account.profile
  const assignment = account.role_assignments?.find(
    (roleAssignment) => roleAssignment.role === profile.role,
  )
  const departmentId =
    account.student_organization?.department_id ??
    assignment?.department_id ??
    profile.department_id
  const department = departmentId
    ? departmentsById.get(departmentId)
    : undefined
  const facultyId =
    account.student_organization?.faculty_id ??
    assignment?.faculty_id ??
    profile.faculty_id ??
    department?.faculty_id
  const faculty = facultyId ? facultiesById.get(facultyId) : undefined

  return [faculty?.name, department?.name].filter(Boolean).join(' / ') || '—'
}

function getInvitationStatusLabel(
  status: ApiSchema<'InvitationStatus'> | null | undefined,
): string {
  if (!status) return '—'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function AdminAccountsPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<AccountRole | typeof ALL_ACCOUNTS_FILTER>(
    ALL_ACCOUNTS_FILTER,
  )
  const [facultyId, setFacultyId] = useState(ALL_ACCOUNTS_FILTER)
  const [departmentId, setDepartmentId] = useState(ALL_ACCOUNTS_FILTER)
  const [page, setPage] = useState(0)
  const query = useMemo(
    () => buildAccountQuery({ search, role, facultyId, departmentId }, page),
    [search, role, facultyId, departmentId, page],
  )
  const {
    accounts,
    error: accountsError,
    loading: accountsLoading,
    reload: reloadAccounts,
  } = useAdminAccounts(query)
  const {
    faculties,
    departments,
    error: catalogsError,
    loading: catalogsLoading,
    reload: reloadCatalogs,
  } = useAdminAccountCatalogs()
  const facultiesById = useMemo(
    () => new Map(faculties.map((faculty) => [faculty.id, faculty])),
    [faculties],
  )
  const departmentsById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments],
  )
  const visibleDepartments = departments.filter(
    (department) =>
      facultyId === ALL_ACCOUNTS_FILTER ||
      department.faculty_id === facultyId,
  )
  const visibleAccounts = accounts.slice(0, ACCOUNT_PAGE_SIZE)
  const hasNextPage = accounts.length > ACCOUNT_PAGE_SIZE

  function resetPageAnd<T>(setter: (value: T) => void, value: T) {
    setPage(0)
    setter(value)
  }

  function changeFaculty(value: string) {
    setPage(0)
    setFacultyId(value)
    setDepartmentId(ALL_ACCOUNTS_FILTER)
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-2 p-4 sm:p-8">
      <PageHeading
        title="Accounts and roles"
        subtitle="Manage institution-wide accounts, role assignments, and invitations."
      />

      {catalogsError && (
        <div
          role="alert"
          className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-card px-4 py-3"
        >
          <span>{catalogsError}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reloadCatalogs}
          >
            Retry organization options
          </Button>
        </div>
      )}
      {accountsError && (
        <div
          role="alert"
          className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-card px-4 py-3"
        >
          <span>{accountsError}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reloadAccounts}
          >
            Retry
          </Button>
        </div>
      )}

      <Panel
        title="Directory filters"
        description="Search by account name, email, or student number and narrow the institution-wide directory."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FormField label="Search accounts" htmlFor="account-search">
            <SearchInput
              id="account-search"
              aria-label="Search accounts"
              value={search}
              placeholder="Name, email, or student number"
              maxLength={150}
              onChange={(event) =>
                resetPageAnd(setSearch, event.currentTarget.value)
              }
            />
          </FormField>
          <FilterSelect
            id="account-role-filter"
            label="Role"
            value={role}
            onChange={(value) =>
              resetPageAnd(
                setRole,
                value === ALL_ACCOUNTS_FILTER
                  ? ALL_ACCOUNTS_FILTER
                  : (value as AccountRole),
              )
            }
          >
            <SelectItem value={ALL_ACCOUNTS_FILTER}>All roles</SelectItem>
            {accountRoles.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect
            id="account-faculty-filter"
            label="Faculty"
            value={facultyId}
            disabled={catalogsLoading || Boolean(catalogsError)}
            onChange={changeFaculty}
          >
            <SelectItem value={ALL_ACCOUNTS_FILTER}>All faculties</SelectItem>
            {faculties.map((faculty) => (
              <SelectItem key={faculty.id} value={faculty.id}>
                {faculty.name}
              </SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect
            id="account-department-filter"
            label="Department"
            value={departmentId}
            disabled={catalogsLoading || Boolean(catalogsError)}
            onChange={(value) => resetPageAnd(setDepartmentId, value)}
          >
            <SelectItem value={ALL_ACCOUNTS_FILTER}>All departments</SelectItem>
            {visibleDepartments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </FilterSelect>
        </div>
      </Panel>

      <Panel
        title="Accounts"
        description={
          accountsLoading
            ? 'Loading institution-wide account records.'
            : `${visibleAccounts.length} account${visibleAccounts.length === 1 ? '' : 's'} shown on this page.`
        }
        flush
      >
        <Table responsive>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>VSU email</TableHead>
              <TableHead>Faculty / department</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Account status</TableHead>
              <TableHead>Invitation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accountsLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-5 py-8 text-center text-muted-foreground"
                >
                  Loading accounts…
                </TableCell>
              </TableRow>
            ) : accountsError ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-5 py-8 text-center text-muted-foreground"
                >
                  Account records are unavailable until the request succeeds.
                </TableCell>
              </TableRow>
            ) : visibleAccounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-5 py-8 text-center text-muted-foreground"
                >
                  No accounts match these search and filter values.
                </TableCell>
              </TableRow>
            ) : (
              visibleAccounts.map((account) => {
                const profile = account.profile
                const roles = getAccountRoles(account)
                return (
                  <TableRow key={profile.id}>
                    <TableCell label="Name" className="whitespace-normal">
                      <span className="font-medium">{profile.full_name}</span>
                      {profile.student_number && (
                        <span className="block font-mono text-xs text-muted-foreground">
                          {profile.student_number}
                        </span>
                      )}
                    </TableCell>
                    <TableCell label="VSU email" className="whitespace-normal">
                      {profile.email}
                    </TableCell>
                    <TableCell
                      label="Faculty / department"
                      className="whitespace-normal"
                    >
                      {getOrganization(
                        account,
                        departmentsById,
                        facultiesById,
                      )}
                    </TableCell>
                    <TableCell label="Roles" className="whitespace-normal">
                      <div className="flex flex-wrap gap-1">
                        {roles.map((accountRole) => (
                          <Badge
                            key={accountRole}
                            variant="secondary"
                            aria-label={getAccountRoleLabel(accountRole)}
                          >
                            {getAccountRoleLabel(accountRole)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell label="Account status">
                      <StatusBadge status={profile.status} />
                    </TableCell>
                    <TableCell label="Invitation">
                      <span className="text-sm">
                        {getInvitationStatusLabel(profile.invitation_status)}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-3">
          <span className="text-xs text-muted-foreground">
            Page {page + 1} · results are loaded in bounded pages
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page === 0 || accountsLoading}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasNextPage || accountsLoading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Panel>
    </main>
  )
}
