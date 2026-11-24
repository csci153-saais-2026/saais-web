import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { AdviserPage } from "../Adviser";
import { useAuth } from "@/hooks/use-auth";
import { PageHeading } from "@/components/features/page-heading";
import { ReportStatsSection } from "@/components/features/report-stats-section";
import { AdviserCohorts } from "./AdviserCohorts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAdviserDashboard } from "./use-adviser-dashboard";
import { DashboardPdfPreview } from "./DashboardPdfPreview";
import { DownloadIcon } from "@/components/icons";
import { getRoster } from "../advisees/advisees.api";
import { useScopedRequest } from "../advisees/use-scoped-request";
import { getDeficiencySubjects } from "../advisees/deficiency-subjects.api";
import { distributionBands } from "./distribution";

async function loadDeficientAdvisees() {
  const roster = await getRoster("current");
  const deficient = roster.filter((student) => student.deficiencies_count > 0);
  const result: {
    student_id: string;
    full_name: string;
    student_number: string;
    deficiencies: { course_code: string }[];
  }[] = [];
  for (let i = 0; i < deficient.length; i += 6) {
    result.push(
      ...(await Promise.all(
        deficient.slice(i, i + 6).map(async (student) => {
          const courses = await getDeficiencySubjects(student.student_id).catch(
            () => [],
          );
          return {
            student_id: student.student_id,
            full_name: student.full_name,
            student_number: student.student_number,
            deficiencies: courses.map((course_code) => ({ course_code })),
          };
        }),
      )),
    );
  }
  return result;
}

export default function AdviserDashboard() {
  const { user, profile, isMockMode } = useAuth();
  const [termId, setTermId] = useState("");
  const [revision, setRevision] = useState(0);
  const [deficienciesOpen, setDeficienciesOpen] = useState(false);
  const [preview, setPreview] = useState<{
    report: NonNullable<ReturnType<typeof useAdviserDashboard>["report"]>;
    termLabel: string;
    deficiencyCount?: number;
    userId: string;
    adviserName?: string;
  } | null>(null);
  useEffect(() => () => setPreview(null), [user?.id]);
  const { report, terms, error, loading } = useAdviserDashboard(
    user?.id,
    termId,
    revision,
  );
  const selectedTerm = terms.find((term) => term.id === termId);
  const fallbackDeficiencies = useScopedRequest(
    JSON.stringify([user?.id, revision]),
    !!user && !!report && !report.advisees_with_deficiencies,
    loadDeficientAdvisees,
  );
  const deficientStudents =
    report?.advisees_with_deficiencies ?? fallbackDeficiencies.data;

  return (
    <AdviserPage title="Dashboard" sample={false}>
      <PageHeading
        title="Dashboard"
        subtitle="Your advisees at a glance."
        actions={
          <Button
            variant="outline"
            disabled={!report}
            onClick={() => {
              if (report && user)
                setPreview({
                  report,
                  termLabel: selectedTerm
                    ? `${selectedTerm.school_year} · ${selectedTerm.term_type}`
                    : "All terms",
                  deficiencyCount: deficientStudents?.length,
                  userId: user.id,
                  adviserName: profile?.full_name,
                });
            }}
          >
            <DownloadIcon />
            Export PDF
          </Button>
        }
      />
      {preview && preview.userId === user?.id && (
        <DashboardPdfPreview
          key={preview.userId}
          {...preview}
          departmentId={profile?.department_id}
          onClose={() => setPreview(null)}
        />
      )}
      {isMockMode && (
        <p className="mb-4 text-sm text-muted-foreground">
          Showing shared sample records.
        </p>
      )}
      <AccountSkeleton
        id="AdviserDashboard-1"
        loading={loading}
        label="Loading adviser dashboard…"
      >
        {error && (
          <div role="alert" className="grid gap-3">
            <p>{error}</p>
            <div>
              <Button
                variant="outline"
                onClick={() => setRevision((value) => value + 1)}
              >
                Try again
              </Button>
            </div>
          </div>
        )}
        {report && (
          <>
            <div className="grid gap-6">
              <ReportStatsSection
                stats={[
                  {
                    label: "Students",
                    value: String(report.total_advisees),
                    note: "Assigned to you",
                  },
                  {
                    label: "Mean GWA",
                    value:
                      report.mean_gwa == null
                        ? "—"
                        : report.mean_gwa.toFixed(2),
                    note: "Across your advisees",
                  },
                  deficientStudents
                    ? {
                        label: "With deficiencies",
                        value: String(deficientStudents.length),
                        note: "Students with open deficiencies · View list",
                        onSelect: () => setDeficienciesOpen(true),
                      }
                    : {
                        label: "With deficiencies",
                        value: "—",
                        note: fallbackDeficiencies.error
                          ? "Details not available in this report"
                          : "Loading deficiencies…",
                      },
                ]}
                distribution={{
                  title: "Final grade distribution",
                  description: `${selectedTerm ? `${selectedTerm.school_year} · ${selectedTerm.term_type} · ` : ""}Share of final grades across your advisees`,
                  bands: report.grade_distribution
                    ? distributionBands(report.grade_distribution)
                    : [],
                  emptyMessage:
                    "Grade distribution is not available in this report.",
                  action: (
                    <label className="grid gap-1 text-sm">
                      Term
                      <select
                        className="rounded-md border border-border bg-background px-3 py-2"
                        value={termId}
                        onChange={(event) => setTermId(event.target.value)}
                      >
                        <option value="">All terms</option>
                        {terms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {term.school_year} · {term.term_type}
                          </option>
                        ))}
                      </select>
                    </label>
                  ),
                }}
              />
              {deficientStudents && (
                <Dialog
                  open={deficienciesOpen}
                  onOpenChange={setDeficienciesOpen}
                >
                  <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Advisees with deficiencies</DialogTitle>
                      <DialogDescription>
                        Select an advisee to open their record.
                      </DialogDescription>
                    </DialogHeader>
                    <ul className="divide-y divide-line-soft">
                      {deficientStudents.map((student) => (
                        <li key={student.student_id}>
                          <Link
                            className="flex justify-between gap-4 py-3 hover:bg-secondary/50"
                            to={`/adviser/advisee/${encodeURIComponent(student.student_id)}/checklist`}
                          >
                            <span className="min-w-0">
                              <b
                                className="block truncate underline"
                                title={student.full_name}
                              >
                                {student.full_name}
                              </b>
                              <span className="text-xs text-muted-foreground">
                                {student.student_number}
                              </span>
                            </span>
                            <span className="line-clamp-2 max-w-[50%] shrink-0 text-right text-sm">
                              {student.deficiencies
                                .map((item) => item.course_code)
                                .join(", ") || "Subject details unavailable"}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {!deficientStudents.length && (
                      <p>No advisees with deficiencies.</p>
                    )}
                  </DialogContent>
                </Dialog>
              )}
              {user && (
                <AdviserCohorts
                  key={user.id}
                  userId={user.id}
                  rows={report.batch_curriculum_gwa ?? []}
                />
              )}
            </div>
          </>
        )}
      </AccountSkeleton>
    </AdviserPage>
  );
}
