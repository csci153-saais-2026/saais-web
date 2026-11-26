import { test } from "node:test";
import assert from "node:assert/strict";
import { Image } from "imagescript";
import { randomFillSync } from "node:crypto";
import {
  PhotoError,
  preparePhoto,
  validatePhoto,
} from "../functions/_shared/student-photo.ts";
import { createHandler } from "../functions/_shared/http.ts";

const student = "00000005-0000-4000-8000-000000000000";
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
    if (url.includes("/rest/v1/profile")) return Response.json([{}]);
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
  assert.equal(calls.length, 6);
  assert.equal(calls[0].options.headers.Authorization, "Bearer student");
  assert.equal(calls[2].options.headers.Authorization, "Bearer student");
  assert.equal(calls[3].options.headers.Authorization, "Bearer service-key");
  assert.equal(JSON.parse(calls[4].options.body).p_actor, student);
  assert.deepEqual(
    new Uint8Array(await calls[3].options.body.arrayBuffer()),
    image,
  );
  // The staging upload is removed once the validated copy is registered.
  assert.equal(calls[5].options.method, "DELETE");
  assert.deepEqual(JSON.parse(calls[5].options.body).prefixes, [raw]);
});

test("registration failure removes the trusted copy before returning an error", async () => {
  const calls = [];
  const fake = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("saais_photo_upload_authorize"))
      return Response.json(true);
    if (url.includes("/object/authenticated/")) return new Response(image);
    if (url.includes("/rest/v1/profile")) return Response.json([{}]);
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
      if (url.includes("/rest/v1/profile")) return Response.json([{}]);
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
    new Request(env.url + `/students/${student}/photo`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    }),
  );
  assert.equal(response.status, 200);
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
      if (url.includes("/rest/v1/profile")) return Response.json([{}]);
      if (url.endsWith("/object/student-photos")) return Response.json({});
      if (url.includes("/object/student-photos/"))
        return Response.json({ Key: "ok" });
      if (url.endsWith("/saais_register_verified_photo"))
        return new Response(null, { status: 204 });
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
const stored = (key) => [
  { avatar_url: `/storage/v1/object/authenticated/student-photos/${key}` },
];

// Runs one upload and returns the response and every deleted storage key.
async function upload(save) {
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
      if (url.includes("/rest/v1/profile"))
        return Response.json(stored(oldKey));
      if (url.endsWith("/object/student-photos")) {
        deleted.push(...JSON.parse(options.body).prefixes);
        return Response.json([]);
      }
      if (url.includes("/object/student-photos/"))
        return Response.json({ Key: "ok" });
      if (url.endsWith("/saais_register_verified_photo")) {
        newKey = JSON.parse(options.body).p_path;
        return new Response(null, { status: 204 });
      }
      if (url.endsWith("/matt_operation")) return save();
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
  return { response, deleted, newKey };
}

test("a saved photo removes the staging file and the previous avatar", async () => {
  const { response, deleted } = await upload(() =>
    Response.json({ id: student }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(deleted, [raw, oldKey]);
});

test("a network failure retains the new copy while the database outcome is unknown", async () => {
  const { response, deleted, newKey } = await upload(() => {
    throw new TypeError("network");
  });
  assert.equal(response.status, 500);
  assert.ok(newKey);
  assert.deepEqual(deleted, [raw]);
});

test("a gateway error retains the new copy even when the response has an error code", async () => {
  const { response, deleted, newKey } = await upload(() =>
    Response.json({ code: "GATEWAY_TIMEOUT" }, { status: 504 }),
  );
  assert.equal(response.status, 500);
  assert.ok(newKey);
  assert.deepEqual(deleted, [raw]);
});

test("an expired session at save time returns 401 and removes the new copy", async () => {
  const { response, deleted, newKey } = await upload(() =>
    Response.json({ code: "PGRST303" }, { status: 401 }),
  );
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "PGRST301");
  assert.deepEqual(deleted, [raw, newKey]);
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
