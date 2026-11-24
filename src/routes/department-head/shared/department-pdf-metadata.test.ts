import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  apiClient: { GET: api.read },
}));
import { loadDepartmentPdfMetadata } from "./department-pdf-metadata";

beforeEach(() => vi.resetAllMocks());

describe("department PDF metadata", () => {
  it("requests the selected department's letterhead and signatories", async () => {
    const department = { id: "department-a", name: "Computing" };
    api.read.mockResolvedValue({ data: [department] });

    expect(await loadDepartmentPdfMetadata("department-a")).toBe(department);
    expect(api.read).toHaveBeenCalledWith("/rest/v1/department", {
      params: {
        query: {
          id: "eq.department-a",
          select:
            "id,faculty_id,name,code,letterhead_prefix,letterhead_name,department_head_name,dean_name",
          limit: 1,
        },
      },
    });
  });
});
