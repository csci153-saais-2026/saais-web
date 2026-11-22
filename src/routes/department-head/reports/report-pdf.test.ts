import { describe, expect, it } from "vitest";
import { buildReportPdf } from "./report-pdf";
import {
  ALL_PROGRAMS,
  buildDepartmentReport,
  getCohortStudents,
  type ReportStudent,
} from "./report-model";

const student = (
  index: number,
  overrides: Partial<ReportStudent> = {},
): ReportStudent => ({
  id: `student-${index}`,
  name: `Student ${index}`,
  studentNumber: `25-1-${String(index).padStart(5, "0")}`,
  programCode: "BSCS",
  programName: "BS Computer Science",
  curriculum: "BSCS 2024",
  entryYear: 2025,
  gwa: 1.5 + (index % 5) * 0.25,
  deficiencies: index % 4 === 0 ? 1 : 0,
  ...overrides,
});

const students = [
  ...Array.from({ length: 7 }, (_, index) => student(index + 1)),
  student(8, {
    programCode: "BSIT",
    programName: "BS Information Technology",
    curriculum: "BSIT 2024",
    entryYear: 2024,
    gwa: null,
  }),
  student(9, {
    programCode: "BSIT",
    programName: "BS Information Technology",
    curriculum: "BSIT 2024",
    entryYear: 2024,
    gwa: 2.75,
  }),
];

function report(programKey = ALL_PROGRAMS) {
  return buildDepartmentReport({
    students,
    currentCurricula: new Set(["BSCS 2024", "BSIT 2024"]),
    termId: "term-1",
    termLabel: "AY 2025–2026 · 1st semester",
    programKey,
  });
}

describe("department report model", () => {
  it("summarises the selected program from the student list", () => {
    const bsit = report("BSIT");
    expect(bsit.enrolled).toBe(2);
    expect(bsit.meanGwa).toBe("2.75");
    expect(bsit.gwaStudents).toBe(1);
    expect(bsit.programLabel).toBe("BS Information Technology");
    expect(bsit.curricula).toEqual([
      { name: "BSIT 2024", status: "Current", students: 2 },
    ]);
    expect(report().enrolmentNote).toBe("BSCS 7 · BSIT 2");
  });

  it("keeps displayed percentages and counts equal to the totals", () => {
    const full = report();
    expect(
      full.distribution.reduce((total, band) => total + band.percent, 0),
    ).toBe(100);
    expect(
      full.distribution.reduce((total, band) => total + band.count, 0),
    ).toBe(full.enrolled);
  });

  it("lists each cohort's own students", () => {
    const [cohort] = report("BSIT").cohorts;
    const members = getCohortStudents(students, cohort);
    expect(members.map((member) => member.studentNumber)).toEqual([
      "25-1-00008",
      "25-1-00009",
    ]);
    expect(members.map((member) => member.gwa)).toEqual(["—", "2.75"]);
  });
});

describe("department report PDF document", () => {
  it("describes the selected program for the shared PDF viewer", () => {
    const doc = buildReportPdf(report("BSIT"));
    expect(doc.subtitle).toBe(
      "AY 2025–2026 · 1st semester | BS Information Technology",
    );
    expect(doc.filename).toBe("SAAIS-department-report-term-1-BSIT.pdf");
    expect(doc.stats?.[0]).toMatchObject({
      label: "Currently enrolled",
      value: "2",
    });
    expect(doc.sections.map((section) => section.title)).toEqual([
      "GWA distribution",
      "Department summary",
      "GWA by batch and curriculum",
    ]);
    expect(JSON.stringify(doc)).not.toContain("BSCS 2024");
  });

  it("includes every cohort row", () => {
    const long = report();
    long.cohorts = Array.from({ length: 60 }, (_, index) => ({
      ...long.cohorts[0],
      id: `cohort-${index}`,
    }));
    expect(buildReportPdf(long).sections[2].rows).toHaveLength(60);
  });
});
