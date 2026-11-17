import { z } from 'zod'
import type { ApiSchema } from '@/lib/api'

const units = z.number({ error: 'Enter a number.' })
  .nonnegative('Enter zero or more units.')
  .multipleOf(0.25, 'Use quarter-unit increments (for example, 3.25).')

export const curriculumVersionSchema = z.object({
  program_id: z.uuid('Select an authorized program.'),
  version_label: z.string().trim().min(1, 'Enter a version label.').max(100, 'Use at most 100 characters.'),
  effective_start: z.iso.date('Enter a valid start date.'),
  effective_end: z.union([z.iso.date('Enter a valid end date.'), z.literal('')]),
  total_units: units,
  delinquency_threshold: units,
  status: z.enum(['draft', 'active', 'retired', 'teach_out', 'closed']),
}).strict().superRefine((values, context) => {
  if (values.effective_end && values.effective_end < values.effective_start) {
    context.addIssue({ code: 'custom', path: ['effective_end'], message: 'The end date cannot precede the start date.' })
  }
})

export type CurriculumVersionValues = z.infer<typeof curriculumVersionSchema>

export const curriculumVersionEditSchema = curriculumVersionSchema.safeExtend({
  version_label: z.string().trim().min(1, 'Enter a version label.').max(250, 'Use at most 250 characters.'),
})

export function versionUpdateRequest(values: CurriculumVersionValues): ApiSchema<'CurriculumVersionUpdate'> {
  const parsed = curriculumVersionEditSchema.parse(values)
  return {
    version_label: parsed.version_label,
    effective_start: parsed.effective_start,
    effective_end: parsed.effective_end || null,
    total_units: parsed.total_units,
    delinquency_threshold: parsed.delinquency_threshold,
    status: parsed.status,
  }
}

// The generated Insert schema includes unknown union branches. Keep the blank
// creation payload narrowly typed from the generated entity rather than casting it.
export type NewCurriculumVersion = Pick<ApiSchema<'CurriculumVersion'>,
  'program_id' | 'version_label' | 'effective_start' | 'effective_end' |
  'total_units' | 'delinquency_threshold' | 'status'>

export function blankVersionRequest(values: CurriculumVersionValues): NewCurriculumVersion {
  const parsed = curriculumVersionSchema.parse(values)
  return { ...parsed, effective_end: parsed.effective_end || null }
}
