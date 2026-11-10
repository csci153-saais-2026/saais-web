import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import rawCollection from "../../contract/postman/saais-api.postman_collection.json";
import rawMockEnv from "../../contract/postman/saais-mock.postman_environment.json";
import { saaisMockServer } from "./node";
import { resetMockDatabase } from "./store";

interface PostmanHeader {
  key: string;
  value: string;
}

interface PostmanRequest {
  method: string;
  header?: PostmanHeader[];
  body?: {
    mode: string;
    raw?: string;
  };
  url: {
    raw: string;
  };
}

interface PostmanItem {
  name: string;
  description?: string;
  item?: PostmanItem[];
  request?: PostmanRequest;
}

interface PostmanCollection {
  item: PostmanItem[];
}

interface PostmanEnvironment {
  values: Array<{
    key: string;
    value: string;
  }>;
}

function loadEnvironmentMap(): Record<string, string> {
  const raw = rawMockEnv as PostmanEnvironment;
  const map: Record<string, string> = {};
  for (const entry of raw.values) {
    map[entry.key] = entry.value;
  }
  return map;
}

function interpolate(text: string, env: Record<string, string>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const trimmed = key.trim();
    return env[trimmed] ?? "";
  });
}

function flattenRequests(
  items: PostmanItem[],
  prefix = "",
): Array<{ fullName: string; item: PostmanItem }> {
  const results: Array<{ fullName: string; item: PostmanItem }> = [];
  for (const item of items) {
    const fullName = prefix ? `${prefix} > ${item.name}` : item.name;
    if (item.request) {
      results.push({ fullName, item });
    }
    if (item.item) {
      results.push(...flattenRequests(item.item, fullName));
    }
  }
  return results;
}

describe("SAAIS Postman Collection against MSW Mock Server", () => {
  beforeAll(() => {
    saaisMockServer.listen();
  });

  afterEach(() => {
    resetMockDatabase();
    saaisMockServer.resetHandlers();
  });

  afterAll(() => {
    saaisMockServer.close();
  });

  it("executes all 119 OpenAPI operations (Authorized 2xx and Denied 401/403) and role/scope scenarios", async () => {
    const collection = rawCollection as unknown as PostmanCollection;
    const env = loadEnvironmentMap();
    const requests = flattenRequests(collection.item);

    expect(requests.length).toBeGreaterThanOrEqual(240);

    for (const { fullName, item } of requests) {
      resetMockDatabase();
      const req = item.request!;
      const rawUrl = interpolate(req.url.raw, env);
      const headers: Record<string, string> = {};
      for (const h of req.header ?? []) {
        headers[h.key] = interpolate(h.value, env);
      }

      const init: RequestInit = {
        method: req.method,
        headers,
      };
      if (
        req.body?.raw &&
        req.method !== "GET" &&
        req.method !== "HEAD" &&
        req.method !== "DELETE"
      ) {
        init.body = interpolate(req.body.raw, env);
      }

      const response = await fetch(rawUrl, init);

      if (item.name.startsWith("Authorized")) {
        expect(
          response.status,
          `Expected 2xx for ${fullName} (${req.method} ${rawUrl}), got ${response.status}`,
        ).toBeGreaterThanOrEqual(200);
        expect(
          response.status,
          `Expected 2xx for ${fullName} (${req.method} ${rawUrl}), got ${response.status}`,
        ).toBeLessThan(300);
      } else if (item.name.startsWith("Denied")) {
        expect(
          [401, 403],
          `Expected 401 or 403 for ${fullName} (${req.method} ${rawUrl}), got ${response.status}`,
        ).toContain(response.status);
      } else if (fullName.includes("409 Conflict")) {
        expect(response.status, `Expected 409 for ${fullName}`).toBe(409);
      } else if (fullName.includes("403 Forbidden")) {
        expect(response.status, `Expected 403 for ${fullName}`).toBe(403);
      } else if (fullName.includes("200 OK")) {
        expect(response.status, `Expected 200 for ${fullName}`).toBe(200);
      }
    }
  });
});
