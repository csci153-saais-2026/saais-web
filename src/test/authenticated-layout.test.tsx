import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { AuthenticatedLayout } from "@/layouts/AuthenticatedLayout"
import { getNavigationSections } from "@/navigation/get-navigation-sections"
import { navigationConfig, type NavigationRole } from "@/navigation/navigation-config"

afterEach(cleanup)

describe("getNavigationSections", () => {
  it.each(["dean", "department_head", "adviser"] as const)("selects only the assigned %s menu", role => {
    expect(getNavigationSections([{ role }])).toEqual([navigationConfig[role]])
  })

  it("selects independently assigned roles once in navigation order", () => {
    expect(getNavigationSections([
      { role: "dean" }, { role: "adviser" }, { role: "department_head" }, { role: "adviser" },
    ])).toEqual([navigationConfig.adviser, navigationConfig.department_head, navigationConfig.dean])
  })

  it("returns no sections without assignments", () => {
    expect(getNavigationSections([])).toEqual([])
  })
})

describe("AuthenticatedLayout", () => {
  it.each(["dean", "department_head", "adviser"] as const)("renders only the %s role section", role => {
    renderLayout([role])
    expect(screen.getByText(navigationConfig[role].title!)).toBeTruthy()
    for (const other of (["dean", "department_head", "adviser"] as const).filter(value => value !== role)) {
      expect(screen.queryByText(navigationConfig[other].title!)).toBeNull()
    }
  })

  it("passes user details and sign-out through the shell and renders the active route", () => {
    const signOut = vi.fn()
    renderLayout(["adviser", "dean", "adviser"], signOut)
    expect(screen.getByText("Ada Example")).toBeTruthy()
    expect(screen.getByText("Faculty member")).toBeTruthy()
    expect(screen.getByText("AE")).toBeTruthy()
    expect(screen.getByText("Page content")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("aria-current")).toBe("page")
    expect(screen.getAllByText("Adviser")).toHaveLength(1)
    expect(screen.getByText("Dean")).toBeTruthy()
    fireEvent.click(screen.getByText("Ada Example"))
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }))
    expect(signOut).toHaveBeenCalledOnce()
  })

  it("renders no role sections for an account without assignments", () => {
    renderLayout([])
    expect(screen.queryByText("Adviser")).toBeNull()
    expect(screen.queryByText("Dean")).toBeNull()
    expect(screen.getByText("Page content")).toBeTruthy()
  })
})

function renderLayout(roles: NavigationRole[], onSignOut = vi.fn()) {
  render(
    <MemoryRouter initialEntries={["/adviser/dashboard"]}>
      <Routes>
        <Route element={<AuthenticatedLayout assignments={roles.map(role => ({ role }))} crumbs={[{ label: "Workspace" }]} sidebar={{ user: { name: "Ada Example", subtitle: "Faculty member", initials: "AE" }, onSignOut }} />}>
          <Route path="/adviser/dashboard" element={<div>Page content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}
