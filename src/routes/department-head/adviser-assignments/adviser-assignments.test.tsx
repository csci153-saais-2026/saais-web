import { describe, expect, it } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import AdviserAssignmentsPage from "./AdviserAssignmentsPage"
import { validateReassignment, type ReassignmentInput } from "./assignment-model"
import { getAuditEvents, getDirectoryStudents } from "../shared/dh-api"
import { todayInManila } from "../shared/dh-utils"
import type { DirectoryStudent } from "../shared/students-types"
import { renderDepartmentHead, setupDepartmentHeadMockApi } from "../test-utils"

setupDepartmentHeadMockApi()

const TOTAL = 26
const today = "2026-11-06"
const student = (overrides: Partial<DirectoryStudent> = {}): DirectoryStudent => ({
  id: "student-1", name: "Test Student", studentNumber: "26-1-00001", email: "test@vsu.edu.ph",
  curriculum: "BSCS 2024", yearStanding: "1st year", adviser: "Adviser A", adviserSince: "2025-08-05", ...overrides,
})
const input: ReassignmentInput = { studentIds: ["student-1"], adviserId: "adviser-b", effectiveDate: today, reason: "Workload." }

describe("reassignment form rules", () => {
  it("counts the students whose adviser would change", () => {
    expect(validateReassignment([student(), student({ id: "student-2", adviser: "Adviser B" })], { ...input, studentIds: ["student-1", "student-2"] }, "Adviser B")).toBe(1)
  })

  it.each([
    [{ ...input, studentIds: [] }, /Select at least one student/],
    [{ ...input, studentIds: ["missing"] }, /no longer in the directory/],
    [{ ...input, reason: "   " }, /Add a reason/],
    [{ ...input, adviserId: "" }, /Choose the new adviser/],
    [{ ...input, effectiveDate: "2026-02-30" }, /valid effective date/],
  ] as const)("rejects an invalid reassignment: %j", (value, message) => {
    expect(() => validateReassignment([student()], value as ReassignmentInput, "Adviser B")).toThrow(message)
  })

  it("rejects the current adviser, backdating and replacing a scheduled change", () => {
    expect(() => validateReassignment([student()], input, "Adviser A")).toThrow(/different adviser/)
    expect(() => validateReassignment([student()], { ...input, effectiveDate: "2025-08-04" }, "Adviser B")).toThrow(/cannot precede/)
    const scheduled = student({ scheduledAssignment: { adviser: "Adviser C", effectiveDate: "2026-12-01", reason: "" } })
    expect(() => validateReassignment([scheduled], input, "Adviser B")).toThrow(/already has a scheduled/)
  })
})

describe("Adviser Assignments screen", () => {
  async function openPage() {
    renderDepartmentHead(<AdviserAssignmentsPage />)
    await screen.findByText(`Showing ${TOTAL} of ${TOTAL} assignments`)
  }

  async function reassign(name: string, adviser: string, reason: string, date?: string, alreadySelected = false) {
    if (!alreadySelected) fireEvent.click(screen.getByRole("checkbox", { name: `Select ${name}` }))
    fireEvent.click(screen.getByRole("button", { name: "Reassign selected" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.keyDown(within(dialog).getByRole("combobox", { name: "New adviser" }), { key: "ArrowDown" })
    fireEvent.click(await screen.findByRole("option", { name: adviser }))
    fireEvent.change(within(dialog).getByLabelText("Reason for reassignment"), { target: { value: reason } })
    if (date) fireEvent.change(within(dialog).getByLabelText("Effective since"), { target: { value: date } })
    fireEvent.click(within(dialog).getByRole("button", { name: /Apply reassignment|Schedule reassignment/ }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  }

  it("asks for a selection before opening the reassignment dialog", async () => {
    await openPage()
    fireEvent.click(screen.getByRole("button", { name: "Reassign selected" }))
    expect(await screen.findByText("Select at least one student to reassign.")).toBeTruthy()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("has a mixed select-all state and removes selections hidden by filtering", async () => {
    await openPage()
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Sta. Agata, Jerome Daniel S." }))
    expect(screen.getByRole("checkbox", { name: "Select all visible students" }).getAttribute("aria-checked")).toBe("mixed")
    expect(screen.getByText("1 student selected")).toBeTruthy()
    fireEvent.change(screen.getByRole("searchbox", { name: "Search students" }), { target: { value: "Sample Student 02" } })
    expect(screen.getByText("0 students selected")).toBeTruthy()
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all visible students" }))
    expect(screen.getByRole("checkbox", { name: "Select Sample Student 02" }).getAttribute("aria-checked")).toBe("true")
    expect(screen.getByRole("checkbox", { name: "Select all visible students" }).getAttribute("aria-checked")).toBe("true")
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }))
    expect(screen.getByRole("checkbox", { name: "Select all visible students" }).getAttribute("aria-checked")).toBe("mixed")
  })

  it("requires an adviser, then reassigns through the API and records the previous adviser", async () => {
    await openPage()
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Sta. Agata, Jerome Daniel S." }))
    fireEvent.click(screen.getByRole("button", { name: "Reassign selected" }))
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Apply reassignment" }))
    expect(await screen.findByText("Choose the new adviser.")).toBeTruthy()
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

    await reassign("Sta. Agata, Jerome Daniel S.", "Coting, Eulo Rod M.", "Adviser workload redistribution.", undefined, true)
    expect(await screen.findByText("Reassigned 1 student.")).toBeTruthy()
    expect(screen.getByText("0 students selected")).toBeTruthy()
    const row = await screen.findByRole("row", { name: /Sta\. Agata, Jerome Daniel S\./ })
    await waitFor(() => expect(within(row).getByText("Coting, Eulo Rod M.")).toBeTruthy())
    expect(within(row).getByText("Polo, Marco Antonio P.")).toBeTruthy()

    const directory = await getDirectoryStudents()
    expect(directory.find((item) => item.studentNumber === "24-1-01798")).toMatchObject({ adviser: "Coting, Eulo Rod M.", previousAdviser: "Polo, Marco Antonio P." })
    expect((await getAuditEvents()).some((event) => /Reassigned to Coting, Eulo Rod M\. effective/.test(event.details))).toBe(true)
  })

  it("schedules a future change and keeps the current adviser displayed", async () => {
    await openPage()
    const future = `${Number(todayInManila().slice(0, 4)) + 1}-01-15`
    await reassign("Sta. Agata, Jerome Daniel S.", "Coting, Eulo Rod M.", "Planned handover.", future)
    expect(await screen.findByText("Scheduled reassignment for 1 student.")).toBeTruthy()
    const row = await screen.findByRole("row", { name: /Sta\. Agata, Jerome Daniel S\./ })
    await waitFor(() => expect(within(row).getByText(/Scheduled: Coting, Eulo Rod M\. from/)).toBeTruthy())
    expect(within(row).getAllByText("Polo, Marco Antonio P.").length).toBeGreaterThan(0)
  })
})
