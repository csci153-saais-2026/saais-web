import { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '@/components/features/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiClientError } from '@/lib/api'
import { useCreateCurriculumSlot, useCurriculumCourses, useManageCurriculumSlot } from '@/hooks/use-curricula'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import { CourseDialog } from '@/routes/department-staff/course-catalog/CourseDialog'
import type { Course, CurriculumSlot, CurriculumTerm, CurriculumVersion } from './curricula.api'
import { curriculumSlotSchema, type CurriculumSlotValues } from './curriculum-slot.schema'

function slotError(error: unknown, editing: boolean): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return `You do not have permission to ${editing ? 'edit' : 'add'} requirements to this curriculum.`
    if (error.isAuthError) return 'Your session could not be verified. Sign in again.'
    if (error.isConflict) return `The requirement could not be ${editing ? 'updated' : 'added'} because its history is protected or the curriculum changed. ${error.message}`
    if (error.isRateLimited) return 'Too many requests. Wait before trying again.'
    if (error.isNetworkError) return `The ${editing ? 'update' : 'creation'} result could not be confirmed. Refresh the curriculum before submitting again.`
  }
  return error instanceof Error ? error.message : `The requirement could not be ${editing ? 'updated' : 'added'}.`
}

function courseLoadError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'Your account is not permitted to view department courses.'
    if (error.isAuthError) return 'Your session could not be verified. Sign in again.'
    if (error.isNetworkError) return 'Could not reach the course catalog. Check your connection and retry.'
  }
  return error instanceof Error ? error.message : 'Active department courses could not be loaded.'
}

type CurriculumSlotDialogProps = {
  term: CurriculumTerm
  version: CurriculumVersion
  onClose: () => void
} & ({ slot?: undefined; onCreated: (versionId: string) => void; onUpdated?: never } |
  { slot: CurriculumSlot; onUpdated: (versionId: string) => void; onCreated?: never })

export function CurriculumSlotDialog({ term, version, onClose, slot, onCreated, onUpdated }: CurriculumSlotDialogProps) {
  const scope = useStaffScope()
  const creation = useCreateCurriculumSlot()
  const update = useManageCurriculumSlot()
  const editing = slot !== undefined
  const mutation = editing ? update : creation
  const submitting = useRef(false)
  const [createdCourseMessage, setCreatedCourseMessage] = useState('')
  const [createdCourse, setCreatedCourse] = useState<Course | null>(null)
  const { register, control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<CurriculumSlotValues>({
    resolver: zodResolver(curriculumSlotSchema),
    defaultValues: slot ? {
      slot_type: slot.slot_type ?? (slot.is_elective_slot ? 'elective' : 'required'),
      course_id: slot.course_id ?? '', slot_label: slot.slot_label ?? '', nominal_units: slot.nominal_units,
    } : { slot_type: 'required', course_id: '', slot_label: '', nominal_units: 0 },
  })
  const slotType = useWatch({ control, name: 'slot_type' })
  const selectedCourseId = useWatch({ control, name: 'course_id' })
  const fixedCourse = slotType === 'required' || slotType === 'pe' || slotType === 'nstp'
  const courseOptions = useCurriculumCourses(fixedCourse)
  const pending = isSubmitting || mutation.isPending
  const canKeepExistingCourse = editing && fixedCourse && !!slot?.course_id
  const courseChoices = [...(courseOptions.data ?? []), ...(createdCourse?.status === 'active' && !(courseOptions.data ?? []).some(course => course.id === createdCourse.id) ? [createdCourse] : [])]

  async function submit(values: CurriculumSlotValues) {
    if (submitting.current) return
    submitting.current = true
    try {
      if (slot) {
        const result = await update.mutateAsync({ action: 'edit', term, original: slot, values })
        onUpdated(result.versionId)
      } else {
        const result = await creation.mutateAsync({ term, values })
        onCreated(result.versionId)
      }
    } catch {
      // Keep form values visible so the user can correct or retry the request.
    } finally {
      submitting.current = false
    }
  }

  return <Dialog open onOpenChange={open => { if (!open && !pending) onClose() }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={!pending} onEscapeKeyDown={event => { if (pending) event.preventDefault() }} onInteractOutside={event => { if (pending) event.preventDefault() }}>
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit curriculum requirement' : 'Add curriculum requirement'}</DialogTitle>
        <DialogDescription>{editing ? `Update the requirement in Year ${term.year_level} - Term ${term.term_sequence} of ${version.version_label}. Referenced history may prevent the change.` : `Add a fixed course or a flexible requirement to Year ${term.year_level} - Term ${term.term_sequence} in ${version.version_label}. The service validates and records the curriculum change.`}</DialogDescription>
      </DialogHeader>
      <form noValidate className="grid gap-4" aria-busy={pending} onSubmit={event => { void handleSubmit(submit)(event) }}>
        <fieldset disabled={pending} className="grid min-w-0 gap-4">
          <FormField label="Requirement type" htmlFor="curriculum-slot-type" error={errors.slot_type?.message}>
            <select id="curriculum-slot-type" className="min-h-11 w-full rounded-sm border border-input bg-card px-3 text-sm" aria-invalid={!!errors.slot_type} {...register('slot_type')}>
              <option value="required">Required course</option>
              <option value="elective">Elective requirement</option>
              <option value="ge">General education requirement</option>
              <option value="pe">Physical education course</option>
              <option value="nstp">NSTP course</option>
            </select>
          </FormField>
          {fixedCourse && <>
            <FormField label="Active course" htmlFor="curriculum-slot-course" error={errors.course_id?.message}>
              <select id="curriculum-slot-course" className="min-h-11 w-full rounded-sm border border-input bg-card px-3 text-sm" aria-invalid={!!errors.course_id} value={selectedCourseId ?? ''} {...register('course_id')}>
                <option value="">Select a course</option>
                {slot?.course_id && !courseChoices.some(course => course.id === slot.course_id) && <option value={slot.course_id}>Current course reference unavailable or inactive</option>}
                {courseChoices.map(course => <option key={course.id} value={course.id}>{course.code} - {course.title} ({course.units} units)</option>)}
              </select>
              {courseOptions.isPending && <p role="status" className="text-xs text-muted-foreground">Loading active department courses...</p>}
              {courseOptions.isError && <div className="text-xs text-destructive"><p role="alert">{courseLoadError(courseOptions.error)}</p><Button type="button" variant="outline" size="sm" disabled={courseOptions.isFetching} onClick={() => void courseOptions.refetch()}>Retry courses</Button></div>}
              {courseOptions.isSuccess && courseOptions.data.length === 0 && <p className="text-xs text-muted-foreground">No active courses are available in this department catalog.</p>}
            </FormField>
            {scope.status === 'ready' && <div className="grid gap-2">
              <CourseDialog key={slotType} departmentId={scope.departmentId} disabled={pending} initialCategory={slotType === 'pe' || slotType === 'nstp' ? slotType : 'major'} onCreated={course => {
                setCreatedCourse(course)
                if (course.status !== 'active') {
                  setCreatedCourseMessage(`Course ${course.code} (${course.id}) was created as ${course.status}; only active courses can be attached.`)
                  return
                }
                setValue('course_id', course.id, { shouldDirty: true, shouldValidate: true })
                setCreatedCourseMessage(`Course ${course.code} created. Save this requirement to attach it.`)
              }} />
              {createdCourseMessage && <p role="status" className="text-xs text-muted-foreground">{createdCourseMessage}</p>}
            </div>}
          </>}
          <FormField label="Requirement name" htmlFor="curriculum-slot-label" hint={fixedCourse ? 'Optional label; the selected course code is shown when blank.' : 'Name the elective or general education requirement.'} error={errors.slot_label?.message}>
            <Input id="curriculum-slot-label" maxLength={150} aria-invalid={!!errors.slot_label} {...register('slot_label')} />
          </FormField>
          <FormField label="Nominal requirement units" htmlFor="curriculum-slot-units" hint="Use zero or more units in quarter-unit increments." error={errors.nominal_units?.message}>
            <Input id="curriculum-slot-units" type="number" min={0} step={0.25} aria-invalid={!!errors.nominal_units} {...register('nominal_units', { valueAsNumber: true })} />
          </FormField>
        </fieldset>
        {mutation.isError && <p role="alert" className="text-sm text-destructive">{slotError(mutation.error, editing)}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending || (fixedCourse && (!courseOptions.isSuccess || courseOptions.data.length === 0) && !canKeepExistingCourse)}>{pending ? editing ? 'Saving requirement...' : 'Adding requirement...' : editing ? 'Save requirement' : 'Add requirement'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
