# TC-11 — System Administrator manages accounts and performs an audited override

**Role:** System Administrator
**Shared personas/data:** admin, existing role-bearing accounts, a student account request, and an institution/department grade-closure state.
**Mockup sources:** mockup/SystemAdmin/AdminAccountsRoles.dc.html, AdminStudentDirectory.dc.html, AdminAuditLog.dc.html, AdminSettings.dc.html.

## Preconditions

- The System Administrator is authenticated.
- The account provisioning test uses an unused synthetic identity from the shared account data.
- A locked term or department closure is available for the override scenario.

## Steps and expected results

1. Open Accounts and Roles and provision an account with the requested role or roles.
2. For a student account, omit the initial adviser and submit. Creation is blocked; adding an eligible initial adviser allows creation.
3. Sign in as a multi-role account. The account can access only the routes/actions granted by its assigned roles, and role-specific views retain their separate scopes.
4. With an institution-wide locked term or department closure in effect, perform the approved System Administrator override action directly.
5. Inspect the audit log. The override records the administrator, affected scope/term, time, and reason; the closure change is traceable.

## Review checks

- Student accounts require an initial adviser.
- One account may have multiple assigned roles; role-specific access remains explicit.
- The project owner approved a direct, audited System Administrator override when the mockup does not define a separate workflow.
- QA approval: [ ]  System/academic reviewer approval: [ ]

**Execution status:** Automated prototype coverage: account/role and audit-log screens are visible. Student initial-adviser validation, role enforcement, and the audited override action are not exposed as interactive flows.
