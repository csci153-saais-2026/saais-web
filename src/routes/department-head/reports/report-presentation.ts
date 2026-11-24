import type { ReportStat } from "@/components/features/report-stats-section";
import type { CohortGwaRow } from "@/components/features/cohort-gwa-table";
import type { CohortSummary, DepartmentReport } from "./report-model";

/** Display the existing report totals without recomputing academic results. */
export function toReportStats(report: DepartmentReport): ReportStat[] {
  return [
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
    {
      label: "Students with deficiencies",
      value: report.deficiencies,
      note: report.enrolled
        ? `${((report.deficiencies / report.enrolled) * 100).toFixed(1)}% of enrolled students`
        : "No enrolled students",
    },
  ];
}

export function reportDistributionFootnote(report: DepartmentReport): string {
  return `${report.gwaStudents.toLocaleString("en-US")} of ${report.enrolled.toLocaleString("en-US")} students have a cumulative GWA · Percentages sum to 100%.`;
}

export function toCohortRows(cohorts: readonly CohortSummary[]): CohortGwaRow[] {
  return cohorts.map((cohort) => ({
    id: cohort.id,
    entryYear: cohort.entryYear,
    studyRange: `${cohort.entryYear}–${cohort.entryYear + 4}`,
    curriculum: cohort.curriculum,
    students: cohort.students,
    meanGwa: cohort.meanGwa,
  }));
}
