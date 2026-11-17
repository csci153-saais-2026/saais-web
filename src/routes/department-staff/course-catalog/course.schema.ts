import { z } from 'zod'
import type { ApiSchema } from '@/lib/api'

export const courseSchema = z.object({
  code: z.string().trim().min(2, 'Enter a course code.').max(250, 'Use at most 250 characters.'),
  title: z.string().trim().min(3, 'Enter a course title.').max(250, 'Use at most 250 characters.'),
  units: z.number({ error: 'Enter course units.' }).nonnegative('Enter zero or more units.')
    .multipleOf(0.25, 'Use quarter-unit increments (for example, 3.25).'),
  category: z.enum(['major', 'ge', 'elective', 'pe', 'nstp', 'foundation', 'service'], { error: 'Choose a course type.' }),
  status: z.enum(['active', 'inactive', 'discontinued'], { error: 'Choose a course status.' }),
}).strict()

export type CourseValues = z.infer<typeof courseSchema>

export function courseCreateRequest(departmentId: string, values: CourseValues): ApiSchema<'CourseInsert'> {
  const parsed = courseSchema.parse(values)
  return {
    department_id: departmentId,
    code: parsed.code,
    title: parsed.title,
    units: parsed.units,
    category: parsed.category,
    is_elective: parsed.category === 'elective',
    status: parsed.status,
    // Required by the legacy contract schema; repeat policy is not a user control.
    repeatable_type: 'none',
  }
}
