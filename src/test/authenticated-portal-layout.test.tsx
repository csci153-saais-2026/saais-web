import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthenticatedPortalLayout } from "@/components/features/AuthenticatedPortalLayout";
import * as sharedLayout from "@/layouts/AuthenticatedLayout";

const auth = vi.hoisted(() => ({
  user: {
    fullName: "Ada Example",
    email: "ada@example.edu.ph",
    primaryRole: "dean",
  },
  roles: ["dean", "adviser"],
  roleAssignments: [{ role: "dean" }],
  activeRole: "dean",
  isLoading: false,
  isAllowedToEnter: true,
  signOut: vi.fn().mockResolvedValue(undefined),
}));
const navigate = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-auth", () => ({ useAuth: () => auth }));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
beforeEach(() => {
  auth.roleAssignments = [{ role: "dean" }];
  auth.isLoading = false;
  auth.isAllowedToEnter = true;
  auth.signOut.mockClear();
  navigate.mockClear();
});

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/dean/reports"]}>
        <Routes>
          <Route element={<AuthenticatedPortalLayout />}>
            <Route path="/dean/reports" element={<div>Report content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AuthenticatedPortalLayout integration", () => {
  it("uses actual assignments and renders account details, breadcrumbs, and the outlet in one shell", () => {
    const { container } = setup();
    expect(screen.getByText("Dean")).toBeTruthy();
    // A derived role list must not introduce a menu absent from actual assignments.
    expect(screen.queryByText("Adviser")).toBeNull();
    expect(
      screen
        .getAllByRole("link", { name: "Faculty reports" })
        .some(
          (link) =>
            link.getAttribute("href") === "/dean/reports" &&
            link.getAttribute("aria-current") === "page",
        ),
    ).toBe(true);
    expect(screen.getByText("Ada Example")).toBeTruthy();
    expect(screen.getByText("ada@example.edu.ph")).toBeTruthy();
    expect(screen.getByText("AE")).toBeTruthy();
    const breadcrumb = within(
      screen.getByRole("navigation", { name: "breadcrumb" }),
    );
    expect(breadcrumb.getByText("Office of the Dean")).toBeTruthy();
    expect(breadcrumb.getByText("Faculty reports")).toBeTruthy();
    expect(screen.getByText("Report content")).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="sidebar"]')).toHaveLength(1);
    expect(
      screen.getAllByRole("button", { name: "Open navigation" }),
    ).toHaveLength(1);
  });

  it("keeps the Admin screen breadcrumb within the updated shared layout", () => {
    auth.user = {
      fullName: "Admin Example",
      email: "admin@example.edu.ph",
      primaryRole: "admin",
    };
    auth.roles = ["admin"];
    auth.roleAssignments = [{ role: "admin" }];
    auth.activeRole = "admin";

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/admin/audit-log"]}>
          <Routes>
            <Route element={<AuthenticatedPortalLayout />}>
              <Route
                path="/admin/audit-log"
                element={<div>Audit history content</div>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const breadcrumb = within(
      screen.getByRole("navigation", { name: "breadcrumb" }),
    );
    expect(breadcrumb.getByText("Audit log")).toBeTruthy();
    expect(screen.getByText("Audit history content")).toBeTruthy();
  });

  it("forwards sign-out and redirects after it completes", async () => {
    let props:
      ComponentProps<typeof sharedLayout.AuthenticatedLayout> | undefined;
    vi.spyOn(sharedLayout, "AuthenticatedLayout").mockImplementation(
      (value) => {
        props = value;
        return null;
      },
    );
    setup();
    await props?.sidebar?.onSignOut?.();
    expect(navigate).toHaveBeenCalledWith("/login", { replace: true });
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it("keeps the shell hidden while auth loads", () => {
    auth.isLoading = true;
    setup();
    expect(screen.getByText(/Loading workspace/)).toBeTruthy();
    expect(screen.queryByText("Report content")).toBeNull();
    expect(screen.queryByText("Ada Example")).toBeNull();
  });

  it("shows an explicit unavailable state for an unauthorized account", () => {
    auth.isAllowedToEnter = false;
    setup();
    expect(
      screen.getByRole("heading", { name: "Workspace unavailable" }),
    ).toBeTruthy();
    expect(screen.queryByText("Ada Example")).toBeNull();
    expect(screen.queryByText("Report content")).toBeNull();
  });
});
