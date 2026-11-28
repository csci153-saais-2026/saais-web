import { parseContentRange, unwrapApiResult } from "@/lib/api";

const PAGE_SIZE = 100;
const MAX_OFFSET = 100_000;

/**
 * Loads every row of a paginated PostgREST collection. Callers must pass a
 * stable `order` so offset pages never overlap. Failed responses throw.
 */
export async function fetchAllPages<T>(
  fetchPage: (
    limit: number,
    offset: number,
  ) => Promise<{ data?: T[]; error?: unknown; response: Response }>,
  identify: (row: T) => string,
): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<string>();
  for (let offset = 0; ;) {
    if (offset > MAX_OFFSET) {
      throw new Error(
        "Pagination reached the API offset limit before all records were read.",
      );
    }
    const result = await fetchPage(PAGE_SIZE, offset);
    const page = unwrapApiResult(result);
    for (const row of page) {
      const key = identify(row);
      if (seen.has(key)) {
        throw new Error("Pagination returned duplicate rows.");
      }
      seen.add(key);
      rows.push(row);
    }
    const range = parseContentRange(
      result.response.headers.get("Content-Range"),
    );
    if (range?.total != null) {
      if (rows.length >= range.total) return rows;
      if (page.length === 0) {
        throw new Error(
          `Pagination was truncated before all ${range.total} records were read.`,
        );
      }
    } else if (page.length < PAGE_SIZE) {
      return rows;
    }
    offset += page.length;
  }
}
