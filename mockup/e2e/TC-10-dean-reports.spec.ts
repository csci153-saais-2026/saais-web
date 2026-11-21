import { expect, test } from "@playwright/test";
import { openPrototypeRoute } from "./support/prototype";

test("TC-10 dean report workspace presents faculty-scoped analytics", async ({
  page,
}) => {
  const frame = await openPrototypeRoute(page, "dean-adviser/reports");
  await expect(frame.locator("main")).toContainText(/faculty of computing/i);
  await expect(frame.locator("main")).toContainText(/mean gwa/i);
  await expect(frame.locator("main")).toContainText(
    /final grade distribution/i,
  );
  await expect(
    frame.locator("main").getByRole("button", { name: /download pdf/i }),
  ).toBeVisible();
});
