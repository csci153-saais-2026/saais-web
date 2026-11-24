import { ReportStatsSection } from "@/components/features/report-stats-section";
import type { FacultyDepartmentReport } from "@/routes/dean/types";

export function FacultyReportStatsAndDistribution({
  report,
}: {
  report: FacultyDepartmentReport;
}) {
  return (
    <ReportStatsSection
      stats={[
        {
          label: "Students",
          value: report.students,
          note:
            report.department === "All departments"
              ? (report.departmentSummaryLabel ??
                "Across all faculty departments")
              : `Enrolled in ${report.department}`,
        },
        {
          label: "Mean GWA",
          value: report.meanGwa,
          note: "Cumulative weighted average",
        },
        {
          label: "With deficiencies",
          value: report.withDeficiencies,
          note: "5.00, INC, DR, or NA on record",
        },
      ]}
      distribution={{
        title: "Final grade distribution",
        description: "Share of final grades across the selected scope.",
        bands: report.bands,
      }}
    />
  );
}
