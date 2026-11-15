import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, useLocation, useNavigate } from "react-router"
import { AppShell } from "../components/features/app-shell"
import type { NavSection } from "../components/features/sidebar"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const sections: NavSection[] = [{
  title: "Student",
  items: [
    { label: "Dashboard", href: "/student/dashboard", end: true },
    { label: "Records", href: "/student/records", children: [
      { label: "Grades", href: "/student/records/grades" },
    ] },
  ],
}]

function TestShell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  return <AppShell sidebar={{ sections, currentPath: pathname }} crumbs={[{ label: "Test" }]}>
    <button onClick={() => navigate("/student/records/grades")}>Go to grades</button>
    <button onClick={() => navigate("/student/dashboard")}>Go to dashboard</button>
    <button onClick={() => navigate("/other")}>Go elsewhere</button>
  </AppShell>
}

function setup(path = "/student/dashboard") {
  render(<MemoryRouter initialEntries={[path]}><TestShell /></MemoryRouter>)
}

describe("AppSidebar", () => {
  it("marks active links and supports section collapse", () => {
    setup()
    const dashboard = screen.getByRole("link", { name: "Dashboard" })
    expect(dashboard.getAttribute("aria-current")).toBe("page")
    fireEvent.click(screen.getByText("Student"))
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull()
    fireEvent.click(screen.getByText("Student"))
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeTruthy()
  })

  it("opens a direct child route and reveals it after a route change", () => {
    setup("/student/records/grades")
    expect(screen.getByRole("link", { name: "Grades" }).getAttribute("aria-current")).toBe("page")
    fireEvent.click(screen.getByRole("button", { name: "Toggle Records submenu" }))
    expect(screen.queryByRole("link", { name: "Grades" })).toBeNull()
    fireEvent.click(screen.getByText("Go to dashboard"))
    fireEvent.click(screen.getByText("Go to grades"))
    expect(screen.getByRole("link", { name: "Grades" })).toBeTruthy()
  })

  it("reveals a child after navigating from a closed submenu", () => {
    setup()
    expect(screen.queryByRole("link", { name: "Grades" })).toBeNull()
    fireEvent.click(screen.getByText("Go to grades"))
    expect(screen.getByRole("link", { name: "Grades" })).toBeTruthy()
  })

  it("preserves a manual group collapse until navigation reaches that group", () => {
    setup("/student/records/grades")
    fireEvent.click(screen.getByText("Student"))
    expect(screen.queryByRole("link", { name: "Grades" })).toBeNull()
    fireEvent.click(screen.getByText("Go to dashboard"))
    expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("aria-current")).toBe("page")
    fireEvent.click(screen.getByText("Student"))
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull()
    fireEvent.click(screen.getByText("Go elsewhere"))
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull()
    fireEvent.click(screen.getByText("Go to grades"))
    expect(screen.getByRole("link", { name: "Grades" }).getAttribute("aria-current")).toBe("page")
  })

  it("closes the mobile drawer after nested navigation", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation(query => ({
      matches: true, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }))
    setup("/student/records/grades")
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }))
    expect(screen.getByRole("dialog")).toBeTruthy()
    fireEvent.click(screen.getByRole("link", { name: "Grades" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })
})
