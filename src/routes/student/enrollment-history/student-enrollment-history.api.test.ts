import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
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

    const result = await api.fetchStudentEnrollmentHistory(
      MOCK_IDS.studentPrimary,
    );

    expect(result.attempts.length).toBeGreaterThan(0);
    expect(Object.keys(result.offeringDetails).length).toBeGreaterThan(0);
    expect(Object.keys(result.slotLabels).length).toBeGreaterThan(0);
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
