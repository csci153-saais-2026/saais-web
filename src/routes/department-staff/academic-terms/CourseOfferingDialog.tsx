import { useMemo, useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { FormField } from '@/components/features/form-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ApiClientError } from '@/lib/api'
import { useCurriculumCourses } from '@/hooks/use-curricula'
import type { Course, CourseOffering } from './course-offerings.api'
import type { SchoolTerm } from './academic-terms.api'
import {
  courseOfferingFormSchema,
  courseOfferingInsertRequest,
  courseOfferingUpdateRequest,
  type CourseOfferingFormValues,
} from './course-offering.schema'
import {
  useCreateCourseOffering,
  useDeleteCourseOffering,
  useUpdateCourseOffering,
} from './use-course-offerings'

export type CourseOfferingDialogMode = 'create' | 'edit' | 'delete'
const EMPTY_DISCONTINUED_COURSES: readonly Course[] = []

function termTypeLabel(termType: SchoolTerm['term_type']): string {
  return termType === 'Summer' ? 'Summer/Midyear' : termType
}

function writeErrorMessage(error: unknown, mode: CourseOfferingDialogMode): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) {
      return 'Your account is not permitted to manage offerings for this department.'
    }
    if (error.isAuthError) {
      return 'Your session could not be verified. Sign in again and retry.'
    }
    if (error.isConflict) {
      const action = mode === 'delete' ? 'removed' : 'saved'
      const reason =
        mode === 'delete'
          ? 'term locks, academic history, or dependent records may protect this offering.'
          : 'the term or offering state may have changed.'
      return `The offering could not be ${action} because ${reason} ${error.message}`
    }
    if (error.isNetworkError) {
      return 'The write result could not be confirmed. Refresh the selected term before retrying.'
    }
    if (error.isRateLimited) {
      return 'Too many requests. Wait before submitting again.'
    }
    return error.message
  }

  if (error instanceof Error) return error.message
  return `The course offering could not be ${mode === 'delete' ? 'removed' : 'saved'}.`
}

function courseLabel(course: Course): string {
  return `${course.code} - ${course.title} (${course.units} units)`
}

export function CourseOfferingDialog({
  mode,
  term,
  offering,
  course,
  discontinuedRequiredCourses = EMPTY_DISCONTINUED_COURSES,
  onClose,
  onComplete,
}: {
  mode: CourseOfferingDialogMode
  term: SchoolTerm
  offering?: CourseOffering
  course?: Course
  discontinuedRequiredCourses?: readonly Course[]
  onClose: () => void
  onComplete: (action: 'created' | 'updated' | 'deleted') => void
}) {
  const create = useCreateCourseOffering()
  const update = useUpdateCourseOffering()
  const remove = useDeleteCourseOffering()
  const activeCourses = useCurriculumCourses(mode === 'create')
  const submitting = useRef(false)
  const editing = mode === 'edit'
  const deleting = mode === 'delete'
  const form = useForm<CourseOfferingFormValues>({
    resolver: zodResolver(courseOfferingFormSchema),
    defaultValues: {
      course_id: course?.id ?? '',
      section: offering?.section ?? '',
      schedule: offering?.schedule ?? '',
      instructor: offering?.instructor ?? '',
      is_by_request:
        offering?.is_by_request === true || course?.status === 'discontinued',
    },
  })

  const availableCourses = useMemo(() => {
    const options = new Map<string, Course>()
    for (const item of activeCourses.data ?? []) options.set(item.id, item)
    for (const item of discontinuedRequiredCourses) options.set(item.id, item)
    if (course) options.set(course.id, course)
    return [...options.values()].sort(
      (left, right) =>
        left.code.localeCompare(right.code) || left.id.localeCompare(right.id),
    )
  }, [activeCourses.data, course, discontinuedRequiredCourses])
  const selectedCourseId = useWatch({
    control: form.control,
    name: 'course_id',
  })
  const isByRequest = useWatch({
    control: form.control,
    name: 'is_by_request',
  })
  const selectedCourse = availableCourses.find(
    (item) => item.id === selectedCourseId,
  ) ?? course
  const requiresByRequest = selectedCourse?.status === 'discontinued'
  const pending =
    form.formState.isSubmitting ||
    create.isPending ||
    update.isPending ||
    remove.isPending
  const mutation =
    mode === 'create' ? create : mode === 'edit' ? update : remove

  async function submit(values: CourseOfferingFormValues) {
    if (submitting.current) return
    submitting.current = true
    try {
      if (mode === 'create') {
        const selected = availableCourses.find(
          (item) => item.id === values.course_id,
        )
        if (!selected) {
          form.setError('course_id', {
            type: 'validate',
            message: 'Choose a course available to your department.',
          })
          return
        }
        await create.mutateAsync(
          courseOfferingInsertRequest(
            term.id,
            values,
            selected.status === 'discontinued',
          ),
        )
        onComplete('created')
      } else if (mode === 'edit' && offering) {
        await update.mutateAsync({
          original: offering,
          body: courseOfferingUpdateRequest(
            values,
            course?.status === 'discontinued',
          ),
        })
        onComplete('updated')
      }
    } catch {
      // Mutation errors remain visible below and preserve the entered values.
    } finally {
      submitting.current = false
    }
  }

  async function confirmRemoval() {
    if (submitting.current || !offering) return
    submitting.current = true
    try {
      await remove.mutateAsync(offering)
      onComplete('deleted')
    } catch {
      // Mutation errors remain visible below until the user closes the dialog.
    } finally {
      submitting.current = false
    }
  }

  const canCreate =
    mode !== 'create' ||
    (activeCourses.isSuccess && availableCourses.length > 0)

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        showCloseButton={!pending}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (pending) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? 'Add course offering'
              : mode === 'edit'
                ? 'Edit course offering'
                : 'Remove course offering'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'delete'
              ? `Remove ${course ? courseLabel(course) : 'this course'} from ${term.school_year}, ${termTypeLabel(term.term_type)}? Removal may be rejected when term locks, academic history, or dependent records protect the offering.`
              : editing
                ? `Update offering details for ${term.school_year}, ${termTypeLabel(term.term_type)}. Course and term cannot be changed here.`
                : `Add an explicit course offering for ${term.school_year}, ${termTypeLabel(term.term_type)}.`}
          </DialogDescription>
        </DialogHeader>

        {deleting ? (
          <>
            {remove.isError && (
              <p role="alert" className="text-sm text-destructive">
                {writeErrorMessage(remove.error, mode)}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending || !offering}
                onClick={() => void confirmRemoval()}
              >
                {pending ? 'Removing offering…' : 'Confirm removal'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form
            noValidate
            onSubmit={(event) => {
              void form.handleSubmit(submit)(event)
            }}
            className="space-y-4"
            aria-busy={pending}
          >
            <fieldset disabled={pending} className="grid min-w-0 gap-4">
              <FormField
                label="Academic term"
                htmlFor="course-offering-term"
              >
                <Input
                  id="course-offering-term"
                  readOnly
                  value={`${term.school_year} · ${termTypeLabel(term.term_type)}`}
                />
              </FormField>

              {editing ? (
                <>
                  <input type="hidden" {...form.register('course_id')} />
                  <FormField label="Course" htmlFor="course-offering-course-readonly">
                    <Input
                      id="course-offering-course-readonly"
                      readOnly
                      value={course ? courseLabel(course) : 'Course unavailable'}
                    />
                  </FormField>
                </>
              ) : (
                <FormField
                  label="Course"
                  htmlFor="course-offering-course"
                  error={form.formState.errors.course_id?.message}
                >
                  <select
                    id="course-offering-course"
                    className="min-h-11 w-full rounded-sm border border-input bg-card px-3 text-sm"
                    aria-invalid={!!form.formState.errors.course_id}
                    disabled={activeCourses.isPending || activeCourses.isError}
                    {...form.register('course_id', {
                      onChange: (event) => {
                        const selected = availableCourses.find(
                          (item) => item.id === event.target.value,
                        )
                        if (selected?.status === 'discontinued') {
                          form.setValue('is_by_request', true)
                        }
                      },
                    })}
                  >
                    <option value="">Select a course</option>
                    {availableCourses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {courseLabel(item)}
                        {item.status === 'discontinued'
                          ? ' — Discontinued; by request only'
                          : ''}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}

              {mode === 'create' && activeCourses.isPending && (
                <p role="status" className="text-sm text-muted-foreground">
                  Loading active courses for your department…
                </p>
              )}
              {mode === 'create' && activeCourses.isError && (
                <div className="space-y-2">
                  <p role="alert" className="text-sm text-destructive">
                    {writeErrorMessage(activeCourses.error, mode)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={activeCourses.isFetching}
                    onClick={() => void activeCourses.refetch()}
                  >
                    {activeCourses.isFetching ? 'Retrying…' : 'Retry courses'}
                  </Button>
                </div>
              )}
              {mode === 'create' && !selectedCourse && (
                <p className="text-xs text-muted-foreground">
                  To add a discontinued course by request, first select a curriculum version that lists it as a required course.
                </p>
              )}
              {mode === 'create' &&
                activeCourses.isSuccess &&
                availableCourses.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No active courses or eligible discontinued required courses are available for this department.
                  </p>
                )}

              <FormField
                label="Section"
                htmlFor="course-offering-section"
                error={form.formState.errors.section?.message}
              >
                <Input
                  id="course-offering-section"
                  maxLength={64}
                  aria-invalid={!!form.formState.errors.section}
                  {...form.register('section')}
                />
              </FormField>
              <FormField
                label="Schedule"
                htmlFor="course-offering-schedule"
                error={form.formState.errors.schedule?.message}
              >
                <Input
                  id="course-offering-schedule"
                  maxLength={150}
                  aria-invalid={!!form.formState.errors.schedule}
                  {...form.register('schedule')}
                />
              </FormField>
              <FormField
                label="Instructor"
                htmlFor="course-offering-instructor"
                error={form.formState.errors.instructor?.message}
              >
                <Input
                  id="course-offering-instructor"
                  maxLength={150}
                  aria-invalid={!!form.formState.errors.instructor}
                  {...form.register('instructor')}
                />
              </FormField>

              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={requiresByRequest}
                  {...form.register('is_by_request')}
                  checked={requiresByRequest || isByRequest}
                />
                By-request offering
              </label>
              {requiresByRequest && (
                <p className="text-xs text-muted-foreground">
                  Discontinued required courses can only be offered by request.
                </p>
              )}
            </fieldset>

            {mutation.isError && (
              <p role="alert" className="text-sm text-destructive">
                {writeErrorMessage(mutation.error, mode)}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !canCreate}>
                {pending
                  ? editing
                    ? 'Saving offering…'
                    : 'Adding offering…'
                  : editing
                    ? 'Save changes'
                    : 'Add offering'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
