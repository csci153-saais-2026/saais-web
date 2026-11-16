import { z } from 'zod'
import type { ApiSchema } from '@/lib/api'

export const MAX_STUDENT_IMPORT_ROWS = 500
export const MAX_STUDENT_IMPORT_FILE_SIZE = 10 * 1024 * 1024

export const STUDENT_IMPORT_HEADERS = [
  'student_number',
  'full_name',
  'email',
  'program_id',
  'curriculum_version_id',
  'adviser_id',
  'entry_year',
] as const

export const REQUIRED_STUDENT_IMPORT_HEADERS = STUDENT_IMPORT_HEADERS.slice(
  0,
  6,
)

export const studentImportRowSchema = z
  .object({
    row_number: z.number().int().min(1),
    student_number: z
      .string()
      .trim()
      .min(1, 'Student number is required.')
      .max(64, 'Student number must be 64 characters or fewer.'),
    full_name: z
      .string()
      .trim()
      .min(1, 'Full name is required.')
      .max(150, 'Full name must be 150 characters or fewer.'),
    email: z
      .string()
      .trim()
      .email('Enter a valid email address.')
      .max(254, 'Email must be 254 characters or fewer.'),
    program_id: z.uuid('Program ID must be a UUID.'),
    curriculum_version_id: z.uuid('Curriculum version ID must be a UUID.'),
    adviser_id: z.uuid('Adviser ID must be a UUID.'),
    entry_year: z
      .number()
      .int('Entry year must be a whole number.')
      .min(1900, 'Entry year must be 1900 or later.')
      .max(3000, 'Entry year must be 3000 or earlier.')
      .nullable()
      .optional(),
  })
  .strict() satisfies z.ZodType<ApiSchema<'StudentBatchImportRowInput'>>

