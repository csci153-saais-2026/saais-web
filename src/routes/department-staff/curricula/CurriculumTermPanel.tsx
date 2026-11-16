import { DataTablePanel, type Column } from '@/components/features/data-table-panel'
import type { Course, CurriculumSlot, CurriculumTerm } from './curricula.api'

export function CurriculumTermPanel({ term, slots, courses }: {
  term: CurriculumTerm
  slots: CurriculumSlot[]
  courses: Course[]
}) {
  const references = new Map(courses.map(course => [course.id, course]))
  const columns: Column<CurriculumSlot>[] = [
    { header: 'Requirement', cell: slot => {
      const course = slot.course_id ? references.get(slot.course_id) : undefined
      const flexible = slot.is_elective_slot || slot.slot_type === 'elective'
      return <div className="max-w-sm whitespace-normal">
        <p className="font-semibold">{slot.slot_label || (flexible ? 'Elective slot' : slot.slot_type === 'ge' ? 'GE slot' : course?.code ?? 'Required course')}</p>
        <p className="text-muted-foreground">{course ? `${course.code} - ${course.title}` : slot.course_id ? 'Course reference unavailable' : flexible || slot.slot_type === 'ge' ? 'Flexible requirement; no fixed course assigned' : 'Course reference unavailable'}</p>
      </div>
    } },
    { header: 'Type', cell: slot => slot.slot_type === 'ge' ? 'General education' : slot.is_elective_slot || slot.slot_type === 'elective' ? 'Elective' : 'Required' },
    { header: 'Course units', numeric: true, cell: slot => slot.course_id ? references.get(slot.course_id)?.units ?? 'Unavailable' : 'Not fixed' },
    { header: 'Nominal slot units', numeric: true, cell: slot => slot.nominal_units ?? 'Unavailable' },
  ]
  return <DataTablePanel title={`Year ${term.year_level} - Term ${term.term_sequence}`} description="Curriculum position; course units and nominal requirement units are shown separately." rows={slots} columns={columns} rowKey={slot => slot.id} empty="No requirements are available for this term." />
}
