import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router"
import { Topbar } from "./topbar"

afterEach(cleanup)

function CurrentPath() {
  const location = useLocation()
  return <output data-testid="current-path">{location.pathname}</output>
}

describe("Topbar", () => {
  it("renders the current breadcrumb as the active page and keeps ancestor links clickable", () => {
    render(
      <MemoryRouter>
        <Topbar
          crumbs={[
            { label: "Home", to: "/" },
            { label: "Students", to: "/students" },
            { label: "Student record" },
          ]}
          trailing={<button type="button">Alerts</button>}
        />
      </MemoryRouter>
    )

    expect(screen.getByRole("navigation", { name: "breadcrumb" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Students" }).getAttribute("href")).toBe("/students")
    expect(screen.getAllByText("Student record").some(
      (element) => element.getAttribute("aria-current") === "page"
    )).toBe(true)
    fireEvent.click(screen.getAllByRole("button", { name: "Show previous pages" })[0])
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/")
  })

  it("renders the mobile menu button only when a handler is supplied", () => {
    const onMenuClick = vi.fn()

    const { rerender } = render(
      <MemoryRouter>
        <Topbar crumbs={[{ label: "Dashboard" }]} onMenuClick={onMenuClick} />
      </MemoryRouter>
    )

    const button = screen.getByRole("button", { name: "Open navigation" })
    fireEvent.click(button)
    expect(onMenuClick).toHaveBeenCalledTimes(1)

    rerender(
      <MemoryRouter>
        <Topbar crumbs={[{ label: "Dashboard" }]} />
      </MemoryRouter>
    )

    expect(screen.queryByRole("button", { name: "Open navigation" })).toBeNull()
  })

  it("keeps the current page visible and exposes all ancestors in the mobile menu", () => {
    render(
      <MemoryRouter>
        <Topbar
          crumbs={[
            { label: "Advisees", to: "/advisees" },
            { label: "Student record", to: "/advisees/student" },
            { label: "Grades", to: "/advisees/student/grades" },
            { label: "Grades" },
          ]}
          onMenuClick={() => undefined}
          trailing={<button type="button">Alerts</button>}
        />
      </MemoryRouter>
    )

    const mobileBreadcrumbs = screen.getByRole("navigation", { name: "breadcrumb" })
      .querySelector(".md\\:hidden")
    expect(mobileBreadcrumbs?.className).toContain("md:hidden")
    expect(mobileBreadcrumbs?.textContent).toContain("Grades")
    expect(screen.getAllByText("Grades").some(
      (element) => element.getAttribute("aria-current") === "page"
    )).toBe(true)

    fireEvent.click(screen.getAllByRole("button", { name: "Show previous pages" })[0])
    const previousPages = screen.getByRole("navigation", { name: "Previous pages" })
    expect(previousPages.querySelectorAll("a")).toHaveLength(3)
    expect(previousPages.textContent).toContain("Advisees")
    expect(previousPages.textContent).toContain("Student record")
    expect(previousPages.textContent).toContain("Grades")
  })

  it("navigates to a selected ancestor and closes the mobile menu", () => {
    render(
      <MemoryRouter initialEntries={["/advisees/student/grades"]}>
        <Topbar
          crumbs={[
            { label: "Advisees", to: "/advisees" },
            { label: "Student record", to: "/advisees/student" },
            { label: "Grades" },
          ]}
        />
        <Routes>
          <Route path="/advisees" element={<p>Advisees page</p>} />
          <Route path="/advisees/student/grades" element={<p>Grades page</p>} />
        </Routes>
        <CurrentPath />
      </MemoryRouter>
    )

    fireEvent.click(screen.getAllByRole("button", { name: "Show previous pages" })[0])
    fireEvent.click(screen.getByRole("link", { name: "Advisees" }))

    expect(screen.getByTestId("current-path").textContent).toBe("/advisees")
    expect(screen.getByText("Advisees page")).toBeTruthy()
    expect(screen.queryByRole("navigation", { name: "Previous pages" })).toBeNull()
  })

  it("keeps the current and nearest ancestor visible on long desktop trails", () => {
    render(
      <MemoryRouter>
        <Topbar
          crumbs={[
            { label: "Home", to: "/" },
            { label: "Department", to: "/department" },
            { label: "Advisees", to: "/advisees" },
            { label: "Student record", to: "/student" },
            { label: "Academic record with a long title" },
          ]}
          trailing={<button type="button">Notifications</button>}
        />
      </MemoryRouter>
    )

    const breadcrumb = screen.getByRole("navigation", { name: "breadcrumb" })
    const desktopTrail = breadcrumb.querySelector(".hidden")
    expect(desktopTrail?.textContent).toContain("Student record")
    expect(desktopTrail?.textContent).toContain("Academic record with a long title")
    expect(desktopTrail?.textContent).not.toContain("Department")
    expect(desktopTrail?.querySelector('[aria-current="page"]')?.textContent)
      .toBe("Academic record with a long title")
    expect(desktopTrail?.querySelector('button[aria-label="Show previous pages"]')).toBeTruthy()
  })

  it("renders without crashing when no breadcrumbs are provided", () => {
    render(
      <MemoryRouter>
        <Topbar crumbs={[]} trailing={<button type="button">Profile</button>} />
      </MemoryRouter>
    )

    expect(screen.getByRole("button", { name: "Profile" })).toBeTruthy()
    expect(screen.queryByRole("navigation", { name: "breadcrumb" })).toBeNull()
  })
})
