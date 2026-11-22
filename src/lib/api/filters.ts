import type { ContentRangeInfo } from "./types";

const MAX_POSTGREST_IN_ITEMS = 50;
const CONTENT_RANGE_PATTERN = /^(?:(\d+)-(\d+)|\*)\/(\d+|\*)$/;

/**
 * Type-safe builders for operator-prefixed PostgREST query parameters
 * documented in `contract/openapi.yaml` (`eq.`, `neq.`, `in.(...)`, `is.null`,
 * and date/timestamp range comparisons).
 */
export const postgrestFilter = {
  eq<T extends string | number | boolean>(value: T): `eq.${T}` {
    return `eq.${value}`;
  },

  neq<T extends string | number | boolean>(value: T): `neq.${T}` {
    return `neq.${value}`;
  },

  inList(values: readonly string[]): string {
    if (values.length === 0) {
      throw new RangeError(
        "postgrestFilter.inList requires at least 1 identifier.",
      );
    }
    if (values.length > MAX_POSTGREST_IN_ITEMS) {
      throw new RangeError(
        `postgrestFilter.inList exceeds the contract maximum of ${MAX_POSTGREST_IN_ITEMS} items (received ${values.length}).`,
      );
    }
    if (values.some((value) => !/^[A-Za-z0-9_-]+$/.test(value)))
      throw new TypeError(
        "inList items must contain only letters, digits, underscores, or hyphens.",
      );
    return `in.(${values.join(",")})`;
  },

  isNull(): "is.null" {
    return "is.null";
  },

  notIsNull(): "not.is.null" {
    return "not.is.null";
  },

  gte(value: string): `gte.${string}` {
    return `gte.${value}`;
  },

  lte(value: string): `lte.${string}` {
    return `lte.${value}`;
  },

  gt(value: string): `gt.${string}` {
    return `gt.${value}`;
  },

  lt(value: string): `lt.${string}` {
    return `lt.${value}`;
  },

  ilike(pattern: string): `ilike.${string}` {
    if (/[(),"\\]/.test(pattern))
      throw new TypeError("Pattern contains PostgREST syntax characters.");
    return `ilike.${pattern}`;
  },

  like(pattern: string): `like.${string}` {
    if (/[(),"\\]/.test(pattern))
      throw new TypeError("Pattern contains PostgREST syntax characters.");
    return `like.${pattern}`;
  },

  /**
   * Builds a bounded UTC interval. A date-only upper bound includes the whole day.
   */
  createdAtBetween(
    from: string,
    to: string,
  ): `(created_at.gte.${string},created_at.${"lt" | "lte"}.${string})` {
    const iso =
      /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/;
    if (
      !iso.test(from) ||
      !iso.test(to) ||
      !Number.isFinite(Date.parse(from)) ||
      !Number.isFinite(Date.parse(to)) ||
      (to.length === 10
        ? Date.parse(from) >= Date.parse(to) + 86_400_000
        : Date.parse(from) > Date.parse(to))
    )
      throw new TypeError("Expected an ordered ISO date or timestamp range.");
    for (const value of [from, to]) {
      const datePart = value.slice(0, 10);
      const parsed = new Date(`${datePart}T00:00:00Z`);
      if (
        datePart.startsWith("0000-") ||
        !Number.isFinite(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== datePart
      )
        throw new TypeError("Expected a valid calendar date.");
    }
    if (to.length === 10) {
      const nextDay = new Date(Date.parse(to) + 86_400_000).toISOString();
      if (nextDay.length !== 24)
        throw new RangeError("Upper date is out of range.");
      return `(created_at.gte.${from},created_at.lt.${nextDay})`;
    }
    return `(created_at.gte.${from},created_at.lte.${to})`;
  },
} as const;

/**
 * Parses a PostgREST `Content-Range` header such as `"0-19/142"` or indeterminate total ranges.
 * Returns `null` when the header is absent or malformed.
 */
export function parseContentRange(
  headerValue: string | null | undefined,
): ContentRangeInfo | null {
  if (!headerValue) return null;
  const match = CONTENT_RANGE_PATTERN.exec(headerValue.trim());
  if (!match) return null;

  const start = match[1] !== undefined ? Number.parseInt(match[1], 10) : null;
  const end = match[2] !== undefined ? Number.parseInt(match[2], 10) : null;
  const total =
    match[3] !== undefined && match[3] !== "*"
      ? Number.parseInt(match[3], 10)
      : null;

  if ([start, end, total].some((n) => n !== null && !Number.isSafeInteger(n)))
    return null;
  if (
    start !== null &&
    end !== null &&
    (start > end || (total !== null && end >= total))
  )
    return null;
  return { start, end, total };
}
