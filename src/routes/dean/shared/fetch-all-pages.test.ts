import { describe, expect, it } from "vitest";
import { fetchAllPages } from "./fetch-all-pages";

describe("fetchAllPages", () => {
  it("reads every page when a collection is larger than one server page", async () => {
    const seen: number[] = [];
    const result = await fetchAllPages(async (_limit, offset) => {
      seen.push(offset);
      const data = Array.from(
        { length: Math.min(1000, 2050 - offset) },
        (_, i) => offset + i,
      );
      return {
        data,
        response: new Response(null, {
          status: 200,
          headers: {
            "Content-Range": `${offset}-${offset + data.length - 1}/2050`,
          },
        }),
      };
    }, "Test records");

    expect(seen).toEqual([0, 1000, 2000]);
    expect(result).toHaveLength(2050);
    expect(result.at(-1)).toBe(2049);
  });

  it("reports a truncated response instead of returning incomplete data", async () => {
    await expect(
      fetchAllPages(
        async () => ({
          data: [],
          response: new Response(null, {
            status: 200,
            headers: { "Content-Range": "*/5" },
          }),
        }),
        "Test records",
      ),
    ).rejects.toThrow("truncated");
  });
});
