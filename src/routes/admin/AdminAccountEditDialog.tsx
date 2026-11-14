import { useState, type FormEvent } from 'react'
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
  getAccountRoles,
  profileStatuses,
  type AccountRole,
} from './admin-accounts-model'

type Account = ApiSchema<'AccountSummary'>
type Faculty = Pick<ApiSchema<'Faculty'>, 'id' | 'name'>
type Department = Pick<
  ApiSchema<'Department'>,
  'id' | 'name' | 'faculty_id'
>

export function AdminAccountEditDialog({
  account,
  faculties,
  departments,
  submitting,
  submissionError,
  onOpenChange,
  onSubmit,
}: {
  account: Account
  faculties: readonly Faculty[]
  departments: readonly Department[]
  submitting: boolean
  submissionError: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (request: ApiSchema<'AdminProfileUpdate'>) => Promise<void>
}) {
  const [fullName, setFullName] = useState(account.profile.full_name)
  const [primaryRole, setPrimaryRole] = useState<AccountRole>(
    account.profile.role,
  )
  const [additionalRoles, setAdditionalRoles] = useState<AccountRole[]>(
    getAccountRoles(account).filter(
      (role) =>
        role !== account.profile.role &&
        !(role === 'student' && account.profile.role !== 'student'),
    ),
  )
  const [status, setStatus] = useState(account.profile.status)
  const initialAssignment = account.role_assignments?.find(
    (assignment) => assignment.role === account.profile.role,
  ) ?? account.role_assignments?.[0]
  const [facultyId, setFacultyId] = useState(
    initialAssignment?.faculty_id ??
      account.student_organization?.faculty_id ??
      account.profile.faculty_id ??
      '',
  )
  const [departmentId, setDepartmentId] = useState(
    initialAssignment?.department_id ??
      account.student_organization?.department_id ??
      account.profile.department_id ??
      '',
  )
  const [validationError, setValidationError] = useState<string | null>(null)
  const roles = [primaryRole, ...additionalRoles]
  const needsFaculty = roles.some((role) =>
    ['adviser', 'department_head', 'department_staff', 'dean'].includes(role),
  )
  const needsDepartment = roles.some((role) =>
    ['department_head', 'department_staff'].includes(role),
  )
  const visibleDepartments = departments.filter(
    (department) =>
      !facultyId || department.faculty_id === facultyId,
  )

  function toggleRole(role: AccountRole, checked: boolean) {
    if (role === 'student' && primaryRole !== 'student') return
    setAdditionalRoles((current) =>
      checked
        ? Array.from(new Set([...current, role]))
        : current.filter((assignedRole) => assignedRole !== role),
    )
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = fullName.trim()
    if (!name || name.length > 150) {
      setValidationError('Enter a name between 1 and 150 characters.')
      return
    }
    if (needsFaculty && !facultyId) {
      setValidationError('Select a faculty for the assigned roles.')
      return
    }
    if (needsDepartment && !departmentId) {
      setValidationError('Select a department for the assigned roles.')
      return
    }
    const department = departments.find((item) => item.id === departmentId)
    if (departmentId && department && facultyId !== department.faculty_id) {
      setValidationError('Choose a department in the selected faculty.')
      return
    }

    setValidationError(null)
    const request: ApiSchema<'AdminProfileUpdate'> = {
      full_name: name,
      role: primaryRole,
      role_assignments: roles.map((role) => ({
        role,
        faculty_id: facultyId || null,
        department_id: departmentId || null,
      })),
      status,
    }
    void onSubmit(request)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit account</DialogTitle>
          <DialogDescription>
            Update the account profile, status, and institution-wide role
            assignments.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={submit} noValidate>
          {(submissionError || validationError) && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive"
            >
              {submissionError ?? validationError}
            </div>
          )}
          <FormField label="Full name" htmlFor="edit-account-full-name">
            <Input
              id="edit-account-full-name"
              maxLength={150}
              value={fullName}
              onChange={(event) => setFullName(event.currentTarget.value)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Primary role" htmlFor="edit-account-primary-role">
              <Select
                value={primaryRole}
                onValueChange={(value) => {
                  const nextRole = accountRoles.find(
                    (option) => option.value === value,
                  )?.value
                  if (!nextRole) return
                  setPrimaryRole(nextRole)
                  setAdditionalRoles((current) =>
                    current.filter((role) => role !== nextRole),
                  )
                }}
              >
                <SelectTrigger id="edit-account-primary-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountRoles.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Account status" htmlFor="edit-account-status">
              <Select
                value={status}
                onValueChange={(value) => {
                  const nextStatus = profileStatuses.find(
                    (option) => option.value === value,
                  )?.value
                  if (nextStatus) setStatus(nextStatus)
                }}
              >
                <SelectTrigger id="edit-account-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {profileStatuses.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-[13px] font-semibold text-muted-foreground">
              Additional roles
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {accountRoles
                .filter(
                  (option) =>
                    option.value !== primaryRole &&
                    !(
                      option.value === 'student' &&
                      primaryRole !== 'student'
                    ),
                )
                .map((option) => {
                  const id = `edit-account-role-${option.value}`
                  return (
                    <label
                      key={option.value}
                      htmlFor={id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        id={id}
                        checked={additionalRoles.includes(option.value)}
                        onCheckedChange={(checked) =>
                          toggleRole(option.value, checked === true)
                        }
                      />
                      {option.label}
                    </label>
                  )
                })}
            </div>
          </fieldset>
          {needsFaculty && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Faculty" htmlFor="edit-account-faculty">
                <Select
                  value={facultyId}
                  onValueChange={(value) => {
                    setFacultyId(value)
                    setDepartmentId('')
                  }}
                >
                  <SelectTrigger id="edit-account-faculty" className="w-full">
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
              {needsDepartment && (
                <FormField label="Department" htmlFor="edit-account-department">
                  <Select
                    value={departmentId}
                    onValueChange={setDepartmentId}
                  >
                    <SelectTrigger
                      id="edit-account-department"
                      className="w-full"
                      disabled={!facultyId}
                    >
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {visibleDepartments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </div>
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
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving changes…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
