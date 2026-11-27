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
  for (const query of [
    "?select=id,profile(id)",
    "?select=grade_fix_history",
    "?order=reason.asc",
    "?order=id.asc&order=created_at.asc",
    "?select=id&select=final_grade",
    "?profile.order=id.asc",
  ]) {
    assert.equal((await handle(read(query))).status, 400, query);
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

  await handle(read("?select=*&limit=1"));
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
