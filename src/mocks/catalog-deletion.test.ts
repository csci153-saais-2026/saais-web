import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { createSaaisApiClient, unwrapApiResult } from "@/lib/api";
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  resetMockDatabase,
} from "./index";
import { saaisMockServer } from "./node";

beforeAll(() => saaisMockServer.listen());
beforeEach(() => {
  resetMockDatabase();
  loginAsMockPersona("department_head");
});
afterEach(() => {
  saaisMockServer.resetHandlers();
  logoutMockPersona();
});
afterAll(() => saaisMockServer.close());
const client = createSaaisApiClient({
  mode: "mock",
  baseUrl: "https://saais-mock.supabase.co",
  apiKey: "sb_publishable_mock_key",
});
const missing = "00000000-0000-4000-8000-000000000000";
const paths = [
  "/functions/v1/catalog/curriculum_version/{id}",
  "/functions/v1/catalog/curriculum_term/{id}",
  "/functions/v1/catalog/curriculum_term_course/{id}",
] as const;
async function draftStructure() {
  const term = unwrapApiResult(
    await client.POST("/functions/v1/catalog/curriculum_term", {
      body: {
        curriculum_version_id: MOCK_IDS.curriculumBscsDraft,
        year_level: 1,
        term_sequence: 1,
        slots: [],
      },
    }),
  );
  const slot = unwrapApiResult(
    await client.POST("/functions/v1/catalog/curriculum_term_course", {
      body: {
        curriculum_term_id: term.id,
        course_id: null,
        slot_label: "Draft elective",
        nominal_units: 3,
        slot_type: "elective",
        is_elective_slot: true,
      },
    }),
  );
  return { term, slot };
}

describe("Catalog DELETE reference safeguards", () => {
  it.each(paths)("returns 404 for a missing record at %s", async (path) => {
    expect(
      (await client.DELETE(path, { params: { path: { id: missing } } }))
        .response.status,
    ).toBe(404);
  });

  it("deletes an unreferenced draft version and records its audit entry", async () => {
    expect(
      (
        await client.DELETE(paths[0], {
          params: { path: { id: MOCK_IDS.curriculumBscsDraft } },
        })
      ).response.status,
    ).toBe(204);
    const rows = unwrapApiResult(
      await client.GET("/rest/v1/curriculum_version", {
        params: { query: { id: `eq.${MOCK_IDS.curriculumBscsDraft}` } },
      }),
    );
    expect(rows).toEqual([]);
    expect(
      getMockDatabase().auditLogEntries.some(
        (row) =>
          row.entity_id === MOCK_IDS.curriculumBscsDraft &&
          row.action === "curriculum_version_deleted",
      ),
    ).toBe(true);
  });

  it.each(["transfer", "equivalence"])(
    "protects version %s references even without enrolled students",
    async (kind) => {
      const db = getMockDatabase();
      const version = db.curriculumVersions.find(
        (row) => row.id === MOCK_IDS.curriculumBscs2020,
      )!;
      db.curriculumVersions[db.curriculumVersions.indexOf(version)] = {
        ...version,
        enrolled_student_count: 0,
      };
      if (kind === "transfer") db.curriculumPairEquivalences = [];
      else db.curriculumTransferRequests = [];
      expect(
        (
          await client.DELETE(paths[0], {
            params: { path: { id: version.id } },
          })
        ).response.status,
      ).toBe(409);
      expect(db.curriculumVersions.some((row) => row.id === version.id)).toBe(
        true,
      );
    },
  );

  it("protects historical student curriculum assignments", async () => {
    const db = getMockDatabase();
    db.curriculumVersions = db.curriculumVersions.map((row) => ({
      ...row,
      enrolled_student_count: 0,
    }));
    db.studentOrganizations = [];
    db.curriculumTransferRequests = [];
    db.curriculumPairEquivalences = [];
    db.studentCurriculumAssignments.forEach((row) => {
      row.end_date = "2026-11-01";
    });
    expect(
      (
        await client.DELETE(paths[0], {
          params: { path: { id: MOCK_IDS.curriculumBscs2024 } },
        })
      ).response.status,
    ).toBe(409);
  });

  it.each([
    MOCK_IDS.slotCsci102,
    MOCK_IDS.slotCsci153,
    MOCK_IDS.slotFreeElective1,
    MOCK_IDS.slotCsci101,
  ])("protects academic/plan/credit references to slot %s", async (id) => {
    const before = structuredClone(getMockDatabase().curriculumTermCourses);
    expect(
      (await client.DELETE(paths[2], { params: { path: { id } } })).response
        .status,
    ).toBe(409);
    expect(getMockDatabase().curriculumTermCourses).toEqual(before);
  });

  it("protects a term containing referenced slots without partial child deletion", async () => {
    const before = structuredClone(getMockDatabase().curriculumTermCourses);
    expect(
      (
        await client.DELETE(paths[1], {
          params: { path: { id: MOCK_IDS.curriculumTerm1Y1S } },
        })
      ).response.status,
    ).toBe(409);
    expect(getMockDatabase().curriculumTermCourses).toEqual(before);
  });

  it("removes an unreferenced slot and exposes that deletion on GET", async () => {
    const { slot } = await draftStructure();
    expect(
      (await client.DELETE(paths[2], { params: { path: { id: slot.id } } }))
        .response.status,
    ).toBe(204);
    const rows = unwrapApiResult(
      await client.GET("/rest/v1/curriculum_term_course", {
        params: { query: { id: `eq.${slot.id}` } },
      }),
    );
    expect(rows).toEqual([]);
  });

  it("allows an unreferenced term and its new child slot to be removed atomically", async () => {
    const { term, slot } = await draftStructure();
    expect(
      (await client.DELETE(paths[1], { params: { path: { id: term.id } } }))
        .response.status,
    ).toBe(204);
    expect(
      unwrapApiResult(
        await client.GET("/rest/v1/curriculum_term", {
          params: { query: { id: `eq.${term.id}` } },
        }),
      ),
    ).toEqual([]);
    expect(
      unwrapApiResult(
        await client.GET("/rest/v1/curriculum_term_course", {
          params: { query: { id: `eq.${slot.id}` } },
        }),
      ),
    ).toEqual([]);
  });

  it("protects the last term and last slot on a referenced curriculum", async () => {
    const db = getMockDatabase();
    const term = db.curriculumTerms.find(
      (row) =>
        row.curriculum_version_id === MOCK_IDS.curriculumBscs2024 &&
        !db.curriculumTermCourses.some(
          (slot) => slot.curriculum_term_id === row.id,
        ),
    )!;
    db.curriculumTerms = [term];
    expect(
      (await client.DELETE(paths[1], { params: { path: { id: term.id } } }))
        .response.status,
    ).toBe(409);
    resetMockDatabase();
    const lastTerm = getMockDatabase().curriculumTerms.find(
      (row) =>
        !getMockDatabase().curriculumTermCourses.some(
          (slot) => slot.curriculum_term_id === row.id,
        ),
    )!;
    const slot = unwrapApiResult(
      await client.POST("/functions/v1/catalog/curriculum_term_course", {
        body: {
          curriculum_term_id: lastTerm.id,
          course_id: null,
          slot_label: "Required elective",
          nominal_units: 3,
          slot_type: "elective",
          is_elective_slot: true,
        },
      }),
    );
    expect(
      (await client.DELETE(paths[2], { params: { path: { id: slot.id } } }))
        .response.status,
    ).toBe(409);
  });

  it.each([
    [paths[0], MOCK_IDS.curriculumBscsDraft],
    [paths[1], MOCK_IDS.curriculumTerm1Y1S],
    [paths[2], MOCK_IDS.slotNstp1],
  ] as const)("rejects out-of-department deletion at %s", async (path, id) => {
    getMockDatabase().programs.find(
      (row) => row.id === MOCK_IDS.programBscs,
    )!.department_id = MOCK_IDS.deptDabe;
    expect(
      (await client.DELETE(path, { params: { path: { id } } })).response.status,
    ).toBe(403);
  });
});
