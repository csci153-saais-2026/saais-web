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

async function read(
  path: string,
  query: Record<string, string>,
  token = MOCK_PERSONAS.admin.token,
  prefer?: string,
) {
  const url = new URL(path, base);
  Object.entries(query).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  return fetch(url, {
    headers: {
      ...headers,
      Authorization: `Bearer ${token}`,
      ...(prefer === undefined ? {} : { Prefer: prefer }),
    },
  });
}

describe("PostgREST mock query fidelity", () => {
  it("sorts numeric values numerically and matches anchored wildcard patterns", async () => {
    const db = getMockDatabase();
    const course = db.courses[0];
    db.courses.splice(
      0,
      db.courses.length,
      { ...course, id: "one", code: "CS 1", title: "Juan dela Cruz", units: 3 },
      { ...course, id: "two", code: "CS 2", title: "Ma. Cristina", units: 10 },
      { ...course, id: "three", code: "CS 3", title: "Juana Cruz", units: 2 },
    );
    const sorted = await (
      await read("/rest/v1/course", {
        order: "units.asc",
        limit: "2",
        offset: "1",
      })
    ).json();
    expect(sorted.map((row: { id: string }) => row.id)).toEqual(["one", "two"]);
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

  it("applies the contract's filters and Prefer checks before reading rows", async () => {
    const course = getMockDatabase().courses[0];
    const ids = Array.from(
      { length: 50 },
      (_, index) =>
        `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    );
    const path = "/rest/v1/course";
    const valid = await read(
      path,
      { id: `in.(${[course.id, ...ids.slice(0, 49)].join(",")})` },
      MOCK_PERSONAS.admin.token,
      "count=exact",
    );
    expect(valid.status).toBe(200);
    await expect(valid.json()).resolves.toEqual([course]);

    for (const [query, prefer, message] of [
      [
        { id: `eqq.${course.id}` },
        undefined,
        "Unsupported Data API id filter.",
      ],
      [
        { id: `in.(${[course.id, ...ids].join(",")})` },
        undefined,
        "Unsupported Data API id filter.",
      ],
      [{ units: "gte.3" }, undefined, "Unsupported Data API query parameter."],
      [{}, "unsupported", "Unsupported Data API Prefer header."],
    ] as const) {
      const invalid = await read(
        path,
        query,
        MOCK_PERSONAS.admin.token,
        prefer,
      );
      expect(invalid.status).toBe(400);
      await expect(invalid.json()).resolves.toMatchObject({
        code: "PT400",
        message,
      });
    }
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
    } finally {
      Object.assign(persona, { roles: originalRoles });
    }
  });

  it("limits shared student decision rows to each role's department or faculty scope", async () => {
    const db = getMockDatabase();
    const foreignId = MOCK_PERSONAS.student_other_dept.profileId;
    db.electiveMappings.push({
      ...db.electiveMappings[0],
      id: "foreign-elective",
      student_id: foreignId,
    });
    db.equivalencyDecisions.push({
      ...db.equivalencyDecisions[0],
      id: "foreign-equivalency",
      student_id: foreignId,
    });
    db.outsideCredits.push({
      ...db.outsideCredits[0],
      id: "foreign-credit",
      student_id: foreignId,
    });
    const decisionRows = {
      "/rest/v1/elective_mapping": db.electiveMappings,
      "/rest/v1/equivalency_decision": db.equivalencyDecisions,
      "/rest/v1/outside_credit": db.outsideCredits,
    };
    for (const persona of Object.keys(MOCK_PERSONAS) as Array<
      keyof typeof MOCK_PERSONAS
    >) {
      const assigned = MOCK_PERSONAS[persona];
      const visibleStudentIds = db.studentOrganizations
        .filter(
          (organization) =>
            assigned.roles.includes("admin") ||
            (assigned.roles.includes("student") &&
              assigned.profileId === organization.student_id) ||
            (assigned.roles.includes("adviser") &&
              db.adviserAssignments.some(
                (row) =>
                  row.student_id === organization.student_id &&
                  row.adviser_id === assigned.profileId,
              )) ||
            (assigned.roles.includes("dean") &&
              assigned.facultyId === organization.faculty_id) ||
            (assigned.roles.some(
              (role) =>
                role === "department_head" || role === "department_staff",
            ) &&
              assigned.departmentId === organization.department_id),
        )
        .map((organization) => organization.student_id);
      for (const [path, sourceRows] of Object.entries(decisionRows)) {
        const response = await read(path, {}, assigned.token);
        if (persona === "department_staff") {
          expect(response.status, `${persona} ${path}`).toBe(403);
          continue;
        }
        expect(response.status, `${persona} ${path}`).toBe(200);
        const rows = (await response.json()) as Array<{ student_id: string }>;
        const expectedIds = [
          ...new Set(
            sourceRows
              .map((row) => row.student_id)
              .filter((id) => visibleStudentIds.includes(id)),
          ),
        ].sort();
        expect(
          [...new Set(rows.map((row) => row.student_id))].sort(),
          `${persona} ${path}`,
        ).toEqual(expectedIds);
      }
    }
  });

  it("authorizes student records by union of assigned roles while denying cross-department access", async () => {
    const cases = [
      ["student", MOCK_PERSONAS.student.profileId, 200],
      ["student", MOCK_PERSONAS.student_secondary.profileId, 403],
      ["student_secondary", MOCK_PERSONAS.student_secondary.profileId, 200],
      ["adviser", MOCK_PERSONAS.student.profileId, 200],
      ["adviser", MOCK_PERSONAS.student_secondary.profileId, 403],
      ["adviser_secondary", MOCK_PERSONAS.student_secondary.profileId, 200],
      ["adviser_engineering", MOCK_PERSONAS.student_other_dept.profileId, 200],
      ["adviser_engineering", MOCK_PERSONAS.student.profileId, 403],
      ["department_head", MOCK_PERSONAS.student_secondary.profileId, 200],
      ["department_head", MOCK_PERSONAS.student_other_dept.profileId, 403],
      ["department_staff", MOCK_PERSONAS.student.profileId, 200],
      ["department_staff", MOCK_PERSONAS.student_other_dept.profileId, 403],
      ["dean", MOCK_PERSONAS.student_secondary.profileId, 200],
      ["dean", MOCK_PERSONAS.student_other_dept.profileId, 403],
      ["dean_dept_head", MOCK_PERSONAS.student.profileId, 200],
      ["dean_dept_head", MOCK_PERSONAS.student_other_dept.profileId, 403],
      ["admin", MOCK_PERSONAS.student_other_dept.profileId, 200],
    ] as const;
    for (const [persona, studentId, expectedStatus] of cases) {
      const response = await read(
        `/functions/v1/students/${studentId}/academic-summary`,
        {},
        MOCK_PERSONAS[persona].token,
      );
      expect(response.status, `${persona} -> ${studentId}`).toBe(
        expectedStatus,
      );
    }
  });

  it("supports documented OR search on /rest/v1/course and enforces per-endpoint OR allowlists", async () => {
    const db = getMockDatabase();
    const course = db.courses[0];
    db.courses.splice(
      0,
      db.courses.length,
      { ...course, id: "c1", code: "CSCI 101", title: "Intro to Computing" },
      { ...course, id: "c2", code: "MATH 101", title: "Calculus I" },
      { ...course, id: "c3", code: "PHYS 101", title: "Computing Physics" },
    );

    const matched = await read("/rest/v1/course", {
      or: "(code.ilike.%CSCI%,title.ilike.%Physics%)",
    });
    expect(matched.status).toBe(200);
    const matchedRows = await matched.json();
    expect(matchedRows.map((row: { id: string }) => row.id)).toEqual([
      "c1",
      "c3",
    ]);

    const auditFieldOnCourse = await read("/rest/v1/course", {
      or: "(actor_name.ilike.%Admin%)",
    });
    expect(auditFieldOnCourse.status).toBe(400);

    const courseFieldOnAudit = await read("/rest/v1/audit_log_entry", {
      or: "(title.ilike.%Computing%)",
    });
    expect(courseFieldOnAudit.status).toBe(400);
  });
});

describe("PostgREST mock disjunction search", () => {
  it("searches programs by code or name", async () => {
    const program = getMockDatabase().programs[0];
    for (const or of [
      `(code.ilike.%${program.code}%,name.ilike.%no-such-name%)`,
      `(code.ilike.%no-such-code%,name.ilike.%${program.name}%)`,
    ]) {
      const response = await read("/rest/v1/program", { or });
      expect(response.status).toBe(200);
      const rows: { id: string }[] = await response.json();
      expect(rows.map((row) => row.id)).toContain(program.id);
    }
  });

  it.each([
    ["course", "title", 250],
    ["program", "name", 150],
  ] as const)(
    "enforces the two-term filter and inner text limits for %s",
    async (resource, field, maxText) => {
      const path = `/rest/v1/${resource}`;
      const search = (codeLength: number, textLength: number) =>
        `(code.ilike.%${"a".repeat(codeLength)}%,${field}.ilike.%${"b".repeat(textLength)}%)`;

      expect((await read(path, { or: search(100, maxText) })).status).toBe(200);
      for (const or of [
        search(101, maxText),
        search(100, maxText + 1),
        "(code.ilike.%A%)",
        `(${field}.ilike.%B%,code.ilike.%A%)`,
        `(code.ilike.%A%,${field}.ilike.%B%,code.ilike.%C%)`,
        `(code.like.%A%,${field}.ilike.%B%)`,
        `(code.ilike.A,${field}.ilike.%B%)`,
        `(code.ilike.%%,${field}.ilike.%B%)`,
      ]) {
        const response = await read(path, { or });
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({
          code: "PT400",
        });
      }
    },
  );
});

it("accepts mock student photos through the 5 MiB contract limit", async () => {
  const student = MOCK_PERSONAS.student;
  const url = `${base}/functions/v1/students/${student.profileId}/photo`;
  const maxBytes = 5 * 1024 * 1024;
  for (const [size, status] of [
    [3 * 1024 * 1024, 200],
    [maxBytes, 200],
    [maxBytes + 1, 400],
  ]) {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        ...headers,
        Authorization: `Bearer ${student.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        storage_object_path: `students/${student.profileId}/upload-00000000-0000-4000-8000-000000000001.png`,
        avatar_url: "/student-photos/avatar.png",
        mime_type: "image/png",
        file_size_bytes: size,
      }),
    });
    expect(response.status).toBe(status);
    if (status === 400) {
      await expect(response.json()).resolves.toMatchObject({
        code: "FILE_TOO_LARGE",
        message: "Profile photo must not exceed 5 MiB (5,242,880 bytes).",
      });
    }
  }
});
