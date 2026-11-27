import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api";
import { useSidebarStudentPhoto } from "./use-sidebar-student-photo";
vi.mock("./use-student-photo-url", () => ({
  useStudentPhotoUrl: (url: string | null | undefined) => url ?? null,
}));
afterEach(() => vi.restoreAllMocks());
it("loads only the signed-in student's photo and clears it when the account changes", async () => {
  const get = vi
    .spyOn(apiClient, "GET")
    .mockImplementation((_path, options) => {
      const query = options?.params?.query as { id?: string };
      const id = query.id?.replace("eq.", "") ?? "";
      return Promise.resolve({
        data: [{ id, avatar_url: `${id}-photo` }],
        response: new Response(),
      }) as never;
    });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result, rerender } = renderHook(
    ({ id }) => useSidebarStudentPhoto(id),
    { wrapper, initialProps: { id: "student-1" as string | undefined } },
  );
  await waitFor(() => expect(result.current).toBe("student-1-photo"));
  rerender({ id: undefined });
  expect(result.current).toBeNull();
  rerender({ id: "student-2" });
  await waitFor(() => expect(result.current).toBe("student-2-photo"));
  expect(get).toHaveBeenCalledTimes(2);
});
