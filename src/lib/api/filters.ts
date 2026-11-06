import type { ContentRangeInfo } from './types'

const MAX_POSTGREST_IN_ITEMS = 50
const CONTENT_RANGE_PATTERN = /^(?:(\d+)-(\d+)|\*)\/(\d+|\*)$/

/**
 * Type-safe builders for operator-prefixed PostgREST query parameters
 * documented in `contract/openapi.yaml` (`eq.`, `neq.`, `in.(...)`, `is.null`,
 * and date/timestamp range comparisons).
 */
export const postgrestFilter = {
  eq<T extends string | number | boolean>(value: T): `eq.${T}` {
    return `eq.${value}`
  },

  neq<T extends string | number | boolean>(value: T): `neq.${T}` {
    return `neq.${value}`
  },

  inList(values: readonly string[]): string {
    if (values.length === 0) {
      throw new RangeError(
        'postgrestFilter.inList requires at least 1 identifier.',
      )
    }
    if (values.length > MAX_POSTGREST_IN_ITEMS) {
      throw new RangeError(
        `postgrestFilter.inList exceeds the contract maximum of ${MAX_POSTGREST_IN_ITEMS} items (received ${values.length}).`,
      )
    }
    return `in.(${values.join(',')})`
  },

  isNull(): 'is.null' {
    return 'is.null'
  },

  notIsNull(): 'not.is.null' {
    return 'not.is.null'
  },

  gte(value: string): `gte.${string}` {
    return `gte.${value}`
  },

  lte(value: string): `lte.${string}` {
    return `lte.${value}`
  },

  gt(value: string): `gt.${string}` {
    return `gt.${value}`
  },

  lt(value: string): `lt.${string}` {
    return `lt.${value}`
  },
} as const

/**
 * Parses a PostgREST `Content-Range` header such as `"0-19/142"` or indeterminate total ranges.
 * Returns `null` when the header is absent or malformed.
 */
export function parseContentRange(
  headerValue: string | null | undefined,
): ContentRangeInfo | null {
  if (!headerValue) return null
  const match = CONTENT_RANGE_PATTERN.exec(headerValue.trim())
  if (!match) return null

  const start = match[1] !== undefined ? Number.parseInt(match[1], 10) : null
  const end = match[2] !== undefined ? Number.parseInt(match[2], 10) : null
  const total =
    match[3] !== undefined && match[3] !== '*'
      ? Number.parseInt(match[3], 10)
      : null

  return { start, end, total }
}
