import { z } from "zod";
import type { ApiSchema } from "@/lib/api/types";

export const gradeFlagIssueTypes = [
  "incorrect_grade",
  "wrong_grade",
  "missing_grade",
  "wrong_course_credited",
  "wrong_status",
  "missing_completion",
  "other",
] as const;

export const gradeFlagReportedStages = ["midterm", "final"] as const;

/**
 * Client-side Zod schema for student grade flag submission,
 * mirroring `ApiSchema<'GradeFlagCreateRequest'>`.
 */
export const gradeFlagSchema = z.object({
  attempt_id: z.string().min(1, "Invalid attempt reference."),
  reported_stage: z.enum(gradeFlagReportedStages).nullable().optional(),
  reported_grade_text: z.string().max(64).nullable().optional(),
  issue_type: z.enum(gradeFlagIssueTypes),
  details: z
    .string()
    .trim()
    .min(1, "Please describe the grade issue before submitting.")
    .max(2000, "Details must be 2,000 characters or fewer."),
}) satisfies z.ZodType<ApiSchema<"GradeFlagCreateRequest">>;

export type GradeFlagValues = z.infer<typeof gradeFlagSchema>;
