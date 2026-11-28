import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { loginAsMockPersona, logoutMockPersona } from "@/mocks";
import { saaisMockServer } from "@/mocks/node";

let api: typeof import("./student-catalog.api");

beforeAll(async () => {
  saaisMockServer.listen();
  api = await import("./student-catalog.api");
});
afterEach(() => {
  saaisMockServer.resetHandlers();
  logoutMockPersona();
});
afterAll(() => saaisMockServer.close());

describe("student catalog reference reads", () => {
  it("deduplicates IDs and fetches every requested row in batches of at most 50", async () => {
    loginAsMockPersona("student");
    const ids = Array.from(
      { length: 53 },
      (_, index) =>
        `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );
    const requests: URLSearchParams[] = [];
    saaisMockServer.use(
      http.get("*/rest/v1/course", ({ request }) => {
        const { searchParams } = new URL(request.url);
        requests.push(searchParams);
        const filter = searchParams.get("id") ?? "";
        return HttpResponse.json(
          filter
            .slice(4, -1)
            .split(",")
            .map((id) => ({ id })),
        );
      }),
    );

    const result = await api.fetchStudentCourses([null, ...ids, ids[0]]);

    expect(result.map((row) => row.id)).toEqual(ids);
    expect(requests.map((query) => query.get("limit"))).toEqual(["50", "3"]);
    expect(requests.map((query) => query.get("id"))).toEqual([
      `in.(${ids.slice(0, 50).join(",")})`,
      `in.(${ids.slice(50).join(",")})`,
    ]);
    await expect(api.fetchStudentCourses([undefined, null])).resolves.toEqual(
      [],
    );
    expect(requests).toHaveLength(2);
  });
});
