import {
  apiClient,
  parseContentRange,
  postgrestFilter,
  unwrapApiResult,
} from '@/lib/api'
import type {
  ApiSchema,
  OperationQuery,
  OperationResponse,
} from '@/lib/api'

const FILTER_REFERENCE_LIMIT = 1000
const PROGRAM_FILTER_BATCH_SIZE = 50

export type StudentRosterFilters = Pick<
  OperationQuery<'listStudentRoster'>,
  | 'limit'
  | 'offset'
  | 'search'
  | 'curriculum_version_id'
  | 'adviser_id'
>

type StudentRosterQuery = StudentRosterFilters &
  Pick<OperationQuery<'listStudentRoster'>, 'department_id'>

export interface StudentFilterOption {
  readonly id: string
  readonly label: string
}

export interface StudentRosterFilterOptions {
  readonly curricula: readonly StudentFilterOption[]
  readonly advisers: readonly StudentFilterOption[]
}

function assertCompleteReferenceRead<T>(
  rows: readonly T[],
  resource: string,
): void {
  if (rows.length >= FILTER_REFERENCE_LIMIT) {
    throw new Error(
      `${resource} filter options reached the ${FILTER_REFERENCE_LIMIT}-row reference-read limit; completeness could not be confirmed.`,
    )
  }
}

function completeReferenceRead<T>(
  result: { data?: T[]; error?: unknown; response: Response },
  resource: string,
): T[] {
  const rows = unwrapApiResult<T[]>(result)
  if (!Array.isArray(rows)) {
    throw new Error(`${resource} reference read returned invalid data.`)
  }
  const range = parseContentRange(result.response.headers.get('Content-Range'))
  if (
    rows.length >= FILTER_REFERENCE_LIMIT ||
    result.response.status === 206 ||
    (range?.total != null && range.total > rows.length)
  ) {
    throw new Error(
      `${resource} reference read was incomplete; eligibility could not be confirmed.`,
    )
  }
  return rows
}

export function listStudentRoster(
  query: StudentRosterQuery,
  signal?: AbortSignal,
): Promise<OperationResponse<'listStudentRoster'>> {
  return apiClient
    .GET('/functions/v1/students', {
      params: { query },
      signal,
    })
    .then((result) => {
      const roster = unwrapApiResult<OperationResponse<'listStudentRoster'>>(
        result,
      )
      if (!roster || !Array.isArray(roster.items)) {
        throw new Error('The student roster service returned an invalid response.')
      }
      return roster
    })
}

async function listDepartmentPrograms(
  departmentId: string,
  signal?: AbortSignal,
): Promise<ApiSchema<'Program'>[]> {
  const result = await apiClient.GET('/rest/v1/program', {
    params: {
      query: {
        department_id: postgrestFilter.eq(departmentId),
        limit: FILTER_REFERENCE_LIMIT,
        offset: 0,
        select: 'id,code,name,nominal_duration,status,department_id',
        order: 'name.asc,id.asc',
      },
    },
    signal,
  })
  const programs = unwrapApiResult<ApiSchema<'Program'>[]>(result)
  if (!Array.isArray(programs)) {
    throw new Error('The department program reference read returned invalid data.')
  }
  assertCompleteReferenceRead(programs, 'Department program')
  return programs
}

async function listDepartmentCurricula(
  departmentId: string,
  signal?: AbortSignal,
): Promise<StudentFilterOption[]> {
  const programs = await listDepartmentPrograms(departmentId, signal)
  const programLabels = new Map(
    programs.map((program) => [program.id, program.code]),
  )
  const programBatches: string[][] = []

  for (
    let start = 0;
    start < programs.length;
    start += PROGRAM_FILTER_BATCH_SIZE
  ) {
    programBatches.push(
      programs
        .slice(start, start + PROGRAM_FILTER_BATCH_SIZE)
        .map((program) => program.id),
    )
  }

  const curriculumGroups = await Promise.all(
    programBatches.map(async (programIds) => {
      const result = await apiClient.GET('/rest/v1/curriculum_version', {
        params: {
          query: {
            program_id: postgrestFilter.inList(programIds),
            limit: FILTER_REFERENCE_LIMIT,
            offset: 0,
            select:
              'id,program_id,version_label,effective_start,delinquency_threshold,total_units,status',
            order: 'version_label.asc,id.asc',
          },
        },
        signal,
      })
      const versions = unwrapApiResult<ApiSchema<'CurriculumVersion'>[]>(
        result,
      )
      if (!Array.isArray(versions)) {
        throw new Error(
          'The curriculum reference read returned invalid data.',
        )
      }
      assertCompleteReferenceRead(versions, 'Curriculum')
      return versions
    }),
  )

  return curriculumGroups
    .flat()
    .map((version) => ({
      id: version.id,
      label: `${programLabels.get(version.program_id) ?? 'Program'} — ${version.version_label}`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

async function listDepartmentAdvisers(
  departmentId: string,
  signal?: AbortSignal,
): Promise<StudentFilterOption[]> {
  const assignmentsResult = await apiClient.GET('/rest/v1/role_assignment', {
    params: {
      query: {
        role: postgrestFilter.eq('adviser'),
        department_id: postgrestFilter.eq(departmentId),
        select: 'id,profile_id,role,department_id',
        order: 'profile_id.asc,id.asc',
        limit: FILTER_REFERENCE_LIMIT,
        offset: 0,
      },
    },
    signal,
  })
  const assignments = completeReferenceRead<ApiSchema<'RoleAssignment'>>(
    assignmentsResult,
    'Department adviser assignments',
  ).filter(
    (assignment) =>
      assignment.role === 'adviser' &&
      assignment.department_id === departmentId,
  )
  const adviserIds = [...new Set(assignments.map((assignment) => assignment.profile_id))]
  const adviserBatches: string[][] = []
  for (
    let start = 0;
    start < adviserIds.length;
    start += PROGRAM_FILTER_BATCH_SIZE
  ) {
    adviserBatches.push(
      adviserIds.slice(start, start + PROGRAM_FILTER_BATCH_SIZE),
    )
  }

  const adviserProfiles = await Promise.all(
    adviserBatches.map(async (ids) => {
      const result = await apiClient.GET('/rest/v1/profile', {
        params: {
          query: {
            id: postgrestFilter.inList(ids),
            status: postgrestFilter.eq('active'),
            select: 'id,full_name,status',
            order: 'full_name.asc,id.asc',
            limit: FILTER_REFERENCE_LIMIT,
            offset: 0,
          },
        },
        signal,
      })
      return completeReferenceRead<ApiSchema<'Profile'>>(
        result,
        'Active department adviser profiles',
      ).filter(
        (profile) =>
          ids.includes(profile.id) &&
          profile.status === 'active' &&
          typeof profile.full_name === 'string' &&
          profile.full_name.trim().length > 0,
      )
    }),
  )

  return adviserProfiles
    .flat()
    .map((profile) => ({ id: profile.id, label: profile.full_name }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

export async function listStudentFilterOptions(
  departmentId: string,
  signal?: AbortSignal,
): Promise<StudentRosterFilterOptions> {
  const [curricula, advisers] = await Promise.all([
    listDepartmentCurricula(departmentId, signal),
    listDepartmentAdvisers(departmentId, signal),
  ])
  return { curricula, advisers }
}
