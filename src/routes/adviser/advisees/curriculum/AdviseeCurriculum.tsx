import { useState } from "react";
import { useParams } from "react-router";
import { AdviserPage } from "../../Adviser";
import { useAuth } from "@/hooks/use-auth";
import { useScopedRequest } from "../use-scoped-request";
import {
  endorseTransfer,
  getCurriculumData,
  previewShift,
} from "./curriculum.api";
import { DataTablePanel } from "@/components/features/data-table-panel";
import { Panel } from "@/components/features/panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Truncate } from "@/components/ui/truncate";
import type { ApiSchema } from "@/lib/api";

function CurriculumContent({ id, userId }: { id: string; userId: string }) {
  const [revision, setRevision] = useState(0);
  const [transferTarget, setTransferTarget] = useState("");
  const [previewTarget, setPreviewTarget] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] =
    useState<ApiSchema<"ShiftPreviewResponse"> | null>(null);
  const result = useScopedRequest(
    JSON.stringify([userId, id, revision]),
    true,
    () => getCurriculumData(id),
  );
  const data = result.data;
  async function run(action: "preview" | "endorse") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (action === "preview")
        setPreview(await previewShift(id, previewTarget));
      else {
        await endorseTransfer(id, transferTarget, reason.trim());
        setMessage("Transfer endorsed for review.");
        setReason("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete request.");
    } finally {
      setBusy(false);
    }
  }
  const choices =
    data?.versions.filter(
      (version) =>
        version.status === "active" &&
        version.id !==
          data.assignments.find((assignment) => assignment.end_date == null)
            ?.curriculum_version_id,
    ) ?? [];
  return (
    <>
      {!data && !result.error && (
        <p role="status">Loading curriculum history…</p>
      )}
      {result.error && (
        <div role="alert">
          <p>{result.error}</p>
          <Button variant="outline" onClick={() => setRevision((n) => n + 1)}>
            Try again
          </Button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {data && (
        <>
          <DataTablePanel
            title="Curriculum history"
            description="Every curriculum this student has followed, with the transfer that moved them."
            rows={data.assignments}
            rowKey={(row) => row.id}
            columns={[
              {
                header: "Curriculum version",
                cell: (row) => (
                  <Truncate
                    text={
                      data.versions.find(
                        (version) => version.id === row.curriculum_version_id,
                      )?.version_label ?? row.curriculum_version_id
                    }
                    className="max-w-64"
                  />
                ),
              },
              { header: "From", cell: (row) => row.start_date },
              { header: "To", cell: (row) => row.end_date ?? "Current" },
              {
                header: "Note",
                cell: (row) => (
                  <Truncate
                    text={row.change_note ?? "—"}
                    className="max-w-72"
                  />
                ),
              },
            ]}
          />
          {!data.canEdit && (
            <p className="mb-4 text-sm">
              Historical record: read-only. Preview remains available when
              authorized.
            </p>
          )}
          <div className="grid items-stretch gap-x-4 lg:grid-cols-2 [&>div]:h-[calc(100%-1rem)]">
            {data.canEdit && (
              <Panel
                title="Endorse a curriculum transfer"
                description="The Department Head approves the transfer. Nothing changes until then."
              >
                <div className="grid gap-4">
                  <label className="grid gap-1 text-sm font-medium">
                    Transfer to
                    <select
                      className="rounded-md border border-border bg-background px-3 py-2"
                      value={transferTarget}
                      onChange={(event) => {
                        setTransferTarget(event.target.value);
                        setMessage("");
                      }}
                    >
                      <option value="">Select curriculum</option>
                      {choices.map((version) => (
                        <option key={version.id} value={version.id}>
                          {version.version_label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-medium">
                    Reason
                    <Textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />
                  </label>
                  <div>
                    <Button
                      disabled={!transferTarget || !reason.trim() || busy}
                      onClick={() => void run("endorse")}
                    >
                      Endorse transfer
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Courses with matching identities and approved equivalencies
                    are reviewed as part of the transfer.
                  </p>
                </div>
              </Panel>
            )}
            <Panel
              title="Curriculum shift preview"
              description="Explore another curriculum without changing the record."
            >
              <div className="grid gap-4">
                <label className="grid gap-1 text-sm font-medium">
                  Target curriculum
                  <select
                    className="rounded-md border border-border bg-background px-3 py-2"
                    value={previewTarget}
                    disabled={busy}
                    onChange={(event) => {
                      setPreviewTarget(event.target.value);
                      setPreview(null);
                    }}
                  >
                    <option value="">Select curriculum</option>
                    {choices.map((version) => (
                      <option key={version.id} value={version.id}>
                        {version.version_label}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <Button
                    variant="outline"
                    disabled={!previewTarget || busy}
                    onClick={() => void run("preview")}
                  >
                    Preview shift
                  </Button>
                </div>
                {preview && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["Carried units", preview.carried_units],
                      ["Lost units", preview.lost_units],
                      [
                        "Projected GWA",
                        preview.projected_gwa?.toFixed(2) ?? "—",
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-md border border-border bg-background p-4"
                      >
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          {label}
                        </p>
                        <p className="mt-2 text-xl font-semibold text-primary">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Read-only simulation. No curriculum assignment is changed.
                </p>
              </div>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
export default function AdviseeCurriculum() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  return (
    <AdviserPage title="Curriculum" tab="curriculum" sample={false}>
      {id && user && (
        <CurriculumContent key={`${user.id}:${id}`} id={id} userId={user.id} />
      )}
    </AdviserPage>
  );
}
