import { decode, Image } from "imagescript";
import { PhotoError } from "./photo-error.ts";
export { PhotoError } from "./photo-error.ts";

const limit = 5 * 1024 * 1024;
const maxPixels = 16_000_000;
type PhotoBody = {
  storage_object_path?: unknown;
  avatar_url?: unknown;
  mime_type?: unknown;
  file_size_bytes?: unknown;
};

async function boundedBytes(response: Response): Promise<Uint8Array> {
  if (Number(response.headers.get("content-length")) > limit)
    throw new PhotoError(400, "The photo exceeds the size limit.");
  const reader = response.body?.getReader();
  if (!reader) throw new PhotoError(400, "Invalid image file.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new PhotoError(400, "The photo exceeds the size limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export async function validatePhoto(
  bytes: Uint8Array,
  type: unknown,
): Promise<void> {
  const png =
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  const jpeg =
    bytes.length >= 3 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255;
  if ((type !== "image/png" || !png) && (type !== "image/jpeg" || !jpeg))
    throw new PhotoError(400, "Invalid image file.");
  try {
    const image = await decode(bytes, { maxPixels, applyColorProfile: false });
    if (!(image instanceof Image) || !image.width || !image.height)
      throw new Error("Invalid image");
  } catch {
    throw new PhotoError(
      400,
      "Invalid image file or image exceeds 16 megapixels.",
    );
  }
}

export async function preparePhoto(
  env: { url: string; serviceKey?: string },
  fetcher: typeof fetch,
  headers: Record<string, string>,
  student: string,
  actor: string,
  input: unknown,
) {
  const body = input as PhotoBody | null;
  if (!env.serviceKey)
    throw new PhotoError(500, "Photo validation is unavailable.");
  if (
    !body ||
    Array.isArray(body) ||
    Object.keys(body).some(
      (key) =>
        ![
          "storage_object_path",
          "avatar_url",
          "mime_type",
          "file_size_bytes",
        ].includes(key),
    ) ||
    typeof body.storage_object_path !== "string" ||
    typeof body.avatar_url !== "string" ||
    body.avatar_url.length > 2048 ||
    !body.avatar_url.trim() ||
    body.storage_object_path.length > 512 ||
    (body.mime_type !== "image/jpeg" && body.mime_type !== "image/png") ||
    !Number.isSafeInteger(body.file_size_bytes) ||
    Number(body.file_size_bytes) < 1 ||
    Number(body.file_size_bytes) > limit
  )
    throw new PhotoError(400, "Invalid photo request.");
  student = student.toLowerCase();
  const raw = body.storage_object_path;
  const parts = raw.split("/");
  if (
    parts.length !== 3 ||
    parts[0] !== "students" ||
    parts[1] !== student ||
    !/^[a-zA-Z0-9._-]+$/.test(parts[2]) ||
    parts[2] === "." ||
    parts[2] === ".." ||
    parts[2].startsWith("validated-")
  )
    throw new PhotoError(400, "Invalid staging photo path.");

  const authorization = await fetcher(
    env.url + "/rest/v1/rpc/saais_photo_upload_authorize",
    {
      method: "POST",
      headers: { ...headers, "Content-Profile": "public" },
      body: JSON.stringify({ p_student: student, p_path: raw }),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!authorization.ok)
    throw new PhotoError(
      [400, 401, 403, 429].includes(authorization.status)
        ? authorization.status
        : 500,
      authorization.status === 403
        ? "The student is outside your authorized scope."
        : "Photo authorization failed.",
    );
  const staged = `students/${student}/${encodeURIComponent(parts[2])}`;
  const source = await fetcher(
    env.url + "/storage/v1/object/authenticated/student-photos/" + staged,
    {
      headers,
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!source.ok)
    throw new PhotoError(400, "The uploaded photo could not be read.");
  const bytes = await boundedBytes(source);
  if (bytes.length !== body.file_size_bytes)
    throw new PhotoError(400, "Stored photo size does not match the request.");
  await validatePhoto(bytes, body.mime_type);

  const ext = body.mime_type === "image/png" ? "png" : "jpg";
  const path = `students/${student}/validated-${crypto.randomUUID()}.${ext}`;
  const serviceHeaders = {
    apikey: env.serviceKey,
    Authorization: `Bearer ${env.serviceKey}`,
  };
  // Deletion is best effort: a leftover file must not fail the request.
  const remove = async (key: string) => {
    await fetcher(env.url + "/storage/v1/object/student-photos", {
      method: "DELETE",
      headers: { ...serviceHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [key] }),
      signal: AbortSignal.timeout(10000),
    }).catch(() => {});
  };
  const cleanup = () => remove(path);
  const uploaded = await fetcher(
    env.url + "/storage/v1/object/student-photos/" + path,
    {
      method: "POST",
      headers: {
        ...serviceHeaders,
        "Content-Type": body.mime_type,
        "x-upsert": "false",
      },
      body: new Blob([new Uint8Array(bytes).buffer]),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!uploaded.ok)
    throw new PhotoError(500, "The validated photo could not be saved.");
  try {
    const registered = await fetcher(
      env.url + "/rest/v1/rpc/saais_register_verified_photo",
      {
        method: "POST",
        headers: {
          ...serviceHeaders,
          "Content-Type": "application/json",
          "Content-Profile": "public",
        },
        body: JSON.stringify({
          p_student: student,
          p_actor: actor,
          p_path: path,
          p_staging_path: raw,
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!registered.ok) throw new Error("Registration failed");
  } catch {
    await cleanup();
    throw new PhotoError(500, "The validated photo could not be saved.");
  }
  const reconcile = () => reconcileDeletedPhotos(env, fetcher, student);
  return {
    body: {
      ...body,
      storage_object_path: path,
      avatar_url: "/student-photos/" + path,
    },
    // Invalidate the one-use token before deleting. This waits for a pending
    // save to commit or roll back, preventing deletion of a committed avatar.
    abandon: async () => {
      try {
        const result = await fetcher(
          env.url + "/rest/v1/rpc/saais_abandon_verified_photo",
          {
            method: "POST",
            headers: {
              ...serviceHeaders,
              "Content-Type": "application/json",
              "Content-Profile": "public",
            },
            body: JSON.stringify({ p_path: path }),
            signal: AbortSignal.timeout(10000),
          },
        );
        if (!result.ok) return;
        const abandoned = await result.json();
        if (abandoned === true) await cleanup();
        if (abandoned === false) await reconcile();
      } catch {
        // Keep the object if the database decision is unknown.
      }
    },
    commit: reconcile,
  };
}

// Remove queued Storage objects after a photo write commits. Failed removals
// stay queued for the next reconciliation.
export async function reconcileDeletedPhotos(
  env: { url: string; serviceKey?: string },
  fetcher: typeof fetch,
  student: string,
): Promise<void> {
  if (!env.serviceKey) return;
  const serviceHeaders = {
    apikey: env.serviceKey,
    Authorization: `Bearer ${env.serviceKey}`,
    "Content-Type": "application/json",
    "Content-Profile": "public",
  };
  try {
    const listed = await fetcher(
      env.url + "/rest/v1/rpc/saais_reconcile_deleted_photos",
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({ p_student: student }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!listed.ok) return;
    const raw = (await listed.json()) as unknown;
    if (!Array.isArray(raw)) return;
    const prefix = `students/${student.toLowerCase()}/`;
    const pending = raw.filter(
      (item): item is string =>
        typeof item === "string" && item.toLowerCase().startsWith(prefix),
    );
    if (pending.length === 0) return;
    const removed = await fetcher(
      env.url + "/storage/v1/object/student-photos",
      {
        method: "DELETE",
        headers: {
          apikey: env.serviceKey,
          Authorization: `Bearer ${env.serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefixes: pending }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!removed.ok) return;
    await fetcher(env.url + "/rest/v1/rpc/saais_reconcile_deleted_photos", {
      method: "POST",
      headers: serviceHeaders,
      body: JSON.stringify({ p_student: student, p_removed: pending }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Keep queued paths in the database for retry on a later reconciliation.
  }
}
