import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api";
import { readAllCourses } from "./catalog";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("catalog reads", () => {
  it("requests every page with an explicit limit and stable order", async () => {
    const full = Array.from({ length: 1000 }, (_, index) => ({ id: index }));
    const get = vi
      .spyOn(apiClient, "GET")
      .mockResolvedValueOnce({ data: full, response: new Response() } as never)
      .mockResolvedValueOnce({
        data: [{ id: 1000 }],
        response: new Response(),
      } as never);

    await expect(readAllCourses()).resolves.toHaveLength(1001);
    expect(get.mock.calls).toEqual(
      [0, 1000].map((offset) => [
        "/rest/v1/course",
        { params: { query: { order: "id.asc", limit: 1000, offset } } },
      ]),
    );
  });
});
