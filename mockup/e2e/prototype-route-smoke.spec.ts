import { expect, test } from "@playwright/test";
import { openPrototypeRoute } from "./support/prototype";

test("prototype router loads role screens through the browser iframe", async ({
  page,
}) => {
  const frame = await openPrototypeRoute(page, "student/dashboard");

  await expect(frame.locator("body")).toContainText(
    /dashboard|welcome|student/i,
  );
});
