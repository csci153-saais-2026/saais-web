import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createSaaisApiClient, unwrapApiResult } from "@/lib/api";
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  resetMockDatabase,
} from "./index";
import { saaisMockServer } from "./node";

const client = () =>
  createSaaisApiClient({
    baseUrl: "https://saais-mock.supabase.co",
    apiKey: "sb_publishable_mock_key",
    mode: "mock",
  });
beforeAll(() => saaisMockServer.listen());
afterEach(() => {
  saaisMockServer.resetHandlers();
  resetMockDatabase();
  logoutMockPersona();
});
afterAll(() => saaisMockServer.close());

const total = (id: string) =>
  getMockDatabase().curriculumVersions.find((version) => version.id === id)
    ?.total_units;

describe("mock curriculum total units", () => {
  it("is calculated from the version's slots, ignoring any value sent", async () => {
    loginAsMockPersona("department_staff");
    const api = client();

    const version = unwrapApiResult(
      await api.POST("/functions/v1/catalog/curriculum_version", {
        body: {
          program_id: MOCK_IDS.programBscs,
          version_label: "BSCS 2030-2031 v1",
          effective_start: "2030-06-01",
          total_units: 147,
        },
      }),
    );
    expect(total(version.id)).toBe(0);

    const term = unwrapApiResult(
      await api.POST("/functions/v1/catalog/curriculum_term", {
        body: {
          curriculum_version_id: version.id,
          year_level: 1,
          term_sequence: 1,
          slots: [],
        },
      }),
    );
    const slot = unwrapApiResult(
      await api.POST("/functions/v1/catalog/curriculum_term_course", {
        body: {
          curriculum_term_id: term.id,
          is_elective_slot: true,
          slot_type: "elective",
          slot_label: "Elective",
          nominal_units: 3,
        },
      }),
    );
    expect(total(version.id)).toBe(3);

    unwrapApiResult(
      await api.PATCH("/functions/v1/catalog/curriculum_term_course/{id}", {
        params: { path: { id: slot.id } },
        body: { nominal_units: 4 },
      }),
    );
    expect(total(version.id)).toBe(4);

    const edited = unwrapApiResult(
      await api.PATCH("/functions/v1/catalog/curriculum_version/{id}", {
        params: { path: { id: version.id } },
        body: { total_units: 147 },
      }),
    );
    expect(edited.total_units).toBe(4);

    unwrapApiResult(
      await api.DELETE("/functions/v1/catalog/curriculum_term_course/{id}", {
        params: { path: { id: slot.id } },
      }),
    );
    expect(total(version.id)).toBe(0);
  });
});
