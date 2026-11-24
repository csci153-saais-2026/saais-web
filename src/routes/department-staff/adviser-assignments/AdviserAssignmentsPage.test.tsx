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
  MOCK_PERSONAS,
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";
import { waitForLoaded } from "@/test/wait-for-loaded";
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
        <MemoryRouter
          initialEntries={["/department-staff/adviser-assignments"]}
        >
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

async function chooseAdviser() {
  await waitFor(() =>
    expect(
      screen
        .getByRole("combobox", { name: "New adviser" })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  fireEvent.keyDown(screen.getByRole("combobox", { name: "New adviser" }), {
    key: "ArrowDown",
  });
  fireEvent.click(
    await screen.findByRole("option", {
      name: MOCK_PERSONAS.adviser_secondary.fullName,
    }),
  );
}

describe("Department Staff adviser assignments", () => {
  it("includes department advisers in the filter and shows their assigned students", async () => {
    renderPage();
    await screen.findByText(/^Showing \d+ of \d+ assignments$/);
    await waitForLoaded();
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Adviser" }), {
      key: "ArrowDown",
    });
    for (const name of [
      MOCK_PERSONAS.adviser.fullName,
      MOCK_PERSONAS.adviser_secondary.fullName,
      MOCK_PERSONAS.department_head.fullName,
      MOCK_PERSONAS.dean_dept_head.fullName,
      MOCK_PERSONAS.admin.fullName,
    ]) {
      expect(await screen.findByRole("option", { name })).toBeTruthy();
    }
    fireEvent.click(
      screen.getByRole("option", {
        name: MOCK_PERSONAS.department_head.fullName,
      }),
    );
    expect(
      screen.getByText(MOCK_PERSONAS.student_sample_25.fullName),
    ).toBeTruthy();
  });
  it("offers every active adviser in the department, including multi-role profiles", async () => {
    const db = getMockDatabase();
    db.profiles.push({
      ...db.profiles.find(
        (profile) => profile.id === MOCK_PERSONAS.adviser_secondary.profileId,
      )!,
      id: "other-adviser",
      department_id: "other-department",
      full_name: "Other department adviser",
    });
    renderPage();
    fireEvent.click(
      await screen.findByRole("checkbox", {
        name: "Select " + MOCK_PERSONAS.student.fullName,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reassign selected" }));
    await waitFor(() =>
      expect(
        screen
          .getByRole("combobox", { name: "New adviser" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.keyDown(screen.getByRole("combobox", { name: "New adviser" }), {
      key: "ArrowDown",
    });
    for (const name of [
      MOCK_PERSONAS.adviser_secondary.fullName,
      MOCK_PERSONAS.department_head.fullName,
      MOCK_PERSONAS.dean_dept_head.fullName,
      MOCK_PERSONAS.admin.fullName,
    ]) {
      expect(await screen.findByRole("option", { name })).toBeTruthy();
    }
    expect(
      screen.queryByRole("option", { name: MOCK_PERSONAS.adviser.fullName }),
    ).toBeNull();
    expect(
      screen.queryByRole("option", { name: "Other department adviser" }),
    ).toBeNull();
  });
  it("loads the staff department directory and removes hidden selections on filtering", async () => {
    renderPage();
    // Only loaded rows are exposed to the accessibility tree; the skeleton's
    // sample rows are hidden.
    const studentCheckbox = await screen.findByRole("checkbox", {
      name: "Select " + MOCK_PERSONAS.student.fullName,
    });
    await waitForLoaded();
    const total = screen.getByText(/^Showing \d+ of \d+ assignments$/)
      .textContent;
    fireEvent.click(studentCheckbox);
    expect(screen.getByText("1 student selected (maximum 500)")).toBeTruthy();
    expect(
      screen
        .getByRole("checkbox", { name: "Select all visible students" })
        .getAttribute("aria-checked"),
    ).toBe("mixed");
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search students" }),
      { target: { value: "No matching student" } },
    );
    expect(screen.getByText("0 students selected (maximum 500)")).toBeTruthy();
    expect(screen.getByText("No students match these filters.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByText(total!)).toBeTruthy();
  });
  it("validates and reassigns through the staff MSW handler", async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole("checkbox", {
        name: "Select " + MOCK_PERSONAS.student.fullName,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reassign selected" }));
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Apply reassignment" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply reassignment" }));
    expect(
      await screen.findByText("Select an active adviser in this department."),
    ).toBeTruthy();
    await chooseAdviser();
    fireEvent.change(screen.getByLabelText("Reason for reassignment"), {
      target: { value: "Department handover" },
    });
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Apply reassignment" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply reassignment" }));
    expect(await screen.findByText("Reassigned 1 student.")).toBeTruthy();
    const row = screen.getByRole("row", {
      name: new RegExp(MOCK_PERSONAS.student.fullName),
    });
    await waitFor(() =>
      expect(
        within(row).getByText(MOCK_PERSONAS.adviser_secondary.fullName),
      ).toBeTruthy(),
    );
    expect(within(row).getByText(MOCK_PERSONAS.adviser.fullName)).toBeTruthy();
  });
  it("shows a future reassignment without replacing the current adviser", async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole("checkbox", {
        name: "Select " + MOCK_PERSONAS.student.fullName,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reassign selected" }));
    await chooseAdviser();
    const date = new Date().getUTCFullYear() + 2 + "-01-15";
    fireEvent.change(screen.getByLabelText("Effective since"), {
      target: { value: date },
    });
    fireEvent.change(screen.getByLabelText("Reason for reassignment"), {
      target: { value: "Planned handover" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Schedule reassignment" }),
    );
    expect(
      await screen.findByText("Scheduled reassignment for 1 student."),
    ).toBeTruthy();
    const row = screen.getByRole("row", {
      name: new RegExp(MOCK_PERSONAS.student.fullName),
    });
    await waitFor(() =>
      expect(within(row).getByText(/Scheduled:/)).toBeTruthy(),
    );
    expect(within(row).getByText(MOCK_PERSONAS.adviser.fullName)).toBeTruthy();
  });
});
