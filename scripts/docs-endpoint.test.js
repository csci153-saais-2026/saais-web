import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { parse } from "yaml";
import handler from "../api/docs.js";
import { clearBundledOpenApiCache } from "../api/openapi-bundle.js";

function response() {
  return {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(n) {
      this.statusCode = n;
      return this;
    },
    end() {
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
}

function findExternalRefs(node, found = []) {
  if (Array.isArray(node)) {
    for (const item of node) findExternalRefs(item, found);
    return found;
  }
  if (!node || typeof node !== "object") return found;
  if (typeof node.$ref === "string" && !node.$ref.startsWith("#")) {
    found.push(node.$ref);
  }
  for (const value of Object.values(node)) {
    findExternalRefs(value, found);
  }
  return found;
}

test("documentation endpoint verifies active users via Data API gateway and serves bundled OpenAPI", async () => {
  const oldFetch = globalThis.fetch;
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "test-key";
  clearBundledOpenApiCache();

  const userId = "11111111-1111-4111-8111-111111111111";
  let active = true;
  let gatewayCalls = 0;

  globalThis.fetch = async (input, options) => {
    const request = new Request(input, options);
    const parsedUrl = new URL(request.url);
    if (request.headers.get("authorization") !== "Bearer valid-token") {
      return Response.json({ message: "invalid token" }, { status: 401 });
    }
    if (parsedUrl.pathname === "/auth/v1/user") {
      return Response.json({ id: userId });
    }
    if (parsedUrl.pathname.startsWith("/rest/v1/")) {
      throw new Error(
        "Direct PostgREST reads are blocked; use data-api gateway",
      );
    }
    if (parsedUrl.pathname === "/functions/v1/data-api/profile") {
      gatewayCalls += 1;
      assert.equal(request.headers.get("apikey"), "test-key");
      assert.equal(request.headers.get("accept-profile"), "saais_api");
      assert.equal(parsedUrl.searchParams.get("select"), "id,status");
      assert.equal(parsedUrl.searchParams.get("id"), `eq.${userId}`);
      assert.equal(parsedUrl.searchParams.get("status"), "eq.active");
      assert.equal(parsedUrl.searchParams.get("limit"), "1");
      return Response.json(active ? [{ id: userId, status: "active" }] : []);
    }
    throw new Error(`Unexpected request: ${request.url}`);
  };

  try {
    let res = response();
    await handler(
      { method: "GET", query: { document: "openapi" }, headers: {} },
      res,
    );
    assert.equal(res.statusCode, 401);

    res = response();
    await handler(
      {
        method: "GET",
        query: { document: "openapi" },
        headers: { authorization: "Bearer invalid-token" },
      },
      res,
    );
    assert.equal(res.statusCode, 401);

    res = response();
    await handler(
      {
        method: "GET",
        query: { document: "../.env" },
        headers: { authorization: "Bearer valid-token" },
      },
      res,
    );
    assert.equal(res.statusCode, 404);

    res = response();
    await handler(
      {
        method: "GET",
        query: { document: "openapi" },
        headers: { authorization: "Bearer valid-token" },
      },
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["Cache-Control"], "private, no-store");
    assert.equal(
      res.headers["Content-Type"],
      "application/yaml; charset=utf-8",
    );
    assert.match(res.body, /^openapi:/);

    const parsedSpec = parse(res.body);
    assert.equal(parsedSpec.openapi, "3.1.0");
    assert.deepEqual(findExternalRefs(parsedSpec), []);
    assert.equal(
      parsedSpec.paths?.["/functions/v1/auth/invite"]?.post?.operationId,
      "inviteUser",
    );
    assert.ok(parsedSpec.components?.schemas?.InviteRequest);
    assert.ok(parsedSpec.components?.responses?.["403Forbidden"]);
    assert.ok(parsedSpec.components?.parameters?.idQueryParam);

    res = response();
    await handler(
      {
        method: "GET",
        query: { document: "guide" },
        headers: { authorization: "Bearer valid-token" },
      },
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["Content-Type"], "text/markdown; charset=utf-8");

    // A failure after the profile check says why.
    const cwd = process.cwd();
    clearBundledOpenApiCache();
    process.chdir(tmpdir());
    try {
      res = response();
      await handler(
        {
          method: "GET",
          query: { document: "openapi" },
          headers: { authorization: "Bearer valid-token" },
        },
        res,
      );
    } finally {
      process.chdir(cwd);
    }
    assert.equal(res.statusCode, 503);
    assert.match(res.body, /^could not build the document: .*openapi.yaml/);

    active = false;
    res = response();
    await handler(
      {
        method: "GET",
        query: { document: "guide" },
        headers: { authorization: "Bearer valid-token" },
      },
      res,
    );
    assert.equal(res.statusCode, 403);
    assert.equal(gatewayCalls, 4);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});
