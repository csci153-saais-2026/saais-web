import { z } from "zod";
import { REASON_MAX_LENGTH, REASON_MAX_MESSAGE } from "@/lib/validation/limits";

export const encodingClosureFormSchema = z
  .object({
    closure_note: z.string().trim().max(REASON_MAX_LENGTH, REASON_MAX_MESSAGE),
  })
  .strict();

export type EncodingClosureFormValues = z.infer<
  typeof encodingClosureFormSchema
>;

export function encodingClosureNote(
  values: EncodingClosureFormValues,
): string | null {
  const parsed = encodingClosureFormSchema.parse(values);
  return parsed.closure_note || null;
}
