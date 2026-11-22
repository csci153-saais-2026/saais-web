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
  closeSchoolTermEncoding,
  createSchoolTerm,
  listAcademicTerms,
  reopenDepartmentTermEncoding,
  updateSchoolTerm,
  type SchoolTermCloseEncodingRequest,
  type SchoolTermInsert,
  type SchoolTermUpdate,
} from "./academic-terms.api";
import type { ApiSchema } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiClient: actual.createSaaisApiClient({
      baseUrl: "http://localhost:3000",
      mode: "mock",
      getAccessToken: async () => "mock-academic-terms-test",
      fetch: (...args) => globalThis.fetch(...args),
    }),
  };
});

const server = setupServer();

const createBody: SchoolTermInsert = {
  start_year: 2026,
  end_year: 2027,
  term_type: "Summer",
  starts_on: "2026-06-01",
  ends_on: "2026-08-15",
  encoding_deadline: "2026-08-31",
  is_locked: false,
};

const updateBody: SchoolTermUpdate = {
  start_year: 2026,
  end_year: 2027,
  term_type: "Summer",
  starts_on: "2026-06-01",
  ends_on: "2026-08-15",
  encoding_deadline: "2026-08-31",
};

function termResponse(id: string): ApiSchema<"SchoolTerm"> {
  return {
    id,
    start_year: createBody.start_year,
    end_year: createBody.end_year,
    term_type: createBody.term_type,
    school_year: "2026 - 2027",
    is_locked: false,
    override_flag: false,
    starts_on: createBody.starts_on,
    ends_on: createBody.ends_on,
    encoding_deadline: createBody.encoding_deadline,
    default_inc_deadline: "2027-08-15",
    chronological_key: 20261,
  };
}

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Academic term reads", () => {
  it("reads the institutional calendar and only the active department encoding records", async () => {
    const term = {
      id: "term-1",
      start_year: 2025,
      end_year: 2026,
      term_type: "2nd Semester",
      school_year: "2025 - 2026",
      is_locked: true,
      override_flag: false,
      starts_on: "2026-01-15",
      ends_on: "2026-05-30",
      encoding_deadline: "2026-06-15",
      closed_by_name: "Institution Admin",
      closed_at: "2026-06-16T00:00:00Z",
      default_inc_deadline: "2027-05-30",
      chronological_key: 20252,
    };
    const departmentClosure = {
      id: "closure-1",
      school_term_id: "term-1",
      department_id: "department-1",
      is_closed: false,
      closed_by_name: null,
      closed_at: null,
    };

    server.use(
      http.get("*/rest/v1/school_term", ({ request }) => {
        const query = new URL(request.url).searchParams;
        expect(query.get("select")).toContain("is_locked");
        expect(query.get("select")).toContain("closed_by_name");
        expect(query.get("select")).not.toContain("override");
        expect(query.get("order")).toBe("chronological_key.desc,id.asc");
        expect(query.get("limit")).toBe("1000");
        return HttpResponse.json([term]);
      }),
      http.get("*/rest/v1/department_term_encoding", ({ request }) => {
        const query = new URL(request.url).searchParams;
        expect(query.get("department_id")).toBe("eq.department-1");
        expect(query.get("select")).toContain("department_id");
        expect(query.get("select")).toContain("closed_at");
        return HttpResponse.json([
          departmentClosure,
          {
            ...departmentClosure,
            id: "foreign-closure",
            department_id: "department-2",
          },
        ]);
      }),
    );

    await expect(listAcademicTerms("department-1")).resolves.toEqual({
      terms: [term],
      departmentClosures: [departmentClosure],
    });
  });

  describe("Academic term writes", () => {
    it("reopens encoding through the department-scoped operation", async () => {
      const body: SchoolTermCloseEncodingRequest = {
        scope: "department",
        department_id: "department-1",
      };
      const closure = {
        id: "closure-1",
        school_term_id: "term-existing",
        department_id: "department-1",
        is_closed: false,
      };
      server.use(
        http.post(
          "*/functions/v1/school-terms/:school_term_id/reopen-encoding",
          async ({ request, params }) => {
            expect(params.school_term_id).toBe("term-existing");
            expect(await request.json()).toEqual(body);
            return HttpResponse.json(closure);
          },
        ),
      );

      await expect(
        reopenDepartmentTermEncoding("term-existing", body),
      ).resolves.toEqual(closure);

      server.use(
        http.post(
          "*/functions/v1/school-terms/:school_term_id/reopen-encoding",
          () =>
            HttpResponse.json(
              { code: "CONFLICT", message: "Closure state changed." },
              { status: 409 },
            ),
        ),
      );
      await expect(
        reopenDepartmentTermEncoding("term-existing", body),
      ).rejects.toMatchObject({ isConflict: true });
    });

    it("closes encoding only with the explicit department-scoped request", async () => {
      const body: SchoolTermCloseEncodingRequest = {
        scope: "department",
        department_id: "department-1",
        closure_note: "Grade review is complete.",
      };
      const updated = termResponse("term-existing");
      server.use(
        http.post(
          "*/functions/v1/school-terms/:school_term_id/close-encoding",
          async ({ request, params }) => {
            expect(params.school_term_id).toBe("term-existing");
            expect(await request.json()).toEqual(body);
            return HttpResponse.json(updated);
          },
        ),
      );

      await expect(
        closeSchoolTermEncoding("term-existing", body),
      ).resolves.toEqual(updated);

      let responseStatus = 403;
      server.use(
        http.post(
          "*/functions/v1/school-terms/:school_term_id/close-encoding",
          () =>
            HttpResponse.json(
              {
                code: responseStatus === 403 ? "FORBIDDEN" : "CONFLICT",
                message: "Closure denied.",
              },
              { status: responseStatus },
            ),
        ),
      );
      await expect(
        closeSchoolTermEncoding("term-existing", body),
      ).rejects.toMatchObject({ isForbidden: true });

      responseStatus = 409;
      await expect(
        closeSchoolTermEncoding("term-existing", body),
      ).rejects.toMatchObject({ isConflict: true });
    });

    it("creates a term through the transactional catalog operation", async () => {
      const saved = termResponse("term-created");
      server.use(
        http.post("*/functions/v1/catalog/school_term", async ({ request }) => {
          expect(await request.json()).toEqual(createBody);
          return HttpResponse.json(saved, { status: 201 });
        }),
      );

      await expect(createSchoolTerm(createBody)).resolves.toEqual(saved);
    });

    it("updates only editable fields through the transactional catalog operation", async () => {
      const saved = termResponse("term-existing");
      server.use(
        http.patch(
          "*/functions/v1/catalog/school_term/:id",
          async ({ request, params }) => {
            expect(params.id).toBe("term-existing");
            expect(await request.json()).toEqual(updateBody);
            return HttpResponse.json(saved);
          },
        ),
      );

      await expect(
        updateSchoolTerm("term-existing", updateBody),
      ).resolves.toEqual(saved);
    });

    it("surfaces duplicate conflicts and scoped write denials", async () => {
      server.use(
        http.post("*/functions/v1/catalog/school_term", () =>
          HttpResponse.json(
            { code: "CONFLICT", message: "Duplicate term." },
            { status: 409 },
          ),
        ),
        http.patch("*/functions/v1/catalog/school_term/:id", () =>
          HttpResponse.json(
            { code: "FORBIDDEN", message: "Denied." },
            { status: 403 },
          ),
        ),
      );

      await expect(createSchoolTerm(createBody)).rejects.toMatchObject({
        isConflict: true,
      });
      await expect(
        updateSchoolTerm("term-existing", updateBody),
      ).rejects.toMatchObject({ isForbidden: true });
    });
  });

  it("does not present a partial term history as complete", async () => {
    server.use(
      http.get("*/rest/v1/school_term", () =>
        HttpResponse.json([], {
          status: 206,
          headers: { "Content-Range": "0-9/20" },
        }),
      ),
      http.get("*/rest/v1/department_term_encoding", () =>
        HttpResponse.json([]),
      ),
    );

    await expect(listAcademicTerms("department-1")).rejects.toThrow(
      "A complete term history could not be loaded.",
    );
  });

  it("preserves a denied department-closure read as an error", async () => {
    server.use(
      http.get("*/rest/v1/school_term", () => HttpResponse.json([])),
      http.get("*/rest/v1/department_term_encoding", () =>
        HttpResponse.json({ message: "Forbidden" }, { status: 403 }),
      ),
    );

    await expect(listAcademicTerms("department-1")).rejects.toMatchObject({
      isForbidden: true,
    });
  });
});
