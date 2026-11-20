import { describe, expect, it } from "vitest"
import { createSaaisApiClient, unwrapApiResult } from "@/lib/api"
import { getMockDatabase, MOCK_IDS } from "@/mocks"
import { setupDepartmentHeadMockApi } from "../test-utils"

setupDepartmentHeadMockApi()
const client = createSaaisApiClient({ mode: "mock", baseUrl: "https://saais-mock.supabase.co", apiKey: "sb_publishable_mock_key" })
const params = { path: { transfer_id: MOCK_IDS.transferRequest1 } }

describe("Transfer decisions with the shared MSW transaction", () => {
  it("approves the selected request, persists history and updates the roster curriculum", async () => {
    const before = getMockDatabase().curriculumTransferRequests.find(row => row.id === params.path.transfer_id)!
    const result = unwrapApiResult(await client.POST("/functions/v1/curriculum-transfers/{transfer_id}/decision", { params, body: { decision: "approved" } }))
    expect(result.id).toBe(before.id)
    expect(result.status).toBe("approved")
    const history = unwrapApiResult(await client.GET("/rest/v1/curriculum_transfer_request", { params: { query: { id: `eq.${before.id}` } } }))
    expect(history[0].status).toBe("approved")
    const roster = unwrapApiResult(await client.GET("/functions/v1/students", { params: { query: { assignment_scope: "all", limit: 1000 } } }))
    expect(roster.items.find(row => row.student_id === before.student_id)?.curriculum_version_id).toBe(before.to_curriculum_version_id)
    expect((await client.POST("/functions/v1/curriculum-transfers/{transfer_id}/decision", { params, body: { decision: "approved" } })).response.status).toBe(409)
  })

  it("rejects without changing the student's curriculum and retains the reason", async () => {
    const assignment = structuredClone(getMockDatabase().studentOrganizations)
    unwrapApiResult(await client.POST("/functions/v1/curriculum-transfers/{transfer_id}/decision", { params, body: { decision: "rejected", decision_note: "Required equivalencies are missing." } }))
    const rows = unwrapApiResult(await client.GET("/rest/v1/curriculum_transfer_request", { params: { query: { id: `eq.${params.path.transfer_id}` } } }))
    expect(rows[0]).toMatchObject({ status: "rejected", decision_note: "Required equivalencies are missing." })
    expect(getMockDatabase().studentOrganizations).toEqual(assignment)
  })

  it.each(["", " ", "x".repeat(2001)])("rejects invalid decision reasons without changing the request", async (note) => {
    expect((await client.POST("/functions/v1/curriculum-transfers/{transfer_id}/decision", { params, body: { decision: "rejected", decision_note: note } })).response.status).toBe(400)
    expect(getMockDatabase().curriculumTransferRequests.find(row => row.id === params.path.transfer_id)?.status).toBe("pending")
  })
})
