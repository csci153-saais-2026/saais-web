export type AuthHookEnvironment = {
  url: string;
  serviceKey: string;
  hookSecret: string;
};

const maxSkewSeconds = 300;
const maxHookBodyBytes = 64 * 1024;

export function readAuthHookEnvironment(
  get: (name: string) => string | undefined,
): AuthHookEnvironment {
  return {
    url: (get("SUPABASE_URL") || "").replace(/\/$/, ""),
    serviceKey: get("SUPABASE_SERVICE_ROLE_KEY") || "",
    hookSecret: get("SAAIS_AUTH_HOOK_SECRET") || "",
  };
}

function decodeBase64(input: string): Uint8Array | null {
  try {
    const binary = atob(input);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signStandardWebhook(
  secret: string,
  webhookId: string,
  timestampSeconds: number,
  rawBody: string,
): Promise<string> {
  const keyMaterial = secret.replace(/^v1,/, "").replace(/^whsec_/, "");
  const keyBytes = decodeBase64(keyMaterial);
  if (!keyBytes || keyBytes.length === 0) {
    throw new Error("Invalid auth hook secret.");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const message = new TextEncoder().encode(
    `${webhookId}.${timestampSeconds}.${rawBody}`,
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, message));
  return `v1,${encodeBase64(mac)}`;
}

async function verifyWebhookSignature(
  request: Request,
  rawBody: string,
  secret: string,
  nowSeconds: number,
): Promise<string | null> {
  const webhookId = request.headers.get("webhook-id") || "";
  const timestampHeader = request.headers.get("webhook-timestamp") || "";
  const signatureHeader = request.headers.get("webhook-signature") || "";
  if (!webhookId || !/^\d+$/.test(timestampHeader) || !signatureHeader) {
    return null;
  }
  const timestamp = Number(timestampHeader);
  if (
    !Number.isSafeInteger(timestamp) ||
    Math.abs(nowSeconds - timestamp) > maxSkewSeconds
  ) {
    return null;
  }
  let expected: string;
  try {
    expected = await signStandardWebhook(secret, webhookId, timestamp, rawBody);
  } catch {
    return null;
  }
  const expectedBytes = new TextEncoder().encode(expected);
  const candidates = signatureHeader
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  for (const candidate of candidates) {
    if (constantTimeEqual(new TextEncoder().encode(candidate), expectedBytes)) {
      return webhookId;
    }
  }
  return null;
}

async function readBoundedText(
  request: Request,
  limitBytes: number,
): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limitBytes) return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limitBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function createAuthHookHandler(
  env: AuthHookEnvironment,
  fetcher: typeof fetch = fetch,
  now: () => number = () => Math.floor(Date.now() / 1000),
) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    if (!env.url || !env.serviceKey || !env.hookSecret) {
      return Response.json(
        { error: { http_code: 503, message: "Auth hook is not configured." } },
        { status: 503 },
      );
    }
    const rawBody = await readBoundedText(request, maxHookBodyBytes);
    if (rawBody === null) {
      return Response.json(
        { error: { http_code: 400, message: "Auth hook payload too large." } },
        { status: 400 },
      );
    }
    const webhookId = await verifyWebhookSignature(
      request,
      rawBody,
      env.hookSecret,
      now(),
    );
    if (!webhookId) {
      return Response.json(
        { error: { http_code: 401, message: "Invalid webhook signature." } },
        { status: 401 },
      );
    }
    let payload: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid payload");
      }
      payload = parsed as Record<string, unknown>;
    } catch {
      return Response.json(
        { error: { http_code: 400, message: "Invalid JSON auth hook event." } },
        { status: 400 },
      );
    }

    const pathname = new URL(request.url).pathname;
    const isAccessToken =
      pathname.endsWith("/custom-access-token") ||
      (!pathname.endsWith("/before-user-created") &&
        typeof payload.user_id === "string" &&
        typeof payload.claims === "object" &&
        payload.claims !== null);
    const rpcName = isAccessToken
      ? "saais_evaluate_access_token"
      : "saais_evaluate_before_user_created";

    try {
      const response = await fetcher(`${env.url}/rest/v1/rpc/${rpcName}`, {
        method: "POST",
        headers: {
          apikey: env.serviceKey,
          Authorization: `Bearer ${env.serviceKey}`,
          "Content-Type": "application/json",
          "Content-Profile": "public",
        },
        body: JSON.stringify({ p_event: payload, p_webhook_id: webhookId }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return Response.json(
          {
            error: {
              http_code: 503,
              message: "Authentication eligibility check is unavailable.",
            },
          },
          { status: 503 },
        );
      }
      const decision = (await response.json()) as {
        allowed?: boolean;
        http_code?: number;
        message?: string;
      };
      if (decision.allowed === true) {
        return Response.json(isAccessToken ? { claims: payload.claims } : {}, {
          status: 200,
        });
      }
      const status = decision.http_code === 403 ? 403 : 403;
      return Response.json(
        {
          error: {
            http_code: status,
            message:
              typeof decision.message === "string" && decision.message.trim()
                ? decision.message
                : "This institutional account is not pre-registered. Contact your department administrator.",
          },
        },
        { status },
      );
    } catch {
      return Response.json(
        {
          error: {
            http_code: 503,
            message: "Authentication eligibility check is unavailable.",
          },
        },
        { status: 503 },
      );
    }
  };
}
