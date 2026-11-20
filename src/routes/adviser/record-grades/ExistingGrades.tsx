import { useState } from "react";
import type { ApiSchema } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/features/panel";
import { completeInc } from "../advisees/checklist/record.api";
import type { getTermOfferings } from "./encode.api";
import { GradeSelect } from "../GradeSelect";
import { outcomeStatus } from "./grade-encoding";
import { emptyDraft, type ExistingDraft } from "./existing-draft";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type GradeData = Awaited<
  ReturnType<typeof import("../advisees/checklist/record.api").getGrades>
>;
function labelFor(attempt: ApiSchema<"AttemptResult">, data: GradeData) {
  const offering = data.offerings.find(
    (o) => o.id === attempt.course_offering_id,
  );
  const course = data.courses.find((c) => c.id === offering?.course_id);
  return course
    ? `${course.code} · ${course.title}`
    : `Course ${attempt.course_offering_id}`;
}
function PendingInc({
  studentId,
  attempt,
  title,
  termLabel,
  studentName,
  onSaved,
}: {
  studentId: string;
  studentName?: string;
  attempt: ApiSchema<"AttemptResult">;
  title: string;
  termLabel?: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await completeInc(studentId, attempt, Number(grade), reason.trim());
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete INC.");
    } finally {
      setBusy(false);
    }
  }
  const [code, ...courseName] = title.split(" · ");
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border p-4">
      <p>
        <strong>{code}</strong>
        {courseName.length > 0 && (
          <span className="mt-1 block text-xs text-muted-foreground">
            {courseName.join(" · ")}
          </span>
        )}
        <span className="mt-2 block text-xs text-muted-foreground">
          {termLabel}
          {attempt.midterm_grade != null && (
            <>
              {termLabel && " · "}Midterm{" "}
              <span className="font-mono">
                {attempt.midterm_grade.toFixed(2)}
              </span>
            </>
          )}
          {attempt.inc_deadline && (
            <>
              {(termLabel || attempt.midterm_grade != null) && " · "}Deadline{" "}
              {attempt.inc_deadline}
            </>
          )}
        </span>
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">Resolve INC</Button>
        </DialogTrigger>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-140">
          <DialogHeader className="border-b px-6 pb-4 pt-5">
            <DialogTitle>Resolve INC</DialogTitle>
            <DialogDescription>
              {title}
              {studentName && ` · ${studentName}`}
            </DialogDescription>
          </DialogHeader>
          <form aria-label={`Complete INC for ${title}`} onSubmit={save}>
            <div className="grid gap-4 px-6 py-5.5">
              <label className="grid gap-1.5">
                Completion grade
                <GradeSelect
                  vsuScale
                  required
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                />
              </label>
              <label className="grid gap-1.5">
                Reason
                <textarea
                  rows={3}
                  className="min-h-21 resize-y rounded-md border border-border px-3 py-2"
                  placeholder="Required. This is written to the audit log."
                  maxLength={2000}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              {error && <p role="alert">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !grade || !reason.trim()}>
                {busy ? "Saving…" : "Resolve INC"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ExistingAttempt({
  attempt,
  title,
  instructorOptions,
  draft,
  disabled,
  onDraft,
}: {
  attempt: ApiSchema<"AttemptResult">;
  title: string;
  instructorOptions: string[];
  draft: ExistingDraft;
  disabled: boolean;
  onDraft: (draft: ExistingDraft) => void;
}) {
  const { midterm, final, instructor } = draft;
  const allowMidterm =
    attempt.midterm_grade == null &&
    attempt.midterm_status !== "dr" &&
    attempt.recorded_status === "currently_enrolled";
  const allowFinal =
    attempt.final_grade == null &&
    attempt.completion_grade == null &&
    attempt.recorded_status === "currently_enrolled" &&
    attempt.midterm_status !== "dr";
  const displayedMidterm =
    attempt.midterm_status === "dr"
      ? "DR"
      : attempt.midterm_grade == null
        ? "—"
        : attempt.midterm_grade.toFixed(2);
  const displayedFinal =
    attempt.recorded_status === "dr"
      ? "DR"
      : attempt.recorded_status === "inc" && attempt.completion_grade == null
        ? "INC"
        : ((attempt.completion_grade ?? attempt.final_grade)?.toFixed(2) ??
          "—");
  const [code, ...name] = title.split(" · ");
  const shownStatus =
    attempt.recorded_status === "currently_enrolled"
      ? final
        ? outcomeStatus(final)
        : ("enrolled" as const)
      : attempt.recorded_status === "inc" && attempt.completion_grade == null
        ? ("inc" as const)
        : attempt.effective_status === "passed" ||
            attempt.effective_status === "failed"
          ? attempt.effective_status
          : outcomeStatus(attempt.recorded_status);
  return (
    <div
      role="group"
      aria-label={`Edit ${title}`}
      className="grid gap-3 lg:gap-x-7 border-b border-border px-3.5 py-2 sm:grid-cols-2 lg:grid-cols-[minmax(140px,1fr)_minmax(180px,1fr)_90px_90px_minmax(160px,1.45fr)_28px] lg:items-center"
    >
      <div>
        <strong>{code}</strong>
        {name.length > 0 && (
          <span className="block text-xs text-muted-foreground">
            {name.join(" · ")}
          </span>
        )}
      </div>
      <label>
        <span className="sr-only">Instructor for {title}</span>
        <select
          disabled={disabled}
          className="w-full rounded-md border border-border bg-card p-2"
          value={instructor}
          onChange={(e) => onDraft({ ...draft, instructor: e.target.value })}
        >
          <option value="">Select instructor</option>
          {[
            ...new Set([
              ...(attempt.instructor ? [attempt.instructor] : []),
              ...instructorOptions,
            ]),
          ].map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {allowMidterm ? (
        <label>
          <span className="sr-only">New midterm grade</span>
          <GradeSelect
            allowDrop
            disabled={disabled}
            placeholder="—"
            value={midterm}
            onChange={(e) => {
              const value = e.target.value;
              onDraft(
                value === "dr"
                  ? { ...draft, midterm: value, final: "dr" }
                  : {
                      ...draft,
                      midterm: value,
                      final: midterm === "dr" ? "" : final,
                    },
              );
            }}
          />
        </label>
      ) : (
        <label>
          <span className="sr-only">Midterm for {title}</span>
          <GradeSelect
            allowDrop
            disabled
            placeholder="—"
            value={
              displayedMidterm === "DR"
                ? "dr"
                : displayedMidterm === "—"
                  ? ""
                  : displayedMidterm
            }
          />
        </label>
      )}
      {allowFinal ? (
        <label>
          <span className="sr-only">New final grade</span>
          <GradeSelect
            vsuScale
            includeStatuses
            disableDrop={midterm !== "dr"}
            disabled={disabled || midterm === "dr"}
            placeholder="—"
            value={final}
            onChange={(e) => onDraft({ ...draft, final: e.target.value })}
          />
        </label>
      ) : (
        <label>
          <span className="sr-only">Final for {title}</span>
          <GradeSelect
            includeStatuses
            disabled
            placeholder="—"
            value={
              displayedFinal === "DR"
                ? "dr"
                : displayedFinal === "INC"
                  ? "inc"
                  : displayedFinal === "—"
                    ? ""
                    : displayedFinal
            }
          />
        </label>
      )}
      <div aria-label={`Status for ${title}`}>
        {shownStatus ? (
          <StatusBadge status={shownStatus} />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
      <span aria-hidden="true" />
      <p className="sr-only">Saved courses cannot be removed. Previously recorded grades are changed through the grade correction workflow.</p>
    </div>
  );
}
export function PendingIncs({
  data,
  studentId,
  onSaved,
}: {
  data: GradeData;
  studentId: string;
  onSaved: () => void;
}) {
  const pending = data.terms
    .flatMap((term) => term.attempts)
    .filter((a) => a.recorded_status === "inc" && a.completion_grade == null);
  return (
    <Panel
      className="min-w-0 h-full mb-0 lg:col-start-2 lg:row-start-1"
      title="INC resolution"
      description="Pending incomplete grades for the advisee chosen in the card on the left."
    >
      {pending.length ? (
        pending.map((a) => {
          const term = data.terms.find((item) =>
            item.attempts.some((attempt) => attempt.id === a.id),
          );
          return (
            <PendingInc
              key={a.id}
              studentId={studentId}
              studentName={data.studentName}
              attempt={a}
              title={labelFor(a, data)}
              termLabel={
                term ? `${term.school_year} · ${term.term_type}` : undefined
              }
              onSaved={onSaved}
            />
          );
        })
      ) : (
        <p>No pending INC records.</p>
      )}
    </Panel>
  );
}
export function ExistingCourseRows({
  data,
  offerings,
  termId,
  drafts,
  disabled,
  onDraft,
}: {
  data: GradeData;
  offerings: Awaited<ReturnType<typeof getTermOfferings>>;
  termId: string;
  drafts: Record<string, ExistingDraft>;
  disabled: boolean;
  onDraft: (attemptId: string, draft: ExistingDraft) => void;
}) {
  const existing =
    data.terms.find((term) => term.school_term_id === termId)?.attempts ?? [];
  return (
    <>
      {existing.map((a) => (
        <ExistingAttempt
          key={a.id}
          attempt={a}
          title={labelFor(a, data)}
          instructorOptions={
            offerings.find((o) => o.offering.id === a.course_offering_id)
              ?.instructor_options ?? []
          }
          draft={drafts[a.id] ?? emptyDraft(a)}
          disabled={disabled}
          onDraft={(draft) => onDraft(a.id, draft)}
        />
      ))}
    </>
  );
}
