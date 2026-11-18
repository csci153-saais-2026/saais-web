import { expect, test } from "@playwright/test";
import { openPrototypeRoute } from "./support/prototype";

test("TC-04 adviser completes an unresolved INC and preserves its attempt", async ({
  page,
}) => {
  const frame = await openPrototypeRoute(page, "adviser/advisees/grades");
  const inc = frame.locator("button[data-resolve]").first();
  await expect(inc).toBeVisible();
  const originalCourse = await inc.getAttribute("data-course");
  await inc.click();

  const dialog = frame.locator("#dlg-inc");
  await expect(dialog).toBeVisible();
  await dialog.locator("#inc-grade").selectOption({ label: "2.00" });
  await dialog.locator("#inc-reason").fill("Completion work reviewed.");
  await dialog.locator("[data-save=inc]").click();

  await expect(frame.locator("#gr-done")).toContainText(/INC resolved/i);
  await expect(frame.locator("main")).toContainText(originalCourse ?? "INC");
  await expect(frame.locator("main")).toContainText(
    /completion history|resolved/i,
  );
});
