import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FormField } from '@/components/features/form-field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { useDepartmentInvitationOptions } from '@/hooks/use-department-invitation-options'
import { useStaffScope } from '../shared/use-staff-scope'
import {
  buildDepartmentInvitePreview,
  departmentInviteRoles,
  type DepartmentInviteFormValues,
  type DepartmentInviteRole,
  type DepartmentInvitePreviewResult,
} from './invitation-preview'

const roleLabels: Record<DepartmentInviteRole, string> = {
  student: 'Student',
  adviser: 'Adviser',
  department_staff: 'Department Staff',
  department_head: 'Department Head',
}

const initialValues: DepartmentInviteFormValues = {
  email: '',
  full_name: '',
  role: 'student',
  additional_roles: [],
  student_number: '',
  program_id: '',
  curriculum_version_id: '',
  adviser_id: '',
  entry_year: '',
}

export default function InviteAccountDialog() {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(initialValues)
  const [review, setReview] = useState<Extract<DepartmentInvitePreviewResult, { ok: true }> | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const auth = useAuth()
  const scope = useStaffScope()
  const references = useDepartmentInvitationOptions()
  const departmentId = scope.status === 'ready' ? scope.departmentId : null
  const facultyId = departmentId
    ? auth.roleAssignments.find(assignment =>
      assignment.profile_id === auth.user?.id
      && assignment.role === 'department_staff'
      && assignment.department_id === departmentId,
    )?.faculty_id ?? null
    : null
  const options = references.data ?? { programs: [], curriculumVersions: [], advisers: [] }
  const selectedProgram = options.programs.find(program => program.id === values.program_id)
  const availableVersions = options.curriculumVersions.filter(version => version.program_id === values.program_id)
  const reviewResult = review?.payload
  const resolvedAdviser = options.advisers.find(adviser => adviser.id === values.adviser_id)

  function update<K extends keyof DepartmentInviteFormValues>(key: K, value: DepartmentInviteFormValues[K]) {
    setValues(previous => ({ ...previous, [key]: value }))
    setReview(null)
    setErrors([])
  }

  function updateRole(role: DepartmentInviteRole) {
    setValues(previous => ({
      ...previous,
      role,
      additional_roles: previous.additional_roles.filter(item => item !== role),
    }))
    setReview(null)
    setErrors([])
  }

  function toggleAdditionalRole(role: DepartmentInviteRole, checked: boolean) {
    setValues(previous => ({
      ...previous,
      additional_roles: checked
        ? [...new Set([...previous.additional_roles, role])]
        : previous.additional_roles.filter(item => item !== role),
    }))
    setReview(null)
    setErrors([])
  }

  function prepareReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = buildDepartmentInvitePreview(values, {
      ownEmail: auth.user?.email ?? '',
      departmentId,
      facultyId,
      ...options,
    })
    if (result.ok === false) {
      setErrors(result.errors)
      setReview(null)
      return
    }
    setErrors([])
    setReview(result)
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setValues(initialValues)
      setReview(null)
      setErrors([])
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">Prepare invitation</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Prepare department invitation</DialogTitle>
          <DialogDescription>
            Validate a draft invitation for your assigned department. This step does not create an account or send email.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={prepareReview} noValidate>
          {references.isPending && values.role === 'student' && <p role="status" className="text-sm text-muted-foreground">Loading active programs, curricula, and eligible advisers...</p>}
          {references.isError && values.role === 'student' && (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-destructive">Student invitation references could not be loaded.</p>
              <Button type="button" variant="outline" onClick={() => { void references.refetch() }} disabled={references.isFetching}>Retry references</Button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" htmlFor="invite-full-name">
              <Input id="invite-full-name" value={values.full_name} maxLength={150} autoComplete="name" onChange={event => update('full_name', event.target.value)} />
            </FormField>
            <FormField label="Institutional email" htmlFor="invite-email" hint="Use the exact @vsu.edu.ph domain.">
              <Input id="invite-email" type="email" value={values.email} maxLength={254} autoComplete="email" onChange={event => update('email', event.target.value)} />
            </FormField>
          </div>

          <FormField label="Primary role" htmlFor="invite-role">
            <Select value={values.role} onValueChange={value => updateRole(value as DepartmentInviteRole)}>
              <SelectTrigger id="invite-role" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {departmentInviteRoles.map(role => <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>

          <fieldset className="space-y-2">
            <legend className="text-[13px] font-semibold text-muted-foreground">Additional roles</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {departmentInviteRoles.filter(role => role !== values.role).map(role => {
                const studentMustBePrimary = role === 'student'
                return (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={values.additional_roles.includes(role)}
                      disabled={studentMustBePrimary}
                      onCheckedChange={checked => toggleAdditionalRole(role, checked === true)}
                      aria-label={`Additional role ${roleLabels[role]}`}
                    />
                    <span>{roleLabels[role]}{studentMustBePrimary ? ' (select as primary to provide student details)' : ''}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {values.role === 'student' && (
            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <FormField label="Canonical student number" htmlFor="invite-student-number" hint="Format: YY-N-NNNNN (example: 24-1-00124).">
                <Input id="invite-student-number" value={values.student_number} maxLength={64} onChange={event => update('student_number', event.target.value)} />
              </FormField>
              <FormField label="Entry year (optional)" htmlFor="invite-entry-year">
                <Input id="invite-entry-year" type="number" min={1900} max={3000} step={1} value={values.entry_year} onChange={event => update('entry_year', event.target.value)} />
              </FormField>
              <FormField label="Program" htmlFor="invite-program">
                <Select value={values.program_id || 'none'} onValueChange={value => {
                  update('program_id', value === 'none' ? '' : value)
                  setValues(previous => ({ ...previous, curriculum_version_id: '' }))
                }}>
                  <SelectTrigger id="invite-program" className="w-full"><SelectValue placeholder="Choose active program" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose active program</SelectItem>
                    {options.programs.map(program => <SelectItem key={program.id} value={program.id}>{program.code} - {program.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Active curriculum version" htmlFor="invite-curriculum">
                <Select value={values.curriculum_version_id || 'none'} onValueChange={value => update('curriculum_version_id', value === 'none' ? '' : value)} disabled={!selectedProgram}>
                  <SelectTrigger id="invite-curriculum" className="w-full"><SelectValue placeholder="Choose matching active curriculum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose matching active curriculum</SelectItem>
                    {availableVersions.map(version => <SelectItem key={version.id} value={version.id}>{version.version_label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Eligible initial adviser" htmlFor="invite-adviser" className="sm:col-span-2">
                <Select value={values.adviser_id || 'none'} onValueChange={value => update('adviser_id', value === 'none' ? '' : value)}>
                  <SelectTrigger id="invite-adviser" className="w-full"><SelectValue placeholder="Choose an active department adviser" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose an active department adviser</SelectItem>
                    {options.advisers.map(adviser => <SelectItem key={adviser.id} value={adviser.id}>{adviser.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          )}

          <div className="rounded-md border border-border bg-muted/20 p-4 text-sm">
            <p className="font-medium">Organization scope</p>
            <p className="mt-1 text-muted-foreground">Department and faculty are fixed from your approved assignment; no organization selector is available.</p>
            {!facultyId && <p role="alert" className="mt-2 text-destructive">Your Department Staff assignment has no approved faculty scope. Ask the scope owner to resolve it before preparing an invitation.</p>}
          </div>

          {errors.length > 0 && (
            <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <ul className="list-disc space-y-1 pl-5">{errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul>
            </div>
          )}

          {reviewResult && (
            <section aria-label="Invitation review" className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-4">
              <h3 className="font-semibold">Review summary</h3>
              <p><span className="font-medium">Invitee:</span> {reviewResult.full_name} ({reviewResult.email})</p>
              <p><span className="font-medium">Roles:</span> {review!.roles.map(role => roleLabels[role]).join(', ')}</p>
              <p><span className="font-medium">Scope:</span> Department {departmentId} / Faculty {facultyId}</p>
              {reviewResult.role === 'student' && (
                <div>
                  <p><span className="font-medium">Student number:</span> {reviewResult.student_number}</p>
                  <p><span className="font-medium">Program:</span> {selectedProgram?.code} - {selectedProgram?.name}</p>
                  <p><span className="font-medium">Curriculum:</span> {options.curriculumVersions.find(version => version.id === reviewResult.curriculum_version_id)?.version_label}</p>
                  <p><span className="font-medium">Initial adviser:</span> {resolvedAdviser?.label}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">Preview only. No account provisioning or invitation email was requested.</p>
            </section>
          )}

          <DialogFooter>
            <Button type="submit" variant="outline" disabled={references.isPending && values.role === 'student'}>Review invitation</Button>
            <Button type="button" disabled aria-disabled="true">Send invitation (Step 37)</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
