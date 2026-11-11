import * as React from "react"
import { AlertIcon, DownloadIcon, PlusIcon } from "@/components/icons"
import { FormField } from "@/components/features/form-field"
import { PageHeading } from "@/components/features/page-heading"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { SampleFooter } from "@/components/features/sample-footer"
import { DepartmentToast } from "@/routes/department-head/dh-ui"
import {
  formatDisplayDate,
  formatTermDateRange,
  useDepartmentToast,
} from "@/routes/department-head/dh-utils"
import { MOCK_ACADEMIC_TERMS, type AcademicTermRecord } from "@/routes/department-head/mock-data"

const SEMESTER_OPTIONS = ["1st semester", "2nd semester", "Midyear"] as const

export default function AcademicTermsPage() {
  const [terms, setTerms] = React.useState<AcademicTermRecord[]>(MOCK_ACADEMIC_TERMS)
  const [isAddTermOpen, setIsAddTermOpen] = React.useState(false)
  const [termToClose, setTermToClose] = React.useState<AcademicTermRecord | null>(null)
  const [termToView, setTermToView] = React.useState<AcademicTermRecord | null>(null)
  const [closureNote, setClosureNote] = React.useState("")
  const { message: toastMessage, showToast } = useDepartmentToast()

  // Add term form states
  const [newAY, setNewAY] = React.useState("2025–2026")
  const [newSem, setNewSem] = React.useState<string>("2nd semester")
  const [newStartDate, setNewStartDate] = React.useState("2026-01-12")
  const [newEndDate, setNewEndDate] = React.useState("2026-05-29")
  const [newDeadline, setNewDeadline] = React.useState("2026-06-12")
  const [newStatus, setNewStatus] = React.useState<"Open" | "Closed">("Closed")

  const handleExportPdf = () => {
    showToast("Generating Academic Terms PDF summary...")
    try {
      if (typeof window !== "undefined" && typeof window.print === "function") {
        window.print()
      }
    } catch {
      // Ignore unimplemented print in headless test environments
    }
  }

  const handleCreateTerm = () => {
    const created: AcademicTermRecord = {
      id: `term-${Date.now()}`,
      academicYear: newAY.trim() || "2025–2026",
      semester: newSem,
      termDates: formatTermDateRange(newStartDate, newEndDate),
      encodingDeadline: formatDisplayDate(newDeadline),
      status: newStatus,
      closedBy: newStatus === "Closed" ? "Dr. Andrea Dela Cruz" : undefined,
      startDate: newStartDate,
      endDate: newEndDate,
    }

    setTerms((prev) => [created, ...prev])
    setIsAddTermOpen(false)
    showToast(`Added academic term ${created.academicYear} ${created.semester}.`)
  }

  const handleCloseEncoding = () => {
    if (!termToClose) return
    const trimmedNote = closureNote.trim()
    setTerms((prev) =>
      prev.map((t) =>
        t.id === termToClose.id
          ? {
              ...t,
              status: "Closed",
              closedBy: "Dr. Andrea Dela Cruz",
              closureNote: trimmedNote || undefined,
            }
          : t
      )
    )
    const closedName = `${termToClose.academicYear} · ${termToClose.semester}`
    setTermToClose(null)
    setClosureNote("")
    showToast(`Encoding closed for ${closedName}. Administrator notified.`)
  }

  const openCount = terms.filter((t) => t.status === "Open").length
  const closedCount = terms.length - openCount

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

      <Alert variant="advisory">
        <AlertIcon />
        <AlertDescription>
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
              <TableHead className="text-right" aria-label="Actions" />
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
                      variant="link"
                      size="sm"
                      onClick={() => setTermToView(t)}
                      className="h-auto px-0 py-1 font-semibold underline-offset-4 cursor-pointer"
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
          <span>
            {openCount} open {openCount === 1 ? "term" : "terms"} · {closedCount} closed{" "}
            {closedCount === 1 ? "term" : "terms"}
          </span>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Academic year" htmlFor="at-ay">
                <Input
                  id="at-ay"
                  value={newAY}
                  onChange={(e) => setNewAY(e.target.value)}
                  placeholder="2025–2026"
                />
              </FormField>

              <FormField label="Semester" htmlFor="at-sem">
                <Select value={newSem} onValueChange={setNewSem}>
                  <SelectTrigger id="at-sem" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTER_OPTIONS.map((sem) => (
                      <SelectItem key={sem} value={sem}>
                        {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Start date" htmlFor="at-start">
                <Input
                  id="at-start"
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                />
              </FormField>

              <FormField label="Actual end date" htmlFor="at-end">
                <Input
                  id="at-end"
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Encoding deadline" htmlFor="at-deadline">
                <Input
                  id="at-deadline"
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                />
              </FormField>

              <FormField label="Encoding status" htmlFor="at-status">
                <Select
                  value={newStatus}
                  onValueChange={(val) => setNewStatus(val as "Open" | "Closed")}
                >
                  <SelectTrigger id="at-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
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
      <Dialog
        open={!!termToClose}
        onOpenChange={(open) => {
          if (!open) {
            setTermToClose(null)
            setClosureNote("")
          }
        }}
      >
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

              <Alert variant="advisory">
                <AlertIcon />
                <AlertDescription className="text-xs">
                  New grade entries will be closed for this term. A backup reminder will be sent to the administrator.
                </AlertDescription>
              </Alert>

              <FormField label="Closure note" htmlFor="closure-note">
                <Textarea
                  id="closure-note"
                  placeholder="Enter a note or summary for closing this term"
                  value={closureNote}
                  onChange={(e) => setClosureNote(e.target.value)}
                />
              </FormField>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTermToClose(null)
                setClosureNote("")
              }}
            >
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
            <dl className="grid grid-cols-2 gap-4 py-3 text-sm">
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
              {termToView.closureNote && (
                <div className="col-span-2">
                  <dt className="text-xs font-semibold text-muted-2 uppercase tracking-wider">Closure note</dt>
                  <dd className="mt-1 font-medium text-foreground">{termToView.closureNote}</dd>
                </div>
              )}
            </dl>
          )}

          <DialogFooter>
            <Button onClick={() => setTermToView(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DepartmentToast message={toastMessage} />

      <SampleFooter>
        Sample records for presentation · Reference date: 15 August 2025 · Static design
      </SampleFooter>
    </div>
  )
}
