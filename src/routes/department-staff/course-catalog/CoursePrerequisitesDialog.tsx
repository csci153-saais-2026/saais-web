import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { coursePrerequisiteError, useCourseCatalogPrerequisites } from '@/hooks/use-course-catalog-prerequisites'
import {
  coursePrerequisiteMutationError,
  useCreateCoursePrerequisite,
  useDeleteCoursePrerequisite,
  useDepartmentPrerequisiteCandidates,
} from '@/hooks/use-course-catalog-prerequisite-actions'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import type { CatalogCourse, CatalogPrerequisiteType } from './course-catalog.api'

const relationshipLabels: Record<CatalogPrerequisiteType, string> = {
  strict: 'Prerequisite',
  co_requisite: 'Co-requisite',
  recommended: 'Recommended',
}

interface CoursePrerequisitesDialogProps {
  course: CatalogCourse | null
  open: boolean
  onReturnFocus: () => void
}

export function CoursePrerequisitesDialog({ course, open, onReturnFocus }: CoursePrerequisitesDialogProps) {
  const prerequisites = useCourseCatalogPrerequisites(course?.id ?? '', open)
  const staffScope = useStaffScope()
  const canManage = staffScope.status === 'ready'
    && course !== null
    && staffScope.departmentIds.includes(course.department_id)
    && staffScope.departmentId === course.department_id
  const candidates = useDepartmentPrerequisiteCandidates(course?.department_id ?? '', open && canManage)
  const create = useCreateCoursePrerequisite()
  const remove = useDeleteCoursePrerequisite()
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedType, setSelectedType] = useState<CatalogPrerequisiteType>('strict')
  const [removalId, setRemovalId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const mutationPending = create.isPending || remove.isPending
  const linkedIds = new Set((prerequisites.data ?? []).map(row => row.prerequisiteCourseId))
  const duplicateSelection = selectedCourseId !== '' && linkedIds.has(selectedCourseId)
  const selfSelection = selectedCourseId !== '' && selectedCourseId === course?.id

  async function addRelationship(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!course || !canManage || mutationPending) return
    if (selfSelection) {
      setMessage('A course cannot be linked as its own prerequisite.')
      return
    }
    if (duplicateSelection) {
      setMessage('This course is already linked; duplicate relationships are not allowed.')
      return
    }
    if (!selectedCourseId) {
      setMessage('Choose a course to link.')
      return
    }
    setMessage('')
    create.reset()
    try {
      await create.mutateAsync({
        departmentId: course.department_id,
        body: {
          course_id: course.id,
          prerequisite_course_id: selectedCourseId,
          type: selectedType,
        },
      })
      setSelectedCourseId('')
      setMessage('Prerequisite relationship added.')
    } catch {
      // The server message is rendered below; keep the chosen values for correction.
    }
  }

  async function removeRelationship(id: string) {
    if (!course || !canManage || mutationPending) return
    setMessage('')
    remove.reset()
    try {
      await remove.mutateAsync({ departmentId: course.department_id, id })
      setRemovalId(null)
      setMessage('Prerequisite relationship removed.')
    } catch {
      // Keep the confirmation context visible so the user can retry or cancel.
    }
  }

  return (
        <DialogContent
          className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-[600px]"
          onCloseAutoFocus={event => { event.preventDefault(); onReturnFocus() }}
        >
          <DialogHeader>
            <DialogTitle>Prerequisite relationships</DialogTitle>
            <DialogDescription>
              {course?.code || 'Course'} · {course?.title || 'Course details unavailable'}
            </DialogDescription>
          </DialogHeader>

          {prerequisites.isPending && (
            <p role="status" className="py-4 text-sm text-muted-foreground">Loading prerequisite relationships…</p>
          )}

          {prerequisites.isError && (
            <div className="space-y-3 py-2">
              <p role="alert" className="text-sm text-destructive">{coursePrerequisiteError(prerequisites.error)}</p>
              <Button type="button" variant="outline" onClick={() => { void prerequisites.refetch() }} disabled={prerequisites.isFetching}>
                {prerequisites.isFetching ? 'Retrying…' : 'Retry'}
              </Button>
            </div>
          )}

          {prerequisites.isSuccess && prerequisites.data.length === 0 && (
            <p role="status" className="py-4 text-sm text-muted-foreground">No prerequisite relationships are recorded for this course.</p>
          )}

          {prerequisites.isSuccess && prerequisites.data.length > 0 && (
            <div className="space-y-4">
              <ul aria-label="Prerequisite relationships" className="divide-y divide-border rounded-md border border-border">
                {prerequisites.data.map(relationship => (
                  <li key={relationship.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 space-y-1">
                      <span className="block font-medium">{relationshipLabels[relationship.type]}</span>
                      <span className="block min-w-0 break-words text-sm text-muted-foreground">
                        {relationship.course
                          ? <><span className="font-mono font-medium text-foreground">{relationship.course.code || 'Code unavailable'}</span>{' · '}{relationship.course.title || 'Title unavailable'}</>
                          : 'Course reference unavailable'}
                      </span>
                    </div>
                    {canManage && (removalId === relationship.id ? (
                      <div className="flex shrink-0 items-center gap-2" aria-label={`Confirm removal of ${relationship.course?.code || 'course relationship'}`}>
                        <span className="text-xs text-muted-foreground">Remove this relationship?</span>
                        <Button type="button" size="sm" variant="outline" disabled={mutationPending} onClick={() => { setRemovalId(null); setMessage('') }}>Cancel</Button>
                        <Button type="button" size="sm" variant="destructive" disabled={mutationPending} onClick={() => void removeRelationship(relationship.id)}>
                          {remove.isPending ? 'Removing…' : 'Confirm remove'}
                        </Button>
                      </div>
                    ) : (
                      <Button type="button" size="sm" variant="outline" disabled={mutationPending} aria-label={`Remove ${relationship.course?.code || 'prerequisite relationship'}`} onClick={() => { setRemovalId(relationship.id); setMessage('') }}>
                        Remove
                      </Button>
                    ))}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Recommended relationships are advisory. Similar course codes do not imply equivalence.
              </p>
            </div>
          )}

          {prerequisites.isSuccess && prerequisites.data.length === 0 && canManage && (
            <p className="text-xs text-muted-foreground">The current course cannot be selected as its own prerequisite. Existing relationships cannot be added twice.</p>
          )}

          {canManage && prerequisites.isSuccess && (
            <form className="space-y-3 border-t border-border pt-4" onSubmit={event => { void addRelationship(event) }}>
              <h3 className="font-semibold">Add relationship</h3>
              {candidates.isPending && <p role="status" className="text-sm text-muted-foreground">Loading department course options…</p>}
              {candidates.isError && (
                <div className="space-y-2">
                  <p role="alert" className="text-sm text-destructive">{coursePrerequisiteError(candidates.error)}</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => { void candidates.refetch() }} disabled={candidates.isFetching}>Retry course options</Button>
                </div>
              )}
              {candidates.isSuccess && (
                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  <label className="grid min-w-0 gap-1 text-sm font-medium" htmlFor="prerequisite-course-choice">
                    Course
                    <select
                      id="prerequisite-course-choice"
                      className="min-h-10 w-full min-w-0 max-w-full rounded-sm border border-input bg-card px-3 font-normal"
                      value={selectedCourseId}
                      disabled={mutationPending}
                      onChange={event => { setSelectedCourseId(event.target.value); setMessage('') }}
                    >
                      <option value="">Choose a department course</option>
                      {candidates.data.map(candidate => {
                        const isSelf = candidate.id === course.id
                        const isDuplicate = linkedIds.has(candidate.id)
                        return <option key={candidate.id} value={candidate.id} disabled={isSelf || isDuplicate}>
                          {candidate.code || 'Course code unavailable'} — {candidate.title || 'Title unavailable'}{isSelf ? ' (cannot link to itself)' : isDuplicate ? ' (already linked)' : ''}
                        </option>
                      })}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1 text-sm font-medium" htmlFor="prerequisite-type-choice">
                    Relationship type
                    <select
                      id="prerequisite-type-choice"
                      className="min-h-10 w-full min-w-0 max-w-full rounded-sm border border-input bg-card px-3 font-normal"
                      value={selectedType}
                      disabled={mutationPending}
                      onChange={event => setSelectedType(event.target.value as CatalogPrerequisiteType)}
                    >
                      <option value="strict">Prerequisite</option>
                      <option value="co_requisite">Co-requisite</option>
                      <option value="recommended">Recommended</option>
                    </select>
                  </label>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Self-links and duplicate course links are not allowed. Changing an existing relationship type is unavailable until replacement semantics are agreed.</p>
              {selfSelection && <p role="status" className="text-sm text-destructive">A course cannot be linked as its own prerequisite.</p>}
              {duplicateSelection && <p role="status" className="text-sm text-destructive">This course is already linked and cannot be added again.</p>}
              {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
              {(create.isError || remove.isError) && <p role="alert" className="text-sm text-destructive">{coursePrerequisiteMutationError(create.error ?? remove.error)}</p>}
              <Button type="submit" size="sm" disabled={!candidates.isSuccess || mutationPending || !selectedCourseId || duplicateSelection || selfSelection}>
                {create.isPending ? 'Adding…' : 'Add relationship'}
              </Button>
            </form>
          )}
        </DialogContent>
  )
}
