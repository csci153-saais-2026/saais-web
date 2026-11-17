import { Button } from '@/components/ui/button'
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { coursePrerequisiteError, useCourseCatalogPrerequisites } from '@/hooks/use-course-catalog-prerequisites'
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

  return (
        <DialogContent onCloseAutoFocus={event => { event.preventDefault(); onReturnFocus() }}>
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
                  <li key={relationship.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <span className="font-medium">{relationshipLabels[relationship.type]}</span>
                    <span className="min-w-0 text-sm text-muted-foreground sm:text-right">
                      {relationship.course
                        ? <><span className="font-mono font-medium text-foreground">{relationship.course.code || 'Code unavailable'}</span>{' · '}{relationship.course.title || 'Title unavailable'}</>
                        : 'Course reference unavailable'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Recommended relationships are advisory. Similar course codes do not imply equivalence.
              </p>
            </div>
          )}
        </DialogContent>
  )
}
