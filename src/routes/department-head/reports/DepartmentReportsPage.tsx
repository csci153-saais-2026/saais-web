import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { useMemo, useState } from "react";
import { GradeDistribution } from "@/components/features/grade-distribution";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { StatGrid } from "@/components/features/stat-tile";
import { DownloadIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QueryMessage } from "../shared/dh-ui";
import { ReportCohortDialog } from "./ReportCohortDialog";
import { ReportFilters } from "./ReportFilters";
import {
  ALL_PROGRAMS,
  buildDepartmentReport,
  getCohortStudents,
  type CohortSummary,
} from "./report-model";
import type { DepartmentPdfDocument } from "../shared/department-pdf";
import { PdfViewerDialog } from "../shared/PdfViewerDialog";
import { buildReportPdf } from "./report-pdf";
import { useReportSource } from "./reports-api";

export default function DepartmentReportsPage() {
  const source = useReportSource();
  const [pickedTerm, setTerm] = useState("");
  const [program, setProgram] = useState(ALL_PROGRAMS);
  const [cohort, setCohort] = useState<CohortSummary | null>(null);
  const [pdf, setPdf] = useState<DepartmentPdfDocument | null>(null);
  const data = source.data;
  const term = pickedTerm || data?.currentTermId || data?.terms[0]?.value || "";
  const termLabel =
    data?.terms.find((option) => option.value === term)?.label ?? "";

  // The roster describes the current term only, so no other term has a report to show.
  const report = useMemo(
    () =>
      data && data.students.length > 0 && term === data.currentTermId
        ? buildDepartmentReport({
            students: data.students,
            currentCurricula: data.currentCurricula,
            termId: term,
            termLabel,
            programKey: program,
          })
        : null,
    [data, term, termLabel, program],
  );
  const cohortStudents = useMemo(
    () => (data && cohort ? getCohortStudents(data.students, cohort) : []),
    [data, cohort],
  );

  const exportPdf = () => {
    if (report) setPdf(buildReportPdf(report));
  };

  const heading = (
    <PageHeading
      title="Department reports"
      subtitle="A semester snapshot of student progress across your department."
      actions={
        <Button
          type="button"
          variant="outline"
          disabled={!report}
          onClick={exportPdf}
        >
          <DownloadIcon />
          Export PDF
        </Button>
      }
    />
  );
  if (source.isError && !data)
    return (
      <>
        {heading}
        <QueryMessage query={source} label="department reports" />
      </>
    );

  return (
    <AccountSkeleton
      id="dh-reports"
      data={data}
      label="Loading department reports…"
    >
      {(data) => (
        <>
          {heading}
          <ReportFilters
            term={term}
            program={program}
            terms={data.terms}
            programs={data.programs}
            onTermChange={(value) => {
              setTerm(value);
              setCohort(null);
            }}
            onProgramChange={(value) => {
              setProgram(value);
              setCohort(null);
            }}
          />
          {!report ? (
            <Panel title="No report available">
              <p className="text-muted-foreground">
                There are no records for this academic term and degree program.
              </p>
            </Panel>
          ) : (
            <div aria-label="Selected department report">
              <p className="sr-only" role="status">
                Showing {report.termLabel}, {report.programLabel}.
              </p>
              <StatGrid
                className="lg:grid-cols-3"
                items={[
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
                ]}
              />
              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <Panel title="GWA distribution" description={report.termLabel}>
                  <GradeDistribution bands={report.distribution} />
                  <p className="mt-5 text-xs text-muted-foreground">
                    {report.gwaStudents.toLocaleString("en-US")} of{" "}
                    {report.enrolled.toLocaleString("en-US")} students have a
                    cumulative GWA · Percentages sum to 100%.
                  </p>
                </Panel>
                <Panel
                  title="Department summary"
                  description="Enrollment by active curriculum"
                >
                  <ul className="divide-y divide-border">
                    {report.curricula.map((curriculum) => (
                      <li
                        key={curriculum.name}
                        className="py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <strong
                            className="min-w-0 max-w-full truncate"
                            title={curriculum.name}
                          >
                            {curriculum.name}
                          </strong>
                          <StatusBadge
                            status={
                              curriculum.status === "Current"
                                ? "current"
                                : "archived"
                            }
                          >
                            {curriculum.status}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {curriculum.students.toLocaleString("en-US")} students
                        </p>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>
              <Panel
                title="GWA by batch and curriculum"
                description="Entry year, study range, and academic performance for each cohort."
                flush
              >
                <Table responsive aria-label="GWA by batch and curriculum">
                  <TableHeader className="bg-secondary">
                    <TableRow>
                      <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                        Entry year
                      </TableHead>
                      <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                        Study range
                      </TableHead>
                      <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                        Curriculum
                      </TableHead>
                      <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                        Students
                      </TableHead>
                      <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                        Mean GWA
                      </TableHead>
                      <TableHead aria-label="Actions" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.cohorts.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell label="Entry year">
                          {row.entryYear}
                        </TableCell>
                        <TableCell label="Study range">
                          {row.entryYear}–{row.entryYear + 4}
                        </TableCell>
                        <TableCell label="Curriculum">
                          {row.curriculum}
                        </TableCell>
                        <TableCell label="Students">{row.students}</TableCell>
                        <TableCell label="Mean GWA">{row.meanGwa}</TableCell>
                        <TableCell label="Actions">
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto px-0 py-1 font-semibold underline-offset-4"
                            aria-label={`View students for ${row.curriculum} batch ${row.entryYear}`}
                            onClick={() => setCohort(row)}
                          >
                            View students →
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                  {report.cohorts.length} cohorts · {report.programLabel}
                </p>
              </Panel>
            </div>
          )}
          <PdfViewerDialog document={pdf} onClose={() => setPdf(null)} />
          <ReportCohortDialog
            cohort={cohort}
            students={cohortStudents}
            onClose={() => setCohort(null)}
          />
        </>
      )}
    </AccountSkeleton>
  );
}
