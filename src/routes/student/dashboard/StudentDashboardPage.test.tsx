import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { apiClient, type ApiSchema } from "@/lib/api"
import type { AdviserAssignmentRecord } from "@/components/features/assignment-history-dialog"
import {
  StudentDashboardPage,
  StudentDashboardView,
  type StudentDashboardViewProps,
} from "./StudentDashboardPage"
import type { CourseRecommendationRow } from "./CourseRecommendationsPanel"

const STUDENT_ID = "11111111-1111-4111-8111-111111111111"
const ADVISER_ID = "22222222-2222-4222-8222-222222222222"

function buildSummary(
  overrides: Partial<ApiSchema<"AcademicSummary">> = {}
): ApiSchema<"AcademicSummary"> {
  return {
    student_id: STUDENT_ID,
    gwa: 1.756,
    earned_units: 72,
    required_units: 147,
    counted_units: 66,
    is_delinquent: false,
    open_inc_count: 1,
    deficiencies: [
      {
        kind: "open_inc",
        attempt_id: "33333333-3333-4333-8333-333333333333",
        course_code: "CS 221",
        course_title: "Data Structures",
        inc_deadline: "2026-12-15",
        days_remaining: 29,
        detail: null,
      },
      {
        kind: "failed",
        attempt_id: "44444444-4444-4444-8444-444444444444",
        course_code: "MATH 101",
        course_title: "Calculus I",
      },
    ],
    computed_at: "2026-09-19T00:00:00Z",
    ...overrides,
  }
}

const ASSIGNMENTS: AdviserAssignmentRecord[] = [
  {
    id: "55555555-5555-4555-8555-555555555555",
    adviser_id: ADVISER_ID,
    adviser_name: "Prof. Maria Santos",
    adviser_email: "msantos@example.edu",
    adviser_faculty_name: "College of Computing Studies",
    student_id: STUDENT_ID,
    start_date: "2025-08-01",
    end_date: null,
    created_at: "2025-08-01T00:00:00Z",
  },
]

const RECOMMENDATIONS: CourseRecommendationRow[] = [
  {
    id: "66666666-6666-4666-8666-666666666666",
    advising_plan_id: "77777777-7777-4777-8777-777777777777",
    student_id: STUDENT_ID,
    school_term_id: "88888888-8888-4888-8888-888888888888",
    course_offering_id: "99999999-9999-4999-8999-999999999999",
    display_order: 1,
    created_at: "2026-09-01T00:00:00Z",
    code: "CS 312",
    title: "Algorithms",
    units: 3,
  },
]

const NOTES: ApiSchema<"AdvisingNote">[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    student_id: STUDENT_ID,
    authored_by: ADVISER_ID,
    author_name: "Prof. Maria Santos",
    body_text: "Prioritize clearing the INC in CS 221 before midterms.",
    is_archived: false,
    created_at: "2026-09-10T08:00:00Z",
  },
]

function renderView(props: Partial<StudentDashboardViewProps> = {}) {
  return render(
    <MemoryRouter>
      <StudentDashboardView
        summary={buildSummary()}
        studentName="Juan Dela Cruz"
        adviserAssignments={ASSIGNMENTS}
        recommendations={RECOMMENDATIONS}
        notes={NOTES}
        {...props}
      />
    </MemoryRouter>
  )
}

/** Builds an openapi-fetch style result consumed by `unwrapApiResult`. */
function ok<T>(data: T) {
  return { data, error: undefined, response: new Response(null, { status: 200 }) }
}

function fail(status = 500) {
  return {
    data: undefined,
    error: { message: "Server error" },
    response: new Response(null, { status }),
  }
}

const REST_FIXTURES: Record<string, unknown[]> = {
  "/rest/v1/profile": [{ id: STUDENT_ID, full_name: "Juan Dela Cruz" }],
  "/rest/v1/student_organization": [
    {
      student_id: STUDENT_ID,
      program_id: "prog-1",
      curriculum_version_id: "curr-1",
    },
  ],
  "/rest/v1/adviser_assignment": ASSIGNMENTS,
  "/rest/v1/advising_note": NOTES,
  "/rest/v1/advising_plan_item": [
    {
      id: "66666666-6666-4666-8666-666666666666",
      advising_plan_id: "77777777-7777-4777-8777-777777777777",
      student_id: STUDENT_ID,
      school_term_id: "88888888-8888-4888-8888-888888888888",
      course_offering_id: "offering-1",
      display_order: 1,
      created_at: "2026-09-01T00:00:00Z",
    },
  ],
  "/rest/v1/course_offering": [{ id: "offering-1", course_id: "course-1" }],
  "/rest/v1/course": [
    { id: "course-1", code: "CS 312", title: "Algorithms", units: 3 },
  ],
  "/rest/v1/program": [{ id: "prog-1", name: "BS Information Technology" }],
  "/rest/v1/curriculum_version": [{ id: "curr-1", version_label: "2025–2026" }],
}

function mockApi({ summaryFails = false } = {}) {
  return vi.spyOn(apiClient, "GET").mockImplementation((async (path: string) => {
    if (path === "/functions/v1/students/{student_id}/academic-summary") {
      return summaryFails ? fail() : ok(buildSummary())
    }
    return ok(REST_FIXTURES[path] ?? [])
  }) as never)
}

describe("StudentDashboardView", () => {
  afterEach(() => {
    cleanup()
  })

  it("greets the student by first name", () => {
    renderView()
    expect(screen.getByText("A clearer path forward, Juan.")).toBeTruthy()
  })

  it("falls back to 'Student' when no name is provided", () => {
    renderView({ studentName: null })
    expect(screen.getByText("A clearer path forward, Student.")).toBeTruthy()
  })

  it("renders academic stat tiles from the summary", () => {
    renderView()
    expect(screen.getByText("1.76")).toBeTruthy()
    expect(screen.getByText("66 counted units")).toBeTruthy()
    expect(screen.getByText("72")).toBeTruthy()
    expect(screen.getByText("of 147 required units")).toBeTruthy()
    expect(screen.getByText("Good")).toBeTruthy()
    expect(
      screen.getByText("12 failed units per term triggers a flag")
    ).toBeTruthy()
    expect(screen.getByText("Review completion deadlines")).toBeTruthy()
  })

  it("shows 'Not available' GWA and 'Flagged' standing when applicable", () => {
    renderView({
      summary: buildSummary({
        gwa: null,
        is_delinquent: true,
        open_inc_count: 0,
        deficiencies: [],
      }),
    })
    expect(screen.getByText("Not available")).toBeTruthy()
    expect(screen.getByText("Flagged")).toBeTruthy()
    expect(screen.getByText("No incomplete grades")).toBeTruthy()
    expect(screen.getByText("No incomplete grades. Nice work.")).toBeTruthy()
  })

  it("falls back to earned units when counted_units is missing", () => {
    renderView({ summary: buildSummary({ counted_units: undefined }) })
    expect(screen.getByText("72 counted units")).toBeTruthy()
  })

  it("renders quick access links with default hrefs", () => {
    renderView()
    const reviewGrades = screen.getByRole("link", { name: "Review grades" })
    const history = screen.getByRole("link", { name: "Enrollment history" })
    expect(reviewGrades.getAttribute("href")).toBe("/student/grades")
    expect(history.getAttribute("href")).toBe("/student/history")
    for (const link of screen.getAllByRole("link", { name: "Open checklist" })) {
      expect(link.getAttribute("href")).toBe("/student/checklist")
    }
  })

  it("renders course recommendations and the open INC radar", () => {
    renderView()
    expect(screen.getByText("CS 312")).toBeTruthy()
    expect(screen.getByText("Algorithms")).toBeTruthy()
    expect(screen.getByText("1 incomplete course to review")).toBeTruthy()
    expect(screen.getByText("CS 221")).toBeTruthy()
    expect(screen.queryByText("MATH 101")).toBeNull()
  })

  it("shows empty recommendation state", () => {
    renderView({ recommendations: [] })
    expect(screen.getByText("No recommendations yet.")).toBeTruthy()
  })

  it("renders the current adviser card details", () => {
    renderView()
    expect(screen.getByText("MS")).toBeTruthy()
    expect(screen.getByText("College of Computing Studies")).toBeTruthy()
    expect(screen.getByText("msantos@example.edu")).toBeTruthy()
    expect(screen.getByText("Assigned since 1 Aug 2025")).toBeTruthy()
  })

  it("uses adviser fallbacks when there are no assignments", () => {
    renderView({ adviserAssignments: [] })
    expect(screen.getAllByText("Assigned Adviser").length).toBeGreaterThan(0)
    expect(screen.getByText("Faculty of Computing")).toBeTruthy()
    expect(screen.getByText("AA")).toBeTruthy()
  })

  it("opens the advising notes dialog", async () => {
    renderView()
    fireEvent.click(screen.getByRole("button", { name: "View Advising Notes" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Advising notes")).toBeTruthy()
    expect(
      within(dialog).getByText(
        "Prioritize clearing the INC in CS 221 before midterms."
      )
    ).toBeTruthy()
  })

  it("opens the assignment history dialog", async () => {
    renderView()
    fireEvent.click(
      screen.getByRole("button", { name: "View assignment history" })
    )
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Assignment history")).toBeTruthy()
  })
})

describe("StudentDashboardPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  function renderPage() {
    return render(
      <MemoryRouter>
        <StudentDashboardPage studentId={STUDENT_ID} />
      </MemoryRouter>
    )
  }

  it("shows a loading state, then hydrates the dashboard", async () => {
    const getSpy = mockApi()
    renderPage()

    expect(screen.getByRole("status").textContent).toBe("Loading...")

    expect(
      await screen.findByText("A clearer path forward, Juan.")
    ).toBeTruthy()
    expect(
      screen.getByText(/BS Information Technology .* Curriculum 2025–2026/)
    ).toBeTruthy()
    expect(screen.getByText("CS 312")).toBeTruthy()
    expect(screen.getByText("Algorithms")).toBeTruthy()

    expect(getSpy).toHaveBeenCalledWith(
      "/functions/v1/students/{student_id}/academic-summary",
      { params: { path: { student_id: STUDENT_ID } } }
    )
    expect(getSpy).toHaveBeenCalledWith(
      "/rest/v1/profile",
      expect.objectContaining({
        params: { query: { id: `eq.${STUDENT_ID}` } },
      })
    )
  })

  it("shows an error panel and recovers on retry", async () => {
    mockApi({ summaryFails: true })
    renderPage()

    expect(await screen.findByText("Unable to load dashboard")).toBeTruthy()

    vi.restoreAllMocks()
    mockApi()

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    await waitFor(() => {
      expect(screen.getByText("A clearer path forward, Juan.")).toBeTruthy()
    })
    expect(screen.queryByText("Unable to load dashboard")).toBeNull()
  })
})
