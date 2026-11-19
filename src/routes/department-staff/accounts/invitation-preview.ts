import { z } from 'zod'
import type { ApiSchema } from '@/lib/api'
import type { DepartmentInvitationOptions } from './invitation.api'

export const departmentInviteRoles = [
  'student',
  'dean',
  'admin',
  'adviser',
  'department_staff',
  'department_head',
] as const

export type DepartmentInviteRole = typeof departmentInviteRoles[number]

export interface DepartmentInviteFormValues {
  email: string
  full_name: string
  role: DepartmentInviteRole
  additional_roles: DepartmentInviteRole[]
  student_number: string
  program_id: string
  curriculum_version_id: string
  adviser_id: string
  entry_year: string
}

export interface DepartmentInviteContext extends DepartmentInvitationOptions {
  canInvitePrivilegedRoles?: boolean
  ownEmail: string
  departmentId: string | null
  facultyId: string | null
}

export type DepartmentInvitePreviewResult =
  | { ok: true; payload: ApiSchema<'InviteRequest'>; roles: DepartmentInviteRole[] }
  | { ok: false; errors: string[] }

const emailSchema = z.string().trim().email().max(254)
const allowedRoles = new Set<string>(departmentInviteRoles)

function isInstitutionalEmail(email: string): boolean {
  return email.toLocaleLowerCase().endsWith('@vsu.edu.ph')
}

export function buildDepartmentInvitePreview(
  values: DepartmentInviteFormValues,
  context: DepartmentInviteContext,
): DepartmentInvitePreviewResult {
  const errors: string[] = []
  const email = values.email.trim()
  const fullName = values.full_name.trim()

  if (!emailSchema.safeParse(email).success || !isInstitutionalEmail(email)) {
    errors.push('Enter a valid institutional email ending exactly in @vsu.edu.ph.')
  }
  if (context.ownEmail && email.toLocaleLowerCase() === context.ownEmail.trim().toLocaleLowerCase()) {
    errors.push('You cannot grant roles to your own account.')
  }
  if (!fullName || fullName.length > 150) {
    errors.push('Full name is required and must be 150 characters or fewer.')
  }
  if (!allowedRoles.has(values.role)) errors.push('Choose an allowed department invitation role.')
  if (!context.departmentId || !context.facultyId) {
    errors.push('A department and faculty scope from your approved assignment are required.')
  }

  if (!context.canInvitePrivilegedRoles && ([values.role, ...values.additional_roles].some(role => role === 'admin' || role === 'dean'))) errors.push('Admin authority is required to invite Dean or Admin roles.')
  const additionalRoles = values.role === 'student' ? [] : values.additional_roles ?? []
  if (values.role === 'adviser' && additionalRoles.some(role => role === 'admin' || role === 'dean')) errors.push('Adviser invitations cannot include Dean or Admin roles.')
  if (additionalRoles.some(role => !allowedRoles.has(role) || role === 'student' || role === values.role)) {
    errors.push('Additional roles must be unique permitted non-student roles, with Student selected as the primary role when needed.')
  }
  if (new Set(additionalRoles).size !== additionalRoles.length) {
    errors.push('Each additional role may be selected only once.')
  }

  let program: DepartmentInvitationOptions['programs'][number] | undefined
  let version: DepartmentInvitationOptions['curriculumVersions'][number] | undefined
  let adviser: DepartmentInvitationOptions['advisers'][number] | undefined
  if (values.role === 'student') {
    if (!/^\d{2}-\d-\d{5}$/.test(values.student_number.trim())) {
      errors.push('Student number must follow the canonical YY-N-NNNNN format.')
    }
    program = context.programs.find(item =>
      item.id === values.program_id && item.department_id === context.departmentId && item.status === 'active',
    )
    if (!program) errors.push('Choose an active program in your authorized department.')
    version = context.curriculumVersions.find(item =>
      item.id === values.curriculum_version_id && item.status === 'active' && item.program_id === program?.id,
    )
    if (!version) errors.push('Choose an active curriculum version that belongs to the selected program.')
    adviser = context.advisers.find(item => item.id === values.adviser_id)
    if (!adviser) errors.push('Choose an eligible active initial adviser in your authorized department.')
    if (values.entry_year.trim()) {
      const entryYear = Number(values.entry_year)
      if (!Number.isInteger(entryYear) || entryYear < 1900 || entryYear > 3000) {
        errors.push('Entry year must be a whole year between 1900 and 3000.')
      }
    }
  }

  if (errors.length || !context.departmentId || !context.facultyId) return { ok: false, errors }

  const roleAssignments: ApiSchema<'RoleAssignmentInput'>[] = additionalRoles.map(role => ({
    role,
    department_id: context.departmentId!,
    faculty_id: context.facultyId!,
  }))
  const emailValue = email
  const nameValue = fullName
  let payload: ApiSchema<'InviteRequest'>

  if (values.role === 'student') {
    payload = {
      email: emailValue,
      full_name: nameValue,
      role: 'student',
      student_number: values.student_number.trim(),
      program_id: program!.id,
      curriculum_version_id: version!.id,
      adviser_id: adviser!.id,
      ...(values.entry_year.trim() ? { entry_year: Number(values.entry_year) } : {}),
      ...(roleAssignments.length ? { role_assignments: roleAssignments } : {}),
    }
  } else if (values.role === 'admin') {
    payload = { email: emailValue, full_name: nameValue, role: 'admin', ...(roleAssignments.length ? { role_assignments: roleAssignments } : {}) }
  } else if (values.role === 'adviser') {
    payload = {
      email: emailValue,
      full_name: nameValue,
      role: 'adviser',
      faculty_id: context.facultyId,
      department_id: context.departmentId,
      ...(roleAssignments.length ? { role_assignments: roleAssignments } : {}),
    }
  } else {
    payload = {
      email: emailValue,
      full_name: nameValue,
      role: values.role,
      faculty_id: context.facultyId,
      department_id: context.departmentId,
      ...(roleAssignments.length ? { role_assignments: roleAssignments } : {}),
    }
  }

  return { ok: true, payload, roles: [values.role, ...additionalRoles] }
}

