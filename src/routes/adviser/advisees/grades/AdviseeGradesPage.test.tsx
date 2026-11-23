import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import type { ApiSchema } from "@/lib/api";
import Grades from "./AdviseeGradesPage";
import {
  completeInc,
  correctGrade,
  correctIncCompletion,
  getIncResolution,
  getGrades,
} from "../checklist/record.api";

const auth = vi.hoisted(() => ({
  user: { id: "adviser-one" },
  isMockMode: true,
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => auth }));
vi.mock("../../Adviser", () => ({
  AdviserPage: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../checklist/record.api", () => ({
  getGrades: vi.fn(),
  completeInc: vi.fn(),
  correctGrade: vi.fn(),
  getIncResolution: vi.fn(),
  correctIncCompletion: vi.fn(),
}));
const attempt = {
  id: "attempt-one",
  student_id: "student-one",
  course_offering_id: "offering-one",
  recorded_status: "inc",
  effective_status: "inc",
  revision: 3,
  units_attempted: 3,
  midterm_grade: null,
  final_grade: null,
  completion_grade: null,
  gwa_grade: null,
  is_lapsed_inc: false,
  is_repeated: false,
  counts_toward_cumulative_gwa: false,
  inc_deadline: "2027-05-30",
} as ApiSchema<"AttemptResult">;
const response = {
  terms: [
    {
      school_term_id: "term-one",
      school_year: "2026",
      term_type: "first_semester",
      chronological_key: 1,
      gwa: null,
      attempts: [attempt],
    },
  ],
  offerings: [{ id: "offering-one", course_id: "course-one" }],
  courses: [{ id: "course-one", code: "CS 1", title: "Computing" }],
  schoolTerms: [{ id: "term-one", is_locked: true, override_flag: false }],
  canEdit: true,
} as unknown as Awaited<ReturnType<typeof getGrades>>;
function page(id = "student-one") {
  return (
    <MemoryRouter initialEntries={[`/advisee/${id}/grades`]}>
      <Routes>
        <Route path="/advisee/:id/grades" element={<Grades />} />
      </Routes>
    </MemoryRouter>
  );
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  auth.user = { id: "adviser-one" };
});
describe("selected grade actions", () => {
  it("shows term details and links encoding to the selected student", async () => {
    vi.mocked(getGrades).mockResolvedValue(response);
    render(page());
    expect(
      (await screen.findByRole("link", { name: "Encode grades" })).getAttribute(
        "href",
      ),
    ).toBe("/adviser/encode-grades?student=student-one");
    const term = screen.getByRole("button", { name: /2026/ });
    expect(term.textContent).toContain("Locked term");
    expect(term.textContent).toContain("0/3");
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(term.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(term.getAttribute("aria-expanded")).toBe("true");
  });
  it("submits the selected attempt for the selected student", async () => {
    vi.mocked(getGrades).mockResolvedValue(response);
    vi.mocked(completeInc).mockResolvedValue({} as ApiSchema<"INCResolution">);
    render(page());
    fireEvent.click(await screen.findByRole("button", { name: "Resolve INC" }));
    expect(screen.queryByRole("option", { name: "3.25" })).toBeNull();
    expect(screen.getByRole("option", { name: "5.00" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Completion grade"), {
      target: { value: "2.25" },
    });
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Completed requirements" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save grade" }));
    await waitFor(() =>
      expect(completeInc).toHaveBeenCalledWith(
        "student-one",
        attempt,
        2.25,
        "Completed requirements",
      ),
    );
    expect(await screen.findByText("Grade saved.")).toBeTruthy();
  });
  it("uses the primary action for INC and the same correction form for passed and enrolled courses", async () => {
    const passed = {
      ...attempt,
      id: "passed",
      recorded_status: "passed",
      effective_status: "passed",
      midterm_grade: 1,
      final_grade: 1,
    } as ApiSchema<"AttemptResult">;
    const enrolled = {
      ...attempt,
      id: "enrolled",
      recorded_status: "currently_enrolled",
      effective_status: "currently_enrolled",
    } as ApiSchema<"AttemptResult">;
    vi.mocked(getGrades).mockResolvedValue({
      ...response,
      schoolTerms: [{ ...response.schoolTerms[0], ends_on: "9999-12-31" }],
      terms: response.terms.map((term) => ({
        ...term,
        attempts: [attempt, passed, enrolled],
      })),
    });
    render(page());
    expect(
      (await screen.findByRole("button", { name: "Resolve INC" })).className,
    ).toContain("bg-primary");
    const buttons = screen.getAllByRole("button", { name: "Correct grade" });
    expect(buttons).toHaveLength(2);
    expect(buttons[0].className).toContain("bg-card");
    fireEvent.click(buttons[0]);
    expect(screen.getByLabelText("Midterm grade")).toBeTruthy();
    expect(screen.getByLabelText("Final grade")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(buttons[1]);
    expect(screen.getByLabelText("Midterm grade")).toBeTruthy();
    expect(screen.getByLabelText("Final grade")).toBeTruthy();
  });
  it("prevents correcting past semesters while allowing unresolved INCs", async () => {
    const passed = {
      ...attempt,
      id: "passed",
      recorded_status: "passed",
      effective_status: "passed",
    } as ApiSchema<"AttemptResult">;
    const enrolled = {
      ...attempt,
      id: "enrolled",
      recorded_status: "currently_enrolled",
      effective_status: "currently_enrolled",
    } as ApiSchema<"AttemptResult">;
    vi.mocked(getGrades).mockResolvedValue({
      ...response,
      schoolTerms: [{ ...response.schoolTerms[0], ends_on: "2000-01-01" }],
      terms: response.terms.map((term) => ({
        ...term,
        attempts: [attempt, passed, enrolled],
      })),
    });
    render(page());
    expect(
      await screen.findByRole("button", { name: "Resolve INC" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Correct grade" })).toBeNull();
    expect(screen.getAllByText("Past semester")).toHaveLength(2);
  });
  it("does not expose editing for a past advisee", async () => {
    vi.mocked(getGrades).mockResolvedValue({ ...response, canEdit: false });
    render(page());
    expect(
      await screen.findByText("Historical record: read-only."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Resolve INC" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Encode grades" })).toBeNull();
  });
  it("submits the selected grade correction and displays contract errors", async () => {
    const ordinary = {
      ...attempt,
      recorded_status: "currently_enrolled",
      effective_status: "currently_enrolled",
    } as ApiSchema<"AttemptResult">;
    vi.mocked(getGrades).mockResolvedValue({
      ...response,
      terms: response.terms.map((term) => ({ ...term, attempts: [ordinary] })),
    });
    vi.mocked(correctGrade).mockRejectedValue(new Error("Term locked"));
    render(page());
    fireEvent.click(
      await screen.findByRole("button", { name: "Correct grade" }),
    );
    expect(screen.queryByRole("option", { name: "4.75" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Midterm grade"), {
      target: { value: "1.75" },
    });
    fireEvent.change(screen.getByLabelText("Reason for change"), {
      target: { value: "Correction" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save grade" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Term locked",
    );
    expect(correctGrade).toHaveBeenCalledWith(
      "student-one",
      ordinary,
      1.75,
      "Correction",
      "midterm",
    );
  });
  it("submits midterm and final changes together for the selected attempt", async () => {
    const ordinary = {
      ...attempt,
      recorded_status: "currently_enrolled",
      effective_status: "currently_enrolled",
    } as ApiSchema<"AttemptResult">;
    vi.mocked(getGrades).mockResolvedValue({
      ...response,
      terms: response.terms.map((term) => ({ ...term, attempts: [ordinary] })),
    });
    vi.mocked(correctGrade).mockResolvedValue({} as ApiSchema<"AttemptResult">);
    render(page());
    fireEvent.click(
      await screen.findByRole("button", { name: "Correct grade" }),
    );
    fireEvent.change(screen.getByLabelText("Midterm grade"), {
      target: { value: "1.75" },
    });
    fireEvent.change(screen.getByLabelText("Final grade"), {
      target: { value: "2.25" },
    });
    fireEvent.change(screen.getByLabelText("Reason for change"), {
      target: { value: "Correction" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save grade" }));
    await waitFor(() =>
      expect(correctGrade).toHaveBeenCalledWith(
        "student-one",
        ordinary,
        1.75,
        "Correction",
        "midterm",
        2.25,
      ),
    );
  });
  it("submits both corrections for a passed course", async () => {
    const passed = {
      ...attempt,
      recorded_status: "passed",
      effective_status: "passed",
      midterm_grade: 1,
      final_grade: 1,
    } as ApiSchema<"AttemptResult">;
    vi.mocked(getGrades).mockResolvedValue({
      ...response,
      terms: response.terms.map((term) => ({ ...term, attempts: [passed] })),
    });
    vi.mocked(correctGrade).mockResolvedValue({} as ApiSchema<"AttemptResult">);
    render(page());
    fireEvent.click(
      await screen.findByRole("button", { name: "Correct grade" }),
    );
    fireEvent.change(screen.getByLabelText("Midterm grade"), {
      target: { value: "1.75" },
    });
    fireEvent.change(screen.getByLabelText("Final grade"), {
      target: { value: "2.25" },
    });
    fireEvent.change(screen.getByLabelText("Reason for change"), {
      target: { value: "Correction" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save grade" }));
    await waitFor(() =>
      expect(correctGrade).toHaveBeenCalledWith(
        "student-one",
        passed,
        1.75,
        "Correction",
        "midterm",
        2.25,
      ),
    );
  });
  it("corrects the chosen INC completion using its update timestamp", async () => {
    const completed = {
      ...attempt,
      completion_grade: 2,
      effective_status: "passed",
    } as ApiSchema<"AttemptResult">;
    vi.mocked(getGrades).mockResolvedValue({
      ...response,
      terms: response.terms.map((term) => ({ ...term, attempts: [completed] })),
    });
    vi.mocked(getIncResolution).mockResolvedValue({
      attempt_id: completed.id,
      student_id: "student-one",
      updated_at: "2026-10-01T00:00:00Z",
    } as ApiSchema<"INCResolution">);
    vi.mocked(correctIncCompletion).mockResolvedValue(
      {} as ApiSchema<"INCResolution">,
    );
    render(page());
    fireEvent.click(
      await screen.findByRole("button", { name: "Correct grade" }),
    );
    await waitFor(() =>
      expect(getIncResolution).toHaveBeenCalledWith(
        "student-one",
        completed.id,
      ),
    );
    expect(
      (screen.getByLabelText("Midterm grade") as HTMLSelectElement).disabled,
    ).toBe(true);
    fireEvent.change(screen.getByLabelText("Final grade"), {
      target: { value: "2.25" },
    });
    fireEvent.change(screen.getByLabelText("Reason for change"), {
      target: { value: "Corrected grade" },
    });
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Save grade" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save grade" }));
    await waitFor(() =>
      expect(correctIncCompletion).toHaveBeenCalledWith(
        "student-one",
        completed.id,
        2.25,
        "Corrected grade",
        "2026-10-01T00:00:00Z",
      ),
    );
  });
  it("hides the old record immediately when the account changes", async () => {
    vi.mocked(getGrades)
      .mockResolvedValueOnce(response)
      .mockImplementation(() => new Promise(() => {}));
    const view = render(page());
    expect(await screen.findByText("CS 1")).toBeTruthy();
    auth.user = { id: "adviser-two" };
    view.rerender(page());
    expect(screen.queryByText("CS 1")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Loading");
  });
});
