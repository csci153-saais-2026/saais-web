import {
  apiClient,
  parseContentRange,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from '@/lib/api'

const READ_LIMIT = 1000
const BATCH_SIZE = 50

export type CourseOffering = ApiSchema<'CourseOffering'>
export type Course = ApiSchema<'Course'>

export interface OpenedSubject {
  readonly offering: CourseOffering
  readonly course: Course
}

function completeRead<T>(
  result: { data?: T[]; error?: unknown; response: Response },
  resource: string,
): T[] {
  const rows = unwrapApiResult<T[]>(result)
  if (!Array.isArray(rows)) {
    throw new Error(`${resource} returned invalid data.`)
  }

  const range = parseContentRange(result.response.headers.get('Content-Range'))
  if (
    rows.length >= READ_LIMIT ||
    result.response.status === 206 ||
    (range?.total != null && range.total > rows.length)
  ) {
    throw new Error(
      `${resource} reached the ${READ_LIMIT}-row read limit. A complete offering list could not be loaded.`,
    )
  }

  return rows
}

async function batches<T>(
  ids: readonly string[],
  read: (batch: string[]) => Promise<T[]>,
): Promise<T[]> {
  const uniqueIds = [...new Set(ids)]
  const results: T[] = []

  for (let start = 0; start < uniqueIds.length; start += BATCH_SIZE) {
    results.push(...await read(uniqueIds.slice(start, start + BATCH_SIZE)))
  }

  return results
}

export async function listCourseOfferings(
  schoolTermId: string,
  signal?: AbortSignal,
): Promise<OpenedSubject[]> {
  const offerings = completeRead(
    await apiClient.GET('/rest/v1/course_offering', {
      params: {
        query: {
          school_term_id: postgrestFilter.eq(schoolTermId),
          select:
            'id,school_term_id,course_id,is_by_request,section,schedule,instructor',
          order: 'course_id.asc,section.asc,id.asc',
          limit: READ_LIMIT,
          offset: 0,
        },
      },
      signal,
    }),
    'Course offerings',
  ).filter((offering) => offering.school_term_id === schoolTermId)

  const offeringIds = new Set<string>()
  for (const offering of offerings) {
    if (offeringIds.has(offering.id)) {
      throw new Error('The course offering service returned a duplicate offering.')
    }
    offeringIds.add(offering.id)
  }

  const courseIds = [...new Set(offerings.map((offering) => offering.course_id))]
  const courses = await batches(courseIds, async (ids) =>
    completeRead(
      await apiClient.GET('/rest/v1/course', {
        params: {
          query: {
            id: postgrestFilter.inList(ids),
            select: 'id,department_id,code,title,units,status,repeatable_type',
            order: 'id.asc',
            limit: READ_LIMIT,
            offset: 0,
          },
        },
        signal,
      }),
      'Course references',
    ).filter((course) => ids.includes(course.id)),
  )

  const courseById = new Map<string, Course>()
  for (const course of courses) {
    if (courseById.has(course.id)) {
      throw new Error('The course catalog returned a duplicate course reference.')
    }
    courseById.set(course.id, course)
  }

  return offerings.map((offering) => {
    const course = courseById.get(offering.course_id)
    if (!course) {
      throw new Error(
        'A course offering references a course that could not be loaded. Refresh and retry.',
      )
    }

    return { offering, course }
  })
}
