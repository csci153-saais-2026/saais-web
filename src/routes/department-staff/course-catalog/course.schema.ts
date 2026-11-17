import { z } from 'zod'
import type { ApiSchema } from '@/lib/api'

const courseCategories = ['major', 'ge', 'elective', 'pe', 'nstp', 'foundation', 'service'] as const satisfies readonly ApiSchema<'CourseInsert'>['category'][]
const courseStatuses = ['active', 'discontinued'] as const satisfies readonly ApiSchema<'CourseInsert'>['status'][]

export const courseSchema = z.object({
  code: z.string().trim().min(2, 'Enter a course code.').max(250, 'Use at most 250 characters.'),
  title: z.string().trim().min(3, 'Enter a course title.').max(250, 'Use at most 250 characters.'),
  units: z.number({ error: 'Enter course units.' }).positive('Enter more than zero units.')
    .multipleOf(0.25, 'Use quarter-unit increments (for example, 3.25).'),
  type: z.enum(['non_elective', 'elective'], { error: 'Choose non-elective or elective.' }),
  category: z.enum(courseCategories, { error: 'Choose a catalog category.' }),
  status: z.enum(courseStatuses, { error: 'Choose active or discontinued.' }),
}).strict()

export type CourseValues = z.infer<typeof courseSchema>

export function courseCreateRequest(departmentId: string, values: CourseValues): ApiSchema<'CourseInsert'> {
  const parsed = courseSchema.parse(values)
  return {
    department_id: departmentId,
    code: parsed.code,
    title: parsed.title,
    units: parsed.units,
    category: parsed.type === 'elective' ? 'elective' : parsed.category === 'elective' ? 'major' : parsed.category,
    is_elective: parsed.type === 'elective',
    status: parsed.status,
    // Required by the legacy contract schema; repeat policy is not a user control.
    repeatable_type: 'none',
  }
}
