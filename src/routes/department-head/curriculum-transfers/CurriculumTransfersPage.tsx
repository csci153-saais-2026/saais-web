import * as React from "react"
import { useSearchParams } from "react-router"
import { AlertIcon } from "@/components/icons"
import { FormField } from "@/components/features/form-field"
import { PageHeading } from "@/components/features/page-heading"
import { RecordTabs } from "@/components/features/student-record-header"
import { StatGrid } from "@/components/features/stat-tile"
import { Panel } from "@/components/features/panel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { QueryMessage } from "../shared/dh-ui"
import { useNotify } from "../shared/notify-context"
import { useDecideTransfer, useTransfers, type TransferRequest } from "./transfers-api"

export default function CurriculumTransfersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.has("history") ? "history" : "pending"

  const transfers = useTransfers()
  const decide = useDecideTransfer()
  const pendingRequests = transfers.data?.pending ?? []
  const decisionHistory = transfers.data?.history ?? []
  const [selectedRequest, setSelectedRequest] = React.useState<TransferRequest | null>(null)
  const [decisionReason, setDecisionReason] = React.useState("")
  const [rejectionError, setRejectionError] = React.useState(false)
  const showToast = useNotify()

  const handleTabChange = (nextTab: string) => {
    const nextParams = new URLSearchParams(searchParams)
    if (nextTab === "history") {
      nextParams.set("history", "1")
    } else {
      nextParams.delete("history")
    }
    setSearchParams(nextParams, { replace: true })
  }

  const handleOpenReview = (req: TransferRequest) => {
    setSelectedRequest(req)
    setDecisionReason("")
    setRejectionError(false)
  }

  const submitDecision = async (decision: "approved" | "rejected") => {
    if (!selectedRequest) return
    const note = decisionReason.trim()
    if (decision === "rejected" && !note) {
      setRejectionError(true)
      return
    }
    try {
      await decide.mutateAsync({ id: selectedRequest.id, decision, note })
      showToast(`Request for ${selectedRequest.studentName} ${decision}.`)
      setSelectedRequest(null)
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : "The decision could not be saved.")
    }
  }
  const handleApprove = () => submitDecision("approved")
  const handleReject = () => submitDecision("rejected")

  const totalDecisionsCount = decisionHistory.length
  const approvedCount = decisionHistory.filter((item) => item.decision === "Approved").length
  const rejectedCount = decisionHistory.length - approvedCount

  if (!transfers.data) {
    return (
      <div className="space-y-6">
        <PageHeading title="Curriculum transfers" subtitle="Review adviser-endorsed requests to move students to another curriculum." />
        <QueryMessage query={transfers} label="curriculum transfers" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
          { value: "pending", label: `Pending review (${pendingRequests.length})` },
          { value: "history", label: `Decision history (${totalDecisionsCount})` },
        ]}
        value={activeTab}
        onValueChange={handleTabChange}
      />

      {activeTab === "pending" ? (
        <div className="space-y-6">
          <Panel
            title="Transfer requests"
            description="Review the student record and adviser's reason before making a decision."
            flush
          >
            <Table responsive>
              <TableHeader className="bg-secondary">
                <TableRow>
                  <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Student</TableHead>
                  <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Current curriculum</TableHead>
                  <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Requested curriculum</TableHead>
                  <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Adviser</TableHead>
                  <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Submitted</TableHead>
                  <TableHead className="text-right" aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell label="Student">
                      <strong className="block font-semibold text-foreground">{req.studentName}</strong>
                      <small className="block font-mono text-xs text-muted-2">{req.studentId}</small>
                    </TableCell>
                    <TableCell label="Current curriculum" className="text-muted-foreground">{req.currentCurriculum}</TableCell>
                    <TableCell label="Requested curriculum" className="font-medium text-foreground">{req.requestedCurriculum}</TableCell>
                    <TableCell label="Adviser" className="text-muted-foreground">{req.adviser}</TableCell>
                    <TableCell label="Submitted" className="text-muted-foreground">{req.submittedDate}</TableCell>
                    <TableCell label="Actions" className="text-right">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto px-0 py-1 font-semibold underline-offset-4 cursor-pointer"
                        onClick={() => handleOpenReview(req)}
                      >
                        Review request →
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No transfer requests currently awaiting review.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center border-t border-line-soft px-5 py-3 text-xs text-muted-foreground">
              <span>
                {pendingRequests.length} {pendingRequests.length === 1 ? "request" : "requests"} awaiting a decision
              </span>
              <span>DCST department scope</span>
            </div>
          </Panel>

          <Alert variant="advisory">
            <AlertIcon />
            <AlertDescription>
              Requests originate from the student's adviser. Approved transfers use the equivalencies defined for the curriculum pair.
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <Panel
          title="Transfer decision history"
          description={`${totalDecisionsCount} recorded decisions.`}
          flush
        >
          <Table responsive>
            <TableHeader className="bg-secondary">
              <TableRow>
                <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Student</TableHead>
                <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Curriculum transfer</TableHead>
                <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Adviser</TableHead>
                <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Decision</TableHead>
                <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Decision reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decisionHistory.map((hist) => (
                <TableRow key={hist.id}>
                  <TableCell label="Student">
                    <span className="font-medium text-foreground">{hist.studentName}</span>{" "}
                    <span className="font-mono text-xs text-muted-2">· {hist.studentId}</span>
                  </TableCell>
                  <TableCell label="Curriculum transfer" className="font-mono text-xs">
                    {hist.currentCurriculum} → {hist.requestedCurriculum}
                  </TableCell>
                  <TableCell label="Adviser" className="text-muted-foreground">{hist.adviser}</TableCell>
                  <TableCell label="Decision">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={hist.decision === "Approved" ? "passed" : "failed"}>
                        {hist.decision}
                      </StatusBadge>
                      <span className="text-xs text-muted-2">· {hist.decisionDate}</span>
                    </div>
                  </TableCell>
                  <TableCell label="Decision reason" className="text-sm text-muted-foreground max-w-xs">
                    {hist.decisionReason}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-between items-center border-t border-line-soft px-5 py-3 text-xs text-muted-foreground">
            <span>
              {decisionHistory.length} decisions of {totalDecisionsCount}
            </span>
            <span>DCST department scope</span>
          </div>
        </Panel>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Review curriculum transfer</DialogTitle>
            <DialogDescription>
              Review the student record and adviser rationale before approving or rejecting.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between pb-3 border-b border-line-soft">
                <div>
                  <h3 className="text-lg font-heading font-bold text-foreground">{selectedRequest.studentName}</h3>
                  <span className="font-mono text-xs text-muted-foreground">{selectedRequest.studentId}</span>
                </div>
                <StatusBadge status="inc">Pending review</StatusBadge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-xs font-semibold text-muted-2 uppercase tracking-wider">Endorsed by</span>
                  <span className="font-medium text-foreground">{selectedRequest.adviser}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-muted-2 uppercase tracking-wider">Submitted</span>
                  <span className="font-medium text-foreground">{selectedRequest.submittedDate}</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-sm border border-border bg-secondary/60 p-4">
                <div className="flex-1">
                  <small className="block text-xs text-muted-foreground mb-1">Current curriculum</small>
                  <strong className="font-heading font-semibold text-foreground">{selectedRequest.currentCurriculum}</strong>
                </div>
                <span className="px-3 text-lg text-muted-foreground">→</span>
                <div className="flex-1 text-right">
                  <small className="block text-xs text-muted-foreground mb-1">Requested curriculum</small>
                  <strong className="font-heading font-semibold text-foreground">{selectedRequest.requestedCurriculum}</strong>
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
                error={rejectionError ? "Add a decision reason to reject the request." : undefined}
              >
                <Textarea
                  id="decision-reason"
                  placeholder="Enter a reason for this decision"
                  value={decisionReason}
                  aria-invalid={rejectionError || undefined}
                  onChange={(e) => {
                    setDecisionReason(e.target.value)
                    if (rejectionError && e.target.value.trim()) setRejectionError(false)
                  }}
                />
              </FormField>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject request
            </Button>
            <Button onClick={handleApprove}>
              Approve request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
