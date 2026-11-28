import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "./fetch-all-pages";

function numberedPages(total: number) {
  return vi.fn(async (limit: number, offset: number) => {
    const data = Array.from(
      { length: Math.min(limit, total - offset) },
      (_, i) => offset + i,
    );
    const contentRange = `${offset}-${offset + data.length - 1}/${total}`;
    return {
      data,
      response: new Response(null, {
        headers: { "Content-Range": contentRange },
      }),
    };
  });
}

describe("student collection pagination", () => {
  it("can finish on the last offset allowed by the gateway", async () => {
    const fetchPage = numberedPages(100_001);

    const rows = await fetchAllPages(fetchPage, String);

    expect(rows).toHaveLength(100_001);
    expect(rows.at(-1)).toBe(100_000);
    expect(fetchPage).toHaveBeenLastCalledWith(100, 100_000);
  });

  it("rejects an incomplete collection before exceeding the gateway offset", async () => {
    const fetchPage = numberedPages(100_101);

    await expect(fetchAllPages(fetchPage, String)).rejects.toThrow(
      "Pagination reached the API offset limit",
    );
    expect(fetchPage).toHaveBeenLastCalledWith(100, 100_000);
    expect(fetchPage).toHaveBeenCalledTimes(1001);
  });
});
