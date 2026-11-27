import type { ComponentProps } from "react";
import { isOnGradeScale } from "@/lib/validation/grade-scale";

const grades = Array.from({ length: 17 }, (_, index) =>
  (1 + index * 0.25).toFixed(2),
);

export function GradeSelect({
  includeStatuses = false,
  allowDrop = false,
  disableDrop = false,
  minGrade,
  maxGrade,
  placeholder = "Select grade",
  className = "",
  ...props
}: ComponentProps<"select"> & {
  includeStatuses?: boolean;
  allowDrop?: boolean;
  disableDrop?: boolean;
  minGrade?: number;
  maxGrade?: number;
  placeholder?: string;
}) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-border bg-card px-3 py-2 ${className}`}
    >
      <option value="">{placeholder}</option>
      {grades
        .filter(
          (grade) =>
            // A stored off-scale grade stays visible; it cannot be newly picked.
            (isOnGradeScale(Number(grade)) ||
              (props.value != null && Number(props.value) === Number(grade))) &&
            (minGrade == null || Number(grade) >= minGrade) &&
            (maxGrade == null || Number(grade) <= maxGrade),
        )
        .map((grade) => (
          <option key={grade} value={grade}>
            {grade}
          </option>
        ))}
      {includeStatuses && <option value="inc">INC</option>}
      {(includeStatuses || allowDrop) && (
        <option value="dr" disabled={disableDrop}>
          DR
        </option>
      )}
    </select>
  );
}
