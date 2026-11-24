import { useMemo, useState } from "react";
import { AccountProvisionDialog } from "@/components/features/account-provision-dialog";
import { FormField } from "@/components/features/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiSchema } from "@/lib/api";
import {
  accountRoles,
  buildAccountInviteRequest,
  validateAccountInvite,
  type AccountInviteErrors,
  type AccountInviteValues,
  type AccountRole,
} from "./admin-accounts-model";
import type { AdviserOption } from "./use-admin-account-catalogs";

type Faculty = Pick<ApiSchema<"Faculty">, "id" | "name">;
type Department = Pick<ApiSchema<"Department">, "id" | "name" | "faculty_id">;
type Program = Pick<
  ApiSchema<"Program">,
  "id" | "code" | "name" | "department_id" | "status"
>;
type Curriculum = Pick<
  ApiSchema<"CurriculumVersion">,
  "id" | "program_id" | "version_label" | "status"
>;

const EMPTY_VALUES: AccountInviteValues = {
  fullName: "",
  email: "",
  primaryRole: "student",
  additionalRoles: [],
  facultyId: "",
  departmentId: "",
  studentNumber: "",
  programId: "",
  curriculumVersionId: "",
  adviserId: "",
  entryYear: "",
};

export function AdminAccountProvisionDialog({
  open,
  onOpenChange,
  currentEmail,
  faculties,
  departments,
  programs,
  curricula,
  advisers,
  catalogsLoading,
  submitting,
  submissionError,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
  faculties: readonly Faculty[];
  departments: readonly Department[];
  programs: readonly Program[];
  curricula: readonly Curriculum[];
  advisers: readonly AdviserOption[];
  catalogsLoading: boolean;
  submitting: boolean;
  submissionError: string | null;
  onSubmit: (request: ApiSchema<"InviteRequest">) => Promise<void>;
}) {
  const [values, setValues] = useState<AccountInviteValues>(EMPTY_VALUES);
  const [selectedRoles, setSelectedRoles] = useState<AccountRole[]>([]);
  const [errors, setErrors] = useState<AccountInviteErrors>({});
  const programById = useMemo(
    () => new Map(programs.map((program) => [program.id, program])),
    [programs],
  );
  const selectedProgram = values.programId
    ? programById.get(values.programId)
    : undefined;
  const departmentOptions = departments.filter(
    (department) =>
      !values.facultyId || department.faculty_id === values.facultyId,
  );
  const curriculumOptions = curricula.filter(
    (curriculum) =>
      curriculum.status === "active" &&
      curriculum.program_id === values.programId,
  );
  const adviserOptions = advisers.filter(
    (adviser) =>
      Boolean(selectedProgram?.department_id) &&
      adviser.departmentId === selectedProgram?.department_id,
  );
  const programOptions = programs.filter(
    (program) =>
      program.status === "active" &&
      program.department_id === values.departmentId,
  );

  function update<K extends keyof AccountInviteValues>(
    key: K,
    value: AccountInviteValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function changeRoles(roles: readonly AccountRole[]) {
    const nextRoles = [...roles];
    setSelectedRoles(nextRoles);
    setValues((current) => ({
      ...current,
      primaryRole: nextRoles[0] ?? "student",
      additionalRoles: nextRoles.slice(1),
    }));
    setErrors((current) => ({ ...current, additionalRoles: undefined }));
  }

  function changeFaculty(value: string) {
    setValues((current) => ({
      ...current,
      facultyId: value,
      departmentId: "",
      programId: "",
      curriculumVersionId: "",
      adviserId: "",
    }));
    setErrors({});
  }

  function changeDepartment(value: string) {
    setValues((current) => ({
      ...current,
      departmentId: value,
      programId: "",
      curriculumVersionId: "",
      adviserId: "",
    }));
    setErrors({});
  }

  function submit(roles: AccountRole[]) {
    if (roles.length === 0) {
      setErrors((current) => ({
        ...current,
        additionalRoles: "Select at least one role.",
      }));
      return;
    }

    const inviteValues: AccountInviteValues = {
      ...values,
      primaryRole: roles[0],
      additionalRoles: roles.slice(1),
    };
    const nextErrors = validateAccountInvite(
      inviteValues,
      currentEmail,
      departments,
      programs.map((program) => ({
        id: program.id,
        department_id: program.department_id,
        status: program.status,
      })),
      curricula.map((curriculum) => ({
        id: curriculum.id,
        program_id: curriculum.program_id,
        status: curriculum.status,
      })),
      advisers.map((adviser) => ({
        id: adviser.id,
        department_id: adviser.departmentId,
      })),
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    void onSubmit(buildAccountInviteRequest(inviteValues));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && submitting) return;
    if (!nextOpen) {
      setValues(EMPTY_VALUES);
      setSelectedRoles([]);
      setErrors({});
    }
    onOpenChange(nextOpen);
  }

  return (
    <AccountProvisionDialog
      open={open}
      onOpenChange={handleOpenChange}
      fullName={values.fullName}
      email={values.email}
      onFullNameChange={(fullName) => update("fullName", fullName)}
      onEmailChange={(email) => update("email", email)}
      roleOptions={accountRoles}
      selectedRoles={selectedRoles}
      allowStudentRoleSwitch
      disabledRoles={
        catalogsLoading ? accountRoles.map(({ value }) => value) : []
      }
      pending={submitting}
      preventCloseWhilePending
      submitDisabled={catalogsLoading}
      idPrefix="account"
      fullNameError={errors.fullName}
      emailError={errors.email}
      roleError={errors.additionalRoles}
      submissionError={submissionError}
      onRolesChange={changeRoles}
      onSubmit={submit}
      studentProvisioning={{
        studentNumber: values.studentNumber,
        entryYear: values.entryYear,
        programId: values.programId,
        curriculumVersionId: values.curriculumVersionId,
        adviserId: values.adviserId,
        programs: programOptions.map((program) => ({
          value: program.id,
          label: `${program.code} · ${program.name}`,
        })),
        curricula: curriculumOptions.map((curriculum) => ({
          value: curriculum.id,
          label: curriculum.version_label,
        })),
        advisers: adviserOptions.map((adviser) => ({
          value: adviser.id,
          label: adviser.fullName,
        })),
        programsDisabled: !values.departmentId,
        loadingPrograms: catalogsLoading,
        loadingCurricula: catalogsLoading,
        loadingAdvisers: catalogsLoading,
        studentNumberError: errors.studentNumber,
        entryYearError: errors.entryYear,
        programError: errors.programId,
        curriculumError: errors.curriculumVersionId,
        adviserError: errors.adviserId,
        onStudentNumberChange: (value) => update("studentNumber", value),
        onEntryYearChange: (value) => update("entryYear", value),
        onProgramChange: (programId) => {
          setValues((current) => ({
            ...current,
            programId,
            curriculumVersionId: "",
            adviserId: "",
          }));
          setErrors((current) => ({
            ...current,
            programId: undefined,
            curriculumVersionId: undefined,
            adviserId: undefined,
          }));
        },
        onCurriculumChange: (value) => update("curriculumVersionId", value),
        onAdviserChange: (value) => update("adviserId", value),
      }}
    >
      {() => (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Faculty"
            htmlFor="account-faculty"
            error={errors.facultyId}
          >
            <Select
              value={values.facultyId || "none"}
              onValueChange={(value) =>
                changeFaculty(value === "none" ? "" : value)
              }
              disabled={catalogsLoading}
            >
              <SelectTrigger
                id="account-faculty"
                className="h-11 w-full"
                aria-invalid={Boolean(errors.facultyId)}
              >
                <SelectValue placeholder="Select a faculty" />
              </SelectTrigger>
              <SelectContent>
                {faculties.map((faculty) => (
                  <SelectItem key={faculty.id} value={faculty.id}>
                    {faculty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Department"
            htmlFor="account-department"
            error={errors.departmentId}
          >
            <Select
              value={values.departmentId || "none"}
              onValueChange={(value) =>
                changeDepartment(value === "none" ? "" : value)
              }
              disabled={catalogsLoading || !values.facultyId}
            >
              <SelectTrigger
                id="account-department"
                className="h-11 w-full"
                aria-invalid={Boolean(errors.departmentId)}
              >
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      )}
    </AccountProvisionDialog>
  );
}
