import { afterEach, describe, expect, it, vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { apiClient, type ApiSchema } from "@/lib/api"
import { StudentGradesPage, StudentGradesView } from "./StudentGradesPage"
import type { TermGradesSection } from "./TermGradesPanel"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const mockTerms: TermGradesSection[] = [
  {
    school_term_id: "term-2",
    school_year: "2025 - 2026",
    term_type: "1st Semester",
    chronological_key: 20251,
    gwa: 1.75,
    is_locked: false,
    attempts: [
      {
        id: "att-1",
        student_id: "stu-1",
        course_offering_id: "off-1",
        code: "CSIT 103",
        title: "Data Structures and Algorithms",
        recorded_status: "passed",
        midterm_status: "graded",
        midterm_grade: 1.75,
        final_grade: 1.75,
        inc_deadline: null,
        units_attempted: 4,
        revision: 1,
        completion_grade: null,
        effective_status: "passed",
        gwa_grade: 1.75,
        is_lapsed_inc: false,
        is_repeated: false,
        counts_toward_cumulative_gwa: true,
      },
      {
        id: "att-2",
        student_id: "stu-1",
        course_offering_id: "off-2",
        code: "CSci 102",
        title: "Discrete Structures I",
        recorded_status: "inc",
        midterm_status: "graded",
        midterm_grade: 2,
        final_grade: null,
        inc_deadline: "2026-10-26",
        units_attempted: 3,
        revision: 1,
        completion_grade: null,
        effective_status: "inc",
        gwa_grade: null,
        is_lapsed_inc: false,
        is_repeated: false,
        counts_toward_cumulative_gwa: false,
      },
    ],
  },
  {
    school_term_id: "term-1",
    school_year: "2024 - 2025",
    term_type: "2nd Semester",
    chronological_key: 20242,
    gwa: 5.0,
    is_locked: true,
    attempts: [
      {
        id: "att-3",
        student_id: "stu-1",
        course_offering_id: "off-3",
        code: "Math 21",
        title: "Calculus",
        recorded_status: "inc",
        midterm_status: "graded",
        midterm_grade: 2.5,
        final_grade: null,
        inc_deadline: "2025-12-01",
        units_attempted: 3,
        revision: 1,
        completion_grade: null,
        effective_status: "failed",
        gwa_grade: 5,
        is_lapsed_inc: true,
        is_repeated: false,
        counts_toward_cumulative_gwa: true,
      },
    ],
  },
]

const mockFlags: ApiSchema<"GradeFlag">[] = [
  {
    id: "flag-1",
    student_id: "stu-1",
    attempt_id: "att-1",
    reported_stage: "final",
    reported_grade_text: "1.75",
    issue_type: "incorrect_grade",
    details: "Class record showed 1.50.",
    status: "open",
    created_at: "2026-09-10T08:00:00Z",
    updated_at: "2026-09-10T08:00:00Z",
  },
]

describe("StudentGradesView", () => {
  it("renders term GWA, lock states, INC deadline, distinct INC vs INC lapsed, and GradeFlagsListDialog", () => {
    render(<StudentGradesView terms={mockTerms} flags={mockFlags} />)

    expect(screen.getByText(/Term GWA 1\.75.*Open term/)).toBeTruthy()
    expect(screen.getByText(/Term GWA 5\.00.*Locked term/)).toBeTruthy()
    expect(screen.getByText("Due 26 Oct 2026")).toBeTruthy()
    expect(screen.getAllByText("INC").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText("INC lapsed").length).toBeGreaterThanOrEqual(1)

    const flaggedBtn = screen.getByRole("button", { name: "Flagged" })
    expect(flaggedBtn.getAttribute("aria-pressed")).toBe("true")

    fireEvent.click(screen.getByRole("button", { name: "View Grade Flags" }))
    expect(screen.getByText("Grade flags")).toBeTruthy()
    expect(screen.getByText("Class record showed 1.50.")).toBeTruthy()
    expect(screen.getByText("Under review")).toBeTruthy()
  })

  it("submits FlagGradeDialog and invokes onCreateFlag", async () => {
    const onCreateFlag = vi.fn().mockResolvedValue(undefined)
    render(
      <StudentGradesView
        terms={mockTerms}
        flags={[]}
        onCreateFlag={onCreateFlag}
      />
    )

    const flagButtons = screen.getAllByRole("button", { name: "Flag Grade" })
    fireEvent.click(flagButtons[0])

    expect(screen.getByText("Flag a grade")).toBeTruthy()
    const detailsInput = screen.getByLabelText("Details")
    fireEvent.change(detailsInput, {
      target: { value: "Final grade should be 1.50." },
    })

    fireEvent.click(screen.getByRole("button", { name: "Submit flag" }))

    await waitFor(() => {
      expect(onCreateFlag).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt_id: "att-1",
          issue_type: "incorrect_grade",
          details: "Final grade should be 1.50.",
        })
      )
    })
  })
})

describe("StudentGradesPage", () => {
  it("shows Loading... while pending, Try again on error, and recovers on retry", async () => {
    let callCount = 0
    vi.spyOn(apiClient, "GET").mockImplementation((path: string) => {
      if (path === "/functions/v1/students/{student_id}/grades") {
        callCount += 1
        if (callCount === 1) {
          return Promise.reject(new Error("Network error")) as never
        }
        return Promise.resolve({
          data: mockTerms,
          response: new Response(),
        }) as never
      }
      return Promise.resolve({
        data: [],
        response: new Response(),
      }) as never
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <StudentGradesPage studentId="stu-1" />
      </QueryClientProvider>
    )

    expect(screen.getByRole("status").textContent).toBe("Loading...")

    const retryBtn = await screen.findByRole("button", { name: "Try again" })
    fireEvent.click(retryBtn)

    await waitFor(() => {
      expect(screen.getByText(/2025 - 2026 · 1st Semester/)).toBeTruthy()
    })
  })
})
