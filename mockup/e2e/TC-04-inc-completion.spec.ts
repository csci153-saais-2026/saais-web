import { expect, test } from "@playwright/test";
import { openPrototypeRoute } from "./support/prototype";

test("TC-04 adviser completes an unresolved INC and preserves its attempt", async ({
  page,
}) => {
  const frame = await openPrototypeRoute(page, "adviser/advisees/grades");
  const inc = frame.locator("button[data-resolve]").first();
  await expect(inc).toBeVisible();
  const attempt = inc.locator("xpath=ancestor::tr");
  const attemptId = await attempt.getAttribute("data-attempt");
  expect(attemptId).toBeTruthy();
  await expect(attempt).toContainText(/INC/i);
  await inc.click();

  const dialog = frame.locator("#dlg-inc");
  await expect(dialog).toBeVisible();
  await dialog.locator("#inc-grade").selectOption({ label: "2.00" });
  await dialog.locator("#inc-reason").fill("Completion work reviewed.");
  await dialog.locator("[data-save=inc]").click();

  await expect(frame.locator("#gr-done")).toContainText(/INC resolved/i);
  const completedAttempt = frame.locator(
    `tr[data-attempt="${attemptId}"]`,
  );
  await expect(completedAttempt).toBeVisible();
  await expect(completedAttempt.locator("[data-fin]")).toHaveText("2.00");
  await expect(completedAttempt.locator("[data-st]")).toContainText("Passed");
  await expect(completedAttempt.locator("button[data-resolve]")).toHaveText(
    "Resolved",
  );
  await expect(frame.locator("#gr-done")).toContainText(
    /original attempt is preserved/i,
  );
});
