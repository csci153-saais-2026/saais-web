import { describe, expect, it } from "vitest";
import {
  AUDIT_LOG_SELECT,
  AUDIT_PAGE_SIZE,
  buildAuditListQuery,
  type AuditFilters,
} from "./admin-audit-model";

const emptyFilters: AuditFilters = {
  person: "",
  student: "",
  action: "",
  category: "",
  entityType: "",
  from: "",
  to: "",
};

describe("buildAuditListQuery", () => {
  it("uses an explicit safe projection, stable ordering, and bounded pagination", () => {
    const { query, error } = buildAuditListQuery(emptyFilters, 50);

    expect(error).toBeNull();
    expect(query).toEqual({
      select: AUDIT_LOG_SELECT,
      order: "created_at.desc,id.desc",
      limit: AUDIT_PAGE_SIZE,
      offset: 50,
    });
    expect(AUDIT_LOG_SELECT).not.toMatch(/old_value|new_value|reason/);
    expect(buildAuditListQuery(emptyFilters, -1).query?.offset).toBe(0);
    expect(
      buildAuditListQuery(emptyFilters, Number.MAX_SAFE_INTEGER).query?.offset,
    ).toBe(100_000);
  });

  it("maps supported filters to contract query parameters", () => {
    const { query, error } = buildAuditListQuery(
      {
        ...emptyFilters,
        person: "  Morgan Lee ",
        student: "24-1-",
        action: "plan",
        category: "plan_save",
        entityType: "advising_plan",
        from: "2026-08-12",
        to: "2026-08-12",
      },
      0,
    );

    expect(error).toBeNull();
    expect(query).toMatchObject({
      actor_name: "ilike.%Morgan Lee%",
      or: "(student_name.ilike.%24-1-%,student_number.ilike.%24-1-%,target_label.ilike.%24-1-%)",
      action: "ilike.%plan%",
      action_category: "eq.plan_save",
      entity_type: "eq.advising_plan",
      and: "(created_at.gte.2026-08-12T00:00:00.000Z,created_at.lt.2026-08-13T00:00:00.000Z)",
    });
  });

  it.each([
    [
      { ...emptyFilters, person: "a,b" },
      /Person search contains unsupported characters/,
    ],
    [
      { ...emptyFilters, student: "a(b)" },
      /Student search contains unsupported characters/,
    ],
    [
      { ...emptyFilters, category: "made_up" },
      /Select a valid action category/,
    ],
    [
      { ...emptyFilters, from: "2026-08-12" },
      /Choose both a start date and an end date/,
    ],
    [
      { ...emptyFilters, from: "2026-08-13", to: "2026-08-12" },
      /start date must not be after/,
    ],
    [
      { ...emptyFilters, from: "2026-02-31", to: "2026-03-01" },
      /Enter valid start and end dates/,
    ],
  ] as const)("rejects invalid filters", (filters, expectedError) => {
    const { query, error } = buildAuditListQuery(filters, 0);
    expect(query).toBeNull();
    expect(error).toMatch(expectedError);
  });

  it("rejects overlong filter values rather than sending an unbounded query", () => {
    const { query, error } = buildAuditListQuery(
      { ...emptyFilters, person: "a".repeat(101) },
      0,
    );
    expect(query).toBeNull();
    expect(error).toBe("Person search must be 100 characters or fewer.");
  });

  it.each(["student", "action"] as const)(
    "leaves room for the wildcards in the %s search",
    (field) => {
      const build = (length: number) =>
        buildAuditListQuery(
          { ...emptyFilters, [field]: "a".repeat(length) },
          0,
        );
      expect(build(98).query).not.toBeNull();
      expect(build(99).error).toMatch("98 characters or fewer");
    },
  );
});
