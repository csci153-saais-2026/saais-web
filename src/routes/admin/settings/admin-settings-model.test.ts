import { describe, expect, it } from "vitest";
import {
  buildSenderEmailUpdate,
  buildThresholdUpdate,
  validateSenderEmail,
  validateThresholds,
} from "./admin-settings-model";

describe("admin settings form model", () => {
  it("accepts thresholds that satisfy the documented strict ordering", () => {
    expect(
      validateThresholds({
        warning: "25",
        probation: "50",
        dismissal: "75",
      }),
    ).toEqual({});
  });

  it("enforces finite percentages from 0 through 100", () => {
    expect(
      validateThresholds({
        warning: "-1",
        probation: "50",
        dismissal: "101",
      }),
    ).toEqual({
      warning: "Warning must be from 0% to 100%.",
      dismissal: "Dismissal must be from 0% to 100%.",
    });
    expect(
      validateThresholds({
        warning: "",
        probation: "abc",
        dismissal: "75",
      }),
    ).toEqual({
      warning: "Warning must be from 0% to 100%.",
      probation: "Probation must be from 0% to 100%.",
    });
  });

  it("accepts a zero warning threshold, as the backend does", () => {
    expect(
      validateThresholds({
        warning: "0",
        probation: "25.5",
        dismissal: "100",
      }),
    ).toEqual({});
  });

  it("requires warning < probation < dismissal", () => {
    expect(
      validateThresholds({
        warning: "50",
        probation: "50",
        dismissal: "50",
      }),
    ).toEqual({
      warning: "Warning must be less than probation.",
      probation: "Probation must be less than dismissal.",
    });
  });

  it("validates sender email by the contract email format and length", () => {
    expect(validateSenderEmail("sender@vsu.edu.ph")).toEqual({});
    expect(validateSenderEmail("not an email")).toEqual({
      senderEmail: "Enter a valid email address (254 characters maximum).",
    });
    expect(validateSenderEmail(`${"a".repeat(246)}@vsu.edu.ph`)).toHaveProperty(
      "senderEmail",
    );
  });

  it("builds narrow update payloads and trims the sender address", () => {
    expect(
      buildThresholdUpdate({
        warning: "25.5",
        probation: "50",
        dismissal: "75",
      }),
    ).toEqual({
      warning_pct: 25.5,
      probation_pct: 50,
      dismissal_pct: 75,
    });
    expect(buildSenderEmailUpdate(" sender@vsu.edu.ph ")).toEqual({
      sender_email: "sender@vsu.edu.ph",
    });
  });
});
