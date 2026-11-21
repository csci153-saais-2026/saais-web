import { expect, test } from "@playwright/test";
import { openPrototypeRoute } from "./support/prototype";

test("TC-01 student reviews their own record across portal screens", async ({
  page,
}) => {
  let frame = await openPrototypeRoute(page, "student/dashboard");
  await expect(frame.locator("body")).toContainText("Maria Isabel Bautista");
  await expect(frame.locator("body")).toContainText("23-1-04412");
  await frame.getByRole("button", { name: /view advising notes/i }).click();
  await expect(frame.locator("body")).toContainText(
    /discussed a manageable course load/i,
  );

  frame = await openPrototypeRoute(page, "student/checklist");
  await expect(frame.locator("main")).toContainText(
    /your curriculum, at a glance/i,
  );
  await expect(frame.locator("main table").first()).toBeVisible();
  await expect(
    frame
      .locator("main button")
      .filter({ hasText: /correct grade|resolve inc|encode grades/i }),
  ).toHaveCount(0);

  frame = await openPrototypeRoute(page, "student/grades");
  await expect(frame.locator("main table").first()).toBeVisible();
  await expect(frame.locator("main")).toContainText(/grade flags/i);
  await expect(
    frame
      .locator("main button")
      .filter({ hasText: /correct grade|resolve inc|encode grades/i }),
  ).toHaveCount(0);

  frame = await openPrototypeRoute(page, "student/history");
  await expect(frame.locator("main")).toContainText(
    /every attempt stays on record/i,
  );
  await expect(frame.locator("main table").first()).toBeVisible();

  frame = await openPrototypeRoute(page, "student/notifications");
  await expect(frame.locator("main")).toContainText(/notifications/i);
  await expect(
    frame.locator("main").getByRole("button", { name: /mark all as read/i }),
  ).toBeVisible();
});
