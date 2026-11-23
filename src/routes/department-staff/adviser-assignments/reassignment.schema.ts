import { z } from "zod";
import { REASON_MAX_LENGTH, REASON_MAX_MESSAGE } from "@/lib/validation/limits";

export const reassignmentSchema = z
  .object({
    adviser_id: z.uuid("Select an active adviser in this department."),
    effective_since: z.iso.date("Choose a valid effective date."),
    reason: z
      .string()
      .trim()
      .min(1, "Add a non-whitespace reason for this reassignment.")
      .max(REASON_MAX_LENGTH, REASON_MAX_MESSAGE),
  })
  .strict();

export type ReassignmentValues = z.infer<typeof reassignmentSchema>;
