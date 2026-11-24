import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { useMemo, useRef, useState } from "react";
import { ReportStatsSection } from "@/components/features/report-stats-section";
import { CohortGwaTable } from "@/components/features/cohort-gwa-table";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { DownloadIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { QueryMessage } from "../shared/dh-ui";
import { CohortStudentsDialog } from "@/components/features/cohort-students-dialog";
import { ReportFilters } from "./ReportFilters";
import {
  ALL_PROGRAMS,
  buildDepartmentReport,
  getCohortStudents,
} from "./report-model";
import type { DepartmentPdfDocument } from "../shared/department-pdf";
import { PdfViewerDialog } from "../shared/PdfViewerDialog";
import { buildReportPdf } from "./report-pdf";
import { useReportSource } from "./reports-api";
import {
  reportDistributionFootnote,
  toCohortRows,
  toReportStats,
} from "./report-presentation";

export default function DepartmentReportsPage() {
  const source = useReportSource();
  const [pickedTerm, setTerm] = useState("");
  const [program, setProgram] = useState(ALL_PROGRAMS);
  const cohortOpener = useRef<HTMLButtonElement | null>(null);
  const [cohortId, setCohortId] = useState<string | null>(null);
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
  const cohort = report?.cohorts.find((row) => row.id === cohortId) ?? null;
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
              setCohortId(null);
            }}
            onProgramChange={(value) => {
              setProgram(value);
              setCohortId(null);
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
              <ReportStatsSection
                stats={toReportStats(report)}
                distribution={{
                  title: "GWA distribution",
                  description: report.termLabel,
                  bands: report.distribution,
                  footnote: reportDistributionFootnote(report),
                }}
              />
              <div className="mt-6">
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
              <CohortGwaTable
                rows={toCohortRows(report.cohorts)}
                onViewStudents={(row, event) => {
                  cohortOpener.current = event.currentTarget;
                  const original = report.cohorts.find(
                    (item) => item.id === row.id,
                  );
                  if (original) setCohortId(original.id);
                }}
                footer={`${report.cohorts.length} cohorts · ${report.programLabel}`}
              />
            </div>
          )}
          <PdfViewerDialog document={pdf} onClose={() => setPdf(null)} />
          <CohortStudentsDialog
            open={cohort !== null}
            onOpenChange={(open) => {
              if (!open) setCohortId(null);
            }}
            title={
              cohort ? `Batch ${cohort.entryYear} · Student GWA` : "Student GWA"
            }
            summary={
              cohort
                ? `${cohortStudents.length} students · ${cohort.program.toUpperCase()} · Study range ${cohort.entryYear}–${cohort.entryYear + 4}`
                : undefined
            }
            students={cohortStudents}
            footnote="All students in this cohort are shown."
            onCloseAutoFocus={(event) => {
              const opener = cohortOpener.current;
              if (opener?.isConnected) {
                event.preventDefault();
                opener.focus();
              }
              cohortOpener.current = null;
            }}
          />
        </>
      )}
    </AccountSkeleton>
  );
}
