import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
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
import { QueryMessage } from "../shared/dh-ui"
import { useNotify } from "../shared/notify-context"
import {
  useCreditCourse, useOutsideCredits,
  type CreditStudentOption, type DestinationSlot, type NewOutsideCredit, type OutsideCreditRecord,
} from "./outside-credits-api"

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
  students,
  slots,
  onCredit,
  onClose,
}: {
  credits: OutsideCreditRecord[]
  students: CreditStudentOption[]
  slots: DestinationSlot[]
  onCredit: (credit: NewOutsideCredit) => Promise<void>
  onClose: () => void
}) {
  const { control, formState: { errors }, handleSubmit, register, setError, setValue } = useForm<CreditForm>({
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

  const selectedStudentId = useWatch({ control, name: "studentId" })
  const selectedStudent = students.find((option) => option.id === selectedStudentId)
  const availableSlots = slots.filter((slot) => slot.curriculumId === selectedStudent?.curriculumId)

  async function creditCourse(values: CreditForm) {
    const student = students.find((option) => option.id === values.studentId)
    const slot = slots.find((option) => option.id === values.destinationCode && option.curriculumId === student?.curriculumId)
    if (!student) setError("studentId", { message: "Choose a student." }, { shouldFocus: true })
    if (!slot) setError("destinationCode", { message: "Choose a destination curriculum slot." }, { shouldFocus: Boolean(student) })
    if (!student || !slot) return

    const studentCredits = credits.filter((credit) => credit.studentUuid === student.id)
    if (studentCredits.some((credit) =>
      normalizeSource(credit.originSchool) === normalizeSource(values.originSchool) &&
      normalizeSource(credit.originalCode) === normalizeSource(values.originalCode)
    )) {
      setError("originalCode", { message: "This student already has credit for this course from this origin." }, { shouldFocus: true })
      return
    }
    if (studentCredits.some((credit) =>
      credit.slotId === slot.id
    )) {
      setError("destinationCode", { message: "This slot already has an outside credit." }, { shouldFocus: true })
      return
    }

    try {
      await onCredit({
        studentId: student.id,
        entryType: values.entryType,
        originalCode: values.originalCode,
        originalTitle: values.originalTitle,
        originalUnits: Number(values.originalUnits),
        originSchool: values.originSchool,
        grade: values.grade,
        slotId: slot.id,
        reason: values.reason,
      })
    } catch (failure) {
      setError("reason", { message: failure instanceof Error ? failure.message : "The credit could not be saved." })
    }
  }

  return (
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Credit an outside course</DialogTitle>
        <DialogDescription>
          Credit a course from another school or degree program.
        </DialogDescription>
      </DialogHeader>

      <form noValidate className="space-y-4" onSubmit={handleSubmit(creditCourse)}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Student" htmlFor="cr-student" error={errors.studentId?.message}>
            <Controller name="studentId" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={(value) => { field.onChange(value); setValue("destinationCode", "") }}>
                <SelectTrigger id="cr-student" className="w-full" aria-invalid={Boolean(errors.studentId)} ref={field.ref} onBlur={field.onBlur}>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} · {student.studentNumber}
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
                {availableSlots.map((slot) => (
                  <SelectItem key={slot.id} value={slot.id}>
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
  const query = useOutsideCredits()
  const creditCourse = useCreditCourse()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const showToast = useNotify()
  const credits = query.data?.records ?? []

  async function addCredit(credit: NewOutsideCredit) {
    const student = query.data?.students.find((item) => item.id === credit.studentId)
    await creditCourse.mutateAsync(credit)
    setIsAddOpen(false)
    showToast(`Credited ${credit.originalCode} for ${student?.name ?? "the student"}.`)
  }

  const totalCreditedSubjects = credits.length
  const studentCount = new Set(credits.map((credit) => credit.studentUuid)).size
  const transferees = new Set(credits.filter((credit) => credit.entryType === "Transferee").map((credit) => credit.studentUuid)).size
  const shiftees = new Set(credits.filter((credit) => credit.entryType === "Shiftee").map((credit) => credit.studentUuid)).size
  const curriculumCount = new Set(credits.map((credit) => credit.targetCurriculum)).size
  const recognizedUnits = credits.reduce((sum, credit) => sum + credit.unitsCredited, 0)

  if (!query.data) {
    return (
      <div className="space-y-6">
        <PageHeading title="Outside credits" subtitle="Review credited subjects for shiftees and transferees in your department." />
        <QueryMessage query={query} label="outside credits" />
      </div>
    )
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
        className="lg:grid-cols-3"
        items={[
          {
            label: "Credited subjects",
            value: totalCreditedSubjects,
            note: "Active outside credits",
          },
          {
            label: "Students with outside credits",
            value: studentCount,
            note: `${transferees} transferee${transferees === 1 ? "" : "s"} · ${shiftees} shiftee${shiftees === 1 ? "" : "s"}`,
          },
          {
            label: "Units recognized",
            value: recognizedUnits,
            note: `Across ${curriculumCount} curricul${curriculumCount === 1 ? "um" : "a"}`,
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
            {credits.length} credited {credits.length === 1 ? "subject" : "subjects"}
          </span>
          <span>DCST department scope</span>
        </div>
      </Panel>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        {isAddOpen && <CreditCourseDialog credits={credits} students={query.data.students} slots={query.data.slots} onCredit={addCredit} onClose={() => setIsAddOpen(false)} />}
      </Dialog>

    </div>
  )
}
