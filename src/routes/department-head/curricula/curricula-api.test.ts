import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api";
import { updateCurriculumVersion } from "./curricula-api";

afterEach(() => vi.restoreAllMocks());

describe("updateCurriculumVersion", () => {
  it("sends status only when it is given", async () => {
    const patch = vi
      .spyOn(apiClient, "PATCH")
      .mockResolvedValue({ data: {}, response: new Response() } as never);
    const input = { label: "BSCS 2024", start: "2024-08-01" };

    await updateCurriculumVersion("version-one", input);
    await updateCurriculumVersion("version-one", {
      ...input,
      status: "closed",
    });

    const bodies = patch.mock.calls.map(
      (call) => (call[1] as { body: object }).body,
    );
    expect(bodies[0]).not.toHaveProperty("total_units");
    expect(bodies[0]).not.toHaveProperty("status");
    expect(bodies[1]).toHaveProperty("status", "closed");
  });
});
