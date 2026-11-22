import { describe, expect, it } from "vitest";
import type { ApiSchema } from "@/lib/api";
import { computeGradeDistribution } from "./build-faculty-report";

const attempt = (
  id: string,
  values: Partial<ApiSchema<"AttemptResult">>,
): ApiSchema<"AttemptResult"> =>
  ({
    id,
    student_id: "student-1",
    course_offering_id: `offering-${id}`,
    recorded_status: "graded",
    midterm_grade: null,
    final_grade: null,
    completion_grade: null,
    effective_status: "graded",
    is_lapsed_inc: false,
    units_attempted: 3,
    revision: 1,
    is_repeated: false,
    counts_toward_cumulative_gwa: true,
    gwa_grade: null,
    ...values,
  }) as ApiSchema<"AttemptResult">;

describe("computeGradeDistribution", () => {
  it("excludes ungraded enrollments from the eligible population", () => {
    const bands = computeGradeDistribution(
      [
        attempt("graded", { final_grade: 1.25 }),
        attempt("enrolled", { effective_status: "enrolled" as never }),
      ],
      new Set(["student-1"]),
    );
    expect(bands[0].percent).toBe(100);
    expect(bands[0].detail).toBe("1 grades");
  });

  it("includes INC, DR, NA, and graded attempts in the distribution", () => {
    const bands = computeGradeDistribution(
      [
        attempt("grade", { final_grade: 2 }),
        attempt("inc", { effective_status: "inc" }),
        attempt("dr", { effective_status: "dr" }),
        attempt("na", { effective_status: "na" }),
        attempt("lapsed", { is_lapsed_inc: true }),
      ],
      new Set(["student-1"]),
    );
    expect(bands[1].percent).toBe(20);
    expect(bands[4].percent).toBe(80);
    expect(bands[4].detail).toBe("4 grades");
  });
});
