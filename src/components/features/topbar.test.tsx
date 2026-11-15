import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router"
import { Topbar } from "./topbar"

afterEach(cleanup)

function CurrentPath() {
  const location = useLocation()
  return <output data-testid="current-path">{location.pathname}</output>
}

describe("Topbar", () => {
  it("shows every ancestor inline and identifies one accessible current page", () => {
    render(
      <MemoryRouter>
        <Topbar crumbs={[
          { label: "Adviser", to: "/adviser/dashboard" },
          { label: "Advisees", to: "/adviser/advisees" },
          { label: "Selected student", to: "/adviser/advisee/selected" },
          { label: "Checklist" },
        ]} />
      </MemoryRouter>
    )
    const breadcrumb = screen.getByRole("navigation", { name: "breadcrumb" })
    expect(breadcrumb.querySelectorAll("ol")).toHaveLength(1)
    expect(Array.from(breadcrumb.querySelectorAll('[data-slot="breadcrumb-item"]')).map(item => item.textContent))
      .toEqual(["Adviser", "Advisees", "Selected student", "Checklist"])
    expect(within(breadcrumb).getByRole("link", { name: "Adviser" }).getAttribute("href")).toBe("/adviser/dashboard")
    expect(within(breadcrumb).getByRole("link", { name: "Advisees" }).getAttribute("href")).toBe("/adviser/advisees")
    expect(breadcrumb.querySelectorAll('[aria-current="page"]')).toHaveLength(1)
    expect(breadcrumb.querySelector('[aria-current="page"]')?.textContent).toBe("Checklist")
    expect(screen.queryByRole("button", { name: "Show previous pages" })).toBeNull()
  })

  it("renders the mobile navigation button only when a handler is supplied", () => {
    const onMenuClick = vi.fn()
    const { rerender } = render(
      <MemoryRouter><Topbar crumbs={[{ label: "Dashboard" }]} onMenuClick={onMenuClick} /></MemoryRouter>
    )
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }))
    expect(onMenuClick).toHaveBeenCalledOnce()
    rerender(<MemoryRouter><Topbar crumbs={[{ label: "Dashboard" }]} /></MemoryRouter>)
    expect(screen.queryByRole("button", { name: "Open navigation" })).toBeNull()
  })

  it("wraps long trails without hiding or truncating any labels", () => {
    const longName = "Selected student with a very long complete record name"
    render(
      <MemoryRouter>
        <Topbar crumbs={[
          { label: "Adviser", to: "/adviser/dashboard" },
          { label: "Advisees", to: "/adviser/advisees" },
          { label: longName, to: "/adviser/advisee/selected" },
          { label: "Checklist" },
        ]} onMenuClick={() => undefined} trailing={<button>Alerts</button>} />
      </MemoryRouter>
    )
    const breadcrumb = screen.getByRole("navigation", { name: "breadcrumb" })
    expect(breadcrumb.querySelector("ol")?.className).toContain("flex-wrap")
    expect(within(breadcrumb).getByRole("link", { name: longName }).textContent).toBe(longName)
    expect(breadcrumb.querySelectorAll('.truncate, .hidden, [hidden]')).toHaveLength(0)
    expect(breadcrumb.querySelectorAll('[data-slot="breadcrumb-item"]')).toHaveLength(4)
  })

  it("navigates directly to an inline parent", () => {
    render(
      <MemoryRouter initialEntries={["/adviser/advisee/selected/grades"]}>
        <Topbar crumbs={[
          { label: "Adviser", to: "/adviser/dashboard" },
          { label: "Advisees", to: "/adviser/advisees" },
          { label: "Selected student", to: "/adviser/advisee/selected" },
          { label: "Grades" },
        ]} />
        <Routes>
          <Route path="/adviser/advisees" element={<p>Advisees page</p>} />
          <Route path="/adviser/advisee/selected/grades" element={<p>Grades page</p>} />
        </Routes>
        <CurrentPath />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole("link", { name: "Advisees" }))
    expect(screen.getByTestId("current-path").textContent).toBe("/adviser/advisees")
    expect(screen.getByText("Advisees page")).toBeTruthy()
  })

  it("supports an ancestor without a destination", () => {
    render(<MemoryRouter><Topbar crumbs={[{ label: "Workspace" }, { label: "Dashboard" }]} /></MemoryRouter>)
    const breadcrumb = screen.getByRole("navigation", { name: "breadcrumb" })
    expect(within(breadcrumb).getByText("Workspace")).toBeTruthy()
    expect(within(breadcrumb).queryByRole("link", { name: "Workspace" })).toBeNull()
  })

  it("renders trailing content when the breadcrumb is empty", () => {
    render(<MemoryRouter><Topbar crumbs={[]} trailing={<button>Profile</button>} /></MemoryRouter>)
    expect(screen.getByRole("button", { name: "Profile" })).toBeTruthy()
    expect(screen.queryByRole("navigation", { name: "breadcrumb" })).toBeNull()
  })
})
