import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '@/components/features/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCreateCatalogCourse, useUpdateCatalogCourse, courseCreationError, courseUpdateError } from '@/hooks/use-create-catalog-course'
import type { CatalogCourse } from './course-catalog.api'
import { courseSchema, editableCourseSchema, type CourseValues, type EditableCourseValues } from './course.schema'

export function CourseDialog({ departmentId, departmentLabel, description, onCreated, onUpdated, course, disabled = false, initialCategory = 'major', triggerLabel }: {
  departmentId: string
  departmentLabel?: string
  description?: string
  onCreated: (course: CatalogCourse) => void
  onUpdated?: (course: CatalogCourse) => void
  course?: CatalogCourse
  disabled?: boolean
  initialCategory?: CourseValues['category']
  triggerLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const createMutation = useCreateCatalogCourse()
  const updateMutation = useUpdateCatalogCourse()
  const editing = course !== undefined
  const submitting = useRef(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EditableCourseValues>({
    resolver: zodResolver(editableCourseSchema),
    defaultValues: {
      code: course?.code ?? '', title: course?.title ?? '', units: course?.units ?? 0,
      type: course?.category === 'elective' || initialCategory === 'elective' ? 'elective' : 'non_elective',
      category: course?.category ?? initialCategory, status: course?.status ?? 'active',
    },
  })
  const mutation = editing ? updateMutation : createMutation
  const pending = createMutation.isPending || updateMutation.isPending || isSubmitting
  const resolvedTriggerLabel = triggerLabel ?? (editing ? `Edit ${course.code}` : 'Create catalog course')
  const openForm = () => {
    reset({
      code: course?.code ?? '',
      title: course?.title ?? '',
      units: course?.units ?? 0,
      type: course?.category === 'elective' || initialCategory === 'elective' ? 'elective' : 'non_elective',
      category: course?.category ?? initialCategory,
      status: course?.status ?? 'active',
    })
    createMutation.reset()
    updateMutation.reset()
    setOpen(true)
  }

  async function submit(values: EditableCourseValues) {
    if (submitting.current) return
    submitting.current = true
    try {
      if (course) {
        const updated = await updateMutation.mutateAsync({ course, values: editableCourseSchema.parse(values) })
        onUpdated?.(updated)
      } else {
        const created = await createMutation.mutateAsync(courseSchema.parse(values))
        onCreated(created)
      }
      setOpen(false)
    } catch {
      // Keep the entered values available for correction; do not retry a mutation automatically.
    } finally {
      submitting.current = false
    }
  }

  return <>
    <Button type="button" size="sm" variant="outline" disabled={disabled || !departmentId} onClick={openForm}>{resolvedTriggerLabel}</Button>
    {open && <Dialog open onOpenChange={next => { if (!next && !pending) setOpen(false) }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={!pending} onEscapeKeyDown={event => { if (pending) event.preventDefault() }} onInteractOutside={event => { if (pending) event.preventDefault() }}>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit catalog course' : 'Create catalog course'}</DialogTitle>
          <DialogDescription>{description ?? (editing ? 'Update the approved details for this department course.' : 'Create a department course, then attach it to this curriculum requirement.')}</DialogDescription>
        </DialogHeader>
        <form noValidate className="grid gap-4" aria-busy={pending} onSubmit={event => { void handleSubmit(submit)(event) }}>
          <fieldset disabled={pending} className="grid min-w-0 gap-4">
            <FormField label="Department" htmlFor="catalog-course-department" hint={editing ? 'A course cannot be moved to another department here.' : 'Courses are created only in your authorized department.'}>
              <Input id="catalog-course-department" value={departmentLabel || departmentId} readOnly />
            </FormField>
            <input type="hidden" {...register('category')} />
            <FormField label="Course code" htmlFor="catalog-course-code" error={errors.code?.message}>
              <Input id="catalog-course-code" autoComplete="off" maxLength={250} aria-invalid={!!errors.code} {...register('code')} />
            </FormField>
            <FormField label="Course title" htmlFor="catalog-course-title" error={errors.title?.message}>
              <Input id="catalog-course-title" maxLength={250} aria-invalid={!!errors.title} {...register('title')} />
            </FormField>
            <FormField label="Units" htmlFor="catalog-course-units" error={errors.units?.message}>
              <Input id="catalog-course-units" type="number" min={0.25} step={0.25} aria-invalid={!!errors.units} {...register('units', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Course type" htmlFor="catalog-course-type" error={errors.type?.message}>
              <select id="catalog-course-type" className="min-h-11 w-full rounded-sm border border-input bg-card px-3 text-sm" aria-invalid={!!errors.type} {...register('type')}>
                <option value="non_elective">Non-elective</option>
                <option value="elective">Elective</option>
              </select>
            </FormField>
            <FormField label="Status" htmlFor="catalog-course-status" error={errors.status?.message}>
              <select id="catalog-course-status" className="min-h-11 w-full rounded-sm border border-input bg-card px-3 text-sm" aria-invalid={!!errors.status} {...register('status')}>
                <option value="active">Active</option>
                {course?.status === 'inactive' && <option value="inactive">Inactive</option>}
                <option value="discontinued">Discontinued</option>
              </select>
            </FormField>
          </fieldset>
          {mutation.isError && <p role="alert" className="text-sm text-destructive">{editing ? courseUpdateError(updateMutation.error) : courseCreationError(createMutation.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? (editing ? 'Saving course...' : 'Creating course...') : (editing ? 'Save changes' : 'Create course')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>}
  </>
}
