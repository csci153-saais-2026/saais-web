import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";

let api: typeof import("./student-checklist.api");
let hooks: typeof import("./use-student-checklist");

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeAll(async () => {
  saaisMockServer.listen();
  api = await import("./student-checklist.api");
  hooks = await import("./use-student-checklist");
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

describe("student-checklist API helpers and hooks (MSW)", () => {
  it("fetches checklist slots and records PDF export audit event", async () => {
    loginAsMockPersona("student");

    const slots = await api.fetchStudentChecklist(MOCK_IDS.studentPrimary);
    expect(Array.isArray(slots)).toBe(true);
    expect(slots.length).toBeGreaterThan(0);

    await expect(
      api.recordChecklistExportEvent(MOCK_IDS.studentPrimary),
    ).resolves.toBeUndefined();
  });

  it("reads every checklist slot past the default page of 20", async () => {
    loginAsMockPersona("student");
    const rows = Array.from({ length: 125 }, (_, index) => ({
      curriculum_term_course_id: `slot-${index}`,
    }));
    saaisMockServer.use(
      http.get("*/functions/v1/students/:id/checklist", ({ request }) => {
        const query = new URL(request.url).searchParams;
        const offset = Number(query.get("offset") ?? 0);
        const page = rows.slice(
          offset,
          offset + Number(query.get("limit") ?? 20),
        );
        return HttpResponse.json(page, {
          headers: {
            "Content-Range": `${offset}-${offset + page.length - 1}/${rows.length}`,
          },
        });
      }),
    );

    const slots = await api.fetchStudentChecklist(MOCK_IDS.studentPrimary);
    expect(slots).toHaveLength(125);
  });

  it("resolves useStudentChecklist and useRecordChecklistExport hooks", async () => {
    loginAsMockPersona("student");
    const wrapper = createQueryWrapper();

    const { result: checklistHook } = renderHook(
      () => hooks.useStudentChecklist(MOCK_IDS.studentPrimary),
      { wrapper },
    );
    const { result: exportHook } = renderHook(
      () => hooks.useRecordChecklistExport(MOCK_IDS.studentPrimary),
      { wrapper },
    );

    await waitFor(() => {
      expect(checklistHook.current.isSuccess).toBe(true);
    });
    expect((checklistHook.current.data ?? []).length).toBeGreaterThan(0);

    await exportHook.current.mutateAsync("Exported checklist PDF in test");
    await waitFor(() => {
      expect(exportHook.current.isSuccess).toBe(true);
    });
  });
});
