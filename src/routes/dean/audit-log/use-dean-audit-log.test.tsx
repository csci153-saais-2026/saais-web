import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDeanAuditLog } from "./use-dean-audit-log";
import { getDeanAuditLogEntries } from "./audit-log.api";

vi.mock("./audit-log.api", () => ({ getDeanAuditLogEntries: vi.fn() }));
vi.mock("@/routes/dean/shared/use-dean-faculty", () => ({
  useDeanFaculty: () => ({
    facultyName: "Engineering",
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

afterEach(cleanup);

describe("dean audit action labels", () => {
  it("labels sign-ins and changes from the contract categories", async () => {
    const categories = [
      "sign_in",
      "grade_update",
      "override",
      "note_change",
      "record_view",
      null,
    ];
    vi.mocked(getDeanAuditLogEntries).mockResolvedValue(
      categories.map((action_category) => ({
        id: String(action_category),
        action_category,
        created_at: "2026-11-20T00:00:00Z",
        actor_name: "Someone",
        details_summary: "",
      })) as Awaited<ReturnType<typeof getDeanAuditLogEntries>>,
    );
    const client = new QueryClient();
    const { result } = renderHook(() => useDeanAuditLog(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.entries).toHaveLength(6));
    expect(result.current.entries.map((entry) => entry.action)).toEqual([
      "Sign-in",
      "Change",
      "Change",
      "Change",
      "View",
      "Change",
    ]);
  });
});
