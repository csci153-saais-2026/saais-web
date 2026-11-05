import * as React from "react"
import { PageHeading } from "@/components/features/page-heading"
import { StatGrid } from "@/components/features/stat-tile"
import { Panel } from "@/components/features/panel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SampleFooter } from "@/components/features/sample-footer"
import {
  MOCK_TRANSFER_REQUESTS,
  MOCK_TRANSFER_HISTORY,
  type TransferRequest,
  type TransferDecisionHistory,
} from "@/routes/department-head/mock-data"

export default function CurriculumTransfersPage() {
  const [pendingRequests, setPendingRequests] = React.useState<TransferRequest[]>(MOCK_TRANSFER_REQUESTS)
  const [decisionHistory, setDecisionHistory] = React.useState<TransferDecisionHistory[]>(MOCK_TRANSFER_HISTORY)
  const [selectedRequest, setSelectedRequest] = React.useState<TransferRequest | null>(null)
  const [decisionReason, setDecisionReason] = React.useState("")
  const [rejectionError, setRejectionError] = React.useState(false)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 4000)
  }

  const handleOpenReview = (req: TransferRequest) => {
    setSelectedRequest(req)
    setDecisionReason("")
    setRejectionError(false)
  }

  const handleApprove = () => {
    if (!selectedRequest) return
    const approvedItem: TransferDecisionHistory = {
      id: `hist-${Date.now()}`,
      studentName: selectedRequest.studentName,
      studentId: selectedRequest.studentId,
      currentCurriculum: selectedRequest.currentCurriculum,
      requestedCurriculum: selectedRequest.requestedCurriculum,
      adviser: selectedRequest.adviser,
      decision: "Approved",
      decisionDate: "Today",
      decisionReason: decisionReason.trim() || "Completed foundational courses align with requested curriculum.",
    }

    setPendingRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id))
    setDecisionHistory((prev) => [approvedItem, ...prev])
    setSelectedRequest(null)
    showToast(`Request for ${approvedItem.studentName} approved. (Preview only)`)
  }

  const handleReject = () => {
    if (!selectedRequest) return
    if (!decisionReason.trim()) {
      setRejectionError(true)
      return
    }

    const rejectedItem: TransferDecisionHistory = {
      id: `hist-${Date.now()}`,
      studentName: selectedRequest.studentName,
      studentId: selectedRequest.studentId,
      currentCurriculum: selectedRequest.currentCurriculum,
      requestedCurriculum: selectedRequest.requestedCurriculum,
      adviser: selectedRequest.adviser,
      decision: "Rejected",
      decisionDate: "Today",
      decisionReason: decisionReason.trim(),
    }

    setPendingRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id))
    setDecisionHistory((prev) => [rejectedItem, ...prev])
    setSelectedRequest(null)
    showToast(`Request for ${rejectedItem.studentName} rejected. (Preview only)`)
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Curriculum transfers"
        subtitle="Review adviser-endorsed requests to move students to another curriculum."
      />

      <StatGrid
        items={[
          {
            label: "Pending review",
            value: pendingRequests.length,
            note: "Requests endorsed by advisers",
          },
          {
            label: "Approved this semester",
            value: 12 + decisionHistory.filter((h) => h.decision === "Approved").length - 1,
            note: "AY 2025–2026 · 1st semester",
          },
          {
            label: "Rejected this semester",
            value: 2 + decisionHistory.filter((h) => h.decision === "Rejected").length - 1,
            note: "Decisions include a reason",
          },
        ]}
      />

      <Tabs defaultValue="pending" className="w-full">
        <TabsList variant="line" className="mb-6 border-b border-line w-full justify-start gap-8">
          <TabsTrigger value="pending" className="text-sm pb-3">
            Pending review ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-sm pb-3">
            Decision history ({decisionHistory.length + 12})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
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
                  <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase text-right">Actions</TableHead>
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
                        variant="ghost"
                        size="sm"
                        className="text-primary font-semibold hover:text-primary hover:bg-secondary cursor-pointer"
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
              <span>{pendingRequests.length} requests awaiting a decision</span>
              <span>DCST department scope</span>
            </div>
          </Panel>

          <Alert className="bg-[#FCF4E0] border-[#EBDCAE] text-[#7A5406]">
            <AlertDescription className="text-xs md:text-sm">
              Requests originate from the student's adviser. Approved transfers use the equivalencies defined for the curriculum pair.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="history">
          <Panel
            title="Transfer decision history"
            description="A sample of the 14 decisions recorded this semester."
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
              <span>{decisionHistory.length} sample decisions of 14</span>
              <span>DCST department scope</span>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>

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

              {/* Route transition display */}
              <div className="flex items-center justify-between rounded-sm border border-line bg-secondary/50 p-4">
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

              <div className="space-y-2 pt-1">
                <Label htmlFor="decision-reason" className="text-xs font-semibold text-muted-2 uppercase tracking-wider">
                  Decision reason {rejectionError && <span className="text-destructive font-normal">(Required to reject)</span>}
                </Label>
                <Textarea
                  id="decision-reason"
                  placeholder="Enter a reason for this decision"
                  value={decisionReason}
                  onChange={(e) => {
                    setDecisionReason(e.target.value)
                    if (rejectionError && e.target.value.trim()) setRejectionError(false)
                  }}
                  className={rejectionError ? "border-destructive focus-visible:ring-destructive" : ""}
                />
              </div>
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

      {/* Floating feedback toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-sidebar-primary px-4 py-3 text-sm font-medium text-sidebar-primary-foreground shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      <SampleFooter>
        Sample records for presentation · Reference date: 15 August 2025 · Static design
      </SampleFooter>
    </div>
  )
}
