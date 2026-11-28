import { setTimeout as delay } from "node:timers/promises";

const revision = process.env.SAAIS_STAGING_EXPECTED_SHA;
const origin = new URL(process.env.SAAIS_STAGING_URL ?? "");
if (
  !/^[a-f0-9]{40}$/.test(revision ?? "") ||
  origin.protocol !== "https:" ||
  origin.href !== `${origin.origin}/`
) {
  throw new Error(
    "Set the approved staging HTTPS origin and expected commit SHA.",
  );
}

for (let attempt = 0; attempt < 60; attempt++) {
  const current = await fetch(origin, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  })
    .then(async (response) => (response.ok ? response.text() : ""))
    .catch(() => "");
  if (current.includes(`<meta name="saais-revision" content="${revision}">`)) {
    console.log("Staging is serving the expected commit.");
    process.exit(0);
  }
  if (attempt < 59) await delay(10_000);
}
throw new Error(
  "Staging did not serve the expected commit within the deployment wait.",
);
