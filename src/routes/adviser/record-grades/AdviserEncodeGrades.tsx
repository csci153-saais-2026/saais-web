import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { notify } from "@/lib/notify";
import { GradeSelect } from "../GradeSelect";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AdviserPage } from "../Adviser";
import { useAuth } from "@/hooks/use-auth";
import { REASON_MAX_LENGTH } from "@/lib/validation/limits";
import { useScopedRequest } from "../advisees/use-scoped-request";
import {
  getElectiveSlots,
  getEncodingChoices,
  getTermOfferings,
  saveTermGrades,
} from "./encode.api";
import type { ApiSchema } from "@/lib/api";
import { getGrades } from "../advisees/checklist/record.api";
import { PendingIncs, ExistingCourseRows } from "./ExistingGrades";
import {
  draftChanged,
  draftPayload,
  emptyDraft,
  type ExistingDraft,
} from "./existing-draft";
import { AddCourseDialog } from "./AddCourseDialog";
import { outcomeRemark, outcomeStatus } from "./grade-encoding";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { Button } from "@/components/ui/button";
import { UploadIcon } from "@/components/icons";

type Row = {
  offering: string;
  slot?: string;
  instructor: string;
  midterm: string;
  final: string;
  status: "" | "inc" | "dr" | "na";
  override: boolean;
  reason: string;
  remark: string;
};
const emptyRow = (): Row => ({
  offering: "",
  instructor: "",
  midterm: "",
  final: "",
  status: "",
  override: false,
  reason: "",
  remark: "",
});
function TermEditor({
  studentId,
  termId,
  userId,
  occupied,
  onSaved,
  workspaceRevision,
  gradeData,
}: {
  studentId: string;
  termId: string;
  userId: string;
  occupied: string[];
  onSaved: () => void;
  workspaceRevision: number;
  gradeData: Awaited<ReturnType<typeof getGrades>>;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ExistingDraft>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const { data, error: loadError } = useScopedRequest(
    JSON.stringify([userId, studentId, termId, revision, workspaceRevision]),
    true,
    () => getTermOfferings(studentId, termId),
  );
  const { data: electiveSlots } = useScopedRequest(
    JSON.stringify(["slots", userId, studentId, workspaceRevision]),
    true,
    () => getElectiveSlots(studentId),
  );
  const change = (index: number, patch: Partial<Row>) => {
    setRows((old) =>
      old.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };
  const existingAttempts =
    gradeData.terms.find((t) => t.school_term_id === termId)?.attempts ?? [];
  const changedExisting = existingAttempts.filter((a) =>
    draftChanged(a, drafts[a.id] ?? emptyDraft(a)),
  );
  async function save() {
    setError("");
    setBusy(true);
    try {
      await saveTermGrades(studentId, termId, [
        ...changedExisting.map((a) =>
          draftPayload(a, drafts[a.id] ?? emptyDraft(a)),
        ),
        ...rows.map((row): ApiSchema<"EncodeTermGradeRowInput"> => {
          const offering = data!.find((o) => o.offering.id === row.offering)!;
          return {
            course_offering_id: row.offering,
            curriculum_term_course_id:
              row.slot ?? offering.direct_curriculum_slot_id,
            instructor: row.instructor || null,
            midterm_status:
              row.midterm === "dr" ? "dr" : row.midterm ? "graded" : null,
            midterm_grade:
              row.midterm === "dr"
                ? null
                : row.midterm
                  ? Number(row.midterm)
                  : null,
            final_grade: row.final ? Number(row.final) : null,
            ...(row.status ? { status: row.status } : {}),
            remark: row.remark || null,
            continue_with_prerequisite_override: row.override,
            prerequisite_override_reason: row.override ? row.reason : null,
          };
        }),
      ]);
      setRows([]);
      setDrafts({});
      notify.success("Grades saved.");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save grades.");
    } finally {
      setBusy(false);
    }
  }
  const takenCourseIds = new Set([
    ...gradeData.offerings
      .filter((offering) => occupied.includes(offering.id))
      .map((offering) => offering.course_id),
    ...(data
      ?.filter((option) =>
        rows.some((row) => row.offering === option.offering.id),
      )
      .map((option) => option.offering.course_id) ?? []),
  ]);
  const unavailableOfferings =
    data
      ?.filter((option) => takenCourseIds.has(option.offering.course_id))
      .map((option) => option.offering.id) ?? [];
  const validGrade = (value: string) =>
    !value ||
    (Number.isFinite(Number(value)) &&
      Number(value) >= 1 &&
      Number(value) <= 5 &&
      (Number(value) * 4) % 1 === 0);
  const invalid =
    !data ||
    rows.some(
      (row) =>
        !row.offering ||
        !data.some((option) => option.offering.id === row.offering) ||
        occupied.includes(row.offering) ||
        (row.midterm !== "dr" && !validGrade(row.midterm)) ||
        !validGrade(row.final) ||
        (data?.find((o) => o.offering.id === row.offering)
          ?.has_unmet_strict_prerequisites &&
          (!row.override || !row.reason.trim())) ||
        (row.status && row.final) ||
        rows.filter((r) => r.offering === row.offering).length > 1,
    );
  return (
    <>
      <Panel
        title="Courses"
        description="Midterm and final grades use the VSU scale: 1.00 to 3.00 passes, 5.00 fails, INC and DR are special marks. Saved courses cannot be removed."
        flush
      >
        <AccountSkeleton
          id="AdviserEncodeGrades-1"
          loading={!data && !loadError}
          label="Loading offerings…"
        >
          {loadError && (
            <div role="alert">
              <p>{loadError}</p>
              <Button onClick={() => setRevision((n) => n + 1)}>
                Try again
              </Button>
            </div>
          )}
          {data && (
            <>
              <div className="hidden grid-cols-[minmax(140px,1fr)_minmax(180px,1fr)_90px_90px_minmax(160px,1.45fr)_28px] gap-3 lg:gap-x-7 border-b bg-muted/60 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
                <span>Course</span>
                <span>Instructor</span>
                <span>Midterm</span>
                <span>Final</span>
                <span>Remarks</span>
                <span />
              </div>
              <ExistingCourseRows
                data={gradeData}
                offerings={data}
                termId={termId}
                drafts={drafts}
                disabled={busy}
                onDraft={(id, draft) => {
                  setDrafts((old) => ({ ...old, [id]: draft }));
                }}
              />
              {!data.length && (
                <p>No offerings available for this student and term.</p>
              )}
              {rows.map((row, i) => {
                const option = data.find((o) => o.offering.id === row.offering);
                return (
                  <div
                    key={row.offering || i}
                    className="grid gap-3 lg:gap-x-7 border-b px-3.5 py-2 sm:grid-cols-2 lg:grid-cols-[minmax(140px,1fr)_minmax(180px,1fr)_90px_90px_minmax(160px,1.45fr)_28px] lg:items-center"
                  >
                    <div>
                      <strong>{option?.code ?? "Course unavailable"}</strong>
                      <span className="block text-xs text-muted-foreground">
                        {option?.title}
                      </span>
                    </div>
                    <label>
                      <span className="sr-only">
                        Instructor for {option?.code}
                      </span>
                      <select
                        disabled={busy}
                        className="w-full rounded-md border border-border bg-card p-2"
                        value={row.instructor}
                        onChange={(e) =>
                          change(i, { instructor: e.target.value })
                        }
                      >
                        <option value="">Select instructor</option>
                        {option?.instructor_options?.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="sr-only">
                        Midterm for {option?.code}
                      </span>
                      <GradeSelect
                        allowDrop
                        disabled={busy}
                        placeholder="—"
                        value={row.midterm}
                        onChange={(e) => {
                          const midterm = e.target.value;
                          const drop = midterm === "dr";
                          change(i, {
                            midterm,
                            ...(drop
                              ? {
                                  status: "dr",
                                  final: "",
                                  remark: outcomeRemark("dr"),
                                }
                              : row.midterm === "dr"
                                ? { status: "", final: "", remark: "" }
                                : {}),
                          });
                        }}
                      />
                    </label>
                    <label>
                      <span className="sr-only">Final for {option?.code}</span>
                      <GradeSelect
                        vsuScale
                        includeStatuses
                        disableDrop={row.midterm !== "dr"}
                        disabled={busy || row.midterm === "dr"}
                        placeholder="—"
                        value={row.status || row.final}
                        onChange={(e) => {
                          const value = e.target.value;
                          change(i, {
                            status:
                              value === "inc" || value === "dr" ? value : "",
                            final:
                              value === "inc" || value === "dr" ? "" : value,
                            remark: outcomeRemark(value),
                          });
                        }}
                      />
                    </label>
                    <div aria-label={`Status for ${option?.code}`}>
                      {outcomeStatus(row.status || row.final) ? (
                        <StatusBadge
                          status={outcomeStatus(row.status || row.final)}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <Button
                      disabled={busy}
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="justify-self-end"
                      aria-label={`Remove ${option?.code ?? "course"}`}
                      onClick={() => {
                        setRows((old) => old.filter((_, n) => n !== i));
                        notify.info(
                          `${option?.code ?? "Course"} removed from the draft.`,
                        );
                      }}
                    >
                      ×
                    </Button>
                    {option?.has_unmet_strict_prerequisites && (
                      <div className="rounded-md border p-3 sm:col-span-2 lg:col-span-6">
                        <p>
                          Unmet strict prerequisites:{" "}
                          {option.unmet_prerequisites
                            ?.map((p) => p.code)
                            .join(", ") || "See course details"}
                          .
                        </p>
                        <label>
                          <input
                            type="checkbox"
                            disabled={busy}
                            checked={row.override}
                            onChange={(e) =>
                              change(i, { override: e.target.checked })
                            }
                          />{" "}
                          Continue with override
                        </label>
                        {row.override && (
                          <label className="grid gap-1">
                            Override reason
                            <input
                              disabled={busy}
                              maxLength={REASON_MAX_LENGTH}
                              className="rounded-md border p-2"
                              value={row.reason}
                              onChange={(e) =>
                                change(i, { reason: e.target.value })
                              }
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex flex-col gap-3.5 border-t px-5 py-3.5">
                <div>
                  <AddCourseDialog
                    offerings={data}
                    electiveSlots={(electiveSlots ?? []).map((slot) => ({
                      ...slot,
                      used:
                        slot.used || rows.some((row) => row.slot === slot.id),
                    }))}
                    unavailable={unavailableOfferings}
                    disabled={busy || !data.length || rows.length >= 100}
                    onAdd={(offering, slot) => {
                      setRows((old) => [
                        ...old,
                        { ...emptyRow(), offering, ...(slot ? { slot } : {}) },
                      ]);
                    }}
                  />
                </div>
                {error && <p role="alert">{error}</p>}
                {rows.length > 0 && invalid && (
                  <p>
                    Choose unique courses and provide any required override
                    reasons.
                  </p>
                )}
                <div className="flex justify-end">
                  <Button
                    disabled={
                      invalid ||
                      busy ||
                      !(rows.length || changedExisting.length)
                    }
                    onClick={() => void save()}
                  >
                    {busy ? "Saving…" : "Save grades"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </AccountSkeleton>
      </Panel>
    </>
  );
}
function SelectedWorkspace({
  studentId,
  termId,
  userId,
}: {
  studentId: string;
  termId: string;
  userId: string;
}) {
  const [revision, setRevision] = useState(0);
  const { data, error } = useScopedRequest(
    JSON.stringify([userId, studentId, termId, revision]),
    true,
    () => getGrades(studentId),
    true,
  );
  const saved = () => {
    setRevision((n) => n + 1);
  };
  return (
    <>
      <AccountSkeleton
        id="AdviserEncodeGrades-2"
        loading={!data && !error}
        label="Loading student attempts?"
      >
        {error && (
          <div role="alert">
            <p>{error}</p>
            <Button onClick={() => setRevision((n) => n + 1)}>Try again</Button>
          </div>
        )}
        {data &&
          (!data.canEdit ? (
            <p>Only the current adviser may encode grades.</p>
          ) : (
            <>
              <PendingIncs
                key={`${studentId}:${termId}`}
                data={data}
                studentId={studentId}
                onSaved={() => {
                  notify.success("Changes saved.");
                  setRevision((n) => n + 1);
                }}
              />
              <div className="min-w-0 lg:col-span-2">
                <TermEditor
                  key={`${studentId}:${termId}`}
                  studentId={studentId}
                  termId={termId}
                  userId={userId}
                  workspaceRevision={revision}
                  gradeData={data}
                  occupied={
                    data.terms
                      .find((t) => t.school_term_id === termId)
                      ?.attempts.map((a) => a.course_offering_id) ?? []
                  }
                  onSaved={saved}
                />
              </div>
            </>
          ))}
      </AccountSkeleton>
    </>
  );
}
function EncodeContent({
  userId,
  initialStudentId,
}: {
  userId: string;
  initialStudentId: string;
}) {
  const [student, setStudent] = useState(initialStudentId);
  const [term, setTerm] = useState("");
  const [revision, setRevision] = useState(0);
  const { data, error } = useScopedRequest(
    JSON.stringify([userId, revision]),
    true,
    getEncodingChoices,
  );
  const selectedStudent = data?.students.some(
    (item) => item.student_id === student,
  )
    ? student
    : "";
  return (
    <>
      <PageHeading
        title="Encode grades"
        subtitle="One advisee, one term, all courses"
        actions={
          <Button asChild variant="outline">
            <Link to="/adviser/import-grades">
              <UploadIcon />
              Import a JSON file
            </Link>
          </Button>
        }
      />
      <AccountSkeleton
        id="AdviserEncodeGrades-3"
        loading={!data && !error}
        label="Loading advisees and terms…"
      >
        {error && (
          <div role="alert">
            <p>{error}</p>
            <Button onClick={() => setRevision((n) => n + 1)}>Try again</Button>
          </div>
        )}
        {data && (
          <>
            <div className="grid items-stretch gap-4 lg:grid-cols-2">
              <Panel
                className="h-full mb-0"
                title="Advisee and term"
                description="Grades are saved against this advisee for the chosen term."
              >
                <div className="grid gap-4">
                  <label className="grid gap-1">
                    Advisee
                    <select
                      className="rounded-md border p-2"
                      value={selectedStudent}
                      onChange={(e) => setStudent(e.target.value)}
                    >
                      <option value="">Select advisee</option>
                      {data.students.map((s) => (
                        <option key={s.student_id} value={s.student_id}>
                          {s.full_name} · {s.student_number}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    Term
                    <select
                      className="rounded-md border p-2"
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                    >
                      <option value="">Select term</option>
                      {[...data.terms]
                        .sort(
                          (a, b) =>
                            (b.chronological_key ?? 0) -
                            (a.chronological_key ?? 0),
                        )
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.school_year} · {t.term_type}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              </Panel>
              {!(selectedStudent && term) && (
                <Panel
                  className="h-full mb-0"
                  title="INC resolution"
                  description="Pending incomplete grades for the selected advisee."
                >
                  <p className="text-sm text-muted-foreground">
                    Select an advisee and term to review INC records.
                  </p>
                </Panel>
              )}
              {!(selectedStudent && term) && (
                <Panel
                  className="lg:col-span-2"
                  title="Courses"
                  description="Midterm and final grades use the VSU scale: 1.00 to 3.00 passes, 5.00 fails, INC and DR are special marks. Saved courses cannot be removed."
                >
                  <div className="grid grid-cols-2 gap-3 border-b pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid-cols-5">
                    <span>Course</span>
                    <span>Instructor</span>
                    <span>Midterm</span>
                    <span>Final</span>
                    <span>Remarks</span>
                  </div>
                  <p className="py-4 text-sm text-muted-foreground">
                    Select an advisee and term to add courses.
                  </p>
                  <div>
                    <Button variant="outline" disabled>
                      + Add course
                    </Button>
                  </div>
                </Panel>
              )}
              {selectedStudent && term && (
                <SelectedWorkspace
                  key={`${selectedStudent}:${term}`}
                  studentId={selectedStudent}
                  termId={term}
                  userId={userId}
                />
              )}
            </div>
          </>
        )}
      </AccountSkeleton>
    </>
  );
}
export default function AdviserEncodeGrades() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  return (
    <AdviserPage title="Encode grades" sample={false}>
      {user && (
        <EncodeContent
          key={`${user.id}:${searchParams.get("student") ?? ""}`}
          userId={user.id}
          initialStudentId={searchParams.get("student") ?? ""}
        />
      )}
    </AdviserPage>
  );
}
