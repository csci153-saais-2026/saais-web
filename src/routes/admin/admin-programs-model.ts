import type { OperationQuery } from '@/lib/api'

export const PROGRAM_PAGE_SIZE = 20
export const PROGRAM_SEARCH_MAX_LENGTH = 100

export type ProgramStatusFilter = 'all' | 'active' | 'inactive' | 'archived'

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
  if (/[(),\u0000-\u001f]/.test(term)) {
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
