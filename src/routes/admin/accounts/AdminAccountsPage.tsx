import { notify } from "@/lib/notify";
import { useMemo, useState } from "react";
import { FormField } from "@/components/features/form-field";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { SearchInput } from "@/components/features/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisIcon, PlusIcon } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { type ApiSchema } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ACCOUNT_PAGE_SIZE,
  ALL_ACCOUNTS_FILTER,
  accountRoles,
  buildAccountQuery,
  getAccountRoleLabel,
  getAccountRoles,
  type AccountRole,
} from "./admin-accounts-model";
import { useAdminAccountCatalogs } from "./use-admin-account-catalogs";
import { useAdminAccounts } from "./use-admin-accounts";
import { useAdminAccountMutations } from "./use-admin-account-mutations";
import { AdminAccountEditDialog } from "./AdminAccountEditDialog";
import { AdminAccountProvisionDialog } from "./AdminAccountProvisionDialog";

type Faculty = ApiSchema<"Faculty">;
type Department = ApiSchema<"Department">;
type Account = ApiSchema<"AccountSummary">;

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
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
  );
}

function getOrganization(
  account: Account,
  departmentsById: ReadonlyMap<string, Department>,
  facultiesById: ReadonlyMap<string, Faculty>,
): { faculty: string; department: string } {
  const profile = account.profile;
  const assignment =
    account.role_assignments?.find(
      (roleAssignment) => roleAssignment.role === profile.role,
    ) ?? account.role_assignments?.[0];
  const departmentId =
    account.student_organization?.department_id ??
    assignment?.department_id ??
    profile.department_id;
  const department = departmentId
    ? departmentsById.get(departmentId)
    : undefined;
  const facultyId =
    account.student_organization?.faculty_id ??
    assignment?.faculty_id ??
    profile.faculty_id ??
    department?.faculty_id;
  const faculty = facultyId ? facultiesById.get(facultyId) : undefined;

  return {
    faculty: faculty?.name ?? "—",
    department: department?.name ?? "—",
  };
}

function getInitials(fullName: string): string {
  const parts = fullName
    .replace(/\b(Dr|Prof)\.?\s+/gi, "")
    .replace(/,/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function getInvitationStatusLabel(
  status: ApiSchema<"InvitationStatus"> | null | undefined,
): string {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AdminAccountsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AccountRole | typeof ALL_ACCOUNTS_FILTER>(
    ALL_ACCOUNTS_FILTER,
  );
  const [facultyId, setFacultyId] = useState(ALL_ACCOUNTS_FILTER);
  const [departmentId, setDepartmentId] = useState(ALL_ACCOUNTS_FILTER);
  const [page, setPage] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Account | null>(null);
  const [accountActionId, setAccountActionId] = useState<string | null>(null);
  const [accountActionError, setAccountActionError] = useState<string | null>(
    null,
  );
  const query = useMemo(
    () => buildAccountQuery({ search, role, facultyId, departmentId }, page),
    [search, role, facultyId, departmentId, page],
  );
  const {
    accounts,
    error: accountsError,
    loading: accountsLoading,
    reload: reloadAccounts,
  } = useAdminAccounts(query);
  const accountMutations = useAdminAccountMutations();
  const {
    faculties,
    departments,
    programs,
    curricula,
    advisers,
    error: catalogsError,
    loading: catalogsLoading,
    reload: reloadCatalogs,
  } = useAdminAccountCatalogs();
  const facultiesById = useMemo(
    () => new Map(faculties.map((faculty) => [faculty.id, faculty])),
    [faculties],
  );
  const departmentsById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments],
  );
  const visibleDepartments = departments.filter(
    (department) =>
      facultyId === ALL_ACCOUNTS_FILTER || department.faculty_id === facultyId,
  );
  const visibleAccounts = accounts.slice(0, ACCOUNT_PAGE_SIZE);
  const hasNextPage = accounts.length > ACCOUNT_PAGE_SIZE;

  function resetPageAnd<T>(setter: (value: T) => void, value: T) {
    setPage(0);
    setter(value);
  }

  function changeFaculty(value: string) {
    setPage(0);
    setFacultyId(value);
    setDepartmentId(ALL_ACCOUNTS_FILTER);
  }

  async function submitInvitation(request: ApiSchema<"InviteRequest">) {
    setInviteSubmitting(true);
    setInviteError(null);

    try {
      const response = await accountMutations.invite.mutateAsync(request);
      notify.success(response.message || "Invitation sent successfully.");
      setInviteOpen(false);
    } catch (requestError: unknown) {
      setInviteError(
        requestError instanceof Error
          ? requestError.message
          : "The invitation could not be sent. Please try again.",
      );
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function updateAccount(
    account: Account,
    request: ApiSchema<"AdminProfileUpdate">,
  ) {
    setAccountActionId(account.profile.id);
    setAccountActionError(null);

    try {
      await accountMutations.update.mutateAsync({
        profileId: account.profile.id,
        body: request,
      });
      notify.success(
        `Updated account details for ${account.profile.full_name}.`,
      );
      setEditingAccount((current) =>
        current?.profile.id === account.profile.id ? null : current,
      );
    } catch (requestError: unknown) {
      setAccountActionError(
        requestError instanceof Error
          ? requestError.message
          : "Account changes could not be saved.",
      );
    } finally {
      setAccountActionId(null);
    }
  }

  async function runInvitationAction(
    account: Account,
    action: "resend" | "revoke",
  ) {
    setAccountActionId(account.profile.id);
    setAccountActionError(null);

    try {
      if (action === "resend") {
        const response = await accountMutations.resend.mutateAsync(
          account.profile.id,
        );
        notify.success(response.message || "Invitation resent successfully.");
      } else {
        await accountMutations.revoke.mutateAsync(account.profile.id);
        notify.success(`Invitation revoked for ${account.profile.full_name}.`);
        setRevokeTarget((current) =>
          current?.profile.id === account.profile.id ? null : current,
        );
      }
    } catch (requestError: unknown) {
      setAccountActionError(
        requestError instanceof Error
          ? requestError.message
          : `The invitation could not be ${action === "resend" ? "resent" : "revoked"}.`,
      );
    } finally {
      setAccountActionId(null);
    }
  }

  return (
    <div className="grid gap-2">
      <PageHeading
        title="Accounts and roles"
        subtitle="Manage institution-wide accounts, role assignments, and invitations."
        className="mb-4"
        actions={
          <Button
            type="button"
            disabled={inviteSubmitting}
            onClick={() => {
              setInviteError(null);
              setInviteOpen(true);
            }}
          >
            <PlusIcon />
            Add account
          </Button>
        }
      />

      {accountActionError && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive"
        >
          {accountActionError}
        </div>
      )}
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
            onClick={() => void reloadAccounts()}
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
            onChange={(value) => {
              const selectedRole = accountRoles.find(
                (option) => option.value === value,
              )?.value;
              resetPageAnd(setRole, selectedRole ?? ALL_ACCOUNTS_FILTER);
            }}
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
            ? "Loading institution-wide account records."
            : `${visibleAccounts.length} account${visibleAccounts.length === 1 ? "" : "s"} shown on this page.`
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
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accountsLoading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="px-5 py-8 text-center text-muted-foreground"
                >
                  Loading accounts…
                </TableCell>
              </TableRow>
            ) : accountsError ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="px-5 py-8 text-center text-muted-foreground"
                >
                  Account records are unavailable until the request succeeds.
                </TableCell>
              </TableRow>
            ) : visibleAccounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="px-5 py-8 text-center text-muted-foreground"
                >
                  No accounts match these search and filter values.
                </TableCell>
              </TableRow>
            ) : (
              visibleAccounts.map((account) => {
                const profile = account.profile;
                const roles = getAccountRoles(account);
                const invitationStatus = profile.invitation_status;
                const hasPendingInvitation =
                  invitationStatus === "pending" &&
                  profile.status === "invited";
                const isCurrentAccount =
                  profile.id === user?.id ||
                  profile.email.trim().toLowerCase() ===
                    user?.email?.trim().toLowerCase();
                const organization = getOrganization(
                  account,
                  departmentsById,
                  facultiesById,
                );
                return (
                  <TableRow key={profile.id}>
                    <TableCell label="Name" className="whitespace-normal">
                      <div className="flex min-w-48 items-center gap-3">
                        <Avatar aria-hidden="true" className="shrink-0">
                          <AvatarFallback className="bg-[#F2EDDC] text-xs font-semibold text-[#2F4A12]">
                            {getInitials(profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <span
                            className="block max-w-56 truncate font-medium"
                            title={profile.full_name}
                          >
                            {profile.full_name}
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <StatusBadge status={profile.status} />
                            {invitationStatus && (
                              <Badge variant="outline">
                                Invitation:{" "}
                                {getInvitationStatusLabel(invitationStatus)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell label="VSU email" className="whitespace-normal">
                      <span
                        className="block max-w-64 truncate"
                        title={profile.email}
                      >
                        {profile.email}
                      </span>
                      {profile.student_number && (
                        <span className="block font-mono text-xs text-muted-foreground">
                          {profile.student_number}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      label="Faculty / department"
                      className="whitespace-normal"
                    >
                      <span className="block font-medium">
                        {organization.faculty}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {organization.department}
                      </span>
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
                    <TableCell label="Actions">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${profile.full_name}`}
                            disabled={accountActionId === profile.id}
                          >
                            <EllipsisIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={
                              isCurrentAccount || accountActionId === profile.id
                            }
                            onSelect={() => {
                              setAccountActionError(null);
                              setEditingAccount(account);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={
                              !hasPendingInvitation ||
                              accountActionId === profile.id
                            }
                            onSelect={() =>
                              void runInvitationAction(account, "resend")
                            }
                          >
                            Resend
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={
                              !hasPendingInvitation ||
                              accountActionId === profile.id
                            }
                            onSelect={() => {
                              setAccountActionError(null);
                              setRevokeTarget(account);
                            }}
                          >
                            Revoke
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
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
      {inviteOpen && (
        <AdminAccountProvisionDialog
          open={inviteOpen}
          onOpenChange={(open) => {
            if (open || !inviteSubmitting) setInviteOpen(open);
          }}
          currentEmail={user?.email ?? ""}
          faculties={faculties}
          departments={departments}
          programs={programs}
          curricula={curricula}
          advisers={advisers}
          catalogsLoading={catalogsLoading}
          submitting={inviteSubmitting}
          submissionError={inviteError}
          onSubmit={submitInvitation}
        />
      )}
      {editingAccount && (
        <AdminAccountEditDialog
          account={editingAccount}
          faculties={faculties}
          departments={departments}
          submitting={accountActionId === editingAccount.profile.id}
          submissionError={accountActionError}
          onOpenChange={(open) => {
            if (!open && accountActionId !== editingAccount.profile.id) {
              setEditingAccount(null);
            }
          }}
          onSubmit={(request) => updateAccount(editingAccount, request)}
        />
      )}
      {revokeTarget && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && accountActionId !== revokeTarget.profile.id) {
              setRevokeTarget(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke invitation?</DialogTitle>
              <DialogDescription>
                This invalidates the invitation for {revokeTarget.profile.email}
                . The account holder will no longer be able to use this
                invitation link.
              </DialogDescription>
            </DialogHeader>
            {accountActionError && (
              <p role="alert" className="text-sm text-destructive">
                {accountActionError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={accountActionId === revokeTarget.profile.id}
                onClick={() => setRevokeTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={accountActionId === revokeTarget.profile.id}
                onClick={() => void runInvitationAction(revokeTarget, "revoke")}
              >
                {accountActionId === revokeTarget.profile.id
                  ? "Revoking…"
                  : "Revoke invitation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
