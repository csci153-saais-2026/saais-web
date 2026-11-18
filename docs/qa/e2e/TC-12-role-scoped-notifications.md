# TC-12 — Notifications belong to the signed-in account

**Roles:** Student, Adviser, Department Staff, Department Head, Dean, System Administrator.
**Shared personas/data:** Existing adviser and adviser_secondary personas (two accounts with the same role and different recipient-owned notifications), one persona for each other role, plus a multi-role account such as dean_dept_head.
**Mockup sources:** Each role’s Notifications screen and the shared account/notification switcher shown in the mockup.

## Preconditions

- The shared mock dataset has read and unread notifications for each selected account.
- The adviser and adviser_secondary accounts have distinct notifications and independent read states.
- At least one other account has a notification that should not be visible to the current account.

## Steps and expected results

1. Sign in as each role persona and open Notifications from its own portal.
2. Confirm the inbox contains only notifications addressed to that signed-in account; it may include notifications from multiple roles assigned to that same account.
3. Mark one notification read. Its read state changes for that account only.
4. Switch between adviser and adviser_secondary, which have the same role. Each inbox contains only notifications addressed to that account. Mark one account’s notification read and confirm the other account’s notification list and read state do not change.
5. Sign in as the multi-role account. Its inbox includes notifications addressed to that account across its roles, but excludes notifications addressed to another person.

## Review checks

- The bell and notifications page derive the recipient from the authenticated account, not from a manually chosen role/persona label.
- Each role’s navigation and permitted actions still follow its assigned roles.
- QA approval: [ ]  Auth/notification reviewer approval: [ ]

**Execution status:** Automated prototype coverage: inbox routes and read controls are visible for available role personas. Recipient isolation and independent read state across accounts are not enforced by the static prototype.
