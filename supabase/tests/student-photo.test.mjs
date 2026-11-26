import { test } from "node:test";
import assert from "node:assert/strict";
import { Image } from "imagescript";
import { randomFillSync } from "node:crypto";
import {
  PhotoError,
  preparePhoto,
  reconcileDeletedPhotos,
  validatePhoto,
} from "../functions/_shared/student-photo.ts";
import { createHandler } from "../functions/_shared/http.ts";

const student = "00000005-0000-4000-8000-000000000abc";
const raw = `students/${student}/avatar.png`;
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
  assert.deepEqual(
    new Uint8Array(await calls[2].options.body.arrayBuffer()),
    image,
  );
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
