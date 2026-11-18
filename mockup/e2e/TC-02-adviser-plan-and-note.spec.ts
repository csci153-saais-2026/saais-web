import { expect, test } from "@playwright/test";
import { openPrototypeRoute } from "./support/prototype";

test("TC-02 adviser saves a term plan and a student-visible note", async ({
  page,
}) => {
  const frame = await openPrototypeRoute(page, "adviser/advisees/advising");
  await expect(frame.locator("body")).toContainText(/course recommendations/i);
  await expect(frame.locator("body")).toContainText(/prerequisite/i);

  const course = frame.locator(".plan-pick").first();
  await course.check();
  await frame.locator("#plan-add").click();
  await expect(frame.locator("#plan-msg")).toContainText(/added to Maria's plan/i);

  await frame.locator("#note-body").fill("Review the prerequisite before enrollment.");
  await frame.locator("#note-form button[type=submit]").click();
  await expect(frame.locator("#note-msg")).toContainText(/student can read it/i);
  await expect(frame.locator("#note-list")).toContainText(
    "Review the prerequisite before enrollment.",
  );

  await expect(frame.locator("body")).toContainText(/always verify before acting/i);
});
