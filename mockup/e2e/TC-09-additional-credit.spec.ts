import { expect, test } from "@playwright/test";
import { openPrototypeRoute } from "./support/prototype";

test("TC-09 adviser can review recorded attempts and the checklist", async ({
  page,
}) => {
  const frame = await openPrototypeRoute(page, "adviser/advisees/grades");
  await expect(frame.locator("main table").first()).toBeVisible();
  await expect(frame.locator("main")).toContainText(/attempt/i);

  const checklist = await openPrototypeRoute(
    page,
    "adviser/advisees/checklist",
  );
  await expect(checklist.locator("main table").first()).toBeVisible();
  await expect(checklist.locator("main")).toContainText(/satisfaction source/i);
});
