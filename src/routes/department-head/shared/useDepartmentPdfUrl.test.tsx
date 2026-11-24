import type { ReactNode } from "react";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "@/context/auth-context";
import type { DepartmentPdfDocument } from "./department-pdf";

const pdf = vi.hoisted(() => ({ metadata: vi.fn(), build: vi.fn() }));
vi.mock("./department-pdf-metadata", () => ({
  loadDepartmentPdfMetadata: pdf.metadata,
}));
vi.mock("./department-pdf", () => ({ createDepartmentPdf: pdf.build }));
import { useDepartmentPdfUrl } from "./useDepartmentPdfUrl";

const report: DepartmentPdfDocument = {
  title: "Department report",
  subtitle: "Current term",
  filename: "department.pdf",
  sections: [],
};
const NativeURL = URL;
const createUrl = vi.fn(() => "blob:department-report");
const revokeUrl = vi.fn();
const department = { id: "department-a", name: "Computing" };

function makeAuth(
  userId = "head-a",
  departmentId = "department-a",
): AuthContextValue {
  const noOp = async () => {};
  return {
    user: {
      id: userId,
      email: "head@example.edu",
      fullName: "Department Head",
      primaryRole: "department_head",
      roles: ["department_head"],
      departmentId,
    },
    profile: {
      id: userId,
      email: "head@example.edu",
      full_name: "Department Head",
      role: "department_head",
      status: "active",
      department_id: departmentId,
      created_at: "2026-11-24T00:00:00Z",
      updated_at: "2026-11-24T00:00:00Z",
    },
    session: null,
    roles: ["department_head"],
    roleAssignments: [],
    roleScopes: [{ role: "department_head", departmentId }],
    activeRole: "department_head",
    primaryRole: "department_head",
    isLoading: false,
    isAuthenticated: true,
    isAllowedToEnter: true,
    entryBlockedReason: null,
    authError: null,
    isPasswordRecovery: false,
    keepSignedIn: false,
    isMockMode: true,
    activePersonaKey: null,
    signInWithPassword: noOp,
    signInWithGoogle: noOp,
    signOut: noOp,
    retryHydration: noOp,
    setActiveRole: () => {},
    switchMockPersona: () => {},
  };
}

function mountPdf(
  initialReport: DepartmentPdfDocument | null,
  initialAuth = makeAuth(),
) {
  let auth = initialAuth;
  let selectedReport = initialReport;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
  );
  const view = renderHook(({ report }) => useDepartmentPdfUrl(report), {
    initialProps: { report: initialReport },
    wrapper,
  });
  return {
    ...view,
    select(next: DepartmentPdfDocument | null) {
      selectedReport = next;
      view.rerender({ report: next });
    },
    changeAuth(next: AuthContextValue) {
      auth = next;
      view.rerender({ report: selectedReport });
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  pdf.metadata.mockResolvedValue(department);
  pdf.build.mockResolvedValue(new Blob(["%PDF"], { type: "application/pdf" }));
  createUrl.mockReturnValue("blob:department-report");
  vi.stubGlobal(
    "URL",
    class extends NativeURL {
      static createObjectURL = createUrl;
      static revokeObjectURL = revokeUrl;
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useDepartmentPdfUrl", () => {
  it("stays idle without a selected export", () => {
    const { result } = mountPdf(null);
    expect(result.current).toEqual({ url: undefined, error: false });
    expect(pdf.metadata).not.toHaveBeenCalled();
    expect(pdf.build).not.toHaveBeenCalled();
  });

  it("prepares the selected export with its department metadata", async () => {
    const { result } = mountPdf(report);
    expect(result.current).toEqual({ url: undefined, error: false });
    await waitFor(() =>
      expect(result.current.url).toBe("blob:department-report"),
    );
    expect(pdf.metadata).toHaveBeenCalledWith(
      "department-a",
      expect.any(AbortSignal),
    );
    expect(pdf.build).toHaveBeenCalledWith(report, department);
    expect(result.current.error).toBe(false);
  });

  it("shows a safe error when department metadata cannot be read", async () => {
    pdf.metadata.mockRejectedValue(new Error("Department request denied"));
    const { result } = mountPdf(report);
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.url).toBeUndefined();
    expect(pdf.build).not.toHaveBeenCalled();
  });

  it("shows a safe error when PDF creation fails", async () => {
    pdf.build.mockRejectedValue(new Error("PDF generation failed"));
    const { result } = mountPdf(report);
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.url).toBeUndefined();
    expect(createUrl).not.toHaveBeenCalled();
  });
});
