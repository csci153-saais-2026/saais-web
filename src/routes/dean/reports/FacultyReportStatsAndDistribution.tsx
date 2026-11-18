import { GradeDistribution } from "@/components/features/grade-distribution"
import { Panel } from "@/components/features/panel"
import { StatGrid } from "@/components/features/stat-tile"
import type { FacultyDepartmentReport } from "@/routes/dean/types"

export function FacultyReportStatsAndDistribution({
  report,
}: {
  report: FacultyDepartmentReport
}) {
  return (
    <div className="space-y-6">
      <StatGrid
        className="lg:grid-cols-3"
        items={[
          {
            label: "Students",
            value: report.students,
            note:
              report.department === "All departments"
                ? report.departmentSummaryLabel ?? "Across all faculty departments"
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
      />

      <Panel
        title="Final grade distribution"
        description="Share of final grades across the selected scope."
      >
        <GradeDistribution inline bands={report.bands} />
      </Panel>
    </div>
  )
}
