import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  sign: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  resolveSaaisEnvConfig: () => ({ mode: "supabase" }),
  getSupabaseClient: () => ({
    storage: {
      from: (bucket: string) => {
        expect(bucket).toBe("student-photos");
        return {
          upload: storage.upload,
          remove: storage.remove,
          createSignedUrl: storage.sign,
        };
      },
    },
  }),
}));
import {
  removeStudentPhotoStagingObject,
  uploadStudentPhotoObject,
} from "./student-profile.api";

beforeEach(() => {
  vi.clearAllMocks();
  storage.upload.mockResolvedValue({ error: null });
  storage.remove.mockResolvedValue({ error: null });
});

describe("photo staging", () => {
  it("uploads to a unique staging path without overwriting or creating a long-lived URL", async () => {
    const file = new File(["image"], "photo.png", { type: "image/png" });
    const first = await uploadStudentPhotoObject(
      "student-1",
      file,
      "image/png",
    );
    const second = await uploadStudentPhotoObject(
      "student-1",
      file,
      "image/png",
    );
    expect(first.storagePath).toMatch(
      /^students\/student-1\/upload-[a-f0-9-]+\.png$/,
    );
    expect(second.storagePath).not.toBe(first.storagePath);
    expect(first.avatarUrl).toBe(`/student-photos/${first.storagePath}`);
    expect(storage.upload).toHaveBeenCalledWith(first.storagePath, file, {
      upsert: false,
      contentType: "image/png",
    });
    expect(storage.sign).not.toHaveBeenCalled();
    await removeStudentPhotoStagingObject(first.storagePath);
    expect(storage.remove).toHaveBeenCalledWith([first.storagePath]);
  });
  it("reports a failed upload", async () => {
    storage.upload.mockResolvedValue({ error: new Error("denied") });
    await expect(
      uploadStudentPhotoObject(
        "student-1",
        new File(["x"], "x.jpg", { type: "image/jpeg" }),
        "image/jpeg",
      ),
    ).rejects.toThrow("Could not upload the photo.");
  });
});
