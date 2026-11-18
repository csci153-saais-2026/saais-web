import * as React from "react"
import { AlertIcon, PlusIcon } from "@/components/icons"
import { FormField } from "@/components/features/form-field"
import { PageHeading } from "@/components/features/page-heading"
import { DataTablePanel } from "@/components/features/data-table-panel"
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
import { QueryMessage } from "../shared/dh-ui"
import { useNotify } from "../shared/notify-context"
import { useAddEquivalence, useDeleteEquivalence, useEquivalenceData, type CourseEquivalence } from "./equivalence-api"

export default function EquivalencePage() {
  const query = useEquivalenceData()
  const addEquivalence = useAddEquivalence()
  const deletion = useDeleteEquivalence()
  const [deleteTarget, setDeleteTarget] = React.useState<CourseEquivalence | null>(null)
  const [deleteError, setDeleteError] = React.useState("")

  async function confirmDelete() {
    if (!deleteTarget || deletion.isPending) return
    setDeleteError("")
    try {
      await deletion.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      showToast("Course equivalence deleted.")
    } catch (failure) {
      setDeleteError(failure instanceof Error ? failure.message : "The equivalence could not be deleted.")
    }
  }
  const showToast = useNotify()
  const curricula = query.data?.curricula ?? []
  const courses = query.data?.courses ?? []
  const equivalencies = query.data?.equivalencies ?? []
  const [pickedFromId, setFromCurriculumId] = React.useState("")
  const [pickedToId, setToCurriculumId] = React.useState("")
  // Start on a curriculum pair that already has equivalencies, otherwise on the first two curricula.
  const fromCurriculumId = pickedFromId || equivalencies[0]?.fromCurriculumId || curricula[0]?.id || ""
  const toCurriculumId = pickedToId || equivalencies[0]?.toCurriculumId || curricula[1]?.id || curricula[0]?.id || ""
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)

  const [modalFromId, setModalFromId] = React.useState("")
  const [modalToId, setModalToId] = React.useState("")
  const [sourceCourseId, setSourceCourseId] = React.useState("")
  const [targetCourseId, setTargetCourseId] = React.useState("")
  const [formError, setFormError] = React.useState("")

  function openAddDialog() {
    setModalFromId(fromCurriculumId)
    setModalToId(toCurriculumId)
    setSourceCourseId(courses[0]?.id ?? "")
    setTargetCourseId(courses[1]?.id ?? courses[0]?.id ?? "")
    setFormError("")
    setIsAddModalOpen(true)
  }

  async function handleAddEquivalence() {
    if (addEquivalence.isPending) return
    const sourceCourse = courses.find((course) => course.id === sourceCourseId)
    const targetCourse = courses.find((course) => course.id === targetCourseId)
    if (!curricula.some(item => item.id === modalFromId) || !curricula.some(item => item.id === modalToId) || !sourceCourse || !targetCourse) {
      setFormError("Select both curricula and courses before adding an equivalence.")
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

    try {
      await addEquivalence.mutateAsync({ fromId: modalFromId, toId: modalToId, sourceCourseId, targetCourseId })
      setFromCurriculumId(modalFromId)
      setToCurriculumId(modalToId)
      setIsAddModalOpen(false)
      showToast(`Added equivalence for ${sourceCourse.code} → ${targetCourse.code}.`)
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : "The equivalence could not be added.")
    }
  }

  const displayedEquivalencies = equivalencies.filter((eq) =>
    eq.fromCurriculumId === fromCurriculumId && eq.toCurriculumId === toCurriculumId
  )
  const fromLabel = curricula.find((curriculum) => curriculum.id === fromCurriculumId)?.label
  const toLabel = curricula.find((curriculum) => curriculum.id === toCurriculumId)?.label

  if (!query.data) {
    return (
      <div className="space-y-6 [&_th]:h-auto [&_th]:px-3.5 [&_th]:py-2.5 [&_td]:px-3.5 [&_td]:py-[11px] [&_td]:whitespace-normal">
        <PageHeading title="Equivalence" subtitle="Define one-to-one course equivalencies between curriculum versions." />
        <QueryMessage query={query} label="equivalencies" />
      </div>
    )
  }

  return (
    <div className="space-y-6 [&_th]:h-auto [&_th]:px-3.5 [&_th]:py-2.5 [&_td]:px-3.5 [&_td]:py-[11px] [&_td]:whitespace-normal">
      <PageHeading
        title="Equivalence"
        subtitle="Define one-to-one course equivalencies between curriculum versions."
        actions={
          <Button disabled={!curricula.length || !courses.length} onClick={openAddDialog} className="gap-2 cursor-pointer">
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

      <DataTablePanel
        title="Curriculum equivalencies"
        description="Different codes and titles, the same credited requirement."
        toolbar={
        <div className="flex flex-wrap items-end gap-4">
          <FormField label="From curriculum" htmlFor="from-curr" className="w-44">
            <Select value={fromCurriculumId} onValueChange={setFromCurriculumId}>
              <SelectTrigger id="from-curr" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {curricula.map((item) => (
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
                {curricula.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        }
        rows={displayedEquivalencies}
        rowKey={row => row.id}
        empty="No equivalencies recorded for this pair."
        columns={[
          { header: "Old course subject", cell: row => <div><strong className="block font-semibold">{row.sourceCourse.code}</strong><small className="block text-xs text-muted-2">{row.sourceCourse.title}</small></div> },
          { header: "Old course units", headerContent: "Units", cell: row => row.sourceCourse.units },
          { header: "Equivalent course subject", cell: row => <div><strong className="block font-semibold">{row.targetCourse.code}</strong><small className="block text-xs text-muted-2">{row.targetCourse.title}</small></div> },
          { header: "Equivalent course units", headerContent: "Units", cell: row => row.targetCourse.units },
          { header: "Curriculum pair", cell: () => <>{fromLabel} → {toLabel}</> },
          { header: "Status", cell: () => <StatusBadge status="passed">Equivalent</StatusBadge> },
          { header: "Actions", cell: row => <Button variant="link" size="sm" onClick={() => { setDeleteTarget(row); setDeleteError("") }} aria-label={`Delete equivalence ${row.sourceCourse.code} to ${row.targetCourse.code}`}>Delete</Button> }
        ]}
        footer={<div className="flex flex-wrap justify-between gap-2"><span>{displayedEquivalencies.length} course equivalencies</span><span>DCST department scope</span></div>}
      />

      {/* Add Equivalence Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={open => !addEquivalence.isPending && setIsAddModalOpen(open)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[680px]" showCloseButton={!addEquivalence.isPending}>
          <DialogHeader className="pr-6">
            <DialogTitle>Add course equivalence</DialogTitle>
            <DialogDescription>
              Establish a direct 1-to-1 credit mapping between courses across curriculum versions.
            </DialogDescription>
          </DialogHeader>

          <fieldset disabled={addEquivalence.isPending} className="min-w-0 space-y-4 py-2 text-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="From curriculum" htmlFor="m-from" className="min-w-0">
                <Select value={modalFromId} onValueChange={(id) => { setModalFromId(id); setFormError("") }}>
                  <SelectTrigger id="m-from" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {curricula.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="To curriculum" htmlFor="m-to" className="min-w-0">
                <Select value={modalToId} onValueChange={(id) => { setModalToId(id); setFormError("") }}>
                  <SelectTrigger id="m-to" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {curricula.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="Old course subject" htmlFor="m-old" className="min-w-0">
              <Select value={sourceCourseId} onValueChange={(id) => { setSourceCourseId(id); setFormError("") }}>
                <SelectTrigger id="m-old" className="w-full min-w-0 [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} · {course.title} · {course.units} units
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Equivalent course subject" htmlFor="m-equiv" className="min-w-0">
              <Select value={targetCourseId} onValueChange={(id) => { setTargetCourseId(id); setFormError("") }}>
                <SelectTrigger id="m-equiv" className="w-full min-w-0 [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
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
          </fieldset>

          <DialogFooter>
            <Button disabled={addEquivalence.isPending} variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEquivalence} disabled={addEquivalence.isPending}>Add equivalence</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && !deletion.isPending && setDeleteTarget(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[680px]" showCloseButton={!deletion.isPending}>
          <DialogHeader className="pr-6">
            <DialogTitle>Delete course equivalence</DialogTitle>
            <DialogDescription>Remove the rule mapping {deleteTarget?.sourceCourse.code} to {deleteTarget?.targetCourse.code}? Existing student credit decisions are preserved.</DialogDescription>
          </DialogHeader>
          {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button disabled={deletion.isPending} variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button disabled={deletion.isPending} variant="destructive" onClick={confirmDelete}>{deletion.isPending ? "Deleting…" : "Delete equivalence"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  )
}
