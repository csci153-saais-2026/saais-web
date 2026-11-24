import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { TRANSFERS_SKELETON_SAMPLE } from "../shared/dh.skeleton-samples";
import * as React from "react";
import { useSearchParams } from "react-router";
import { AlertIcon } from "@/components/icons";
import { FormField } from "@/components/features/form-field";
import { PageHeading } from "@/components/features/page-heading";
import { RecordTabs } from "@/components/features/student-record-header";
import { StatGrid } from "@/components/features/stat-tile";
import { DataTablePanel } from "@/components/features/data-table-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { Truncate } from "@/components/ui/truncate";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { REASON_MAX_LENGTH, REASON_MAX_MESSAGE } from "@/lib/validation/limits";
import { QueryMessage } from "../shared/dh-ui";
import { useNotify } from "../shared/notify-context";
import type { TransferRequest } from "./transfers-api";
import { useDecideTransfer, useTransfers } from "./use-transfers";

export default function CurriculumTransfersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.has("history") ? "history" : "pending";

  const transfers = useTransfers();
  const decide = useDecideTransfer();
  const pendingRequests = (transfers.data ?? TRANSFERS_SKELETON_SAMPLE).pending;
  const decisionHistory = (transfers.data ?? TRANSFERS_SKELETON_SAMPLE).history;
  const [selectedRequest, setSelectedRequest] =
    React.useState<TransferRequest | null>(null);
  const [decisionReason, setDecisionReason] = React.useState("");
  const [rejectionError, setRejectionError] = React.useState(false);
  const [decisionError, setDecisionError] = React.useState("");
  const showToast = useNotify();

  const handleTabChange = (nextTab: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === "history") {
      nextParams.set("history", "1");
    } else {
      nextParams.delete("history");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleOpenReview = (req: TransferRequest) => {
    setSelectedRequest(req);
    setDecisionReason("");
    setRejectionError(false);
    setDecisionError("");
  };

  const submitDecision = async (decision: "approved" | "rejected") => {
    if (!selectedRequest || decide.isPending) return;
    const note = decisionReason.trim();
    if (decision === "rejected" && !note) {
      setRejectionError(true);
      return;
    }
    if (note.length > REASON_MAX_LENGTH) {
      setDecisionError(REASON_MAX_MESSAGE);
      return;
    }
    setDecisionError("");
    try {
      await decide.mutateAsync({ id: selectedRequest.id, decision, note });
      showToast(`Request for ${selectedRequest.studentName} ${decision}.`);
      setSelectedRequest(null);
    } catch (failure) {
      setDecisionError(
        failure instanceof Error
          ? failure.message
          : "The decision could not be saved.",
      );
    }
  };
  const handleApprove = () => submitDecision("approved");
  const handleReject = () => submitDecision("rejected");

  const totalDecisionsCount = decisionHistory.length;
  const approvedCount = decisionHistory.filter(
    (item) => item.decision === "Approved",
  ).length;
  const rejectedCount = decisionHistory.length - approvedCount;

  if (transfers.isError && !transfers.data) {
    return (
      <div className="space-y-6 [&_th]:h-auto [&_th]:px-3.5 [&_th]:py-2.5 [&_td]:px-3.5 [&_td]:py-[11px] [&_td]:whitespace-normal">
        <PageHeading
          title="Curriculum transfers"
          subtitle="Review adviser-endorsed requests to move students to another curriculum."
        />
        <QueryMessage query={transfers} label="curriculum transfers" />
      </div>
    );
  }

  return (
    <AccountSkeleton
      id="dh-curriculum-transfers"
      data={transfers.data}
      sample={TRANSFERS_SKELETON_SAMPLE}
      label="Loading curriculum transfers…"
    >
      {() => (
        <div className="space-y-6 [&_th]:h-auto [&_th]:px-3.5 [&_th]:py-2.5 [&_td]:px-3.5 [&_td]:py-[11px] [&_td]:whitespace-normal">
          <PageHeading
            title="Curriculum transfers"
            subtitle="Review adviser-endorsed requests to move students to another curriculum."
          />

          <StatGrid
            className="lg:grid-cols-3"
            items={[
              {
                label: "Pending review",
                value: pendingRequests.length,
                note: "Requests endorsed by advisers",
              },
              {
                label: "Approved",
                value: approvedCount,
                note: "All recorded decisions",
              },
              {
                label: "Rejected",
                value: rejectedCount,
                note: "Decisions include a reason",
              },
            ]}
          />

          <RecordTabs
            tabs={[
              {
                value: "pending",
                label: `Pending review (${pendingRequests.length})`,
              },
              {
                value: "history",
                label: `Decision history (${totalDecisionsCount})`,
              },
            ]}
            value={activeTab}
            onValueChange={handleTabChange}
          />

          {activeTab === "pending" ? (
            <div className="space-y-6 [&_th]:h-auto [&_th]:px-3.5 [&_th]:py-2.5 [&_td]:px-3.5 [&_td]:py-[11px] [&_td]:whitespace-normal">
              <DataTablePanel
                title="Transfer requests"
                description="Review the student record and adviser's reason before making a decision."
                rows={pendingRequests}
                rowKey={(row) => row.id}
                empty="No transfer requests currently awaiting review."
                columns={[
                  {
                    header: "Student",
                    cell: (row) => (
                      <div className="min-w-0">
                        <strong className="block font-semibold">
                          <Truncate
                            text={row.studentName}
                            className="max-w-64"
                          />
                        </strong>
                        <small className="block font-mono text-xs text-muted-2">
                          {row.studentId}
                        </small>
                      </div>
                    ),
                  },
                  {
                    header: "Current curriculum",
                    cell: (row) => <Truncate text={row.currentCurriculum} />,
                  },
                  {
                    header: "Requested curriculum",
                    cell: (row) => <Truncate text={row.requestedCurriculum} />,
                  },
                  {
                    header: "Adviser",
                    cell: (row) => <Truncate text={row.adviser} />,
                  },
                  { header: "Submitted", cell: (row) => row.submittedDate },
                  {
                    header: "Actions",
                    className: "text-right",
                    cell: (row) => (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto px-0 py-1 font-semibold"
                        onClick={() => handleOpenReview(row)}
                      >
                        Review request →
                      </Button>
                    ),
                  },
                ]}
                footer={
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>
                      {pendingRequests.length}{" "}
                      {pendingRequests.length === 1 ? "request" : "requests"}{" "}
                      awaiting a decision
                    </span>
                    <span>DCST department scope</span>
                  </div>
                }
              />

              <Alert variant="advisory">
                <AlertIcon />
                <AlertDescription>
                  Requests originate from the student's adviser. Approved
                  transfers use the equivalencies defined for the curriculum
                  pair.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <DataTablePanel
              title="Transfer decision history"
              description={`${totalDecisionsCount} recorded decisions.`}
              rows={decisionHistory}
              rowKey={(row) => row.id}
              empty="No transfer decisions have been recorded."
              columns={[
                {
                  header: "Student",
                  cell: (row) => (
                    <div className="min-w-0">
                      <strong className="block font-semibold">
                        <Truncate text={row.studentName} className="max-w-64" />
                      </strong>
                      <small className="block font-mono text-xs text-muted-2">
                        {row.studentId}
                      </small>
                    </div>
                  ),
                },
                {
                  header: "Curriculum transfer",
                  cell: (row) => (
                    <Truncate
                      text={`${row.currentCurriculum} → ${row.requestedCurriculum}`}
                      className="max-w-72"
                    />
                  ),
                },
                {
                  header: "Adviser",
                  cell: (row) => <Truncate text={row.adviser} />,
                },
                {
                  header: "Decision",
                  cell: (row) => (
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={
                          row.decision === "Approved" ? "passed" : "failed"
                        }
                      >
                        {row.decision}
                      </StatusBadge>
                      <span>· {row.decisionDate}</span>
                    </div>
                  ),
                },
                {
                  header: "Decision reason",
                  className: "max-w-xs whitespace-normal wrap-anywhere",
                  cell: (row) => row.decisionReason || "—",
                },
              ]}
              footer={
                <div className="flex flex-wrap justify-between gap-2">
                  <span>
                    {decisionHistory.length} decisions of {totalDecisionsCount}
                  </span>
                  <span>DCST department scope</span>
                </div>
              }
            />
          )}

          {/* Review Dialog */}
          <Dialog
            open={!!selectedRequest}
            onOpenChange={(open) =>
              !open && !decide.isPending && setSelectedRequest(null)
            }
          >
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[680px]">
              <DialogHeader>
                <DialogTitle>Review curriculum transfer</DialogTitle>
                <DialogDescription>
                  Review the student record and adviser rationale before
                  approving or rejecting.
                </DialogDescription>
              </DialogHeader>

              {selectedRequest && (
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between pb-3 border-b border-line-soft">
                    <div>
                      <h3 className="text-lg font-heading font-bold text-foreground">
                        {selectedRequest.studentName}
                      </h3>
                      <span className="font-mono text-xs text-muted-foreground">
                        {selectedRequest.studentId}
                      </span>
                    </div>
                    <StatusBadge status="inc">Pending review</StatusBadge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-xs font-semibold text-muted-2 uppercase tracking-wider">
                        Endorsed by
                      </span>
                      <span className="font-medium text-foreground">
                        {selectedRequest.adviser}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-muted-2 uppercase tracking-wider">
                        Submitted
                      </span>
                      <span className="font-medium text-foreground">
                        {selectedRequest.submittedDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-sm border border-border bg-secondary/60 p-4">
                    <div className="flex-1">
                      <small className="block text-xs text-muted-foreground mb-1">
                        Current curriculum
                      </small>
                      <strong className="font-heading font-semibold text-foreground">
                        {selectedRequest.currentCurriculum}
                      </strong>
                    </div>
                    <span className="px-3 text-lg text-muted-foreground">
                      →
                    </span>
                    <div className="flex-1 text-right">
                      <small className="block text-xs text-muted-foreground mb-1">
                        Requested curriculum
                      </small>
                      <strong className="font-heading font-semibold text-foreground">
                        {selectedRequest.requestedCurriculum}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-muted-2 uppercase tracking-wider mb-2">
                      Adviser's reason for transfer
                    </span>
                    <div className="rounded-sm border border-line-soft bg-card p-3.5 text-sm text-foreground/90 leading-relaxed">
                      {selectedRequest.reason}
                    </div>
                  </div>

                  <FormField
                    label="Decision reason"
                    htmlFor="decision-reason"
                    error={
                      rejectionError
                        ? "Add a decision reason to reject the request."
                        : undefined
                    }
                  >
                    <Textarea
                      id="decision-reason"
                      maxLength={REASON_MAX_LENGTH}
                      disabled={decide.isPending}
                      placeholder="Enter a reason for this decision"
                      value={decisionReason}
                      aria-invalid={rejectionError || undefined}
                      onChange={(e) => {
                        setDecisionReason(e.target.value);
                        if (rejectionError && e.target.value.trim())
                          setRejectionError(false);
                      }}
                    />
                  </FormField>
                </div>
              )}

              {decisionError && (
                <p role="alert" className="text-sm text-destructive">
                  {decisionError}
                </p>
              )}
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  disabled={decide.isPending}
                  variant="outline"
                  onClick={() => setSelectedRequest(null)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={decide.isPending}
                  variant="destructive"
                  onClick={handleReject}
                >
                  Reject request
                </Button>
                <Button disabled={decide.isPending} onClick={handleApprove}>
                  Approve request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </AccountSkeleton>
  );
}
