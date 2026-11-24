import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import SettingsPage from "./SettingsPage";
import { getAuditEvents, getSettings } from "../shared/dh-api";
import {
  renderDepartmentHead,
  setupDepartmentHeadMockApi,
  waitForLoaded,
} from "../test-utils";

setupDepartmentHeadMockApi();

async function openPage() {
  renderDepartmentHead(<SettingsPage />);
  await screen.findByLabelText("Probation from (%)");
  await waitForLoaded();
}

describe("Department Settings", () => {
  it("shows the stored thresholds, sender and latest backup", async () => {
    await openPage();
    expect(
      (screen.getByLabelText("Warning from (%)") as HTMLInputElement).value,
    ).toBe("25");
    expect(
      (screen.getByLabelText("Sender address") as HTMLInputElement).value,
    ).toBe("saais-noreply@vsu.edu.ph");
    expect(screen.getByText("BKP-2026-10-15-001")).toBeTruthy();
  });

  it("rejects unordered thresholds and only saves a valid change", async () => {
    await openPage();
    fireEvent.change(screen.getByLabelText("Probation from (%)"), {
      target: { value: "20" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);
    expect(
      await screen.findByText("Probation must be higher than warning."),
    ).toBeTruthy();
    expect((await getSettings()).thresholds).toEqual({
      warning: 25,
      probation: 50,
      dismissal: 75,
    });
    fireEvent.change(screen.getByLabelText("Probation from (%)"), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText("Warning from (%)"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);
    expect(await screen.findByText("Standing rules saved.")).toBeTruthy();
    expect((await getSettings()).thresholds).toEqual({
      warning: 10,
      probation: 50,
      dismissal: 75,
    });
    expect(
      (await getAuditEvents()).some(
        (event) => event.record === "Department settings",
      ),
    ).toBe(true);
  });

  it("validates the sender and saves it", async () => {
    await openPage();
    fireEvent.change(screen.getByLabelText("Sender address"), {
      target: { value: "dcst@example.com" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[1]);
    expect(
      await screen.findByText(
        "Use a VSU sender address ending in @vsu.edu.ph.",
      ),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Sender address"), {
      target: { value: "dcst@vsu.edu.ph" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[1]);
    expect(await screen.findByText("Email settings saved.")).toBeTruthy();
    expect((await getSettings()).senderEmail).toBe("dcst@vsu.edu.ph");
  });

  it("rejects a future or older completion, then records the backup", async () => {
    await openPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Record a backup made today" }),
    );
    const dialog = await screen.findByRole("dialog");
    const completed = within(dialog).getByLabelText(
      "Completion date and time (Philippine time)",
    );
    fireEvent.change(completed, { target: { value: "2999-01-01T12:00" } });
    fireEvent.change(within(dialog).getByLabelText("Backup reference"), {
      target: { value: "DCST-2026-002" },
    });
    fireEvent.change(within(dialog).getByLabelText("Storage location"), {
      target: { value: "Institutional storage / DCST" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save backup record" }),
    );
    expect(
      await within(dialog).findByText("Completion cannot be in the future."),
    ).toBeTruthy();
    fireEvent.change(completed, { target: { value: "2026-10-01T09:00" } });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save backup record" }),
    );
    expect(
      await within(dialog).findByText(
        "Use a completion time on or after the latest recorded backup.",
      ),
    ).toBeTruthy();
    fireEvent.change(completed, { target: { value: "2026-11-01T09:00" } });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save backup record" }),
    );
    expect(
      await screen.findByText("Completed backup record saved."),
    ).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("DCST-2026-002")).toBeTruthy();
    expect((await getSettings()).latestBackup?.reference).toBe("DCST-2026-002");
  });
});
