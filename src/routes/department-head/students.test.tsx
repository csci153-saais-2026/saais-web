import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import StudentsPage from "./StudentsPage"
import { PreviewStateProvider } from "./PreviewStateProvider"

afterEach(cleanup)
beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = vi.fn()
})

function openDirectory() {
  return render(<PreviewStateProvider><StudentsPage /></PreviewStateProvider>)
}

async function chooseFilter(label: string, value: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), { key: "ArrowDown" })
  fireEvent.click(await screen.findByRole("option", { name: value }))
}

describe("Students directory", () => {
  it("searches names and IDs with case and surrounding spaces ignored", () => {
    openDirectory()
    expect(screen.getByText("Showing 8 of 8 sample students")).toBeTruthy()
    fireEvent.change(screen.getByRole("searchbox", { name: "Search students" }), { target: { value: "  ANA MARIE  " } })
    expect(screen.getByText("Showing 1 of 8 sample students")).toBeTruthy()
    expect(screen.getByRole("button", { name: "View Ana Marie Santos checklist" })).toBeTruthy()
    fireEvent.change(screen.getByRole("searchbox", { name: "Search students" }), { target: { value: "24-1-00124" } })
    expect(screen.getByText("Showing 1 of 8 sample students")).toBeTruthy()
  })

  it("combines both filters, reports no matches and resets all controls", async () => {
    openDirectory()
    await chooseFilter("Curriculum", "BSCS 2024")
    await chooseFilter("Adviser", "Dr. Elena Reyes")
    expect(screen.getByText("Showing 2 of 8 sample students")).toBeTruthy()
    await chooseFilter("Adviser", "Prof. Patricia Lim")
    expect(screen.getByText("No students match these filters.")).toBeTruthy()
    expect(screen.getByText("Showing 0 of 8 sample students")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }))
    expect(screen.getByText("Showing 8 of 8 sample students")).toBeTruthy()
    expect(screen.getByRole("combobox", { name: "Curriculum" }).textContent).toContain("All curricula")
    expect(screen.getByRole("combobox", { name: "Adviser" }).textContent).toContain("All advisers")
  })

  it("opens a read-only curriculum excerpt for the selected student", async () => {
    openDirectory()
    fireEvent.click(screen.getByRole("button", { name: "View Sofia Isabel Garcia checklist" }))
    const dialog = screen.getByRole("dialog", { name: "Sofia Isabel Garcia · Checklist" })
    expect(within(dialog).getByText("Read-only preview")).toBeTruthy()
    expect(within(dialog).getByText("IT 101")).toBeTruthy()
    expect(within(dialog).queryByRole("button", { name: /save|edit|record grade/i })).toBeNull()
    fireEvent.click(within(dialog).getAllByRole("button", { name: "Course info" })[0])
    expect(within(dialog).getByText(/This sample requirement carries 3 units/)).toBeTruthy()
    fireEvent.click(within(dialog).getByRole("button", { name: "Close preview" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("rejects absent or unsupported spreadsheet selections", () => {
    openDirectory()
    fireEvent.click(screen.getByRole("button", { name: "Import spreadsheet" }))
    fireEvent.click(screen.getByRole("button", { name: "Show validation example" }))
    expect(screen.getByText("Choose a .xlsx or .csv file first.")).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Student spreadsheet"), { target: { files: [new File(["example"], "notes.txt")] } })
    fireEvent.click(screen.getByRole("button", { name: "Show validation example" }))
    expect(screen.getByText("Choose a .xlsx or .csv file.")).toBeTruthy()
  })

  it.each(["sample.csv", "sample.XLSX"])("shows illustrative results for %s without importing any rows", async (filename) => {
    openDirectory()
    fireEvent.click(screen.getByRole("button", { name: "Import spreadsheet" }))
    fireEvent.change(screen.getByLabelText("Student spreadsheet"), { target: { files: [new File(["contents are not parsed"], filename)] } })
    fireEvent.click(screen.getByRole("button", { name: "Show validation example" }))
    const results = screen.getByRole("region", { name: "Sample validation results" })
    expect(within(results).getByText("Valid")).toBeTruthy()
    expect(within(results).getByText("Invalid ID")).toBeTruthy()
    expect(within(results).getByText("Duplicate ID")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(screen.getByText("Showing 8 of 8 sample students")).toBeTruthy()
  })
})
