import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ProfilePhotoCard } from "./ProfilePhotoCard";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("rejects renamed text and a corrupt PNG before calling upload", async () => {
  const upload = vi.fn();
  const decode = vi.fn().mockRejectedValue(new Error("Cannot decode"));
  vi.stubGlobal("createImageBitmap", decode);
  render(<ProfilePhotoCard initials="ST" onUpload={upload} />);
  const input = screen.getByLabelText("Upload profile photo");
  fireEvent.change(input, {
    target: {
      files: [new File(["not an image"], "fake.png", { type: "image/png" })],
    },
  });
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Invalid image file.",
  );
  expect(decode).not.toHaveBeenCalled();
  const corrupt = new File(
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])],
    "broken.png",
    { type: "image/png" },
  );
  fireEvent.change(input, { target: { files: [corrupt] } });
  await waitFor(() => expect(decode).toHaveBeenCalledOnce());
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Invalid image file.",
  );
  expect(upload).not.toHaveBeenCalled();
});

it("accepts a decoded file over 2 MiB and reports upload errors separately", async () => {
  const upload = vi
    .fn()
    .mockRejectedValue(new Error("Could not upload the photo."));
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() }),
  );
  render(<ProfilePhotoCard initials="ST" onUpload={upload} />);
  const bytes = new Uint8Array(3 * 1024 * 1024);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const file = new File([bytes], "large.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Upload profile photo"), {
    target: { files: [file] },
  });
  await waitFor(() => expect(upload).toHaveBeenCalledWith(file));
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Could not upload the photo.",
  );
});

it("does not upload if the card is removed during decoding", async () => {
  const upload = vi.fn();
  const close = vi.fn();
  let finish: (value: {
    width: number;
    height: number;
    close: () => void;
  }) => void = () => {};
  const decode = vi.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  vi.stubGlobal("createImageBitmap", decode);
  const view = render(<ProfilePhotoCard initials="ST" onUpload={upload} />);
  const file = new File(
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])],
    "photo.png",
    { type: "image/png" },
  );
  fireEvent.change(screen.getByLabelText("Upload profile photo"), {
    target: { files: [file] },
  });
  await waitFor(() => expect(decode).toHaveBeenCalledOnce());
  view.unmount();
  finish({ width: 1, height: 1, close });
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(upload).not.toHaveBeenCalled();
});
