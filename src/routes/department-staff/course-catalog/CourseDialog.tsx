import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '@/components/features/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCreateCatalogCourse, courseCreationError } from '@/hooks/use-create-catalog-course'
import type { CatalogCourse } from './course-catalog.api'
import { courseSchema, type CourseValues } from './course.schema'

const courseTypes = [
  ['major', 'Major'], ['ge', 'General education'], ['elective', 'Elective'],
  ['pe', 'Physical education'], ['nstp', 'NSTP'], ['foundation', 'Foundation'], ['service', 'Service'],
] as const

export function CourseDialog({ departmentId, onCreated, disabled = false, initialCategory = 'major' }: {
  departmentId: string
  onCreated: (course: CatalogCourse) => void
  disabled?: boolean
  initialCategory?: CourseValues['category']
}) {
  const [open, setOpen] = useState(false)
  const mutation = useCreateCatalogCourse()
  const submitting = useRef(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CourseValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: { code: '', title: '', units: 0, category: initialCategory, status: 'active' },
  })
  const pending = mutation.isPending || isSubmitting

  async function submit(values: CourseValues) {
    if (submitting.current) return
    submitting.current = true
    try {
      const course = await mutation.mutateAsync(values)
      onCreated(course)
      setOpen(false)
    } catch {
      // Keep the entered values available for correction; do not retry a mutation automatically.
    } finally {
      submitting.current = false
    }
  }

  return <>
    <Button type="button" size="sm" variant="outline" disabled={disabled || !departmentId} onClick={() => setOpen(true)}>Create catalog course</Button>
    {open && <Dialog open onOpenChange={next => { if (!next && !pending) setOpen(false) }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={!pending} onEscapeKeyDown={event => { if (pending) event.preventDefault() }} onInteractOutside={event => { if (pending) event.preventDefault() }}>
        <DialogHeader>
          <DialogTitle>Create catalog course</DialogTitle>
          <DialogDescription>Create a department course, then attach it to this curriculum requirement.</DialogDescription>
        </DialogHeader>
        <form noValidate className="grid gap-4" aria-busy={pending} onSubmit={event => { void handleSubmit(submit)(event) }}>
          <fieldset disabled={pending} className="grid min-w-0 gap-4">
            <FormField label="Department" htmlFor="catalog-course-department" hint="Courses are created only in your authorized department.">
              <Input id="catalog-course-department" value={departmentId} readOnly />
            </FormField>
            <FormField label="Course code" htmlFor="catalog-course-code" error={errors.code?.message}>
              <Input id="catalog-course-code" autoComplete="off" maxLength={250} aria-invalid={!!errors.code} {...register('code')} />
            </FormField>
            <FormField label="Course title" htmlFor="catalog-course-title" error={errors.title?.message}>
              <Input id="catalog-course-title" maxLength={250} aria-invalid={!!errors.title} {...register('title')} />
            </FormField>
            <FormField label="Units" htmlFor="catalog-course-units" error={errors.units?.message}>
              <Input id="catalog-course-units" type="number" min={0} step={0.25} aria-invalid={!!errors.units} {...register('units', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Course type" htmlFor="catalog-course-type" error={errors.category?.message}>
              <select id="catalog-course-type" className="min-h-11 w-full rounded-sm border border-input bg-card px-3 text-sm" aria-invalid={!!errors.category} {...register('category')}>
                {courseTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </FormField>
            <FormField label="Status" htmlFor="catalog-course-status" error={errors.status?.message}>
              <select id="catalog-course-status" className="min-h-11 w-full rounded-sm border border-input bg-card px-3 text-sm" aria-invalid={!!errors.status} {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </FormField>
          </fieldset>
          {mutation.isError && <p role="alert" className="text-sm text-destructive">{courseCreationError(mutation.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Creating course...' : 'Create course'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>}
  </>
}
