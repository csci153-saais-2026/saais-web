import snapshot from "./data-api-contract.json" with { type: "json" };
import type { Environment } from "./http.ts";

const profile = "saais_api";
const proofHeader = "x-saais-data-api-key";
const proofRejected = "Use the SAAIS Data API gateway for collection reads.";
const maxQueryLength = 16_384;
const allowedPrefer = new Set([
  "count=exact",
  "count=planned",
  "count=estimated",
]);
const pagination = {
  limit: { minimum: 1, maximum: 1000, default: 20 },
  offset: { minimum: 0, maximum: 100000 },
} as const;

function hasControlCharacter(value: string) {
  for (let index = 0; index < value.length; index++) {
    if (value.charCodeAt(index) < 32) return true;
  }
  return false;
}

const resources = new Map(
  Object.entries(snapshot).map(([name, resource]) => [
    name,
    {
      projection: resource.projection,
      query: new Set(resource.query),
      select: {
        pattern: new RegExp(resource.select.pattern),
        maxLength: resource.select.maxLength,
      },
      order: {
        pattern: new RegExp(resource.order.pattern),
        maxLength: resource.order.maxLength,
      },
      filters: new Map(
        Object.entries(resource.filters).map(([filterName, rule]) => [
          filterName,
          {
            pattern: new RegExp(rule.pattern),
            maxLength: rule.maxLength,
          },
        ]),
      ),
    },
  ]),
);

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
    const resource = resourceName && resources.get(resourceName);
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
    const rawPrefer = request.headers.get("prefer");
    const prefer = rawPrefer === null ? null : rawPrefer.trim();
    if (prefer !== null && !allowedPrefer.has(prefer)) {
      return error(
        headers,
        400,
        "PT400",
        "Unsupported Data API Prefer header.",
      );
    }
    if (url.search.length > maxQueryLength) {
      return error(headers, 400, "PT400", "Data API query is too long.");
    }

    for (const name of url.searchParams.keys()) {
      if (!resource.query.has(name)) {
        return error(
          headers,
          400,
          "PT400",
          "Unsupported Data API query parameter.",
        );
      }
    }
    for (const name of ["select", "order"] as const) {
      const values = url.searchParams.getAll(name);
      const value = values[0];
      const rule = resource[name];
      if (
        values.length > 1 ||
        (value !== undefined &&
          !(name === "select" && value === "*") &&
          (value !== value.trim() ||
            value.length > rule.maxLength ||
            !rule.pattern.test(value)))
      ) {
        return error(headers, 400, "PT400", `Unsupported Data API ${name}.`);
      }
    }
    for (const [name, { minimum, maximum }] of Object.entries(pagination)) {
      const values = url.searchParams.getAll(name);
      if (values.length === 0) continue;
      const value = values[0];
      if (
        values.length !== 1 ||
        !value ||
        /\D/.test(value) ||
        Number(value) < minimum ||
        Number(value) > maximum
      ) {
        return error(
          headers,
          400,
          "PT400",
          `Data API ${name} must be an integer between ${minimum} and ${maximum}.`,
        );
      }
    }
    for (const name of new Set(url.searchParams.keys())) {
      const rule = resource.filters.get(name);
      if (!rule) continue;
      const values = url.searchParams.getAll(name);
      const value = values[0];
      if (
        values.length !== 1 ||
        value === undefined ||
        value.length > rule.maxLength ||
        hasControlCharacter(value) ||
        !rule.pattern.test(value)
      ) {
        return error(
          headers,
          400,
          "PT400",
          `Unsupported Data API ${name} filter.`,
        );
      }
    }
    if (!url.searchParams.has("limit")) {
      url.searchParams.set("limit", String(pagination.limit.default));
    }
    if (!url.searchParams.has("order")) {
      url.searchParams.set(
        "order",
        resourceName === "student_organization" ? "student_id.asc" : "id.asc",
      );
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
