# Google Apps Script Mailer Setup

`mail-delivery` sends queued invitations and notification alerts over HTTPS (`port 443`) through a Google Apps Script Web App (`MailApp.sendEmail`), avoiding outbound SMTP port restrictions (`25`/`465`/`587`) on hosted Supabase Edge Functions and requiring no OAuth2 refresh tokens.

## 1. Create the Apps Script Web App

1. Open [script.google.com](https://script.google.com) signed into the Google account that should send SAAIS emails.
2. Create a new project and paste this into `Code.gs`:

```javascript
function jsonOutput(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function matchesSecret(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function doPost(e) {
  try {
    var expectedSecret = PropertiesService.getScriptProperties().getProperty(
      "SAAIS_GOOGLE_MAILER_SECRET",
    );
    if (!expectedSecret) {
      return jsonOutput({ ok: false, retry: true, error: "not_configured" });
    }

    var payload = JSON.parse(e.postData.contents);
    if (!matchesSecret(String(payload.secret || ""), expectedSecret)) {
      return jsonOutput({ ok: false, retry: true, error: "unauthorized" });
    }

    var key = String(payload.idempotencyKey || "");
    var cache = CacheService.getScriptCache();
    if (key && cache.get(key)) {
      return jsonOutput({ ok: true, deduplicated: true });
    }

    var to = String(payload.to || "").trim();
    var subject = String(payload.subject || "");
    var text = String(payload.text || "");
    var fromName = String(payload.fromName || "SAAIS");

    if (!to) {
      return jsonOutput({ ok: false, retry: false, error: "missing_to" });
    }

    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: text,
      name: fromName,
    });

    if (key) {
      cache.put(key, "1", 21600);
    }
    return jsonOutput({ ok: true });
  } catch (err) {
    var message = String(err && err.message ? err.message : err);
    var permanent = /invalid email/i.test(message);
    return jsonOutput({ ok: false, retry: !permanent, error: message });
  }
}
```

3. In **Project Settings → Script Properties**, add `SAAIS_GOOGLE_MAILER_SECRET` with a strong random secret.
4. Click **Deploy → New deployment → Web app**:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone` (protected by `SAAIS_GOOGLE_MAILER_SECRET` in the POST JSON body)
5. Authorize the `MailApp` permission prompt when deploying and copy the resulting `/exec` Web App URL.

## 2. Configure Supabase Edge Function Secrets

Set these secrets for `mail-delivery` and redeploy:

- `SAAIS_GOOGLE_MAILER_URL` — the deployed `https://script.google.com/.../exec` URL
- `SAAIS_GOOGLE_MAILER_SECRET` — matching the Script Property value
- `SAAIS_MAIL_FROM_NAME` (optional) — sender display name (defaults to `SAAIS`)
- `SAAIS_SITE_URL` — HTTPS base URL of the SAAIS frontend
- `SAAIS_MAIL_WORKER_SECRET` — shared secret checked via the `x-saais-mail-secret` header
- `SAAIS_MAIL_ALLOWED_RECIPIENTS` (staging/test) or `SAAIS_MAIL_ENVIRONMENT=production` (unrestricted production with `SAAIS_MAIL_ALLOWED_RECIPIENTS` unset)

## 3. Schedule `mail-delivery`

Ensure an external cron or Supabase scheduler sends an HTTPS `POST` every minute to `/functions/v1/mail-delivery` with header `x-saais-mail-secret: <SAAIS_MAIL_WORKER_SECRET>`.
