import { describe, expect, it } from "vitest";
import {
  createSaaisApiClient,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api";
import { getMockDatabase, loginAsMockPersona, MOCK_IDS } from "@/mocks";
import { setupDepartmentHeadMockApi } from "../test-utils";

setupDepartmentHeadMockApi();
const client = createSaaisApiClient({
  mode: "mock",
  baseUrl: "https://saais-mock.supabase.co",
  apiKey: "sb_publishable_mock_key",
});
const body: ApiSchema<"CurriculumPairEquivalenceInsert"> = {
  from_curriculum_version_id: MOCK_IDS.curriculumBscs2020,
  to_curriculum_version_id: MOCK_IDS.curriculumBscs2024,
  source_course_id: MOCK_IDS.courseCsci102,
  target_course_id: MOCK_IDS.courseCsci153,
};
const create = (input = body) =>
  client.POST("/functions/v1/catalog/curriculum-pair-equivalences", {
    body: input,
  });
const read = () =>
  client.GET("/rest/v1/curriculum_pair_equivalence").then(unwrapApiResult);

describe("Curriculum-pair equivalence contract", () => {
  it("persists a rule using actual IDs and removes that rule on a later read", async () => {
    const initial = await read();
    const created = unwrapApiResult(await create());
    expect(created).toMatchObject(body);
    expect((await read()).find((row) => row.id === created.id)).toEqual(
      created,
    );
    const result = await client.DELETE(
      "/functions/v1/catalog/curriculum-pair-equivalences/{id}",
      { params: { path: { id: created.id } } },
    );
    expect(result.response.status).toBe(204);
    expect(await read()).toEqual(initial);
    expect(
      getMockDatabase().auditLogEntries.filter(
        (row) => row.entity_id === created.id,
      ),
    ).toHaveLength(2);
    expect(
      (
        await client.DELETE(
          "/functions/v1/catalog/curriculum-pair-equivalences/{id}",
          { params: { path: { id: created.id } } },
        )
      ).response.status,
    ).toBe(404);
  });

  it.each([
    { source_course_id: MOCK_IDS.courseCsci101 },
    { target_course_id: MOCK_IDS.courseCsci101 },
    {
      source_course_id: MOCK_IDS.courseCsci101,
      target_course_id: MOCK_IDS.courseCsci101,
    },
  ])(
    "rejects a conflicting source or target in the same pair: %j",
    async (conflict) => {
      const initial = await read();
      expect((await create({ ...body, ...conflict })).response.status).toBe(
        409,
      );
      expect(await read()).toEqual(initial);
    },
  );

  it("allows the same courses in a different directed pair", async () => {
    expect(
      (
        await create({
          ...body,
          from_curriculum_version_id: body.to_curriculum_version_id,
          to_curriculum_version_id: body.from_curriculum_version_id,
          source_course_id: MOCK_IDS.courseCsci101,
          target_course_id: MOCK_IDS.courseCsci101,
        })
      ).response.status,
    ).toBe(201);
  });

  it("rejects concurrent conflicts without creating two rules", async () => {
    const results = await Promise.all([create(), create()]);
    expect(results.map((result) => result.response.status).sort()).toEqual([
      201, 409,
    ]);
  });

  it.each([
    { source_course_id: "missing" },
    { target_course_id: "00000000-0000-4000-8000-000000000000" },
    { note: "x".repeat(1001) },
    { unexpected: "field" },
  ])("rejects unsupported input without writing: %j", async (invalid) => {
    const initial = await read();
    expect((await create({ ...body, ...invalid })).response.status).toBe(400);
    expect(await read()).toEqual(initial);
  });

  it("rejects staff writes and out-of-department pairs", async () => {
    loginAsMockPersona("department_staff");
    expect((await create()).response.status).toBe(403);
    loginAsMockPersona("department_head");
    getMockDatabase().programs.find(
      (row) => row.id === MOCK_IDS.programBscs,
    )!.department_id = MOCK_IDS.deptDabe;
    expect((await create()).response.status).toBe(403);
    const rule = getMockDatabase().curriculumPairEquivalences[0];
    expect(
      (
        await client.DELETE(
          "/functions/v1/catalog/curriculum-pair-equivalences/{id}",
          { params: { path: { id: rule.id } } },
        )
      ).response.status,
    ).toBe(403);
  });
});
