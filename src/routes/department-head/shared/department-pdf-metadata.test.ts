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
    api.read.mockResolvedValue({
      data: [department],
      response: new Response(),
    });

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

  it("does not read all departments when no department is assigned", async () => {
    expect(await loadDepartmentPdfMetadata(undefined)).toBeUndefined();
    expect(api.read).not.toHaveBeenCalled();
  });

  it("does not use a different department returned by the API", async () => {
    api.read.mockResolvedValue({
      data: [{ id: "department-b", name: "Other department" }],
      response: new Response(),
    });
    expect(await loadDepartmentPdfMetadata("department-a")).toBeUndefined();
  });

  it("forwards cancellation to the metadata request", async () => {
    api.read.mockResolvedValue({ data: [], response: new Response() });
    const { signal } = new AbortController();
    await loadDepartmentPdfMetadata("department-a", signal);
    expect(api.read.mock.calls[0][1].signal).toBe(signal);
  });

  it("propagates denied metadata reads instead of producing another letterhead", async () => {
    api.read.mockResolvedValue({
      error: { code: "INSUFFICIENT_PRIVILEGE", message: "Not allowed" },
      response: new Response(null, { status: 403 }),
    });
    await expect(
      loadDepartmentPdfMetadata("department-a"),
    ).rejects.toMatchObject({
      status: 403,
    });
  });
});
