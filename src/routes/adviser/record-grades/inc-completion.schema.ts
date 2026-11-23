import { z } from "zod";
import { REASON_MAX_LENGTH, REASON_MAX_MESSAGE } from "@/lib/validation/limits";

export const gradeInputSchema = z
  .string()
  .regex(/^\d+(?:\.\d{1,2})?$/, "Choose a valid grade.")
  .transform(Number)
  .pipe(
    z
      .number()
      .min(1, "Grade must be at least 1.00.")
      .max(5, "Grade must be at most 5.00.")
      .multipleOf(0.25, "Use quarter-point grade increments."),
  );

export const gradeReasonSchema = z
  .string()
  .trim()
  .min(1, "Enter a reason.")
  .max(REASON_MAX_LENGTH, REASON_MAX_MESSAGE);

export const incCompletionSchema = z.object({
  completionGrade: gradeInputSchema,
  reason: gradeReasonSchema,
});
