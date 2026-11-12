import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import AdviserAssignmentsPage from "./AdviserAssignmentsPage"
import { applyReassignment, type ReassignmentInput } from "./assignment-model"
import { SAMPLE_STUDENTS } from "./students-data"
import { useDepartmentHeadPreview } from "./preview-state"
import { DEFAULT_SETTINGS } from "./settings-data"

vi.mock("./preview-state", () => ({
  todayInManila: () => "2026-11-06",
  useDepartmentHeadPreview: vi.fn(),
}))

const notify = vi.fn()
const reassignStudents = vi.fn()
const today = "2026-11-06"
const validInput: ReassignmentInput = {
  studentIds: ["24-1-00124"], adviser: "Prof. Marco Villanueva", effectiveDate: today, reason: "Adviser workload redistribution.",
}

beforeAll(() => {
  // Radix focuses selected options; jsdom has no scrolling implementation.
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = vi.fn()
})

beforeEach(() => {
  notify.mockReset()
  reassignStudents.mockReset()
  reassignStudents.mockImplementation((input: ReassignmentInput) => applyReassignment(SAMPLE_STUDENTS, input, today))
  vi.mocked(useDepartmentHeadPreview).mockReturnValue({
    students: SAMPLE_STUDENTS,
    auditEvents: [],
    settings: structuredClone(DEFAULT_SETTINGS),
    notify,
    reassignStudents,
    updateSettings: vi.fn(),
    resetPreview: vi.fn(),
  })
})
afterEach(cleanup)

describe("local reassignment rules", () => {
  it("updates the current adviser and keeps the previous adviser without mutating fixtures", () => {
    const result = applyReassignment(SAMPLE_STUDENTS, validInput, today)
    expect(result[0].adviser).toBe("Prof. Marco Villanueva")
    expect(result[0].previousAdviser).toBe("Dr. Elena Reyes")
    expect(result[0].adviserSince).toBe(today)
    expect(SAMPLE_STUDENTS[0].adviser).toBe("Dr. Elena Reyes")
    expect(result[1]).toBe(SAMPLE_STUDENTS[1])
  })

  it("schedules a future change and preserves the current adviser", () => {
    const result = applyReassignment(SAMPLE_STUDENTS, { ...validInput, effectiveDate: "2026-11-12" }, today)
    expect(result[0].adviser).toBe("Dr. Elena Reyes")
    expect(result[0].scheduledAssignment).toEqual({
      adviser: "Prof. Marco Villanueva", effectiveDate: "2026-11-12", reason: validInput.reason,
    })
  })

  it.each([
    [{ ...validInput, studentIds: [] }, /Select at least one student/],
    [{ ...validInput, studentIds: ["not-in-directory"] }, /no longer in the directory/],
    [{ ...validInput, reason: "   " }, /Add a reason/],
    [{ ...validInput, adviser: "" }, /Choose the new adviser/],
    [{ ...validInput, adviser: "Dr. Elena Reyes" }, /different adviser/],
    [{ ...validInput, effectiveDate: "2026-02-30" }, /valid effective date/],
  ] as const)("rejects an invalid reassignment: %j", (input, message) => {
    expect(() => applyReassignment(SAMPLE_STUDENTS, input as ReassignmentInput, today)).toThrow(message)
  })

  it("rejects backdating before the current assignment and replacing a scheduled change", () => {
    const dated = SAMPLE_STUDENTS.map((student) => ({ ...student, adviserSince: "2025-08-05" }))
    expect(() => applyReassignment(dated, { ...validInput, effectiveDate: "2025-08-04" }, today)).toThrow(/cannot precede/)
    const scheduled = applyReassignment(dated, { ...validInput, effectiveDate: "2026-11-12" }, today)
    expect(() => applyReassignment(scheduled, validInput, today)).toThrow(/already has a scheduled/)
  })
})

describe("Adviser Assignments screen", () => {
  it("shows useful feedback if reassignment is attempted without a selection", () => {
    render(<AdviserAssignmentsPage />)
    fireEvent.click(screen.getByRole("button", { name: "Reassign selected" }))
    expect(notify).toHaveBeenCalledWith("Select at least one student to reassign.")
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("has a mixed select-all state and removes selections hidden by filtering", () => {
    render(<AdviserAssignmentsPage />)
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Ana Marie Santos" }))
    expect(screen.getByRole("checkbox", { name: "Select all visible students" }).getAttribute("aria-checked")).toBe("mixed")
    expect(screen.getByText("1 student selected")).toBeTruthy()
    fireEvent.change(screen.getByRole("searchbox", { name: "Search students" }), { target: { value: "Luis" } })
    expect(screen.getByText("0 students selected")).toBeTruthy()
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all visible students" }))
    expect(screen.getByRole("checkbox", { name: "Select Luis Miguel Cruz" }).getAttribute("aria-checked")).toBe("true")
    expect(screen.getByRole("checkbox", { name: "Select all visible students" }).getAttribute("aria-checked")).toBe("true")
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }))
    expect(screen.getByRole("checkbox", { name: "Select all visible students" }).getAttribute("aria-checked")).toBe("mixed")
  })

  it("requires valid form values, then submits the chosen students and adviser", async () => {
    render(<AdviserAssignmentsPage />)
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Ana Marie Santos" }))
    fireEvent.click(screen.getByRole("button", { name: "Reassign selected" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply reassignment" }))
    expect(await screen.findByText("Choose the new adviser.")).toBeTruthy()
    fireEvent.keyDown(within(dialog).getByRole("combobox", { name: "New adviser" }), { key: "ArrowDown" })
    const adviser = await screen.findByRole("option", { name: "Prof. Marco Villanueva" })
    fireEvent.click(adviser)
    fireEvent.change(within(dialog).getByLabelText("Reason for reassignment"), { target: { value: validInput.reason } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply reassignment" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(reassignStudents).toHaveBeenLastCalledWith(validInput)
    expect(screen.getByText("0 students selected")).toBeTruthy()
    expect(notify).toHaveBeenLastCalledWith("Reassigned 1 sample student.")
  })
})
