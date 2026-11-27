type PhotoCleanupEnvironment = {
  url: string;
  serviceKey: string;
  secret: string;
};

const studentPhotoPathPattern =
  /^students\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^/]+$/i;

function matchesSecret(supplied: string, secret: string) {
  if (!secret || supplied.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++)
    diff |= supplied.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

export function readPhotoCleanupEnvironment(
  get: (name: string) => string | undefined,
): PhotoCleanupEnvironment {
  return {
    url: (get("SUPABASE_URL") || "").replace(/\/$/, ""),
    serviceKey: get("SUPABASE_SERVICE_ROLE_KEY") || "",
    secret:
      get("SAAIS_MAINTENANCE_SECRET") || get("SAAIS_MAIL_WORKER_SECRET") || "",
  };
}

// Remove queued Storage objects after a photo write commits. Failed removals
// stay queued for the next per-student or scheduled reconciliation.
export async function reconcileDeletedPhotos(
  env: { url: string; serviceKey?: string },
  fetcher: typeof fetch,
  student: string,
): Promise<void> {
  if (!env.serviceKey) return;
  const serviceHeaders = {
    apikey: env.serviceKey,
    Authorization: `Bearer ${env.serviceKey}`,
    "Content-Type": "application/json",
    "Content-Profile": "public",
  };
  try {
    const listed = await fetcher(
      env.url + "/rest/v1/rpc/saais_reconcile_deleted_photos",
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({ p_student: student }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!listed.ok) return;
    const raw = (await listed.json()) as unknown;
    if (!Array.isArray(raw)) return;
    const prefix = `students/${student.toLowerCase()}/`;
    const pending = raw.filter(
      (item): item is string =>
        typeof item === "string" && item.toLowerCase().startsWith(prefix),
    );
    if (pending.length === 0) return;
    const removed = await fetcher(
      env.url + "/storage/v1/object/student-photos",
      {
        method: "DELETE",
        headers: {
          apikey: env.serviceKey,
          Authorization: `Bearer ${env.serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefixes: pending }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!removed.ok) return;
    await fetcher(env.url + "/rest/v1/rpc/saais_reconcile_deleted_photos", {
      method: "POST",
      headers: serviceHeaders,
      body: JSON.stringify({ p_student: student, p_removed: pending }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Keep queued paths in the database for retry on a later reconciliation.
  }
}

// Sweep queued Storage deletions across all students so transient Storage
// failures clear on the next scheduled run without another user photo action.
export async function reconcilePendingDeletedPhotos(
  env: { url: string; serviceKey?: string },
  fetcher: typeof fetch,
  limit = 100,
): Promise<{ attempted: number; removed: number; failed: boolean }> {
  if (!env.url || !env.serviceKey) {
    return { attempted: 0, removed: 0, failed: true };
  }
  const serviceHeaders = {
    apikey: env.serviceKey,
    Authorization: `Bearer ${env.serviceKey}`,
    "Content-Type": "application/json",
    "Content-Profile": "public",
  };
  try {
    const listed = await fetcher(
      env.url + "/rest/v1/rpc/saais_reconcile_pending_deleted_photos",
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({ p_limit: limit }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!listed.ok) return { attempted: 0, removed: 0, failed: true };
    const raw = (await listed.json()) as unknown;
    if (!Array.isArray(raw)) return { attempted: 0, removed: 0, failed: true };
    const pending = raw.filter(
      (item): item is string =>
        typeof item === "string" && studentPhotoPathPattern.test(item),
    );
    if (pending.length === 0) {
      return { attempted: 0, removed: 0, failed: false };
    }
    const removed = await fetcher(
      env.url + "/storage/v1/object/student-photos",
      {
        method: "DELETE",
        headers: {
          apikey: env.serviceKey,
          Authorization: `Bearer ${env.serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefixes: pending }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!removed.ok) {
      return { attempted: pending.length, removed: 0, failed: true };
    }
    const ack = await fetcher(
      env.url + "/rest/v1/rpc/saais_reconcile_pending_deleted_photos",
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({ p_limit: 0, p_removed: pending }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!ack.ok) {
      return { attempted: pending.length, removed: 0, failed: true };
    }
    return {
      attempted: pending.length,
      removed: pending.length,
      failed: false,
    };
  } catch {
    return { attempted: 0, removed: 0, failed: true };
  }
}

export function createPhotoCleanupHandler(
  env: PhotoCleanupEnvironment,
  fetcher: typeof fetch = fetch,
) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    if (
      !matchesSecret(
        request.headers.get("x-saais-maintenance-secret") || "",
        env.secret,
      )
    ) {
      return new Response(null, { status: 401 });
    }
    if (!env.url || !env.serviceKey) {
      return new Response(null, { status: 503 });
    }
    const result = await reconcilePendingDeletedPhotos(env, fetcher);
    return Response.json(
      { attempted: result.attempted, removed: result.removed },
      { status: result.failed ? 503 : 200 },
    );
  };
}
