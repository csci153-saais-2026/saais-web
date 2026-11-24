import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
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
import { AuthContext, type AuthContextValue } from "@/context/auth-context";
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_PERSONAS,
  MOCK_IDS,
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";
import DepartmentStaffPortal from "../DepartmentStaffPortal";

const staffPersona = MOCK_PERSONAS.department_staff;

function staffAuth(): AuthContextValue {
  const roleAssignments = getMockDatabase().roleAssignments.filter(
    (assignment) => assignment.profile_id === staffPersona.profileId,
  );

  return {
    user: {
      id: staffPersona.profileId,
      email: staffPersona.email,
      fullName: staffPersona.fullName,
      primaryRole: staffPersona.primaryRole,
      roles: staffPersona.roles,
      facultyId: staffPersona.facultyId,
      departmentId: staffPersona.departmentId,
    },
    profile: null,
    session: null,
    roles: staffPersona.roles,
    roleAssignments,
    roleScopes: staffPersona.roleScopes.map((scope) => ({
      role: scope.role,
      facultyId: scope.scope_type === "faculty" ? scope.scope_id : null,
      departmentId: scope.scope_type === "department" ? scope.scope_id : null,
    })),
    activeRole: staffPersona.primaryRole,
    primaryRole: staffPersona.primaryRole,
    isLoading: false,
    isAuthenticated: true,
    isAllowedToEnter: true,
    entryBlockedReason: null,
    authError: null,
    isPasswordRecovery: false,
    keepSignedIn: true,
    isMockMode: true,
    activePersonaKey: staffPersona.key,
    signInWithPassword: async () => undefined,
    signInWithGoogle: async () => undefined,
    signOut: async () => undefined,
    retryHydration: async () => undefined,
    setActiveRole: () => undefined,
    switchMockPersona: () => undefined,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={staffAuth()}>
        <MemoryRouter initialEntries={["/department-staff/academic-terms"]}>
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
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
  saaisMockServer.listen();
});
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

describe("Department Staff academic terms", () => {
  it("adds a term with the head-style modal using staff data", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Add a term" }));
    expect(
      screen.getByRole("dialog", { name: "Add academic term" }),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Academic year"), {
      target: { value: "2027–2028" },
    });
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2027-08-01" },
    });
    fireEvent.change(screen.getByLabelText("Actual end date"), {
      target: { value: "2027-12-20" },
    });
    fireEvent.change(screen.getByLabelText("Encoding deadline"), {
      target: { value: "2028-01-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add term" }));
    expect(await screen.findByText("Academic term created.")).toBeTruthy();
    expect(
      getMockDatabase().schoolTerms.some(
        (term) => term.start_year === 2027 && term.term_type === "1st Semester",
      ),
    ).toBe(true);
  });

  it("creates a term with department encoding closed when selected", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Add a term" }));
    fireEvent.change(screen.getByLabelText("Academic year"), {
      target: { value: "2027–2028" },
    });
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2027-08-01" },
    });
    fireEvent.change(screen.getByLabelText("Actual end date"), {
      target: { value: "2027-12-20" },
    });
    fireEvent.change(screen.getByLabelText("Encoding deadline"), {
      target: { value: "2028-01-15" },
    });
    fireEvent.keyDown(
      screen.getByRole("combobox", { name: "Encoding status" }),
      { key: "ArrowDown" },
    );
    fireEvent.click(await screen.findByRole("option", { name: "Closed" }));
    fireEvent.click(screen.getByRole("button", { name: "Add term" }));
    expect(await screen.findByText("Academic term created.")).toBeTruthy();
    const term = getMockDatabase().schoolTerms.find(
      (item) => item.start_year === 2027,
    )!;
    expect(
      getMockDatabase().departmentTermEncodings.some(
        (item) =>
          item.school_term_id === term.id &&
          item.department_id === staffPersona.departmentId &&
          item.is_closed,
      ),
    ).toBe(true);
  });

  it("retries a failed encoding closure without creating the term twice", async () => {
    let attempts = 0;
    saaisMockServer.use(
      http.post(
        "*/functions/v1/school-terms/:school_term_id/close-encoding",
        () => {
          attempts += 1;
          if (attempts === 1)
            return HttpResponse.json(
              { message: "Closure failed" },
              { status: 500 },
            );
        },
      ),
    );
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Add a term" }));
    fireEvent.change(screen.getByLabelText("Academic year"), {
      target: { value: "2027–2028" },
    });
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2027-08-01" },
    });
    fireEvent.change(screen.getByLabelText("Actual end date"), {
      target: { value: "2027-12-20" },
    });
    fireEvent.change(screen.getByLabelText("Encoding deadline"), {
      target: { value: "2028-01-15" },
    });
    fireEvent.keyDown(
      screen.getByRole("combobox", { name: "Encoding status" }),
      { key: "ArrowDown" },
    );
    fireEvent.click(await screen.findByRole("option", { name: "Closed" }));
    fireEvent.click(screen.getByRole("button", { name: "Add term" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Retry closing encoding" }),
    );
    expect(await screen.findByText("Academic term created.")).toBeTruthy();
    expect(
      getMockDatabase().schoolTerms.filter((term) => term.start_year === 2027),
    ).toHaveLength(1);
    expect(attempts).toBe(2);
  });
  it("renders the prototype term history with records from the staff persona MSW handlers", async () => {
    renderPage();

    expect(
      await screen.findByRole(
        "heading",
        { name: "Academic terms", level: 1 },
        { timeout: 5000 },
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Review semester dates and manage the grade encoding period.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Closing encoding prevents further grade entry for the term/,
      ),
    ).toBeTruthy();
    expect(await screen.findByText("Academic term history")).toBeTruthy();
    expect(
      await screen.findByText(
        "Encoding windows are tracked separately for each semester.",
      ),
    ).toBeTruthy();
    // Skeleton sample rows are hidden from the accessibility tree, so this
    // waits for the loaded table.
    expect(
      await screen.findByRole("columnheader", { name: "Academic year" }),
    ).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Semester" })).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "Term dates" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "Encoding deadline" }),
    ).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeTruthy();
    expect(screen.getByText("2026–2027")).toBeTruthy();
    expect(screen.getAllByText("1st semester")).toHaveLength(2);
    expect(screen.getByText("10 Aug 2026 – 18 Dec 2026")).toBeTruthy();
    expect(screen.getByText("05 Jan 2027")).toBeTruthy();
    expect(screen.getAllByText("Open")).toHaveLength(1);
    expect(screen.getAllByText("Closed")).toHaveLength(2);
    expect(screen.queryByText("Not recorded")).toBeNull();
    expect(screen.getByText("1 open term · 2 closed terms")).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: /Close encoding for/ }),
    ).toHaveLength(1);
    expect(screen.getAllByText("View term")).toHaveLength(2);
    const lockedTerm = screen.getByRole("row", {
      name: /2025–2026.*2nd semester/i,
    });
    fireEvent.click(within(lockedTerm).getByText("View term"));
    const details = screen.getByRole("dialog", {
      name: "Academic term details",
    });
    expect(within(details).getByText("2025–2026")).toBeTruthy();
    expect(within(details).getByText("Closed")).toBeTruthy();
    expect(
      within(details).getByText("End of 2nd Semester AY 2025-2026"),
    ).toBeTruthy();
    expect(
      within(details).queryByRole("button", { name: "Edit term" }),
    ).toBeNull();
    expect(
      within(details).queryByRole("button", { name: "Reopen encoding" }),
    ).toBeNull();
    fireEvent.click(
      within(details).getAllByRole("button", { name: "Close" })[0],
    );
    const addTermButton = screen.getByRole("button", { name: "Add a term" });
    expect(addTermButton.querySelector("svg")).not.toBeNull();
    const termRows = screen.getAllByRole("row").slice(1);
    expect(termRows).toHaveLength(3);
    expect(termRows[0]?.textContent).toContain("2026");
    expect(termRows[1]?.textContent).toContain("2025");
    expect(screen.queryByText(/Opened subjects|Team offerings/i)).toBeNull();
  });

  it("shows only View term when department encoding is closed", async () => {
    const encoding = getMockDatabase().departmentTermEncodings.find(
      (item) =>
        item.school_term_id === MOCK_IDS.term2026Sem1Open &&
        item.department_id === MOCK_IDS.deptDcst,
    )!;
    encoding.is_closed = true;
    encoding.closure_note = "Department encoding closed";

    renderPage();

    const closedTerm = await screen.findByRole("row", {
      name: /2026–2027.*1st semester/i,
    });
    expect(within(closedTerm).getByText("View term")).toBeTruthy();
    expect(
      within(closedTerm).queryByRole("button", {
        name: "Close encoding for 2026 - 2027 1st Semester",
      }),
    ).toBeNull();
    expect(within(closedTerm).queryByText("Edit term")).toBeNull();
  });

  it("exports the academic term history as a PDF", async () => {
    URL.createObjectURL = vi.fn(() => "blob:academic-terms");
    URL.revokeObjectURL = vi.fn();

    renderPage();

    await screen.findByText("2026–2027");
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Preview: Academic terms",
    });
    expect(dialog).toBeTruthy();
    const downloadLink = await waitFor(() => {
      const link = within(dialog).getByRole("link", { name: "Download PDF" });
      expect(link.hasAttribute("disabled")).toBe(false);
      expect(link.getAttribute("href")).toMatch(/^blob:/);
      return link;
    });
    expect(downloadLink).toBeTruthy();
  });

  it("closes and reopens department encoding through the MSW handlers", async () => {
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Close encoding for 2026 - 2027 1st Semester",
      }),
    );
    expect(
      await screen.findByRole("dialog", {
        name: "Close department grade encoding",
      }),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Closure note (optional)"), {
      target: { value: "Term encoding completed" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Close grade encoding" }),
    );

    expect(
      await screen.findByText(
        "Department grade encoding closed for 2026 - 2027, 1st Semester.",
      ),
    ).toBeTruthy();
    expect((await screen.findAllByText("Closed")).length).toBeGreaterThan(0);
    expect(screen.getByText("0 open terms · 3 closed terms")).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Close encoding for 2026 - 2027 1st Semester",
      }),
    ).toBeNull();

    const currentTerm = screen.getByRole("row", { name: /2026–2027/ });
    fireEvent.click(within(currentTerm).getByText("View term"));
    fireEvent.click(
      await screen.findByRole("button", { name: "Reopen encoding" }),
    );
    expect(
      await screen.findByRole("dialog", {
        name: "Reopen department grade encoding",
      }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Reopen grade encoding" }),
    );

    expect(
      await screen.findByText(
        "Department grade encoding reopened for 2026 - 2027, 1st Semester.",
      ),
    ).toBeTruthy();
    expect((await screen.findAllByText("Open")).length).toBeGreaterThan(0);
  });

  it("shows a retryable service error returned through MSW", async () => {
    saaisMockServer.use(
      http.get("*/rest/v1/school_term", () =>
        HttpResponse.json(
          { code: "42501", message: "Forbidden", details: "", hint: "" },
          { status: 403 },
        ),
      ),
    );
    renderPage();

    expect(
      await screen.findByText(
        "Your account is not permitted to view academic terms for this department.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });
});
