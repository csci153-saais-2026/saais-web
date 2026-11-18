import { z } from 'zod'

export const curriculumTermSchema = z.object({
  year_level: z.number({ error: 'Enter a year level.' }).int('Use a whole year level.').min(1, 'Year level must be between 1 and 8.').max(8, 'Year level must be between 1 and 8.'),
  term_sequence: z.number({ error: 'Select a term position.' }).int('Use a whole term position.').min(1, 'Term position must be between 1 and 3.').max(3, 'Term position must be between 1 and 3.'),
}).strict()

export type CurriculumTermValues = z.infer<typeof curriculumTermSchema>
