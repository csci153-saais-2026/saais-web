import { describe, expect, it } from "vitest";
import { schoolTermFormSchema } from "./school-term.schema";

const valid = {
  start_year: 2025,
  end_year: 2026,
  term_type: "2nd Semester" as const,
  starts_on: "2026-01-01",
  ends_on: "2026-05-31",
  encoding_deadline: "2026-06-15",
};

describe("schoolTermFormSchema", () => {
  it("accepts a valid academic year, semester, and ordered dates", () => {
    expect(schoolTermFormSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    { start_year: 1899 },
    { end_year: 2027 },
    { term_type: "not a semester" },
    { starts_on: "" },
    { starts_on: "2026-06-01" },
    { ends_on: "2025-12-31" },
    { encoding_deadline: "2026-05-30" },
  ])("rejects invalid field values: %j", (change) => {
    expect(
      schoolTermFormSchema.safeParse({ ...valid, ...change }).success,
    ).toBe(false);
  });
});
