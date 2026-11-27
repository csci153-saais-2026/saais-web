import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import contract from "../functions/_shared/data-api-contract.json" with { type: "json" };
import { createDataApiHandler } from "../functions/_shared/data-api.ts";

const require = createRequire(import.meta.url);
const { withPinnedContract } = require("../tools/snapshot-contract.cjs");
const { buildDataApiSnapshot } = require("../tools/snapshot-data-api.cjs");

const env = {
  url: "https://supabase.example.test",
  publicKey: "public-key",
  serviceKey: "service-key",
  origins: ["https://saais.example.test"],
};
const headers = {
  apikey: env.publicKey,
  Authorization: "Bearer user-token",
  "Accept-Profile": "saais_api",
  Origin: env.origins[0],
};
const gatewayKey = "a".repeat(64);

function read(query = "", override = headers) {
  return new Request(
    `${env.url}/functions/v1/data-api/attempt_result${query}`,
    {
      headers: override,
    },
  );
}

test("Data API rules match the approved contract", () => {
  assert.deepEqual(contract, withPinnedContract(buildDataApiSnapshot));
  assert.equal(Object.keys(contract).length, 32);
  for (const resource of Object.values(contract)) {
    assert.ok(resource.query.includes("limit"));
    assert.ok(resource.query.includes("offset"));
    const reserved = new Set(["select", "order", "limit", "offset"]);
    const expectedFilters = resource.query.filter(
      (name) => !reserved.has(name),
    );
    assert.deepEqual(
      Object.keys(resource.filters).sort(),
      expectedFilters.sort(),
    );
    for (const rule of Object.values(resource.filters)) {
      assert.equal(typeof rule.pattern, "string");
      assert.ok(Number.isInteger(rule.maxLength) && rule.maxLength > 0);
    }
  }
});

test("Data API rejects additional schema profiles and non-contract query shapes before forwarding", async () => {
  const handle = createDataApiHandler(env, () => {
    assert.fail("A rejected request must not contact PostgREST");
  });
  const withoutProfile = new Headers(headers);
  withoutProfile.delete("Accept-Profile");
  assert.equal((await handle(read("", withoutProfile))).status, 400);
  assert.equal(
    (await handle(read("", { ...headers, "Accept-Profile": "public" }))).status,
    400,
  );
  for (const prefer of [
    "",
    "tx=rollback",
    "return=representation",
    "count=exact, return=minimal",
    "COUNT=EXACT",
    "max-affected=1",
  ]) {
    assert.equal(
      (await handle(read("", { ...headers, Prefer: prefer }))).status,
      400,
      `Prefer: ${prefer}`,
    );
  }
  const uuid = "00000005-0000-4000-8000-000000000001";
  const fiftyOneUuids = Array.from(
    { length: 51 },
    (_, i) => `00000005-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  ).join(",");
  for (const query of [
    "?select=id,profile(id)",
    "?select=grade_fix_history",
    "?order=reason.asc",
    "?order=id.asc&order=created_at.asc",
    "?select=id&select=final_grade",
    "?profile.order=id.asc",
    "?limit=0",
    "?limit=1001",
    "?limit=1&limit=2",
    "?limit=1.5",
    "?limit=2%0A",
    "?limit=1e2",
    "?limit=",
    "?offset=-1",
    "?offset=100001",
    "?offset=99999999999999999999999",
    "?offset=1&offset=2",
    "?offset=%202",
    "?student_id=ilike.%25a%25",
    "?student_id=not-a-uuid",
    "?student_id=eq.not-a-uuid",
    "?student_id=is.null",
    "?student_id=in.()",
    `?student_id=in.(${fiftyOneUuids})`,
    `?student_id=eq.${uuid}&student_id=eq.${uuid}`,
    "?recorded_status=neq.passed",
    "?recorded_status=eq.invalid",
  ]) {
    assert.equal((await handle(read(query))).status, 400, query);
  }

  const readResource = (resource, query) =>
    new Request(`${env.url}/functions/v1/data-api/${resource}${query}`, {
      headers,
    });
  for (const [resource, query] of [
    ["course", "?or=(code.ilike.%25CSCI%25)"],
    ["course", "?or=(title.ilike.%25Intro%25,code.ilike.%25CSCI%25)"],
    [
      "course",
      "?or=(code.ilike.%25CSCI%25,title.ilike.%25Intro%25,code.ilike.%25Extra%25)",
    ],
    ["course", "?or=(actor_name.ilike.%25Admin%25)"],
    ["course", `?or=(code.ilike.%25${"a".repeat(101)}%25,title.ilike.%25b%25)`],
    ["course", "?or=(code.ilike.%25a%25,or(title.ilike.%25b%25))"],
    ["program", "?or=(code.ilike.%25BSCS%25)"],
    ["program", "?or=(code.ilike.%25BSCS%25,title.ilike.%25CS%25)"],
    ["audit_log_entry", "?or=(title.ilike.%25Computing%25)"],
    [
      "audit_log_entry",
      `?or=(${Array.from({ length: 8 }, () => "action.eq.view").join(",")})`,
    ],
    ["audit_log_entry", "?or=(actor_name.ilike.%25a%25,or(action.eq.view))"],
    ["audit_log_entry", "?and=(created_at.gte.2026-01-01,or(action.eq.view))"],
    [
      "audit_log_entry",
      "?and=(created_at.gte.2026-01-01T00:00:00,ID.EQ.1,created_at.lte.2026-01-02)",
    ],
    ["audit_log_entry", "?created_at=gte.2026-01-01T00:00:00,ID.EQ.1"],
    ["audit_log_entry", "?action_category=eq.unknown_category"],
    [
      "audit_log_entry",
      `?action_category=in.(${Array.from({ length: 12 }, () => "view").join(",")})`,
    ],
    ["profile", "?email=eq.not-an-email"],
    ["profile", "?email=eq.a%00@vsu.edu.ph"],
    ["profile", "?status=eq.deleted"],
    ["profile", "?role=neq.admin"],
  ]) {
    assert.equal(
      (await handle(readResource(resource, query))).status,
      400,
      `${resource}${query}`,
    );
  }
});

test("valid Data API reads keep the caller's JWT and strip private gateway headers", async () => {
  const requests = [];
  const handle = createDataApiHandler(env, (url, options) => {
    const forwarded = new Headers(options.headers);
    requests.push({ url: new URL(url), headers: forwarded });
    if (String(url).endsWith("/saais_read_data_api_gateway_key")) {
      assert.equal(forwarded.get("Authorization"), "Bearer service-key");
      return Promise.resolve(Response.json(gatewayKey));
    }
    return Promise.resolve(
      Response.json([{ id: "one" }], {
        status: 206,
        headers: {
          "Content-Range": "0-0/7",
          "X-Saais-Data-Api-Key": gatewayKey,
          "Set-Cookie": "internal=one",
        },
      }),
    );
  });

  const response = await handle(
    read(
      "?select=id,final_grade&order=id.desc.nullslast,final_grade.asc&limit=1",
      {
        ...headers,
        "X-Saais-Data-Api-Key": "client-provided-value",
        Prefer: "count=exact",
      },
    ),
  );
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("Content-Range"), "0-0/7");
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    env.origins[0],
  );
  assert.equal(response.headers.get("X-Saais-Data-Api-Key"), null);
  assert.equal(response.headers.get("Set-Cookie"), null);

  const defaultPage = await handle(
    read("?select=*", {
      ...headers,
      Range: "500000-500019",
      "Range-Unit": "items",
    }),
  );
  assert.equal(defaultPage.status, 206);
  assert.equal(requests[2].url.searchParams.get("limit"), "20");
  assert.equal(requests[2].url.searchParams.has("offset"), false);
  assert.equal(requests[2].headers.get("Range"), null);
  assert.equal(requests[2].headers.get("Range-Unit"), null);
  assert.equal(requests.length, 3, "The gateway key is cached between reads");
  assert.equal(requests[1].url.pathname, "/rest/v1/attempt_result");
  assert.equal(
    requests[1].url.searchParams.get("order"),
    "id.desc.nullslast,final_grade.asc",
  );
  assert.equal(requests[1].headers.get("Authorization"), "Bearer user-token");
  assert.equal(requests[1].headers.get("apikey"), "public-key");
  assert.equal(requests[1].headers.get("Accept-Profile"), "saais_api");
  assert.equal(requests[1].headers.get("X-Saais-Data-Api-Key"), gatewayKey);
  assert.equal(
    requests[2].url.searchParams.get("select"),
    contract.attempt_result.projection,
  );
});

test("Data API forwards pagination values at the contract boundaries", async () => {
  const requests = [];
  const handle = createDataApiHandler(env, async (url) => {
    if (String(url).endsWith("/saais_read_data_api_gateway_key")) {
      return Response.json(gatewayKey);
    }
    requests.push(new URL(url).searchParams);
    return Response.json([]);
  });
  for (const [limit, offset] of [
    [1, 0],
    [1000, 100000],
  ]) {
    const response = await handle(read(`?limit=${limit}&offset=${offset}`));
    assert.equal(response.status, 200);
    const sent = requests.at(-1);
    assert.equal(sent.get("limit"), String(limit));
    assert.equal(sent.get("offset"), String(offset));
  }
});

test("Data API forwards valid contract filters and allowlisted Prefer values", async () => {
  const requests = [];
  const handle = createDataApiHandler(env, async (url, options) => {
    if (String(url).endsWith("/saais_read_data_api_gateway_key")) {
      return Response.json(gatewayKey);
    }
    requests.push({
      url: new URL(url),
      headers: new Headers(options.headers),
    });
    return Response.json([]);
  });
  const uuid = "00000005-0000-4000-8000-000000000001";
  const fiftyUuids = Array.from(
    { length: 50 },
    (_, i) => `00000005-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  ).join(",");
  for (const [resource, query, prefer] of [
    [
      "attempt_result",
      `?student_id=eq.${uuid}&recorded_status=eq.passed`,
      "count=exact",
    ],
    ["attempt_result", `?student_id=neq.${uuid}`, " count=planned "],
    ["attempt_result", `?student_id=in.(${fiftyUuids})`, "count=estimated"],
    ["course", "?or=(code.ilike.%25CSCI%25,title.ilike.%25Physics%25)", null],
    ["program", "?or=(code.ilike.%25BSCS%25,name.ilike.%25Computer%25)", null],
    [
      "audit_log_entry",
      "?and=(created_at.gte.2026-01-31,created_at.lt.2026-02-01T00:00:00.000Z)&or=(action.ilike.*grade*,actor_name.ilike.*third*)&action_category=in.(view,grade_update)",
      null,
    ],
    ["audit_log_entry", "?created_at=gte.2026-02-01T07:00:00%2B08:00", null],
  ]) {
    const requestHeaders =
      prefer === null ? headers : { ...headers, Prefer: prefer };
    const response = await handle(
      new Request(`${env.url}/functions/v1/data-api/${resource}${query}`, {
        headers: requestHeaders,
      }),
    );
    assert.equal(response.status, 200, `${resource}${query}`);
    const sent = requests.at(-1);
    assert.equal(sent.url.pathname, `/rest/v1/${resource}`);
    const expectedParams = new URLSearchParams(query.slice(1));
    for (const [key, value] of expectedParams) {
      assert.deepEqual(
        sent.url.searchParams.getAll(key),
        [value],
        `${resource} forwarded ${key}`,
      );
    }
    assert.equal(
      sent.headers.get("Prefer"),
      prefer === null ? null : prefer.trim(),
    );
  }
});
