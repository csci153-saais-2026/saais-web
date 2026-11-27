import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/features/form-field";
import { StudentProvisioningFields } from "@/components/features/student-provisioning-fields";
import type { ApiSchema } from "@/lib/api";

export type AccountProvisionRole = ApiSchema<"RoleType">;

export interface AccountProvisionRoleOption {
  value: AccountProvisionRole;
  label: string;
}

export interface AccountProvisionStudentOption {
  value: string;
  label: string;
}

interface AccountProvisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fullName: string;
  email: string;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  roleOptions: readonly AccountProvisionRoleOption[];
  initialRoles?: readonly AccountProvisionRole[];
  selectedRoles?: readonly AccountProvisionRole[];
  disabledRoles?: readonly AccountProvisionRole[];
  allowStudentRoleSwitch?: boolean;
  disabled?: boolean;
  pending?: boolean;
  preventCloseWhilePending?: boolean;
  submitDisabled?: boolean;
  idPrefix?: string;
  emailLabel?: string;
  fullNameError?: string;
  emailError?: string;
  roleError?: string;
  submissionError?: ReactNode;
  submitLabel?: string;
  onSubmit: (roles: AccountProvisionRole[]) => void;
  children?: (roles: readonly AccountProvisionRole[]) => ReactNode;
  trigger?: ReactNode;
  onRolesChange?: (roles: readonly AccountProvisionRole[]) => void;
  studentProvisioning?: {
    studentNumber: string;
    entryYear: string;
    programId: string;
    curriculumVersionId: string;
    adviserId: string;
    programs: readonly AccountProvisionStudentOption[];
    curricula: readonly AccountProvisionStudentOption[];
    advisers: readonly AccountProvisionStudentOption[];
    programsDisabled?: boolean;
    loadingPrograms?: boolean;
    loadingCurricula?: boolean;
    loadingAdvisers?: boolean;
    studentNumberError?: string;
    entryYearError?: string;
    programError?: string;
    curriculumError?: string;
    adviserError?: string;
    onStudentNumberChange: (value: string) => void;
    onEntryYearChange: (value: string) => void;
    onProgramChange: (value: string) => void;
    onCurriculumChange: (value: string) => void;
    onAdviserChange: (value: string) => void;
  };
  loadingStudentReferences?: boolean;
  studentReferencesError?: ReactNode;
  onRetryStudentReferences?: () => void;
}

export function AccountProvisionDialog({
  open,
  onOpenChange,
  fullName,
  email,
  onFullNameChange,
  onEmailChange,
  roleOptions,
  initialRoles = [],
  selectedRoles: controlledRoles,
  disabledRoles = [],
  allowStudentRoleSwitch = false,
  disabled = false,
  pending = false,
  preventCloseWhilePending = false,
  submitDisabled = false,
  idPrefix = "account",
  emailLabel = "VSU email",
  fullNameError,
  emailError,
  roleError,
  submissionError,
  submitLabel = "Send invitation",
  onSubmit,
  children,
  trigger,
  onRolesChange,
  studentProvisioning,
  loadingStudentReferences = false,
  studentReferencesError,
  onRetryStudentReferences,
}: AccountProvisionDialogProps) {
  const [internalRoles, setInternalRoles] = useState<AccountProvisionRole[]>([
    ...initialRoles,
  ]);
  const selectedRoles = controlledRoles ?? internalRoles;

  function updateRoles(roles: AccountProvisionRole[]) {
    if (controlledRoles === undefined) setInternalRoles(roles);
    onRolesChange?.(roles);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && pending && preventCloseWhilePending) return;
    if (!nextOpen && controlledRoles === undefined) {
      setInternalRoles([...initialRoles]);
    }
    onOpenChange(nextOpen);
  }

  function toggleRole(role: AccountProvisionRole, checked: boolean) {
    const studentSelected = selectedRoles.includes("student");
    if (studentSelected && role !== "student") return;
    if (role === "student") {
      const roles: AccountProvisionRole[] = checked ? ["student"] : [];
      updateRoles(roles);
      return;
    }
    const next = checked
      ? [...selectedRoles, role]
      : selectedRoles.filter((selectedRole) => selectedRole !== role);
    const roles = Array.from(new Set(next));
    updateRoles(roles);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
          <DialogDescription>
            Send a secure, expiring invitation to a VSU account. Role and
            student assignments are validated and created by the server.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5 [&_.grid>div]:min-w-0 [&_input]:h-11 [&_input]:w-full [&_input]:min-w-0 [&_input]:max-w-full [&_input]:text-sm [&_input::placeholder]:text-sm [&_[data-slot=select-trigger]]:h-11 [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:min-w-0 [&_[data-slot=select-trigger]]:max-w-full [&_[data-slot=select-trigger]]:text-sm"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit([...selectedRoles]);
          }}
          noValidate
        >
          {submissionError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive"
            >
              {submissionError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Full name"
              htmlFor={`${idPrefix}-full-name`}
              error={fullNameError}
            >
              <Input
                id={`${idPrefix}-full-name`}
                autoComplete="name"
                maxLength={150}
                value={fullName}
                aria-invalid={Boolean(fullNameError)}
                disabled={disabled}
                onChange={(event) =>
                  onFullNameChange(event.currentTarget.value)
                }
              />
            </FormField>
            <FormField
              label={emailLabel}
              htmlFor={`${idPrefix}-email`}
              error={emailError}
            >
              <Input
                id={`${idPrefix}-email`}
                type="email"
                autoComplete="email"
                maxLength={254}
                value={email}
                aria-invalid={Boolean(emailError)}
                disabled={disabled}
                onChange={(event) => onEmailChange(event.currentTarget.value)}
              />
            </FormField>
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-[13px] font-semibold text-muted-foreground">
              Roles
            </legend>
            <p className="text-xs text-muted-foreground">
              The first selected role is primary; other selected roles are added
              as assignments. Student accounts cannot have other roles.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {roleOptions.map((option) => {
                const studentSelected = selectedRoles.includes("student");
                const nonStudentSelected =
                  selectedRoles.length > 0 && !studentSelected;
                const id = `${idPrefix}-role-${option.value}`;
                return (
                  <label
                    key={option.value}
                    htmlFor={id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      id={id}
                      checked={selectedRoles.includes(option.value)}
                      disabled={
                        disabled ||
                        (studentSelected && option.value !== "student") ||
                        (!allowStudentRoleSwitch &&
                          nonStudentSelected &&
                          option.value === "student") ||
                        disabledRoles.includes(option.value)
                      }
                      onCheckedChange={(checked) =>
                        toggleRole(option.value, checked === true)
                      }
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
            {roleError && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {roleError}
              </p>
            )}
          </fieldset>

          {children?.(selectedRoles)}

          {studentProvisioning && selectedRoles.includes("student") && (
            <>
              {loadingStudentReferences && (
                <p role="status" className="text-sm text-muted-foreground">
                  Loading active programs, curricula, and eligible advisers...
                </p>
              )}
              {studentReferencesError && (
                <div className="space-y-2">
                  {studentReferencesError}
                  {onRetryStudentReferences && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onRetryStudentReferences}
                      disabled={disabled}
                    >
                      Retry references
                    </Button>
                  )}
                </div>
              )}
              <StudentProvisioningFields
                idPrefix={idPrefix}
                disabled={disabled}
                studentNumber={studentProvisioning.studentNumber}
                entryYear={studentProvisioning.entryYear}
                programId={studentProvisioning.programId}
                curriculumVersionId={studentProvisioning.curriculumVersionId}
                adviserId={studentProvisioning.adviserId}
                programs={studentProvisioning.programs}
                curricula={studentProvisioning.curricula}
                advisers={studentProvisioning.advisers}
                programsDisabled={studentProvisioning.programsDisabled}
                loadingPrograms={studentProvisioning.loadingPrograms}
                loadingCurricula={studentProvisioning.loadingCurricula}
                loadingAdvisers={studentProvisioning.loadingAdvisers}
                studentNumberError={studentProvisioning.studentNumberError}
                entryYearError={studentProvisioning.entryYearError}
                programError={studentProvisioning.programError}
                curriculumError={studentProvisioning.curriculumError}
                adviserError={studentProvisioning.adviserError}
                onStudentNumberChange={
                  studentProvisioning.onStudentNumberChange
                }
                onEntryYearChange={studentProvisioning.onEntryYearChange}
                onProgramChange={studentProvisioning.onProgramChange}
                onCurriculumChange={studentProvisioning.onCurriculumChange}
                onAdviserChange={studentProvisioning.onAdviserChange}
              />
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={disabled || pending || submitDisabled}
            >
              {pending ? "Sending invitation…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
