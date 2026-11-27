import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createSaaisApiClient } from "@/lib/api";
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  MOCK_PERSONAS,
  resetMockDatabase,
} from "./index";
import { saaisMockServer } from "./node";

const baseUrl = "https://saais-mock.supabase.co";
const route = "/functions/v1/students/{student_id}/assistant" as const;
const client = () =>
  createSaaisApiClient({
    baseUrl,
    apiKey: "sb_publishable_mock_key",
    mode: "mock",
  });
const call = (studentId: string = MOCK_IDS.studentPrimary) =>
  client().POST(route, {
    params: { path: { student_id: studentId } },
    body: { message: "What should I review?" },
  });

beforeAll(() => saaisMockServer.listen());
afterEach(() => {
  saaisMockServer.resetHandlers();
  resetMockDatabase();
  logoutMockPersona();
});
afterAll(() => saaisMockServer.close());

describe("advising assistant contract mock", () => {
  it("uses the selected assigned student and never modifies records", async () => {
    loginAsMockPersona("adviser");
    const db = getMockDatabase();
    const before = structuredClone(db);
    const result = await call();
    expect(result.response.status).toBe(200);
    expect(result.data?.answer).toContain(MOCK_PERSONAS.student.fullName);
    expect(result.data?.answer).toContain("Simulated");
    expect(result.data?.verification_notice).toBeTruthy();
    expect(result.data?.mutates_records).toBe(false);
    const { assistantHistories: afterHistories, ...recordsAfter } = db;
    const { assistantHistories: beforeHistories, ...recordsBefore } = before;
    expect(recordsAfter).toEqual(recordsBefore);
    expect(beforeHistories).toEqual({});
    expect(
      afterHistories[
        `${MOCK_PERSONAS.adviser.profileId}:${MOCK_IDS.studentPrimary}`
      ],
    ).toHaveLength(2);
  });

  it("allows a historic assigned adviser but rejects an unrelated adviser and student", async () => {
    const assignment = getMockDatabase().adviserAssignments[0]!;
    assignment.end_date = "2026-01-01";
    loginAsMockPersona("adviser");
    expect((await call()).response.status).toBe(200);
    loginAsMockPersona("adviser_secondary");
    expect((await call()).response.status).toBe(403);
    loginAsMockPersona("student");
    expect((await call()).response.status).toBe(403);
  });

  it("requires the adviser assignment even for a multi-role administrator", async () => {
    loginAsMockPersona("admin");
    expect((await call()).response.status).toBe(403);
    getMockDatabase().adviserAssignments[0]!.adviser_id = MOCK_IDS.systemAdmin;
    expect((await call()).response.status).toBe(200);
  });

  it("rejects unauthenticated and missing-student requests", async () => {
    expect((await call()).response.status).toBe(401);
    loginAsMockPersona("adviser");
    expect(
      (await call("00000000-0000-4000-8000-000000000999")).response.status,
    ).toBe(404);
  });

  it("validates messages, history and unknown fields", async () => {
    loginAsMockPersona("adviser");
    const url = `${baseUrl}/functions/v1/students/${MOCK_IDS.studentPrimary}/assistant`;
    const send = (body: unknown) =>
      fetch(url, {
        method: "POST",
        headers: {
          apikey: "sb_publishable_mock_key",
          Authorization: `Bearer ${MOCK_PERSONAS.adviser.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    for (const body of [
      null,
      [],
      {},
      { message: " " },
      { message: "x".repeat(4001) },
      { message: "Hi", extra: true },
      { message: "Hi", history: null },
      {
        message: "Hi",
        history: Array(21).fill({ role: "user", content: "Hi" }),
      },
      { message: "Hi", history: [{ role: "system", content: "Hi" }] },
      { message: "Hi", history: [{ role: "user", content: " ", extra: true }] },
    ]) {
      expect((await send(body)).status).toBe(400);
    }
    expect(
      (
        await send({
          message: "Hi",
          history: [{ role: "user", content: "Earlier" }],
        })
      ).status,
    ).toBe(200);
  });
});
