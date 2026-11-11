import * as React from "react"
import { AlertIcon, PlusIcon } from "@/components/icons"
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
import { MOCK_EQUIVALENCIES, type CourseEquivalence } from "@/routes/department-head/mock-data"

const FROM_CURRICULA = ["BSCS 2021", "BSIT 2021"] as const
const TO_CURRICULA = ["BSCS 2024", "BSIT 2024"] as const
const OLD_COURSES = [
  "CS 101 · Fundamentals of Computing · 3 units",
  "CS 102 · Programming Fundamentals · 3 units",
  "CS 203 · Data Structures · 3 units",
  "CS 301 · Database Management Systems · 3 units",
] as const
const EQUIV_COURSES = [
  "CC 101 · Introduction to Computing · 3 units",
  "CC 102 · Computer Programming 1 · 3 units",
  "CC 104 · Data Structures and Algorithms · 3 units",
  "CC 105 · Information Management · 3 units",
] as const

function formatPair(from: string, to: string) {
  return `${from} → ${to.replace(/^[A-Z]+\s*/, "")}`
}

function parseUnits(label: string | undefined): number {
  const match = label?.match(/\d+/)
  return match ? Number(match[0]) : 3
}

export default function EquivalencePage() {
  const [equivalencies, setEquivalencies] = React.useState<CourseEquivalence[]>(MOCK_EQUIVALENCIES)
  const [fromCurriculum, setFromCurriculum] = React.useState("BSCS 2021")
  const [toCurriculum, setToCurriculum] = React.useState("BSCS 2024")
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const { message: toastMessage, showToast } = useDepartmentToast()

  // Add equivalence form state
  const [modalFrom, setModalFrom] = React.useState("BSCS 2021")
  const [modalTo, setModalTo] = React.useState("BSCS 2024")
  const [modalOldCourse, setModalOldCourse] = React.useState<string>(OLD_COURSES[0])
  const [modalEquivCourse, setModalEquivCourse] = React.useState<string>(EQUIV_COURSES[0])

  const handleAddEquivalence = () => {
    const oldParts = modalOldCourse.split("·").map((s) => s.trim())
    const equivParts = modalEquivCourse.split("·").map((s) => s.trim())

    const newEquiv: CourseEquivalence = {
      id: `eq-${Date.now()}`,
      oldCode: oldParts[0] ?? "CS 101",
      oldTitle: oldParts[1] ?? "Course",
      oldUnits: parseUnits(oldParts[2]),
      newCode: equivParts[0] ?? "CC 101",
      newTitle: equivParts[1] ?? "Course",
      newUnits: parseUnits(equivParts[2]),
      pair: formatPair(modalFrom, modalTo),
    }

    setEquivalencies((prev) => [newEquiv, ...prev])
    setFromCurriculum(modalFrom)
    setToCurriculum(modalTo)
    setIsAddModalOpen(false)
    showToast(`Added equivalence for ${newEquiv.oldCode} → ${newEquiv.newCode}.`)
  }

  const activePair = formatPair(fromCurriculum, toCurriculum)
  const displayedEquivalencies = equivalencies.filter((eq) => eq.pair === activePair)

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

      <Alert variant="advisory">
        <AlertIcon />
        <AlertDescription>
          Equivalencies apply to a curriculum pair, one course to one course. A credited course satisfies its mapped requirement; credit is counted once.
        </AlertDescription>
      </Alert>

      <Panel
        title="Curriculum equivalencies"
        description="Different codes and titles, the same credited requirement."
        flush
      >
        <div className="flex flex-wrap items-end gap-4 border-b border-line-soft bg-card px-5 py-3">
          <FormField label="From curriculum" htmlFor="from-curr" className="w-44">
            <Select value={fromCurriculum} onValueChange={setFromCurriculum}>
              <SelectTrigger id="from-curr" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FROM_CURRICULA.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="To curriculum" htmlFor="to-curr" className="w-44">
            <Select value={toCurriculum} onValueChange={setToCurriculum}>
              <SelectTrigger id="to-curr" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TO_CURRICULA.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <Table responsive>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Old course subject</TableHead>
              <TableHead className="w-20 text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase text-right">Units</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Equivalent course subject</TableHead>
              <TableHead className="w-20 text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase text-right">Units</TableHead>
              <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">Curriculum pair</TableHead>
              <TableHead className="w-28 text-right" aria-label="Status" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedEquivalencies.map((eq) => (
              <TableRow key={eq.id}>
                <TableCell label="Old course subject">
                  <strong className="block font-semibold text-foreground">{eq.oldCode}</strong>
                  <small className="block text-xs text-muted-2">{eq.oldTitle}</small>
                </TableCell>
                <TableCell label="Units" className="text-right font-mono font-medium">
                  {eq.oldUnits}
                </TableCell>
                <TableCell label="Equivalent course subject">
                  <strong className="block font-semibold text-foreground">{eq.newCode}</strong>
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
              <FormField label="From curriculum" htmlFor="m-from">
                <Select value={modalFrom} onValueChange={setModalFrom}>
                  <SelectTrigger id="m-from" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FROM_CURRICULA.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="To curriculum" htmlFor="m-to">
                <Select value={modalTo} onValueChange={setModalTo}>
                  <SelectTrigger id="m-to" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TO_CURRICULA.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="Old course subject" htmlFor="m-old">
              <Select value={modalOldCourse} onValueChange={setModalOldCourse}>
                <SelectTrigger id="m-old" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OLD_COURSES.map((course) => (
                    <SelectItem key={course} value={course}>
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Equivalent course subject" htmlFor="m-equiv">
              <Select value={modalEquivCourse} onValueChange={setModalEquivCourse}>
                <SelectTrigger id="m-equiv" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIV_COURSES.map((course) => (
                    <SelectItem key={course} value={course}>
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

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

      <DepartmentToast message={toastMessage} />

      <SampleFooter>
        Sample records for presentation · Reference date: 15 August 2025 · Static design
      </SampleFooter>
    </div>
  )
}
