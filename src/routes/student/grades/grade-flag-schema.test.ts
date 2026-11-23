import { describe, expect, it } from "vitest";
import { MOCK_IDS } from "@/mocks";
import { gradeFlagSchema } from "./grade-flag-schema";

describe("gradeFlagSchema", () => {
  it("accepts a valid grade flag submission and trims details", () => {
    const result = gradeFlagSchema.safeParse({
      attempt_id: MOCK_IDS.attemptCsci101Passed,
      reported_stage: "final",
      reported_grade_text: "1.75",
      issue_type: "wrong_grade",
      details: "  My class card shows 1.50 instead of 1.75.  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.details).toBe(
        "My class card shows 1.50 instead of 1.75.",
      );
    }
  });

  it("rejects empty or whitespace-only details", () => {
    const result = gradeFlagSchema.safeParse({
      attempt_id: MOCK_IDS.attemptCsci101Passed,
      issue_type: "missing_grade",
      details: "   ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Please describe the grade issue before submitting.",
      );
    }
  });

  it("rejects details exceeding 2,000 characters", () => {
    const result = gradeFlagSchema.safeParse({
      attempt_id: MOCK_IDS.attemptCsci101Passed,
      issue_type: "other",
      details: "a".repeat(2001),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Details must be 2,000 characters or fewer.",
      );
    }
  });

  it("rejects invalid issue_type, reported_stage, and empty attempt_id", () => {
    const badIssue = gradeFlagSchema.safeParse({
      attempt_id: "",
      reported_stage: "prelim",
      issue_type: "unknown_issue",
      details: "Issue",
    });

    expect(badIssue.success).toBe(false);
  });
});
