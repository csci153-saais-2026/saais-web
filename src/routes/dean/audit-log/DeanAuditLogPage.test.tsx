import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { MemoryRouter } from "react-router"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { AuthContext, type AuthContextValue } from "@/context/auth-context"
import { loginAsMockPersona, logoutMockPersona, MOCK_IDS, resetMockDatabase } from "@/mocks"
import { saaisMockServer } from "@/mocks/node"
import DeanAuditLogPage from "@/routes/dean/audit-log/DeanAuditLogPage"

vi.mock("@/lib/api", async (importOriginal) => {
  const api = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...api,
    apiClient: api.createSaaisApiClient({
      baseUrl: "https://saais-mock.supabase.co",
      apiKey: "mock",
      mode: "mock",
      fetch: (...args) => globalThis.fetch(...args),
    }),
  }
})

function makeMockAuth(facultyId: string | null = MOCK_IDS.facultyComputing): AuthContextValue {
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
  }
}

function renderAuditLogPage(facultyId: string | null = MOCK_IDS.facultyComputing) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={makeMockAuth(facultyId)}>
        <MemoryRouter>
          <DeanAuditLogPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

beforeAll(() => saaisMockServer.listen())
afterEach(() => {
  cleanup()
  saaisMockServer.resetHandlers()
  resetMockDatabase()
  logoutMockPersona()
})
afterAll(() => saaisMockServer.close())

describe("DeanAuditLogPage", () => {
  it("shows loading state then faculty name from API without read-only explanatory text", async () => {
    loginAsMockPersona("dean")
    renderAuditLogPage()

    expect(screen.getByRole("status").textContent).toMatch(/Loading the audit log/i)
    expect(await screen.findByText("Faculty of Computing")).toBeTruthy()
    expect(screen.queryByText(/read-only/i)).toBeNull()
    expect(screen.queryByText(/cannot be edited/i)).toBeNull()
  })

  it("shows empty state without Faculty of Computing fallback when faculty record is unavailable", async () => {
    loginAsMockPersona("dean")
    saaisMockServer.use(
      http.get("*/rest/v1/faculty", () => HttpResponse.json([])),
    )

    renderAuditLogPage()

    expect(await screen.findByText("Faculty unavailable")).toBeTruthy()
    expect(
      screen.getByText("Faculty information is unavailable for this account."),
    ).toBeTruthy()
    expect(screen.queryByText(/Faculty of Computing/i)).toBeNull()
  })
})
