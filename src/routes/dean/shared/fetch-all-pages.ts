import { parseContentRange, postgrestFilter, unwrapApiResult } from "@/lib/api";

const PAGE_SIZE = 1000;
const IN_FILTER_SIZE = 50;
export const MAX_COLLECTION_OFFSET = 100_000;

type PageResult<T> = {
  data?: T[];
  error?: unknown;
  response: Response;
};

/** Read a complete PostgREST collection or fail instead of presenting a partial report. */
export async function fetchAllPages<T>(
  fetchPage: (limit: number, offset: number) => Promise<PageResult<T>>,
  resource: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset <= MAX_COLLECTION_OFFSET;) {
    const result = await fetchPage(PAGE_SIZE, offset);
    const page = unwrapApiResult<T[]>(result);
    if (!Array.isArray(page))
      throw new Error(`${resource} returned invalid data.`);
    if (result.response.status === 206) {
      throw new Error(
        `${resource} returned a partial page; the result is incomplete.`,
      );
    }
    rows.push(...page);
    const range = parseContentRange(
      result.response.headers.get("Content-Range"),
    );
    if (range?.total != null) {
      if (rows.length >= range.total) return rows;
      if (page.length === 0) {
        throw new Error(
          `${resource} was truncated before all ${range.total} records were read.`,
        );
      }
    } else if (page.length < PAGE_SIZE) {
      return rows;
    }
    offset += page.length;
  }
  throw new Error(
    `${resource} exceeds the maximum page offset; the result is incomplete.`,
  );
}

/** Read related rows without requesting an unfiltered collection. */
export async function fetchRelatedRows<T>(
  ids: readonly string[],
  fetchPage: (
    filter: string,
    limit: number,
    offset: number,
  ) => Promise<PageResult<T>>,
  resource: string,
): Promise<T[]> {
  const uniqueIds = [...new Set(ids)];
  const rows: T[] = [];
  for (let index = 0; index < uniqueIds.length; index += IN_FILTER_SIZE) {
    const filter = postgrestFilter.inList(
      uniqueIds.slice(index, index + IN_FILTER_SIZE),
    );
    const batch = await fetchAllPages(
      (limit, offset) => fetchPage(filter, limit, offset),
      resource,
    );
    rows.push(...batch);
  }
  return rows;
}
