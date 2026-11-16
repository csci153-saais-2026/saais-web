import { apiClient, parseContentRange, postgrestFilter, unwrapApiResult, type ApiSchema } from '@/lib/api'
import type { NewCurriculumVersion } from './curriculum-version.schema'

const READ_LIMIT = 1000
const BATCH_SIZE = 50
export type Program = ApiSchema<'Program'>
export type CurriculumVersion = ApiSchema<'CurriculumVersion'>
export type CurriculumTerm = ApiSchema<'CurriculumTerm'>
export type CurriculumSlot = ApiSchema<'CurriculumTermCourse'>
export type Course = ApiSchema<'Course'>

export async function createCurriculumSlot(body: ApiSchema<'CurriculumTermCourseInsert'>): Promise<CurriculumSlot> {
  return unwrapApiResult<CurriculumSlot>(await apiClient.POST('/functions/v1/catalog/curriculum_term_course', { body }))
}

export async function updateCurriculumSlot(id: string, body: ApiSchema<'CurriculumTermCourseUpdate'>): Promise<CurriculumSlot> {
  return unwrapApiResult<CurriculumSlot>(await apiClient.PATCH('/functions/v1/catalog/curriculum_term_course/{id}', { params: { path: { id } }, body }))
}

export async function deleteCurriculumSlot(id: string): Promise<void> {
  unwrapApiResult(await apiClient.DELETE('/functions/v1/catalog/curriculum_term_course/{id}', { params: { path: { id } } }))
}

/** Step 22 creates empty terms only; slot creation is a separate workflow. */
export async function createCurriculumTerm(body: Pick<ApiSchema<'CurriculumTermInsert'>, 'curriculum_version_id' | 'year_level' | 'term_sequence'> & { slots: never[] }): Promise<CurriculumTerm> {
  return unwrapApiResult<CurriculumTerm>(await apiClient.POST('/functions/v1/catalog/curriculum_term', { body }))
}

export async function updateCurriculumTerm(id: string, body: ApiSchema<'CurriculumTermUpdate'>): Promise<CurriculumTerm> {
  return unwrapApiResult<CurriculumTerm>(await apiClient.PATCH('/functions/v1/catalog/curriculum_term/{id}', { params: { path: { id } }, body }))
}

export async function deleteCurriculumTerm(id: string): Promise<void> {
  unwrapApiResult(await apiClient.DELETE('/functions/v1/catalog/curriculum_term/{id}', { params: { path: { id } } }))
}

export async function createCurriculumVersion(body: NewCurriculumVersion): Promise<CurriculumVersion> {
  // Blank-version creation is approved for Step 19. Child creation is separate.
  return unwrapApiResult<CurriculumVersion>(await apiClient.POST('/functions/v1/catalog/curriculum_version', { body }))
}

export async function updateCurriculumVersion(id: string, body: ApiSchema<'CurriculumVersionUpdate'>): Promise<CurriculumVersion> {
  return unwrapApiResult<CurriculumVersion>(await apiClient.PATCH('/functions/v1/catalog/curriculum_version/{id}', {
    params: { path: { id } }, body,
  }))
}

export async function deleteCurriculumVersion(id: string): Promise<void> {
  unwrapApiResult(await apiClient.DELETE('/functions/v1/catalog/curriculum_version/{id}', {
    params: { path: { id } },
  }))
}

function completeRead<T>(result: { data?: T[]; error?: unknown; response: Response }, resource: string): T[] {
  const rows = unwrapApiResult<T[]>(result)
  if (!Array.isArray(rows)) throw new Error(`${resource} returned invalid data.`)
  const range = parseContentRange(result.response.headers.get('Content-Range'))
  // Never present a potentially truncated curriculum as a complete checklist.
  if (rows.length >= READ_LIMIT || result.response.status === 206 || (range?.total != null && range.total > rows.length)) {
    throw new Error(`${resource} reached the ${READ_LIMIT}-row read limit. A complete overview could not be loaded.`)
  }
  return rows
}

async function batches<T>(ids: string[], read: (batch: string[]) => Promise<T[]>): Promise<T[]> {
  const unique = [...new Set(ids)]
  const results: T[] = []
  for (let start = 0; start < unique.length; start += BATCH_SIZE) {
    results.push(...await read(unique.slice(start, start + BATCH_SIZE)))
  }
  return results
}

export async function listCurricula(departmentId: string, signal?: AbortSignal) {
  const programs = completeRead<Program>(await apiClient.GET('/rest/v1/program', {
    params: { query: {
      department_id: postgrestFilter.eq(departmentId),
      select: 'id,code,name,nominal_duration,status,department_id',
      order: 'code.asc,id.asc', limit: READ_LIMIT, offset: 0,
    } }, signal,
  }), 'Programs').filter(program => program.department_id === departmentId)
  const versions = await batches(programs.map(program => program.id), async ids =>
    completeRead<CurriculumVersion>(await apiClient.GET('/rest/v1/curriculum_version', {
      params: { query: {
        program_id: postgrestFilter.inList(ids),
        select: 'id,program_id,version_label,effective_start,effective_end,delinquency_threshold,total_units,status,enrolled_student_count',
        order: 'effective_start.desc,id.asc', limit: READ_LIMIT, offset: 0,
      } }, signal,
    }), 'Curriculum versions').filter(version => ids.includes(version.program_id)),
  )
  versions.sort((a, b) => b.effective_start.localeCompare(a.effective_start) || a.id.localeCompare(b.id))
  return { programs, versions }
}

/** Only pass a version selected from the resolved department's listCurricula result. */
export async function readCurriculum(versionId: string, signal?: AbortSignal) {
  const terms = completeRead<CurriculumTerm>(await apiClient.GET('/rest/v1/curriculum_term', {
    params: { query: {
      curriculum_version_id: postgrestFilter.eq(versionId),
      select: 'id,curriculum_version_id,year_level,term_sequence',
      order: 'year_level.asc,term_sequence.asc,id.asc', limit: READ_LIMIT, offset: 0,
    } }, signal,
  }), 'Curriculum terms').filter(term => term.curriculum_version_id === versionId)
  terms.sort((a, b) => a.year_level - b.year_level || a.term_sequence - b.term_sequence || a.id.localeCompare(b.id))
  const slots = await batches(terms.map(term => term.id), async ids =>
    completeRead<CurriculumSlot>(await apiClient.GET('/rest/v1/curriculum_term_course', {
      params: { query: {
        curriculum_term_id: postgrestFilter.inList(ids),
        select: 'id,curriculum_term_id,course_id,is_elective_slot,slot_type,slot_label,nominal_units',
        order: 'id.asc', limit: READ_LIMIT, offset: 0,
      } }, signal,
    }), 'Curriculum requirements').filter(slot => ids.includes(slot.curriculum_term_id)),
  )
  const courses = await batches(slots.flatMap(slot => slot.course_id ? [slot.course_id] : []), async ids =>
    completeRead<Course>(await apiClient.GET('/rest/v1/course', {
      params: { query: {
        id: postgrestFilter.inList(ids),
        select: 'id,department_id,code,title,units,status,repeatable_type',
        order: 'id.asc', limit: READ_LIMIT, offset: 0,
      } }, signal,
    }), 'Course references').filter(course => ids.includes(course.id)),
  )
  return { terms, slots, courses }
}

/** Active course choices are restricted to the resolved department. */
export async function listCurriculumCourses(departmentId: string, signal?: AbortSignal): Promise<Course[]> {
  return completeRead<Course>(await apiClient.GET('/rest/v1/course', {
    params: { query: {
      department_id: postgrestFilter.eq(departmentId),
      status: postgrestFilter.eq('active'),
      select: 'id,department_id,code,title,units,status,repeatable_type',
      order: 'code.asc,id.asc', limit: READ_LIMIT, offset: 0,
    } }, signal,
  }), 'Department courses').filter(course => course.department_id === departmentId && course.status === 'active')
}
