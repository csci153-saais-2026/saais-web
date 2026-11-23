import type { DepartmentPdfDocument } from "../shared/department-pdf";
import type { DepartmentReport } from "./report-model";

/** Describes the selected report, including every cohort row, for the shared PDF viewer. */
export function buildReportPdf(
  report: DepartmentReport,
): DepartmentPdfDocument {
  return {
    title: "Department reports",
    subtitle: `${report.termLabel} | ${report.programLabel}`,
    filename: `SAAIS-department-report-${report.termId}-${report.programKey}.pdf`,
    stats: [
      {
        label: "Currently enrolled",
        value: report.enrolled.toLocaleString("en-US"),
        note: report.enrolmentNote,
      },
      {
        label: "Mean GWA",
        value: report.meanGwa,
        note: "Average of student cumulative GWAs",
      },
      { label: "Students with deficiencies", value: report.deficiencies },
    ],
    sections: [
      {
        title: "GWA distribution",
        headers: ["GWA range", "Percent", "Students"],
        weights: [3, 1, 1],
        rightAlign: [1, 2],
        rows: report.distribution.map((band) => [
          band.label,
          `${band.percent}%`,
          band.count,
        ]),
        note: `${report.gwaStudents.toLocaleString("en-US")} of ${report.enrolled.toLocaleString("en-US")} students have a cumulative GWA.`,
      },
      {
        title: "Department summary",
        headers: ["Curriculum", "Status", "Students"],
        weights: [3, 1, 1],
        rightAlign: [2],
        rows: report.curricula.map((curriculum) => [
          curriculum.name,
          curriculum.status,
          curriculum.students,
        ]),
        note: "Enrollment by active curriculum",
      },
      {
        title: "GWA by batch and curriculum",
        headers: [
          "Entry year",
          "Study range",
          "Curriculum",
          "Students",
          "Mean GWA",
        ],
        weights: [1, 1.3, 1.7, 1, 1],
        rightAlign: [3, 4],
        rows: report.cohorts.map((cohort) => [
          cohort.entryYear,
          `${cohort.entryYear}–${cohort.entryYear + 4}`,
          cohort.curriculum,
          cohort.students,
          cohort.meanGwa,
        ]),
      },
    ],
  };
}
