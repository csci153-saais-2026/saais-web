import { describe, expect, it } from "vitest";
import {
  MAX_STUDENT_PHOTO_BYTES,
  studentPhotoFileSchema,
  studentPhotoSchema,
} from "./student-photo-schema";

describe("studentPhotoFileSchema & studentPhotoSchema", () => {
  it("accepts JPG and PNG files up to 5 MiB", () => {
    expect(
      studentPhotoFileSchema.safeParse({
        mime_type: "image/jpeg",
        file_size_bytes: MAX_STUDENT_PHOTO_BYTES,
      }).success,
    ).toBe(true);

    expect(
      studentPhotoSchema.safeParse({
        mime_type: "image/png",
        file_size_bytes: 512_000,
        storage_object_path: "students/stu-1/avatar.png",
        avatar_url: "data:image/png;base64,abc",
      }).success,
    ).toBe(true);
  });

  it("rejects non-JPG/PNG mime types with user-friendly message", () => {
    const result = studentPhotoFileSchema.safeParse({
      mime_type: "image/gif",
      file_size_bytes: 1024,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Choose a JPG or PNG image.",
      );
    }
  });

  it("rejects files over 5 MiB with user-friendly message", () => {
    const result = studentPhotoFileSchema.safeParse({
      mime_type: "image/jpeg",
      file_size_bytes: MAX_STUDENT_PHOTO_BYTES + 1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "That image is over 5 MB. Choose a smaller one.",
      );
    }
  });

  it("requires a nonblank staged Storage key", () => {
    for (const path of [undefined, null, "", " ", "a".repeat(513)]) {
      const result = studentPhotoSchema.safeParse({
        mime_type: "image/png",
        file_size_bytes: 1024,
        storage_object_path: path,
        avatar_url: "https://storage.example.test/photo.png",
      });
      expect(result.success).toBe(false);
    }
  });

  it("rejects missing avatar_url on full photo update payload", () => {
    const result = studentPhotoSchema.safeParse({
      mime_type: "image/png",
      file_size_bytes: 1024,
      storage_object_path: "students/stu-1/avatar.png",
      avatar_url: "",
    });

    expect(result.success).toBe(false);
  });
});
