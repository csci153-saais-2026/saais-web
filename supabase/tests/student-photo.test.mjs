import { test } from "node:test";
import assert from "node:assert/strict";
import { Animation, Frame, Image } from "imagescript";
import { randomFillSync } from "node:crypto";
import {
  createPhotoCleanupHandler,
  PhotoError,
  preparePhoto,
  readPhotoCleanupEnvironment,
  reconcileDeletedPhotos,
  validatePhoto,
} from "../functions/_shared/student-photo.ts";
import { createHandler } from "../functions/_shared/http.ts";

const student = "00000005-0000-4000-8000-000000000abc";
const raw = `students/${student}/upload-00000000-0000-4000-8000-000000000001.png`;
const env = {
  url: "https://supabase.example.test",
  publicKey: "public-key",
  serviceKey: "service-key",
  origins: [],
};
const headers = {
  apikey: "public-key",
  Authorization: "Bearer student",
  "Content-Type": "application/json",
};
const image = await new Image(2, 2).encodePNG();
const jpeg = await new Image(2, 2).encodeJPEG();
const body = {
  storage_object_path: raw,
  avatar_url: `https://storage.test/student-photos/${raw}`,
  mime_type: "image/png",
  file_size_bytes: image.length,
};

test("photo decoder accepts actual PNG and JPEG and rejects spoofed or truncated files", async () => {
  await validatePhoto(image, "image/png");
  await validatePhoto(jpeg, "image/jpeg");
  await assert.rejects(
    validatePhoto(new TextEncoder().encode("not an image"), "image/png"),
    PhotoError,
  );
  await assert.rejects(
    validatePhoto(image.slice(0, 16), "image/png"),
    PhotoError,
  );
  await assert.rejects(validatePhoto(jpeg, "image/png"), PhotoError);
});

test("animated PNGs get an explicit validation error", async () => {
  const bytes = await new Animation([
    new Frame(2, 2),
    new Frame(2, 2),
  ]).encodeAPNG();
  await assert.rejects(validatePhoto(bytes, "image/png"), {
    message: "Animated PNG photos are not supported.",
  });
});

test("a real image larger than 2 MiB is accepted and files above 5 MiB are rejected", async () => {
  const large = new Image(1024, 1024);
  randomFillSync(large.bitmap);
  const bytes = await large.encodePNG();
  assert.ok(bytes.length > 2 * 1024 * 1024 && bytes.length <= 5 * 1024 * 1024);
  await validatePhoto(bytes, "image/png");
  let calls = 0;
  await assert.rejects(
    preparePhoto(
      env,
      async () => {
        calls++;
        return new Response();
      },
      headers,
      student,
      student,
      { ...body, file_size_bytes: 5 * 1024 * 1024 + 1 },
    ),
    PhotoError,
  );
  assert.equal(calls, 0);
});

test("the decoder rejects an image above its pixel safety limit", async () => {
  const pixels = await new Image(4001, 4000).encodePNG();
  await assert.rejects(validatePhoto(pixels, "image/png"), PhotoError);
});

test("photo preparation authorizes, decodes, copies, and registers with the service role", async () => {
  const calls = [];
  const fake = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("saais_photo_upload_authorize"))
      return Response.json(true);
    if (url.includes("/object/authenticated/")) return new Response(image);
    if (url.endsWith("/object/student-photos")) return Response.json([]);
    if (url.includes("/object/student-photos/"))
      return Response.json({ Key: "ok" });
    if (url.includes("saais_register_verified_photo"))
      return new Response(null, { status: 204 });
    throw new Error(url);
  };
  const result = await preparePhoto(env, fake, headers, student, student, body);
  assert.match(
    result.body.storage_object_path,
    /^students\/.+\/validated-[0-9a-f-]+\.png$/,
  );
  assert.equal(calls.length, 4);
  assert.equal(calls[0].options.headers.Authorization, "Bearer student");
  assert.equal(calls[1].options.headers.Authorization, "Bearer student");
  assert.equal(calls[2].options.headers.Authorization, "Bearer service-key");
  assert.deepEqual(JSON.parse(calls[3].options.body), {
    p_student: student,
    p_actor: student,
    p_path: result.body.storage_object_path,
    p_staging_path: raw,
  });
  const uploadedBytes = new Uint8Array(
    await calls[2].options.body.arrayBuffer(),
  );
  assert.equal(result.body.file_size_bytes, uploadedBytes.length);
  const decoded = await Image.decode(uploadedBytes);
  assert.equal(decoded.width, 2);
  assert.equal(decoded.height, 2);
  assert.equal(
    new TextDecoder("latin1").decode(uploadedBytes).includes("ImageScript"),
    false,
  );
});

function withJpegMetadata(rawJpeg, marker, payloadText) {
  const payload = new TextEncoder().encode(payloadText);
  const length = payload.length + 2;
  const segment = new Uint8Array(4 + payload.length);
  segment[0] = 0xff;
  segment[1] = marker;
  segment[2] = (length >> 8) & 0xff;
  segment[3] = length & 0xff;
  segment.set(payload, 4);
  const combined = new Uint8Array(rawJpeg.length + segment.length);
  combined.set(rawJpeg.subarray(0, 2), 0);
  combined.set(segment, 2);
  combined.set(rawJpeg.subarray(2), 2 + segment.length);
  return combined;
}

function withPngChunk(rawPng, type, payloadText) {
  const payload = new TextEncoder().encode(payloadText);
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(12 + payload.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, payload.length);
  chunk.set(typeBytes, 4);
  chunk.set(payload, 8);
  let crc = 0xffffffff;
  for (let i = 4; i < 8 + payload.length; i++) {
    crc ^= chunk[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  view.setUint32(8 + payload.length, (crc ^ 0xffffffff) >>> 0);
  const ihdrEnd =
    8 + 12 + new DataView(rawPng.buffer, rawPng.byteOffset).getUint32(8);
  const combined = new Uint8Array(rawPng.length + chunk.length);
  combined.set(rawPng.subarray(0, ihdrEnd), 0);
  combined.set(chunk, ihdrEnd);
  combined.set(rawPng.subarray(ihdrEnd), ihdrEnd + chunk.length);
  return combined;
}

test("photo validation re-encodes JPEG and PNG images to strip EXIF, GPS, and text metadata", async () => {
  const jpegWithMeta = withJpegMetadata(
    withJpegMetadata(
      await new Image(4, 4).encodeJPEG({
        metadata: {
          author: "Student Phone",
          comment: "GPS 10.7460,124.7946",
          description: "Camera Serial 99999",
        },
      }),
      0xfe,
      "Home Address Comment",
    ),
    0xe1,
    "http://ns.adobe.com/xap/1.0/\0<xmp>iPhone 16 Pro Max GPS 10.7460</xmp>",
  );
  const rawJpegText = new TextDecoder("latin1").decode(jpegWithMeta);
  assert.ok(rawJpegText.includes("GPS 10.7460"));
  assert.ok(rawJpegText.includes("iPhone 16 Pro Max"));
  assert.ok(rawJpegText.includes("Camera Serial 99999"));
  assert.ok(rawJpegText.includes("Home Address Comment"));

  const jpegUploads = [];
  const jpegResult = await preparePhoto(
    env,
    async (url, options) => {
      if (url.includes("saais_photo_upload_authorize"))
        return Response.json(true);
      if (url.includes("/object/authenticated/"))
        return new Response(jpegWithMeta);
      if (url.includes("/object/student-photos/")) {
        jpegUploads.push(new Uint8Array(await options.body.arrayBuffer()));
        return Response.json({ Key: "ok" });
      }
      if (url.includes("saais_register_verified_photo"))
        return new Response(null, { status: 204 });
      throw new Error(url);
    },
    headers,
    student,
    student,
    {
      ...body,
      storage_object_path: `students/${student}/upload-00000000-0000-4000-8000-000000000002.jpg`,
      avatar_url: `https://storage.test/student-photos/students/${student}/upload-00000000-0000-4000-8000-000000000002.jpg`,
      mime_type: "image/jpeg",
      file_size_bytes: jpegWithMeta.length,
    },
  );
  assert.equal(jpegUploads.length, 1);
  assert.equal(jpegResult.body.file_size_bytes, jpegUploads[0].length);
  assert.notEqual(jpegUploads[0].length, jpegWithMeta.length);
  const cleanJpegText = new TextDecoder("latin1").decode(jpegUploads[0]);
  for (const leaked of [
    "GPS",
    "10.7460",
    "124.7946",
    "iPhone 16 Pro Max",
    "Student Phone",
    "Camera Serial 99999",
    "Home Address Comment",
    "ImageScript",
  ]) {
    assert.equal(
      cleanJpegText.includes(leaked),
      false,
      `JPEG leaked ${leaked}`,
    );
  }
  const decodedJpeg = await Image.decode(jpegUploads[0]);
  assert.equal(decodedJpeg.width, 4);
  assert.equal(decodedJpeg.height, 4);

  const pngWithMeta = withPngChunk(
    await new Image(4, 4).encodePNG({
      metadata: {
        author: "Student Phone",
        comment: "GPS 10.7460,124.7946",
        description: "Device Model XYZ",
      },
    }),
    "eXIf",
    "MM\0*iPhone GPS 10.7460",
  );
  const rawPngText = new TextDecoder("latin1").decode(pngWithMeta);
  assert.ok(rawPngText.includes("eXIf"));
  assert.ok(rawPngText.includes("Device Model XYZ"));

  const sanitizedPng = await validatePhoto(pngWithMeta, "image/png");
  const cleanPngText = new TextDecoder("latin1").decode(sanitizedPng);
  for (const leaked of [
    "eXIf",
    "GPS",
    "10.7460",
    "124.7946",
    "Student Phone",
    "Device Model XYZ",
    "iPhone",
    "ImageScript",
  ]) {
    assert.equal(cleanPngText.includes(leaked), false, `PNG leaked ${leaked}`);
  }
  const decodedPng = await Image.decode(sanitizedPng);
  assert.equal(decodedPng.width, 4);
  assert.equal(decodedPng.height, 4);
});

test("registration failure removes the trusted copy before returning an error", async () => {
  const calls = [];
  const fake = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("saais_photo_upload_authorize"))
      return Response.json(true);
    if (url.includes("/object/authenticated/")) return new Response(image);
    if (url.endsWith("/object/student-photos")) return Response.json({});
    if (url.includes("/object/student-photos/")) return Response.json({});
    if (url.includes("saais_register_verified_photo"))
      return new Response(null, { status: 500 });
    throw new Error(url);
  };
  await assert.rejects(
    preparePhoto(env, fake, headers, student, student, body),
    PhotoError,
  );
  assert.equal(calls.at(-1).options.method, "DELETE");
  assert.equal(JSON.parse(calls.at(-1).options.body).prefixes.length, 1);
});

test("legacy names, other students' paths and MIME mismatches fail before accessing Storage", async () => {
  for (const storage_object_path of [
    `students/${student}/avatar.png`,
    `students/${student}/upload-arbitrary.png`,
    raw.replace(student, "00000000-0000-4000-8000-000000000099"),
    raw.replace(/\.png$/, ".jpg"),
  ]) {
    await assert.rejects(
      preparePhoto(
        env,
        () => assert.fail("Invalid path must not reach Storage"),
        headers,
        student,
        student,
        { ...body, storage_object_path },
      ),
      { message: "Invalid staging photo path." },
    );
  }
});

test("invalid bytes, oversized data, and denied access cannot produce a trusted copy", async () => {
  for (const [payload, input] of [
    [
      new TextEncoder().encode("not an image"),
      { ...body, file_size_bytes: 12 },
    ],
    [new Uint8Array(5 * 1024 * 1024 + 1), body],
  ]) {
    const calls = [];
    const fake = async (url) => {
      calls.push(url);
      return url.includes("authorize")
        ? Response.json(true)
        : new Response(payload);
    };
    await assert.rejects(
      preparePhoto(env, fake, headers, student, student, input),
      PhotoError,
    );
    assert.equal(calls.length, 2);
  }
  let requests = 0;
  await assert.rejects(
    preparePhoto(
      env,
      async () => {
        requests++;
        return new Response(null, { status: 403 });
      },
      headers,
      student,
      student,
      body,
    ),
    PhotoError,
  );
  assert.equal(requests, 1);
});

test("photo HTTP route rejects spoofed bytes before the normal database operation", async () => {
  const calls = [];
  const bad = new TextEncoder().encode("not an image");
  const handler = createHandler("students", {
    env,
    photoUpload: preparePhoto,
    fetch: async (url) => {
      calls.push(url);
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
      if (url.includes("saais_photo_upload_authorize"))
        return Response.json(true);
      if (url.includes("/object/authenticated/")) return new Response(bad);
      throw new Error(url);
    },
  });
  const response = await handler(
    new Request(env.url + `/students/${student}/photo`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ ...body, file_size_bytes: bad.length }),
    }),
  );
  assert.equal(response.status, 400);
  assert.equal(calls.length, 3);
});

test("photo HTTP route sends only the validated object to the caller-scoped RPC", async () => {
  const calls = [];
  const handler = createHandler("students", {
    env,
    photoUpload: preparePhoto,
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
      if (url.endsWith("/saais_photo_upload_authorize"))
        return Response.json(true);
      if (url.includes("/object/authenticated/")) return new Response(image);
      if (url.endsWith("/object/student-photos")) return Response.json([]);
      if (url.includes("/object/student-photos/"))
        return Response.json({ Key: "ok" });
      if (url.endsWith("/saais_register_verified_photo"))
        return new Response(null, { status: 204 });
      if (url.endsWith("/matt_operation"))
        return Response.json({ id: student });
      throw new Error(url);
    },
  });
  const response = await handler(
    new Request(env.url + `/students/${student.toUpperCase()}/photo`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    }),
  );
  assert.equal(response.status, 200);
  const authorization = calls.find((call) =>
    call.url.endsWith("/saais_photo_upload_authorize"),
  );
  assert.deepEqual(JSON.parse(authorization.options.body), {
    p_student: student,
    p_path: raw,
  });
  const rpc = calls.find((call) => call.url.endsWith("/matt_operation"));
  const forwarded = JSON.parse(rpc.options.body);
  assert.equal(rpc.options.headers.Authorization, "Bearer student");
  assert.equal(forwarded.p_operation, "uploadStudentPhoto");
  assert.notEqual(forwarded.p_body.storage_object_path, raw);
  assert.match(forwarded.p_body.storage_object_path, /\/validated-/);
});

test("photo HTTP route cleans up the validated object when the profile RPC rejects the update", async () => {
  const calls = [];
  const handler = createHandler("students", {
    env,
    photoUpload: preparePhoto,
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
      if (url.endsWith("/saais_photo_upload_authorize"))
        return Response.json(true);
      if (url.includes("/object/authenticated/")) return new Response(image);
      if (url.endsWith("/object/student-photos")) return Response.json({});
      if (url.includes("/object/student-photos/"))
        return Response.json({ Key: "ok" });
      if (url.endsWith("/saais_register_verified_photo"))
        return new Response(null, { status: 204 });
      if (url.endsWith("/saais_abandon_verified_photo"))
        return Response.json(true);
      if (url.endsWith("/matt_operation"))
        return Response.json(
          { code: "PT403", message: "Access revoked." },
          { status: 403 },
        );
      throw new Error(url);
    },
  });
  const response = await handler(
    new Request(env.url + `/students/${student}/photo`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    }),
  );
  assert.equal(response.status, 403);
  assert.equal(calls.at(-1).options.method, "DELETE");
  assert.equal(JSON.parse(calls.at(-1).options.body).prefixes.length, 1);
});

test("a validation budget rejection returns 429 before retrieving the object", async () => {
  let calls = 0;
  const handler = createHandler("students", {
    env,
    photoUpload: preparePhoto,
    fetch: async (url) => {
      calls++;
      return url.endsWith("/auth/v1/user")
        ? Response.json({ id: student })
        : new Response(null, { status: 429 });
    },
  });
  const response = await handler(
    new Request(env.url + `/students/${student}/photo`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    }),
  );
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.equal(calls, 2);
});

const oldKey = `students/${student}/validated-old.png`;
// Runs one upload and returns the response and every deleted storage key.
async function upload(save, abandon = () => Response.json(true)) {
  const events = [];
  const deleted = [];
  let newKey;
  const handler = createHandler("students", {
    env,
    photoUpload: preparePhoto,
    fetch: async (url, options) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
      if (url.endsWith("/saais_photo_upload_authorize"))
        return Response.json(true);
      if (url.includes("/object/authenticated/")) return new Response(image);
      if (url.endsWith("/saais_reconcile_deleted_photos")) {
        const { p_removed: removed } = JSON.parse(options.body);
        events.push(removed ? "acknowledge" : "list");
        if (removed) assert.deepEqual(removed, [raw, oldKey]);
        return Response.json(removed ? [] : [raw, oldKey]);
      }
      if (url.endsWith("/object/student-photos")) {
        events.push("remove");
        deleted.push(...JSON.parse(options.body).prefixes);
        return Response.json([]);
      }
      if (url.includes("/object/student-photos/"))
        return Response.json({ Key: "ok" });
      if (url.endsWith("/saais_register_verified_photo")) {
        newKey = JSON.parse(options.body).p_path;
        return new Response(null, { status: 204 });
      }
      if (url.endsWith("/saais_abandon_verified_photo")) {
        events.push("abandon");
        return abandon();
      }
      if (url.endsWith("/matt_operation")) {
        events.push("save");
        return save();
      }
      throw new Error(url);
    },
  });
  const response = await handler(
    new Request(env.url + `/students/${student}/photo`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    }),
  );
  return { response, deleted, newKey, events };
}

test("a saved photo removes the staging file and the previous avatar", async () => {
  const { response, deleted, events } = await upload(() =>
    Response.json({ id: student }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(deleted, [raw, oldKey]);
  assert.deepEqual(events, ["save", "list", "remove", "acknowledge"]);
});

test("a failed save deletes the new copy only after invalidating its token", async () => {
  const { response, deleted, newKey } = await upload(() => {
    throw new TypeError("network");
  });
  assert.equal(response.status, 500);
  assert.deepEqual(deleted, [newKey]);
});

test("a lost response retains the committed photo and reconciles its queued paths", async () => {
  const { response, deleted, newKey, events } = await upload(
    () => {
      throw new TypeError("network");
    },
    () => Response.json(false),
  );
  assert.equal(response.status, 500);
  assert.ok(newKey);
  assert.deepEqual(deleted, [raw, oldKey]);
  assert.deepEqual(events, [
    "save",
    "abandon",
    "list",
    "remove",
    "acknowledge",
  ]);
});

test("an unavailable cleanup decision retains the new photo", async () => {
  const { response, deleted, newKey } = await upload(
    () => Response.json({ code: "GATEWAY_TIMEOUT" }, { status: 504 }),
    () => {
      throw new TypeError("network");
    },
  );
  assert.equal(response.status, 500);
  assert.ok(newKey);
  assert.deepEqual(deleted, []);
});

test("an HTTP 408 only removes the new copy when its token is invalidated", async () => {
  const timedOut = () => new Response(null, { status: 408 });
  const abandoned = await upload(timedOut);
  assert.equal(abandoned.response.status, 500);
  assert.deepEqual(abandoned.deleted, [abandoned.newKey]);
});

test("an HTTP 408 retains a photo whose token was already consumed", async () => {
  const { response, deleted, newKey } = await upload(
    () => new Response(null, { status: 408 }),
    () => Response.json(false),
  );
  assert.equal(response.status, 500);
  assert.ok(newKey);
  assert.deepEqual(deleted, [raw, oldKey]);
});

test("an expired session at save time returns 401 and removes the new copy", async () => {
  const { response, deleted, newKey } = await upload(() =>
    Response.json({ code: "PGRST303" }, { status: 401 }),
  );
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "PGRST301");
  assert.deepEqual(deleted, [newKey]);
});

test("dot-segment staging filenames are rejected before any request", async () => {
  for (const name of [".", ".."]) {
    await assert.rejects(
      preparePhoto(
        env,
        async () => assert.fail("no request expected"),
        headers,
        student,
        student,
        { ...body, storage_object_path: `students/${student}/${name}` },
      ),
      PhotoError,
    );
  }
});

test("deleteStudentPhoto removes queued storage objects and acknowledges reconciliation", async () => {
  const deleted = [];
  const acknowledged = [];
  const handler = createHandler("students", {
    env,
    photoDelete: reconcileDeletedPhotos,
    fetch: async (url, options) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
      if (url.endsWith("/matt_operation"))
        return Response.json({ id: student, avatar_url: null });
      if (url.endsWith("/saais_reconcile_deleted_photos")) {
        const rpc = JSON.parse(options.body);
        assert.equal(options.headers.Authorization, "Bearer service-key");
        assert.equal(options.headers["Content-Profile"], "public");
        if (rpc.p_removed) {
          acknowledged.push(...rpc.p_removed);
          return Response.json([]);
        }
        return Response.json([oldKey]);
      }
      if (url.endsWith("/object/student-photos")) {
        assert.equal(options.method, "DELETE");
        deleted.push(...JSON.parse(options.body).prefixes);
        return Response.json([]);
      }
      throw new Error(url);
    },
  });
  const response = await handler(
    new Request(env.url + `/students/${student.toUpperCase()}/photo`, {
      method: "DELETE",
      headers,
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(deleted, [oldKey]);
  assert.deepEqual(acknowledged, [oldKey]);
});

test("deleteStudentPhoto skips storage removal when the profile RPC fails and retains queue on storage error", async () => {
  let storageCalls = 0;
  const deniedHandler = createHandler("students", {
    env,
    photoDelete: reconcileDeletedPhotos,
    fetch: async (url) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
      if (url.endsWith("/matt_operation"))
        return Response.json(
          { code: "PT403", message: "Forbidden." },
          { status: 403 },
        );
      storageCalls++;
      throw new Error("Should not reconcile after failed RPC");
    },
  });
  const denied = await deniedHandler(
    new Request(env.url + `/students/${student}/photo`, {
      method: "DELETE",
      headers,
    }),
  );
  assert.equal(denied.status, 403);
  assert.equal(storageCalls, 0);

  let ackCalls = 0;
  const retryHandler = createHandler("students", {
    env,
    photoDelete: reconcileDeletedPhotos,
    fetch: async (url, options) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
      if (url.endsWith("/matt_operation"))
        return Response.json({ id: student, avatar_url: null });
      if (url.endsWith("/saais_reconcile_deleted_photos")) {
        const rpc = JSON.parse(options.body);
        if (rpc.p_removed) {
          ackCalls++;
          return Response.json([]);
        }
        return Response.json([oldKey]);
      }
      if (url.endsWith("/object/student-photos"))
        return new Response(null, { status: 503 });
      throw new Error(url);
    },
  });
  const retryable = await retryHandler(
    new Request(env.url + `/students/${student}/photo`, {
      method: "DELETE",
      headers,
    }),
  );
  assert.equal(retryable.status, 200);
  assert.equal(ackCalls, 0);
});

test("a transient Storage failure is cleared by scheduled photo cleanup without another user upload or deletion", async () => {
  const queue = new Set();
  const storage = new Set([oldKey]);
  let storageAvailable = false;

  const sharedFetch = async (url, options) => {
    if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
    if (url.endsWith("/matt_operation")) {
      queue.add(oldKey);
      return Response.json({ id: student, avatar_url: null });
    }
    if (url.endsWith("/saais_reconcile_deleted_photos")) {
      const rpc = JSON.parse(options.body);
      if (rpc.p_removed) {
        for (const item of rpc.p_removed) queue.delete(item);
        return Response.json([]);
      }
      return Response.json([...queue]);
    }
    if (url.endsWith("/saais_reconcile_pending_deleted_photos")) {
      const rpc = JSON.parse(options.body);
      assert.equal(options.headers.Authorization, "Bearer service-key");
      assert.equal(options.headers["Content-Profile"], "public");
      if (rpc.p_removed) {
        for (const item of rpc.p_removed) queue.delete(item);
      }
      return Response.json(rpc.p_limit === 0 ? [] : [...queue]);
    }
    if (url.endsWith("/object/student-photos")) {
      assert.equal(options.method, "DELETE");
      if (!storageAvailable) return new Response(null, { status: 503 });
      for (const prefix of JSON.parse(options.body).prefixes) {
        storage.delete(prefix);
      }
      return Response.json([]);
    }
    throw new Error(url);
  };

  // User deletes their photo while Storage is temporarily unavailable.
  const studentHandler = createHandler("students", {
    env,
    photoDelete: reconcileDeletedPhotos,
    fetch: sharedFetch,
  });
  const deletedResponse = await studentHandler(
    new Request(env.url + `/students/${student}/photo`, {
      method: "DELETE",
      headers,
    }),
  );
  assert.equal(deletedResponse.status, 200);
  assert.deepEqual([...queue], [oldKey]);
  assert.equal(storage.has(oldKey), true);

  const cleanupEnv = readPhotoCleanupEnvironment(
    (name) =>
      ({
        SUPABASE_URL: env.url,
        SUPABASE_SERVICE_ROLE_KEY: env.serviceKey,
        SAAIS_MAINTENANCE_SECRET: "cleanup-secret",
      })[name],
  );
  const cleanup = createPhotoCleanupHandler(cleanupEnv, sharedFetch);

  // Reject wrong method and missing/invalid maintenance secret.
  assert.equal(
    (await cleanup(new Request(env.url, { method: "GET" }))).status,
    405,
  );
  assert.equal(
    (
      await cleanup(
        new Request(env.url, {
          method: "POST",
          headers: { "x-saais-maintenance-secret": "wrong" },
        }),
      )
    ).status,
    401,
  );

  // First scheduled sweep sees Storage still returning 503 -> returns 503 and keeps queue intact.
  const failedSweep = await cleanup(
    new Request(env.url, {
      method: "POST",
      headers: { "x-saais-maintenance-secret": "cleanup-secret" },
    }),
  );
  assert.equal(failedSweep.status, 503);
  assert.deepEqual([...queue], [oldKey]);
  assert.equal(storage.has(oldKey), true);

  // Storage recovers; next scheduled sweep removes the orphaned object with no user action.
  storageAvailable = true;
  const recoveredSweep = await cleanup(
    new Request(env.url, {
      method: "POST",
      headers: { "x-saais-maintenance-secret": "cleanup-secret" },
    }),
  );
  assert.equal(recoveredSweep.status, 200);
  assert.deepEqual(await recoveredSweep.json(), { attempted: 1, removed: 1 });
  assert.deepEqual([...queue], []);
  assert.equal(storage.has(oldKey), false);

  // Subsequent sweep finds nothing pending.
  const idleSweep = await cleanup(
    new Request(env.url, {
      method: "POST",
      headers: { "x-saais-maintenance-secret": "cleanup-secret" },
    }),
  );
  assert.equal(idleSweep.status, 200);
  assert.deepEqual(await idleSweep.json(), { attempted: 0, removed: 0 });
});
