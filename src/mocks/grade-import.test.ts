import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createSaaisApiClient, type ApiSchema } from "@/lib/api";
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";

const client = () =>
  createSaaisApiClient({
    baseUrl: "https://saais-mock.supabase.co",
    apiKey: "mock",
    mode: "mock",
  });
beforeAll(() => saaisMockServer.listen());
afterEach(() => {
  saaisMockServer.resetHandlers();
  resetMockDatabase();
  logoutMockPersona();
});
afterAll(() => saaisMockServer.close());

describe("grade import safeguards", () => {
  it("validates both modes and prevents replacing existing final grades", async () => {
    loginAsMockPersona("adviser");
    const db = getMockDatabase();
    const student = db.profiles.find(
      (p) => p.email === "sample.student01@vsu.edu.ph",
    )!;
    const attempt = db.attemptResults.find((a) => a.student_id === student.id)!;
    const offering = db.courseOfferings.find(
      (o) => o.id === attempt.course_offering_id,
    )!;
    const course = db.courses.find((c) => c.id === offering.course_id)!;
    const term = db.schoolTerms.find((t) => t.id === offering.school_term_id)!;
    term.is_locked = false;
    attempt.final_grade = 2.5;
    attempt.recorded_status = "passed";
    attempt.effective_status = "passed";
    const row = {
      row_number: 1,
      student_number: student.student_number!,
      course_code: course.code,
      final_grade: 2,
    };
    for (const mode of ["preview", "commit"] as const) {
      const result = await client().POST("/functions/v1/grades/import", {
        body: { mode, school_term_id: term.id, rows: [row] },
      });
      expect(result.data?.error_count).toBe(1);
      expect(result.data?.results[0].message).toMatch(/correction/i);
    }
    expect(
      db.attemptResults.find((a) => a.id === attempt.id)?.final_grade,
    ).toBe(2.5);
    for (const mode of ["preview", "commit"] as const) {
      const result = await client().POST("/functions/v1/grades/import", {
        body: {
          mode,
          school_term_id: term.id,
          rows: [{ ...row, final_grade: 2.1 }],
        },
      });
      expect(result.data?.error_count).toBe(1);
    }
  });
  it("uses the selected term deadline for an imported INC", async () => {
    loginAsMockPersona("adviser");
    const db = getMockDatabase();
    const student = db.profiles.find(
      (p) => p.email === "sample.student01@vsu.edu.ph",
    )!;
    const offering = db.courseOfferings.find(
      (o) =>
        o.school_term_id === MOCK_IDS.term2026Sem1Open &&
        !db.attemptResults.some(
          (a) => a.student_id === student.id && a.course_offering_id === o.id,
        ),
    )!;
    const course = db.courses.find((c) => c.id === offering.course_id)!;
    const term = db.schoolTerms.find((t) => t.id === offering.school_term_id)!;
    const row: ApiSchema<"GradeBatchImportRequest">["rows"][number] = {
      row_number: 1,
      student_number: student.student_number!,
      course_code: course.code,
      status: "inc",
    };
    const result = await client().POST("/functions/v1/grades/import", {
      body: { mode: "commit", school_term_id: term.id, rows: [row] },
    });
    expect(result.data?.imported_count).toBe(1);
    expect(
      db.attemptResults.find(
        (a) =>
          a.student_id === student.id && a.course_offering_id === offering.id,
      )?.inc_deadline,
    ).toBe(term.default_inc_deadline);
  });
  it("rejects an INC import for an already resolved attempt in both modes", async () => {
    loginAsMockPersona("adviser");
    const db = getMockDatabase();
    const attempt = db.attemptResults.find(
      (a) => a.id === MOCK_IDS.attemptPhEd11IncResolved,
    )!;
    const student = db.profiles.find((p) => p.id === attempt.student_id)!;
    const offering = db.courseOfferings.find(
      (o) => o.id === attempt.course_offering_id,
    )!;
    const course = db.courses.find((c) => c.id === offering.course_id)!;
    const term = db.schoolTerms.find((t) => t.id === offering.school_term_id)!;
    term.is_locked = false;
    const before = structuredClone(attempt);
    const row = {
      row_number: 1,
      student_number: student.student_number!,
      course_code: course.code,
      status: "inc" as const,
    };
    for (const mode of ["preview", "commit"] as const) {
      const result = await client().POST("/functions/v1/grades/import", {
        body: { mode, school_term_id: term.id, rows: [row] },
      });
      expect(result.data?.results[0].message).toMatch(
        /INC completion correction/,
      );
      expect(result.data?.error_count).toBe(1);
    }
    expect(db.attemptResults.find((a) => a.id === attempt.id)).toEqual(before);
    expect(db.incResolutions.some((r) => r.attempt_id === attempt.id)).toBe(
      true,
    );
  });
});
