import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import CurriculaPage from "./CurriculaPage"

beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = vi.fn()
})
afterEach(cleanup)

function expectDeletionBlocked(reason: string) {
  const dialog = within(screen.getByRole("dialog", { name: "Delete record" }))
  expect(dialog.getByRole("alert").textContent).toContain(reason)
  expect((dialog.getByRole("button", { name: "Delete" }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(dialog.getByRole("button", { name: "Cancel" }))
}

function confirmDeletion() {
  const dialog = within(screen.getByRole("dialog", { name: "Delete record" }))
  fireEvent.click(dialog.getByRole("button", { name: "Delete" }))
  expect(screen.queryByRole("dialog")).toBeNull()
}

describe("Curriculum deletion preview", () => {
  it("protects an assigned version, a term containing academic history, and its referenced slot", () => {
    render(<CurriculaPage />)
    fireEvent.click(screen.getByRole("button", { name: "Delete version" }))
    expectDeletionBlocked("Students are assigned to this curriculum.")

    fireEvent.click(screen.getAllByRole("button", { name: "Delete term" })[0])
    expectDeletionBlocked("This term contains slots used by academic history.")

    const row = screen.getByRole("row", { name: /CSIT 100 — Introduction to Computing/ })
    fireEvent.click(within(row).getByRole("button", { name: "Delete" }))
    expectDeletionBlocked("This slot is used by academic history.")
    expect(screen.getByRole("row", { name: /CSIT 100 — Introduction to Computing/ })).toBeTruthy()
  })

  it("preserves the last term and slot of an assigned curriculum", async () => {
    render(<CurriculaPage />)
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Curriculum version" }), { key: "ArrowDown" })
    fireEvent.click(await screen.findByRole("option", { name: "BSCS · 2019–2020" }))

    fireEvent.click(screen.getByRole("button", { name: "Delete term" }))
    expectDeletionBlocked("A referenced curriculum must retain at least one term.")

    const firstRow = screen.getByRole("row", { name: /CSIT 100 — Introduction to Computing/ })
    fireEvent.click(within(firstRow).getByRole("button", { name: "Delete" }))
    confirmDeletion()
    expect(screen.queryByRole("row", { name: /CSIT 100 — Introduction to Computing/ })).toBeNull()

    const lastRow = screen.getByRole("row", { name: /CSIT 101 — Fundamentals of Programming/ })
    fireEvent.click(within(lastRow).getByRole("button", { name: "Delete" }))
    expectDeletionBlocked("Each term in a referenced curriculum must retain at least one slot.")
  })

  it("allows a new draft's last slot, empty term, and version to be deleted", () => {
    render(<CurriculaPage />)
    fireEvent.click(screen.getByRole("button", { name: "Add version" }))
    const versionForm = within(screen.getByRole("dialog", { name: "Add version" }))
    fireEvent.change(versionForm.getByLabelText("Academic year"), { target: { value: "2026–2027" } })
    fireEvent.change(versionForm.getByLabelText("Effective from"), { target: { value: "2026-06-01" } })
    fireEvent.click(versionForm.getByRole("button", { name: "Add version" }))

    fireEvent.click(screen.getByRole("button", { name: "Add term" }))
    fireEvent.click(within(screen.getByRole("dialog", { name: "Add term" })).getByRole("button", { name: "Add term" }))

    fireEvent.click(screen.getByRole("button", { name: "Add course / slot" }))
    const slotForm = within(screen.getByRole("dialog", { name: "Add course / slot" }))
    fireEvent.change(slotForm.getByLabelText("Course / slot"), { target: { value: "Draft elective" } })
    fireEvent.click(slotForm.getByRole("button", { name: "Add" }))

    fireEvent.click(within(screen.getByRole("row", { name: /Draft elective/ })).getByRole("button", { name: "Delete" }))
    confirmDeletion()
    expect(screen.getByText("No courses in this term yet.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Delete term" }))
    confirmDeletion()
    expect(screen.getByText(/This version has no terms yet/)).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Delete version" }))
    confirmDeletion()
    expect(screen.getByText("BSCS · 2026–2027 was deleted.")).toBeTruthy()
  })
})
