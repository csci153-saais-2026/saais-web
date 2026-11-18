import { DataTablePanel, type Column } from '@/components/features/data-table-panel'
import type { Course, CurriculumSlot, CurriculumTerm } from './curricula.api'
import { Button } from '@/components/ui/button'

export function CurriculumTermPanel({ term, slots, courses, onAddRequirement, onEditSlot, onDeleteSlot, onEdit, onDelete, actionsDisabled = false }: {
  term: CurriculumTerm
  slots: CurriculumSlot[]
  courses: Course[]
  onAddRequirement?: () => void
  onEditSlot?: (slot: CurriculumSlot) => void
  onDeleteSlot?: (slot: CurriculumSlot) => void
  onEdit?: () => void
  onDelete?: () => void
  actionsDisabled?: boolean
}) {
  const references = new Map(courses.map(course => [course.id, course]))
  const columns: Column<CurriculumSlot>[] = [
    { header: 'Course / slot', cell: slot => {
      const course = slot.course_id ? references.get(slot.course_id) : undefined
      const flexible = slot.is_elective_slot || slot.slot_type === 'elective'
      return <div className="max-w-sm whitespace-normal">
        <p className="font-semibold">{slot.slot_label || (flexible ? 'Elective slot' : slot.slot_type === 'ge' ? 'GE slot' : course?.code ?? 'Required course')}</p>
        <p className="text-muted-foreground">{course ? `${course.code} - ${course.title}` : slot.course_id ? 'Course reference unavailable' : flexible || slot.slot_type === 'ge' ? 'Flexible requirement; no fixed course assigned' : 'Course reference unavailable'}</p>
      </div>
    } },
    { header: 'Nominal slot units', numeric: true, cell: slot => slot.nominal_units ?? 'Unavailable' },
    { header: 'Type', cell: slot => slot.slot_type === 'ge' ? 'General education' : slot.is_elective_slot || slot.slot_type === 'elective' ? 'Elective' : 'Required' },
    { header: 'Course units', numeric: true, cell: slot => slot.course_id ? references.get(slot.course_id)?.units ?? 'Unavailable' : 'Not fixed' },
    ...(onEditSlot || onDeleteSlot ? [{ header: 'Actions', cell: (slot: CurriculumSlot) => {
      const name = slot.slot_label || (slot.course_id ? references.get(slot.course_id)?.code : null) || slot.id
      return <div className="flex flex-wrap gap-2">
        {onEditSlot && <Button type="button" size="sm" variant="outline" disabled={actionsDisabled} aria-label={`Edit requirement ${name}`} onClick={() => onEditSlot(slot)}>Edit</Button>}
        {onDeleteSlot && <Button type="button" size="sm" variant="destructive" disabled={actionsDisabled} aria-label={`Delete requirement ${name}`} onClick={() => onDeleteSlot(slot)}>Delete</Button>}
      </div>
    } }] : []),
  ]
  const label = `Year ${term.year_level} - Term ${term.term_sequence}`
  return <DataTablePanel title={label} description="Positional curriculum term; not a calendar school term. Course and nominal slot units are shown separately." action={<div className="flex flex-wrap gap-2">
    {onAddRequirement && <Button type="button" size="sm" variant="outline" disabled={actionsDisabled} aria-label={`Add requirement to ${label}`} onClick={onAddRequirement}>Add requirement</Button>}
    {onEdit && <Button type="button" size="sm" variant="outline" disabled={actionsDisabled} aria-label={`Edit ${label}`} onClick={onEdit}>Edit term</Button>}
    {onDelete && <Button type="button" size="sm" variant="destructive" disabled={actionsDisabled} aria-label={`Delete ${label}`} onClick={onDelete}>Delete term</Button>}
  </div>} rows={slots} columns={columns} rowKey={slot => slot.id} empty="No requirements are available for this term." />
}
