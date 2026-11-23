import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
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
import type { ApiSchema } from "@/lib/api";
import {
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";
import { resolveDeanFaculty } from "@/routes/dean/shared/dean-faculty.api";
import { useDeanFaculty } from "@/routes/dean/shared/use-dean-faculty";

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

const FACULTIES: ApiSchema<"Faculty">[] = [
  {
    id: MOCK_IDS.facultyComputing,
    code: "FoC",
    name: "Faculty of Computing",
    letterhead_prefix: "Office of the Dean",
    letterhead_name: "Faculty of Computing",
    dean_name: "Dr. Paz Villanueva",
  },
  {
    id: MOCK_IDS.facultyEngineering,
    code: "FET",
    name: "Faculty of Engineering and Technology",
    letterhead_prefix: "Office of the Dean",
    letterhead_name: "Faculty of Engineering and Technology",
    dean_name: "Dr. Ana Santos",
  },
];

function makeMockAuth(
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  return {
    user: {
      id: "dean-1",
      email: "dean@example.edu.ph",
      fullName: "Dr. Ana Santos",
      primaryRole: "dean",
      roles: ["dean"],
      facultyId: null,
      status: "active",
    },
    profile: null,
    session: null,
    roles: ["dean"],
    roleAssignments: [],
    roleScopes: [],
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
    ...overrides,
  };
}

function FacultyProbe({ overrideId }: { overrideId?: string | null }) {
  const { facultyName, isLoading, isError } = useDeanFaculty(overrideId);
  if (isLoading) return <p>loading</p>;
  if (isError) return <p>error</p>;
  return <p>{facultyName ?? "unavailable"}</p>;
}

beforeAll(() => saaisMockServer.listen());
afterEach(() => {
  cleanup();
  saaisMockServer.resetHandlers();
  resetMockDatabase();
  logoutMockPersona();
});
afterAll(() => saaisMockServer.close());

describe("dean-faculty", () => {
  it("resolves faculty strictly by id first, then deanName, and returns null when missing or empty", () => {
    expect(
      resolveDeanFaculty(FACULTIES, { facultyId: MOCK_IDS.facultyEngineering })
        ?.name,
    ).toBe("Faculty of Engineering and Technology");
    expect(
      resolveDeanFaculty(FACULTIES, { deanName: "Dr. Ana Santos" })?.name,
    ).toBe("Faculty of Engineering and Technology");
    expect(
      resolveDeanFaculty(FACULTIES, { facultyId: "unknown-id" }),
    ).toBeNull();
    expect(
      resolveDeanFaculty(FACULTIES, { deanName: "Unknown Dean" }),
    ).toBeNull();
    expect(
      resolveDeanFaculty([], { facultyId: MOCK_IDS.facultyComputing }),
    ).toBeNull();
  });

  it("loads faculty name from /rest/v1/faculty and reports unavailable when empty", async () => {
    loginAsMockPersona("dean");
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={makeMockAuth({
            roleScopes: [
              {
                role: "dean",
                facultyId: MOCK_IDS.facultyEngineering,
                departmentId: null,
              },
            ],
          })}
        >
          <FacultyProbe />
        </AuthContext.Provider>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("Faculty of Engineering and Technology"),
    ).toBeTruthy();

    saaisMockServer.use(
      http.get("*/rest/v1/faculty", () => HttpResponse.json([])),
    );
    const emptyClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    rerender(
      <QueryClientProvider client={emptyClient}>
        <AuthContext.Provider value={makeMockAuth()}>
          <FacultyProbe />
        </AuthContext.Provider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("unavailable")).toBeTruthy();
  });
});
