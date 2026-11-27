import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";
import {
  askAdvisingAssistant,
  getAdvisingAssistantHistory,
} from "./advising-assistant.api";

vi.mock("@/lib/api", async (importOriginal) => {
  const api = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...api,
    apiClient: api.createSaaisApiClient({
      baseUrl: "https://saais-mock.supabase.co",
      apiKey: "sb_publishable_mock_key",
      mode: "mock",
      fetch: (request) => globalThis.fetch(request),
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

describe("advising assistant API", () => {
  it("sends a request for the selected student to the shared handler", async () => {
    loginAsMockPersona("adviser");
    const result = await askAdvisingAssistant(
      MOCK_IDS.studentPrimary,
      "What should I review?",
      [],
    );
    expect(result.answer).toContain("Simulated");
    expect(result.mutates_records).toBe(false);
  });
  it("rejects a student outside the signed-in adviser assignment", async () => {
    loginAsMockPersona("adviser_secondary");
    await expect(
      askAdvisingAssistant(
        MOCK_IDS.studentPrimary,
        "What should I review?",
        [],
      ),
    ).rejects.toThrow();
  });
});

describe("advising assistant history", () => {
  it("reads the saved messages for the selected student", async () => {
    loginAsMockPersona("adviser");
    await expect(
      getAdvisingAssistantHistory(MOCK_IDS.studentPrimary),
    ).resolves.toEqual([]);
    const { answer } = await askAdvisingAssistant(
      MOCK_IDS.studentPrimary,
      "Question",
      [],
    );
    await expect(
      getAdvisingAssistantHistory(MOCK_IDS.studentPrimary),
    ).resolves.toEqual([
      { role: "user", content: "Question" },
      { role: "assistant", content: answer },
    ]);
  });

  it("rejects an unrelated adviser", async () => {
    loginAsMockPersona("adviser_secondary");
    await expect(
      getAdvisingAssistantHistory(MOCK_IDS.studentPrimary),
    ).rejects.toThrow("outside your adviser assignment");
  });
});
