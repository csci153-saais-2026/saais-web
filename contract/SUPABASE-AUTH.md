# Supabase authentication integration contract

Version 0.3.0 documents the boundary between Supabase-managed authentication and SAAIS application operations across all six assignable roles (`student`, `adviser`, `department_head`, `department_staff`, `dean`, `admin`) and multi-role assignments. This document is a future implementation guide; it does not configure a Supabase project or implement login.

## Ownership

| Operation | Owner |
| --- | --- |
| Email/password login | Supabase SDK: `auth.signInWithPassword` |
| Google login | Supabase SDK: `auth.signInWithOAuth({ provider: 'google' })` with explicit PKCE configuration |
| OAuth callback/code exchange | Supabase SDK URL detection or `auth.exchangeCodeForSession`, exactly once |
| Session persistence, refresh and browser state | Supabase SDK and `auth.onAuthStateChange` |
| Logout | Supabase SDK: `auth.signOut` |
| Password recovery/reset | Supabase SDK: `auth.resetPasswordForEmail`, then `auth.updateUser` under a valid recovery session |
| Authenticated password change (`/*/change-password`) | Supabase SDK: re-verify `current_password` via `auth.signInWithPassword`, update via `auth.updateUser({ password })`, and revoke other sessions via `auth.signOut({ scope: 'others' })` |
| Admin / Department Staff / Head provisioning & invitation | Contract: `POST /functions/v1/auth/invite` (unified Google OAuth pre-registration + password invite email) |
| Account invitation resend / revoke | Contract: `POST /functions/v1/accounts/{profile_id}/resend-invite` and `/revoke-invite` |
| Pre-session invitation preview / redemption / decline | Contract: `POST /functions/v1/auth/preview-invite`, `/verify-invite`, and `/decline-invite` |
| Profiles and academic operations | Contract: `/rest/v1/*` and the documented `/functions/v1/*` operations |

Supabase's managed `/auth/v1/*` APIs are intentionally not duplicated as application paths. The SDK owns their provider-specific payloads and session handling. Passwords and Google provider credentials must not be submitted to academic endpoints. [Supabase Google sign-in documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)

## Request authentication

Protected application requests require **both** headers:

```http
apikey: <Supabase project publishable key>
Authorization: Bearer <current Supabase user access_token>
```

OpenAPI expresses both schemes within one security requirement object (AND), not separate alternatives (OR). The public project key identifies the application; it is not an application role or user identity. A legacy `anon` key is supported where the project still permits it. Secret/service-role keys must never be shipped to the browser. Do not use a publishable key, refresh token, Google provider token or invitation token as the user bearer JWT. [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)

The typed client must obtain the current SDK session token per request so refreshes and logout do not leave a stale bearer token cached in client defaults. Missing/expired sessions should return the UI to authentication. Do not automatically replay academic writes after a network/auth failure without checking whether the original operation committed.

Illustrative client integration, not production code added by this change:

```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import createApiClient from 'openapi-fetch';
import type { paths } from './generated/schema'; // Adjust to the future client module's location.

const supabase = createSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

const api = createApiClient<paths>({
  baseUrl: import.meta.env.VITE_SUPABASE_URL,
  headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
});

async function loadOwnProfile() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) throw new Error('Sign in required');
  return api.GET('/rest/v1/profile', {
    params: { query: { id: `eq.${session.user.id}`, limit: 1 } },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
}
```

`getSession` supplies the browser's current credentials; it is not server-side proof of identity. The server independently verifies the JWT and authorizes the requested record.

## OAuth and account eligibility

Explicitly configure PKCE; do not assume every SDK client defaults to it. The future SPA callback route is `/auth/callback`. With SDK URL detection enabled, let the SDK process the callback. If manual callback exchange is chosen instead, disable automatic detection and exchange the code exactly once. Allowlisted redirects, Google provider credentials and the SPA deep-link rewrite must be configured during implementation. Google client secrets remain outside the SPA. [Supabase Google sign-in documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)

The Google provider callback is the Supabase URL `https://<project-ref>.supabase.co/auth/v1/callback`, distinct from the SPA's `/auth/callback` redirect target. The verified Google email must be an institutional `@vsu.edu.ph` address that exactly matches a provisioned `Profile` email (`status: invited` or `active`); enforce eligibility and identity linking server-side for existing identities as well as new ones.

Only provisioned accounts may use SAAIS. Unified provisioning via `POST /functions/v1/auth/invite` creates the pre-registered `Profile` (`status: 'invited'`, `invitation_status: 'pending'`) and `RoleAssignment` rows and dispatches an expiring password-setup invitation email (`/invite/:token`). When a pre-registered user signs in via Google OAuth on that verified `@vsu.edu.ph` address before redeeming the password link, the server links the identity, transitions `Profile.status` to `active` (`invitation_status: 'accepted'`), and invalidates any unused password invitation token. Department Head and Department Staff callers may provision `student`, `adviser`, and `department_staff` accounts within their own department (`admin`, `dean`, and `department_head` grants remain `admin`-only; cross-department assignments are denied with `403 Forbidden`). Future identity creation/linking must resolve to the provisioned account using verified identity, not a role/email supplied by the browser. A before-user-created hook can reject unwanted new identities, but it runs at creation, not every later login. Existing users still need active-profile, role and assignment checks on protected requests after account changes. [Before User Created hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook)

The PostgreSQL `authenticated` role is not the SAAIS `student`, `adviser`, `department_head`, `department_staff`, `dean`, or `admin` role. Read application permissions from trusted provisioned profile and `role_assignment` data; never authorize from user-editable `user_metadata`. JWT verification, RLS/grants and current/historical/departmental/faculty assignment checks remain server responsibilities. An SDK session or client route guard alone does not establish permission.

## Password policy, Change Password workflow, and auth-lifecycle audit events

All password creation (`POST /functions/v1/auth/verify-invite`), password recovery, and authenticated password changes (`supabase.auth.updateUser({ password })`) must enforce **12 to 128 characters** (`minLength: 12`, `maxLength: 128`) with at least one uppercase letter, one lowercase letter, and one digit, and must reject reusing the current password on change.

On the authenticated Change Password routes (`/student/change-password`, `/adviser/change-password`, `/dept-head/change-password`, `/staff/change-password`, `/dean/change-password`, `/dean-dh/change-password`, `/admin/change-password`):
1. **Current-password verification**: Re-verify the user's current password via `supabase.auth.signInWithPassword({ email, password: currentPassword })` before accepting the new password.
2. **Password update & complexity check**: Validate that `newPassword !== currentPassword` and meets the 12–128 character policy, then call `supabase.auth.updateUser({ password: newPassword })` (accounts that authenticate exclusively via Google OAuth manage their password in Google and do not mutate a local password here).
3. **Sign out other devices**: Immediately call `supabase.auth.signOut({ scope: 'others' })` after `updateUser` succeeds so all other active device sessions are invalidated while preserving the current browser session.
4. **Audit logging**: Server-side Supabase Auth hooks / database triggers append a `password_changed` entry (`action_category: 'auth_account'` / `'change'`) to `audit_log_entry` without logging any plaintext or hashed password material.

Authentication and invitation lifecycle audit events (`sign_in_succeeded`, `login_rejected`, `password_changed`, `invitation_accepted`, `invitation_declined`, `invitation_resent`, `invitation_revoked`) are written exclusively by server-side Supabase Auth hooks and Edge Functions—never via client-called `POST /functions/v1/audit/view-event`.

## Invitation exception

`preview-invite`, `verify-invite`, and `decline-invite` require `apikey` and an opaque application invitation token in the JSON request body (never in URL query parameters). They do **not** require a signed-in user's bearer token. `preview-invite` returns non-consuming invitation metadata (`email`, `full_name`, `role`, `roles`, `faculty_name`, `department_name`, `program_code`, `expires_at`, `status`) so the `/invite/:token` page can render its preview card before redemption; `decline-invite` transitions a pending invitation to `declined` and invalidates the token hash; `verify-invite` validates the 12–128 character password, sets the password in Supabase Auth, and activates the existing provisioned profile. Authenticated administrators and department staff/heads manage pending or expired invitations via token-free directory fields (`invitation_status`, `invitation_sent_at`, `invitation_expires_at`) and `POST /functions/v1/accounts/{profile_id}/resend-invite` or `/revoke-invite`. The implementation must make the three pre-session functions reachable before login while validating the token before privileged work; an unconditional gateway user-JWT check would break this workflow. Supabase documents how unauthenticated/custom-auth functions require different gateway handling. [Securing Edge Functions](https://supabase.com/docs/guides/functions/auth)

These routes are not Supabase's `/auth/v1/verify` or an OAuth callback. Privileged server code sets the password in Supabase Auth and activates the existing provisioned profile. The response is activation acknowledgement, not a browser session; the user then signs in through the SDK. The SPA never receives Auth admin credentials. Auth identity, application assignments and email delivery need coordinated recovery because these side effects are not one SQL transaction.

## Error and deployment boundaries

401 responses accept the application/PostgREST error shape or an upstream Supabase gateway authentication error. Consumers must handle a gateway message without assuming `code`, `details` and `hint` exist. A valid project key alone does not satisfy protected authentication; a valid user JWT alone does not establish active application access.

No Supabase provider, hook, grant, project setting, secret, callback implementation or Edge Function is configured by this revision. Those are future implementation requirements. The contract remains compatible with SDK-managed authentication without maintaining a second copy of Supabase's Auth API.
