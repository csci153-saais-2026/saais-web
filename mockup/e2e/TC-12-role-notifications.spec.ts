import { expect, test } from "@playwright/test";
import { openPrototypeRoute } from "./support/prototype";

const notificationRoutes = [
  "student/notifications",
  "adviser/notifications",
  "department-staff/notifications",
  "department-head/notifications",
  "system-admin/notifications",
  "dean-dh/adviser/notifications",
];

test("TC-12 each role prototype exposes its notification inbox", async ({
  page,
}) => {
  for (const route of notificationRoutes) {
    const frame = await openPrototypeRoute(page, route);
    await expect(frame.locator("main")).toContainText(/notifications/i);
    await expect(
      frame.locator("main").getByRole("button", { name: /mark all as read/i }),
    ).toBeVisible();
  }
});
