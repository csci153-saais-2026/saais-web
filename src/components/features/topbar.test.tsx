import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { Topbar } from "./topbar"

afterEach(cleanup)

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
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/")
    expect(screen.getByRole("link", { name: "Students" }).getAttribute("href")).toBe("/students")
    expect(screen.getByText("Student record").getAttribute("aria-current")).toBe("page")
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
