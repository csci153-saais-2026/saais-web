import * as React from "react"
import { PageHeading } from "@/components/features/page-heading"
import { StatGrid } from "@/components/features/stat-tile"
import { Panel } from "@/components/features/panel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DownloadIcon, PlusIcon } from "@/components/icons"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SampleFooter } from "@/components/features/sample-footer"
import { MOCK_ACADEMIC_TERMS, type AcademicTermRecord } from "@/routes/department-head/mock-data"

export default function AcademicTermsPage() {
  const [terms, setTerms] = React.useState<AcademicTermRecord[]>(MOCK_ACADEMIC_TERMS)
  const [isAddTermOpen, setIsAddTermOpen] = React.useState(false)
  const [termToClose, setTermToClose] = React.useState<AcademicTermRecord | null>(null)
  const [termToView, setTermToView] = React.useState<AcademicTermRecord | null>(null)
  const [closureNote, setClosureNote] = React.useState("")
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  // Add term form states
  const [newAY, setNewAY] = React.useState("2025–2026")
  const [newSem, setNewSem] = React.useState("2nd semester")
  const [newStartDate, setNewStartDate] = React.useState("2026-01-12")
  const [newEndDate, setNewEndDate] = React.useState("2026-05-29")
  const [newDeadline, setNewDeadline] = React.useState("2026-06-12")
  const [newStatus, setNewStatus] = React.useState<"Open" | "Closed">("Closed")

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 4500)
  }

  const handleExportPdf = () => {
    showToast("Generating Academic Terms PDF summary... (Preview download triggered)")
    window.print()
  }

  const handleCreateTerm = () => {
    const formattedDates = `${newStartDate} – ${newEndDate}`
    const created: AcademicTermRecord = {
      id: `term-${Date.now()}`,
      academicYear: newAY.trim() || "2025–2026",
      semester: newSem,
      termDates: formattedDates,
      encodingDeadline: newDeadline,
      status: newStatus,
      closedBy: newStatus === "Closed" ? "Dr. Andrea Dela Cruz" : undefined,
    }

    setTerms((prev) => [created, ...prev])
    setIsAddTermOpen(false)
    showToast(`Added academic term ${created.academicYear} ${created.semester}. (Preview only)`)
  }

  const handleCloseEncoding = () => {
    if (!termToClose) return
    setTerms((prev) =>
      prev.map((t) =>
        t.id === termToClose.id
          ? { ...t, status: "Closed", closedBy: "Dr. Andrea Dela Cruz" }
          : t
      )
    )
    const closedName = `${termToClose.academicYear} · ${termToClose.semester}`
    setTermToClose(null)
    setClosureNote("")
    showToast(`Encoding closed for ${closedName}. Administrator notified. (Preview only)`)
  }

  const activeTerm = terms.find((t) => t.status === "Open")

  return (
    <div className="space-y-6">
      <PageHeading
        title="Academic terms"
        subtitle="Review semester dates and manage the grade encoding period."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleExportPdf} className="gap-2 cursor-pointer">
              <DownloadIcon className="size-4" />
              Export PDF
            </Button>
            <Button onClick={() => setIsAddTermOpen(true)} className="gap-2 cursor-pointer">
              <PlusIcon className="size-4" />
              Add a term
            </Button>
          </div>
        }
      />

      <StatGrid
        items={[
          {
            label: "Active term",
            value: activeTerm ? `${activeTerm.academicYear}` : "None",
            note: activeTerm ? activeTerm.semester : "No term currently in session",
          },
          {
            label: "Grade encoding",
            value: activeTerm ? "Open" : "Closed",
            note: activeTerm ? `Deadline: ${activeTerm.encodingDeadline}` : "All terms closed",
          },
          {
            label: "Encoding window",
            value: "Standard",
            note: "Managed under DCST department scope",
          },
        ]}
      />

      <Alert className="bg-notice-advisory-bg border-notice-advisory-border text-notice-advisory">
        <AlertDescription className="text-xs md:text-sm">
          Closing encoding prevents further grade entry for the term. A backup reminder is sent to the administrator; the Department Head can record a completed backup in Settings.
        </AlertDescription>
      </Alert>

      <Panel
        title="Academic term history"
        description="Encoding windows are tracked separately for each semester."
        flush
      >
        <Table responsive>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Academic year</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Semester</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Term dates</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Encoding deadline</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Status</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terms.map((t) => (
              <TableRow key={t.id}>
                <TableCell label="Academic year" className="font-semibold text-foreground">
                  {t.academicYear}
                </TableCell>
                <TableCell label="Semester" className="text-muted-foreground">{t.semester}</TableCell>
                <TableCell label="Term dates" className="text-muted-foreground">{t.termDates}</TableCell>
                <TableCell label="Encoding deadline" className="font-mono text-xs text-muted-foreground">{t.encodingDeadline}</TableCell>
                <TableCell label="Status">
                  <StatusBadge status={t.status === "Open" ? "current" : "archived"}>
                    {t.status}
                  </StatusBadge>
                </TableCell>
                <TableCell label="Actions" className="text-right">
                  {t.status === "Open" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTermToClose(t)}
                      className="cursor-pointer text-xs"
                    >
                      Close encoding
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTermToView(t)}
                      className="cursor-pointer text-xs text-primary font-medium hover:bg-secondary"
                    >
                      View term
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex justify-between items-center border-t border-line-soft px-5 py-3 text-xs text-muted-foreground">
          <span>{terms.length} academic terms</span>
          <span>DCST department scope</span>
        </div>
      </Panel>

      {/* Add Term Dialog */}
      <Dialog open={isAddTermOpen} onOpenChange={setIsAddTermOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add academic term</DialogTitle>
            <DialogDescription>
              Schedule a new academic semester and define its grade encoding deadline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="at-ay">Academic year</Label>
                <Input
                  id="at-ay"
                  value={newAY}
                  onChange={(e) => setNewAY(e.target.value)}
                  placeholder="2025–2026"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="at-sem">Semester</Label>
                <select
                  id="at-sem"
                  value={newSem}
                  onChange={(e) => setNewSem(e.target.value)}
                  className="w-full h-9 rounded-sm border border-line bg-background px-3 text-sm focus-visible:outline-primary"
                >
                  <option>1st semester</option>
                  <option>2nd semester</option>
                  <option>Midyear</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="at-start">Start date</Label>
                <Input
                  id="at-start"
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="at-end">Actual end date</Label>
                <Input
                  id="at-end"
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="at-deadline">Encoding deadline</Label>
                <Input
                  id="at-deadline"
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="at-status">Encoding status</Label>
                <select
                  id="at-status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as "Open" | "Closed")}
                  className="w-full h-9 rounded-sm border border-line bg-background px-3 text-sm focus-visible:outline-primary"
                >
                  <option>Closed</option>
                  <option>Open</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTermOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTerm}>Add term</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Encoding Dialog */}
      <Dialog open={!!termToClose} onOpenChange={(open) => !open && setTermToClose(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Close grade encoding</DialogTitle>
            <DialogDescription>
              Finalize grade submissions for this term.
            </DialogDescription>
          </DialogHeader>

          {termToClose && (
            <div className="space-y-4 py-2 text-sm">
              <p className="text-foreground">
                Close encoding for{" "}
                <strong>
                  {termToClose.academicYear} · {termToClose.semester}
                </strong>
                ?
              </p>

              <Alert className="bg-notice-advisory-bg border-notice-advisory-border text-notice-advisory">
                <AlertDescription className="text-xs">
                  New grade entries will be closed for this term. A backup reminder will be sent to the administrator.
                </AlertDescription>
              </Alert>

              <div className="space-y-1.5">
                <Label htmlFor="closure-note" className="text-xs font-semibold text-muted-2 uppercase tracking-wider">
                  Closure note
                </Label>
                <Textarea
                  id="closure-note"
                  placeholder="Enter a note or summary for closing this term"
                  value={closureNote}
                  onChange={(e) => setClosureNote(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTermToClose(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleCloseEncoding}>
              Close encoding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Term Details Dialog */}
      <Dialog open={!!termToView} onOpenChange={(open) => !open && setTermToView(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Academic term details</DialogTitle>
            <DialogDescription>Archived semester schedule and closure metadata.</DialogDescription>
          </DialogHeader>

          {termToView && (
            <div className="grid grid-cols-2 gap-4 py-3 text-sm">
              <div>
                <dt className="text-xs font-semibold text-muted-2 uppercase tracking-wider">Academic year</dt>
                <dd className="mt-1 font-medium text-foreground">{termToView.academicYear}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-2 uppercase tracking-wider">Semester</dt>
                <dd className="mt-1 font-medium text-foreground">{termToView.semester}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-2 uppercase tracking-wider">Term dates</dt>
                <dd className="mt-1 font-medium text-foreground">{termToView.termDates}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-2 uppercase tracking-wider">Encoding deadline</dt>
                <dd className="mt-1 font-medium text-foreground">{termToView.encodingDeadline}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-2 uppercase tracking-wider">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={termToView.status === "Open" ? "current" : "archived"}>
                    {termToView.status}
                  </StatusBadge>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-2 uppercase tracking-wider">Closed by</dt>
                <dd className="mt-1 font-medium text-foreground">{termToView.closedBy ?? "Dr. Andrea Dela Cruz"}</dd>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setTermToView(null)}>Close</Button>
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
