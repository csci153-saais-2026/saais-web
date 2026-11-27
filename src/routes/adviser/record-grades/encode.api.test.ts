import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  getRoster: vi.fn(),
  getChecklist: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiClient: { GET: mocks.get },
  };
});

vi.mock("../advisees/advisees.api", () => ({
  getRoster: mocks.getRoster,
}));

vi.mock("../advisees/checklist/record.api", () => ({
  getChecklist: mocks.getChecklist,
}));

import { ApiClientError, normalizeApiError } from "@/lib/api";
import { getTermOfferings } from "./encode.api";

afterEach(() => {
  vi.resetAllMocks();
});

describe("getTermOfferings", () => {
  it("falls back to a smaller page after a server error", async () => {
    const serverError = new ApiClientError(
      normalizeApiError(
        { code: "UNKNOWN_API_ERROR", message: "Server failure" },
        new Response(null, { status: 500 }),
      ),
    );
    mocks.get.mockImplementation(
      (path: string, options: { params: { query: { limit?: number } } }) => {
        if (path === "/rest/v1/course") {
          return Promise.resolve({
            data: [{ id: "course-one", is_elective: false }],
            error: undefined,
            response: new Response(null, { status: 200 }),
          });
        }
        if (options.params.query.limit === 1000) {
          return Promise.resolve({
            data: undefined,
            error: serverError,
            response: new Response(null, { status: 500 }),
          });
        }
        return Promise.resolve({
          data: [
            {
              offering: { id: "offering-one", course_id: "course-one" },
              code: "CS 1",
              title: "Computing",
            },
          ],
          error: undefined,
          response: new Response(null, { status: 200 }),
        });
      },
    );

    await expect(getTermOfferings("student-one", "term-one")).resolves.toEqual([
      expect.objectContaining({
        offering: { id: "offering-one", course_id: "course-one" },
        is_elective: false,
      }),
    ]);

    const offeringCalls = mocks.get.mock.calls.filter(
      ([path]) =>
        path === "/functions/v1/students/{student_id}/course-offerings",
    );
    expect(offeringCalls).toHaveLength(2);
    expect(offeringCalls[0][1].params.query.limit).toBe(1000);
    expect(offeringCalls[1][1].params.query.limit).toBe(100);
  });
});
