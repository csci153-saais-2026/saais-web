import { z } from "zod";

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
  .max(2000, "Use at most 2,000 characters.");

export const incCompletionSchema = z.object({
  completionGrade: gradeInputSchema,
  reason: gradeReasonSchema,
});
