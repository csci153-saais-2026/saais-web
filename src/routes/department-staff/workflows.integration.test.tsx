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
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { setupServer } from "msw/node";
import { AuthContext, type AuthContextValue } from "@/context/auth-context";
import { createSaaisApiClient, getMockSessionToken } from "@/lib/api";
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  MOCK_PERSONAS,
  resetMockDatabase,
} from "@/mocks";
import { saaisMswHandlers } from "@/mocks/handlers";
import { STUDENT_IMPORT_HEADERS } from "./students/import/student-import";
import DepartmentStaffPortal from "./DepartmentStaffPortal";

const persona = MOCK_PERSONAS.department_staff;
const workflowServer = setupServer(...saaisMswHandlers);

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiClient: actual.createSaaisApiClient({
      baseUrl: "http://localhost:3000",
      mode: "mock",
      getAccessToken: actual.getMockSessionToken,
      fetch: (...args) => globalThis.fetch(...args),
    }),
  };
});

function staffAuth(): AuthContextValue {
  const roleAssignments = getMockDatabase().roleAssignments.filter(
    (assignment) => assignment.profile_id === persona.profileId,
  );

  return {
    user: {
      id: persona.profileId,
      email: persona.email,
      fullName: persona.fullName,
      primaryRole: persona.primaryRole,
      roles: [...persona.roles],
      facultyId: persona.facultyId,
      departmentId: persona.departmentId,
    },
    profile: null,
    session: null,
    roles: [...persona.roles],
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

function renderWorkflowPortal(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={staffAuth()}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <nav aria-label="Workflow pages">
            <Link to="/department-staff/students">Students</Link>
            <Link to="/department-staff/adviser-assignments">
              Adviser assignments
            </Link>
          </nav>
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
  return { ...result, queryClient };
}

function csvFile(): File {
  return new File(
    [
      `${STUDENT_IMPORT_HEADERS.join(",")}\n` +
        `26-1-00991,Cross-page import student,step41.student@vsu.edu.ph,BSCS,BSCS 2024-2025 v1,23-1-02224@vsu.edu.ph,2026`,
    ],
    "step-41-import.csv",
    { type: "text/csv" },
  );
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
  workflowServer.listen();
});
beforeEach(() => {
  resetMockDatabase();
  loginAsMockPersona("department_staff");
});
afterEach(() => {
  cleanup();
  workflowServer.resetHandlers();
  resetMockDatabase();
  logoutMockPersona();
});
afterAll(() => workflowServer.close());

describe("Department Staff cross-page workflows", () => {
  it("imports a student and refreshes the live department roster from MSW", async () => {
    const { queryClient } = renderWorkflowPortal("/department-staff/students");
    await screen.findByRole("heading", { name: "Students", level: 1 });
    await screen.findByText(MOCK_PERSONAS.student.fullName);

    fireEvent.click(screen.getByRole("button", { name: "Import spreadsheet" }));
    fireEvent.change(screen.getByLabelText("Spreadsheet file"), {
      target: { files: [csvFile()] },
    });
    await screen.findByText(
      "1 of 1 rows passed local and canonical format checks.",
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Import 1 student" }),
    );
    await screen.findByText("Import results");

    expect(
      getMockDatabase().profiles.some(
        (profile) =>
          profile.student_number === "26-1-00991" &&
          profile.status === "active",
      ),
    ).toBe(true);
    expect(
      getMockDatabase().studentOrganizations.some(
        (organization) =>
          organization.student_id ===
          getMockDatabase().profiles.find(
            (profile) => profile.student_number === "26-1-00991",
          )?.id,
      ),
    ).toBe(true);
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .some(
          (query) =>
            query.queryKey[0] === "staff" && query.queryKey[3] === "students",
        ),
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.change(
      await screen.findByRole("searchbox", { name: "Search students" }),
      {
        target: { value: "Cross-page import student" },
      },
    );
    expect(await screen.findByText("Cross-page import student")).toBeTruthy();
    expect(screen.getByText("step41.student@vsu.edu.ph")).toBeTruthy();
    expect(screen.getByText(MOCK_PERSONAS.adviser.fullName)).toBeTruthy();
  });

  it("reassigns an adviser and shows the new assignment on the Students page", async () => {
    renderWorkflowPortal("/department-staff/adviser-assignments");
    await screen.findByText("Student–adviser assignments");
    await screen.findByRole("checkbox", {
      name: `Select ${MOCK_PERSONAS.student.fullName}`,
    });

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: `Select ${MOCK_PERSONAS.student.fullName}`,
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
    fireEvent.click(
      await screen.findByRole("option", {
        name: MOCK_PERSONAS.adviser_secondary.fullName,
      }),
    );
    fireEvent.change(screen.getByLabelText("Reason for reassignment"), {
      target: { value: "Step 41 integration handoff" },
    });
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Apply reassignment" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply reassignment" }));
    await screen.findByText("Reassigned 1 student.");

    fireEvent.click(screen.getByRole("link", { name: "Students" }));
    const search = await screen.findByRole("searchbox", {
      name: "Search students",
    });
    fireEvent.change(search, {
      target: { value: MOCK_PERSONAS.student.fullName },
    });
    expect(
      await screen.findByText(MOCK_PERSONAS.student.fullName),
    ).toBeTruthy();
    expect(
      await screen.findByText(MOCK_PERSONAS.adviser_secondary.fullName),
    ).toBeTruthy();
    await waitFor(() => {
      expect(
        getMockDatabase()
          .adviserAssignments.filter(
            (assignment) =>
              assignment.student_id === MOCK_IDS.studentPrimary &&
              assignment.end_date === null,
          )
          .map((assignment) => assignment.adviser_id),
      ).toEqual([MOCK_IDS.adviserSecondary]);
    });
  });

  it("denies foreign-department roster reads and course creation without mutating the catalog", async () => {
    const api = createSaaisApiClient({
      baseUrl: "http://localhost:3000",
      apiKey: "test-api-key",
      mode: "mock",
      getAccessToken: getMockSessionToken,
      fetch: (...args) => globalThis.fetch(...args),
    });
    const courseCount = getMockDatabase().courses.length;

    const foreignRoster = await api.GET("/functions/v1/students", {
      params: { query: { department_id: MOCK_IDS.deptDabe } },
    });
    expect(foreignRoster.response.status).toBe(403);

    const foreignCourse = await api.POST("/functions/v1/catalog/course", {
      body: {
        department_id: MOCK_IDS.deptDabe,
        code: "STEP41-FOREIGN",
        title: "Foreign department write must be denied",
        category: "major",
        units: 3,
        is_elective: false,
        status: "active",
        repeatable_type: "none",
      },
    });
    expect(foreignCourse.response.status).toBe(403);
    expect(getMockDatabase().courses).toHaveLength(courseCount);
  });

  it("changes roster visibility when the signed-in identity changes", async () => {
    const api = createSaaisApiClient({
      baseUrl: "http://localhost:3000",
      apiKey: "test-api-key",
      mode: "mock",
      getAccessToken: getMockSessionToken,
      fetch: (...args) => globalThis.fetch(...args),
    });

    const staffRoster = await api.GET("/functions/v1/students", {
      params: { query: { department_id: MOCK_IDS.deptDcst } },
    });
    expect(staffRoster.response.status).toBe(200);
    expect(staffRoster.data?.items.length).toBeGreaterThan(1);

    logoutMockPersona();
    loginAsMockPersona("adviser");
    const adviserRoster = await api.GET("/functions/v1/students", {
      params: { query: { department_id: MOCK_IDS.deptDcst } },
    });
    expect(adviserRoster.response.status).toBe(200);
    expect(adviserRoster.data?.items.length).toBeGreaterThan(0);
    expect(adviserRoster.data?.items.length).toBeLessThan(
      staffRoster.data!.items.length,
    );
    expect(
      adviserRoster.data?.items.every((student) =>
        getMockDatabase().adviserAssignments.some(
          (assignment) =>
            assignment.student_id === student.student_id &&
            assignment.adviser_id === MOCK_PERSONAS.adviser.profileId,
        ),
      ),
    ).toBe(true);
  });
});
