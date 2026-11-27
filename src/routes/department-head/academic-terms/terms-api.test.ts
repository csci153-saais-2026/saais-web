import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";

let terms: typeof import("./terms-api");
let dh: typeof import("../shared/dh-api");

beforeAll(async () => {
  saaisMockServer.listen();
  terms = await import("./terms-api");
  dh = await import("../shared/dh-api");
});
afterEach(() => {
  saaisMockServer.resetHandlers();
  resetMockDatabase();
  logoutMockPersona();
});
afterAll(() => saaisMockServer.close());

describe("department head encoding closures", () => {
  it("ignores closures made by other departments", async () => {
    const db = getMockDatabase();
    db.departmentTermEncodings.push({
      ...db.departmentTermEncodings[0]!,
      id: "foreign-closure",
      department_id: "foreign-department",
      is_closed: true,
      closed_at: "2026-11-01T00:00:00Z",
    });
    loginAsMockPersona("department_head");

    const rows = await terms.getAcademicTerms([MOCK_IDS.deptDcst]);
    const open = db.schoolTerms.find(
      (term) => term.id === MOCK_IDS.term2026Sem1Open,
    )!;
    expect(rows.find((row) => row.id === open.id)?.status).toBe("Open");
    expect(await dh.getLastEncodingClosure([MOCK_IDS.deptDcst])).toBeNull();
  });
});
