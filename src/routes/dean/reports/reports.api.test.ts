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
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";
import { getFacultyReport } from "@/routes/dean/reports/reports.api";
import { getDeanFaculties } from "@/routes/dean/shared/dean-faculty.api";

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

describe("reports.api", () => {
  it("fetches faculty report and faculties for an authorized dean and rejects unauthorized roles", async () => {
    loginAsMockPersona("dean");
    const [report, faculties] = await Promise.all([
      getFacultyReport(),
      getDeanFaculties(),
    ]);

    expect(report.total_students).toBeGreaterThanOrEqual(0);
    expect(faculties.some((f) => f.id === report.faculty_id)).toBe(true);

    loginAsMockPersona("student");
    await expect(getFacultyReport()).rejects.toThrow();
  });
});
