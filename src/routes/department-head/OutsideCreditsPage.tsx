import * as React from "react"
import { PlusIcon } from "@/components/icons"
import { FormField } from "@/components/features/form-field"
import { PageHeading } from "@/components/features/page-heading"
import { StatGrid } from "@/components/features/stat-tile"
import { Panel } from "@/components/features/panel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
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
import { SampleFooter } from "@/components/features/sample-footer"
import { DepartmentToast } from "@/routes/department-head/dh-ui"
import { useDepartmentToast } from "@/routes/department-head/dh-utils"
import { MOCK_OUTSIDE_CREDITS, type OutsideCreditRecord } from "@/routes/department-head/mock-data"

const STUDENT_OPTIONS = [
  "Ana Marie Santos · 24-1-00124",
  "Sofia Isabel Garcia · 24-1-00316",
  "Isabella Ramos · 25-1-00087",
] as const

const EQUIV_SUBJECT_OPTIONS = [
  "CC 101 · Introduction to Computing · 3 units",
  "CC 102 · Computer Programming 1 · 3 units",
  "CC 104 · Data Structures and Algorithms · 3 units",
  "GE 1 · Purposive Communication · 3 units",
  "GE 4 · Mathematics in the Modern World · 3 units",
] as const

function parseUnits(label: string | undefined): number {
  const match = label?.match(/\d+/)
  return match ? Number(match[0]) : 3
}

export default function OutsideCreditsPage() {
  const [credits, setCredits] = React.useState<OutsideCreditRecord[]>(MOCK_OUTSIDE_CREDITS)
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const { message: toastMessage, showToast } = useDepartmentToast()

  // Form states
  const [selectedStudent, setSelectedStudent] = React.useState<string>(STUDENT_OPTIONS[0])
  const [entryType, setEntryType] = React.useState<"Transferee" | "Shiftee">("Transferee")
  const [origCode, setOrigCode] = React.useState("CS 101")
  const [origTitle, setOrigTitle] = React.useState("Computing Fundamentals")
  const [origUnits, setOrigUnits] = React.useState("3")
  const [grade, setGrade] = React.useState("1.50")
  const [schoolOrigin, setSchoolOrigin] = React.useState("Northern State College")
  const [equivSubject, setEquivSubject] = React.useState<string>(EQUIV_SUBJECT_OPTIONS[0])

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
      equivalentUnits: parseUnits(equivParts[2]),
      targetCurriculum: "BSCS 2024",
      entryType,
    }

    setCredits((prev) => [newRecord, ...prev])
    setIsAddOpen(false)
    showToast(`Credited ${newRecord.originalCode} for ${newRecord.studentName}.`)
  }

  const addedCount = credits.length - MOCK_OUTSIDE_CREDITS.length
  const totalCreditedSubjects = 28 + addedCount
  const addedUnits = credits
    .slice(0, addedCount)
    .reduce((sum, r) => sum + r.equivalentUnits, 0)

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
        className="lg:grid-cols-3"
        items={[
          {
            label: "Credited subjects",
            value: totalCreditedSubjects,
            note: "AY 2025–2026 · 1st semester",
          },
          {
            label: "Students with outside credits",
            value: 9,
            note: "6 transferees · 3 shiftees",
          },
          {
            label: "Units recognized",
            value: 84 + addedUnits,
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
              <TableHead className="w-28 text-right" aria-label="Type" />
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
                  <strong className="block font-semibold text-foreground">
                    {c.originalCode} · {c.originalTitle}
                  </strong>
                  <small className="block text-xs text-muted-2">{c.originalUnits} units</small>
                </TableCell>
                <TableCell label="School / origin" className="text-muted-foreground text-xs">{c.originSchool}</TableCell>
                <TableCell label="Grade" className="text-right font-mono font-medium">
                  {c.grade}
                </TableCell>
                <TableCell label="Equivalent subject / units">
                  <strong className="block font-semibold text-foreground">
                    {c.equivalentCode} · {c.equivalentTitle}
                  </strong>
                  <small className="block text-xs text-muted-2">
                    {c.equivalentUnits} units · {c.targetCurriculum}
                  </small>
                </TableCell>
                <TableCell label="Type" className="text-right">
                  <StatusBadge status={c.entryType === "Transferee" ? "enrolled" : "not-taken"}>
                    {c.entryType}
                  </StatusBadge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex justify-between items-center border-t border-line-soft px-5 py-3 text-xs text-muted-foreground">
          <span>
            Showing {credits.length} sample records of {totalCreditedSubjects} credited subjects
          </span>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Student" htmlFor="cr-student">
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger id="cr-student" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDENT_OPTIONS.map((student) => (
                      <SelectItem key={student} value={student}>
                        {student}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Entry type" htmlFor="cr-entry">
                <Select
                  value={entryType}
                  onValueChange={(val) => setEntryType(val as "Transferee" | "Shiftee")}
                >
                  <SelectTrigger id="cr-entry" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Transferee">Transferee</SelectItem>
                    <SelectItem value="Shiftee">Shiftee</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Original course code" htmlFor="cr-code">
                <Input
                  id="cr-code"
                  value={origCode}
                  onChange={(e) => setOrigCode(e.target.value)}
                  placeholder="e.g. CS 101"
                />
              </FormField>

              <FormField label="Original course name" htmlFor="cr-title">
                <Input
                  id="cr-title"
                  value={origTitle}
                  onChange={(e) => setOrigTitle(e.target.value)}
                  placeholder="e.g. Computing Fundamentals"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Units" htmlFor="cr-units">
                <Input
                  id="cr-units"
                  type="number"
                  min="1"
                  max="12"
                  value={origUnits}
                  onChange={(e) => setOrigUnits(e.target.value)}
                />
              </FormField>

              <FormField label="Grade" htmlFor="cr-grade">
                <Input
                  id="cr-grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. 1.50"
                />
              </FormField>
            </div>

            <FormField label="School / degree of origin" htmlFor="cr-school">
              <Input
                id="cr-school"
                value={schoolOrigin}
                onChange={(e) => setSchoolOrigin(e.target.value)}
                placeholder="e.g. Northern State College"
              />
            </FormField>

            <FormField label="Equivalent course subject" htmlFor="cr-equiv">
              <Select value={equivSubject} onValueChange={setEquivSubject}>
                <SelectTrigger id="cr-equiv" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIV_SUBJECT_OPTIONS.map((subj) => (
                    <SelectItem key={subj} value={subj}>
                      {subj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCredit}>Credit course</Button>
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
