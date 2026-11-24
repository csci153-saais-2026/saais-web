import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ sign: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  resolveSaaisEnvConfig: () => ({
    mode: "supabase",
    supabaseUrl: "https://project.supabase.co",
  }),
  getSupabaseClient: () => ({
    storage: { from: () => ({ createSignedUrl: storage.sign }) },
  }),
}));
import { useStudentPhotoUrl } from "./use-student-photo-url";

const avatar =
  "/storage/v1/object/authenticated/student-photos/students/student-1/validated-one.png";
beforeEach(() =>
  storage.sign.mockResolvedValue({
    data: { signedUrl: "https://signed.example/photo" },
    error: null,
  }),
);
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("useStudentPhotoUrl", () => {
  it("signs the private object for display", async () => {
    const { result } = renderHook(() => useStudentPhotoUrl(avatar, "viewer"));
    await waitFor(() =>
      expect(result.current).toBe("https://signed.example/photo"),
    );
    expect(storage.sign).toHaveBeenCalledWith(
      "students/student-1/validated-one.png",
      600,
    );
  });
  it("refreshes the signed URL before it expires", async () => {
    vi.useFakeTimers();
    const view = renderHook(() => useStudentPhotoUrl(avatar, "viewer"));
    await act(async () => {});
    expect(storage.sign).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8 * 60 * 1000);
    });
    expect(storage.sign).toHaveBeenCalledTimes(2);
    view.unmount();
  });
  it("renews older signed URLs from the same Supabase project", async () => {
    const oldUrl =
      "https://project.supabase.co/storage/v1/object/sign/student-photos/students/student-1/avatar.png?token=expired";
    const { result } = renderHook(() => useStudentPhotoUrl(oldUrl, "viewer"));
    await waitFor(() =>
      expect(result.current).toBe("https://signed.example/photo"),
    );
    expect(storage.sign).toHaveBeenCalledWith(
      "students/student-1/avatar.png",
      600,
    );
  });
  it("does not display a previous viewer's pending photo", async () => {
    let resolveFirst!: (value: unknown) => void;
    storage.sign.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const { result, rerender } = renderHook(
      ({ viewer }) => useStudentPhotoUrl(avatar, viewer),
      { initialProps: { viewer: "first" } },
    );
    rerender({ viewer: "second" });
    await waitFor(() =>
      expect(result.current).toBe("https://signed.example/photo"),
    );
    await act(async () =>
      resolveFirst({
        data: { signedUrl: "https://old.example/photo" },
        error: null,
      }),
    );
    expect(result.current).toBe("https://signed.example/photo");
  });
  it("preserves non-private image URLs and falls back when signing fails", async () => {
    const { result, rerender } = renderHook(
      ({ url }) => useStudentPhotoUrl(url),
      { initialProps: { url: "data:image/png;base64,abc" } },
    );
    await waitFor(() =>
      expect(result.current).toBe("data:image/png;base64,abc"),
    );
    storage.sign.mockResolvedValue({ data: null, error: new Error("denied") });
    rerender({ url: avatar });
    await waitFor(() => expect(storage.sign).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
