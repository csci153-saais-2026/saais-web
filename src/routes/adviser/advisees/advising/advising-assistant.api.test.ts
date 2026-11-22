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
import { askAdvisingAssistant } from "./advising-assistant.api";

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
