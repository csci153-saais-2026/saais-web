import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  createCourseOffering,
  deleteCourseOffering,
  listCourseOfferings,
  updateCourseOffering,
  type Course,
  type CourseOffering,
  type CourseOfferingInsert,
  type CourseOfferingUpdate,
} from "./course-offerings.api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiClient: actual.createSaaisApiClient({
      baseUrl: "http://localhost:3000",
      mode: "mock",
      getAccessToken: async () => "mock-course-offerings-test",
      fetch: (...args) => globalThis.fetch(...args),
    }),
  };
});

const server = setupServer();
const termId = "term-1";

function offering(
  id: string,
  courseId: string,
  overrides: Partial<CourseOffering> = {},
): CourseOffering {
  return {
    id,
    school_term_id: termId,
    course_id: courseId,
    is_by_request: false,
    section: "A",
    schedule: "MWF 09:00-10:00",
    instructor: "Instructor",
    ...overrides,
  };
}

function course(id: string): Course {
  return {
    id,
    department_id: "department-1",
    code: id.toUpperCase(),
    title: `Course ${id}`,
    units: 3,
    status: "active",
    repeatable_type: "none",
  };
}

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Course offering reads", () => {
  it("loads explicit term offerings and enriches them from authoritative course units", async () => {
    const offerings = [
      offering("offering-1", "course-1"),
      offering("offering-2", "course-1", { section: "B" }),
      offering("offering-3", "course-2", { is_by_request: true }),
      offering("foreign-offering", "course-foreign", {
        school_term_id: "another-term",
      }),
    ];

    server.use(
      http.get("*/rest/v1/course_offering", ({ request }) => {
        const query = new URL(request.url).searchParams;
        expect(query.get("school_term_id")).toBe("eq.term-1");
        expect(query.get("limit")).toBe("1000");
        expect(query.get("select")).toContain("is_by_request");
        return HttpResponse.json(offerings);
      }),
      http.get("*/rest/v1/course", ({ request }) => {
        const query = new URL(request.url).searchParams;
        expect(query.get("id")).toBe("in.(course-1,course-2)");
        expect(query.get("select")).toContain("units");
        return HttpResponse.json([course("course-1"), course("course-2")]);
      }),
    );

    await expect(listCourseOfferings(termId)).resolves.toEqual([
      { offering: offerings[0], course: course("course-1") },
      { offering: offerings[1], course: course("course-1") },
      { offering: offerings[2], course: course("course-2") },
    ]);
  });

  it("batches course reference reads within the 50-ID contract limit", async () => {
    const offerings = Array.from({ length: 51 }, (_, index) =>
      offering(`offering-${index}`, `course-${index}`),
    );
    const batchSizes: number[] = [];

    server.use(
      http.get("*/rest/v1/course_offering", () => HttpResponse.json(offerings)),
      http.get("*/rest/v1/course", ({ request }) => {
        const filter = new URL(request.url).searchParams.get("id") ?? "";
        const ids = filter.slice("in.(".length, -1).split(",");
        batchSizes.push(ids.length);
        return HttpResponse.json(ids.map(course));
      }),
    );

    await expect(listCourseOfferings(termId)).resolves.toHaveLength(51);
    expect(batchSizes).toEqual([50, 1]);
  });

  it("rejects partial offering reads instead of presenting them as complete", async () => {
    server.use(
      http.get("*/rest/v1/course_offering", () =>
        HttpResponse.json([], {
          status: 206,
          headers: { "Content-Range": "0-9/20" },
        }),
      ),
    );

    await expect(listCourseOfferings(termId)).rejects.toThrow(
      "A complete offering list could not be loaded.",
    );
  });

  it("surfaces a missing course reference instead of omitting its offering", async () => {
    server.use(
      http.get("*/rest/v1/course_offering", () =>
        HttpResponse.json([offering("offering-1", "course-missing")]),
      ),
      http.get("*/rest/v1/course", () => HttpResponse.json([])),
    );

    await expect(listCourseOfferings(termId)).rejects.toThrow(
      "A course offering references a course that could not be loaded.",
    );
  });
});

describe("Course offering writes", () => {
  it("creates with the exact selected term, course and offering fields", async () => {
    const body: CourseOfferingInsert = {
      school_term_id: termId,
      course_id: "course-1",
      section: null,
      schedule: null,
      instructor: "Instructor",
      is_by_request: true,
    };
    const saved = offering("offering-created", "course-1", body);

    server.use(
      http.post(
        "*/functions/v1/catalog/course_offering",
        async ({ request }) => {
          expect(await request.json()).toEqual(body);
          return HttpResponse.json(saved, { status: 201 });
        },
      ),
    );

    await expect(createCourseOffering(body)).resolves.toEqual(saved);
  });

  it("updates only fields allowed by the contract", async () => {
    const body: CourseOfferingUpdate = {
      section: "B",
      schedule: null,
      instructor: "Updated instructor",
      is_by_request: false,
    };
    const saved = offering("offering-existing", "course-1", body);

    server.use(
      http.patch(
        "*/functions/v1/catalog/course_offering/:id",
        async ({ request, params }) => {
          expect(params.id).toBe("offering-existing");
          expect(await request.json()).toEqual(body);
          return HttpResponse.json(saved);
        },
      ),
    );

    await expect(
      updateCourseOffering("offering-existing", body),
    ).resolves.toEqual(saved);
  });

  it("deletes only through the transactional catalog operation", async () => {
    server.use(
      http.delete(
        "*/functions/v1/catalog/course_offering/:id",
        ({ params }) => {
          expect(params.id).toBe("offering-existing");
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    await expect(
      deleteCourseOffering("offering-existing"),
    ).resolves.toBeUndefined();
  });

  it("surfaces server-protected conflicts without treating them as success", async () => {
    server.use(
      http.delete("*/functions/v1/catalog/course_offering/:id", () =>
        HttpResponse.json(
          {
            code: "CONFLICT",
            message: "Academic history protects this offering.",
          },
          { status: 409 },
        ),
      ),
    );

    await expect(
      deleteCourseOffering("offering-existing"),
    ).rejects.toMatchObject({ isConflict: true });
  });
});
