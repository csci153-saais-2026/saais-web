import { expect, test } from "@playwright/test";
import { openPrototypeRoute } from "./support/prototype";

test("TC-11 system administrator reviews accounts, roles, and audit history", async ({
  page,
}) => {
  let frame = await openPrototypeRoute(page, "system-admin/accounts");
  await expect(frame.locator("main")).toContainText(/accounts and roles/i);
  await expect(frame.locator("main table").first()).toBeVisible();
  await expect(frame.getByRole("button", { name: /add account/i }).first()).toBeVisible();

  frame = await openPrototypeRoute(page, "system-admin/audit-log");
  await expect(frame.locator("main")).toContainText(/system activity/i);
  await expect(frame.locator("main table").first()).toBeVisible();
});
