import { expect, test } from "@playwright/test";
import { openPrototypeRoute } from "./support/prototype";

test("TC-06 department staff reviews adviser assignments and available actions", async ({
  page,
}) => {
  const frame = await openPrototypeRoute(
    page,
    "department-staff/adviser-assignments",
  );
  await expect(frame.locator("main")).toContainText(
    /student.adviser assignments/i,
  );
  await expect(frame.locator("main table").first()).toBeVisible();
  await expect(frame.locator("main")).toContainText(/current adviser/i);

  const actions = frame.locator("main button");
  await expect(actions.first()).toBeVisible();
});
