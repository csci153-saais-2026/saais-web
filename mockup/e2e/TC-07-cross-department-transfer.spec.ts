import { expect, test } from "@playwright/test";
import { openPrototypeRoute } from "./support/prototype";

test("TC-07 department head reviews pending curriculum transfer requests", async ({
  page,
}) => {
  const frame = await openPrototypeRoute(page, "department-head/curriculum-transfers");
  await expect(frame.locator("main")).toContainText(/transfer requests/i);
  await expect(frame.locator("main table").first()).toBeVisible();
  await expect(frame.locator("main")).toContainText(/pending/i);
  await expect(frame.locator("main button").first()).toBeVisible();
});
