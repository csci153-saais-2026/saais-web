import { parseContentRange, unwrapApiResult } from "@/lib/api";

const PAGE_SIZE = 1000;

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
  for (let offset = 0; ; offset += PAGE_SIZE) {
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
  }
}
