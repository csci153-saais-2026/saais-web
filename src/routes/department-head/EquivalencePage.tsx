import * as React from "react"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "@/components/icons"
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
import { SampleFooter } from "@/components/features/sample-footer"
import { MOCK_EQUIVALENCIES, type CourseEquivalence } from "@/routes/department-head/mock-data"

export default function EquivalencePage() {
  const [equivalencies, setEquivalencies] = React.useState<CourseEquivalence[]>(MOCK_EQUIVALENCIES)
  const [fromCurriculum, setFromCurriculum] = React.useState("BSCS 2021")
  const [toCurriculum, setToCurriculum] = React.useState("BSCS 2024")
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  // Add equivalence form state
  const [modalFrom, setModalFrom] = React.useState("BSCS 2021")
  const [modalTo, setModalTo] = React.useState("BSCS 2024")
  const [modalOldCourse, setModalOldCourse] = React.useState("CS 101 · Fundamentals of Computing · 3 units")
  const [modalEquivCourse, setModalEquivCourse] = React.useState("CC 101 · Introduction to Computing · 3 units")

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 4500)
  }

  const handleAddEquivalence = () => {
    const oldParts = modalOldCourse.split("·").map((s) => s.trim())
    const equivParts = modalEquivCourse.split("·").map((s) => s.trim())

    const newEquiv: CourseEquivalence = {
      id: `eq-${Date.now()}`,
      oldCode: oldParts[0] ?? "CS 101",
      oldTitle: oldParts[1] ?? "Course",
      oldUnits: 3,
      newCode: equivParts[0] ?? "CC 101",
      newTitle: equivParts[1] ?? "Course",
      newUnits: 3,
      pair: `${modalFrom} → ${modalTo.replace(/^[A-Z]+\s*/, "")}`,
    }

    setEquivalencies((prev) => [newEquiv, ...prev])
    setIsAddModalOpen(false)
    showToast(`Added equivalence for ${newEquiv.oldCode} ➔ ${newEquiv.newCode}. (Preview only)`)
  }

  // Filter based on selected curriculum pair
  const isPopulatedPair = fromCurriculum === "BSCS 2021" && toCurriculum === "BSCS 2024"
  const displayedEquivalencies = isPopulatedPair ? equivalencies : []

  return (
    <div className="space-y-6">
      <PageHeading
        title="Equivalence"
        subtitle="Define one-to-one course equivalencies between curriculum versions."
        actions={
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 cursor-pointer">
            <PlusIcon className="size-4" />
            Add course equivalence
          </Button>
        }
      />

      <Alert className="bg-notice-advisory-bg border-notice-advisory-border text-notice-advisory">
        <AlertDescription className="text-xs md:text-sm">
          Equivalencies apply to a curriculum pair, one course to one course. A credited course satisfies its mapped requirement; credit is counted once.
        </AlertDescription>
      </Alert>

      <Panel
        title="Curriculum equivalencies"
        description="Different codes and titles, the same credited requirement."
        flush
      >
        <div className="flex flex-wrap items-center gap-4 border-b border-line-soft bg-card px-5 py-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="from-curr" className="text-xs font-semibold uppercase tracking-wider text-muted-2">
              From curriculum:
            </Label>
            <select
              id="from-curr"
              value={fromCurriculum}
              onChange={(e) => setFromCurriculum(e.target.value)}
              className="h-8 rounded-sm border border-line bg-background px-2.5 text-xs text-foreground focus-visible:outline-primary"
            >
              <option>BSCS 2021</option>
              <option>BSIT 2021</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="to-curr" className="text-xs font-semibold uppercase tracking-wider text-muted-2">
              To curriculum:
            </Label>
            <select
              id="to-curr"
              value={toCurriculum}
              onChange={(e) => setToCurriculum(e.target.value)}
              className="h-8 rounded-sm border border-line bg-background px-2.5 text-xs text-foreground focus-visible:outline-primary"
            >
              <option>BSCS 2024</option>
              <option>BSIT 2024</option>
            </select>
          </div>
        </div>

        <Table responsive>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Old course subject</TableHead>
              <TableHead className="w-20 text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase text-right">Units</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Equivalent course subject</TableHead>
              <TableHead className="w-20 text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase text-right">Units</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Curriculum pair</TableHead>
              <TableHead className="w-28 text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedEquivalencies.map((eq) => (
              <TableRow key={eq.id}>
                <TableCell label="Old course subject">
                  <strong className="block font-mono text-sm text-foreground">{eq.oldCode}</strong>
                  <small className="block text-xs text-muted-2">{eq.oldTitle}</small>
                </TableCell>
                <TableCell label="Units" className="text-right font-mono font-medium">
                  {eq.oldUnits}
                </TableCell>
                <TableCell label="Equivalent course subject">
                  <strong className="block font-mono text-sm text-foreground">{eq.newCode}</strong>
                  <small className="block text-xs text-muted-2">{eq.newTitle}</small>
                </TableCell>
                <TableCell label="Units" className="text-right font-mono font-medium">
                  {eq.newUnits}
                </TableCell>
                <TableCell label="Curriculum pair" className="font-mono text-xs text-muted-foreground">
                  {eq.pair}
                </TableCell>
                <TableCell label="Status" className="text-right">
                  <StatusBadge status="passed">Equivalent</StatusBadge>
                </TableCell>
              </TableRow>
            ))}
            {displayedEquivalencies.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No equivalency sample for this pair. Select <strong>BSCS 2021</strong> and <strong>BSCS 2024</strong> to view the populated design.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex justify-between items-center border-t border-line-soft px-5 py-3 text-xs text-muted-foreground">
          <span>{displayedEquivalencies.length} course equivalencies</span>
          <span>DCST department scope</span>
        </div>
      </Panel>

      {/* Add Equivalence Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add course equivalence</DialogTitle>
            <DialogDescription>
              Establish a direct 1-to-1 credit mapping between courses across curriculum versions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-from">From curriculum</Label>
                <select
                  id="m-from"
                  value={modalFrom}
                  onChange={(e) => setModalFrom(e.target.value)}
                  className="w-full h-9 rounded-sm border border-line bg-background px-3 text-sm focus-visible:outline-primary"
                >
                  <option>BSCS 2021</option>
                  <option>BSIT 2021</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-to">To curriculum</Label>
                <select
                  id="m-to"
                  value={modalTo}
                  onChange={(e) => setModalTo(e.target.value)}
                  className="w-full h-9 rounded-sm border border-line bg-background px-3 text-sm focus-visible:outline-primary"
                >
                  <option>BSCS 2024</option>
                  <option>BSIT 2024</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-old">Old course subject</Label>
              <select
                id="m-old"
                value={modalOldCourse}
                onChange={(e) => setModalOldCourse(e.target.value)}
                className="w-full h-9 rounded-sm border border-line bg-background px-3 text-sm focus-visible:outline-primary"
              >
                <option>CS 101 · Fundamentals of Computing · 3 units</option>
                <option>CS 102 · Programming Fundamentals · 3 units</option>
                <option>CS 203 · Data Structures · 3 units</option>
                <option>CS 301 · Database Management Systems · 3 units</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-equiv">Equivalent course subject</Label>
              <select
                id="m-equiv"
                value={modalEquivCourse}
                onChange={(e) => setModalEquivCourse(e.target.value)}
                className="w-full h-9 rounded-sm border border-line bg-background px-3 text-sm focus-visible:outline-primary"
              >
                <option>CC 101 · Introduction to Computing · 3 units</option>
                <option>CC 102 · Computer Programming 1 · 3 units</option>
                <option>CC 104 · Data Structures and Algorithms · 3 units</option>
                <option>CC 105 · Information Management · 3 units</option>
              </select>
            </div>

            <p className="text-xs text-muted-2 leading-relaxed">
              One-to-one equivalence applies to this curriculum pair only. Units are counted once.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEquivalence}>Add equivalence</Button>
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
