import type { ApiSchema } from "@/lib/api";
import { outcomeRemark } from "./grade-encoding";

export type ExistingDraft = {
  midterm: string;
  final: string;
  instructor: string;
};
export const emptyDraft = (
  attempt: ApiSchema<"AttemptResult">,
): ExistingDraft => ({
  midterm: "",
  final: "",
  instructor: attempt.instructor ?? "",
});
export const draftChanged = (
  attempt: ApiSchema<"AttemptResult">,
  draft: ExistingDraft,
) =>
  !!(
    draft.midterm ||
    draft.final ||
    draft.instructor.trim() !== (attempt.instructor ?? "")
  );
export function draftPayload(
  attempt: ApiSchema<"AttemptResult">,
  draft: ExistingDraft,
): ApiSchema<"EncodeTermGradeRowInput"> {
  const remark = outcomeRemark(draft.final);
  return {
    attempt_id: attempt.id,
    course_offering_id: attempt.course_offering_id,
    ...(draft.midterm === "dr"
      ? { midterm_status: "dr", status: "dr" }
      : draft.midterm
        ? { midterm_status: "graded", midterm_grade: Number(draft.midterm) }
        : {}),
    ...(draft.final === "inc"
      ? { status: "inc" }
      : draft.final === "dr"
        ? { status: "dr" }
        : draft.final
          ? { final_grade: Number(draft.final) }
          : {}),
    ...(draft.instructor.trim() &&
    draft.instructor.trim() !== (attempt.instructor ?? "")
      ? { instructor: draft.instructor.trim() }
      : {}),
    ...(remark ? { remark } : {}),
    continue_with_prerequisite_override: false,
  };
}
