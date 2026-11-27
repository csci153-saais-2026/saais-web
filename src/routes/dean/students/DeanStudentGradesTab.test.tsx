import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeanStudentGradesTab } from "@/routes/dean/students/DeanStudentGradesTab";
import { useDeanStudentGrades } from "@/routes/dean/students/use-dean-students";
import type { DeanStudentSummary } from "@/routes/dean/types";

vi.mock("@/routes/dean/students/use-dean-students", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/routes/dean/students/use-dean-students")
    >();
  return {
    ...actual,
    useDeanStudentGrades: vi.fn(),
  };
});

const STUDENT: DeanStudentSummary = {
  studentId: "stu-1",
  studentNumber: "24-1-00101",
  name: "Student Primary",
  initials: "SP",
  departmentId: "dept-1",
  department: "DCST",
  curriculum: "BSCS 2025",
  adviser: "Adviser",
  hasAdviser: true,
  program: "BS Computer Science",
  yearLabel: "2nd Year",
  email: "student@example.edu.ph",
  standing: "good",
  gwa: "1.75",
  unitsEarned: 36,
  unitsRequired: 147,
  entryYear: 2024,
};

describe("DeanStudentGradesTab", () => {
  const mockedUseGrades = vi.mocked(useDeanStudentGrades);

  afterEach(() => {
    cleanup();
    mockedUseGrades.mockReset();
  });

  it("renders collapsible term panels, formatted grades, inc-lapsed, Repeated, and Collapse/Expand all", () => {
    mockedUseGrades.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      data: {
        courses: [
          {
            id: "c-1",
            code: "CS 101",
            title: "Intro to Computing",
            units: 3,
          },
          {
            id: "c-2",
            code: "MATH 101",
            title: "Calculus I",
            units: 3,
          },
          {
            id: "c-3",
            code: "PE 1",
            title: "Physical Education 1",
            units: 2,
          },
          {
            id: "c-4",
            code: "CS 102",
            title: "Data Structures",
            units: 3,
          },
        ],
        offerings: [
          { id: "o-1", course_id: "c-1" },
          { id: "o-2", course_id: "c-2" },
          { id: "o-3", course_id: "c-3" },
          { id: "o-4", course_id: "c-4" },
        ],
        termGrades: [
          {
            school_term_id: "term-1",
            school_year: "2024–2025",
            term_type: "1st Semester",
            chronological_key: 1,
            gwa: 1.63,
            attempts: [
              {
                id: "att-1",
                student_id: "stu-1",
                course_offering_id: "o-1",
                recorded_status: "passed",
                midterm_status: null,
                midterm_grade: 1.75,
                final_grade: 2.0,
                completion_grade: null,
                effective_status: "passed",
                gwa_grade: 2.0,
                is_lapsed_inc: false,
                is_repeated: false,
                counts_toward_cumulative_gwa: true,
                units_attempted: 3,
                revision: 1,
              },
              {
                id: "att-2",
                student_id: "stu-1",
                course_offering_id: "o-2",
                recorded_status: "inc",
                midterm_status: null,
                midterm_grade: null,
                final_grade: null,
                completion_grade: 1.5,
                effective_status: "passed",
                gwa_grade: 1.5,
                is_lapsed_inc: false,
                is_repeated: false,
                counts_toward_cumulative_gwa: true,
                units_attempted: 3,
                revision: 1,
              },
              {
                id: "att-3",
                student_id: "stu-1",
                course_offering_id: "o-3",
                recorded_status: "dr",
                midterm_status: "dr",
                midterm_grade: null,
                final_grade: null,
                completion_grade: null,
                effective_status: "dr",
                gwa_grade: null,
                is_lapsed_inc: false,
                is_repeated: false,
                counts_toward_cumulative_gwa: false,
                units_attempted: 2,
                revision: 1,
              },
            ],
          },
          {
            school_term_id: "term-2",
            school_year: "2024–2025",
            term_type: "2nd Semester",
            chronological_key: 2,
            gwa: null,
            attempts: [
              {
                id: "att-4",
                student_id: "stu-1",
                course_offering_id: "o-4",
                recorded_status: "inc",
                midterm_status: null,
                midterm_grade: 2.5,
                final_grade: null,
                completion_grade: null,
                effective_status: "failed",
                gwa_grade: 5.0,
                is_lapsed_inc: true,
                is_repeated: true,
                counts_toward_cumulative_gwa: false,
                units_attempted: 3,
                revision: 1,
              },
            ],
          },
        ],
      },
    } as unknown as ReturnType<typeof useDeanStudentGrades>);

    render(<DeanStudentGradesTab student={STUDENT} />);

    expect(screen.getByText("2024–2025 · 1st Semester")).toBeTruthy();
    expect(screen.getByText("Term GWA 1.63 · 0 failed units")).toBeTruthy();
    expect(screen.getByText("2024–2025 · 2nd Semester")).toBeTruthy();
    expect(screen.getByText("Term GWA — · 3 failed units")).toBeTruthy();

    expect(screen.getByText("1.75")).toBeTruthy();
    expect(screen.getByText("2.00")).toBeTruthy();
    expect(screen.getByText("1.50 (INC)")).toBeTruthy();
    expect(screen.getAllByText("DR")).toHaveLength(2);
    expect(screen.getByText("INC")).toBeTruthy();
    expect(screen.getByText("INC lapsed")).toBeTruthy();
    expect(screen.getByText("Repeated")).toBeTruthy();

    expect(screen.queryByRole("columnheader", { name: "Flag" })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Correct" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(screen.getByRole("button", { name: "Expand all" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getByRole("button", { name: "Collapse all" })).toBeTruthy();
  });

  it("renders empty message when student has no term grades", () => {
    mockedUseGrades.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      data: {
        courses: [],
        offerings: [],
        termGrades: [],
      },
    } as unknown as ReturnType<typeof useDeanStudentGrades>);

    render(<DeanStudentGradesTab student={STUDENT} />);

    expect(screen.getByText("No grade records")).toBeTruthy();
    expect(
      screen.getByText("No grade records available for this student."),
    ).toBeTruthy();
  });
});
