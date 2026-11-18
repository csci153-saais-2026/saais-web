import { expect, type FrameLocator, type Page } from "@playwright/test";

type PrototypeManifest = {
  routes: Record<string, { file: string }>;
};

export async function openPrototypeRoute(
  page: Page,
  route: string,
): Promise<FrameLocator> {
  await page.goto(`/prototype.html#/${route}`);
  const frame = page.locator("#portal-frame");
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute("title", /SAAIS/);
  const expectedFile = await page.evaluate((key) => {
    return (window as Window & { SAAIS_PORTALS: PrototypeManifest })
      .SAAIS_PORTALS.routes[key]?.file;
  }, route);
  expect(expectedFile, `Unknown prototype route ${route}`).toBeTruthy();
  await expect
    .poll(async () =>
      frame.evaluate((element) => {
        return decodeURIComponent(
          new URL((element as HTMLIFrameElement).src).pathname,
        );
      }),
    )
    .toBe(`/${expectedFile}`);

  const content = page.frameLocator("#portal-frame");
  await expect(content.locator("body")).not.toBeEmpty();
  return content;
}

export async function expectPrototypeRoutes(
  page: Page,
  routes: string[],
): Promise<void> {
  for (const route of routes) {
    const frame = await openPrototypeRoute(page, route);
    await expect(frame.locator("body")).toBeVisible();
  }
}
