import { describe, expect, it } from "vitest";
import { reassignmentSchema } from "./reassignment.schema";

describe("reassignment input validation", () => {
  const validInput = {
    adviser_id: "88888888-8888-4888-8888-888888888888",
    effective_since: "2026-04-01",
  };

  it("accepts a 2,000-character reason and rejects a longer reason", () => {
    expect(
      reassignmentSchema.safeParse({
        ...validInput,
        reason: "a".repeat(2000),
      }).success,
    ).toBe(true);
    expect(
      reassignmentSchema.safeParse({
        ...validInput,
        reason: "a".repeat(2001),
      }).success,
    ).toBe(false);
  });

  it("rejects whitespace-only reasons and malformed dates", () => {
    expect(
      reassignmentSchema.safeParse({
        ...validInput,
        reason: " \t ",
      }).success,
    ).toBe(false);
    expect(
      reassignmentSchema.safeParse({
        ...validInput,
        effective_since: "2026-02-30",
        reason: "Valid reason",
      }).success,
    ).toBe(false);
  });
});
