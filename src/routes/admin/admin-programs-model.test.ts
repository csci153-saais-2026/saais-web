import { describe, expect, it } from 'vitest'
import {
  buildProgramListQuery,
  PROGRAM_PAGE_SIZE,
  PROGRAM_SEARCH_MAX_LENGTH,
} from './admin-programs-model'

describe('buildProgramListQuery', () => {
  it('uses a safe projection and bounded stable pagination', () => {
    expect(buildProgramListQuery('', 'all', 0)).toEqual({
      query: {
        select: 'id,code,name,nominal_duration,status,department_id',
        order: 'name.asc,id.asc',
        limit: PROGRAM_PAGE_SIZE,
        offset: 0,
      },
      error: null,
    })
  })

  it('adds server-side search and lifecycle filters', () => {
    expect(buildProgramListQuery('Computer Science', 'active', 20)).toEqual({
      query: {
        select: 'id,code,name,nominal_duration,status,department_id',
        order: 'name.asc,id.asc',
        limit: PROGRAM_PAGE_SIZE,
        offset: 20,
        or: '(code.ilike.%Computer Science%,name.ilike.%Computer Science%)',
        status: 'eq.active',
      },
      error: null,
    })
  })

  it('rejects search text that could alter the PostgREST filter expression', () => {
    expect(buildProgramListQuery('CS),status.eq.active,(', 'all', 0)).toEqual({
      query: null,
      error: 'Search cannot include commas, parentheses, or control characters.',
    })
  })

  it('rejects searches longer than the contract limit', () => {
    expect(
      buildProgramListQuery('x'.repeat(PROGRAM_SEARCH_MAX_LENGTH + 1), 'all', 0),
    ).toEqual({
      query: null,
      error: `Search must be ${PROGRAM_SEARCH_MAX_LENGTH} characters or fewer.`,
    })
  })
})
