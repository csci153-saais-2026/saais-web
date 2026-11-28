# Gmail REST API Mailer Setup

`mail-delivery` sends queued invitations and notification alerts directly through the **Gmail REST API** (`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`) using OAuth2 over HTTPS (`port 443`). This avoids hosted Supabase Edge Function outbound SMTP port blocks (`25`/`465`/`587`) and Google Apps Script cold-start/redirect delays.

## 1. Create Google OAuth2 Credentials

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select or create a project.
2. Go to **APIs & Services → Library**, search for **Gmail API**, and click **Enable**.
3. Go to **APIs & Services → OAuth consent screen**:
   - Choose **External** (or **Internal** if using Google Workspace only).
   - Fill in app name (`SAAIS`) and support/developer email.
   - If set to **External** and in **Testing** mode, add your sending Gmail address under **Test users** (or publish the app to **Production** so refresh tokens do not expire after 7 days).
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: add `https://developers.google.com/oauthplayground`
   - Copy the **Client ID** and **Client Secret**.

## 2. Generate the Refresh Token

1. Open [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the **gear icon** (top right) → check **Use your own OAuth credentials** → paste your **OAuth Client ID** and **OAuth Client secret**.
3. In Step 1 (left panel), expand **Gmail API v1** and select `https://www.googleapis.com/auth/gmail.send` (or paste it into the scope input).
4. Click **Authorize APIs** and sign into the Gmail account that will send SAAIS emails.
5. In Step 2, click **Exchange authorization code for tokens** and copy the **Refresh token**.

## 3. Configure Supabase Edge Function Secrets

Set these secrets for `mail-delivery` and redeploy:

- `SAAIS_GMAIL_CLIENT_ID` — OAuth Client ID
- `SAAIS_GMAIL_CLIENT_SECRET` — OAuth Client Secret
- `SAAIS_GMAIL_REFRESH_TOKEN` — OAuth Refresh Token
- `SAAIS_MAIL_FROM` (optional) — e.g. `SAAIS <youraccount@gmail.com>` (defaults to the authenticated Gmail account)
- `SAAIS_SITE_URL` — HTTPS base URL of the SAAIS frontend
- `SAAIS_MAIL_WORKER_SECRET` — shared secret checked via the `x-saais-mail-secret` header
- `SAAIS_MAIL_ALLOWED_RECIPIENTS` (staging/test) or `SAAIS_MAIL_ENVIRONMENT=production` (unrestricted production with `SAAIS_MAIL_ALLOWED_RECIPIENTS` unset)

## 4. Schedule the Mail Worker

Configure Supabase Cron to send an HTTPS POST to
`/functions/v1/mail-delivery` on the Supabase project URL every minute
(`* * * * *`). Set the `x-saais-mail-secret` header from the scheduler's
secret store to the same value as `SAAIS_MAIL_WORKER_SECRET`. Verify a
successful scheduled run with an authorized test mailbox.

## Delivery and retries

Invites, resends, and committed student imports queue mail before responding.
On hosted Supabase the immediate worker request runs in the Edge Function's
background task. Scheduled delivery still picks up queued messages if that
request fails.

The Gmail send API has no provider idempotency key. If Gmail accepts a send
and the response times out, or the worker stops before recording the result,
the same queued message can be sent again. The database lease prevents
concurrent claims during its two-minute hold. It cannot prove how an
interrupted provider call ended. Monitor repeated sends and leave invitation
activation subject to its existing single-use token rules.
