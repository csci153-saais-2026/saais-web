import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { AssignmentHistoryDialog } from "@/components/features/assignment-history-dialog"
import {
  CourseInfoDialog,
  type CourseInfoSlotRecord,
} from "@/components/features/course-info-dialog"
import { ReportPdfPreviewDialog } from "@/components/features/report-pdf-preview-dialog"
import { formatChecklistReport } from "@/lib/pdf/student-report-formatter"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("AssignmentHistoryDialog", () => {
  it("renders gap-free adviser assignment rows with Present for active end_date and data-label attributes", () => {
    render(
      <AssignmentHistoryDialog
        open
        onOpenChange={() => undefined}
        assignments={[
          {
            id: "a-old",
            adviser_id: "adv-1",
            adviser_name: "Prof. Lourdes Mendez",
            student_id: "stu-1",
            start_date: "2023-08-28",
            end_date: "2024-06-12",
            handover_label: "Handed over to Prof. Reyes",
            created_at: "2023-08-28T08:00:00Z",
          },
          {
            id: "a-curr",
            adviser_id: "adv-2",
            adviser_name: "Prof. Ramon Reyes",
            student_id: "stu-1",
            start_date: "2024-06-12",
            end_date: null,
            created_at: "2024-06-12T08:00:00Z",
          },
        ]}
      />
    )

    expect(screen.getByText("Assignment history")).toBeTruthy()
    expect(screen.getByText("Prof. Ramon Reyes")).toBeTruthy()
    expect(screen.getByText("Present")).toBeTruthy()
    expect(screen.getByText("Current adviser")).toBeTruthy()
    expect(screen.getByText("Prof. Lourdes Mendez")).toBeTruthy()
    expect(screen.getByText("Handed over to Prof. Reyes")).toBeTruthy()

    const cells = Array.from(document.querySelectorAll("td"))
    expect(cells[0].getAttribute("data-label")).toBe("Adviser")
    expect(cells[1].getAttribute("data-label")).toBe("From")
    expect(cells[2].getAttribute("data-label")).toBe("To")
    expect(cells[3].getAttribute("data-label")).toBe("Note")
  })
})

describe("CourseInfoDialog", () => {
  it("renders StatusBadge, GOLD_DP exception provenance, attempts table, and grade_fix_history", () => {
    const slot: CourseInfoSlotRecord = {
      curriculum_term_course_id: "slot-1",
      code: "CSci 135",
      title: "Software Engineering I",
      status: "passed",
      required_units: 3,
      earned_units: 3,
      source_attempt_id: "att-2",
      satisfaction_source: "Transfer equivalency",
      credited_course_code: "CSci E-WA1",
      credited_course_title: "Web Systems and Technologies 1",
      attempts: [
        {
          attempt_id: "att-1",
          school_term_id: "term-1",
          term_label: "2024–2025 1st Semester",
          midterm_status: "graded",
          midterm_grade: 2.5,
          final_grade: 5,
          recorded_status: "failed",
          completion_grade: null,
          effective_status: "failed",
          instructor: "Prof. Reyes",
        },
        {
          attempt_id: "att-2",
          school_term_id: "term-2",
          term_label: "2024–2025 2nd Semester",
          midterm_status: "graded",
          midterm_grade: 1.75,
          final_grade: 1.75,
          recorded_status: "passed",
          completion_grade: null,
          effective_status: "passed",
          instructor: "Prof. Santos",
        },
      ],
      grade_fix_history: [
        {
          changed_at: "2026-03-03T10:00:00Z",
          old_grade: 2.25,
          new_grade: 1.75,
          actor_name: "Prof. Ramon Reyes",
        },
      ],
    }

    render(
      <CourseInfoDialog open onOpenChange={() => undefined} slot={slot} />
    )

    expect(screen.getByText("CSci 135 · Software Engineering I")).toBeTruthy()
    const sourceEl = document.querySelector('[data-slot="satisfaction-source"]')!
    expect(sourceEl.textContent).toContain("Transfer equivalency")
    expect(sourceEl.className).toContain("text-gold-deep")
    expect(screen.getByText("Prof. Santos")).toBeTruthy()
    expect(screen.getByText(/03 Mar 2026.*Prof\. Ramon Reyes/)).toBeTruthy()
  })

  it("distinguishes INC lapsed from INC in CourseInfoDialog", () => {
    const slot: CourseInfoSlotRecord = {
      curriculum_term_course_id: "slot-2",
      code: "CSci 102",
      title: "Discrete Structures I",
      status: "inc",
      is_lapsed_inc: true,
      required_units: 3,
      earned_units: 0,
      source_attempt_id: "att-3",
      satisfaction_source: "Direct",
      attempts: [
        {
          attempt_id: "att-3",
          school_term_id: "term-1",
          term_label: "2024–2025 2nd Semester",
          midterm_status: "graded",
          midterm_grade: 2,
          final_grade: null,
          recorded_status: "inc",
          completion_grade: null,
          effective_status: "failed",
          is_lapsed_inc: true,
          instructor: "Prof. Santos",
        },
      ],
      grade_fix_history: [],
    }

    render(
      <CourseInfoDialog open onOpenChange={() => undefined} slot={slot} />
    )

    expect(screen.getAllByText("INC lapsed").length).toBeGreaterThanOrEqual(2)
  })
})

describe("ReportPdfPreviewDialog", () => {
  it("generates the actual PDF preview in an iframe and triggers onPrint on Download PDF", async () => {
    const onPrint = vi.fn()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Asset unavailable"))
    )
    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:mock-pdf")
    const revokeObjectUrlSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined)
    const report = formatChecklistReport({
      studentName: "Maria Isabel Bautista",
      studentNumber: "23-1-04412",
      adviserName: "Prof. Ramon Reyes",
      sections: [
        {
          title: "Year 1 · Semester 1",
          slots: [
            {
              code: "CSIT 100",
              title: "Introduction to Computing",
              requiredUnits: 3,
              earnedUnits: 3,
              status: "passed",
              finalGrade: 1.5,
            },
          ],
        },
      ],
    })

    render(
      <ReportPdfPreviewDialog
        open
        onOpenChange={() => undefined}
        report={report}
        onPrint={onPrint}
      />
    )

    expect(screen.getByText("Preview: Program checklist")).toBeTruthy()
    const iframe = await screen.findByTitle("Preview: Program checklist")
    expect(iframe.getAttribute("src")).toBe("blob:mock-pdf")
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)

    const downloadLink = screen.getByRole("link", { name: "Download PDF" })
    expect(downloadLink.getAttribute("download")).toBe(
      "SAAIS-program-checklist.pdf"
    )
    downloadLink.addEventListener("click", (e) => e.preventDefault())
    fireEvent.click(downloadLink)
    expect(onPrint).toHaveBeenCalledWith("pdf_exported")

    createObjectUrlSpy.mockRestore()
    revokeObjectUrlSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})
