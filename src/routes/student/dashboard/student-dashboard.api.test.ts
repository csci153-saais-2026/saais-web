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

let api: typeof import("./student-dashboard.api");
let hooks: typeof import("./use-student-dashboard");

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeAll(async () => {
  saaisMockServer.listen();
  api = await import("./student-dashboard.api");
  hooks = await import("./use-student-dashboard");
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

describe("student-dashboard API helpers and useStudentDashboard (MSW)", () => {
  it("fetches academic summary, plan items, advising notes, and adviser assignments for MOCK_PERSONAS.student", async () => {
    loginAsMockPersona("student");
    const studentId = MOCK_PERSONAS.student.profileId;

    const [summary, planItems, notes, assignments] = await Promise.all([
      api.fetchStudentAcademicSummary(studentId),
      api.fetchStudentPlanItems(studentId),
      api.fetchStudentAdvisingNotes(studentId),
      api.fetchStudentAdviserAssignments(studentId),
    ]);

    expect(summary.student_id).toBe(MOCK_IDS.studentPrimary);
    expect(Array.isArray(planItems)).toBe(true);
    expect(Array.isArray(notes)).toBe(true);
    expect(Array.isArray(assignments)).toBe(true);
    expect(assignments.length).toBeGreaterThan(0);
  });

  it("hydrates useStudentDashboard via React Query", async () => {
    loginAsMockPersona("student");

    const { result } = renderHook(
      () => hooks.useStudentDashboard(MOCK_IDS.studentPrimary),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.data?.summary.student_id).toBe(
      MOCK_IDS.studentPrimary,
    );
    expect(result.current.data?.adviserAssignments.length).toBeGreaterThan(0);
  });
});
