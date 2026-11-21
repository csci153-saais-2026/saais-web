import { unwrapApiResult } from "@/lib/api"

const PAGE_SIZE = 100

/**
 * Loads every row of a paginated PostgREST collection. Callers must pass a
 * stable `order` so offset pages never overlap. Failed responses throw.
 */
export async function fetchAllPages<T>(
  fetchPage: (
    limit: number,
    offset: number
  ) => Promise<{ data?: T[]; error?: unknown; response: Response }>,
  identify: (row: T) => string
): Promise<T[]> {
  const rows: T[] = []
  const seen = new Set<string>()
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = unwrapApiResult(await fetchPage(PAGE_SIZE, offset))
    for (const row of page) {
      const key = identify(row)
      if (seen.has(key)) {
        throw new Error("Pagination returned duplicate rows.")
      }
      seen.add(key)
      rows.push(row)
    }
    if (page.length < PAGE_SIZE) return rows
  }
}
