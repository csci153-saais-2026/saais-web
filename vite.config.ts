import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import * as openApi from "./api/openapi-bundle.js";

// Local development has no /api/docs function, so bundle the contract here.
function bundledOpenApi(): Plugin {
  const query = "?bundled";
  return {
    name: "saais-bundled-openapi",
    apply: "serve",
    enforce: "pre",
    async load(id) {
      if (!id.endsWith(`contract/openapi.yaml${query}`)) return;
      openApi.clearBundledOpenApiCache();
      const yaml = await openApi.loadBundledOpenApiYaml(
        id.slice(0, -query.length),
      );
      return `export default ${JSON.stringify(yaml)};`;
    },
  };
}

// https://vite.dev/config/
function deployedRevision(): Plugin {
  return {
    name: "saais-deployed-revision",
    apply: "build",
    transformIndexHtml() {
      const sha = process.env.VITE_VERCEL_GIT_COMMIT_SHA;
      if (!sha || !/^[a-f0-9]{40}$/.test(sha)) return;
      return [
        {
          tag: "meta",
          attrs: { name: "saais-revision", content: sha },
          injectTo: "head",
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [bundledOpenApi(), deployedRevision(), react(), tailwindcss()],
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
