import { useRef, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { AccountProvisionDialog } from "@/components/features/account-provision-dialog";
import { ApiClientError } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useDepartmentInvitationOptions } from "@/hooks/use-department-invitation-options";
import { useSendDepartmentInvitation } from "@/hooks/use-send-department-invitation";
import { useStaffScope } from "../shared/use-staff-scope";
import {
  buildDepartmentInvitePreview,
  departmentInviteRoles,
  type DepartmentInviteFormValues,
  type DepartmentInviteRole,
} from "./invitation-preview";

const roleLabels: Record<DepartmentInviteRole, string> = {
  student: "Student",
  dean: "Dean",
  admin: "Admin",
  adviser: "Adviser",
  department_staff: "Department Staff",
  department_head: "Department Head",
};

const initialValues: DepartmentInviteFormValues = {
  email: "",
  full_name: "",
  role: "adviser",
  additional_roles: [],
  student_number: "",
  program_id: "",
  curriculum_version_id: "",
  adviser_id: "",
  entry_year: "",
};

export default function InviteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<string[]>([]);
  const sendLock = useRef(false);
  const auth = useAuth();
  const scope = useStaffScope();
  const references = useDepartmentInvitationOptions();
  const invitation = useSendDepartmentInvitation();
  const canInvitePrivilegedRoles = auth.roles.includes("admin");
  const primaryInviteRoles = departmentInviteRoles.filter(
    (role) =>
      canInvitePrivilegedRoles || (role !== "dean" && role !== "admin"),
  );
  const departmentId = scope.status === "ready" ? scope.departmentId : null;
  const facultyId = departmentId
    ? (auth.roleAssignments.find(
        (assignment) =>
          assignment.profile_id === auth.user?.id &&
          assignment.role === "department_staff" &&
          assignment.department_id === departmentId,
      )?.faculty_id ?? null)
    : null;
  const options = references.data ?? {
    programs: [],
    curriculumVersions: [],
    advisers: [],
  };
  const availableVersions = options.curriculumVersions.filter(
    (version) => version.program_id === values.program_id,
  );

  function update<K extends keyof DepartmentInviteFormValues>(
    key: K,
    value: DepartmentInviteFormValues[K],
  ) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors([]);
    invitation.reset();
  }

  function sendReviewedInvitation(selectedRoles: readonly DepartmentInviteRole[]) {
    if (sendLock.current || invitation.isPending || invitation.isSuccess)
      return;
    if (selectedRoles.length === 0) {
      setErrors(["Select at least one role."]);
      return;
    }
    const inviteValues: DepartmentInviteFormValues = {
      ...values,
      role: selectedRoles[0] ?? "adviser",
      additional_roles: selectedRoles.slice(1),
    };
    const result = buildDepartmentInvitePreview(inviteValues, {
      canInvitePrivilegedRoles,
      ownEmail: auth.user?.email ?? "",
      departmentId,
      facultyId,
      ...options,
    });
    if (result.ok === false) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    sendLock.current = true;
    invitation.mutate(result.payload, {
      onSettled: () => {
        sendLock.current = false;
      },
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      invitation.reset();
      sendLock.current = false;
      setValues(initialValues);
      setErrors([]);
    }
  }

  return (
    <AccountProvisionDialog
      open={open}
      onOpenChange={handleOpenChange}
      fullName={values.full_name}
      email={values.email}
      onFullNameChange={(value) => update("full_name", value)}
      onEmailChange={(value) => update("email", value)}
      roleOptions={primaryInviteRoles.map((role) => ({
        value: role,
        label: roleLabels[role],
      }))}
      disabledRoles={
        canInvitePrivilegedRoles
          ? []
          : (["dean", "admin"] as DepartmentInviteRole[])
      }
      disabled={invitation.isPending || invitation.isSuccess}
      pending={invitation.isPending}
      idPrefix="department-account"
      emailLabel="Institutional email"
      roleError={
        errors.includes("Select at least one role.")
          ? "Select at least one role."
          : undefined
      }
      submissionError={
        errors.length
          ? errors.map((error, index) => (
              <p key={`${error}-${index}`}>{error}</p>
            ))
          : invitation.isError
            ? (
                <>
                  <p>
                    {invitation.error instanceof Error
                      ? invitation.error.message
                      : "The invitation could not be sent."}
                  </p>
                  {invitation.error instanceof ApiClientError && (
                    <p className="mt-1">
                      {invitation.error.isConflict
                        ? "The server reports a duplicate or conflicting account."
                        : invitation.error.isForbidden
                          ? "The server denied this invitation for the current scope."
                          : invitation.error.isNetworkError
                            ? "Check your connection before retrying; the server may have received the request."
                            : `Request failed (${invitation.error.status}).`}
                    </p>
                  )}
                </>
              )
            : invitation.isSuccess
              ? invitation.data.message
              : undefined
      }
      submitLabel={invitation.isSuccess ? "Invitation sent" : "Send invitation"}
      onSubmit={sendReviewedInvitation}
      loadingStudentReferences={references.isPending}
      studentReferencesError={
        references.isError ? (
          <p role="alert" className="text-sm text-destructive">
            Student invitation references could not be loaded.
          </p>
        ) : undefined
      }
      onRetryStudentReferences={() => void references.refetch()}
      studentProvisioning={{
        studentNumber: values.student_number,
        entryYear: values.entry_year,
        programId: values.program_id,
        curriculumVersionId: values.curriculum_version_id,
        adviserId: values.adviser_id,
        programs: options.programs.map((program) => ({
          value: program.id,
          label: `${program.code} - ${program.name}`,
        })),
        curricula: availableVersions.map((version) => ({
          value: version.id,
          label: version.version_label,
        })),
        advisers: options.advisers.map((adviser) => ({
          value: adviser.id,
          label: adviser.label,
        })),
        loadingPrograms: references.isPending,
        loadingCurricula: references.isPending,
        loadingAdvisers: references.isPending,
        onStudentNumberChange: (value) => update("student_number", value),
        onEntryYearChange: (value) => update("entry_year", value),
        onProgramChange: (value) => {
          update("program_id", value);
          setValues((previous) => ({
            ...previous,
            curriculum_version_id: "",
            adviser_id: "",
          }));
        },
        onCurriculumChange: (value) =>
          update("curriculum_version_id", value),
        onAdviserChange: (value) => update("adviser_id", value),
      }}
      trigger={
        <Button type="button">
          <PlusIcon className="size-4" />
          Add account
        </Button>
      }
    />
  );
}
