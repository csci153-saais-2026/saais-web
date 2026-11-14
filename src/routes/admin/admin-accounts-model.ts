import type {
  ApiSchema,
  OperationQuery,
} from '@/lib/api'

export const ACCOUNT_PAGE_SIZE = 20
export const ACCOUNT_FETCH_LIMIT = ACCOUNT_PAGE_SIZE + 1
export const ALL_ACCOUNTS_FILTER = 'all'

export type AccountRole = ApiSchema<'RoleType'>
export type AccountSummary = ApiSchema<'AccountSummary'>
export type AccountQuery = OperationQuery<'listAccounts'>

export const accountRoles: readonly {
  value: AccountRole
  label: string
}[] = [
  { value: 'student', label: 'Student' },
  { value: 'adviser', label: 'Adviser' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'department_staff', label: 'Department Staff' },
  { value: 'dean', label: 'Dean' },
  { value: 'admin', label: 'System Admin' },
]

export const profileStatuses: readonly {
  value: ApiSchema<'ProfileStatus'>
  label: string
}[] = [
  { value: 'invited', label: 'Invited' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
]

export const invitationStatuses: readonly {
  value: ApiSchema<'InvitationStatus'>
  label: string
}[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'expired', label: 'Expired' },
  { value: 'declined', label: 'Declined' },
  { value: 'revoked', label: 'Revoked' },
]

export interface AccountFilters {
  readonly search: string
  readonly role: AccountRole | typeof ALL_ACCOUNTS_FILTER
  readonly facultyId: string
  readonly departmentId: string
}

export interface AccountInviteValues {
  readonly fullName: string
  readonly email: string
  readonly primaryRole: AccountRole
  readonly additionalRoles: readonly AccountRole[]
  readonly facultyId: string
  readonly departmentId: string
  readonly studentNumber: string
  readonly programId: string
  readonly curriculumVersionId: string
  readonly adviserId: string
  readonly entryYear: string
}

export type AccountInviteErrors = Partial<
  Record<keyof AccountInviteValues | 'form', string>
>

export interface InviteOption {
  readonly id: string
  readonly department_id?: string | null
  readonly faculty_id?: string | null
  readonly program_id?: string
  readonly status?: string
}

export function buildAccountQuery(
  filters: AccountFilters,
  page: number,
): AccountQuery {
  const query: AccountQuery = {
    limit: ACCOUNT_FETCH_LIMIT,
    offset: page * ACCOUNT_PAGE_SIZE,
  }
  const search = filters.search.trim()

  if (search) query.search = search
  if (filters.role !== ALL_ACCOUNTS_FILTER) query.role = filters.role
  if (filters.facultyId !== ALL_ACCOUNTS_FILTER) {
    query.faculty_id = filters.facultyId
  }
  if (filters.departmentId !== ALL_ACCOUNTS_FILTER) {
    query.department_id = filters.departmentId
  }

  return query
}

export function validateAccountInvite(
  values: AccountInviteValues,
  currentEmail: string,
  departments: readonly InviteOption[],
  programs: readonly InviteOption[],
  curricula: readonly InviteOption[],
  advisers: readonly InviteOption[],
): AccountInviteErrors {
  const identityErrors = validateAccountIdentity(values.fullName, values.email)
  const errors: AccountInviteErrors = {}
  if (identityErrors.fullName) errors.fullName = identityErrors.fullName
  if (identityErrors.email) errors.email = identityErrors.email
  if (
    values.email.trim().toLowerCase() === currentEmail.trim().toLowerCase()
  ) {
    errors.email = 'You cannot assign roles to your own account.'
  }

  const roles = new Set([values.primaryRole, ...values.additionalRoles])
  if (roles.size > 6) {
    errors.additionalRoles = 'An account can have no more than six roles.'
  }
  if (
    values.primaryRole !== 'student' &&
    values.additionalRoles.includes('student')
  ) {
    errors.additionalRoles =
      'Student must be the primary role and requires student provisioning details.'
  }

  const needsFaculty = [...roles].some((role) =>
    ['adviser', 'department_head', 'department_staff', 'dean'].includes(role),
  )
  const needsDepartment = [...roles].some((role) =>
    ['department_head', 'department_staff'].includes(role),
  )
  if (needsFaculty && !values.facultyId) {
    errors.facultyId = 'Select the faculty for the assigned role.'
  }
  if (needsDepartment && !values.departmentId) {
    errors.departmentId = 'Select the department for the assigned role.'
  }

  const department = departments.find(
    (option) => option.id === values.departmentId,
  )
  if (
    values.departmentId &&
    department &&
    values.facultyId &&
    department.faculty_id !== values.facultyId
  ) {
    errors.departmentId = 'Choose a department in the selected faculty.'
  }

  if (values.primaryRole === 'student') {
    if (!values.studentNumber.trim()) {
      errors.studentNumber = 'Enter the student number.'
    } else if (values.studentNumber.trim().length > 64) {
      errors.studentNumber = 'Student number must be 64 characters or fewer.'
    }

    const program = programs.find((option) => option.id === values.programId)
    if (!program) errors.programId = 'Select a program.'

    const curriculum = curricula.find(
      (option) => option.id === values.curriculumVersionId,
    )
    if (!curriculum || curriculum.status !== 'active') {
      errors.curriculumVersionId = 'Select an active curriculum.'
    } else if (curriculum.program_id !== values.programId) {
      errors.curriculumVersionId =
        'Select a curriculum version for the chosen program.'
    }

    const adviser = advisers.find((option) => option.id === values.adviserId)
    if (!adviser) {
      errors.adviserId = 'Select an active eligible adviser.'
    } else if (
      program?.department_id &&
      adviser.department_id !== program.department_id
    ) {
      errors.adviserId = 'The adviser must belong to the program department.'
    }

    if (
      values.entryYear &&
      (!/^\d{4}$/.test(values.entryYear) ||
        Number(values.entryYear) < 1900 ||
        Number(values.entryYear) > 3000)
    ) {
      errors.entryYear = 'Enter a four-digit year from 1900 to 3000.'
    }
  }

  return errors
}

export function buildAccountInviteRequest(
  values: AccountInviteValues,
): ApiSchema<'InviteRequest'> {
  const roleAssignments = values.additionalRoles.map((role) => ({
    role,
    faculty_id: values.facultyId || null,
    department_id: values.departmentId || null,
  }))
  const additionalAssignments =
    roleAssignments.length > 0
      ? { role_assignments: roleAssignments }
      : {}
  const identity = {
    email: values.email.trim(),
    full_name: values.fullName.trim(),
  }

  if (values.primaryRole === 'student') {
    return {
      ...identity,
      role: 'student',
      student_number: values.studentNumber.trim(),
      program_id: values.programId,
      curriculum_version_id: values.curriculumVersionId,
      adviser_id: values.adviserId,
      entry_year: values.entryYear ? Number(values.entryYear) : null,
      ...additionalAssignments,
    }
  }

  if (values.primaryRole === 'admin') {
    return {
      ...identity,
      role: 'admin',
      ...additionalAssignments,
    }
  }

  if (values.primaryRole === 'adviser') {
    return {
      ...identity,
      role: 'adviser',
      faculty_id: values.facultyId,
      department_id: values.departmentId || null,
      ...additionalAssignments,
    }
  }

  return {
    ...identity,
    role: values.primaryRole,
    faculty_id: values.facultyId || null,
    department_id: values.departmentId || null,
    ...additionalAssignments,
  }
}

export function getAccountRoles(account: AccountSummary): AccountRole[] {
  return Array.from(
    new Set([
      account.profile.role,
      ...(account.role_assignments ?? []).map((assignment) => assignment.role),
      ...(account.profile.roles ?? []),
    ]),
  )
}

export function getAccountRoleLabel(role: AccountRole): string {
  return accountRoles.find((option) => option.value === role)?.label ?? role
}

export function validateAccountIdentity(
  fullName: string,
  email: string,
): { fullName: string | null; email: string | null } {
  const name = fullName.trim()
  const normalizedEmail = email.trim()
  return {
    fullName:
      name.length === 0
        ? 'Enter the account holder’s full name.'
        : name.length > 150
          ? 'Full name must be 150 characters or fewer.'
          : null,
    email:
      normalizedEmail.length === 0
        ? 'Enter a VSU email address.'
        : normalizedEmail.length > 254 ||
            !/^[^\s@]+@vsu\.edu\.ph$/i.test(normalizedEmail)
          ? 'Use an institutional email ending in @vsu.edu.ph.'
          : null,
  }
}
