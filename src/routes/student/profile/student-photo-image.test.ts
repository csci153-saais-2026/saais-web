import { afterEach, describe, expect, it, vi } from "vitest";
import { validateStudentPhotoImage } from "./student-photo-image";

const png = () =>
  new File(
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])],
    "photo.png",
    { type: "image/png" },
  );
const jpg = () =>
  new File([new Uint8Array([255, 216, 255, 0])], "photo.jpg", {
    type: "image/jpeg",
  });

afterEach(() => vi.unstubAllGlobals());

describe("validateStudentPhotoImage", () => {
  it("decodes PNG and JPEG and closes each bitmap", async () => {
    const close = vi.fn();
    const decode = vi
      .fn()
      .mockResolvedValue({ width: 100, height: 100, close });
    vi.stubGlobal("createImageBitmap", decode);
    await validateStudentPhotoImage(png());
    await validateStudentPhotoImage(jpg());
    expect(decode).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("rejects renamed text and mismatched MIME before decoding", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    await expect(
      validateStudentPhotoImage(
        new File(["not a png"], "photo.png", { type: "image/png" }),
      ),
    ).rejects.toThrow("Invalid image file.");
    const mislabeled = new File(
      [new Uint8Array([255, 216, 255, 0])],
      "photo.png",
      { type: "image/png" },
    );
    await expect(validateStudentPhotoImage(mislabeled)).rejects.toThrow(
      "Invalid image file.",
    );
    expect(decode).not.toHaveBeenCalled();
  });

  it("rejects a corrupt file even if its signature looks valid", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("decode failed")),
    );
    await expect(validateStudentPhotoImage(png())).rejects.toThrow();
  });

  it("enforces the backend pixel limit and releases the bitmap", async () => {
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 4001, height: 4000, close }),
    );
    await expect(validateStudentPhotoImage(png())).rejects.toThrow(
      "16 megapixels",
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("uses and releases an image object URL if createImageBitmap is unavailable", async () => {
    const revoke = vi.fn();
    const NativeURL = URL;
    class TestURL extends NativeURL {
      static createObjectURL() {
        return "blob:test";
      }
      static revokeObjectURL(url: string) {
        revoke(url);
      }
    }
    class TestImage {
      naturalWidth = 10;
      naturalHeight = 10;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(value: string) {
        if (value) queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("createImageBitmap", undefined);
    vi.stubGlobal("URL", TestURL);
    vi.stubGlobal("Image", TestImage);
    await validateStudentPhotoImage(png());
    expect(revoke).toHaveBeenCalledWith("blob:test");
  });
});
