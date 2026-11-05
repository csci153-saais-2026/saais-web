import * as React from "react"
import { PageHeading } from "@/components/features/page-heading"
import { StatGrid } from "@/components/features/stat-tile"
import { Panel } from "@/components/features/panel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlusIcon } from "@/components/icons"
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
import { SampleFooter } from "@/components/features/sample-footer"
import { MOCK_OUTSIDE_CREDITS, type OutsideCreditRecord } from "@/routes/department-head/mock-data"

export default function OutsideCreditsPage() {
  const [credits, setCredits] = React.useState<OutsideCreditRecord[]>(MOCK_OUTSIDE_CREDITS)
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  // Form states
  const [selectedStudent, setSelectedStudent] = React.useState("Ana Marie Santos · 24-1-00124")
  const [entryType, setEntryType] = React.useState<"Transferee" | "Shiftee">("Transferee")
  const [origCode, setOrigCode] = React.useState("CS 101")
  const [origTitle, setOrigTitle] = React.useState("Computing Fundamentals")
  const [origUnits, setOrigUnits] = React.useState("3")
  const [grade, setGrade] = React.useState("1.50")
  const [schoolOrigin, setSchoolOrigin] = React.useState("Northern State College")
  const [equivSubject, setEquivSubject] = React.useState("CC 101 · Introduction to Computing · 3 units")

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 4500)
  }

  const handleAddCredit = () => {
    const studentParts = selectedStudent.split("·").map((s) => s.trim())
    const equivParts = equivSubject.split("·").map((s) => s.trim())

    const newRecord: OutsideCreditRecord = {
      id: `cred-${Date.now()}`,
      studentName: studentParts[0] ?? "Student",
      studentId: studentParts[1] ?? "24-1-00000",
      originalCode: origCode.trim() || "CS 101",
      originalTitle: origTitle.trim() || "Course",
      originalUnits: Number(origUnits) || 3,
      originSchool: schoolOrigin.trim() || "External Institution",
      grade: grade.trim() || "1.50",
      equivalentCode: equivParts[0] ?? "CC 101",
      equivalentTitle: equivParts[1] ?? "Course",
      equivalentUnits: 3,
      targetCurriculum: "BSCS 2024",
      entryType,
    }

    setCredits((prev) => [newRecord, ...prev])
    setIsAddOpen(false)
    showToast(`Credited ${newRecord.originalCode} for ${newRecord.studentName}. (Preview only)`)
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Outside credits"
        subtitle="Review credited subjects for shiftees and transferees in your department."
        actions={
          <Button onClick={() => setIsAddOpen(true)} className="gap-2 cursor-pointer">
            <PlusIcon className="size-4" />
            Credit a course
          </Button>
        }
      />

      <StatGrid
        items={[
          {
            label: "Credited subjects",
            value: 28 + (credits.length - MOCK_OUTSIDE_CREDITS.length),
            note: "AY 2025–2026 · 1st semester",
          },
          {
            label: "Students with outside credits",
            value: 9,
            note: "6 transferees · 3 shiftees",
          },
          {
            label: "Units recognized",
            value: 84 + (credits.length - MOCK_OUTSIDE_CREDITS.length) * 3,
            note: "Across BSCS and BSIT curricula",
          },
        ]}
      />

      <Panel
        title="Outside credit records"
        description="Recognized subjects from another school or degree program."
        flush
      >
        <Table responsive>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Student</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Original course / units</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">School / origin</TableHead>
              <TableHead className="w-20 text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase text-right">Grade</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Equivalent subject / units</TableHead>
              <TableHead className="w-28 text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase text-right">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {credits.map((c) => (
              <TableRow key={c.id}>
                <TableCell label="Student">
                  <strong className="block font-semibold text-foreground">{c.studentName}</strong>
                  <small className="block font-mono text-xs text-muted-2">{c.studentId}</small>
                </TableCell>
                <TableCell label="Original course / units">
                  <strong className="block font-mono text-xs text-foreground">
                    {c.originalCode} · {c.originalTitle}
                  </strong>
                  <small className="block text-xs text-muted-2">{c.originalUnits} units</small>
                </TableCell>
                <TableCell label="School / origin" className="text-muted-foreground text-xs">{c.originSchool}</TableCell>
                <TableCell label="Grade" className="text-right font-mono font-medium">
                  {c.grade}
                </TableCell>
                <TableCell label="Equivalent subject / units">
                  <strong className="block font-mono text-xs text-foreground">
                    {c.equivalentCode} · {c.equivalentTitle}
                  </strong>
                  <small className="block text-xs text-muted-2">
                    {c.equivalentUnits} units · {c.targetCurriculum}
                  </small>
                </TableCell>
                <TableCell label="Type" className="text-right">
                  <Badge variant={c.entryType === "Transferee" ? "secondary" : "outline"}>
                    {c.entryType}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex justify-between items-center border-t border-line-soft px-5 py-3 text-xs text-muted-foreground">
          <span>{credits.length} sample outside credit records</span>
          <span>DCST department scope</span>
        </div>
      </Panel>

      {/* Credit Course Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Credit an outside course</DialogTitle>
            <DialogDescription>
              Recognize course credits taken from an accredited external college or prior program.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cr-student">Student</Label>
                <select
                  id="cr-student"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full h-9 rounded-sm border border-line bg-background px-3 text-xs focus-visible:outline-primary"
                >
                  <option>Ana Marie Santos · 24-1-00124</option>
                  <option>Sofia Isabel Garcia · 24-1-00316</option>
                  <option>Isabella Ramos · 25-1-00087</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cr-entry">Entry type</Label>
                <select
                  id="cr-entry"
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value as "Transferee" | "Shiftee")}
                  className="w-full h-9 rounded-sm border border-line bg-background px-3 text-xs focus-visible:outline-primary"
                >
                  <option>Transferee</option>
                  <option>Shiftee</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cr-code">Original course code</Label>
                <Input
                  id="cr-code"
                  value={origCode}
                  onChange={(e) => setOrigCode(e.target.value)}
                  placeholder="e.g. CS 101"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cr-title">Original course name</Label>
                <Input
                  id="cr-title"
                  value={origTitle}
                  onChange={(e) => setOrigTitle(e.target.value)}
                  placeholder="e.g. Computing Fundamentals"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cr-units">Units</Label>
                <Input
                  id="cr-units"
                  type="number"
                  min="1"
                  max="12"
                  value={origUnits}
                  onChange={(e) => setOrigUnits(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cr-grade">Grade</Label>
                <Input
                  id="cr-grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. 1.50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cr-school">School / degree of origin</Label>
              <Input
                id="cr-school"
                value={schoolOrigin}
                onChange={(e) => setSchoolOrigin(e.target.value)}
                placeholder="e.g. Northern State College"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cr-equiv">Equivalent course subject</Label>
              <select
                id="cr-equiv"
                value={equivSubject}
                onChange={(e) => setEquivSubject(e.target.value)}
                className="w-full h-9 rounded-sm border border-line bg-background px-3 text-xs focus-visible:outline-primary"
              >
                <option>CC 101 · Introduction to Computing · 3 units</option>
                <option>CC 102 · Computer Programming 1 · 3 units</option>
                <option>CC 104 · Data Structures and Algorithms · 3 units</option>
                <option>GE 1 · Purposive Communication · 3 units</option>
                <option>GE 4 · Mathematics in the Modern World · 3 units</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCredit}>Credit course</Button>
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
