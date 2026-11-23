import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import * as React from "react";
import { AuthProvider } from "../AuthProvider";
import { QueryProvider } from "../QueryProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { MOCK_PERSONAS } from "@/mocks/personas";
import { resetMockDatabase } from "@/mocks/store";
import {
  clearMockPersonaSession,
  getSyntheticPersonas,
} from "@/lib/auth/mock-auth-service";
import {
  AuthHydrationError,
  fetchAuthenticatedUserBoundary,
} from "@/lib/auth/auth-service";
import { apiClient } from "@/lib/api";
import {
  getSupabaseClient,
  resetSupabaseClientForTests,
  resolveSaaisEnvConfig,
  saaisAuthStorage,
  setSupabaseSessionPersistence,
} from "@/lib/supabase/client";

describe("AuthProvider, useAuth & Environment Config", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetSupabaseClientForTests();
    localStorage.clear();
    sessionStorage.clear();
    clearMockPersonaSession();
    resetMockDatabase();
    setSupabaseSessionPersistence(true);
  });

  it("throws explicitly when useAuth() is called outside <AuthProvider>", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      /useAuth must be used within an <AuthProvider>/i,
    );
  });

  it("fails clearly in production when Supabase configuration is missing instead of defaulting to mock", () => {
    const prodConfig = resolveSaaisEnvConfig({ PROD: true });
    expect(prodConfig.mode).toBe("supabase");
    expect(prodConfig.configError).toMatch(
      /Supabase configuration is missing/i,
    );
  });

  it("stores real Supabase session tokens in localStorage vs sessionStorage based on keepSignedIn", () => {
    setSupabaseSessionPersistence(false);
    saaisAuthStorage.setItem("sb-test-auth-token", "session-only-token");
    expect(sessionStorage.getItem("sb-test-auth-token")).toBe(
      "session-only-token",
    );
    expect(localStorage.getItem("sb-test-auth-token")).toBeNull();

    setSupabaseSessionPersistence(true);
    saaisAuthStorage.setItem("sb-test-auth-token", "persistent-token");
    expect(localStorage.getItem("sb-test-auth-token")).toBe("persistent-token");
    expect(sessionStorage.getItem("sb-test-auth-token")).toBeNull();
  });

  it("fails closed in fetchAuthenticatedUserBoundary on API errors, unexpected shapes, or missing exact profile match", async () => {
    vi.spyOn(apiClient, "GET")
      .mockResolvedValueOnce({
        data: undefined,
        error: { message: "Database unavailable" },
        response: new Response(null, { status: 500 }),
      } as never)
      .mockResolvedValueOnce({
        data: [],
        error: undefined,
        response: new Response(null, { status: 200 }),
      } as never);

    await expect(fetchAuthenticatedUserBoundary("user-123")).rejects.toThrow(
      AuthHydrationError,
    );

    vi.spyOn(apiClient, "GET")
      .mockResolvedValueOnce({
        data: [
          {
            id: "user-123",
            email: "a@vsu.edu.ph",
            role: "student",
            roles: ["student"],
            status: "active",
          },
        ],
        error: undefined,
        response: new Response(null, { status: 200 }),
      } as never)
      .mockResolvedValueOnce({
        data: undefined,
        error: { message: "Role query failed" },
        response: new Response(null, { status: 500 }),
      } as never);

    await expect(fetchAuthenticatedUserBoundary("user-123")).rejects.toThrow(
      AuthHydrationError,
    );

    vi.spyOn(apiClient, "GET")
      .mockResolvedValueOnce({
        data: [
          {
            id: "different-user",
            email: "other@vsu.edu.ph",
            role: "admin",
            roles: ["admin"],
            status: "active",
          },
        ],
        error: undefined,
        response: new Response(null, { status: 200 }),
      } as never)
      .mockResolvedValueOnce({
        data: [],
        error: undefined,
        response: new Response(null, { status: 200 }),
      } as never);

    const result = await fetchAuthenticatedUserBoundary("user-123");
    expect(result.profile).toBeNull();
    expect(result.roles).toEqual([]);
  });

  it("restores mock session synchronously so protected routes do not redirect on refresh", () => {
    sessionStorage.setItem("saais_active_mock_persona", "adviser");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    // With synchronous restoration, initial render has isLoading: false AND restored user
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user?.email).toBe(MOCK_PERSONAS.adviser.email);
    expect(result.current.activeRole).toBe("adviser");
    expect(result.current.isAllowedToEnter).toBe(true);
  });

  it("completes mock initialization with isLoading: false when storage is empty", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("exercises Student-only, Adviser-only, Dept-Head-only, Dean-only, and Multi-role synthetic personas", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.switchMockPersona("student");
    });
    expect(result.current.roles).toEqual(["student"]);
    expect(result.current.isAllowedToEnter).toBe(true);

    act(() => {
      result.current.switchMockPersona("adviser");
    });
    expect(result.current.roles).toEqual(["adviser"]);
    expect(result.current.isAllowedToEnter).toBe(true);

    act(() => {
      result.current.switchMockPersona("department_head_only");
    });
    expect(result.current.roles).toEqual(["department_head"]);
    expect(result.current.roleScopes[0]?.departmentId).toBeTruthy();

    act(() => {
      result.current.switchMockPersona("dean_only");
    });
    expect(result.current.roles).toEqual(["dean"]);
    expect(result.current.isAllowedToEnter).toBe(true);

    act(() => {
      result.current.switchMockPersona("dean_dept_head");
    });
    expect(result.current.roles).toEqual([
      "dean",
      "department_head",
      "adviser",
    ]);
    expect(result.current.activeRole).toBe("dean");
    expect(result.current.roleAssignments).toHaveLength(3);

    act(() => {
      void result.current.signOut();
    });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("clears sensitive cached data when mock identity or active role changes", () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    queryClient.setQueryData(
      ["department-head", "students", "private"],
      ["old account data"],
    );
    act(() => result.current.switchMockPersona("department_head"));
    expect(
      queryClient.getQueryData(["department-head", "students", "private"]),
    ).toBeUndefined();

    queryClient.setQueryData(
      ["department-head", "students", "private"],
      ["old scope data"],
    );
    act(() => result.current.setActiveRole("adviser"));
    expect(
      queryClient.getQueryData(["department-head", "students", "private"]),
    ).toBeUndefined();

    queryClient.setQueryData(
      ["department-head", "students", "private"],
      ["signed in data"],
    );
    act(() => {
      void result.current.signOut();
    });
    expect(
      queryClient.getQueryData(["department-head", "students", "private"]),
    ).toBeUndefined();
    queryClient.clear();
  });

  it("cancels in-flight sensitive reads before clearing identity-scoped data", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    let requestSignal: AbortSignal | undefined;
    const pending = queryClient.fetchQuery({
      queryKey: ["department-head", "students", "sensitive"],
      queryFn: ({ signal }) => {
        requestSignal = signal;
        return new Promise<string[]>((resolve) => {
          signal.addEventListener("abort", () => resolve(["aborted"]));
        });
      },
    });
    void pending.catch(() => undefined);
    await Promise.resolve();

    act(() => result.current.switchMockPersona("department_head"));

    expect(requestSignal?.aborted).toBe(true);
    expect(
      queryClient.getQueryData(["department-head", "students", "sensitive"]),
    ).toBeUndefined();
    queryClient.clear();
  });

  it("preserves the confirmed rejection reason across cleanup sign-out when account is disabled", async () => {
    vi.stubEnv("VITE_API_MODE", "supabase");
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");

    const sdk = getSupabaseClient("supabase");
    const mockSession = {
      access_token: "sb-jwt",
      user: {
        id: "disabled-uid",
        email: "inactive@vsu.edu.ph",
        app_metadata: { provider: "password" },
      },
    };

    vi.spyOn(sdk.auth, "getSession").mockResolvedValue({
      data: { session: mockSession as never },
      error: null,
    });
    let authCallback: ((event: string, session: unknown) => void) | null = null;
    vi.spyOn(sdk.auth, "onAuthStateChange").mockImplementation((handler) => {
      authCallback = handler as never;
      return {
        data: {
          subscription: {
            id: "sub-1",
            callback: handler,
            unsubscribe: vi.fn(),
          },
        },
      };
    });
    const localSignOutSpy = vi
      .spyOn(sdk.auth, "signOut")
      .mockImplementation(async () => {
        authCallback?.("SIGNED_OUT", null);
        return { error: null };
      });

    vi.spyOn(apiClient, "GET")
      .mockResolvedValueOnce({
        data: [
          {
            id: "disabled-uid",
            email: "inactive@vsu.edu.ph",
            full_name: "Inactive User",
            role: "student",
            roles: ["student"],
            status: "disabled",
          },
        ],
        error: undefined,
        response: new Response(null, { status: 200 }),
      } as never)
      .mockResolvedValueOnce({
        data: [
          {
            id: "ra-1",
            profile_id: "disabled-uid",
            role: "student",
            faculty_id: null,
            department_id: null,
          },
        ],
        error: undefined,
        response: new Response(null, { status: 200 }),
      } as never);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(localSignOutSpy).toHaveBeenCalledWith({ scope: "local" });
    });
    expect(result.current.isAllowedToEnter).toBe(false);
    expect(result.current.entryBlockedReason).toMatch(/deactivated/i);
  });

  it("rejects password sign-in for unrecognized, invited, and disabled accounts and honors keepSignedIn", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    const personas = getSyntheticPersonas();

    await expect(
      result.current.signInWithPassword(
        "unknown.person@vsu.edu.ph",
        "Password1234!",
      ),
    ).rejects.toThrow(/not a registered institutional profile/i);

    await expect(
      result.current.signInWithPassword(
        MOCK_PERSONAS.student_secondary.email,
        "Password1234!",
      ),
    ).rejects.toThrow(/pending activation/i);

    await expect(
      result.current.signInWithPassword(
        personas.disabled_account.email,
        "Password1234!",
      ),
    ).rejects.toThrow(/deactivated/i);

    await act(async () => {
      await result.current.signInWithPassword(
        MOCK_PERSONAS.adviser.email,
        "Secret12345!",
        false,
      );
    });
    expect(sessionStorage.getItem("saais_active_mock_persona")).toBe("adviser");
    expect(localStorage.getItem("saais_active_mock_persona")).toBeNull();
  });

  it("validates credentials and exercises Supabase password, Google, and sign-out errors", async () => {
    vi.stubEnv("VITE_API_MODE", "supabase");
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");
    const sdk = getSupabaseClient("supabase");
    vi.spyOn(sdk.auth, "getSession").mockResolvedValue({
      data: { session: null },
      error: null,
    });
    vi.spyOn(sdk.auth, "onAuthStateChange").mockImplementation(
      (handler) =>
        ({
          data: {
            subscription: {
              id: "sub-auth-actions",
              callback: handler,
              unsubscribe: vi.fn(),
            },
          },
        }) as never,
    );

    const passwordSignIn = vi
      .spyOn(sdk.auth, "signInWithPassword")
      .mockResolvedValueOnce({
        data: { user: null, session: null },
        error: new Error("password rejected") as never,
      })
      .mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      });
    const googleSignIn = vi
      .spyOn(sdk.auth, "signInWithOAuth")
      .mockResolvedValueOnce({
        data: { provider: "google", url: null },
        error: new Error("oauth rejected") as never,
      })
      .mockResolvedValueOnce({
        data: { provider: "google", url: null },
        error: null,
      });
    const signOut = vi
      .spyOn(sdk.auth, "signOut")
      .mockResolvedValue({ error: new Error("sign-out failed") as never });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      result.current.signInWithPassword("bad-email", "Password12345!"),
    ).rejects.toThrow(/valid institutional email/i);
    await expect(
      result.current.signInWithPassword(
        " student@vsu.edu.ph ",
        "Password12345!",
        false,
      ),
    ).rejects.toThrow("password rejected");
    expect(passwordSignIn).toHaveBeenCalledWith({
      email: "student@vsu.edu.ph",
      password: "Password12345!",
    });
    expect(sessionStorage.getItem("saais_keep_signed_in")).toBe("false");
    await expect(
      result.current.signInWithPassword("student@vsu.edu.ph", "Password12345!"),
    ).resolves.toBeUndefined();

    await expect(result.current.signInWithGoogle()).rejects.toThrow(
      "oauth rejected",
    );
    await expect(
      result.current.signInWithGoogle(false),
    ).resolves.toBeUndefined();
    expect(googleSignIn).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: "vsu.edu.ph" },
      },
    });

    await act(async () => {
      await result.current.signOut();
    });
    expect(signOut).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "Supabase sign out error:",
      expect.any(Error),
    );
    expect(result.current.user).toBeNull();
  });
});

describe("AuthProvider refocus / repeated auth events", () => {
  type AuthCallback = (event: string, session: unknown) => void;

  function makeSession(userId: string, accessToken: string) {
    return {
      access_token: accessToken,
      user: {
        id: userId,
        email: `${userId}@vsu.edu.ph`,
        app_metadata: { provider: "password" },
      },
    };
  }

  function boundaryFor(userId: string) {
    return {
      profile: {
        id: userId,
        email: `${userId}@vsu.edu.ph`,
        full_name: `User ${userId}`,
        role: "student",
        roles: ["student"],
        status: "active",
      },
      assignment: {
        id: `ra-${userId}`,
        profile_id: userId,
        role: "student",
        faculty_id: null,
        department_id: null,
      },
    };
  }

  function setup(initialUserId: string | null) {
    vi.stubEnv("VITE_API_MODE", "supabase");
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");

    const sdk = getSupabaseClient("supabase");
    const initialSession = initialUserId
      ? makeSession(initialUserId, "token-1")
      : null;

    vi.spyOn(sdk.auth, "getSession").mockResolvedValue({
      data: { session: initialSession as never },
      error: null,
    });

    let authCallback: AuthCallback | null = null;
    vi.spyOn(sdk.auth, "onAuthStateChange").mockImplementation((handler) => {
      authCallback = handler as never;
      return {
        data: {
          subscription: {
            id: "sub-1",
            callback: handler,
            unsubscribe: vi.fn(),
          },
        },
      };
    });

    // Optional gate so a test can observe the loading state mid-hydration.
    const gate: { promise: Promise<void> | null } = { promise: null };
    const profileFetches: string[] = [];

    vi.spyOn(apiClient, "GET").mockImplementation((async (
      path: string,
      init: { params: { query: Record<string, string> } },
    ) => {
      const query = init.params.query;
      const userId = (query.id ?? query.profile_id).replace("eq.", "");
      const boundary = boundaryFor(userId);
      if (path === "/rest/v1/profile") {
        profileFetches.push(userId);
        if (gate.promise) await gate.promise;
        return {
          data: [boundary.profile],
          error: undefined,
          response: new Response(null, { status: 200 }),
        };
      }
      return {
        data: [boundary.assignment],
        error: undefined,
        response: new Response(null, { status: 200 }),
      };
    }) as never);

    const queryClient = new QueryClient();
    const clearSpy = vi.spyOn(queryClient, "clear");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
    const rendered = renderHook(() => useAuth(), { wrapper });

    return {
      ...rendered,
      gate,
      clearSpy,
      profileFetches,
      emit: (event: string, session: unknown) => {
        act(() => {
          authCallback?.(event, session);
        });
      },
    };
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetSupabaseClientForTests();
    localStorage.clear();
    sessionStorage.clear();
    clearMockPersonaSession();
    resetMockDatabase();
    setSupabaseSessionPersistence(true);
  });

  it("does not reload when SIGNED_IN is re-emitted for the same user", async () => {
    const t = setup("user-a");
    await waitFor(() => expect(t.result.current.user?.id).toBe("user-a"));
    expect(t.result.current.isLoading).toBe(false);
    t.clearSpy.mockClear();
    const fetchesBefore = t.profileFetches.length;

    t.emit("SIGNED_IN", makeSession("user-a", "token-1"));

    expect(t.result.current.isLoading).toBe(false);
    expect(t.clearSpy).not.toHaveBeenCalled();
    await act(async () => {
      await Promise.resolve();
    });
    expect(t.profileFetches.length).toBe(fetchesBefore);
    expect(t.result.current.user?.id).toBe("user-a");
  });

  it("updates the session on TOKEN_REFRESHED without a loading flash", async () => {
    const t = setup("user-a");
    await waitFor(() => expect(t.result.current.user?.id).toBe("user-a"));
    t.clearSpy.mockClear();
    const fetchesBefore = t.profileFetches.length;

    t.emit("TOKEN_REFRESHED", makeSession("user-a", "token-2"));

    expect(t.result.current.isLoading).toBe(false);
    expect(t.result.current.session?.access_token).toBe("token-2");
    expect(t.clearSpy).not.toHaveBeenCalled();
    expect(t.profileFetches.length).toBe(fetchesBefore);
  });

  it("fully re-hydrates when SIGNED_IN arrives for a different user", async () => {
    const t = setup("user-a");
    await waitFor(() => expect(t.result.current.user?.id).toBe("user-a"));
    t.clearSpy.mockClear();

    let release!: () => void;
    t.gate.promise = new Promise<void>((resolve) => {
      release = resolve;
    });

    t.emit("SIGNED_IN", makeSession("user-b", "token-b"));

    expect(t.result.current.isLoading).toBe(true);
    await act(async () => {
      release();
    });
    await waitFor(() => expect(t.result.current.user?.id).toBe("user-b"));
    expect(t.result.current.isLoading).toBe(false);
    expect(t.clearSpy).toHaveBeenCalled();
    expect(t.profileFetches).toContain("user-b");
  });

  it("clears state on SIGNED_OUT", async () => {
    const t = setup("user-a");
    await waitFor(() => expect(t.result.current.user?.id).toBe("user-a"));

    t.emit("SIGNED_OUT", null);

    expect(t.result.current.user).toBeNull();
    expect(t.result.current.session).toBeNull();
    expect(t.result.current.isLoading).toBe(false);
    expect(t.clearSpy).toHaveBeenCalled();
  });

  it("hydrates normally on the first SIGNED_IN when no user is hydrated yet", async () => {
    const t = setup(null);
    await waitFor(() => expect(t.result.current.isLoading).toBe(false));
    expect(t.result.current.user).toBeNull();

    t.emit("SIGNED_IN", makeSession("user-a", "token-1"));

    expect(t.result.current.isLoading).toBe(true);
    await waitFor(() => expect(t.result.current.user?.id).toBe("user-a"));
    expect(t.result.current.isLoading).toBe(false);
    expect(t.profileFetches).toEqual(["user-a"]);
  });
});
