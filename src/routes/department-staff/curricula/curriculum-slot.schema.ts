import { z } from "zod";
import type { ApiSchema } from "@/lib/api";

const units = z
  .number({ error: "Enter nominal requirement units." })
  .nonnegative("Enter zero or more units.")
  .multipleOf(0.25, "Use quarter-unit increments (for example, 3.25).");

export const curriculumSlotSchema = z
  .object({
    slot_type: z.enum(["required", "elective", "ge", "pe", "nstp"]),
    course_id: z.union([z.uuid("Select an active course."), z.literal("")]),
    slot_label: z.string().trim().max(150, "Use at most 150 characters."),
    nominal_units: units,
  })
  .strict()
  .superRefine((values, context) => {
    if (!values.course_id) {
      context.addIssue({
        code: "custom",
        path: ["course_id"],
        message: "Select an active course.",
      });
    }
  });

export type CurriculumSlotValues = z.infer<typeof curriculumSlotSchema>;

export function curriculumSlotRequest(
  termId: string,
  values: CurriculumSlotValues,
): ApiSchema<"CurriculumTermCourseInsert"> {
  const parsed = curriculumSlotSchema.parse(values);
  return {
    curriculum_term_id: termId,
    course_id: parsed.course_id || null,
    is_elective_slot: parsed.slot_type === "elective",
    slot_type: parsed.slot_type,
    slot_label: parsed.slot_label || null,
    nominal_units: parsed.nominal_units,
  };
}

export function curriculumSlotUpdateRequest(
  values: CurriculumSlotValues,
): ApiSchema<"CurriculumTermCourseUpdate"> {
  const parsed = curriculumSlotSchema.parse(values);
  return {
    course_id: parsed.course_id || null,
    is_elective_slot: parsed.slot_type === "elective",
    slot_type: parsed.slot_type,
    slot_label: parsed.slot_label || null,
    nominal_units: parsed.nominal_units,
  };
}
