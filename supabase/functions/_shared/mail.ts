import type { Database } from "./database.types.ts";

type MailEnvironment = {
  url: string;
  serviceKey: string;
  secret: string;
  webhookUrl: string;
  webhookSecret: string;
  senderName: string;
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

function parseSenderName(
  explicitName: string | undefined,
  mailFrom: string | undefined,
) {
  const cleanExplicit = (explicitName || "").trim();
  if (cleanExplicit) return cleanExplicit;
  const rawFrom = (mailFrom || "").trim();
  if (!rawFrom) return "SAAIS";
  const bracketed = rawFrom.match(/^(.+?)\s*<[^<>@\s]+@[^<>@\s]+>$/);
  if (bracketed) {
    return bracketed[1].replace(/^["']|["']$/g, "").trim() || "SAAIS";
  }
  if (/^[^<>@\s]+@[^<>@\s]+$/.test(rawFrom)) return "SAAIS";
  return rawFrom;
}

function isValidAppsScriptUrl(raw: string) {
  const url = URL.parse(raw);
  return Boolean(
    url &&
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.hostname === "script.google.com" &&
      /^\/(?:a\/macros\/[^/]+\/|macros\/)s\/[A-Za-z0-9_-]+\/exec$/.test(
        url.pathname,
      ),
  );
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
    webhookUrl: (get("SAAIS_GOOGLE_MAILER_URL") || "").trim(),
    webhookSecret: (get("SAAIS_GOOGLE_MAILER_SECRET") || "").trim(),
    senderName: parseSenderName(
      get("SAAIS_MAIL_FROM_NAME"),
      get("SAAIS_MAIL_FROM"),
    ),
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
      !isValidAppsScriptUrl(env.webhookUrl) ||
      !env.webhookSecret ||
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
      const outcomes: PromiseSettledResult<string>[] = [];
      for (let offset = 0; offset < messages.length; offset += 4) {
        outcomes.push(
          ...(await Promise.allSettled(
            messages.slice(offset, offset + 4).map(async (mail) => {
              if (
                env.recipients &&
                !env.recipients.has(mail.email.trim().toLowerCase())
              ) {
                return finishMail(mail, "failed");
              }
              let outcome = "retry";
              // A trailing slash keeps the site's base path in the link.
              const base = new URL(site);
              base.pathname = base.pathname.replace(/\/*$/, "/");
              const link = new URL("invite", base);
              link.hash = `token=${mail.token ?? ""}`;
              const message =
                mail.kind === "invitation"
                  ? `Set up your SAAIS account using this invitation link: ${link.href}`
                  : (mail.message ?? "");
              try {
                // Google Apps Script responds to POST with a 302 redirect to
                // script.googleusercontent.com carrying the doPost JSON output.
                const delivery = await fetcher(env.webhookUrl, {
                  method: "POST",
                  redirect: "follow",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    secret: env.webhookSecret,
                    to: mail.email,
                    subject: mail.subject,
                    text: message,
                    fromName: env.senderName,
                    idempotencyKey: `saais/${mail.kind}/${mail.id}`,
                  }),
                  signal: AbortSignal.timeout(10000),
                });
                if (delivery.ok) {
                  const payload = (await delivery.json().catch(() => null)) as {
                    ok?: unknown;
                    retry?: unknown;
                  } | null;
                  if (payload?.ok === true) {
                    outcome = "sent";
                  } else if (payload?.ok === false && payload.retry === false) {
                    outcome = "failed";
                  }
                } else {
                  await delivery.body?.cancel();
                  if (
                    delivery.status < 500 &&
                    ![401, 403, 408, 409, 429].includes(delivery.status)
                  ) {
                    outcome = "failed";
                  }
                }
              } catch {
                /* Retry with the same idempotencyKey. */
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
