import { useRef, useState } from 'react'
import { PlusIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FormField } from '@/components/features/form-field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { useDepartmentInvitationOptions } from '@/hooks/use-department-invitation-options'
import { useSendDepartmentInvitation } from '@/hooks/use-send-department-invitation'
import { ApiClientError } from '@/lib/api'
import { useStaffScope } from '../shared/use-staff-scope'
import {
  buildDepartmentInvitePreview,
  departmentInviteRoles,
  type DepartmentInviteFormValues,
  type DepartmentInviteRole,

} from './invitation-preview'

const roleLabels: Record<DepartmentInviteRole, string> = {
  student: 'Student',
  dean: 'Dean',
  admin: 'Admin',
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
  const [errors, setErrors] = useState<string[]>([])
  const sendLock = useRef(false)
  const auth = useAuth()
  const scope = useStaffScope()
  const references = useDepartmentInvitationOptions()
  const invitation = useSendDepartmentInvitation()
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

  function update<K extends keyof DepartmentInviteFormValues>(key: K, value: DepartmentInviteFormValues[K]) {
    setValues(previous => ({ ...previous, [key]: value }))
    setErrors([])
    invitation.reset()
  }

  function updateRole(role: DepartmentInviteRole) {
    setValues(previous => ({
      ...previous,
      role,
      additional_roles: role === 'student' ? [] : previous.additional_roles.filter(item => item !== role),
    }))
    setErrors([])
    invitation.reset()
  }

  function toggleAdditionalRole(role: DepartmentInviteRole, checked: boolean) {
    setValues(previous => ({
      ...previous,
      additional_roles: checked
        ? [...new Set([...previous.additional_roles, role])]
        : previous.additional_roles.filter(item => item !== role),
    }))
    setErrors([])
    invitation.reset()
  }

  function sendReviewedInvitation() {
    if (sendLock.current || invitation.isPending || invitation.isSuccess) return
    const result = buildDepartmentInvitePreview(values, {
      canInvitePrivilegedRoles: auth.roles.includes('admin'),
      ownEmail: auth.user?.email ?? '',
      departmentId,
      facultyId,
      ...options,
    })
    if (result.ok === false) {
      setErrors(result.errors)
        return
    }
    setErrors([])
    sendLock.current = true
    invitation.mutate(result.payload, { onSettled: () => { sendLock.current = false } })
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      invitation.reset()
      sendLock.current = false
      setValues(initialValues)
        setErrors([])
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button"><PlusIcon className="size-4" />Add account</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Prepare department invitation</DialogTitle>
          <DialogDescription>
            Review the details before the server creates the account and sends its invitation.
          </DialogDescription>
        </DialogHeader>

        <form className="min-w-0 space-y-5 [&_.grid>div]:min-w-0 [&_input]:h-11 [&_input]:w-full [&_input]:min-w-0 [&_input]:max-w-full [&_input]:text-sm [&_input::placeholder]:text-sm" onSubmit={event => { event.preventDefault(); sendReviewedInvitation() }} noValidate>
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
              <SelectTrigger id="invite-role" className="h-11! w-full min-w-0 max-w-full overflow-hidden [&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate"><SelectValue /></SelectTrigger>
              <SelectContent>
                {departmentInviteRoles.filter(role => auth.roles.includes('admin') || (role !== 'admin' && role !== 'dean')).map(role => <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>

          {values.role !== 'student' && <fieldset className="space-y-2">
            <legend className="text-[13px] font-semibold text-muted-foreground">Additional roles</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {departmentInviteRoles.filter(role => role !== values.role && role !== 'student' && (auth.roles.includes('admin') || (role !== 'dean' && role !== 'admin'))).map(role => {
                return (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={values.additional_roles.includes(role)}
                      onCheckedChange={checked => toggleAdditionalRole(role, checked === true)}
                      aria-label={`Additional role ${roleLabels[role]}`}
                    />
                    <span>{roleLabels[role]}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>}

          {values.role === 'student' && (
            <div className="grid min-w-0 gap-4 border-t border-border pt-4 sm:grid-cols-2">
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
                  <SelectTrigger id="invite-program" className="h-11! w-full min-w-0 max-w-full overflow-hidden [&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate"><SelectValue placeholder="Choose active program" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose active program</SelectItem>
                    {options.programs.map(program => <SelectItem key={program.id} value={program.id}>{program.code} - {program.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Active curriculum version" htmlFor="invite-curriculum">
                <Select value={values.curriculum_version_id || 'none'} onValueChange={value => update('curriculum_version_id', value === 'none' ? '' : value)} disabled={!selectedProgram}>
                  <SelectTrigger id="invite-curriculum" className="h-11! w-full min-w-0 max-w-full overflow-hidden [&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate"><SelectValue placeholder="Choose matching active curriculum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose matching active curriculum</SelectItem>
                    {availableVersions.map(version => <SelectItem key={version.id} value={version.id}>{version.version_label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Eligible initial adviser" htmlFor="invite-adviser" className="sm:col-span-2">
                <Select value={values.adviser_id || 'none'} onValueChange={value => update('adviser_id', value === 'none' ? '' : value)}>
                  <SelectTrigger id="invite-adviser" className="h-11! w-full min-w-0 max-w-full overflow-hidden [&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate"><SelectValue placeholder="Choose an active department adviser" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose an active department adviser</SelectItem>
                    {options.advisers.map(adviser => <SelectItem key={adviser.id} value={adviser.id}>{adviser.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          )}

          {errors.length > 0 && (
            <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <ul className="list-disc space-y-1 pl-5">{errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul>
            </div>
          )}

          {invitation.isError && (
            <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <p>{invitation.error instanceof Error ? invitation.error.message : 'The invitation could not be sent.'}</p>
              {invitation.error instanceof ApiClientError && (
                <p className="mt-1">{invitation.error.isConflict ? 'The server reports a duplicate or conflicting account.' : invitation.error.isForbidden ? 'The server denied this invitation for the current scope.' : invitation.error.isNetworkError ? 'Check your connection before retrying; the server may have received the request.' : `Request failed (${invitation.error.status}).`}</p>
              )}
            </div>
          )}

          {invitation.isSuccess && (
            <div role="status" className="rounded-md border border-green-700/20 bg-green-50 p-3 text-sm text-green-900">
              <p>{invitation.data.message}</p>
              <p className="mt-1">Invitation status: {invitation.data.invitation_status ?? 'pending'}.</p>
              {invitation.data.invitation_expires_at && <p>Expires: {new Date(invitation.data.invitation_expires_at).toLocaleString()}.</p>}
              <p className="mt-1">The invitee must use the invitation link to activate their account; this does not sign you or the invitee in.</p>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={!values.full_name.trim() || !values.email.trim() || (values.role === 'student' && (!values.student_number.trim() || !values.program_id || !values.curriculum_version_id || !values.adviser_id)) || invitation.isPending || invitation.isSuccess}>
              {invitation.isPending ? 'Sending invitationâ€¦' : invitation.isSuccess ? 'Invitation sent' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
