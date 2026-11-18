import { describe, expect, it } from "vitest"
import { createSaaisApiClient, unwrapApiResult, type ApiSchema } from "@/lib/api"
import { getMockDatabase, loginAsMockPersona, MOCK_IDS } from "@/mocks"
import { setupDepartmentHeadMockApi } from "../test-utils"

setupDepartmentHeadMockApi()
const client = createSaaisApiClient({ mode: "mock", baseUrl: "https://saais-mock.supabase.co", apiKey: "sb_publishable_mock_key" })
const path = { student_id: MOCK_IDS.studentPrimary }
const body: ApiSchema<"OutsideCreditCreateRequest"> = {
  entry_type: "transferee", origin_school: "Western State College", original_course_code: "CS 205",
  original_course_title: "Algorithms", units: 3.25, grade: "1.00",
  destination_curriculum_term_course_id: MOCK_IDS.slotCsci153, reason: "Equivalent course outcomes",
}
const create = (value = body, studentId: string = path.student_id) => client.POST("/functions/v1/students/{student_id}/outside-credits", { params: { path: { student_id: studentId } }, body: value })
const read = () => client.GET("/rest/v1/outside_credit", { params: { query: { student_id: `eq.${path.student_id}` } } }).then(unwrapApiResult)

describe("Outside credit API with shared MSW database", () => {
  it("persists a successful write and returns the same identity on a later GET", async () => {
    const before = await read()
    const created = unwrapApiResult(await create())
    expect(created.student_id).toBe(path.student_id)
    expect(created.destination_curriculum_term_course_id).toBe(body.destination_curriculum_term_course_id)
    expect(created.decided_by).toBe(MOCK_IDS.deptHeadDcst)
    const after = await read()
    expect(after).toHaveLength(before.length + 1)
    expect(after.find(row => row.id === created.id)).toEqual(created)
  })

  it.each([
    { reason: " " }, { grade: "3.01" }, { units: 0 }, { units: 1.1 },
    { original_course_code: "x".repeat(101) }, { origin_school: "" },
    { destination_curriculum_term_course_id: "invalid" }, { unexpected: "field" },
  ])("rejects invalid request %j without writing", async (invalid) => {
    const before = await read()
    expect((await create({ ...body, ...invalid })).response.status).toBe(400)
    expect(await read()).toEqual(before)
  })

  it("rejects missing students and slots without writing", async () => {
    const before = await read()
    expect((await create(body, "00000000-0000-4000-8000-000000000000")).response.status).toBe(404)
    expect((await create({ ...body, destination_curriculum_term_course_id: "00000000-0000-4000-8000-000000000000" })).response.status).toBe(404)
    expect(await read()).toEqual(before)
  })

  it.each(["adviser", "dean"] as const)("rejects the %s role", async (role) => {
    loginAsMockPersona(role)
    const before = getMockDatabase().outsideCredits.length
    expect((await create()).response.status).toBe(403)
    expect(getMockDatabase().outsideCredits).toHaveLength(before)
  })

  it("rejects a student outside the department", async () => {
    getMockDatabase().studentOrganizations.find(row => row.student_id === path.student_id)!.department_id = MOCK_IDS.deptDabe
    expect((await create()).response.status).toBe(403)
  })

  it("rejects a destination outside the current curriculum", async () => {
    getMockDatabase().studentOrganizations.find(row => row.student_id === path.student_id)!.curriculum_version_id = MOCK_IDS.curriculumBscs2020
    expect((await create()).response.status).toBe(400)
  })

  it("rejects normalized duplicate sources and concurrent duplicate slot writes", async () => {
    const source = { ...body, origin_school: " university  of the philippines cebu ", original_course_code: " cmsc  11 " }
    expect((await create(source)).response.status).toBe(409)
    const results = await Promise.all([create(), create({ ...body, original_course_code: "CS 206" })])
    expect(results.map(result => result.response.status).sort()).toEqual([201, 409])
    expect((await read()).filter(row => row.destination_curriculum_term_course_id === MOCK_IDS.slotCsci153)).toHaveLength(1)
  })

  it.each([MOCK_IDS.slotCsci101, MOCK_IDS.slotCsci102, MOCK_IDS.slotFreeElective1])("rejects satisfied destination %s", async (slot) => {
    const before = await read()
    expect((await create({ ...body, destination_curriculum_term_course_id: slot })).response.status).toBe(409)
    expect(await read()).toEqual(before)
  })
})
