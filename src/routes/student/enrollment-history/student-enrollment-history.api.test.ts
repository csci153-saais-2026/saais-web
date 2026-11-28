import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";

let api: typeof import("./student-enrollment-history.api");
let hooks: typeof import("./use-student-enrollment-history");

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeAll(async () => {
  saaisMockServer.listen();
  api = await import("./student-enrollment-history.api");
  hooks = await import("./use-student-enrollment-history");
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

describe("student-enrollment-history API helper and hook (MSW)", () => {
  it("fetches attempts with hydrated offeringDetails and slotLabels", async () => {
    loginAsMockPersona("student");
    const reads = new Map<string, URLSearchParams>();
    const resources = [
      "course_offering",
      "course",
      "school_term",
      "curriculum_term_course",
    ];
    saaisMockServer.use(
      ...resources.map((resource) =>
        http.get(`*/rest/v1/${resource}`, ({ request }) => {
          reads.set(resource, new URL(request.url).searchParams);
        }),
      ),
    );

    const result = await api.fetchStudentEnrollmentHistory(
      MOCK_IDS.studentPrimary,
    );

    expect(result.attempts.length).toBeGreaterThan(0);
    expect(Object.keys(result.offeringDetails).length).toBeGreaterThan(0);
    expect(Object.keys(result.slotLabels).length).toBeGreaterThan(0);
    const offeringIds = new Set(
      result.attempts.map((attempt) => attempt.course_offering_id),
    );
    const slotIds = new Set(
      result.attempts
        .map((attempt) => attempt.curriculum_term_course_id)
        .filter(Boolean),
    );
    function readIds(resource: string) {
      const filter = reads.get(resource)?.get("id");
      expect(filter).toMatch(/^in\.\(.+\)$/);
      return new Set(filter?.slice(4, -1).split(","));
    }
    expect(readIds("course_offering")).toEqual(offeringIds);
    expect(readIds("curriculum_term_course")).toEqual(slotIds);
    expect(readIds("course").size).toBeGreaterThan(0);
    expect(readIds("school_term").size).toBeGreaterThan(0);
  });

  it("hydrates useStudentEnrollmentHistory via React Query", async () => {
    loginAsMockPersona("student");

    const { result } = renderHook(
      () => hooks.useStudentEnrollmentHistory(MOCK_IDS.studentPrimary),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.attempts.length).toBeGreaterThan(0);
  });
});
