# Supabase authentication integration contract

Version 0.2.1 documents the boundary between Supabase-managed authentication and SAAIS application operations. This document is a future implementation guide; it does not configure a Supabase project or implement login.

## Ownership

| Operation | Owner |
| --- | --- |
| Email/password login | Supabase SDK: `auth.signInWithPassword` |
| Google login | Supabase SDK: `auth.signInWithOAuth({ provider: 'google' })` with explicit PKCE configuration |
| OAuth callback/code exchange | Supabase SDK URL detection or `auth.exchangeCodeForSession`, exactly once |
| Session persistence, refresh and browser state | Supabase SDK and `auth.onAuthStateChange` |
| Logout | Supabase SDK: `auth.signOut` |
| Password recovery/reset | Supabase SDK: `auth.resetPasswordForEmail`, then `auth.updateUser` under a valid recovery session |
| Admin provisioning/invitation | Contract: `POST /functions/v1/auth/invite` |
| Application invitation redemption/password creation | Contract: `POST /functions/v1/auth/verify-invite` |
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

The Google provider callback is the Supabase URL `https://<project-ref>.supabase.co/auth/v1/callback`, distinct from the SPA's `/auth/callback` redirect target. The verified Google email must exactly match the admin-provisioned profile email; enforce eligibility and identity linking server-side for existing identities as well as new ones.

Only admin-provisioned accounts may use SAAIS. Future identity creation/linking must resolve to the provisioned account using verified identity, not a role/email supplied by the browser. A before-user-created hook can reject unwanted new identities, but it runs at creation, not every later login. Existing users still need active-profile, role and assignment checks on protected requests after account changes. [Before User Created hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook)

The PostgreSQL `authenticated` role is not the SAAIS `student`, `adviser` or `admin` role. Read application permissions from trusted provisioned profile data; never authorize from user-editable `user_metadata`. JWT verification, RLS/grants and current/historical adviser checks remain server responsibilities. An SDK session or client route guard alone does not establish permission.

## Invitation exception

`verify-invite` requires `apikey` and an opaque, single-use application invitation token in the request body. It does **not** require a signed-in user's bearer token. The implementation must make this function reachable before login while validating the token before privileged work; an unconditional gateway user-JWT check would break this workflow. Supabase documents how unauthenticated/custom-auth functions require different gateway handling. [Securing Edge Functions](https://supabase.com/docs/guides/functions/auth)

This route is not Supabase's `/auth/v1/verify` or an OAuth callback. Privileged server code sets the password in Supabase Auth and activates the existing provisioned profile. The response is activation acknowledgement, not a browser session; the user then signs in through the SDK. The SPA never receives Auth admin credentials. Auth identity, application assignments and email delivery need coordinated recovery because these side effects are not one SQL transaction.

## Error and deployment boundaries

401 responses accept the application/PostgREST error shape or an upstream Supabase gateway authentication error. Consumers must handle a gateway message without assuming `code`, `details` and `hint` exist. A valid project key alone does not satisfy protected authentication; a valid user JWT alone does not establish active application access.

No Supabase provider, hook, grant, project setting, secret, callback implementation or Edge Function is configured by this revision. Those are future implementation requirements. The contract remains compatible with SDK-managed authentication without maintaining a second copy of Supabase's Auth API.
