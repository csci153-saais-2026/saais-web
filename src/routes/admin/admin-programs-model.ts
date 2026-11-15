import type { OperationQuery } from '@/lib/api'
import type { ApiSchema } from '@/lib/api'

export const PROGRAM_PAGE_SIZE = 20
export const PROGRAM_SEARCH_MAX_LENGTH = 100

export type ProgramStatusFilter = 'all' | 'active' | 'inactive' | 'archived'
export type ProgramStatus = ApiSchema<'ProgramStatus'>

export interface ProgramFormValues {
  readonly code: string
  readonly name: string
  readonly duration: string
  readonly facultyId: string
  readonly departmentId: string
  readonly status: ProgramStatus
}

export type ProgramFormErrors = Partial<Record<keyof ProgramFormValues, string>>

export function validateProgramForm(
  values: ProgramFormValues,
  departments: readonly Pick<
    ApiSchema<'Department'>,
    'id' | 'faculty_id'
  >[],
  faculties: readonly Pick<ApiSchema<'Faculty'>, 'id'>[],
): ProgramFormErrors {
  const errors: ProgramFormErrors = {}
  const code = values.code.trim()
  const name = values.name.trim()
  const duration = Number(values.duration)

  if (code.length < 2 || code.length > 250) {
    errors.code = 'Enter a program code between 2 and 250 characters.'
  }
  if (name.length < 3 || name.length > 250) {
    errors.name = 'Enter a program name between 3 and 250 characters.'
  }
  if (!values.duration.trim() || !Number.isFinite(duration) || duration < 1) {
    errors.duration = 'Enter a valid duration of at least 1 year.'
  }
  if (!faculties.some((faculty) => faculty.id === values.facultyId)) {
    errors.facultyId = 'Select a faculty.'
  }
  const department = departments.find(
    (item) => item.id === values.departmentId,
  )
  if (!department) {
    errors.departmentId = 'Select a department.'
  } else if (department.faculty_id !== values.facultyId) {
    errors.departmentId = 'Choose a department in the selected faculty.'
  }

  return errors
}

export function buildProgramListQuery(
  search: string,
  status: ProgramStatusFilter,
  offset: number,
): {
  readonly query: OperationQuery<'listPrograms'> | null
  readonly error: string | null
} {
  const term = search.trim()
  if (term.length > PROGRAM_SEARCH_MAX_LENGTH) {
    return {
      query: null,
      error: `Search must be ${PROGRAM_SEARCH_MAX_LENGTH} characters or fewer.`,
    }
  }
  if (
    /[(),]/.test(term) ||
    [...term].some((character) => {
      const code = character.charCodeAt(0)
      return code < 32 || code === 127
    })
  ) {
    return {
      query: null,
      error: 'Search cannot include commas, parentheses, or control characters.',
    }
  }

  const query: OperationQuery<'listPrograms'> = {
    select: 'id,code,name,nominal_duration,status,department_id',
    order: 'name.asc,id.asc',
    limit: PROGRAM_PAGE_SIZE,
    offset,
  }

  if (term) {
    query.or = `(code.ilike.%${term}%,name.ilike.%${term}%)`
  }
  if (status !== 'all') {
    query.status = `eq.${status}`
  }

  return { query, error: null }
}
