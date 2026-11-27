import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { AuthContext, type AuthContextValue } from "@/context/auth-context";
import {
  loginAsMockPersona,
  logoutMockPersona,
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";
import DeanReportsPage from "@/routes/dean/reports/DeanReportsPage";

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

function makeMockAuth(facultyId: string | null = null): AuthContextValue {
  return {
    user: {
      id: "dean-1",
      email: "paz.villanueva@example.edu.ph",
      fullName: "Dr. Paz Villanueva",
      primaryRole: "dean",
      roles: ["dean"],
      facultyId,
      status: "active",
    },
    profile: null,
    session: null,
    roles: ["dean"],
    roleAssignments: [],
    roleScopes: [{ role: "dean", facultyId, departmentId: null }],
    activeRole: "dean",
    primaryRole: "dean",
    isLoading: false,
    isAuthenticated: true,
    isAllowedToEnter: true,
    entryBlockedReason: null,
    authError: null,
    isPasswordRecovery: false,
    keepSignedIn: false,
    isMockMode: true,
    activePersonaKey: null,
    signInWithPassword: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    retryHydration: vi.fn(),
    setActiveRole: vi.fn(),
    switchMockPersona: vi.fn(),
  };
}

function renderReportsPage(facultyId: string | null = null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={makeMockAuth(facultyId)}>
        <MemoryRouter>
          <DeanReportsPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeAll(() => saaisMockServer.listen());
afterEach(() => {
  cleanup();
  saaisMockServer.resetHandlers();
  resetMockDatabase();
  logoutMockPersona();
});
afterAll(() => saaisMockServer.close());

describe("DeanReportsPage", () => {
  it("shows loading state first, then renders faculty name from /rest/v1/faculty and dynamic departments note", async () => {
    loginAsMockPersona("dean");
    renderReportsPage();

    expect(document.querySelector("[skullet-status]")?.textContent).toMatch(
      /Loading faculty reports/i,
    );
    expect(await screen.findByText("Faculty of Computing")).toBeTruthy();
    expect(await screen.findByText("Across DCST and DIS")).toBeTruthy();
    expect(screen.queryByText(/read-only/i)).toBeNull();
  });

  it("shows empty state without Faculty of Computing fallback when faculty record is unavailable", async () => {
    loginAsMockPersona("dean");
    saaisMockServer.use(
      http.get("*/rest/v1/faculty", () => HttpResponse.json([])),
    );

    renderReportsPage();

    expect(await screen.findByText("Faculty unavailable")).toBeTruthy();
    expect(
      screen.getByText("Faculty information is unavailable for this account."),
    ).toBeTruthy();
    expect(screen.queryByText(/Faculty of Computing/i)).toBeNull();
  });

  it("opens shared cohort students dialog and returns focus to the View students opener on close", async () => {
    loginAsMockPersona("dean");
    renderReportsPage();

    const viewButtons = await screen.findAllByRole("button", {
      name: /View students/,
    });
    const opener = viewButtons[0];
    opener.focus();
    expect(document.activeElement).toBe(opener);

    fireEvent.click(opener);

    expect(await screen.findByText(/Batch \d+ · Student GWA/)).toBeTruthy();
    expect(screen.getByText(/· \d+ students?$/)).toBeTruthy();
    expect(screen.getByText("Student ID")).toBeTruthy();

    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    await waitFor(() => {
      expect(screen.queryByText(/Batch \d+ · Student GWA/)).toBeNull();
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(opener);
    });
  });
});
