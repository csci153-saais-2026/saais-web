import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { apiClient, type ApiSchema } from "@/lib/api";
import {
  StudentChecklistPage,
  StudentChecklistView,
  type ChecklistTermSection,
} from "./StudentChecklistPage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockSummary: ApiSchema<"AcademicSummary"> = {
  student_id: "stu-1",
  gwa: 1.58,
  earned_units: 56,
  required_units: 147,
  counted_units: 56,
  year_level: 2,
  deficiencies_count: 1,
  deficiencies: [
    {
      kind: "open_inc",
      attempt_id: "att-inc",
      course_code: "CSci 102",
      course_title: "Discrete Structures I",
      inc_deadline: "2026-10-26",
    },
  ],
  is_delinquent: false,
  computed_at: "2026-09-19T00:00:00Z",
};

const mockTerms: ChecklistTermSection[] = [
  {
    id: "term-y1s1",
    yearLevel: 1,
    termSequence: 1,
    title: "Year 1 · Semester 1",
    slots: [
      {
        curriculum_term_course_id: "slot-1",
        code: "CSIT 100",
        title: "Introduction to Computing",
        status: "passed",
        required_units: 3,
        earned_units: 3,
        source_attempt_id: "att-repeat",
        satisfaction_source: "Direct",
        credited_course_code: "CSIT 100",
        attempts: [
          {
            attempt_id: "att-1",
            school_term_id: "st-1",
            term_label: "2024–2025 1st Semester",
            midterm_status: "graded",
            midterm_grade: 1.5,
            final_grade: 1.5,
            recorded_status: "passed",
            completion_grade: null,
            effective_status: "passed",
            instructor: "Prof. Tan",
          },
          {
            attempt_id: "att-repeat",
            school_term_id: "st-3",
            term_label: "2025–2026 1st Semester",
            midterm_status: "graded",
            midterm_grade: 1.25,
            final_grade: 1.25,
            recorded_status: "passed",
            completion_grade: null,
            effective_status: "passed",
            instructor: "Prof. Tan",
          },
        ],
        grade_fix_history: [],
      },
      {
        curriculum_term_course_id: "slot-2",
        code: "CSci 102",
        title: "Discrete Structures I",
        status: "inc",
        required_units: 3,
        earned_units: 0,
        source_attempt_id: "att-inc",
        satisfaction_source: "Direct",
        credited_course_code: "CSci 102",
        attempts: [
          {
            attempt_id: "att-inc",
            school_term_id: "st-2",
            term_label: "2024–2025 2nd Semester",
            midterm_status: "graded",
            midterm_grade: 2,
            final_grade: null,
            recorded_status: "inc",
            completion_grade: null,
            effective_status: "inc",
            instructor: "Prof. Santos",
          },
        ],
        grade_fix_history: [],
      },
    ],
  },
  {
    id: "term-y1s2",
    yearLevel: 1,
    termSequence: 2,
    title: "Year 1 · Semester 2",
    slots: [
      {
        curriculum_term_course_id: "slot-3",
        code: "CSci 104",
        title: "Algorithms and Complexity",
        status: "not_taken",
        required_units: 4,
        earned_units: 0,
        source_attempt_id: null,
        satisfaction_source: null,
        attempts: [],
        grade_fix_history: [],
      },
    ],
  },
];

describe("StudentChecklistView", () => {
  it("renders summary tiles, term groups, collapse/expand all, and opens CourseInfoDialog & ReportPdfPreviewDialog", () => {
    render(
      <StudentChecklistView
        summary={mockSummary}
        terms={mockTerms}
        studentName="Maria Isabel Bautista"
        studentNumber="23-1-04412"
        adviserName="Prof. Ramon Reyes"
      />,
    );

    expect(screen.getByText("1.58")).toBeTruthy();
    expect(screen.getByText("2nd year")).toBeTruthy();
    expect(screen.getByText("Year 1 · Semester 1")).toBeTruthy();
    expect(screen.getByText("Year 1 · Semester 2")).toBeTruthy();
    expect(document.querySelectorAll("table").length).toBeGreaterThanOrEqual(2);

    const collapseBtn = screen.getByRole("button", { name: "Collapse all" });
    fireEvent.click(collapseBtn);
    expect(screen.getByRole("button", { name: "Expand all" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getByRole("button", { name: "Collapse all" })).toBeTruthy();

    const infoButtons = screen.getAllByRole("button", { name: "Course info" });
    fireEvent.click(infoButtons[0]);
    expect(
      screen.getByText("CSIT 100 · Introduction to Computing"),
    ).toBeTruthy();
    expect(screen.getAllByText("Prof. Tan").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);

    fireEvent.click(
      screen.getByRole("button", { name: /Download Checklist/i }),
    );
    expect(screen.getByText("Preview: Program checklist")).toBeTruthy();
    expect(screen.getByText("SAAIS-curriculum-checklist.pdf")).toBeTruthy();
  });

  it("filters checklist rows by status", () => {
    Element.prototype.scrollIntoView = vi.fn();
    render(<StudentChecklistView summary={mockSummary} terms={mockTerms} />);

    const selectTrigger = screen.getByRole("combobox", {
      name: "Show requirements",
    });
    fireEvent.click(selectTrigger);
    fireEvent.click(screen.getByRole("option", { name: "Not yet taken" }));

    expect(screen.getByText("CSci 104")).toBeTruthy();
    expect(screen.queryByText("CSIT 100")).toBeNull();

    fireEvent.click(selectTrigger);
    fireEvent.click(screen.getByRole("option", { name: "Currently enrolled" }));
    expect(screen.getByText("No matching requirements")).toBeTruthy();
  });

  it("keeps curriculum-position totals stable under the status filter and omits a misleading semester GWA", () => {
    Element.prototype.scrollIntoView = vi.fn();
    render(<StudentChecklistView summary={mockSummary} terms={mockTerms} />);
    expect(screen.getByText("3/6")).toBeTruthy();
    expect(screen.queryByText("Semester GWA")).toBeNull();

    const select = screen.getByRole("combobox", { name: "Show requirements" });
    fireEvent.click(select);
    fireEvent.click(screen.getByRole("option", { name: "INC" }));
    expect(screen.getByText("3/6")).toBeTruthy();
    expect(screen.getAllByText("CSci 102").length).toBeGreaterThan(0);
    expect(screen.queryByText("CSIT 100")).toBeNull();
    expect(screen.queryByText("Semester GWA")).toBeNull();

    fireEvent.click(select);
    fireEvent.click(screen.getByRole("option", { name: "Passed / credited" }));
    expect(screen.getByText("3/6")).toBeTruthy();
    expect(screen.getByText("CSIT 100")).toBeTruthy();
  });
});

describe("StudentChecklistPage", () => {
  it("shows Loading... while pending, Try again on error, and recovers on retry", async () => {
    let callCount = 0;
    vi.spyOn(apiClient, "GET").mockImplementation((path: string) => {
      if (path === "/functions/v1/students/{student_id}/academic-summary") {
        callCount += 1;
        if (callCount === 1) {
          return Promise.reject(new Error("Failed")) as never;
        }
        return Promise.resolve({
          data: mockSummary,
          response: new Response(),
        }) as never;
      }
      if (path === "/functions/v1/students/{student_id}/checklist") {
        return Promise.resolve({
          data: [],
          response: new Response(),
        }) as never;
      }
      return Promise.resolve({
        data: [],
        response: new Response(),
      }) as never;
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <StudentChecklistPage studentId="stu-1" />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("status").textContent).toBe("Loading...");

    const retryBtn = await screen.findByRole("button", { name: "Try again" });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("1.58")).toBeTruthy();
    });
  });
});
