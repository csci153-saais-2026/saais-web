import { expect, test } from "@playwright/test";
import { openPrototypeRoute } from "./support/prototype";

test("TC-05 department staff can inspect the department student roster", async ({
  page,
}) => {
  const frame = await openPrototypeRoute(page, "department-staff/students");
  await expect(frame.locator("main")).toContainText(/students/i);
  await expect(frame.locator("main table").first()).toBeVisible();
  await expect(frame.getByLabel("Adviser")).toBeVisible();

  await frame.getByLabel("Adviser").selectOption({ index: 1 });
  await expect(frame.locator("main table").first()).toBeVisible();
});
