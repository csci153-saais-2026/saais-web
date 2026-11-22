const invitationRoutes = new Set([
  "inviteUser",
  "previewInviteToken",
  "verifyInviteToken",
  "declineInviteToken",
  "resendAccountInvite",
  "revokeAccountInvite",
  "importStudentsBatch",
]);

export function isInvitationRoute(id: string) {
  return invitationRoutes.has(id);
}

export class InvitationError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Json = Record<string, unknown>;
type Caller = { id: string; authorization: string };
type Services = { url: string; serviceKey: string };

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function newToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

function sessionId(authorization: string) {
  try {
    const payload = authorization
      .split(".")[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const { session_id } = JSON.parse(atob(payload));
    if (typeof session_id === "string") return session_id;
  } catch {
    /* The session is checked again by the database. */
  }
  throw new InvitationError(401, "A current user session is required.");
}

function jsonObject(body: unknown): Json {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new InvitationError(400, "Provide an invitation request object.");
  }
  return body as Json;
}

export async function runInvitation(
  id: string,
  body: unknown,
  profile: string | number | boolean | undefined,
  caller: Caller | null,
  services: Services,
  fetcher: typeof fetch,
) {
  if (!services.serviceKey)
    throw new InvitationError(500, "Account provisioning is unavailable.");
  const data = jsonObject(body ?? {});
  const session = caller ? sessionId(caller.authorization) : null;
  const headers = {
    apikey: services.serviceKey,
    Authorization: `Bearer ${services.serviceKey}`,
    "Content-Type": "application/json",
    "Content-Profile": "public",
  };
  const request = (path: string, method: string, input: Json) =>
    fetcher(`${services.url}${path}`, {
      method,
      headers,
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(6000),
    });
  async function rpc(
    stage: string,
    input: Json,
    token?: string,
    redemption?: string,
  ) {
    const response = await request(
      "/rest/v1/rpc/saais_invitation_service",
      "POST",
      {
        p_operation: id,
        p_stage: stage,
        p_body: input,
        p_actor: caller?.id ?? null,
        p_session: session,
        p_profile: profile ?? null,
        p_token: token ?? null,
        p_redemption: redemption ?? null,
      },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const status = /^PT(400|401|403|404|409|429)$/.test(result.code ?? "")
        ? Number(result.code.slice(2))
        : 500;
      throw new InvitationError(
        status,
        status === 500
          ? "Account provisioning could not be completed."
          : result.message,
      );
    }
    return result as Json;
  }

  async function provision(input: Json) {
    const prepared = await rpc("prepare", input);
    if (prepared.profile_id) return prepared;
    if (
      typeof prepared.reservation_id !== "string" ||
      typeof input.email !== "string"
    ) {
      throw new InvitationError(
        500,
        "Account reservation could not be completed.",
      );
    }
    if (!prepared.auth_ready) {
      const response = await request("/auth/v1/admin/users", "POST", {
        email: input.email.trim().toLowerCase(),
        email_confirm: true,
        app_metadata: { saais_provisioning_id: prepared.reservation_id },
      });
      if (!response.ok && response.status !== 422 && response.status !== 409) {
        throw new InvitationError(
          500,
          "Auth provisioning failed. Retry the same request.",
        );
      }
      // A duplicate can also mean a concurrent or previously interrupted request
      // finished the Auth step. The database only attaches the reserved identity.
    }
    return rpc("finish", input, newToken());
  }

  if (id === "inviteUser") return provision(data);
  if (id === "resendAccountInvite") return rpc("start", data, newToken());
  if (id === "revokeAccountInvite") return rpc("start", data);
  if (id === "importStudentsBatch") {
    await rpc("validate", data);
    const rows = data.rows as Json[];
    const results: Json[] = [];
    const seenRows = new Set<unknown>();
    const seenEmails = new Set<string>();
    const seenNumbers = new Set<unknown>();
    const eligible = rows.map((row) => {
      const email = String(row.email).trim().toLowerCase();
      const duplicate =
        seenRows.has(row.row_number) ||
        seenEmails.has(email) ||
        seenNumbers.has(row.student_number);
      seenRows.add(row.row_number);
      seenEmails.add(email);
      seenNumbers.add(row.student_number);
      return !duplicate;
    });
    let next = 0;
    const workers = Array.from(
      { length: Math.min(8, rows.length) },
      async () => {
        while (next < rows.length) {
          const index = next++;
          const row = rows[index];
          const result = {
            row_number: row.row_number,
            email: row.email,
            student_number: row.student_number,
          };
          try {
            if (!eligible[index])
              throw new InvitationError(
                409,
                "Duplicate row, email, or student number in this batch.",
              );
            if (data.mode === "preview") await rpc("preview", row);
            else await provision(row);
            results[index] = {
              ...result,
              outcome: data.mode === "preview" ? "valid" : "imported",
              message: null,
            };
          } catch (error) {
            results[index] = {
              ...result,
              outcome: "error",
              message:
                error instanceof InvitationError
                  ? error.message
                  : "Provisioning was interrupted. Retry the same request.",
            };
          }
        }
      },
    );
    await Promise.all(workers);
    return {
      mode: data.mode,
      valid_count: results.filter(
        (row) => row.outcome === "valid" || row.outcome === "imported",
      ).length,
      warning_count: 0,
      error_count: results.filter((row) => row.outcome === "error").length,
      imported_count: results.filter((row) => row.outcome === "imported")
        .length,
      results,
    };
  }

  if (typeof data.token !== "string" || !/^[0-9a-f]{64}$/.test(data.token)) {
    throw new InvitationError(404, "Invitation not found.");
  }
  const hash = bytesToHex(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(data.token),
      ),
    ),
  );
  const safeBody: Json = { ...data, token: hash };
  if (id !== "verifyInviteToken") return rpc("start", safeBody, hash);

  const password = data.password;
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    throw new InvitationError(
      400,
      "Use 12 to 128 characters with uppercase, lowercase, and a digit.",
    );
  }
  delete safeBody.password;
  const redemption = crypto.randomUUID();
  const pending = await rpc("start", safeBody, hash, redemption);
  const changed = await request(
    `/auth/v1/admin/users/${pending.profile_id}`,
    "PUT",
    { password },
  );
  if (!changed.ok) {
    if (changed.status < 500)
      await rpc("cancelRedemption", {}, hash, redemption);
    throw new InvitationError(
      500,
      "Password setup could not be completed. Retry shortly.",
    );
  }
  return rpc("finishRedemption", {}, hash, redemption);
}
