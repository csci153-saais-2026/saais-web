import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { useState } from "react";
import { Link } from "react-router";
import { apiClient, postgrestFilter, unwrapApiResult } from "@/lib/api";
import type { ApiSchema } from "@/lib/api";
import { DataTablePanel } from "@/components/features/data-table-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getRoster } from "../advisees/advisees.api";
import { useScopedRequest } from "../advisees/use-scoped-request";

type Cohort = ApiSchema<"BatchCurriculumGwaRow">;

async function getPrograms(ids: string[]) {
  const result: ApiSchema<"Program">[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    result.push(
      ...unwrapApiResult(
        await apiClient.GET("/rest/v1/program", {
          params: {
            query: {
              id: postgrestFilter.inList(ids.slice(i, i + 50)),
              select: "id,nominal_duration",
              limit: 100,
            },
          },
        }),
      ),
    );
  }
  return result;
}

function CohortStudents({
  cohort,
  userId,
}: {
  cohort: Cohort;
  userId: string;
}) {
  const [revision, setRevision] = useState(0);
  const { data, error } = useScopedRequest(
    JSON.stringify([
      userId,
      cohort.entry_year,
      cohort.curriculum_version_id,
      revision,
    ]),
    true,
    () => getRoster("current"),
  );
  const students = data?.filter(
    (student) =>
      student.entry_year === cohort.entry_year &&
      student.curriculum_version_id === cohort.curriculum_version_id &&
      student.program_id === cohort.program_id,
  );
  return (
    <>
      <AccountSkeleton
        id="AdviserCohorts-1"
        loading={!data && !error}
        label="Loading advisees…"
      >
        {error && (
          <div role="alert" className="space-y-3">
            <p>{error}</p>
            <Button variant="outline" onClick={() => setRevision((n) => n + 1)}>
              Try again
            </Button>
          </div>
        )}
        {students &&
          (students.length ? (
            <div className="max-h-[55vh] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 pr-3">Student</th>
                    <th className="py-3 pr-3">Student ID</th>
                    <th className="py-3 pr-3">Curriculum</th>
                    <th className="py-3 text-right">GWA</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.student_id}
                      className="border-b border-line-soft"
                    >
                      <td className="py-3 pr-3">
                        <Link
                          title={student.full_name}
                          className="block max-w-64 truncate font-semibold text-primary underline"
                          to={`/adviser/advisee/${encodeURIComponent(student.student_id)}/checklist`}
                        >
                          {student.full_name}
                        </Link>
                      </td>
                      <td className="py-3 pr-3">{student.student_number}</td>
                      <td className="py-3 pr-3">{student.curriculum_label}</td>
                      <td className="py-3 text-right">
                        {student.gwa == null ? "—" : student.gwa.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No current advisees match this cohort.</p>
          ))}
      </AccountSkeleton>
    </>
  );
}

export function AdviserCohorts({
  rows,
  userId,
}: {
  rows: Cohort[];
  userId: string;
}) {
  const [selected, setSelected] = useState<Cohort | null>(null);
  const ids = [...new Set(rows.map((row) => row.program_id))].sort();
  const { data: programs } = useScopedRequest(
    JSON.stringify([userId, ids]),
    ids.length > 0,
    () => getPrograms(ids),
  );
  return (
    <>
      <DataTablePanel
        title="GWA by batch and curriculum"
        description="Entry year, study range, and academic performance for your current advisees."
        rows={rows}
        rowKey={(row) => `${row.entry_year}-${row.curriculum_version_id}`}
        empty="Batch results are not available in this report."
        columns={[
          { header: "Entry year", cell: (row) => row.entry_year },
          {
            header: "Study range",
            cell: (row) => {
              const duration = programs?.find(
                (program) => program.id === row.program_id,
              )?.nominal_duration;
              return duration != null && Number.isInteger(duration)
                ? `${row.entry_year}–${row.entry_year + duration}`
                : "—";
            },
          },
          {
            header: "Curriculum",
            cell: (row) =>
              row.curriculum_label
                .toUpperCase()
                .startsWith(row.program_code.toUpperCase())
                ? row.curriculum_label
                : `${row.program_code} ${row.curriculum_label}`,
          },
          {
            header: "Students",
            numeric: true,
            cell: (row) => row.student_count,
          },
          {
            header: "Mean GWA",
            numeric: true,
            cell: (row) =>
              row.mean_gwa == null ? "—" : row.mean_gwa.toFixed(2),
          },
          {
            header: "Actions",
            cell: (row) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(row)}
              >
                View students <span aria-hidden="true">→</span>
                <span className="sr-only">
                  {" "}
                  for {row.entry_year} {row.program_code} {row.curriculum_label}
                </span>
              </Button>
            ),
          },
        ]}
      />
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Batch {selected?.entry_year} · Student GWA
            </DialogTitle>
            <DialogDescription>
              {selected?.program_code} · {selected?.curriculum_label} · Current
              advisees
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <CohortStudents
              key={`${userId}:${selected.entry_year}:${selected.curriculum_version_id}`}
              cohort={selected}
              userId={userId}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
