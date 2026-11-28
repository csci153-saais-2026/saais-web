import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/staging",
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  reporter: "dot",
  timeout: 45_000,
  expect: { timeout: 15_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.SAAIS_STAGING_URL,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
