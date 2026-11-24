const MAX_PHOTO_PIXELS = 16_000_000;

function readHeader(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Invalid image file."));
    reader.onabort = () => reject(new Error("Invalid image file."));
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer)
        resolve(new Uint8Array(reader.result));
      else reject(new Error("Invalid image file."));
    };
    reader.readAsArrayBuffer(file.slice(0, 8));
  });
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
  const header = await readHeader(file);
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
