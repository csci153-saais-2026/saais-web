import type { ReportStat } from "@/components/features/report-stats-section";
import type { DepartmentReport } from "./report-model";

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
