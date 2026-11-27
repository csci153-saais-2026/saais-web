import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({
  resolveSaaisEnvConfig: () => ({ mode: "mock" }),
}));
vi.mock("@/mocks/browser", () => ({
  startBrowserMockWorker: () => Promise.reject(new Error("worker unavailable")),
}));
vi.mock("./App.tsx", () => ({ default: () => <div>Application content</div> }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("renders the app and a visible warning when the mock worker fails", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  document.body.innerHTML = '<div id="root"></div>';
  await import("./main");
  expect((await screen.findByRole("alert")).textContent).toContain(
    "mock API could not start",
  );
  expect(screen.getByText("Application content")).toBeTruthy();
});

it("shows a startup error when application configuration prevents loading", async () => {
  vi.stubEnv("DEV", false);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.doMock("./App.tsx", () => {
    throw new Error("Missing API configuration");
  });
  document.body.innerHTML = '<div id="root"></div>';
  await import("./main");
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Check the API configuration",
  );
  vi.doUnmock("./App.tsx");
});

it("shows an error if rendering the application fails", async () => {
  vi.stubEnv("DEV", false);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.doMock("./App.tsx", () => ({
    default: () => {
      throw new Error("render failure");
    },
  }));
  document.body.innerHTML = '<div id="root"></div>';
  await import("./main");
  expect((await screen.findByRole("alert")).textContent).toContain(
    "encountered an error",
  );
  vi.doUnmock("./App.tsx");
});

it.each([
  ["a production build on the mock", false, "mock", true],
  ["development on the mock", true, "mock", false],
  ["a production build on Supabase", false, "supabase", false],
])("shows the demo banner only in %s", async (_, dev, mode, shown) => {
  vi.stubEnv("DEV", dev);
  vi.stubEnv("VITE_API_MODE", "supabase");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.doMock("@/lib/supabase/client", () => ({
    resolveSaaisEnvConfig: () => ({ mode }),
  }));
  // Development starts the mock worker; keep that from raising its own warning.
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:4010");
  // Earlier tests unmock the app, so mock it again here.
  vi.doMock("./App.tsx", () => ({
    default: () => <div>Application content</div>,
  }));
  document.body.innerHTML = '<div id="root"></div>';
  await import("./main");
  expect(await screen.findByText("Application content")).toBeTruthy();
  expect(screen.queryByText(/^DEMO:/) !== null).toBe(shown);
  vi.doUnmock("@/lib/supabase/client");
});
