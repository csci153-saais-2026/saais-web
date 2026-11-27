import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { postgrestFilter } from "@/lib/api";
import { getMockDatabase, MOCK_PERSONAS, resetMockDatabase } from "./index";
import { saaisMockServer } from "./node";

const base = "https://saais-mock.supabase.co";
const headers = {
  apikey: "test-key",
  Authorization: `Bearer ${MOCK_PERSONAS.admin.token}`,
};

beforeAll(() => saaisMockServer.listen());
afterEach(() => {
  saaisMockServer.resetHandlers();
  resetMockDatabase();
});
afterAll(() => saaisMockServer.close());

async function read(path: string, query: Record<string, string>) {
  const url = new URL(path, base);
  Object.entries(query).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  return fetch(url, { headers });
}

describe("PostgREST mock query fidelity", () => {
  it("compares numeric values numerically and matches anchored wildcard patterns", async () => {
    const db = getMockDatabase();
    const course = db.courses[0];
    db.courses.splice(
      0,
      db.courses.length,
      { ...course, id: "one", code: "CS 1", title: "Juan dela Cruz", units: 3 },
      { ...course, id: "two", code: "CS 2", title: "Ma. Cristina", units: 10 },
      { ...course, id: "three", code: "CS 3", title: "Juana Cruz", units: 2 },
    );
    const number = await (
      await read("/rest/v1/course", { units: "gte.3" })
    ).json();
    expect(number.map((row: { id: string }) => row.id)).toEqual(["one", "two"]);
    const sorted = await (
      await read("/rest/v1/course", {
        order: "units.asc",
        limit: "2",
        offset: "1",
      })
    ).json();
    expect(sorted.map((row: { id: string }) => row.id)).toEqual(["one", "two"]);
    for (const order of ["units", "units.nullslast"]) {
      const rows = await (await read("/rest/v1/course", { order })).json();
      expect(rows.map((row: { id: string }) => row.id)).toEqual([
        "three",
        "one",
        "two",
      ]);
    }
    const wildcards = await (
      await read("/rest/v1/course", { title: "ilike.*juan*cruz*" })
    ).json();
    expect(wildcards.map((row: { id: string }) => row.id)).toEqual([
      "one",
      "three",
    ]);
    const exact = await (
      await read("/rest/v1/course", { title: "like.Ma. Cristin_" })
    ).json();
    expect(exact.map((row: { id: string }) => row.id)).toEqual(["two"]);
    expect(
      await (await read("/rest/v1/course", { title: "like.Cristina" })).json(),
    ).toEqual([]);
  });

  it("returns 20 rows by default and reports the full total", async () => {
    const db = getMockDatabase();
    const course = db.courses[0];
    db.courses.splice(
      0,
      db.courses.length,
      ...Array.from({ length: 25 }, (_, index) => ({
        ...course,
        id: `course-${index}`,
      })),
    );
    const response = await read("/rest/v1/course", {});
    expect(await response.json()).toHaveLength(20);
    expect(response.headers.get("Content-Range")).toBe("0-19/25");
  });

  it("compares timestamp offsets and includes the entire UTC upper date", async () => {
    const db = getMockDatabase();
    const entry = db.auditLogEntries[0];
    db.auditLogEntries.splice(
      0,
      db.auditLogEntries.length,
      {
        ...entry,
        id: "one",
        action: "grade_corrected",
        actor_name: "First",
        created_at: "2026-01-31T23:59:59Z",
      },
      {
        ...entry,
        id: "two",
        action: "plan_saved",
        actor_name: "Second",
        created_at: "2026-02-01T07:00:00+08:00",
      },
      {
        ...entry,
        id: "three",
        action: "note_added",
        actor_name: "Third",
        created_at: "2026-02-01T00:00:00Z",
      },
    );
    const range = postgrestFilter.createdAtBetween("2026-01-31", "2026-01-31");
    const rows = await (
      await read("/rest/v1/audit_log_entry", { and: range })
    ).json();
    expect(rows.map((row: { id: string }) => row.id).sort()).toEqual([
      "one",
      "two",
    ]);
    const boundary = await (
      await read("/rest/v1/audit_log_entry", {
        created_at: "gte.2026-02-01T00:00:00Z",
      })
    ).json();
    expect(boundary.map((row: { id: string }) => row.id)).toEqual(["three"]);
    const search = await (
      await read("/rest/v1/audit_log_entry", {
        or: "(action.ilike.*grade*,actor_name.ilike.*third*)",
      })
    ).json();
    expect(search.map((row: { id: string }) => row.id).sort()).toEqual([
      "one",
      "three",
    ]);
  });

  it("rejects malformed pagination for PostgREST and both student list handlers", async () => {
    for (const path of [
      "/rest/v1/course",
      "/functions/v1/students",
      `/functions/v1/students/${MOCK_PERSONAS.student.profileId}/course-offerings`,
    ]) {
      for (const query of [
        { limit: "abc" },
        { offset: "1x" },
        { limit: "0" },
        { offset: "-1" },
      ]) {
        expect((await read(path, query)).status).toBe(400);
      }
    }
  });

  it("combines student and adviser permissions without granting other students access", async () => {
    const persona = MOCK_PERSONAS.adviser;
    const originalRoles = persona.roles;
    Object.assign(persona, { roles: ["student", "adviser"] });
    try {
      const adviserHeaders = {
        apikey: "test-key",
        Authorization: `Bearer ${persona.token}`,
      };
      const getSummary = (id: string) =>
        fetch(`${base}/functions/v1/students/${id}/academic-summary`, {
          headers: adviserHeaders,
        });
      expect((await getSummary(MOCK_PERSONAS.student.profileId)).status).toBe(
        200,
      );
      expect(
        (await getSummary(MOCK_PERSONAS.student_other_dept.profileId)).status,
      ).toBe(403);
      const ownGradeWrite = await fetch(
        `${base}/functions/v1/students/${persona.profileId}/record-grades`,
        {
          method: "POST",
          headers: adviserHeaders,
        },
      );
      expect(ownGradeWrite.status).toBe(403);
      for (const [path, method] of [
        ["grade-flags", "POST"],
        ["photo", "PUT"],
        ["photo", "DELETE"],
      ]) {
        const response = await fetch(
          `${base}/functions/v1/students/${MOCK_PERSONAS.student.profileId}/${path}`,
          {
            method,
            headers: adviserHeaders,
          },
        );
        expect(response.status).toBe(403);
      }
    } finally {
      Object.assign(persona, { roles: originalRoles });
    }
  });
  it("restricts grade encoding to the student's current adviser", async () => {
    for (const persona of [
      MOCK_PERSONAS.admin,
      MOCK_PERSONAS.department_head,
      MOCK_PERSONAS.dean,
      MOCK_PERSONAS.student,
      MOCK_PERSONAS.student_other_dept,
    ]) {
      for (const endpoint of ["record-grades", "encode-grades"]) {
        const response = await fetch(
          `${base}/functions/v1/students/${MOCK_PERSONAS.student.profileId}/${endpoint}`,
          {
            method: "POST",
            headers: {
              apikey: "test-key",
              Authorization: `Bearer ${persona.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ school_term_id: "term", rows: [] }),
          },
        );
        expect(response.status).toBe(403);
      }
    }
  });
});
