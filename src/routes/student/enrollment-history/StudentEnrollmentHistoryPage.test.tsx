import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { apiClient } from "@/lib/api";
import type { EnrollmentHistoryRow } from "./EnrollmentHistoryTable";
import {
  StudentEnrollmentHistoryPage,
  StudentEnrollmentHistoryView,
} from "./StudentEnrollmentHistoryPage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockAttempts: EnrollmentHistoryRow[] = [
  {
    id: "att-1",
    student_id: "stu-1",
    course_offering_id: "off-1",
    curriculum_term_course_id: "slot-1",
    course_code: "CSIT 103",
    course_title: "Data Structures and Algorithms",
    school_term_label: "2025 - 2026 · 1st Semester",
    provenance_slot_code: "CSIT 103",
    recorded_status: "currently_enrolled",
    midterm_status: null,
    midterm_grade: null,
    final_grade: null,
    inc_deadline: null,
    units_attempted: 4,
    revision: 1,
    completion_grade: null,
    effective_status: "currently_enrolled",
    gwa_grade: null,
    is_lapsed_inc: false,
    is_repeated: false,
    counts_toward_cumulative_gwa: false,
  },
  {
    id: "att-2",
    student_id: "stu-1",
    course_offering_id: "off-2",
    curriculum_term_course_id: null,
    course_code: "CSci E-WA1",
    course_title: "Web Systems and Technologies 1",
    school_term_label: "2024 - 2025 · 2nd Semester",
    recorded_status: "passed",
    midterm_status: "graded",
    midterm_grade: 1.75,
    final_grade: 1.75,
    inc_deadline: null,
    units_attempted: 3,
    revision: 1,
    completion_grade: null,
    effective_status: "passed",
    gwa_grade: 1.75,
    is_lapsed_inc: false,
    is_repeated: false,
    counts_toward_cumulative_gwa: true,
  },
  {
    id: "att-3",
    student_id: "stu-1",
    course_offering_id: "off-3",
    curriculum_term_course_id: "slot-3",
    course_code: "Math 21",
    course_title: "Calculus",
    school_term_label: "2024 - 2025 · 2nd Semester",
    provenance_slot_code: "Math 21",
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
];

describe("StudentEnrollmentHistoryView", () => {
  it("renders attempts across terms, StatusBadges, 2-decimal grades, data-label, and slot provenance", () => {
    render(<StudentEnrollmentHistoryView attempts={mockAttempts} />);

    expect(screen.getByText("Your enrollment history.")).toBeTruthy();
    expect(screen.getByText("2025 - 2026 · 1st Semester")).toBeTruthy();
    expect(
      screen.getAllByText("2024 - 2025 · 2nd Semester").length,
    ).toBeGreaterThanOrEqual(2);

    expect(screen.getByText("Enrolled")).toBeTruthy();
    expect(screen.getByText("Passed")).toBeTruthy();
    expect(screen.getByText("INC lapsed")).toBeTruthy();

    expect(screen.getByText("1.75")).toBeTruthy();
    expect(screen.getByText("5.00")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();

    expect(screen.getByText("No direct slot")).toBeTruthy();

    const cells = Array.from(document.querySelectorAll("td"));
    expect(cells[0].getAttribute("data-label")).toBe("Course");
    expect(cells[1].getAttribute("data-label")).toBe("School term");
    expect(cells[2].getAttribute("data-label")).toBe("Status");
    expect(cells[3].getAttribute("data-label")).toBe("Grade");
    expect(cells[4].getAttribute("data-label")).toBe("Provenance");
    expect(cells[4].textContent).toBe("CSIT 103");
  });

  it("renders empty state when there are no attempts", () => {
    render(<StudentEnrollmentHistoryView attempts={[]} />);
    expect(
      screen.getByText("No enrollment attempts recorded yet."),
    ).toBeTruthy();
  });
});

describe("StudentEnrollmentHistoryPage", () => {
  it("shows Loading... while pending, Try again on error, and recovers on retry", async () => {
    let callCount = 0;
    vi.spyOn(apiClient, "GET").mockImplementation((path: string) => {
      if (path === "/rest/v1/attempt_result") {
        callCount += 1;
        if (callCount === 1) {
          return Promise.reject(new Error("Network error")) as never;
        }
        return Promise.resolve({
          data: mockAttempts,
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
        <StudentEnrollmentHistoryPage studentId="stu-1" />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("status").textContent).toBe("Loading...");

    const retryBtn = await screen.findByRole("button", { name: "Try again" });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("1.75")).toBeTruthy();
    });
  });
});
