import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  MOCK_PERSONAS,
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";

let api: typeof import("./student-grades.api");
let hooks: typeof import("./use-student-grades");

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeAll(async () => {
  saaisMockServer.listen();
  api = await import("./student-grades.api");
  hooks = await import("./use-student-grades");
});

afterEach(() => {
  cleanup();
  saaisMockServer.resetHandlers();
  resetMockDatabase();
  logoutMockPersona();
});

afterAll(() => {
  saaisMockServer.close();
});

describe("student-grades API helpers and hooks (MSW)", () => {
  it("requests only the grade terms, course references, and student organization metadata", async () => {
    loginAsMockPersona("student");
    const reads = new Map<string, URLSearchParams>();
    const resources = [
      "school_term",
      "course_offering",
      "course",
      "program",
      "curriculum_version",
      "department",
      "faculty",
    ];
    saaisMockServer.use(
      ...resources.map((resource) =>
        http.get(`*/rest/v1/${resource}`, ({ request }) => {
          reads.set(resource, new URL(request.url).searchParams);
        }),
      ),
    );
    const studentId = MOCK_IDS.studentPrimary;
    const terms = await api.fetchStudentGrades(studentId);
    const schoolTermIds = terms.map((term) => term.school_term_id);
    const offeringIds = terms.flatMap((term) =>
      term.attempts.map((attempt) => attempt.course_offering_id),
    );

    const metadata = await api.fetchStudentGradesMetadata(studentId, {
      schoolTermIds,
      offeringIds,
    });

    expect(metadata.courses.length).toBeGreaterThan(0);
    expect(reads.get("school_term")?.get("id")).toBe(
      `in.(${[...new Set(schoolTermIds)].join(",")})`,
    );
    expect(reads.get("course_offering")?.get("id")).toBe(
      `in.(${[...new Set(offeringIds)].join(",")})`,
    );
    const courses = [
      ...new Set(metadata.offerings.map((offering) => offering.course_id)),
    ];
    expect(reads.get("course")?.get("id")).toBe(`in.(${courses.join(",")})`);
    expect(metadata.org).not.toBeNull();
    expect(reads.get("program")?.get("id")).toBe(
      `eq.${metadata.org?.program_id}`,
    );
    expect(reads.get("curriculum_version")?.get("id")).toBe(
      `eq.${metadata.org?.curriculum_version_id}`,
    );
    expect(reads.get("department")?.get("id")).toBe(
      `eq.${metadata.org?.department_id}`,
    );
    expect(reads.get("faculty")?.get("id")).toBe(
      `eq.${metadata.org?.faculty_id}`,
    );
  });

  it("fetches term grades, lists flags, creates a grade flag, and records export event", async () => {
    loginAsMockPersona("student");
    const studentId = MOCK_PERSONAS.student.profileId;

    const [terms, initialFlags] = await Promise.all([
      api.fetchStudentGrades(studentId),
      api.fetchStudentGradeFlags(studentId),
    ]);

    expect(Array.isArray(terms)).toBe(true);
    expect(terms.length).toBeGreaterThan(0);
    expect(Array.isArray(initialFlags)).toBe(true);

    const created = await api.createStudentGradeFlag(studentId, {
      attempt_id: MOCK_IDS.attemptCsci101Passed,
      reported_stage: "final",
      reported_grade_text: "1.75",
      issue_type: "wrong_grade",
      details: "Class card showed 1.50.",
    });
    expect(created.attempt_id).toBe(MOCK_IDS.attemptCsci101Passed);
    expect(created.status).toBe("open");

    await expect(
      api.recordGradesExportEvent(studentId),
    ).resolves.toBeUndefined();
  });

  it("hydrates useStudentGrades, useStudentGradeFlags, and submits via useCreateGradeFlag", async () => {
    loginAsMockPersona("student");
    const wrapper = createQueryWrapper();

    const { result: gradesHook } = renderHook(
      () => hooks.useStudentGrades(MOCK_IDS.studentPrimary),
      { wrapper },
    );
    const { result: flagsHook } = renderHook(
      () => hooks.useStudentGradeFlags(MOCK_IDS.studentPrimary),
      { wrapper },
    );
    const { result: createFlagHook } = renderHook(
      () => hooks.useCreateGradeFlag(MOCK_IDS.studentPrimary),
      { wrapper },
    );

    await waitFor(() => {
      expect(gradesHook.current.isSuccess).toBe(true);
      expect(flagsHook.current.isSuccess).toBe(true);
    });

    const created = await createFlagHook.current.mutateAsync({
      attempt_id: MOCK_IDS.attemptCsci102Inc,
      reported_stage: "final",
      reported_grade_text: "INC",
      issue_type: "missing_completion",
      details: "Completion form submitted last week.",
    });
    expect(created.attempt_id).toBe(MOCK_IDS.attemptCsci102Inc);
  });
});
