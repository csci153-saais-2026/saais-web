import { z } from "zod";
import type {
  Course,
  CourseOfferingInsert,
  CourseOfferingUpdate,
} from "./course-offerings.api";

export const courseOfferingFormSchema = z
  .object({
    course_id: z.string().uuid("Choose a course."),
    section: z
      .string()
      .trim()
      .max(64, "Section must be 64 characters or fewer."),
    schedule: z
      .string()
      .trim()
      .max(150, "Schedule must be 150 characters or fewer."),
    instructor: z
      .string()
      .trim()
      .max(150, "Instructor must be 150 characters or fewer."),
    is_by_request: z.boolean(),
  })
  .strict();

export type CourseOfferingFormValues = z.infer<typeof courseOfferingFormSchema>;

function nullableText(value: string): string | null {
  return value.trim() || null;
}

export function courseOfferingInsertRequest(
  schoolTermId: string,
  values: CourseOfferingFormValues,
  requiresByRequest: boolean,
): CourseOfferingInsert {
  const parsed = courseOfferingFormSchema.parse(values);
  return {
    school_term_id: schoolTermId,
    course_id: parsed.course_id,
    section: nullableText(parsed.section),
    schedule: nullableText(parsed.schedule),
    instructor: nullableText(parsed.instructor),
    is_by_request: parsed.is_by_request || requiresByRequest,
  };
}

export function courseOfferingUpdateRequest(
  values: CourseOfferingFormValues,
  requiresByRequest: boolean,
): CourseOfferingUpdate {
  const parsed = courseOfferingFormSchema.parse(values);
  return {
    section: nullableText(parsed.section),
    schedule: nullableText(parsed.schedule),
    instructor: nullableText(parsed.instructor),
    is_by_request: parsed.is_by_request || requiresByRequest,
  };
}

export function isRequiredDiscontinuedCourse(
  course: Course,
  requiredCourseIds: ReadonlySet<string>,
  departmentId: string,
): boolean {
  return (
    course.department_id === departmentId &&
    course.status === "discontinued" &&
    requiredCourseIds.has(course.id)
  );
}
