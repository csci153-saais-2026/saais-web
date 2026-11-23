import { describe, expect, it } from "vitest";
import { incCompletionSchema } from "./inc-completion.schema";

describe("incCompletionSchema", () => {
  it.each(["1.00", "3.00", "5.00"])("accepts completion grade %s", (grade) => {
    expect(
      incCompletionSchema.safeParse({
        completionGrade: grade,
        reason: "Reviewed",
      }).success,
    ).toBe(true);
  });

  it.each(["", "0.75", "4.10", "5.25", "NaN"])(
    "rejects completion grade %s",
    (grade) => {
      expect(
        incCompletionSchema.safeParse({
          completionGrade: grade,
          reason: "Reviewed",
        }).success,
      ).toBe(false);
    },
  );

  it("rejects empty and overlong reasons", () => {
    expect(
      incCompletionSchema.safeParse({ completionGrade: "2.00", reason: " " })
        .success,
    ).toBe(false);
    expect(
      incCompletionSchema.safeParse({
        completionGrade: "2.00",
        reason: "x".repeat(2001),
      }).success,
    ).toBe(false);
  });
});
