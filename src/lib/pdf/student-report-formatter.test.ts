import { describe, expect, it } from "vitest";
import {
  formatChecklistReport,
  formatGradeSummaryReport,
  formatReportStatusLabel,
  formatTwoDecimalGrade,
} from "./student-report-formatter";

describe("student-report-formatter", () => {
  it("formats grades to 2 decimals and preserves non-numeric tokens", () => {
    expect(formatTwoDecimalGrade(1.5)).toBe("1.50");
    expect(formatTwoDecimalGrade("2")).toBe("2.00");
    expect(formatTwoDecimalGrade("INC")).toBe("INC");
    expect(formatTwoDecimalGrade(null)).toBe("—");
  });

  it("keeps INC and INC lapsed distinct in report status labels", () => {
    expect(formatReportStatusLabel("inc", false)).toBe("INC");
    expect(formatReportStatusLabel("inc", true)).toBe("INC lapsed");
    expect(formatReportStatusLabel("failed", true)).toBe("INC lapsed");
  });

  it("builds checklist report with letterhead, student info, 2-decimal grades, signatories, and unofficial footer", () => {
    const report = formatChecklistReport({
      studentName: "Maria Isabel Bautista",
      studentNumber: "23-1-04412",
      programLabel: "BS Computer Science",
      curriculumLabel: "BSCS 2024-2025 v1",
      adviserName: "Prof. Ramon Reyes",
      department: {
        letterhead_prefix: "Office of the Department Head",
        letterhead_name: "Department of Computer Science and Technology",
        department_head_name: "Dr. Andrea Dela Cruz",
      },
      generatedOn: "2026-09-19",
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
            {
              code: "CSci 102",
              title: "Discrete Structures I",
              requiredUnits: 3,
              earnedUnits: 0,
              status: "inc",
              finalGrade: "INC",
              isLapsedInc: false,
            },
            {
              code: "Math 21",
              title: "Calculus",
              requiredUnits: 3,
              earnedUnits: 0,
              status: "inc",
              finalGrade: 5,
              isLapsedInc: true,
            },
          ],
        },
      ],
    });

    expect(report.title).toBe("Program checklist");
    expect(report.unit).toEqual({
      prefix: "Office of the Department Head",
      name: "Department of Computer Science and Technology",
    });
    expect(report.info).toEqual([
      ["Name", "Maria Isabel Bautista"],
      ["Student no.", "23-1-04412"],
      ["Program", "BS Computer Science"],
      ["Curriculum", "BSCS 2024-2025 v1"],
      ["Adviser", "Prof. Ramon Reyes"],
    ]);
    expect(report.stats).toEqual([{ label: "Units earned", value: "3 of 9" }]);
    expect(report.sections[0].rows).toEqual([
      ["CSIT 100", "Introduction to Computing", "3", "1.50", "Passed"],
      ["CSci 102", "Discrete Structures I", "3", "INC", "INC"],
      ["Math 21", "Calculus", "3", "5.00", "INC lapsed"],
    ]);
    expect(report.signatories).toEqual([
      { role: "Prepared by: Academic Adviser", name: "Prof. Ramon Reyes" },
      { role: "Noted by: Department Head", name: "Dr. Andrea Dela Cruz" },
    ]);
    expect(report.footer).toContain("Not an official record");
    expect(report.footer).toContain("19 Sep 2026");
  });

  it("builds grade summary report with 2-decimal grades and distinct INC vs INC lapsed rows", () => {
    const report = formatGradeSummaryReport({
      studentName: "Maria Isabel Bautista",
      studentNumber: "23-1-04412",
      adviserName: "Prof. Ramon Reyes",
      departmentHeadName: "Dr. Andrea Dela Cruz",
      generatedOn: "2026-09-19",
      terms: [
        {
          school_year: "2025 - 2026",
          term_type: "1st Semester",
          gwa: 1.75,
          attempts: [
            {
              code: "CSIT 102",
              title: "Intermediate Programming",
              units: 3,
              recorded_status: "passed",
              effective_status: "passed",
              midterm_status: "graded",
              midterm_grade: 2,
              final_grade: 1.5,
              completion_grade: null,
              units_attempted: 3,
              is_lapsed_inc: false,
            },
            {
              code: "CSci 102",
              title: "Discrete Structures I",
              units: 3,
              recorded_status: "inc",
              effective_status: "inc",
              midterm_status: "graded",
              midterm_grade: 2.25,
              final_grade: null,
              completion_grade: null,
              units_attempted: 3,
              is_lapsed_inc: false,
            },
            {
              code: "CSci 180",
              title: "Pre-calculus for CS",
              units: 3,
              recorded_status: "inc",
              effective_status: "failed",
              midterm_status: "graded",
              midterm_grade: 2.5,
              final_grade: null,
              completion_grade: null,
              units_attempted: 3,
              is_lapsed_inc: true,
            },
          ],
        },
      ],
    });

    expect(report.title).toBe("Grade summary");
    expect(report.sections[0].title).toBe(
      "2025 - 2026 · 1st Semester | Term GWA 1.75",
    );
    expect(report.sections[0].rows).toEqual([
      ["CSIT 102", "Intermediate Programming", "3", "2.00", "1.50", "Passed"],
      ["CSci 102", "Discrete Structures I", "3", "2.25", "INC", "INC"],
      [
        "CSci 180",
        "Pre-calculus for CS",
        "3",
        "2.50",
        "INC (5.00)",
        "INC lapsed",
      ],
    ]);
    expect(report.footer).toContain("Not an official record");
  });
});
