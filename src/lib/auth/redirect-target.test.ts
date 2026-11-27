import { describe, expect, it } from "vitest";
import {
  destinationAllowedForRoles,
  safeInternalDestination,
} from "./redirect-target";

describe("safe authentication return destinations", () => {
  it("preserves safe internal paths, query strings, and hashes", () => {
    expect(safeInternalDestination("/student/grades?term=2026#results")).toBe(
      "/student/grades?term=2026#results",
    );
  });

  it.each([
    "https://attacker.example/steal",
    "//attacker.example/steal",
    "/\\attacker.example/steal",
    "/login",
    "/auth/callback",
    "/student\u0000/dashboard",
  ])("rejects unsafe redirect target %s", (value) => {
    expect(safeInternalDestination(value)).toBeNull();
  });

  it("checks the requested portal against all assigned roles", () => {
    expect(
      destinationAllowedForRoles("/student/checklist", ["student", "adviser"]),
    ).toBe(true);
    expect(destinationAllowedForRoles("/dean/reports", ["student"])).toBe(
      false,
    );
  });
});
