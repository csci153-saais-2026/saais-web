import { beforeEach, describe, expect, it } from "vitest";
import { getMockDatabase, resetMockDatabase } from "./store";
import { MOCK_IDS } from "./personas";

describe("shared student personas", () => {
  beforeEach(() => resetMockDatabase());

  it("derives curriculum enrollment counts from active student assignments", () => {
    const db = getMockDatabase();

    for (const curriculum of db.curriculumVersions) {
      expect(curriculum.enrolled_student_count).toBe(
        db.studentCurriculumAssignments.filter(
          (assignment) =>
            assignment.curriculum_version_id === curriculum.id &&
            assignment.end_date === null,
        ).length,
      );
    }
    expect(
      db.curriculumVersions.find(
        (item) => item.id === MOCK_IDS.curriculumBscs2020,
      )?.enrolled_student_count,
    ).toBeGreaterThan(0);
  });
});
