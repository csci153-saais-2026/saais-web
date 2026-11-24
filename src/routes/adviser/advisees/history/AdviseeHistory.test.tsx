import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import type { ApiSchema } from "@/lib/api";
import AdviseeHistory from "./AdviseeHistory";
import { getStudentHistory } from "./history.api";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "adviser-one" }, activeRole: "adviser" }),
}));
vi.mock("../../Adviser", () => ({
  AdviserPage: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("./history.api", () => ({ getStudentHistory: vi.fn() }));
beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("filters the selected student’s audit entries by search and actor", async () => {
  vi.mocked(getStudentHistory).mockResolvedValue([
    {
      id: "1",
      student_id: "student-one",
      actor_id: "student-one",
      actor_role: "student",
      actor_name: "Student",
      action: "plan.viewed",
      details_summary: "Viewed plan",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "2",
      student_id: "student-one",
      actor_id: "adviser-one",
      actor_role: "adviser",
      actor_name: "Adviser",
      action: "note.created",
      details_summary: "Added note",
      created_at: "2026-01-02T00:00:00Z",
    },
  ] as ApiSchema<"AuditLogEntry">[]);
  render(
    <MemoryRouter initialEntries={["/advisee/student-one/history"]}>
      <Routes>
        <Route path="/advisee/:id/history" element={<AdviseeHistory />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText("Note created")).toBeTruthy();
  expect(getStudentHistory).toHaveBeenCalledWith("student-one");
  fireEvent.change(screen.getByLabelText("Search the audit log"), {
    target: { value: "note" },
  });
  expect(screen.queryByText("Plan viewed")).toBeNull();
  fireEvent.click(screen.getByRole("combobox", { name: "Filter by actor" }));
  fireEvent.click(screen.getByRole("option", { name: "Advisee actions" }));
  expect(screen.queryByText("Note created")).toBeNull();
});

it("shows audit entries newest first", async () => {
  vi.mocked(getStudentHistory).mockResolvedValue([
    {
      id: "old",
      student_id: "student-one",
      actor_id: "student-one",
      actor_role: "student",
      actor_name: "Student",
      action: "plan.viewed",
      details_summary: "Oldest entry",
      created_at: new Date(2026, 0, 1, 12).toISOString(),
    },
    {
      id: "new",
      student_id: "student-one",
      actor_id: "adviser-one",
      actor_role: "adviser",
      actor_name: "Adviser",
      action: "note.created",
      details_summary: "Newest entry",
      created_at: new Date(2026, 0, 2, 12).toISOString(),
    },
  ] as ApiSchema<"AuditLogEntry">[]);

  render(
    <MemoryRouter initialEntries={["/advisee/student-one/history"]}>
      <Routes>
        <Route path="/advisee/:id/history" element={<AdviseeHistory />} />
      </Routes>
    </MemoryRouter>,
  );

  await screen.findByText("Newest entry");
  const rows = screen.getAllByRole("row");
  expect(rows[1].textContent).toContain("02 Jan 2026");
  expect(rows[1].textContent).toContain("Newest entry");
  expect(rows[2].textContent).toContain("01 Jan 2026");
  expect(rows[2].textContent).toContain("Oldest entry");
});
