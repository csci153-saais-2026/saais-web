# Authentication test cases

All cases are **Not run**. Execute using authorized test accounts and disposable invitation/recovery tokens. Authentication, invitation, recovery, password change and protected-route behavior are covered by the application routes and API contract. Do not use real user credentials in test evidence.

## Sign in and session

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| AUTH-01 | Sign in / P0 | Active account with valid email/password | Submit valid credentials. | User is authenticated and routed to an allowed landing page for their assigned role(s). |
| AUTH-02 | Sign in / P1 | Active account | Submit with blank email, blank password, then both blank. | Required fields are identified; no request establishes a session. |
| AUTH-03 | Sign in / P0 | Active account | Submit wrong password; retry with corrected password. | Invalid credentials show a safe error; retry succeeds; no password is exposed. |
| AUTH-04 | Sign in / P1 | Unknown email and disabled/uninvited account | Submit credentials for each state. | Access is denied with safe messaging; account existence or internal status is not unnecessarily disclosed. |
| AUTH-05 | Sign in / P1 | Email variants | Try leading/trailing whitespace and case variation where supported. | Input normalization follows service behavior; valid account is not accidentally treated as a different identity. |
| AUTH-06 | Sign in / P1 | Keep signed in control available | Sign in with the control on and off; close/reopen browser or session. | Session duration follows the selected option and configured policy; signing out ends access. |
| AUTH-07 | Sign in / P1 | OAuth/Google sign-in configured | Start sign-in, complete provider flow, then repeat with cancellation/provider error. | Success returns through callback and opens authorized role; cancellation/error leaves a recoverable sign-in state. |
| AUTH-08 | Auth callback / P0 | Callback URL with valid and invalid state/code | Load callback for success, denial, missing parameters, expired code and state mismatch. | Valid callback completes once; invalid callback is rejected safely without granting a session. |
| AUTH-09 | Session / P0 | Signed-in user | Refresh, open a new tab, then sign out and revisit a protected route. | Valid session hydrates consistently; after sign-out protected content is inaccessible and sign-in is required. |
| AUTH-10 | Session / P1 | Signed-in user with network/session service interruption | Trigger session load failure; use Retry and Sign out actions. | Error state is understandable; retry can recover; sign-out returns to public route without exposing protected data. |

## Role routing and protected routes

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| AUTH-11 | Protected route / P0 | Anonymous browser | Open a protected route directly and refresh it. | User is redirected to sign in; after successful sign-in they return to the requested route only if authorized. |
| AUTH-12 | Protected route / P0 | Signed in with role A; route requires role B | Open role B route directly and via navigation. | Access is denied or redirected to an authorized page; restricted data is not rendered. |
| AUTH-13 | Multi-role routing / P1 | Account with multiple role assignments | Sign in and exercise each assigned portal; try an unassigned role route. | Available role context is correct; each portal enforces its own permissions; unassigned roles are denied. |
| AUTH-14 | Role loading / P1 | Slow or failed role/session response | Open a protected route during delayed load; repeat with service error. | Loading state prevents premature protected rendering; failure offers recovery and does not default to elevated access. |
| AUTH-15 | URL handling / P1 | Sign-in redirect parameter | Supply allowed internal route and external/malformed URL as return destination. | Only safe internal destinations are honored; external or malformed redirects are rejected or replaced with a safe landing page. |

## Invitation acceptance

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| AUTH-16 | Invitation / P0 | Valid, unused invitation token | Open invitation link. | Invitation is validated and displays the intended account identity, assigned role and scope before acceptance. |
| AUTH-17 | Invitation / P0 | Missing, malformed, expired, revoked or consumed token | Open each link state. | Acceptance is blocked with clear next steps; no account is activated and no session is granted. |
| AUTH-18 | Invitation / P1 | Valid invitation token in URL fragment | Open link and inspect address after token extraction. | Token is handled without exposing it in unrelated navigation or logs; user sees the matching invitation. |
| AUTH-19 | Invitation / P1 | Valid token; password fields | Submit blank values, mismatch, too-short/long values and each missing policy character class. | Password policy and confirmation are enforced; invalid submission does not consume invitation. |
| AUTH-20 | Invitation / P0 | Valid token and compliant password | Accept invitation, then sign in. | Account activates once, assigned role/scope is retained, and credentials allow sign-in. |
| AUTH-21 | Invitation / P1 | Invitation intended for another email | Attempt acceptance while signed in as a different account or after changing displayed identity. | Identity mismatch is rejected; invitation cannot be attached to another person. |
| AUTH-22 | Invitation / P1 | Decline-capable invitation | Decline; then revisit same token. | Decline is recorded once; declined invitation cannot be accepted unless a new invitation is issued. |
| AUTH-23 | Invitation management / P1 | Authorized inviter; pending invitation | Resend invitation; inspect new and prior links. | Resend follows token invalidation/expiry policy and records the action; stale links cannot bypass current invitation state. |
| AUTH-24 | Invitation management / P1 | Authorized inviter; pending invitation | Revoke invitation; open original link. | Revocation prevents acceptance and is reflected in invitation status/audit history. |

## Password recovery and change

| ID | Screen / priority | Preconditions / data | Steps | Expected result |
|---|---|---|---|---|
| AUTH-25 | Forgot password / P1 | Registered and unregistered email addresses | Request recovery for each. | Confirmation is safe and does not reveal whether an account exists; valid requests use configured delivery flow. |
| AUTH-26 | Forgot password / P1 | Malformed email, blank input, repeated requests | Submit each input and repeat request. | Invalid input is handled; throttling/abuse protection applies without exposing account data. |
| AUTH-27 | Reset password / P0 | Valid recovery token | Open reset link; submit compliant matching password. | Password changes successfully; token is single-use; confirmation is shown. |
| AUTH-28 | Reset password / P0 | Missing, malformed, expired or already used token | Open reset route with each condition. | Reset is blocked with recovery guidance; existing credential remains unchanged. |
| AUTH-29 | Reset password / P1 | Valid token | Test blank, mismatch, policy boundaries, and same-as-current password. | All configured password rules are enforced; invalid values do not consume token. |
| AUTH-30 | Change password / P1 | Signed-in local-password account | Test wrong current password, mismatch, too short/long, missing upper/lower/digit and same-as-current. | Inline feedback identifies invalid fields; password remains unchanged. |
| AUTH-31 | Change password / P0 | Signed-in local-password account with valid new password | Submit valid change, then sign in with old and new password. | Change succeeds; old password is rejected and new password works; success notice and field clearing are correct. |
| AUTH-32 | Change password / P1 | Provider-managed account or unsupported password operation | Open Change password and submit if available. | Unsupported operation is clearly explained; no misleading success is shown. |
| AUTH-33 | Session revocation / P1 | Password changed in one session; another session active | Check other session and sign in again. | Other sessions follow the documented revocation policy; user can establish a new valid session. |
| AUTH-34 | Password handling / P0 | Any password form | Toggle visibility, inspect browser storage/logs, submit and navigate away. | Reveal controls work accessibly; secrets are not placed in URLs, persistent client storage, logs or rendered error details. |

## Run record

```text
Run ID:
Environment/browser:
Tester/date:
Account fixture (synthetic identifier only):
Passed / Failed / Blocked:
Defects and notes:
```

Record each case as **Not run**, **Pass**, **Fail**, **Blocked**, or **Not applicable**. For failures, include expected/actual result, screen, synthetic fixture, timestamp and redacted evidence.
