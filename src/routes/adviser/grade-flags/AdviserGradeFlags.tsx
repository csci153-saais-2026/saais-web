import { useState } from "react";
import { AdviserPage } from "../Adviser";
import { useAuth } from "@/hooks/use-auth";
import { useScopedRequest } from "../advisees/use-scoped-request";
import { getFlags, resolveFlag } from "./grade-flags.api";
import { PageHeading } from "@/components/features/page-heading";
import { DataTablePanel } from "@/components/features/data-table-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { isApiClientError, type ApiSchema } from "@/lib/api";
import { GradeSelect } from "../GradeSelect";
import { Textarea } from "@/components/ui/textarea";
function Resolve({
  flag,
  attempt,
  student,
  course,
  onSaved,
  onStale,
  refreshing,
  refreshError,
  action,
}: {
  action: "correct" | "reject";
  flag: ApiSchema<"GradeFlag">;
  attempt: ApiSchema<"AttemptResult">;
  student: string;
  course: string;
  onSaved: () => void;
  onStale: () => void;
  refreshing: boolean;
  refreshError?: string;
}) {
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reviewedRevision, setReviewedRevision] = useState<number | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (refreshing || reviewedRevision !== attempt.revision) return;
    if (
      action === "correct" &&
      grade === "inc" &&
      flag.reported_stage === "midterm"
    ) {
      setError("INC is a final status and cannot be used as a midterm grade.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await resolveFlag(flag.id, {
        resolution_action: action,
        resolution_note: reason.trim(),
        expected_revision: attempt.revision,
        ...(action === "correct"
          ? grade === "inc"
            ? { corrected_status: "inc" as const }
            : grade === "dr"
              ? flag.reported_stage === "midterm"
                ? { corrected_midterm_status: "dr" as const }
                : { corrected_status: "dr" as const }
              : { corrected_grade: Number(grade) }
          : {}),
      });
      setOpen(false);
      onSaved();
    } catch (e) {
      if (
        isApiClientError(e) &&
        e.status === 409 &&
        e.code === "STALE_ATTEMPT"
      ) {
        setReviewedRevision(null);
        onStale();
        setError(
          "The attempt was updated. Review the current attempt before resubmitting.",
        );
      } else
        setError(e instanceof Error ? e.message : "Unable to resolve flag.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={action === "correct" ? "default" : "destructive"}
        >
          {action === "correct" ? "Fix grade" : "Reject"}
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b p-5">
          <DialogTitle>
            {action === "correct" ? "Fix grade" : "Reject flag"}
          </DialogTitle>
          <DialogDescription>
            {student} · {course} · {flag.reported_stage ?? "grade"} · reported{" "}
            {flag.reported_grade_text ?? "—"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 p-5">
          <p>{flag.details}</p>
          {refreshError && (
            <div role="alert">
              <p>{refreshError}</p>
              <Button type="button" variant="outline" onClick={onStale}>
                Retry loading grade
              </Button>
            </div>
          )}
          <p>
            Current {flag.reported_stage === "midterm" ? "midterm" : "final"}{" "}
            grade:{" "}
            {flag.reported_stage === "midterm"
              ? (attempt.midterm_grade ??
                attempt.midterm_status ??
                "Not recorded")
              : (attempt.completion_grade ??
                attempt.final_grade ??
                attempt.recorded_status ??
                "Not recorded")}
          </p>
        </div>
        <form onSubmit={save}>
          <div className="grid gap-3 p-5">
            {action === "correct" && (
              <label className="grid gap-1">
                Corrected grade
                <GradeSelect
                  includeStatuses
                  placeholder="Choose the corrected grade"
                  required
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                />
              </label>
            )}
            <label className="grid gap-1">
              {action === "correct" ? "Reason for change" : "Reply / reason"}
              <Textarea
                placeholder="Required. This is written to the audit log."
                className="resize-y"
                maxLength={2000}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={reviewedRevision === attempt.revision}
                disabled={refreshing}
                onChange={(e) =>
                  setReviewedRevision(
                    e.target.checked ? attempt.revision : null,
                  )
                }
              />{" "}
              I reviewed the current grade
            </label>
            {error && <p role="alert">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t bg-muted/40 p-4">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant={action === "reject" ? "destructive" : "default"}
              disabled={
                busy ||
                refreshing ||
                reviewedRevision !== attempt.revision ||
                !reason.trim() ||
                (action === "correct" && !grade)
              }
            >
              {busy
                ? "Saving…"
                : action === "correct"
                  ? "Save correction"
                  : "Reject flag"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function FlagList({ userId }: { userId: string }) {
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState("");
  const requestKey = JSON.stringify([userId, revision]);
  const { data, error, key } = useScopedRequest(
    requestKey,
    true,
    getFlags,
    true,
  );
  return (
    <>
      <PageHeading
        title="Grade flags"
        subtitle="Grades your current advisees reported."
      />
      {!data && !error && <p role="status">Loading flags…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Button onClick={() => setRevision((n) => n + 1)}>Try again</Button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {data && (
        <DataTablePanel
          title="Open flags"
          action={
            <span className="text-sm leading-6 text-muted-foreground">
              {data.flags.length} open
            </span>
          }
          rows={data.flags}
          rowKey={(r) => r.id}
          columns={[
            {
              header: "Student",
              cell: (r) => {
                const student = data.roster.find(
                  (s) => s.student_id === r.student_id,
                );
                return (
                  <>
                    {student?.full_name ?? "Unavailable"}
                    <span className="block text-xs">
                      {student?.student_number}
                    </span>
                  </>
                );
              },
            },
            {
              header: "Course",
              cell: (r) => {
                const a = data.attempts.find(
                  (a) => a.id === r.attempt_id && a.student_id === r.student_id,
                );
                const o = data.offerings.find(
                  (o) => o.id === a?.course_offering_id,
                );
                const c = data.courses.find((c) => c.id === o?.course_id);
                return c ? `${c.code} · ${c.title}` : "Course unavailable";
              },
            },
            {
              header: "Reported grade",
              cell: (r) => r.reported_grade_text ?? "—",
            },
            { header: "Comment", cell: (r) => r.details },
            {
              header: "Raised",
              cell: (r) => new Date(r.created_at).toLocaleDateString(),
            },
            {
              header: "Action",
              cell: (r) => {
                const a = data.attempts.find(
                  (a) => a.id === r.attempt_id && a.student_id === r.student_id,
                );
                const student = data.roster.find(
                  (s) => s.student_id === r.student_id,
                );
                const o = data.offerings.find(
                  (o) => o.id === a?.course_offering_id,
                );
                const c = data.courses.find((c) => c.id === o?.course_id);
                return a && student ? (
                  <div className="flex flex-wrap gap-2">
                    {(["correct", "reject"] as const).map((action) => (
                      <Resolve
                        key={`${r.id}:${action}`}
                        action={action}
                        flag={r}
                        attempt={a}
                        student={student.full_name}
                        course={
                          c ? `${c.code} · ${c.title}` : "Course unavailable"
                        }
                        refreshing={key !== requestKey}
                        refreshError={error}
                        onStale={() => setRevision((n) => n + 1)}
                        onSaved={() => {
                          setMessage("Flag resolved.");
                          setRevision((n) => n + 1);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  "Attempt unavailable"
                );
              },
            },
          ]}
        />
      )}
    </>
  );
}
export default function AdviserGradeFlags() {
  const { user } = useAuth();
  return (
    <AdviserPage title="Grade flags" sample={false}>
      {user && <FlagList key={user.id} userId={user.id} />}
    </AdviserPage>
  );
}
