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
import {
  EQUIVALENCE_SOURCE_COURSES,
  EQUIVALENCE_TARGET_COURSES,
  MOCK_EQUIVALENCIES,
  type CourseEquivalence,
} from "@/routes/department-head/mock-data"

const FROM_CURRICULA = [
  { id: "bscs-2021", label: "BSCS 2021" },
  { id: "bsit-2021", label: "BSIT 2021" },
] as const
const TO_CURRICULA = [
  { id: "bscs-2024", label: "BSCS 2024" },
  { id: "bsit-2024", label: "BSIT 2024" },
] as const

export default function EquivalencePage() {
  const [equivalencies, setEquivalencies] = React.useState<CourseEquivalence[]>(MOCK_EQUIVALENCIES)
  const [fromCurriculumId, setFromCurriculumId] = React.useState<string>(FROM_CURRICULA[0].id)
  const [toCurriculumId, setToCurriculumId] = React.useState<string>(TO_CURRICULA[0].id)
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const { message: toastMessage, showToast } = useDepartmentToast()

  const [modalFromId, setModalFromId] = React.useState(fromCurriculumId)
  const [modalToId, setModalToId] = React.useState(toCurriculumId)
  const [sourceCourseId, setSourceCourseId] = React.useState(EQUIVALENCE_SOURCE_COURSES[0].id)
  const [targetCourseId, setTargetCourseId] = React.useState(EQUIVALENCE_TARGET_COURSES[0].id)
  const [formError, setFormError] = React.useState("")

  function openAddDialog() {
    setModalFromId(fromCurriculumId)
    setModalToId(toCurriculumId)
    setSourceCourseId(EQUIVALENCE_SOURCE_COURSES[0].id)
    setTargetCourseId(EQUIVALENCE_TARGET_COURSES[0].id)
    setFormError("")
    setIsAddModalOpen(true)
  }

  function handleAddEquivalence() {
    const sourceCourse = EQUIVALENCE_SOURCE_COURSES.find((course) => course.id === sourceCourseId)
    const targetCourse = EQUIVALENCE_TARGET_COURSES.find((course) => course.id === targetCourseId)
    if (!sourceCourse || !targetCourse) {
      setFormError("Select both courses before adding an equivalence.")
      return
    }

    const conflicts = equivalencies.some((equivalence) =>
      equivalence.fromCurriculumId === modalFromId &&
      equivalence.toCurriculumId === modalToId &&
      (equivalence.sourceCourse.id === sourceCourseId || equivalence.targetCourse.id === targetCourseId)
    )
    if (conflicts) {
      setFormError("A selected course is already mapped in this curriculum pair. Choose courses without an existing mapping in this pair.")
      return
    }

    const newEquiv: CourseEquivalence = {
      id: `${modalFromId}/${modalToId}/${sourceCourseId}/${targetCourseId}`,
      fromCurriculumId: modalFromId,
      toCurriculumId: modalToId,
      sourceCourse,
      targetCourse,
    }

    setEquivalencies((prev) => [newEquiv, ...prev])
    setFromCurriculumId(modalFromId)
    setToCurriculumId(modalToId)
    setIsAddModalOpen(false)
    showToast(`Added equivalence for ${sourceCourse.code} → ${targetCourse.code}.`)
  }

  const displayedEquivalencies = equivalencies.filter((eq) =>
    eq.fromCurriculumId === fromCurriculumId && eq.toCurriculumId === toCurriculumId
  )
  const fromLabel = FROM_CURRICULA.find((curriculum) => curriculum.id === fromCurriculumId)?.label
  const toLabel = TO_CURRICULA.find((curriculum) => curriculum.id === toCurriculumId)?.label

  return (
    <div className="space-y-6">
      <PageHeading
        title="Equivalence"
        subtitle="Define one-to-one course equivalencies between curriculum versions."
        actions={
          <Button onClick={openAddDialog} className="gap-2 cursor-pointer">
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
            <Select value={fromCurriculumId} onValueChange={setFromCurriculumId}>
              <SelectTrigger id="from-curr" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FROM_CURRICULA.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="To curriculum" htmlFor="to-curr" className="w-44">
            <Select value={toCurriculumId} onValueChange={setToCurriculumId}>
              <SelectTrigger id="to-curr" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TO_CURRICULA.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
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
                  <strong className="block font-semibold text-foreground">{eq.sourceCourse.code}</strong>
                  <small className="block text-xs text-muted-2">{eq.sourceCourse.title}</small>
                </TableCell>
                <TableCell label="Units" className="text-right font-mono font-medium">
                  {eq.sourceCourse.units}
                </TableCell>
                <TableCell label="Equivalent course subject">
                  <strong className="block font-semibold text-foreground">{eq.targetCourse.code}</strong>
                  <small className="block text-xs text-muted-2">{eq.targetCourse.title}</small>
                </TableCell>
                <TableCell label="Units" className="text-right font-mono font-medium">
                  {eq.targetCourse.units}
                </TableCell>
                <TableCell label="Curriculum pair" className="font-mono text-xs text-muted-foreground">
                  {fromLabel} → {toLabel}
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
                <Select value={modalFromId} onValueChange={(id) => { setModalFromId(id); setFormError("") }}>
                  <SelectTrigger id="m-from" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FROM_CURRICULA.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="To curriculum" htmlFor="m-to">
                <Select value={modalToId} onValueChange={(id) => { setModalToId(id); setFormError("") }}>
                  <SelectTrigger id="m-to" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TO_CURRICULA.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="Old course subject" htmlFor="m-old">
              <Select value={sourceCourseId} onValueChange={(id) => { setSourceCourseId(id); setFormError("") }}>
                <SelectTrigger id="m-old" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIVALENCE_SOURCE_COURSES.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} · {course.title} · {course.units} units
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Equivalent course subject" htmlFor="m-equiv">
              <Select value={targetCourseId} onValueChange={(id) => { setTargetCourseId(id); setFormError("") }}>
                <SelectTrigger id="m-equiv" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIVALENCE_TARGET_COURSES.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} · {course.title} · {course.units} units
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <p className="text-xs text-muted-2 leading-relaxed">
              One-to-one equivalence applies to this curriculum pair only. Units are counted once.
            </p>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
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
