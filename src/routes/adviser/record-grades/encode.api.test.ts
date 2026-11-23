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

import { getTermOfferings } from "./encode.api";

afterEach(() => {
  vi.resetAllMocks();
});

describe("getTermOfferings", () => {
  it("uses bounded pages instead of the failing limit=1000 request", async () => {
    mocks.get.mockImplementation(
      (
        path: string,
        options: { params: { query: { limit?: number; offset?: number } } },
      ) => {
        if (path === "/rest/v1/course") {
          return Promise.resolve({
            data: [{ id: "course-one", is_elective: false }],
            error: undefined,
            response: new Response(null, { status: 200 }),
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
    expect(offeringCalls).toHaveLength(1);
    expect(offeringCalls[0][1].params.query.limit).toBe(100);
    expect(offeringCalls[0][1].params.query.offset).toBe(0);
  });

  it("keeps later offering pages searchable", async () => {
    mocks.get.mockImplementation(
      (path: string, options: { params: { query: { offset?: number } } }) => {
        if (path === "/rest/v1/course") {
          return Promise.resolve({
            data: [
              { id: "course-one", is_elective: false },
              { id: "course-elective", is_elective: true },
            ],
            error: undefined,
            response: new Response(null, { status: 200 }),
          });
        }
        const offset = options.params.query.offset ?? 0;
        const data =
          offset === 0
            ? Array.from({ length: 100 }, (_, index) => ({
                offering: { id: `offering-${index}`, course_id: "course-one" },
                code: `CS ${index}`,
                title: "Required course",
              }))
            : [
                {
                  offering: {
                    id: "elective-offering",
                    course_id: "course-elective",
                  },
                  code: "EL 101",
                  title: "Elective course",
                },
              ];
        return Promise.resolve({
          data,
          error: undefined,
          response: new Response(null, { status: 200 }),
        });
      },
    );

    await expect(getTermOfferings("student-one", "term-one")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "EL 101", is_elective: true }),
      ]),
    );

    const offeringCalls = mocks.get.mock.calls.filter(
      ([path]) =>
        path === "/functions/v1/students/{student_id}/course-offerings",
    );
    expect(
      offeringCalls.map(([, options]) => options.params.query.offset),
    ).toEqual([0, 100]);
  });
});
