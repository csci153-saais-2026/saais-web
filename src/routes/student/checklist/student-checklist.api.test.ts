import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import {
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  resetMockDatabase,
} from "@/mocks"
import { saaisMockServer } from "@/mocks/node"

let api: typeof import("./student-checklist.api")
let hooks: typeof import("./use-student-checklist")

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

beforeAll(async () => {
  saaisMockServer.listen()
  api = await import("./student-checklist.api")
  hooks = await import("./use-student-checklist")
})

afterEach(() => {
  cleanup()
  saaisMockServer.resetHandlers()
  resetMockDatabase()
  logoutMockPersona()
})

afterAll(() => {
  saaisMockServer.close()
})

describe("student-checklist API helpers and hooks (MSW)", () => {
  it("fetches checklist slots and records PDF export audit event", async () => {
    loginAsMockPersona("student")

    const slots = await api.fetchStudentChecklist(MOCK_IDS.studentPrimary)
    expect(Array.isArray(slots)).toBe(true)
    expect(slots.length).toBeGreaterThan(0)

    await expect(
      api.recordChecklistExportEvent(MOCK_IDS.studentPrimary)
    ).resolves.toBeUndefined()
  })

  it("resolves useStudentChecklist and useRecordChecklistExport hooks", async () => {
    loginAsMockPersona("student")
    const wrapper = createQueryWrapper()

    const { result: checklistHook } = renderHook(
      () => hooks.useStudentChecklist(MOCK_IDS.studentPrimary),
      { wrapper }
    )
    const { result: exportHook } = renderHook(
      () => hooks.useRecordChecklistExport(MOCK_IDS.studentPrimary),
      { wrapper }
    )

    await waitFor(() => {
      expect(checklistHook.current.isSuccess).toBe(true)
    })
    expect((checklistHook.current.data ?? []).length).toBeGreaterThan(0)

    await exportHook.current.mutateAsync("Exported checklist PDF in test")
    await waitFor(() => {
      expect(exportHook.current.isSuccess).toBe(true)
    })
  })
})
