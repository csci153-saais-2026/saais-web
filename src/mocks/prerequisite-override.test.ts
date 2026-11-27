import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  getMockDatabase,
  MOCK_IDS,
  MOCK_PERSONAS,
  resetMockDatabase,
} from "./index";
import { saaisMockServer } from "./node";

const base = "https://saais-mock.supabase.co";

beforeAll(() => saaisMockServer.listen());
afterEach(() => {
  saaisMockServer.resetHandlers();
  resetMockDatabase();
});
afterAll(() => saaisMockServer.close());

describe("mock strict prerequisite check on grade writes", () => {
  it.each(["record-grades", "encode-grades"])(
    "%s refuses an unmet prerequisite until overridden with a reason",
    async (operation) => {
      const db = getMockDatabase();
      const studentId = MOCK_IDS.studentPrimary;
      const termId = MOCK_IDS.term2026Sem1Open;
      const taken = new Set(
        db.attemptResults
          .filter((a) => a.student_id === studentId)
          .map(
            (a) =>
              db.courseOfferings.find((o) => o.id === a.course_offering_id)
                ?.course_id,
          ),
      );
      const offering = db.courseOfferings.find(
        (o) => o.school_term_id === termId && !taken.has(o.course_id),
      )!;
      db.prerequisites.push({
        ...db.prerequisites[0]!,
        id: "unmet-prerequisite",
        course_id: offering.course_id,
        prerequisite_course_id: "never-taken-course",
        type: "strict",
      });
      const send = (extra: object) => {
        const row = { course_offering_id: offering.id, ...extra };
        return fetch(
          `${base}/functions/v1/students/${studentId}/${operation}`,
          {
            method: "POST",
            headers: {
              apikey: "test-key",
              Authorization: `Bearer ${MOCK_PERSONAS.adviser.token}`,
            },
            body: JSON.stringify(
              operation === "record-grades"
                ? { school_term_id: termId, ...row }
                : { school_term_id: termId, rows: [row] },
            ),
          },
        );
      };

      const refused = await send({});
      expect(refused.status).toBe(409);
      expect((await refused.json()).code).toBe("PREREQUISITE_NOT_MET");
      expect(
        (await send({ continue_with_prerequisite_override: true })).status,
      ).toBe(409);
      expect(
        (
          await send({
            continue_with_prerequisite_override: true,
            prerequisite_override_reason: "Taken together",
          })
        ).status,
      ).toBe(200);
    },
  );
});
