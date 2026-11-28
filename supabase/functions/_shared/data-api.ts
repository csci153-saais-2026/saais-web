import {
  defaultDataApiLimit,
  getDataApiResource,
  validateDataApiQuery,
} from "./data-api-query.ts";
import type { Environment } from "./http.ts";

const profile = "saais_api";
const proofHeader = "x-saais-data-api-key";
const proofRejected = "Use the SAAIS Data API gateway for collection reads.";

type GatewayEnvironment = Pick<
  Environment,
  "url" | "publicKey" | "publicKeys" | "serviceKey" | "origins"
>;

function error(
  headers: Headers,
  status: number,
  code: string,
  message: string,
) {
  return Response.json(
    { code, message, details: null, hint: null },
    { headers, status },
  );
}

export function createDataApiHandler(
  env: GatewayEnvironment,
  fetcher: typeof fetch = fetch,
) {
  let gatewayKey: Promise<string> | undefined;

  async function loadGatewayKey() {
    const response = await fetcher(
      `${env.url}/rest/v1/rpc/saais_read_data_api_gateway_key`,
      {
        method: "POST",
        headers: {
          apikey: env.serviceKey!,
          Authorization: `Bearer ${env.serviceKey}`,
          "Content-Profile": "public",
          "Content-Type": "application/json",
        },
        body: "{}",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) throw new Error("Gateway key unavailable");
    const value: unknown = await response.json();
    if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
      throw new Error("Gateway key unavailable");
    }
    return value;
  }

  return async (request: Request): Promise<Response> => {
    const headers = new Headers({
      "Cache-Control": "no-store",
      Vary: "Origin",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "authorization, apikey, accept-profile, prefer, x-client-info",
      "Access-Control-Expose-Headers":
        "Content-Range, Range-Unit, Preference-Applied, Retry-After",
    });
    const origin = request.headers.get("origin");
    if (origin && !env.origins.includes(origin)) {
      return error(headers, 403, "42501", "Origin is not allowed.");
    }
    if (origin) headers.set("Access-Control-Allow-Origin", origin);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers, status: 204 });
    }

    const url = new URL(request.url);
    const resourceName = /^\/(?:functions\/v1\/)?data-api\/([a-z_]+)$/.exec(
      url.pathname,
    )?.[1];
    const resource = resourceName && getDataApiResource(resourceName);
    if (!resource || request.method !== "GET") {
      return error(headers, 404, "NOT_FOUND", "Data API route not found.");
    }
    if (!env.url || !env.serviceKey || !env.publicKey) {
      return error(headers, 503, "XX000", "Data API gateway is unavailable.");
    }
    const key = request.headers.get("apikey") ?? "";
    const authorization = request.headers.get("authorization") ?? "";
    if (
      !(env.publicKeys ?? [env.publicKey]).includes(key) ||
      !/^Bearer \S+$/i.test(authorization)
    ) {
      return error(
        headers,
        401,
        "PGRST301",
        "An authenticated session is required.",
      );
    }
    if (request.headers.get("accept-profile") !== profile) {
      return error(headers, 400, "PT400", "Use Accept-Profile: saais_api.");
    }
    const prefer = request.headers.get("prefer")?.trim() ?? null;
    const queryError = validateDataApiQuery(resource, url, prefer);
    if (queryError !== null) return error(headers, 400, "PT400", queryError);

    if (!url.searchParams.has("limit")) {
      url.searchParams.set("limit", String(defaultDataApiLimit));
    }
    if (!url.searchParams.has("order")) {
      url.searchParams.set("order", resource.defaultOrder);
    }
    const selection = url.searchParams.get("select");
    if (selection === null || selection === "*") {
      url.searchParams.set("select", resource.projection);
    }

    try {
      const getGatewayKey = () => {
        gatewayKey ??= loadGatewayKey().catch((failure) => {
          gatewayKey = undefined;
          throw failure;
        });
        return gatewayKey;
      };
      const usedKey = getGatewayKey();
      const upstreamHeaders = new Headers({
        apikey: key,
        Authorization: authorization,
        Accept: "application/json",
        "Accept-Profile": profile,
        [proofHeader]: await usedKey,
      });
      if (prefer !== null) upstreamHeaders.set("Prefer", prefer);
      const forward = () =>
        fetcher(
          `${env.url}/rest/v1/${resourceName}?${url.searchParams.toString()}`,
          {
            headers: upstreamHeaders,
            redirect: "error",
            signal: AbortSignal.timeout(15000),
          },
        );
      let upstream = await forward();
      let failure = upstream.ok ? null : await readUpstreamError(upstream);
      if (
        upstream.status === 403 &&
        failure?.code === "PT403" &&
        failure.message === proofRejected
      ) {
        if (gatewayKey === usedKey) gatewayKey = undefined;
        upstreamHeaders.set(proofHeader, await getGatewayKey());
        upstream = await forward();
        failure = upstream.ok ? null : await readUpstreamError(upstream);
      }
      if (!upstream.ok) {
        if (upstream.status === 401) {
          return error(
            headers,
            401,
            "PGRST301",
            "The user session could not be verified.",
          );
        }
        if (upstream.status === 429) {
          const retryAfter = upstream.headers.get("Retry-After");
          if (retryAfter !== null && /^\d+$/.test(retryAfter)) {
            headers.set("Retry-After", retryAfter);
          }
        }
        const status = [400, 403, 429].includes(upstream.status)
          ? upstream.status
          : 500;
        const controlled =
          failure?.code === `PT${status}` &&
          status !== 500 &&
          failure.message !== proofRejected;
        return error(
          headers,
          status,
          status === 500 ? "XX000" : `PT${status}`,
          controlled && typeof failure?.message === "string" && failure.message
            ? failure.message.slice(0, 1000)
            : "The collection read could not be completed.",
        );
      }
      for (const name of [
        "Content-Type",
        "Content-Range",
        "Range-Unit",
        "Preference-Applied",
        "Retry-After",
      ]) {
        const value = upstream.headers.get(name);
        if (value !== null) headers.set(name, value);
      }
      return new Response(upstream.body, { headers, status: upstream.status });
    } catch {
      return error(headers, 503, "XX000", "Data API gateway is unavailable.");
    }
  };
}

async function readUpstreamError(
  response: Response,
): Promise<{ code?: unknown; message?: unknown } | null> {
  const body: unknown = await response.json().catch(() => null);
  return body !== null && typeof body === "object" ? body : null;
}
