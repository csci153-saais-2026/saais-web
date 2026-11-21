import { z } from 'zod'
import type { ApiSchema } from '@/lib/api'

const units = z.number({ error: 'Enter nominal requirement units.' })
  .nonnegative('Enter zero or more units.')
  .multipleOf(0.25, 'Use quarter-unit increments (for example, 3.25).')

export const curriculumSlotSchema = z.object({
  slot_type: z.enum(['required', 'elective', 'ge', 'pe', 'nstp']),
  course_id: z.union([z.uuid('Select an active course.'), z.literal('')]),
  slot_label: z.string().trim().max(150, 'Use at most 150 characters.'),
  nominal_units: units,
}).strict().superRefine((values, context) => {
  const fixedCourse = values.slot_type === 'required' || values.slot_type === 'pe' || values.slot_type === 'nstp'
  if (fixedCourse && !values.course_id && !values.slot_label) {
    context.addIssue({ code: 'custom', path: ['slot_label'], message: 'Enter a course or slot name, or select a course.' })
  }
  if (!fixedCourse && !values.slot_label) {
    context.addIssue({ code: 'custom', path: ['slot_label'], message: 'Name this flexible requirement.' })
  }
})

export type CurriculumSlotValues = z.infer<typeof curriculumSlotSchema>

export function curriculumSlotRequest(termId: string, values: CurriculumSlotValues): ApiSchema<'CurriculumTermCourseInsert'> {
  const parsed = curriculumSlotSchema.parse(values)
  const fixedCourse = parsed.slot_type === 'required' || parsed.slot_type === 'pe' || parsed.slot_type === 'nstp'
  return {
    curriculum_term_id: termId,
    course_id: fixedCourse ? parsed.course_id || null : null,
    is_elective_slot: parsed.slot_type === 'elective',
    slot_type: parsed.slot_type,
    slot_label: parsed.slot_label || null,
    nominal_units: parsed.nominal_units,
  }
}

export function curriculumSlotUpdateRequest(values: CurriculumSlotValues): ApiSchema<'CurriculumTermCourseUpdate'> {
  const parsed = curriculumSlotSchema.parse(values)
  const fixedCourse = parsed.slot_type === 'required' || parsed.slot_type === 'pe' || parsed.slot_type === 'nstp'
  return {
    course_id: fixedCourse ? parsed.course_id || null : null,
    is_elective_slot: parsed.slot_type === 'elective',
    slot_type: parsed.slot_type,
    slot_label: parsed.slot_label || null,
    nominal_units: parsed.nominal_units,
  }
}
