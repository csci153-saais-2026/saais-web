import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
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
