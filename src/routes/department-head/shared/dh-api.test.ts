import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api";
import { getDepartmentAdvisers, getSettings } from "./dh-api";

type Query = Record<string, unknown>;

/** Answers collection reads with fixed rows and records each query. */
function stubReads(rows: Record<string, unknown[]>) {
  const queries: [string, Query][] = [];
  vi.spyOn(apiClient, "GET").mockImplementation((async (
    path: string,
    init: { params: { query: Query } },
  ) => {
    queries.push([path, init.params.query]);
    return { data: rows[path] ?? [], response: new Response() };
  }) as never);
  return queries;
}

afterEach(() => vi.restoreAllMocks());

describe("getDepartmentAdvisers", () => {
  it("finds advisers when profiles carry no roles field", async () => {
    const queries = stubReads({
      "/rest/v1/role_assignment": [{ profile_id: "a" }, { profile_id: "b" }],
      "/rest/v1/profile": [
        { id: "a", full_name: "Ana", email: "a@x.test", department_id: "d1" },
        { id: "b", full_name: "Ben", email: "b@x.test", department_id: "d2" },
      ],
    });

    expect(await getDepartmentAdvisers(["d1"])).toEqual([
      { id: "a", name: "Ana", email: "a@x.test" },
    ]);
    expect(queries[0][1]).toMatchObject({
      role: "eq.adviser",
      department_id: "in.(d1)",
    });
    expect(queries[1][1]).toMatchObject({
      id: "in.(a,b)",
      status: "eq.active",
    });
  });

  it("fails clearly without a headed department", async () => {
    await expect(getDepartmentAdvisers([])).rejects.toThrow(
      "department head assignment",
    );
  });
});

describe("getSettings", () => {
  const row = (department_id: string | null, warning_pct: number) => ({
    department_id,
    warning_pct,
    probation_pct: 50,
    dismissal_pct: 75,
    sender_email: "a@x.test",
  });

  it("prefers the headed department over other visible rows", async () => {
    stubReads({
      "/rest/v1/system_settings": [
        row("other", 10),
        row("d1", 25.5),
        row(null, 30),
      ],
    });

    expect((await getSettings(["d1"])).thresholds.warning).toBe(25.5);
  });

  it("falls back to the institution default", async () => {
    stubReads({
      "/rest/v1/system_settings": [row("other", 10), row(null, 30)],
    });

    expect((await getSettings(["d1"])).thresholds.warning).toBe(30);
  });
});
