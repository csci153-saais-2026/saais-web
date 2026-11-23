import { z } from "zod";

export const reassignmentSchema = z
  .object({
    adviser_id: z.uuid("Select an active adviser in this department."),
    effective_since: z.iso.date("Choose a valid effective date."),
    reason: z
      .string()
      .trim()
      .min(1, "Add a non-whitespace reason for this reassignment.")
      .max(2000, "Use at most 2,000 characters for the reason."),
  })
  .strict();

export type ReassignmentValues = z.infer<typeof reassignmentSchema>;
