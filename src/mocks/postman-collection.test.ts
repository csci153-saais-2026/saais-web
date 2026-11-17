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

function buildRequest(req: PostmanRequest, env: Record<string, string>): [string, RequestInit] {
  const headers: Record<string, string> = {};
  for (const h of req.header ?? []) headers[h.key] = interpolate(h.value, env);
  const init: RequestInit = { method: req.method, headers };
  if (req.body?.raw && !["GET", "HEAD", "DELETE"].includes(req.method)) {
    init.body = interpolate(req.body.raw, env);
  }
  return [interpolate(req.url.raw, env), init];
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

  it("endorses a different active curriculum for an assigned advisee", async () => {
    const requests = flattenRequests((rawCollection as unknown as PostmanCollection).item);
    const entry = requests.find(({ fullName, item }) =>
      fullName.includes("(endorseCurriculumTransfer)") && item.name.startsWith("Authorized"),
    );
    expect(entry).toBeDefined();
    const [url, init] = buildRequest(entry!.item.request!, loadEnvironmentMap());
    const requestBody = JSON.parse(init.body as string);
    const response = await fetch(url, init);
    expect(response.status).toBe(201);
    const transfer = await response.json();
    expect(transfer.student_id).toBe(url.split("/").at(-2));
    expect(transfer.to_curriculum_version_id).toBe(requestBody.to_curriculum_version_id);
    expect(transfer.from_curriculum_version_id).not.toBe(transfer.to_curriculum_version_id);
    expect(transfer.endorsement_note).toBe(requestBody.endorsement_note);
    expect(transfer.status).toBe("pending");
  });

  it("executes OpenAPI operations (Authorized 2xx and Denied 401/403) and role/scope scenarios", async () => {
    const collection = rawCollection as unknown as PostmanCollection;
    const env = loadEnvironmentMap();
    const requests = flattenRequests(collection.item);

    expect(requests.length).toBeGreaterThanOrEqual(240);

    for (const { fullName, item } of requests) {
      resetMockDatabase();
      const req = item.request!;
      const [rawUrl, init] = buildRequest(req, env);

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
