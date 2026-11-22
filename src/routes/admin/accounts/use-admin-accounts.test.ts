import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminAccounts } from "./use-admin-accounts";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  apiClient: { GET: getMock },
  unwrapApiResult: (result: { data: unknown }) => result.data,
}));

const query = {
  limit: 21,
  offset: 0,
} as const;

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe("useAdminAccounts", () => {
  beforeEach(() => {
    getMock.mockReset();
    getMock.mockResolvedValue({
      data: [],
      response: new Response(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads accounts through the bounded contract operation", async () => {
    const accounts = [{ profile: { id: "profile-1" } }];
    getMock.mockResolvedValue({
      data: accounts,
      response: new Response(),
    });

    const { result } = renderHook(() => useAdminAccounts(query), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.accounts).toEqual(accounts));
    expect(getMock).toHaveBeenCalledWith(
      "/functions/v1/accounts",
      expect.objectContaining({
        params: { query },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(result.current.error).toBeNull();
  });

  it("surfaces request failures and can retry", async () => {
    getMock.mockRejectedValueOnce(new Error("Accounts unavailable"));

    const { result } = renderHook(() => useAdminAccounts(query), {
      wrapper: createWrapper(),
    });
    await waitFor(() =>
      expect(result.current.error).toBe("Accounts unavailable"),
    );

    getMock.mockResolvedValueOnce({
      data: [],
      response: new Response(),
    });
    act(() => result.current.reload());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(getMock).toHaveBeenCalledTimes(2);
  });
});
