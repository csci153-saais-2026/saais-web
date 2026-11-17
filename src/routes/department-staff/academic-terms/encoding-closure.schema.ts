import { z } from 'zod'

export const encodingClosureFormSchema = z
  .object({
    closure_note: z
      .string()
      .trim()
      .max(2000, 'Closure note must be 2000 characters or fewer.'),
  })
  .strict()

export type EncodingClosureFormValues = z.infer<
  typeof encodingClosureFormSchema
>

export function encodingClosureNote(
  values: EncodingClosureFormValues,
): string | null {
  const parsed = encodingClosureFormSchema.parse(values)
  return parsed.closure_note || null
}
