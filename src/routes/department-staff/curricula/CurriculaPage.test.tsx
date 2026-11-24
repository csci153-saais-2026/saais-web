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
import { AuthContext, type AuthContextValue } from "@/context/auth-context";
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
        <MemoryRouter initialEntries={["/department-staff/curricula"]}>
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

async function chooseOption(label: string, option: string) {
  Element.prototype.scrollIntoView = () => {};
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), {
    key: "ArrowDown",
  });
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

describe("Department Staff curricula", () => {
  it("renders the prototype heading, version toolbar, summary cards, and MSW curriculum records", async () => {
    renderPage();

    expect(
      await screen.findByRole(
        "heading",
        {
          name: "Shape the path to graduation.",
          level: 1,
        },
        { timeout: 5000 },
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Versioned requirements keep past and present curricula distinct.",
      ),
    ).toBeTruthy();
    const addVersion = screen.getByRole("button", { name: "Add version" });
    expect(addVersion.querySelector("svg")).not.toBeNull();
    expect(await screen.findByLabelText("Curriculum version")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit version" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete version" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add term" })).toBeTruthy();

    await chooseOption("Curriculum version", "BSCS 2024-2025 v1");
    expect(await screen.findByText("Year 1 · Semester 1")).toBeTruthy();
    expect(
      screen.getByText("CSCI 101 — Introduction to Computing"),
    ).toBeTruthy();
    expect(screen.getAllByText("Required units").length).toBeGreaterThan(0);
    expect(screen.getByText("Enrolled students")).toBeTruthy();
    expect(screen.getByText("Effective from")).toBeTruthy();
    expect(screen.getByText("Curriculum lifecycle")).toBeTruthy();
    expect(
      screen.getAllByRole("columnheader", { name: "Course / slot" }),
    ).toHaveLength(4);
    expect(
      screen.getAllByRole("columnheader", { name: "Required units" }),
    ).toHaveLength(4);
    expect(
      screen.getAllByText(
        "Positional curriculum term; not a calendar school term.",
      ),
    ).toHaveLength(4);
    expect(screen.getByRole("button", { name: "New course" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retire version" })).toBeNull();
  });

  it("adds an empty positional term through the Department Staff MSW handler", async () => {
    renderPage();
    await screen.findByLabelText("Curriculum version");
    await chooseOption("Curriculum version", "BSCS 2024-2025 v1");
    const addTermButton = await screen.findByRole("button", {
      name: "Add term",
    });
    await waitFor(() =>
      expect((addTermButton as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(addTermButton);
    await screen.findByRole("dialog", { name: "Add term" });
    await chooseOption("Term", "Midyear");
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /^Add term$/,
      }),
    );

    expect(await screen.findByText("Curriculum term added.")).toBeTruthy();
    expect(await screen.findByText("Year 1 · Midyear")).toBeTruthy();
    await waitFor(() => {
      expect(
        getMockDatabase().curriculumTerms.some(
          (term) =>
            term.curriculum_version_id === MOCK_IDS.curriculumBscs2024 &&
            term.year_level === 1 &&
            term.term_sequence === 3,
        ),
      ).toBe(true);
    });
  });
});
