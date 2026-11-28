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
  createCurriculumSlot,
  createCurriculumTerm,
  createCurriculumVersion,
  deleteCurriculumSlot,
  deleteCurriculumTerm,
  deleteCurriculumVersion,
  listCurricula,
  listCurriculumCourses,
  readCurriculum,
  updateCurriculumSlot,
  updateCurriculumTerm,
  updateCurriculumVersion,
} from "./curricula.api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiClient: actual.createSaaisApiClient({
      baseUrl: "http://localhost:3000",
      mode: "mock",
      getAccessToken: async () => "mock-curriculum-test",
      fetch: (...args) => globalThis.fetch(...args),
    }),
  };
});

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Curriculum typed reads", () => {
  it("creates fixed and flexible requirements with their submitted nominal units", async () => {
    const requests: unknown[] = [];
    server.use(
      http.post(
        "*/functions/v1/catalog/curriculum_term_course",
        async ({ request }) => {
          const body = await request.json();
          requests.push(body);
          return HttpResponse.json(
            { ...(body as object), id: `slot-${requests.length}` },
            { status: 201 },
          );
        },
      ),
    );
    const fixed = {
      curriculum_term_id: "term",
      course_id: "11111111-1111-4111-8111-111111111111",
      is_elective_slot: false,
      slot_type: "required" as const,
      slot_label: null,
      nominal_units: 3.25,
    };
    const flexible = {
      curriculum_term_id: "term",
      course_id: null,
      is_elective_slot: true,
      slot_type: "elective" as const,
      slot_label: "Technical elective",
      nominal_units: 0.75,
    };
    expect(await createCurriculumSlot(fixed)).toMatchObject({
      id: "slot-1",
      curriculum_term_id: "term",
      nominal_units: 3.25,
    });
    expect(await createCurriculumSlot(flexible)).toMatchObject({
      id: "slot-2",
      curriculum_term_id: "term",
      nominal_units: 0.75,
    });
    expect(requests).toEqual([fixed, flexible]);
  });
  it("loads only active course choices from the department and drops mismatched references", async () => {
    server.use(
      http.get("*/rest/v1/course", ({ request }) => {
        const query = new URL(request.url).searchParams;
        expect(query.get("department_id")).toBe("eq.department");
        expect(query.get("status")).toBe("eq.active");
        expect(query.get("select")).toContain("department_id");
        const course = {
          code: "CS 101",
          title: "Computing",
          units: 3,
          repeatable_type: "none",
          status: "active",
        };
        return HttpResponse.json([
          { id: "active", department_id: "department", ...course },
          { id: "foreign", department_id: "other", ...course },
          {
            id: "inactive",
            department_id: "department",
            ...course,
            status: "discontinued",
          },
        ]);
      }),
    );
    await expect(listCurriculumCourses("department")).resolves.toMatchObject([
      { id: "active", department_id: "department" },
    ]);
  });
  it("updates and deletes requirements through their typed catalog endpoints", async () => {
    const body = {
      course_id: null,
      is_elective_slot: false,
      slot_type: "ge" as const,
      slot_label: "Humanities GE",
      nominal_units: 2.5,
    };
    let deletes = 0;
    server.use(
      http.patch(
        "*/functions/v1/catalog/curriculum_term_course/:id",
        async ({ request, params }) => {
          expect(params.id).toBe("slot");
          expect(await request.json()).toEqual(body);
          return HttpResponse.json({
            ...body,
            id: "slot",
            curriculum_term_id: "term",
          });
        },
      ),
      http.delete(
        "*/functions/v1/catalog/curriculum_term_course/:id",
        ({ params }) => {
          deletes++;
          expect(params.id).toBe("slot");
          return deletes === 1
            ? new HttpResponse(null, { status: 204 })
            : HttpResponse.json(
                { message: "Requirement history is protected." },
                { status: 409 },
              );
        },
      ),
    );
    expect(await updateCurriculumSlot("slot", body)).toMatchObject({
      id: "slot",
      curriculum_term_id: "term",
      nominal_units: 2.5,
    });
    await expect(deleteCurriculumSlot("slot")).resolves.toBeUndefined();
    await expect(deleteCurriculumSlot("slot")).rejects.toMatchObject({
      isConflict: true,
      message: "Requirement history is protected.",
    });
    expect(deletes).toBe(2);
  });
  it("edits and deletes via term endpoints without writing to child records", async () => {
    let writes = 0;
    server.use(
      http.patch(
        "*/functions/v1/catalog/curriculum_term/:id",
        async ({ request, params }) => {
          writes++;
          expect(params.id).toBe("term");
          expect(await request.json()).toEqual({
            year_level: 3,
            term_sequence: 2,
          });
          return HttpResponse.json({
            id: "term",
            curriculum_version_id: "version",
            year_level: 3,
            term_sequence: 2,
          });
        },
      ),
      http.delete(
        "*/functions/v1/catalog/curriculum_term/:id",
        ({ params }) => {
          writes++;
          if (params.id === "protected")
            return HttpResponse.json(
              { message: "Last term is required" },
              { status: 409 },
            );
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );
    expect(
      await updateCurriculumTerm("term", { year_level: 3, term_sequence: 2 }),
    ).toMatchObject({ id: "term", curriculum_version_id: "version" });
    await expect(deleteCurriculumTerm("term")).resolves.toBeUndefined();
    await expect(deleteCurriculumTerm("protected")).rejects.toMatchObject({
      isConflict: true,
      message: "Last term is required",
    });
    expect(writes).toBe(3);
  });
  it("creates an empty positional term through one catalog operation", async () => {
    const body: Parameters<typeof createCurriculumTerm>[0] = {
      curriculum_version_id: "version",
      year_level: 1,
      term_sequence: 3,
      slots: [],
    };
    let calls = 0;
    server.use(
      http.post(
        "*/functions/v1/catalog/curriculum_term",
        async ({ request }) => {
          calls++;
          expect(await request.json()).toEqual(body);
          return HttpResponse.json(
            {
              id: "term",
              curriculum_version_id: "version",
              year_level: 1,
              term_sequence: 3,
            },
            { status: 201 },
          );
        },
      ),
    );
    expect(await createCurriculumTerm(body)).toMatchObject({
      id: "term",
      curriculum_version_id: "version",
    });
    expect(calls).toBe(1);
  });
  it("deletes through one version endpoint and leaves protected-dependency errors intact", async () => {
    let calls = 0;
    server.use(
      http.delete(
        "*/functions/v1/catalog/curriculum_version/:id",
        ({ params }) => {
          calls++;
          if (params.id === "protected")
            return HttpResponse.json(
              { message: "Referenced history prevents deletion" },
              { status: 409 },
            );
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );
    await expect(
      deleteCurriculumVersion("unreferenced"),
    ).resolves.toBeUndefined();
    await expect(deleteCurriculumVersion("protected")).rejects.toMatchObject({
      isConflict: true,
      message: "Referenced history prevents deletion",
    });
    expect(calls).toBe(2);
  });
  it("patches only version details through the catalog endpoint", async () => {
    const body = {
      version_label: "Revised 2027",
      effective_start: "2027-08-01",
      effective_end: null,
      delinquency_threshold: 12,
      status: "active" as const,
    };
    let patches = 0;
    server.use(
      http.patch(
        "*/functions/v1/catalog/curriculum_version/:id",
        async ({ request, params }) => {
          patches++;
          expect(params.id).toBe("existing-version");
          expect(await request.json()).toEqual(body);
          return HttpResponse.json({
            ...body,
            id: params.id,
            program_id: "unchanged-program",
          });
        },
      ),
    );
    expect(
      await updateCurriculumVersion("existing-version", body),
    ).toMatchObject({
      id: "existing-version",
      program_id: "unchanged-program",
    });
    expect(patches).toBe(1);
  });
  it("creates a blank version with one catalog request and no child writes", async () => {
    const body = {
      program_id: "11111111-1111-4111-8111-111111111111",
      version_label: "2027",
      effective_start: "2027-08-01",
      effective_end: null,
      delinquency_threshold: 0,
      status: "draft" as const,
    };
    let writes = 0;
    server.use(
      http.post(
        "*/functions/v1/catalog/curriculum_version",
        async ({ request }) => {
          writes++;
          expect(await request.json()).toEqual(body);
          return HttpResponse.json(
            { ...body, id: "created-version" },
            { status: 201 },
          );
        },
      ),
    );
    expect(await createCurriculumVersion(body)).toMatchObject({
      id: "created-version",
      program_id: body.program_id,
    });
    expect(writes).toBe(1);
  });
  it("filters programs by department and versions by eligible program IDs", async () => {
    server.use(
      http.get("*/rest/v1/program", ({ request }) => {
        const query = new URL(request.url).searchParams;
        expect(query.get("department_id")).toBe("eq.department");
        return HttpResponse.json([
          { id: "program", department_id: "department" },
          { id: "foreign", department_id: "other" },
        ]);
      }),
      http.get("*/rest/v1/curriculum_version", ({ request }) => {
        const query = new URL(request.url).searchParams;
        expect(query.get("program_id")).toBe("in.(program)");
        expect(query.get("select")).toContain("enrolled_student_count");
        return HttpResponse.json([
          { id: "v1", program_id: "program", effective_start: "2024-08-01" },
          {
            id: "foreign",
            program_id: "foreign",
            effective_start: "2020-08-01",
          },
        ]);
      }),
    );
    const result = await listCurricula("department");
    expect(result.programs.map((p) => p.id)).toEqual(["program"]);
    expect(result.versions.map((v) => v.id)).toEqual(["v1"]);
  });
  it("orders positional terms and batches deduplicated references instead of reading per slot", async () => {
    const courseQueries: string[] = [];
    server.use(
      http.get("*/rest/v1/curriculum_term", ({ request }) => {
        expect(
          new URL(request.url).searchParams.get("curriculum_version_id"),
        ).toBe("eq.version");
        return HttpResponse.json([
          {
            id: "t2",
            curriculum_version_id: "version",
            year_level: 2,
            term_sequence: 1,
          },
          {
            id: "t1",
            curriculum_version_id: "version",
            year_level: 1,
            term_sequence: 2,
          },
          {
            id: "other",
            curriculum_version_id: "other-version",
            year_level: 1,
            term_sequence: 1,
          },
        ]);
      }),
      http.get("*/rest/v1/curriculum_term_course", ({ request }) => {
        expect(
          new URL(request.url).searchParams.get("curriculum_term_id"),
        ).toBe("in.(t1,t2)");
        return HttpResponse.json(
          Array.from({ length: 52 }, (_, i) => ({
            id: `s${i}`,
            curriculum_term_id: "t1",
            course_id: `c${i % 51}`,
          })),
        );
      }),
      http.get("*/rest/v1/course", ({ request }) => {
        const filter = new URL(request.url).searchParams.get("id")!;
        courseQueries.push(filter);
        expect(filter.slice(4, -1).split(",").length).toBeLessThanOrEqual(50);
        return HttpResponse.json([]);
      }),
    );
    const result = await readCurriculum("version");
    expect(result.terms.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(result.slots).toHaveLength(52);
    expect(courseQueries).toHaveLength(2);
  });
  it("rejects truncated reads rather than displaying an incomplete checklist", async () => {
    server.use(
      http.get("*/rest/v1/curriculum_term", () =>
        HttpResponse.json(
          Array.from({ length: 1000 }, (_, i) => ({ id: `t${i}` })),
        ),
      ),
    );
    await expect(readCurriculum("version")).rejects.toThrow(
      "complete overview could not be loaded",
    );
  });
  it("rejects a partial response below the row cap", async () => {
    server.use(
      http.get("*/rest/v1/curriculum_term", () =>
        HttpResponse.json([], {
          status: 206,
          headers: { "Content-Range": "0-9/20" },
        }),
      ),
    );
    await expect(readCurriculum("version")).rejects.toThrow(
      "complete overview could not be loaded",
    );
  });
  it("propagates forbidden reads and supports cancellation", async () => {
    server.use(
      http.get("*/rest/v1/program", () =>
        HttpResponse.json({ message: "Forbidden" }, { status: 403 }),
      ),
    );
    await expect(listCurricula("department")).rejects.toMatchObject({
      isForbidden: true,
    });
    const controller = new AbortController();
    controller.abort();
    await expect(
      listCurricula("department", controller.signal),
    ).rejects.toBeTruthy();
  });
});
