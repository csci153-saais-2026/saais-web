import type { Database } from "./database.types.ts";

type MailEnvironment = {
  url: string;
  serviceKey: string;
  secret: string;
  gmailClientId: string;
  gmailClientSecret: string;
  gmailRefreshToken: string;
  sender: string;
  siteUrl: string;
  recipients: Set<string> | null;
};
type ClaimedMail =
  Database["public"]["Functions"]["saais_claim_email"]["Returns"][number];
type Mail = Omit<ClaimedMail, "kind" | "message" | "token"> & {
  kind: "invitation" | "notification";
  message: string | null;
  token: string | null;
};

type TokenPayload = {
  access_token?: unknown;
};

const encoder = new TextEncoder();

function cleanHeaderValue(value: string) {
  return value.replace(/[\r\n\0]+/g, " ").trim();
}

function extractEmailAddress(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /[\r\n\0]/.test(trimmed)) return "";
  const bracketed = trimmed.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  if (bracketed) return bracketed[1];
  return /^[^<>@\s]+@[^<>@\s]+$/.test(trimmed) ? trimmed : "";
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function toBase64Url(bytes: Uint8Array) {
  return toBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeHeaderSubject(subject: string) {
  const clean = cleanHeaderValue(subject);
  if (/^[\x20-\x7e]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${toBase64(encoder.encode(clean))}?=`;
}

function encodeFromHeader(sender: string) {
  const clean = cleanHeaderValue(sender);
  if (!clean) return "";
  const bracketed = clean.match(/^(.+?)\s*<([^<>@\s]+@[^<>@\s]+)>$/);
  if (!bracketed) return clean;
  const displayName = bracketed[1].replace(/^["']|["']$/g, "").trim();
  const address = bracketed[2];
  if (!displayName) return address;
  const encodedName = /^[\x20-\x7e]*$/.test(displayName)
    ? `"${displayName.replace(/["\\]/g, "\\$&")}"`
    : `=?UTF-8?B?${toBase64(encoder.encode(displayName))}?=`;
  return `${encodedName} <${address}>`;
}

function buildRawMimeMessage(options: {
  from: string;
  to: string;
  subject: string;
  text: string;
}) {
  const headers: string[] = [];
  const fromHeader = encodeFromHeader(options.from);
  if (fromHeader) headers.push(`From: ${fromHeader}`);
  headers.push(
    `To: ${options.to}`,
    `Subject: ${encodeHeaderSubject(options.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  );
  const bodyBase64 = toBase64(encoder.encode(options.text));
  const mime = `${headers.join("\r\n")}\r\n\r\n${bodyBase64}`;
  return toBase64Url(encoder.encode(mime));
}

export function readMailEnvironment(
  get: (name: string) => string | undefined,
): MailEnvironment {
  const allowedRecipients = get("SAAIS_MAIL_ALLOWED_RECIPIENTS");
  const unrestricted =
    get("SAAIS_MAIL_ENVIRONMENT") === "production" &&
    allowedRecipients === undefined;
  return {
    url: (get("SUPABASE_URL") || "").replace(/\/$/, ""),
    serviceKey: get("SUPABASE_SERVICE_ROLE_KEY") || "",
    secret: get("SAAIS_MAIL_WORKER_SECRET") || "",
    gmailClientId: (get("SAAIS_GMAIL_CLIENT_ID") || "").trim(),
    gmailClientSecret: (get("SAAIS_GMAIL_CLIENT_SECRET") || "").trim(),
    gmailRefreshToken: (get("SAAIS_GMAIL_REFRESH_TOKEN") || "").trim(),
    sender: (get("SAAIS_MAIL_FROM") || "").trim(),
    siteUrl: get("SAAIS_SITE_URL") || "",
    recipients: unrestricted
      ? null
      : new Set(
          (allowedRecipients ?? "")
            .split(",")
            .map((address) => address.trim().toLowerCase())
            .filter(Boolean),
        ),
  };
}

function matchesSecret(supplied: string, secret: string) {
  if (!secret || supplied.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++)
    diff |= supplied.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

export function createMailHandler(
  env: MailEnvironment,
  fetcher: typeof fetch = fetch,
  maintenance?: { reconcilePhotos?: () => Promise<unknown> },
) {
  const site = URL.parse(env.siteUrl);
  async function rpc(name: string, body: object) {
    return fetcher(`${env.url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Profile": "public",
        apikey: env.serviceKey,
        Authorization: `Bearer ${env.serviceKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
  }

  async function finishMail(mail: Mail, outcome: string) {
    const result = await rpc("saais_finish_email", {
      p_id: mail.id,
      p_kind: mail.kind,
      p_lease: mail.lease,
      p_outcome: outcome,
    });
    if (!result.ok) throw new Error("Could not record delivery.");
    return outcome;
  }

  async function refreshAccessToken() {
    const tokenResponse = await fetcher("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.gmailClientId,
        client_secret: env.gmailClientSecret,
        refresh_token: env.gmailRefreshToken,
        grant_type: "refresh_token",
      }).toString(),
      signal: AbortSignal.timeout(5000),
    });
    if (!tokenResponse.ok) {
      await tokenResponse.body?.cancel();
      return null;
    }
    const parsed = await tokenResponse.json().catch(() => null);
    const data = parsed as TokenPayload | null;
    return typeof data?.access_token === "string" && data.access_token
      ? data.access_token
      : null;
  }

  return async (request: Request) => {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    if (
      !matchesSecret(
        request.headers.get("x-saais-mail-secret") || "",
        env.secret,
      )
    ) {
      return new Response(null, { status: 401 });
    }
    if (
      !site ||
      site.protocol !== "https:" ||
      site.username ||
      site.password ||
      !env.url ||
      !env.serviceKey ||
      !env.gmailClientId ||
      !env.gmailClientSecret ||
      !env.gmailRefreshToken ||
      (env.sender && !extractEmailAddress(env.sender)) ||
      env.recipients?.size === 0
    ) {
      return new Response(null, { status: 503 });
    }
    try {
      const response = await rpc("saais_claim_email", {
        p_allowed_recipients: env.recipients ? [...env.recipients] : null,
      });
      if (!response.ok) return new Response(null, { status: 503 });
      const messages = (await response.json()) as Mail[];
      let accessToken: string | null = null;
      let tokenChecked = false;
      const hasEligibleRecipient = messages.some((mail) => {
        const recipient = extractEmailAddress(mail.email);
        if (!recipient) return false;
        return !env.recipients || env.recipients.has(recipient.toLowerCase());
      });
      if (hasEligibleRecipient) {
        accessToken = await refreshAccessToken().catch(() => null);
        tokenChecked = true;
      }

      const outcomes: PromiseSettledResult<string>[] = [];
      for (let offset = 0; offset < messages.length; offset += 4) {
        outcomes.push(
          ...(await Promise.allSettled(
            messages.slice(offset, offset + 4).map(async (mail) => {
              const recipient = extractEmailAddress(mail.email);
              if (
                !recipient ||
                (env.recipients && !env.recipients.has(recipient.toLowerCase()))
              ) {
                return finishMail(mail, "failed");
              }
              if (tokenChecked && !accessToken) {
                return finishMail(mail, "retry");
              }
              let outcome = "retry";
              // A trailing slash keeps the site's base path in the link.
              const base = new URL(site);
              base.pathname = base.pathname.replace(/\/*$/, "/");
              const link = new URL("invite", base);
              link.hash = `token=${mail.token ?? ""}`;
              const bodyText = mail.message ?? "";
              const message =
                mail.kind === "invitation"
                  ? `Set up your SAAIS account using this invitation link: ${link.href}`
                  : bodyText;
              try {
                const raw = buildRawMimeMessage({
                  from: env.sender,
                  to: recipient,
                  subject: mail.subject,
                  text: message,
                });
                const delivery = await fetcher(
                  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                  {
                    method: "POST",
                    redirect: "error",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ raw }),
                    signal: AbortSignal.timeout(5000),
                  },
                );
                if (delivery.ok) outcome = "sent";
                else if (
                  delivery.status < 500 &&
                  ![401, 403, 408, 409, 429].includes(delivery.status)
                ) {
                  outcome = "failed";
                }
                await delivery.body?.cancel();
              } catch {
                /* Keep queued for exponential backoff retry. */
              }
              return finishMail(mail, outcome);
            }),
          )),
        );
      }
      const count = (value: string) =>
        outcomes.filter(
          (item) => item.status === "fulfilled" && item.value === value,
        ).length;
      const interrupted = outcomes.filter(
        (item) => item.status === "rejected",
      ).length;
      if (maintenance?.reconcilePhotos) {
        await maintenance.reconcilePhotos().catch(() => {});
      }
      return Response.json(
        {
          sent: count("sent"),
          retry: count("retry"),
          failed: count("failed"),
          interrupted,
        },
        { status: interrupted ? 503 : 200 },
      );
    } catch {
      return new Response(null, { status: 503 });
    }
  };
}
