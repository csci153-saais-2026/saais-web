import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { ACCOUNTS_SKELETON_SAMPLE } from "./accounts.skeleton-sample";
import { notify } from "@/lib/notify";
import "../shared/staff-filters.css";
import { useState } from "react";
import { useSearchParams } from "react-router";
import {
  DataTablePanel,
  type Column,
} from "@/components/features/data-table-panel";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truncate } from "@/components/ui/truncate";
import { FormField } from "@/components/features/form-field";
import { SearchInput } from "@/components/features/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDepartmentAccounts } from "@/hooks/use-department-accounts";
import { useStaffDepartmentName } from "@/hooks/use-staff-department-name";
import { useResendDepartmentInvitation } from "@/hooks/use-resend-department-invitation";
import { useRevokeDepartmentInvitation } from "@/hooks/use-revoke-department-invitation";
import { ApiClientError, type ApiSchema } from "@/lib/api";
import { useStaffScope } from "../shared/use-staff-scope";
import {
  accountsMaxOffset,
  accountsPageSize,
  canResendDepartmentInvitation,
  canRevokeDepartmentInvitation,
  type DepartmentAccount,
} from "./accounts.api";
import InviteAccountDialog from "./InviteAccountDialog";

const roleLabels: Record<ApiSchema<"RoleType">, string> = {
  student: "Student",
  adviser: "Adviser",
  department_staff: "Department staff",
  department_head: "Department Head",
  dean: "Dean",
  admin: "Admin",
};

const roleBadgeClasses: Record<ApiSchema<"RoleType">, string> = {
  student: "bg-sky-100 text-sky-900",
  adviser: "bg-[#e7f0e2] text-[#2c6430]",
  department_staff: "bg-[#e4edf4] text-[#2a4c6b]",
  department_head: "bg-[#fbf0d6] text-[#8a6206]",
  dean: "bg-[#ece8da] text-[#5c5a4c]",
  admin: "bg-[#ece8da] text-[#5c5a4c]",
};

function initialsForName(fullName: string | null | undefined): string {
  const name = fullName?.trim() ?? "";
  if (!name) return "?";
  const parts = name.includes(",")
    ? name.split(",").map((part) => part.trim())
    : name.replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, "").split(/\s+/);
  const letters = parts
    .map((part) => part[0])
    .filter((letter): letter is string => Boolean(letter));
  return letters.slice(0, 2).join("").toUpperCase();
}

function rolesForAccount(account: DepartmentAccount): ApiSchema<"RoleType">[] {
  return [
    ...new Set([
      ...(account.role_assignments ?? []).map((assignment) => assignment.role),
      ...(account.profile.roles?.length
        ? account.profile.roles
        : [account.profile.role]),
    ]),
  ];
}

function resendFailureMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isConflict)
      return `${error.message} Account status was refreshed; resend only if the server still shows an eligible invitation.`;
    if (error.isRateLimited) {
      return error.retryAfterSeconds === null
        ? "The server is rate limiting invitation resends. Wait before trying again."
        : `The server is rate limiting invitation resends. Try again in ${error.retryAfterSeconds} seconds.`;
    }
    if (error.isForbidden) return error.message;
    if (error.isNetworkError)
      return "The resend result is uncertain. Account status was refreshed; check it before trying again.";
    return error.message;
  }
  return error instanceof Error
    ? error.message
    : "The invitation could not be resent.";
}

function revokeFailureMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isConflict)
      return `${error.message} Account status was refreshed; revoke only if the server still shows a pending invitation.`;
    if (error.isRateLimited) {
      return error.retryAfterSeconds === null
        ? "The server is rate limiting invitation changes. Wait before trying again."
        : `The server is rate limiting invitation changes. Try again in ${error.retryAfterSeconds} seconds.`;
    }
    if (error.isForbidden) return error.message;
    if (error.isNetworkError)
      return "The revoke result is uncertain. Account status was refreshed; check it before trying again.";
    return error.message;
  }
  return error instanceof Error
    ? error.message
    : "The invitation could not be revoked.";
}

function InvitationActions({
  account,
  actingProfileId,
  departmentId,
}: {
  account: DepartmentAccount;
  actingProfileId: string;
  departmentId: string;
}) {
  const resend = useResendDepartmentInvitation();
  const revoke = useRevokeDepartmentInvitation();
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const canResend = canResendDepartmentInvitation(account, actingProfileId);
  const canRevoke = canRevokeDepartmentInvitation(
    account,
    actingProfileId,
    departmentId,
  );
  const targetBusy = resend.isPending || revoke.isPending;
  if (!canResend && !canRevoke) {
    return <span className="text-muted-foreground">No resend action</span>;
  }

  return (
    <div className="space-y-1.5">
      {canResend && (
        <Button
          type="button"
          variant="outline"
          disabled={targetBusy || resend.isSuccess}
          onClick={() =>
            resend.mutate(account.profile.id, {
              onSuccess: (data) =>
                notify.success(
                  `${data.message} Expires ${new Date(data.invitation_expires_at).toLocaleString()}.`,
                ),
            })
          }
        >
          {resend.isPending
            ? "Resending…"
            : resend.isSuccess
              ? "Invitation resent"
              : "Resend invitation"}
        </Button>
      )}
      {canRevoke && (
        <Dialog
          open={confirmationOpen}
          onOpenChange={(open) => {
            if (!targetBusy) setConfirmationOpen(open);
          }}
        >
          <DialogTrigger asChild>
            <Button type="button" variant="outline" disabled={targetBusy}>
              Revoke invitation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Revoke invitation for {account.profile.full_name}?
              </DialogTitle>
              <DialogDescription>
                This invalidates the pending invitation link for{" "}
                {account.profile.email}. It will not delete the account or
                change its roles.
              </DialogDescription>
            </DialogHeader>
            {revoke.isError && (
              <p role="alert" className="text-sm text-destructive">
                {revokeFailureMessage(revoke.error)}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={targetBusy}
                onClick={() => setConfirmationOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={targetBusy}
                onClick={() =>
                  revoke.mutate(account.profile.id, {
                    onSuccess: (data) =>
                      notify.success(
                        `Invitation revoked for ${data.full_name}.`,
                      ),
                  })
                }
              >
                {revoke.isPending ? "Revoking…" : "Confirm revocation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {resend.isError && (
        <p role="alert" className="max-w-56 text-xs text-destructive">
          {resendFailureMessage(resend.error)}
        </p>
      )}
      {revoke.isError && (
        <p role="alert" className="max-w-56 text-xs text-destructive">
          {revokeFailureMessage(revoke.error)}
        </p>
      )}
      {(canResend || canRevoke) && (
        <p className="text-xs text-muted-foreground">
          {account.profile.invitation_status ?? "Invitation status unavailable"}
        </p>
      )}
    </div>
  );
}

function parseOffset(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 0;
  const offset = Number(value);
  if (!Number.isSafeInteger(offset)) return 0;
  return Math.min(
    Math.floor(offset / accountsPageSize) * accountsPageSize,
    accountsMaxOffset,
  );
}

function parseRole(value: string | null): ApiSchema<"RoleType"> | "" {
  return value && Object.hasOwn(roleLabels, value)
    ? (value as ApiSchema<"RoleType">)
    : "";
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden)
      return "Your account is not permitted to view accounts in this department.";
    if (error.isAuthError)
      return "Your session could not be verified. Sign in again and retry.";
    if (error.isNetworkError)
      return "Could not reach the account directory. Check your connection and retry.";
    return error.message;
  }
  return error instanceof Error
    ? error.message
    : "The account directory could not be loaded.";
}

export default function AccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = useStaffScope();
  const departmentName = useStaffDepartmentName();
  const search = searchParams.get("q") ?? "";
  const role = parseRole(searchParams.get("role"));
  const offset = parseOffset(searchParams.get("offset"));
  const accounts = useDepartmentAccounts({
    search,
    role: role || undefined,
    offset,
  });
  // While loading, the skeleton is measured from sample rows.
  const accountsView = accounts.data ?? ACCOUNTS_SKELETON_SAMPLE;
  const accountColumns: Column<DepartmentAccount>[] = [
    {
      header: "Name",
      className: "w-[32%]",
      cell: (account) => (
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f2eddc] text-[11px] font-semibold tracking-wide text-[#2f4a12]"
          >
            {initialsForName(account.profile.full_name)}
          </span>
          <Truncate
            text={account.profile.full_name || "Name unavailable"}
            className="text-[13px] font-semibold text-foreground"
          />
        </div>
      ),
    },
    {
      header: "VSU email",
      className: "w-[33%]",
      cell: (account) => (
        <Truncate
          text={account.profile.email || "Email unavailable"}
          className="max-w-64 font-mono text-[12px]"
        />
      ),
    },
    {
      header: "Roles",
      cell: (account) => {
        const roles = rolesForAccount(account);
        const canManageInvitation =
          scope.status === "ready" &&
          account.profile.invitation_status !== "pending" &&
          (canResendDepartmentInvitation(account, scope.profileId) ||
            canRevokeDepartmentInvitation(
              account,
              scope.profileId,
              scope.departmentId,
            ));
        return (
          <div className="space-y-2">
            {roles.length ? (
              <div
                className="flex flex-wrap gap-1.5"
                aria-label={`Roles for ${account.profile.full_name || "account"}`}
              >
                {roles.map((role, index) => (
                  <Badge
                    key={`${role}-${index}`}
                    variant="outline"
                    className={`h-6 gap-1 rounded-sm border-0 px-2 text-[11px] font-semibold ${roleBadgeClasses[role]}`}
                  >
                    <span
                      aria-hidden="true"
                      className="size-1 rounded-full bg-current"
                    />
                    {roleLabels[role] ?? role}
                  </Badge>
                ))}
              </div>
            ) : (
              <span>No roles assigned</span>
            )}
            {canManageInvitation && scope.status === "ready" && (
              <InvitationActions
                account={account}
                actingProfileId={scope.profileId}
                departmentId={scope.departmentId}
              />
            )}
          </div>
        );
      },
    },
  ];

  function updateFilters(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    next.delete("offset");
    setSearchParams(next, { replace: true });
  }

  function updateOffset(nextOffset: number) {
    const next = new URLSearchParams(searchParams);
    if (nextOffset <= 0) next.delete("offset");
    else next.set("offset", String(Math.min(nextOffset, accountsMaxOffset)));
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="-mt-6 space-y-5 md:-mt-(--content-pad-top)">
      <PageHeading
        title="Accounts and roles"
        subtitle={
          departmentName.data ??
          (departmentName.isError
            ? "Department details unavailable."
            : "Loading department…")
        }
        actions={scope.status === "ready" ? <InviteAccountDialog /> : undefined}
      />

      {scope.status !== "ready" && (
        <Panel title="Accounts and roles">
          <p role="alert" className="p-5 text-sm text-destructive">
            A resolved Department Staff assignment is required to view this
            directory.
          </p>
        </Panel>
      )}

      {scope.status === "ready" && (
        <Panel title="People" flush bodyClassName="gap-0">
          <div className="staff-filter-controls department-filter-typography grid gap-4 border-b border-border bg-card px-4 py-4 sm:grid-cols-2 sm:px-5">
            <FormField
              label="Search accounts"
              htmlFor="accounts-search"
              hint="Search by name or institutional email."
            >
              <SearchInput
                id="accounts-search"
                value={search}
                maxLength={150}
                placeholder="Search accounts"
                onChange={(event) => updateFilters({ q: event.target.value })}
              />
            </FormField>
            <FormField label="Role" htmlFor="accounts-role">
              <Select
                value={role || "all"}
                onValueChange={(value) =>
                  updateFilters({ role: value === "all" ? "" : value })
                }
              >
                <SelectTrigger id="accounts-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <AccountSkeleton
            id="AccountsPage-1"
            loading={accounts.isPending}
            measured
            label="Loading department accounts..."
          >
            {accounts.isError && (
              <div className="space-y-4 border-b border-border p-6">
                <p role="alert" className="text-sm text-destructive">
                  {errorMessage(accounts.error)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void accounts.refetch();
                  }}
                  disabled={accounts.isFetching}
                >
                  {accounts.isFetching ? "Retrying..." : "Retry"}
                </Button>
              </div>
            )}

            {(accounts.isSuccess || accounts.isPending) && (
              <DataTablePanel
                title="People"
                columns={accountColumns}
                rows={accountsView.accounts}
                rowKey={(account) => account.profile.id}
                spacious
                empty={
                  search || role
                    ? "No accounts match the current search and role filters."
                    : "No accounts are listed for this department."
                }
                footer={
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p
                      className="text-sm text-muted-foreground"
                      aria-live="polite"
                    >
                      {accountsView.accounts.length
                        ? `Showing ${offset + 1}-${offset + accountsView.accounts.length}`
                        : `No accounts on page ${offset / accountsPageSize + 1}`}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => updateOffset(offset - accountsPageSize)}
                        disabled={offset === 0 || accounts.isFetching}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => updateOffset(offset + accountsPageSize)}
                        disabled={!accountsView.hasNext || accounts.isFetching}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                }
              />
            )}
          </AccountSkeleton>
        </Panel>
      )}
    </div>
  );
}
