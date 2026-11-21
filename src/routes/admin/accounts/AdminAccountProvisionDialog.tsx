import { useMemo, useState, type FormEvent } from 'react'
import { FormField } from '@/components/features/form-field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ApiSchema } from '@/lib/api'
import {
  accountRoles,
  buildAccountInviteRequest,
  validateAccountInvite,
  type AccountInviteErrors,
  type AccountInviteValues,
  type AccountRole,
} from './admin-accounts-model'
import type { AdviserOption } from './use-admin-account-catalogs'

type Faculty = Pick<ApiSchema<'Faculty'>, 'id' | 'name'>
type Department = Pick<
  ApiSchema<'Department'>,
  'id' | 'name' | 'faculty_id'
>
type Program = Pick<
  ApiSchema<'Program'>,
  'id' | 'code' | 'name' | 'department_id' | 'status'
>
type Curriculum = Pick<
  ApiSchema<'CurriculumVersion'>,
  'id' | 'program_id' | 'version_label' | 'status'
>

const EMPTY_VALUES: AccountInviteValues = {
  fullName: '',
  email: '',
  primaryRole: 'student',
  additionalRoles: [],
  facultyId: '',
  departmentId: '',
  studentNumber: '',
  programId: '',
  curriculumVersionId: '',
  adviserId: '',
  entryYear: '',
}

function FieldSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string }[]
  placeholder: string
  disabled?: boolean
  error?: string
}) {
  return (
    <FormField label={label} htmlFor={id} error={error}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          className="w-full"
          disabled={disabled}
          aria-invalid={Boolean(error)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}

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
  open: boolean
  onOpenChange: (open: boolean) => void
  currentEmail: string
  faculties: readonly Faculty[]
  departments: readonly Department[]
  programs: readonly Program[]
  curricula: readonly Curriculum[]
  advisers: readonly AdviserOption[]
  catalogsLoading: boolean
  submitting: boolean
  submissionError: string | null
  onSubmit: (request: ApiSchema<'InviteRequest'>) => Promise<void>
}) {
  const [values, setValues] = useState<AccountInviteValues>(EMPTY_VALUES)
  const [selectedRoles, setSelectedRoles] = useState<AccountRole[]>([])
  const [errors, setErrors] = useState<AccountInviteErrors>({})
  const inviteValues: AccountInviteValues = {
    ...values,
    primaryRole: selectedRoles[0] ?? 'student',
    additionalRoles: selectedRoles.slice(1),
  }
  const programById = useMemo(
    () => new Map(programs.map((program) => [program.id, program])),
    [programs],
  )
  const selectedProgram = values.programId
    ? programById.get(values.programId)
    : undefined
  const departmentOptions = departments.filter(
    (department) =>
      !values.facultyId || department.faculty_id === values.facultyId,
  )
  const curriculumOptions = curricula.filter(
    (curriculum) =>
      curriculum.status === 'active' &&
      curriculum.program_id === values.programId,
  )
  const adviserOptions = advisers.filter(
    (adviser) =>
      Boolean(selectedProgram?.department_id) &&
      adviser.departmentId === selectedProgram?.department_id,
  )
  const programOptions = programs.filter(
    (program) =>
      program.status === 'active' &&
      program.department_id === values.departmentId,
  )

  function update<K extends keyof AccountInviteValues>(
    key: K,
    value: AccountInviteValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function toggleRole(role: AccountRole, checked: boolean) {
    setSelectedRoles((current) => {
      if (role === 'student') return checked ? ['student'] : []
      if (current.includes('student')) return current
      return checked
        ? [...current, role]
        : current.filter((currentRole) => currentRole !== role)
    })
    setErrors((current) => ({ ...current, additionalRoles: undefined }))
  }

  function changeFaculty(value: string) {
    setValues((current) => ({
      ...current,
      facultyId: value,
      departmentId: '',
      programId: '',
      curriculumVersionId: '',
      adviserId: '',
    }))
    setErrors({})
  }

  function changeDepartment(value: string) {
    setValues((current) => ({
      ...current,
      departmentId: value,
      programId: '',
      curriculumVersionId: '',
      adviserId: '',
    }))
    setErrors({})
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedRoles.length === 0) {
      setErrors((current) => ({
        ...current,
        additionalRoles: 'Select at least one role.',
      }))
      return
    }
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
    )
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    void onSubmit(buildAccountInviteRequest(inviteValues))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
          <DialogDescription>
            Send a secure, expiring invitation to a VSU account. Role and
            student assignments are validated and created by the server.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={submit} noValidate>
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
              htmlFor="account-full-name"
              error={errors.fullName}
            >
              <Input
                id="account-full-name"
                autoComplete="name"
                maxLength={150}
                value={values.fullName}
                aria-invalid={Boolean(errors.fullName)}
                onChange={(event) => update('fullName', event.currentTarget.value)}
              />
            </FormField>
            <FormField
              label="VSU email"
              htmlFor="account-email"
              error={errors.email}
            >
              <Input
                id="account-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                value={values.email}
                aria-invalid={Boolean(errors.email)}
                onChange={(event) => update('email', event.currentTarget.value)}
              />
            </FormField>
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-[13px] font-semibold text-muted-foreground">
              Roles
            </legend>
            <p className="text-xs text-muted-foreground">
              The first selected role is primary; other selected roles are
              added as assignments. Student accounts cannot have other roles.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {accountRoles.map((option) => {
                const studentSelected = selectedRoles.includes('student')
                const id = `account-role-${option.value}`
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
                        catalogsLoading ||
                        (studentSelected && option.value !== 'student')
                      }
                      onCheckedChange={(checked) =>
                        toggleRole(option.value, checked === true)
                      }
                    />
                    {option.label}
                  </label>
                )
              })}
            </div>
            {errors.additionalRoles && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {errors.additionalRoles}
              </p>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldSelect
              id="account-faculty"
              label="Faculty"
              value={values.facultyId}
              onChange={changeFaculty}
              options={faculties.map((faculty) => ({
                value: faculty.id,
                label: faculty.name,
              }))}
              placeholder="Select a faculty"
              disabled={catalogsLoading}
              error={errors.facultyId}
            />
            <FieldSelect
              id="account-department"
              label="Department"
              value={values.departmentId}
              onChange={changeDepartment}
              options={departmentOptions.map((department) => ({
                value: department.id,
                label: department.name,
              }))}
              placeholder="Select a department"
              disabled={catalogsLoading || !values.facultyId}
              error={errors.departmentId}
            />
          </div>

          {selectedRoles.includes('student') && (
            <section
              aria-labelledby="student-provisioning-heading"
              className="grid gap-4 rounded-md border border-border p-4"
            >
              <div>
                <h3
                  id="student-provisioning-heading"
                  className="text-sm font-semibold"
                >
                  Student provisioning
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Student number, program, active curriculum, and an eligible
                  active adviser are required by the invitation contract.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Student number"
                  htmlFor="account-student-number"
                  error={errors.studentNumber}
                >
                  <Input
                    id="account-student-number"
                    maxLength={64}
                    value={values.studentNumber}
                    aria-invalid={Boolean(errors.studentNumber)}
                    onChange={(event) =>
                      update('studentNumber', event.currentTarget.value)
                    }
                  />
                </FormField>
                <FormField
                  label="Entry year (optional)"
                  htmlFor="account-entry-year"
                  error={errors.entryYear}
                >
                  <Input
                    id="account-entry-year"
                    type="number"
                    min={1900}
                    max={3000}
                    inputMode="numeric"
                    value={values.entryYear}
                    aria-invalid={Boolean(errors.entryYear)}
                    onChange={(event) =>
                      update('entryYear', event.currentTarget.value)
                    }
                  />
                </FormField>
              </div>
              <FieldSelect
                id="account-program"
                label="Program"
                value={values.programId}
                onChange={(value) => {
                  update('programId', value)
                  update('curriculumVersionId', '')
                  update('adviserId', '')
                }}
                options={programOptions.map((program) => ({
                    value: program.id,
                    label: `${program.code} · ${program.name}`,
                  }))}
                placeholder="Select a program"
                disabled={catalogsLoading || !values.departmentId}
                error={errors.programId}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldSelect
                  id="account-curriculum"
                  label="Curriculum"
                  value={values.curriculumVersionId}
                  onChange={(value) => update('curriculumVersionId', value)}
                  options={curriculumOptions.map((curriculum) => ({
                    value: curriculum.id,
                    label: curriculum.version_label,
                  }))}
                  placeholder="Select an active curriculum"
                  disabled={catalogsLoading || !values.programId}
                  error={errors.curriculumVersionId}
                />
                <FieldSelect
                  id="account-adviser"
                  label="Initial adviser"
                  value={values.adviserId}
                  onChange={(value) => update('adviserId', value)}
                  options={adviserOptions.map((adviser) => ({
                    value: adviser.id,
                    label: adviser.fullName,
                  }))}
                  placeholder="Select an eligible adviser"
                  disabled={catalogsLoading || !selectedProgram}
                  error={errors.adviserId}
                />
              </div>
            </section>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || catalogsLoading}>
              {submitting ? 'Sending invitation…' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
