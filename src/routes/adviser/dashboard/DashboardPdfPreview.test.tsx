import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ApiSchema } from "@/lib/api";
import { DashboardPdfPreview } from "./DashboardPdfPreview";
import { createDashboardPdf } from "./export-dashboard";

vi.mock("./export-dashboard", () => ({
  createDashboardPdf: vi.fn(),
  dashboardPdfFilename: "SAAIS-adviser-dashboard.pdf",
}));

const report = {
  adviser_id: "adviser-1",
  total_advisees: 1,
} as ApiSchema<"AdviserDashboardReport">;

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("DashboardPdfPreview", () => {
  it("clears a previous preview while regenerating and exposes a new preparation error", async () => {
    const createUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:old-preview");
    const revokeUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    vi.mocked(createDashboardPdf)
      .mockResolvedValueOnce(new Blob(["first"], { type: "application/pdf" }))
      .mockRejectedValueOnce(new Error("PDF unavailable"));
    const props = {
      report,
      termLabel: "All terms",
      adviserName: "Test Adviser",
      onClose: vi.fn(),
    };
    const view = render(<DashboardPdfPreview {...props} />);

    expect(await screen.findByTitle("Dashboard PDF preview")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Download PDF" }).getAttribute("href"),
    ).toBe("blob:old-preview");
    view.rerender(
      <DashboardPdfPreview {...props} termLabel="2026–2027 1st Semester" />,
    );
    expect(screen.queryByTitle("Dashboard PDF preview")).toBeNull();
    expect(screen.queryByRole("link", { name: "Download PDF" })).toBeNull();
    expect(await screen.findByRole("alert")).toBeTruthy();
    await waitFor(() =>
      expect(revokeUrl).toHaveBeenCalledWith("blob:old-preview"),
    );
    expect(createUrl).toHaveBeenCalledOnce();
  });
});
