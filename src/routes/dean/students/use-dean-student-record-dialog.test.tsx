import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { StudentRecordDialog } from "@/components/features/student-record-dialog";
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";
import { DeanStudentAuditTab } from "@/routes/dean/students/DeanStudentAuditTab";
import { DeanStudentChecklistTab } from "@/routes/dean/students/DeanStudentChecklistTab";
import { DeanStudentGradesTab } from "@/routes/dean/students/DeanStudentGradesTab";
import { useDeanStudentRecordDialog } from "@/routes/dean/students/use-dean-student-record-dialog";
import type { DeanStudentSummary } from "@/routes/dean/types";

vi.mock("@/lib/api", async (importOriginal) => {
  const api = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...api,
    apiClient: api.createSaaisApiClient({
      baseUrl: "https://saais-mock.supabase.co",
      apiKey: "mock",
      mode: "mock",
      fetch: (...args) => globalThis.fetch(...args),
    }),
  };
});

function TestHarness({
  student,
  onOpenChange,
}: {
  student: DeanStudentSummary | null;
  onOpenChange: (open: boolean) => void;
}) {
  const recordDialog = useDeanStudentRecordDialog(student);
  return (
    <StudentRecordDialog
      open={student !== null}
      onOpenChange={onOpenChange}
      student={recordDialog.headerStudent}
      activeTab={recordDialog.activeTab}
      onActiveTabChange={recordDialog.setActiveTab}
    >
      {student && recordDialog.activeTab === "checklist" && (
        <DeanStudentChecklistTab student={student} />
      )}
      {student && recordDialog.activeTab === "grades" && (
        <DeanStudentGradesTab student={student} />
      )}
      {student && recordDialog.activeTab === "audit" && (
        <DeanStudentAuditTab student={student} />
      )}
    </StudentRecordDialog>
  );
}

const PRIMARY_STUDENT: DeanStudentSummary = {
  studentId: MOCK_IDS.studentPrimary,
  studentNumber: "24-1-00101",
  name: "Student Primary",
  initials: "SP",
  departmentId: MOCK_IDS.deptDcst,
  department: "DCST",
  curriculum: "BSCS 2025",
  adviser: "Adviser",
  hasAdviser: true,
  program: "BS Computer Science",
  yearLabel: "2nd Year",
  email: "student@example.edu.ph",
  standing: "good",
  gwa: "1.75",
  unitsEarned: 36,
  unitsRequired: 147,
  entryYear: 2024,
};

const SECOND_STUDENT: DeanStudentSummary = {
  ...PRIMARY_STUDENT,
  studentId: MOCK_IDS.studentSecondary,
  studentNumber: "24-1-00102",
  name: "Ana Reyes",
  initials: "",
  email: "ana.reyes@example.edu.ph",
};

beforeAll(() => saaisMockServer.listen());
afterEach(() => {
  cleanup();
  saaisMockServer.resetHandlers();
  resetMockDatabase();
  logoutMockPersona();
});
afterAll(() => saaisMockServer.close());

describe("useDeanStudentRecordDialog with StudentRecordDialog", () => {
  it("renders initials, switches tabs without read-only copy, logs audit view event, resets tab on student change, and closes", async () => {
    loginAsMockPersona("dean");
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <TestHarness student={PRIMARY_STUDENT} onOpenChange={onOpenChange} />
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Student Primary" }),
    ).toBeTruthy();
    expect(screen.getByText("SP")).toBeTruthy();
    expect(await screen.findByText("36 units earned")).toBeTruthy();
    expect(screen.queryByText(/Read-only Dean inspection/i)).toBeNull();

    await waitFor(() => {
      expect(
        getMockDatabase().auditLogEntries.some(
          (entry) =>
            entry.action === "student_record_viewed" &&
            entry.student_id === MOCK_IDS.studentPrimary,
        ),
      ).toBe(true);
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["dean", "audit-log"],
      });
    });

    const gradesTab = screen.getByRole("tab", { name: "Grades" });
    fireEvent.mouseDown(gradesTab, { button: 0 });
    fireEvent.click(gradesTab);
    expect(
      await screen.findByRole("button", { name: "Collapse all" }),
    ).toBeTruthy();
    expect(screen.getAllByText(/Term GWA/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Read-only transcript summary/i)).toBeNull();
    expect(screen.queryByText(/restricted to assigned advisers/i)).toBeNull();

    const auditTab = screen.getByRole("tab", { name: "Audit log" });
    fireEvent.mouseDown(auditTab, { button: 0 });
    fireEvent.click(auditTab);
    expect(await screen.findByText("Record audit trail")).toBeTruthy();
    expect(
      screen.queryByText(/Immutable view and grade change events/i),
    ).toBeNull();

    rerender(
      <QueryClientProvider client={queryClient}>
        <TestHarness student={SECOND_STUDENT} onOpenChange={onOpenChange} />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Ana Reyes" })).toBeTruthy();
    expect(screen.getByText("AR")).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Checklist" }).getAttribute("data-state"),
    ).toBe("active");

    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
