import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadBundledOpenApiYaml } from "./openapi-bundle.js";

const documents = {
  openapi: {
    path: "contract/openapi.yaml",
    type: "application/yaml; charset=utf-8",
    bundleOpenApi: true,
  },
  guide: {
    path: "docs/api-documentation.md",
    type: "text/markdown; charset=utf-8",
    bundleOpenApi: false,
  },
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).end();
  const name = req.query?.document;
  const document =
    typeof name === "string" && Object.hasOwn(documents, name)
      ? documents[name]
      : null;
  if (!document) return res.status(404).end();
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || "");
  if (!match) return res.status(401).end();
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(503).end();
  // Which step is running, so a 503 can say what failed.
  let step = "sign-in";
  const unavailable = (reason) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(503).send(reason);
  };
  try {
    const client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { headers: { Authorization: `Bearer ${match[1]}` } },
    });
    const { data, error } = await client.auth.getUser(match[1]);
    if (error || !data.user) return res.status(401).end();

    step = "profile";
    const profileUrl = new URL("/functions/v1/data-api/profile", url);
    profileUrl.searchParams.set("select", "id,status");
    profileUrl.searchParams.set("id", `eq.${data.user.id}`);
    profileUrl.searchParams.set("status", "eq.active");
    profileUrl.searchParams.set("limit", "1");

    const profileResponse = await fetch(profileUrl, {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${match[1]}`,
        "Accept-Profile": "saais_api",
      },
    });
    if (profileResponse.status === 401) return res.status(401).end();
    if (profileResponse.status >= 500) {
      return unavailable(
        `profile check failed (HTTP ${profileResponse.status})`,
      );
    }
    if (!profileResponse.ok) return res.status(403).end();

    const profiles = await profileResponse.json();
    const profile = Array.isArray(profiles) ? profiles[0] : profiles;
    if (
      !profile ||
      profile.id !== data.user.id ||
      profile.status !== "active"
    ) {
      return res.status(403).end();
    }

    step = "document";
    const filePath = resolve(process.cwd(), document.path);
    const content = document.bundleOpenApi
      ? await loadBundledOpenApiYaml(filePath)
      : await readFile(filePath, "utf8");
    res.setHeader("Content-Type", document.type);
    return res.status(200).send(content);
  } catch (error) {
    if (step === "profile") return unavailable("profile check failed");
    // Temporary: only an active user reaches this step. Remove once the
    // deployed failure is fixed.
    if (step === "document") {
      return unavailable(
        `could not build the document: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return res.status(503).end();
  }
}
