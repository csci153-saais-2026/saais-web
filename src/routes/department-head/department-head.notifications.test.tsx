import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { getMockDatabase, MOCK_PERSONAS } from "@/mocks"
import { saaisMockServer } from "@/mocks/node"
import NotificationsPage from "@/routes/notifications/NotificationsPage"
import { renderDepartmentHead, setupDepartmentHeadMockApi } from "./test-utils"

vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: MOCK_PERSONAS.department_head.profileId }, roles: ["department_head"], activeRole: "department_head" }) }))
setupDepartmentHeadMockApi()
beforeEach(() => {
  const db = getMockDatabase()
  db.notifications = db.notifications.slice(0, 2).map(row => ({ ...row, recipient_id: MOCK_PERSONAS.department_head.profileId, is_read: false, read_at: null }))
})

describe("Department Head notification inbox without a shell or bell", () => {
  it("marks one notification read, filters unread items, then marks all read through the API", async () => {
    renderDepartmentHead(<NotificationsPage />, "/department-head/notifications")
    await screen.findByRole("button", { name: "Unread (2)" })
    fireEvent.click(screen.getAllByRole("button", { name: "Mark read" })[0])
    await screen.findByRole("button", { name: "Unread (1)" })
    expect(getMockDatabase().notifications.filter(row => row.is_read)).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "Unread (1)" }))
    expect(screen.getAllByRole("button", { name: "Mark read" })).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }))
    expect(await screen.findByText("You are all caught up.")).toBeTruthy()
    await waitFor(() => expect(getMockDatabase().notifications.every(row => row.is_read)).toBe(true))
    expect(screen.queryByRole("button", { name: /^Notifications/ })).toBeNull()
  })

  it("preserves unread state when the API rejects marking read", async () => {
    saaisMockServer.use(http.post("*/functions/v1/notifications/mark-read", () => HttpResponse.json({ code: "UNAVAILABLE", message: "Read status could not be saved." }, { status: 500 })))
    renderDepartmentHead(<NotificationsPage />, "/department-head/notifications")
    await screen.findByRole("button", { name: "Unread (2)" })
    fireEvent.click(screen.getAllByRole("button", { name: "Mark read" })[0])
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Read status could not be saved.")
    expect(getMockDatabase().notifications.every(row => !row.is_read)).toBe(true)
  })
})
