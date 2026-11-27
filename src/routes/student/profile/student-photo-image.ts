const MAX_PHOTO_PIXELS = 16_000_000;

function readBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Invalid image file."));
    reader.onabort = () => reject(new Error("Invalid image file."));
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer)
        resolve(new Uint8Array(reader.result));
      else reject(new Error("Invalid image file."));
    };
    reader.readAsArrayBuffer(file);
  });
}

/** An `acTL` chunk ahead of the image data marks a PNG as animated. */
function isAnimatedPng(bytes: Uint8Array): boolean {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const next = offset + 12 + view.getUint32(offset);
    if (next > bytes.length) break;
    const kind = view.getUint32(offset + 4);
    if (kind === 0x6163544c) return true; // acTL
    if (kind === 0x49444154) break; // IDAT
    offset = next;
  }
  return false;
}

function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid image file."));
    };
    image.src = url;
  });
}

export async function validateStudentPhotoImage(file: File): Promise<void> {
  const header = await readBytes(file);
  const png =
    header.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every(
      (byte, index) => header[index] === byte,
    );
  const jpeg =
    header.length >= 3 &&
    header[0] === 255 &&
    header[1] === 216 &&
    header[2] === 255;
  if (
    (file.type !== "image/png" || !png) &&
    (file.type !== "image/jpeg" || !jpeg)
  ) {
    throw new Error("Invalid image file.");
  }
  if (png && isAnimatedPng(header)) {
    throw new Error("Animated PNG photos are not supported.");
  }

  let dimensions: { width: number; height: number };
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    try {
      dimensions = { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  } else {
    dimensions = await readImageDimensions(file);
  }
  if (!dimensions.width || !dimensions.height)
    throw new Error("Invalid image file.");
  if (dimensions.width * dimensions.height > MAX_PHOTO_PIXELS) {
    throw new Error("That image exceeds 16 megapixels. Choose a smaller one.");
  }
}
