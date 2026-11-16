import { useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '@/components/features/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiClientError } from '@/lib/api'
import { useCreateCurriculumSlot, useCurriculumCourses } from '@/hooks/use-curricula'
import type { CurriculumTerm, CurriculumVersion } from './curricula.api'
import { curriculumSlotSchema, type CurriculumSlotValues } from './curriculum-slot.schema'

function slotError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'You do not have permission to add requirements to this curriculum.'
    if (error.isAuthError) return 'Your session could not be verified. Sign in again.'
    if (error.isConflict) return `The requirement could not be added because the curriculum changed or its history is protected. ${error.message}`
    if (error.isRateLimited) return 'Too many requests. Wait before trying again.'
    if (error.isNetworkError) return 'The creation result could not be confirmed. Refresh the curriculum before submitting again.'
  }
  return error instanceof Error ? error.message : 'The requirement could not be added.'
}

function courseLoadError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'Your account is not permitted to view department courses.'
    if (error.isAuthError) return 'Your session could not be verified. Sign in again.'
    if (error.isNetworkError) return 'Could not reach the course catalog. Check your connection and retry.'
  }
  return error instanceof Error ? error.message : 'Active department courses could not be loaded.'
}

export function CurriculumSlotDialog({ term, version, onClose, onCreated }: {
  term: CurriculumTerm
  version: CurriculumVersion
  onClose: () => void
  onCreated: (versionId: string) => void
}) {
  const mutation = useCreateCurriculumSlot()
  const submitting = useRef(false)
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<CurriculumSlotValues>({
    resolver: zodResolver(curriculumSlotSchema),
    defaultValues: { slot_type: 'required', course_id: '', slot_label: '', nominal_units: 0 },
  })
  const slotType = useWatch({ control, name: 'slot_type' })
  const fixedCourse = slotType === 'required' || slotType === 'pe' || slotType === 'nstp'
  const courseOptions = useCurriculumCourses(fixedCourse)
  const pending = isSubmitting || mutation.isPending

  async function submit(values: CurriculumSlotValues) {
    if (submitting.current) return
    submitting.current = true
    try {
      const result = await mutation.mutateAsync({ term, values })
      onCreated(result.versionId)
    } catch {
      // Keep form values visible so the user can correct or retry the request.
    } finally {
      submitting.current = false
    }
  }

  return <Dialog open onOpenChange={open => { if (!open && !pending) onClose() }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={!pending} onEscapeKeyDown={event => { if (pending) event.preventDefault() }} onInteractOutside={event => { if (pending) event.preventDefault() }}>
      <DialogHeader>
        <DialogTitle>Add curriculum requirement</DialogTitle>
        <DialogDescription>Add a fixed course or a flexible requirement to Year {term.year_level} - Term {term.term_sequence} in {version.version_label}. The service validates and records the curriculum change.</DialogDescription>
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
          {fixedCourse && <FormField label="Active course" htmlFor="curriculum-slot-course" error={errors.course_id?.message}>
            <select id="curriculum-slot-course" className="min-h-11 w-full rounded-sm border border-input bg-card px-3 text-sm" aria-invalid={!!errors.course_id} {...register('course_id')}>
              <option value="">Select a course</option>
              {(courseOptions.data ?? []).map(course => <option key={course.id} value={course.id}>{course.code} - {course.title} ({course.units} units)</option>)}
            </select>
            {courseOptions.isPending && <p role="status" className="text-xs text-muted-foreground">Loading active department courses...</p>}
            {courseOptions.isError && <div className="text-xs text-destructive"><p role="alert">{courseLoadError(courseOptions.error)}</p><Button type="button" variant="outline" size="sm" disabled={courseOptions.isFetching} onClick={() => void courseOptions.refetch()}>Retry courses</Button></div>}
            {courseOptions.isSuccess && courseOptions.data.length === 0 && <p className="text-xs text-muted-foreground">No active courses are available in this department catalog.</p>}
          </FormField>}
          <FormField label="Requirement name" htmlFor="curriculum-slot-label" hint={fixedCourse ? 'Optional label; the selected course code is shown when blank.' : 'Name the elective or general education requirement.'} error={errors.slot_label?.message}>
            <Input id="curriculum-slot-label" maxLength={150} aria-invalid={!!errors.slot_label} {...register('slot_label')} />
          </FormField>
          <FormField label="Nominal requirement units" htmlFor="curriculum-slot-units" hint="Use zero or more units in quarter-unit increments." error={errors.nominal_units?.message}>
            <Input id="curriculum-slot-units" type="number" min={0} step={0.25} aria-invalid={!!errors.nominal_units} {...register('nominal_units', { valueAsNumber: true })} />
          </FormField>
        </fieldset>
        {mutation.isError && <p role="alert" className="text-sm text-destructive">{slotError(mutation.error)}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending || (fixedCourse && (!courseOptions.isSuccess || courseOptions.data.length === 0))}>{pending ? 'Adding requirement...' : 'Add requirement'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
