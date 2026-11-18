import { expect, test } from "@playwright/test";
import { openPrototypeRoute } from "./support/prototype";

test("TC-03 adviser grade changes require a reason and update the record", async ({
  page,
}) => {
  const frame = await openPrototypeRoute(page, "adviser/advisees/grades");
  const correction = frame.locator("button[data-grade]").first();
  await expect(correction).toBeVisible();
  await correction.click();

  const dialog = frame.locator("#dlg-grade");
  await expect(dialog).toBeVisible();
  await dialog.locator("#gr-fin").selectOption({ label: "2.00" });
  await dialog.locator("[data-save=grade]").click();
  await expect(dialog.locator("#gr-msg")).toContainText(/give a reason/i);

  await dialog.locator("#gr-reason").fill("Verified against the signed class record.");
  await dialog.locator("[data-save=grade]").click();
  await expect(frame.locator("#gr-done")).toContainText(/grade recorded|grade updated/i);
  await expect(
    frame.locator("tr").filter({ hasText: "CSIT 103" }).first(),
  ).toContainText("2.00");
});
