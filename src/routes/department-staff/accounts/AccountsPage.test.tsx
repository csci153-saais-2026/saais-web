import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { http, HttpResponse } from "msw";
import { vi } from "vitest";
import { AuthContext, type AuthContextValue } from "@/context/auth-context";
import { staffQueryKeys } from "../shared/staff-query-keys";
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  MOCK_PERSONAS,
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";
import DepartmentStaffPortal from "../DepartmentStaffPortal";

function staffAuth(
  personaKey: "department_staff" | "department_head" = "department_staff",
): AuthContextValue {
  const persona = MOCK_PERSONAS[personaKey];
  const roleAssignments = getMockDatabase().roleAssignments.filter(
    (assignment) => assignment.profile_id === persona.profileId,
  );
  return {
    user: {
      id: persona.profileId,
      email: persona.email,
      fullName: persona.fullName,
      primaryRole: persona.primaryRole,
      roles: persona.roles,
      facultyId: persona.facultyId,
      departmentId: persona.departmentId,
    },
    profile: null,
    session: null,
    roles: persona.roles,
    roleAssignments,
    roleScopes: persona.roleScopes.map((scope) => ({
      role: scope.role,
      facultyId: scope.scope_type === "faculty" ? scope.scope_id : null,
      departmentId: scope.scope_type === "department" ? scope.scope_id : null,
    })),
    activeRole: persona.primaryRole,
    primaryRole: persona.primaryRole,
    isLoading: false,
    isAuthenticated: true,
    isAllowedToEnter: true,
    entryBlockedReason: null,
    authError: null,
    isPasswordRecovery: false,
    keepSignedIn: true,
    isMockMode: true,
    activePersonaKey: persona.key,
    signInWithPassword: async () => undefined,
    signInWithGoogle: async () => undefined,
    signOut: async () => undefined,
    retryHydration: async () => undefined,
    setActiveRole: () => undefined,
    switchMockPersona: () => undefined,
  };
}

function renderAccounts(
  path = "/department-staff/accounts",
  personaKey: "department_staff" | "department_head" = "department_staff",
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={staffAuth(personaKey)}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route
              path="/department-staff/*"
              element={<DepartmentStaffPortal />}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

beforeAll(() => saaisMockServer.listen());
beforeEach(() => {
  resetMockDatabase();
  loginAsMockPersona("department_staff");
});
afterEach(() => {
  cleanup();
  saaisMockServer.resetHandlers();
  resetMockDatabase();
  logoutMockPersona();
});
afterAll(() => saaisMockServer.close());

describe("Department Staff accounts directory", () => {
  it("loads the lazy accounts route with the mockup columns, initials, email, and every returned role badge", async () => {
    renderAccounts();

    expect(
      await screen.findByRole("heading", {
        name: "Accounts and roles",
        level: 1,
      }),
    ).toBeTruthy();
    expect(
      await screen.findByText("Department of Computer Science and Technology"),
    ).toBeTruthy();
    const table = await screen.findByRole("table");
    expect(
      within(table).getByRole("columnheader", { name: "Name" }),
    ).toBeTruthy();
    expect(
      within(table).getByRole("columnheader", { name: "VSU email" }),
    ).toBeTruthy();
    expect(
      within(table).getByRole("columnheader", { name: "Roles" }),
    ).toBeTruthy();
    expect(
      within(table).queryByRole("columnheader", { name: "Status" }),
    ).toBeNull();
    const peoplePanel = screen
      .getAllByText("People")
      .map((node) => node.closest('[data-slot="card"]'))
      .find((panel) => panel?.contains(table));
    expect(peoplePanel?.contains(table)).toBe(true);
    expect(
      peoplePanel?.contains(
        screen.getByRole("searchbox", { name: "Search accounts" }),
      ),
    ).toBe(true);
    const addAccountButton = screen.getByRole("button", {
      name: "Add account",
    });
    expect(peoplePanel?.contains(addAccountButton)).toBe(false);
    const row = await screen.findByRole("row", { name: /Tan, Ron Nicolas/ });
    expect(
      within(row).getByText(MOCK_PERSONAS.dean_dept_head.fullName),
    ).toBeTruthy();
    expect(
      within(row).getByText(MOCK_PERSONAS.dean_dept_head.email),
    ).toBeTruthy();
    expect(within(row).getByText("TR")).toBeTruthy();
    expect(within(row).getByText("Dean")).toBeTruthy();
    expect(within(row).getByText("Department Head")).toBeTruthy();
    expect(within(row).getByText("Adviser")).toBeTruthy();
  });

  it("offers department-scoped role checkboxes with Student exclusivity", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    renderAccounts();
    fireEvent.click(await screen.findByRole("button", { name: "Add account" }));
    expect(screen.getByRole("checkbox", { name: "Student" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Adviser" })).toBeTruthy();
    expect(
      screen.getByRole("checkbox", { name: "Department Staff" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("checkbox", { name: "Department Head" }),
    ).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "Dean" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Admin" })).toBeNull();

    expect(
      screen
        .getByRole("checkbox", { name: "Student" })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect(
      screen
        .getByRole("checkbox", { name: "Adviser" })
        .getAttribute("aria-checked"),
    ).toBe("false");
    fireEvent.click(screen.getByRole("checkbox", { name: "Student" }));
    expect(
      screen
        .getByRole("checkbox", { name: "Adviser" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("shows validation messages when submitting an empty invitation", async () => {
    renderAccounts();
    fireEvent.click(await screen.findByRole("button", { name: "Add account" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Student" }));

    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    expect(
      await screen.findByText(
        "Enter a valid institutional email ending exactly in @vsu.edu.ph.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Full name is required and must be 150 characters or fewer.",
      ),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Send invitation" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });

  it("uses the assigned department scope and paginates without exposing another department", async () => {
    renderAccounts();

    const table = await screen.findByRole("table");
    expect(
      await within(table).findByText(MOCK_PERSONAS.student.email),
    ).toBeTruthy();
    expect(
      within(table).queryByText(MOCK_PERSONAS.student_other_dept.email),
    ).toBeNull();
    expect(screen.getByText("Showing 1-20")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText(/Showing 21/)).toBeTruthy();
    expect(
      within(await screen.findByRole("table")).getAllByRole("row").length,
    ).toBeGreaterThan(1);
    expect(
      within(screen.getByRole("table")).queryByText(
        MOCK_PERSONAS.student_other_dept.email,
      ),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Previous" }).hasAttribute("disabled"),
    ).toBe(false);
  });

  it("shows accessible loading, empty, and server-denied states", async () => {
    let releaseResponse: (() => void) | undefined;
    let requestStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      requestStarted = resolve;
    });
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    saaisMockServer.use(
      http.get("*/functions/v1/accounts", async () => {
        requestStarted?.();
        await responseGate;
        return HttpResponse.json([]);
      }),
    );
    renderAccounts();
    await started;
    expect(document.querySelector("[skullet-status]")?.textContent).toContain(
      "Loading department accounts",
    );
    releaseResponse?.();
    expect(
      await screen.findByText("No accounts are listed for this department."),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Next" }).hasAttribute("disabled"),
    ).toBe(true);

    cleanup();
    saaisMockServer.resetHandlers();
    saaisMockServer.use(
      http.get("*/functions/v1/accounts", () =>
        HttpResponse.json(
          {
            code: "INSUFFICIENT_PRIVILEGE",
            message: "Department accounts are not available to this role.",
          },
          { status: 403 },
        ),
      ),
    );
    renderAccounts();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "not permitted to view accounts",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("does not expose Admin-only profile, role, or status mutation controls", async () => {
    let mutationCalls = 0;
    saaisMockServer.use(
      http.patch("*/functions/v1/accounts/:profile_id", () => {
        mutationCalls += 1;
        return HttpResponse.json({});
      }),
    );
    renderAccounts();

    await screen.findByRole("table");
    await screen.findByText(MOCK_PERSONAS.student.email);
    expect(
      screen.queryByRole("button", {
        name: /edit|update|change role|disable account|enable account/i,
      }),
    ).toBeNull();
    expect(screen.queryByRole("form")).toBeNull();
    expect(mutationCalls).toBe(0);
  });

  it("hides pending invitation actions and status from the directory row", async () => {
    let mutationCalls = 0;
    saaisMockServer.use(
      http.post("*/functions/v1/accounts/:profile_id/resend-invite", () => {
        mutationCalls += 1;
        return HttpResponse.json({});
      }),
      http.post("*/functions/v1/accounts/:profile_id/revoke-invite", () => {
        mutationCalls += 1;
        return HttpResponse.json({});
      }),
    );
    renderAccounts();
    const table = await screen.findByRole("table");
    const pendingRow = await within(table).findByRole("row", {
      name: /Concoles, Cyril Jade M\./,
    });

    expect(within(pendingRow).queryByText("pending")).toBeNull();
    expect(
      within(pendingRow).queryByRole("button", { name: "Resend invitation" }),
    ).toBeNull();
    expect(
      within(pendingRow).queryByRole("button", { name: "Revoke invitation" }),
    ).toBeNull();
    expect(mutationCalls).toBe(0);
  });

  it("requests account pages with the resolved department and bounded offsets", async () => {
    let requestedQuery = new URLSearchParams();
    saaisMockServer.use(
      http.get("*/functions/v1/accounts", ({ request }) => {
        requestedQuery = new URL(request.url).searchParams;
        return HttpResponse.json([]);
      }),
    );
    const { accountsMaxOffset, listDepartmentAccounts } =
      await import("./accounts.api");

    const page = await listDepartmentAccounts(
      {
        department_id: MOCK_IDS.deptDcst,
        faculty_id: MOCK_IDS.facultyComputing,
      },
      { search: "nicolas@example.edu", role: "adviser", offset: 40 },
    );

    expect(requestedQuery.get("department_id")).toBe(MOCK_IDS.deptDcst);
    expect(requestedQuery.get("faculty_id")).toBe(MOCK_IDS.facultyComputing);
    expect(requestedQuery.get("limit")).toBe("21");
    expect(requestedQuery.get("offset")).toBe("40");
    expect(requestedQuery.get("search")).toBe("nicolas@example.edu");
    expect(requestedQuery.get("role")).toBe("adviser");
    expect(page).toEqual({ accounts: [], hasNext: false });
    await expect(
      listDepartmentAccounts(
        {
          department_id: MOCK_IDS.deptDcst,
          faculty_id: MOCK_IDS.facultyComputing,
        },
        { offset: accountsMaxOffset + 1 },
      ),
    ).rejects.toThrow("outside the supported range");
  });

  it("applies the combined search and role filters in the MSW account handler", async () => {
    const { listDepartmentAccounts } = await import("./accounts.api");
    const page = await listDepartmentAccounts(
      {
        department_id: MOCK_IDS.deptDcst,
        faculty_id: MOCK_IDS.facultyComputing,
      },
      { search: MOCK_PERSONAS.student.email, role: "student", offset: 0 },
    );

    expect(page.accounts).toHaveLength(1);
    expect(page.accounts[0]?.profile.email).toBe(MOCK_PERSONAS.student.email);
    expect(
      page.accounts[0]?.role_assignments?.some(
        (assignment) => assignment.role === "student",
      ),
    ).toBe(true);
  });

  it("combines UI search and role filters and resets bounded pagination on changes", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    const requests: URLSearchParams[] = [];
    saaisMockServer.use(
      http.get("*/functions/v1/accounts", ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json([]);
      }),
    );
    renderAccounts("/department-staff/accounts?offset=40");

    const search = await screen.findByRole("searchbox", {
      name: "Search accounts",
    });
    fireEvent.change(search, { target: { value: "Ron" } });
    await waitFor(() => expect(requests.at(-1)?.get("search")).toBe("Ron"));
    expect(requests.at(-1)?.get("offset")).toBe("0");

    fireEvent.click(screen.getByRole("combobox", { name: "Role" }));
    fireEvent.click(await screen.findByRole("option", { name: "Adviser" }));
    await waitFor(() => expect(requests.at(-1)?.get("role")).toBe("adviser"));
    expect(requests.at(-1)?.get("search")).toBe("Ron");
    expect(requests.at(-1)?.get("offset")).toBe("0");
    expect(requests.at(-1)?.get("department_id")).toBe(MOCK_IDS.deptDcst);
    expect(requests.at(-1)?.get("faculty_id")).toBe(MOCK_IDS.facultyComputing);
  });

  it("ignores organization values in the URL and does not broaden the Staff portal guard", async () => {
    let requestedQuery: URLSearchParams | undefined;
    saaisMockServer.use(
      http.get("*/functions/v1/accounts", ({ request }) => {
        requestedQuery = new URL(request.url).searchParams;
        return HttpResponse.json([]);
      }),
    );
    renderAccounts(
      `/department-staff/accounts?department=${MOCK_IDS.deptDabe}&faculty=${MOCK_IDS.facultyEngineering}`,
    );

    await screen.findByRole("table");
    expect(requestedQuery?.get("department_id")).toBe(MOCK_IDS.deptDcst);
    expect(requestedQuery?.get("faculty_id")).toBe(MOCK_IDS.facultyComputing);
    expect(
      screen.queryByRole("combobox", { name: /department|faculty|college/i }),
    ).toBeNull();

    cleanup();
    renderAccounts("/department-staff/accounts", "department_head");
    expect(
      await screen.findByText(
        "A Department Staff role assignment is required to continue.",
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Accounts and roles" }),
    ).toBeNull();
  });

  it("sends one reviewed multi-role student request and displays the server result", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    let provisioningCalls = 0;
    let submittedBody: unknown;
    saaisMockServer.use(
      http.post("*/functions/v1/auth/invite", async ({ request }) => {
        provisioningCalls += 1;
        submittedBody = await request.json();
        return HttpResponse.json(
          {
            success: true,
            message: "Invitation email dispatched successfully.",
            profile_id: "55555555-5555-4555-8555-555555555555",
            invitation_status: "pending",
            invitation_sent_at: "2026-11-10T08:00:00Z",
            invitation_expires_at: "2026-11-17T08:00:00Z",
          },
          { status: 201 },
        );
      }),
    );
    const { queryClient } = renderAccounts();
    await screen.findByRole("table");
    const scopePrefix = [
      MOCK_PERSONAS.department_staff.profileId,
      MOCK_IDS.deptDcst,
    ] as const;
    const affectedKeys = [
      staffQueryKeys.resource(...scopePrefix, "accounts"),
      staffQueryKeys.resource(...scopePrefix, "students"),
      staffQueryKeys.resource(...scopePrefix, "adviser-assignments"),
    ];
    affectedKeys.forEach((key) =>
      queryClient.setQueryData(key, { cached: true }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Add account" }));

    fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), {
      target: { value: "New Student" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Institutional email" }),
      { target: { value: "new.student@vsu.edu.ph" } },
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Student" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Student number" }), {
      target: { value: "26-1-00042" },
    });
    expect(
      screen.queryByRole("checkbox", { name: "Additional role Adviser" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("combobox", { name: "Program" }));
    fireEvent.click(
      await screen.findByRole("option", {
        name: /BSCS - Bachelor of Science in Computer Science/,
      }),
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Curriculum" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "BSCS 2024-2025 v1" }),
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Initial adviser" }));
    fireEvent.click(
      await screen.findByRole("option", {
        name: MOCK_PERSONAS.adviser.fullName,
      }),
    );

    const sendButton = screen.getByRole("button", { name: "Send invitation" });
    expect(sendButton.hasAttribute("disabled")).toBe(false);
    fireEvent.click(sendButton);
    fireEvent.click(sendButton);

    expect(
      await screen.findByText("Invitation email dispatched successfully."),
    ).toBeTruthy();
    expect(provisioningCalls).toBe(1);
    expect(submittedBody).toEqual({
      email: "new.student@vsu.edu.ph",
      full_name: "New Student",
      role: "student",
      student_number: "26-1-00042",
      program_id: MOCK_IDS.programBscs,
      curriculum_version_id: MOCK_IDS.curriculumBscs2024,
      adviser_id: MOCK_IDS.adviserPrimary,
    });
    expect(
      screen
        .getByRole("button", { name: "Invitation sent" })
        .hasAttribute("disabled"),
    ).toBe(true);
    await waitFor(() => {
      for (const key of affectedKeys)
        expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    });
  });

  it("shows a real server conflict and permits a deliberate retry without duplicate in-flight requests", async () => {
    let calls = 0;
    saaisMockServer.use(
      http.post("*/functions/v1/auth/invite", () => {
        calls += 1;
        return HttpResponse.json(
          {
            code: "DUPLICATE_EMAIL",
            message: "An account with this email already exists.",
          },
          { status: 409 },
        );
      }),
    );
    renderAccounts();
    fireEvent.click(await screen.findByRole("button", { name: "Add account" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), {
      target: { value: "Duplicate Person" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Institutional email" }),
      { target: { value: "duplicate.person@vsu.edu.ph" } },
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Adviser" }));
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    expect(
      await screen.findByText("An account with this email already exists."),
    ).toBeTruthy();
    expect(
      screen.getByText(/server reports a duplicate or conflicting account/),
    ).toBeTruthy();
    expect(calls).toBe(1);
    expect(
      screen
        .getByRole("button", { name: "Send invitation" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });

  it("prevents a self-grant before making a request", async () => {
    let calls = 0;
    saaisMockServer.use(
      http.post("*/functions/v1/auth/invite", () => {
        calls += 1;
        return HttpResponse.json({ success: true });
      }),
    );
    renderAccounts();
    fireEvent.click(await screen.findByRole("button", { name: "Add account" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), {
      target: { value: "Staff User" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Institutional email" }),
      { target: { value: MOCK_PERSONAS.department_staff.email } },
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Adviser" }));

    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "You cannot grant roles to your own account.",
    );
    expect(
      screen
        .getByRole("button", { name: "Send invitation" })
        .hasAttribute("disabled"),
    ).toBe(false);
    expect(calls).toBe(0);
  });
});
