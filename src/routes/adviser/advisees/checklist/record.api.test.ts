import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { saaisMockServer } from "@/mocks/node";
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  resetMockDatabase,
} from "@/mocks";
import {
  completeInc,
  correctIncCompletion,
  getChecklist,
  getGrades,
  getIncResolution,
} from "./record.api";

vi.mock("@/lib/api", async (importOriginal) => {
  const api = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...api,
    apiClient: api.createSaaisApiClient({
      baseUrl: "https://saais-mock.supabase.co",
      apiKey: "mock",
      mode: "mock",
      fetch: (...args) => globalThis.fetch(...args),
    }),
  };
});

beforeAll(() => saaisMockServer.listen());
afterEach(() => {
  saaisMockServer.resetHandlers();
  resetMockDatabase();
  logoutMockPersona();
});
afterAll(() => saaisMockServer.close());

describe("selected advisee record API", () => {
  it("loads distinct student data and refuses a different adviser", async () => {
    loginAsMockPersona("adviser");
    const sample = getMockDatabase().profiles.find(
      (p) => p.email === "sample.student01@vsu.edu.ph",
    )!;
    const [primary, other] = await Promise.all([
      getChecklist(MOCK_IDS.studentPrimary),
      getChecklist(sample.id),
    ]);
    expect(primary.summary.student_id).toBe(MOCK_IDS.studentPrimary);
    expect(other.summary.student_id).toBe(sample.id);
    expect(
      primary.results
        .flatMap((r) => r.attempts ?? [])
        .some((a) => a.attempt_id === MOCK_IDS.attemptCsci102Inc),
    ).toBe(true);
    const grades = await getGrades(sample.id);
    expect(grades.canEdit).toBe(true);
    expect(
      grades.terms
        .flatMap((t) => t.attempts)
        .every((a) => a.student_id === sample.id),
    ).toBe(true);
    expect(grades.courses.length).toBeGreaterThan(0);
    loginAsMockPersona("adviser_secondary");
    await expect(getGrades(sample.id)).rejects.toThrow();
  });
  it("preserves historic read access but disables edits after handover", async () => {
    loginAsMockPersona("adviser");
    const assignment = getMockDatabase().adviserAssignments.find(
      (a) =>
        a.student_id === MOCK_IDS.studentPrimary &&
        a.adviser_id === MOCK_IDS.adviserPrimary,
    )!;
    assignment.end_date = "2026-01-01";
    const grades = await getGrades(MOCK_IDS.studentPrimary);
    expect(grades.canEdit).toBe(false);
    const inc = grades.terms
      .flatMap((t) => t.attempts)
      .find((a) => a.id === MOCK_IDS.attemptCsci102Inc)!;
    await expect(
      completeInc(MOCK_IDS.studentPrimary, inc, 2, "Completion"),
    ).rejects.toThrow();
  });
  it("reads and corrects the selected INC completion with its timestamp", async () => {
    loginAsMockPersona("adviser");
    const resolution = await getIncResolution(
      MOCK_IDS.studentPrimary,
      MOCK_IDS.attemptPhEd11IncResolved,
    );
    const updated = await correctIncCompletion(
      MOCK_IDS.studentPrimary,
      MOCK_IDS.attemptPhEd11IncResolved,
      2.25,
      "Corrected completion",
      resolution.updated_at,
    );
    expect(updated.student_id).toBe(MOCK_IDS.studentPrimary);
    expect(updated.attempt_id).toBe(MOCK_IDS.attemptPhEd11IncResolved);
    expect(
      (
        await getIncResolution(
          MOCK_IDS.studentPrimary,
          MOCK_IDS.attemptPhEd11IncResolved,
        )
      ).completion_grade,
    ).toBe(2.25);
  });
});
