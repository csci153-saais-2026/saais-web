import { useQueryClient } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { QueryProvider } from "../QueryProvider";

describe("QueryProvider", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryProvider>{children}</QueryProvider>
  );

  it("keeps one QueryClient across rerenders", () => {
    const { result, rerender } = renderHook(() => useQueryClient(), {
      wrapper,
    });
    const initialClient = result.current;

    rerender();

    expect(result.current).toBe(initialClient);
  });

  it("disables automatic mutation retries", () => {
    const { result } = renderHook(() => useQueryClient(), { wrapper });

    expect(result.current.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
