import { describe, expect, it } from "vitest";
import { postgrestFilter } from "./filters";

describe("postgrestFilter.likeLiteral", () => {
  it.each([
    ["%", "\\%"],
    ["a_b", "a\\_b"],
    ["a\\b", "a\\\\b"],
    ["a*b", "a_b"],
    ['Ma. "Jr."', 'Ma. "Jr."'],
  ])("keeps %s literal", (input, expected) => {
    expect(postgrestFilter.likeLiteral(input)).toBe(expected);
  });
});
