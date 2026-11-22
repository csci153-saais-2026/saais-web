import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { apiClient, type ApiSchema } from "@/lib/api";
import {
  StudentDashboardPage,
  StudentDashboardView,
} from "./StudentDashboardPage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const baseSummary: ApiSchema<"AcademicSummary"> = {
  student_id: "stu-1",
  gwa: 1.58,
  earned_units: 56,
  required_units: 147,
  counted_units: 56,
  is_delinquent: false,
  open_inc_count: 1,
  deficiencies: [
    {
      kind: "open_inc",
      attempt_id: "att-1",
      course_code: "CSci 102",
      course_title: "Discrete Structures I",
      inc_deadline: "2026-10-26",
      detail: "Coordinate requirements with your instructor.",
    },
  ],
  computed_at: "2026-09-19T00:00:00Z",
};

describe("StudentDashboardView", () => {
  it("renders numeric GWA, Good standing, INC radar, recommendations, and opens AdvisingNotesDialog & AssignmentHistoryDialog", () => {
    render(
      <MemoryRouter>
        <StudentDashboardView
          summary={baseSummary}
          studentName="Maria Isabel Bautista"
          adviserAssignments={[
            {
              id: "aa-1",
              adviser_id: "adv-1",
              adviser_name: "Prof. Ramon Reyes",
              adviser_email: "ramon.reyes@example.edu.ph",
              adviser_faculty_name: "Faculty of Computing",
              student_id: "stu-1",
              start_date: "2024-06-12",
              end_date: null,
              created_at: "2024-06-12T08:00:00Z",
            },
          ]}
          recommendations={[
            {
              id: "pi-1",
              advising_plan_id: "plan-1",
              student_id: "stu-1",
              school_term_id: "term-1",
              course_offering_id: "off-1",
              display_order: 1,
              created_at: "2026-08-01T08:00:00Z",
              code: "CSci 104",
              title: "Algorithms and Complexity",
              units: 4,
            },
          ]}
          notes={[
            {
              id: "note-1",
              student_id: "stu-1",
              authored_by: "adv-1",
              author_name: "Prof. Ramon Reyes",
              body_text: "Review CSci 102 completion requirements.",
              is_archived: false,
              created_at: "2026-09-17T08:00:00Z",
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("A clearer path forward, Maria.")).toBeTruthy();
    expect(screen.getByText("1.58")).toBeTruthy();
    expect(screen.getByText("56")).toBeTruthy();
    expect(screen.queryByText("/ 147")).toBeNull();
    expect(screen.getByText("Good")).toBeTruthy();
    expect(screen.getByText("CSci 102")).toBeTruthy();
    expect(screen.getByText(/Due 26 Oct 2026/)).toBeTruthy();
    expect(screen.getByText("CSci 104")).toBeTruthy();
    expect(screen.getByText("Suggested")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "View Advising Notes" }),
    );
    expect(screen.getByText("Advising notes")).toBeTruthy();
    expect(
      screen.getByText("Review CSci 102 completion requirements."),
    ).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);

    fireEvent.click(
      screen.getByRole("button", { name: "View assignment history" }),
    );
    expect(screen.getByText("Assignment history")).toBeTruthy();
    expect(screen.getByText("Present")).toBeTruthy();
  });

  it("renders Not available for null GWA, Flagged standing when delinquent, and empty recommendations", () => {
    render(
      <MemoryRouter>
        <StudentDashboardView
          summary={{
            ...baseSummary,
            gwa: null,
            is_delinquent: true,
            open_inc_count: 0,
            deficiencies: [],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Not available")).toBeTruthy();
    expect(screen.getByText("Flagged")).toBeTruthy();
    expect(screen.getByText("No recommendations yet.")).toBeTruthy();
  });
});

describe("StudentDashboardPage", () => {
  it("shows Loading... while pending, Try again on error, and recovers on retry", async () => {
    let callCount = 0;
    vi.spyOn(apiClient, "GET").mockImplementation((path: string) => {
      if (path === "/functions/v1/students/{student_id}/academic-summary") {
        callCount += 1;
        if (callCount === 1) {
          return Promise.reject(new Error("Network error")) as never;
        }
        return Promise.resolve({
          data: baseSummary,
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
        <MemoryRouter>
          <StudentDashboardPage studentId="stu-1" />
        </MemoryRouter>
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
