import { useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { Textarea } from "@/components/ui/textarea"
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
import { MOCK_OUTSIDE_CREDITS, MOCK_STUDENTS, type OutsideCreditRecord } from "@/routes/department-head/mock-data"

const STUDENT_OPTIONS = MOCK_STUDENTS.filter((student) =>
  ["24-1-00124", "24-1-00316", "25-1-00087"].includes(student.id)
)

const DESTINATION_SLOTS = [
  { code: "CC 101", title: "Introduction to Computing", units: 3 },
  { code: "CC 102", title: "Computer Programming 1", units: 3 },
  { code: "CC 104", title: "Data Structures and Algorithms", units: 3 },
  { code: "GE 1", title: "Purposive Communication", units: 3 },
  { code: "GE 4", title: "Mathematics in the Modern World", units: 3 },
]

type PreviewOutsideCredit = OutsideCreditRecord & { reason?: string }

const outsideCreditSchema = z.object({
  studentId: z.string().min(1, "Choose a student."),
  entryType: z.enum(["Transferee", "Shiftee"]),
  originalCode: z.string().trim().min(1, "Enter the original course code.").max(100, "Use at most 100 characters."),
  originalTitle: z.string().trim().min(1, "Enter the original course name.").max(250, "Use at most 250 characters."),
  originalUnits: z.string().trim().refine((value) => {
    const units = Number(value)
    return Number.isFinite(units) && units > 0 && Number.isInteger(units * 4)
  }, "Enter positive units in increments of 0.25."),
  grade: z.string().trim().regex(/^(?:[12]\.\d{2}|3\.00)$/, "Enter a passing grade from 1.00 to 3.00 with two decimal places."),
  originSchool: z.string().trim().min(1, "Enter the school or degree of origin.").max(250, "Use at most 250 characters."),
  destinationCode: z.string().min(1, "Choose a destination curriculum slot."),
  reason: z.string().trim().min(1, "Enter the reason for crediting the course.").max(2000, "Use at most 2,000 characters."),
})

type CreditForm = z.infer<typeof outsideCreditSchema>

function normalizeSource(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

function CreditCourseDialog({
  credits,
  onCredit,
  onClose,
}: {
  credits: PreviewOutsideCredit[]
  onCredit: (credit: Omit<PreviewOutsideCredit, "id">) => void
  onClose: () => void
}) {
  const { control, formState: { errors }, handleSubmit, register, setError } = useForm<CreditForm>({
    resolver: zodResolver(outsideCreditSchema),
    defaultValues: {
      studentId: "",
      entryType: "Transferee",
      originalCode: "",
      originalTitle: "",
      originalUnits: "",
      grade: "",
      originSchool: "",
      destinationCode: "",
      reason: "",
    },
  })

  function creditCourse(values: CreditForm) {
    const student = STUDENT_OPTIONS.find((option) => option.id === values.studentId)
    const slot = DESTINATION_SLOTS.find((option) => option.code === values.destinationCode)
    if (!student) setError("studentId", { message: "Choose a student." }, { shouldFocus: true })
    if (!slot) setError("destinationCode", { message: "Choose a destination curriculum slot." }, { shouldFocus: Boolean(student) })
    if (!student || !slot) return

    const studentCredits = credits.filter((credit) => credit.studentId === student.id)
    if (studentCredits.some((credit) =>
      normalizeSource(credit.originSchool) === normalizeSource(values.originSchool) &&
      normalizeSource(credit.originalCode) === normalizeSource(values.originalCode)
    )) {
      setError("originalCode", { message: "This student already has credit for this course from this origin." }, { shouldFocus: true })
      return
    }
    if (studentCredits.some((credit) =>
      credit.targetCurriculum === student.curriculum && credit.equivalentCode === slot.code
    )) {
      setError("destinationCode", { message: "This slot already has an outside credit." }, { shouldFocus: true })
      return
    }

    onCredit({
      studentName: student.name,
      studentId: student.id,
      originalCode: values.originalCode,
      originalTitle: values.originalTitle,
      originalUnits: Number(values.originalUnits),
      originSchool: values.originSchool,
      grade: values.grade,
      equivalentCode: slot.code,
      equivalentTitle: slot.title,
      equivalentUnits: slot.units,
      targetCurriculum: student.curriculum,
      entryType: values.entryType,
      reason: values.reason,
    })
  }

  return (
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Credit an outside course</DialogTitle>
        <DialogDescription>
          Preview a credit for a course from another school or degree program using sample records.
        </DialogDescription>
      </DialogHeader>

      <form noValidate className="space-y-4" onSubmit={handleSubmit(creditCourse)}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Student" htmlFor="cr-student" error={errors.studentId?.message}>
            <Controller name="studentId" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="cr-student" className="w-full" aria-invalid={Boolean(errors.studentId)} ref={field.ref} onBlur={field.onBlur}>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {STUDENT_OPTIONS.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} · {student.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </FormField>

          <FormField label="Entry type" htmlFor="cr-entry">
            <Controller name="entryType" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="cr-entry" className="w-full" ref={field.ref} onBlur={field.onBlur}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transferee">Transferee</SelectItem>
                  <SelectItem value="Shiftee">Shiftee</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Original course code" htmlFor="cr-code" error={errors.originalCode?.message}>
            <Input id="cr-code" placeholder="e.g. CS 101" aria-invalid={Boolean(errors.originalCode)} {...register("originalCode")} />
          </FormField>
          <FormField label="Original course name" htmlFor="cr-title" error={errors.originalTitle?.message}>
            <Input id="cr-title" placeholder="e.g. Computing Fundamentals" aria-invalid={Boolean(errors.originalTitle)} {...register("originalTitle")} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Units" htmlFor="cr-units" error={errors.originalUnits?.message}>
            <Input id="cr-units" type="number" min="0.25" step="0.25" aria-invalid={Boolean(errors.originalUnits)} {...register("originalUnits")} />
          </FormField>
          <FormField label="Grade" htmlFor="cr-grade" error={errors.grade?.message}>
            <Input id="cr-grade" inputMode="decimal" placeholder="e.g. 1.50" aria-invalid={Boolean(errors.grade)} {...register("grade")} />
          </FormField>
        </div>

        <FormField label="School / degree of origin" htmlFor="cr-school" error={errors.originSchool?.message}>
          <Input id="cr-school" placeholder="e.g. Northern State College" aria-invalid={Boolean(errors.originSchool)} {...register("originSchool")} />
        </FormField>

        <FormField label="Destination curriculum slot" htmlFor="cr-equiv" error={errors.destinationCode?.message}>
          <Controller name="destinationCode" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="cr-equiv" className="w-full" aria-invalid={Boolean(errors.destinationCode)} ref={field.ref} onBlur={field.onBlur}>
                <SelectValue placeholder="Choose a destination slot" />
              </SelectTrigger>
              <SelectContent>
                {DESTINATION_SLOTS.map((slot) => (
                  <SelectItem key={slot.code} value={slot.code}>
                    {slot.code} · {slot.title} · {slot.units} units
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        </FormField>

        <FormField label="Reason" htmlFor="cr-reason" error={errors.reason?.message}>
          <Textarea id="cr-reason" rows={2} aria-invalid={Boolean(errors.reason)} {...register("reason")} />
        </FormField>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">Credit course</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

export default function OutsideCreditsPage() {
  const [credits, setCredits] = useState<PreviewOutsideCredit[]>(MOCK_OUTSIDE_CREDITS)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const nextCreditId = useRef(0)
  const { message: toastMessage, showToast } = useDepartmentToast()

  function addCredit(credit: Omit<PreviewOutsideCredit, "id">) {
    const newRecord = { id: `preview-credit-${++nextCreditId.current}`, ...credit }
    setCredits((prev) => [newRecord, ...prev])
    setIsAddOpen(false)
    showToast(`Credited ${credit.originalCode} for ${credit.studentName} in this preview.`)
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
                <TableCell label="School / origin" className="text-muted-foreground text-xs">
                  {c.originSchool}
                  {c.reason && <p className="mt-1 break-words">Reason: {c.reason}</p>}
                </TableCell>
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

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        {isAddOpen && <CreditCourseDialog credits={credits} onCredit={addCredit} onClose={() => setIsAddOpen(false)} />}
      </Dialog>

      <DepartmentToast message={toastMessage} />

      <SampleFooter>
        Sample records for presentation · Reference date: 15 August 2025 · Static design
      </SampleFooter>
    </div>
  )
}
