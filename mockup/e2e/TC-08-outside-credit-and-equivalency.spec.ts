import { expect, test } from "@playwright/test";
import { openPrototypeRoute } from "./support/prototype";

test("TC-08 department head reviews outside-credit and equivalency workspaces", async ({
  page,
}) => {
  let frame = await openPrototypeRoute(page, "department-head/outside-credits");
  await expect(frame.locator("main")).toContainText(/outside credits/i);
  await expect(frame.getByRole("button", { name: /credit a course/i })).toBeVisible();

  frame = await openPrototypeRoute(page, "department-head/equivalence");
  await expect(frame.locator("main")).toContainText(/equivalence/i);
  await expect(frame.getByRole("button", { name: /add course equivalence/i })).toBeVisible();
});
