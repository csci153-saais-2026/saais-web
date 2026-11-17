import { describe, expect, it } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import StudentsPage from "./StudentsPage"
import { renderDepartmentHead, setupDepartmentHeadMockApi } from "../test-utils"

setupDepartmentHeadMockApi()

const TOTAL = 26
const ALL = `Showing ${TOTAL} of ${TOTAL} students`

async function openDirectory() {
  renderDepartmentHead(<StudentsPage />)
  await screen.findByText(ALL)
}

async function chooseFilter(label: string, value: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), { key: "ArrowDown" })
  fireEvent.click(await screen.findByRole("option", { name: value }))
}

describe("Students directory", () => {
  it("summarises the department directory from the API", async () => {
    await openDirectory()
    expect(screen.getByText(`${TOTAL} enrolled students · BSCS and BSIT · AY 2025–2026, 1st semester`)).toBeTruthy()
  })

  it("searches names and IDs with case and surrounding spaces ignored", async () => {
    await openDirectory()
    fireEvent.change(screen.getByRole("searchbox", { name: "Search students" }), { target: { value: "  STA. AGATA  " } })
    expect(screen.getByText(`Showing 1 of ${TOTAL} students`)).toBeTruthy()
    expect(screen.getByRole("button", { name: "View Sta. Agata, Jerome Daniel S. checklist" })).toBeTruthy()
    fireEvent.change(screen.getByRole("searchbox", { name: "Search students" }), { target: { value: "26-1-10002" } })
    expect(screen.getByText(`Showing 1 of ${TOTAL} students`)).toBeTruthy()
  })

  it("combines filters, reports no matches and resets all controls", async () => {
    await openDirectory()
    await chooseFilter("Adviser", "Coting, Eulo Rod M.")
    expect(screen.getByText(`Showing 12 of ${TOTAL} students`)).toBeTruthy()
    fireEvent.change(screen.getByRole("searchbox", { name: "Search students" }), { target: { value: "Sample Student 02" } })
    expect(screen.getByText(`Showing 1 of ${TOTAL} students`)).toBeTruthy()
    await chooseFilter("Adviser", "Polo, Marco Antonio P.")
    expect(screen.getByText("No students match these filters.")).toBeTruthy()
    expect(screen.getByText(`Showing 0 of ${TOTAL} students`)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }))
    expect(screen.getByText(ALL)).toBeTruthy()
    expect(screen.getByRole("combobox", { name: "Curriculum" }).textContent).toContain("All curricula")
    expect(screen.getByRole("combobox", { name: "Adviser" }).textContent).toContain("All advisers")
  })

  it("opens the student's read-only checklist loaded from the API", async () => {
    await openDirectory()
    fireEvent.click(screen.getByRole("button", { name: "View Sta. Agata, Jerome Daniel S. checklist" }))
    const dialog = await screen.findByRole("dialog", { name: "Sta. Agata, Jerome Daniel S. · Checklist" })
    expect(await within(dialog).findByText(/Year 1 · Semester 1/)).toBeTruthy()
    expect(within(dialog).queryByRole("button", { name: /save|edit|record grade/i })).toBeNull()
    fireEvent.click(within(dialog).getAllByRole("button", { name: "Course info" })[0])
    expect(within(dialog).getByText(/This requirement carries \d+ units/)).toBeTruthy()
    fireEvent.click(within(dialog).getAllByRole("button", { name: "Close" }).at(-1)!)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })
})

describe("Student spreadsheet import", () => {
  const header = "student_number,full_name,email,program,curriculum,adviser_email,entry_year"
  const adviserEmail = "23-1-02224@vsu.edu.ph"

  async function openImport() {
    await openDirectory()
    fireEvent.click(screen.getByRole("button", { name: "Import spreadsheet" }))
    return screen.getByRole("dialog", { name: "Import spreadsheet" })
  }

  function choose(dialog: HTMLElement, name: string, contents: string) {
    fireEvent.change(within(dialog).getByLabelText("Student spreadsheet"), { target: { files: [new File([contents], name, { type: "text/csv" })] } })
  }

  it("rejects absent, unsupported and workbook selections", async () => {
    const dialog = await openImport()
    fireEvent.click(within(dialog).getByRole("button", { name: "Check file" }))
    expect(await within(dialog).findByText("Choose a .xlsx or .csv file first.")).toBeTruthy()
    choose(dialog, "notes.txt", "x")
    fireEvent.click(within(dialog).getByRole("button", { name: "Check file" }))
    expect(await within(dialog).findByText("Choose a .xlsx or .csv file.")).toBeTruthy()
    choose(dialog, "students.xlsx", "x")
    fireEvent.click(within(dialog).getByRole("button", { name: "Check file" }))
    expect(await within(dialog).findByText(/Save the sheet as a \.csv file/)).toBeTruthy()
  })

  it("reports a missing column before contacting the API", async () => {
    const dialog = await openImport()
    choose(dialog, "students.csv", "student_number,full_name\n26-1-20001,Test Student")
    fireEvent.click(within(dialog).getByRole("button", { name: "Check file" }))
    expect(await within(dialog).findByText(/Missing columns: email, program, curriculum, adviser_email/)).toBeTruthy()
  })

  it("flags invalid rows and imports nothing until every row is valid", async () => {
    const dialog = await openImport()
    choose(dialog, "students.csv", `${header}\n26-1-20001,Test Student,26-1-20001@vsu.edu.ph,BSCS,BSCS 2024-2025 v1,${adviserEmail},2026\n26-1-20002,Other Student,26-1-20002@vsu.edu.ph,NOPE,BSCS 2024-2025 v1,${adviserEmail},2026`)
    fireEvent.click(within(dialog).getByRole("button", { name: "Check file" }))
    const results = await within(dialog).findByRole("region", { name: "Validation results" })
    expect(within(results).getByText("1 valid · 1 with errors")).toBeTruthy()
    expect(within(results).getByText('Unknown program "NOPE".')).toBeTruthy()
    expect(within(dialog).queryByRole("button", { name: /^Import \d+ student/ })).toBeNull()
  })

  it("imports a valid file through the API", async () => {
    const dialog = await openImport()
    choose(dialog, "students.csv", `${header}\n26-1-20001,Test Student,26-1-20001@vsu.edu.ph,BSCS,BSCS 2024-2025 v1,${adviserEmail},2026`)
    fireEvent.click(within(dialog).getByRole("button", { name: "Check file" }))
    fireEvent.click(await within(dialog).findByRole("button", { name: "Import 1 student" }))
    expect(await within(dialog).findByText("1 imported")).toBeTruthy()
    expect(await screen.findByText("Imported 1 student.")).toBeTruthy()
  })
})
