import type { Database } from "./database.types.ts";

type MailEnvironment = {
  url: string;
  serviceKey: string;
  secret: string;
  transportKey: string;
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
    transportKey: get("SAAIS_RESEND_API_KEY") || "",
    sender: get("SAAIS_MAIL_FROM") || "",
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
      !env.transportKey ||
      !env.sender ||
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
                throw new Error("Claimed recipient is not allowed.");
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
                  : mail.message;
              try {
                const delivery = await fetcher(
                  "https://api.resend.com/emails",
                  {
                    method: "POST",
                    redirect: "error",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${env.transportKey}`,
                      "Idempotency-Key": `saais/${mail.kind}/${mail.id}`,
                    },
                    body: JSON.stringify({
                      from: env.sender,
                      to: [mail.email],
                      subject: mail.subject,
                      text: message,
                    }),
                    signal: AbortSignal.timeout(5000),
                  },
                );
                if (delivery.ok) outcome = "sent";
                else if (
                  delivery.status < 500 &&
                  ![401, 403, 408, 409, 429].includes(delivery.status)
                )
                  outcome = "failed";
                await delivery.body?.cancel();
              } catch {
                /* Retry with the same provider idempotency key. */
              }
              const result = await rpc("saais_finish_email", {
                p_id: mail.id,
                p_kind: mail.kind,
                p_lease: mail.lease,
                p_outcome: outcome,
              });
              if (!result.ok) throw new Error("Could not record delivery.");
              return outcome;
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
