import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
    // Unbounded workers (plus coverage) starve Radix-heavy jsdom tests and cause
    // spurious timeouts, on many-core CI runners and slower laptops alike.
    maxWorkers: process.env.CI ? 4 : "50%",
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
