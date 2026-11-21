import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./mockup/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev:mockup",
    url: "http://127.0.0.1:4173/prototype.html",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
