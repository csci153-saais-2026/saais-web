# Dean Department Head test cases (revised)

Revised against the implemented Dean portal (`src/routes/dean/`) and the shared shell, navigation and routing that combine the Dean role with other roles. It replaces the mockup-based [dean-department-head.md](dean-department-head.md). Every case below is traceable to a real screen, control, label or route in the application.

- **"Dean Department Head"** means one signed-in account that holds the **Dean** role (faculty scope) and a confirmed **Department Head** role (department scope). In the mock data this is "Tan, Ron Nicolas" (`dean_dept_head` persona).
- **Scope of this file:** Department Head pages and behaviour are **not** tested here. The only Department Head case is the role check ROL-01: a Dean can open Department Head routes only when the Department Head role is confirmed. Department Head behaviour belongs to [department-head-revised.md](department-head-revised.md). Dean pages belong to [dean-adviser-revised.md](dean-adviser-revised.md).
- **Status of all cases:** Not run.
- **Verification:** a first pass was run against the live app in mock mode (section 8). Cases and expected results that were seen working are marked **verified**.
- **Execution rule:** perform workflows through the UI, then verify saved results through the UI (reload, other pages, other roles) unless a case says "API".

## Contents

1. [Scope, legend and conventions](#1-scope-legend-and-conventions)
2. [Required inherited runs](#2-required-inherited-runs)
3. [Test data and accounts](#3-test-data-and-accounts)
4. [What changed from the original file](#4-what-changed-from-the-original-file)
5. [Traceability: original ID to revised ID](#5-traceability-original-id-to-revised-id)
6. Test cases
   - [NAV: Shell, navigation and access](#nav-shell-navigation-and-access)
   - [ROL: Role checks and role changes](#rol-role-checks-and-role-changes)
   - [AUD: Dean audit with a combined account](#aud-dean-audit-with-a-combined-account)
   - [SEC: Security and non-functional](#sec-security-and-non-functional)
7. [Observations to confirm with the team](#7-observations-to-confirm-with-the-team)
8. [Verification run in the running app](#8-verification-run-in-the-running-app)

---

## 1. Scope, legend and conventions

### Pages in scope

| Group | Routes | Tested here? |
| --- | --- | --- |
| Dean | `/dean/reports`, `/dean/students`, `/dean/audit-log` | Only as part of the combined shell and audit cases. Full detail in [dean-adviser-revised.md](dean-adviser-revised.md). |
| Department Head | `/department-head/...` | **Role check only** (ROL-01 to ROL-05). |
| Adviser | `/adviser/...` | Not tested here. The adviser role check is in dean-adviser-revised.md (NAV-09). |
| Shell | sidebar, breadcrumbs, account menu | Yes. |

### Column legend

| Column | Meaning |
| --- | --- |
| Done | Tick the box (☐ becomes ☑) when the case has been run and passed. |
| ID | `DDH-‹module›-‹nn›`, written in short form (for example `ROL-01`) inside tables. |
| Pri | **P1** critical access, scope or audit flow. **P2** important functional behaviour. **P3** cosmetic, edge or low-risk behaviour. |
| Expected result | What must be observed. Quoted text is the exact on-screen wording in the current build. |

### Conventions

- Times are shown in **Philippine time (Asia/Manila)**.
- **[API]** needs an API client. **[Multi-session]** needs two browsers. **[Cross-portal]** needs another role's account. **[Fault injection]** needs a forced server error. **Observe** marks behaviour that looks questionable: record what happens and raise it (section 7).

---

## 2. Required inherited runs

| Run | Suite | Notes |
| --- | --- | --- |
| `DDH-DA-xx` | All cases of [dean-adviser-revised.md](dean-adviser-revised.md) except its Adviser role check (NAV-09) | Run on the Dean pages with this account. Include its NAV-05 redirect-loop defect and AUD-08 classification defect. |
| Shared sign-in | Sign-in, sign-out, password and inactive-account cases | Repeat once for this account. |

The Department Head suite and the Adviser suite are **not** repeated in this file. Run them with their own accounts.

---

## 3. Test data and accounts

| Item | Requirement |
| --- | --- |
| **Dean + Head account** | Roles Dean (faculty scope) and confirmed Department Head (department scope). |
| **Comparison accounts** | Dean-only or Dean + Adviser (no Head role), Head-only (no Dean role), a user whose job title says "Department Head" but who has no Head role, and an Admin account that can change roles. |
| **Faculty data** | One faculty with two departments, the Head managing one of them, and students in each. |
| **Audit events** | Events from several actors in the faculty, including actions made by Heads and Staff. |

---

## 4. What changed from the original file

| # | Original assumption | What the application does | Handling |
| --- | --- | --- | --- |
| 1 | Three expandable groups: Adviser, Department Head, Dean (DDH-01, DDH-02). | Confirmed. The combined account sees **ADVISER**, **DEPARTMENT HEAD** and **DEAN** groups in that order. At a 900 px browser height the Dean group is below the visible sidebar. | NAV-01 to NAV-06 |
| 2 | Department Head and Adviser suites are rerun inside this portal (DDH-ADV, DDH-DH). | Out of scope for this file. Department Head content is reduced to the role check. | ROL-01 |
| 3 | Dean and Head screens, reports, PDFs, settings, transfers and notifications are compared (DDH-03 to DDH-10, DDH-17 to DDH-19). | Removed from this file by decision. Dean behaviour is tested in dean-adviser-revised.md and Head behaviour in department-head-revised.md. | not applicable |
| 4 | Role removal and grant handling (DDH-11, DDH-12). | Kept, limited to route access: removing a role removes that role's routes and nothing else. | ROL-02 to ROL-05 |
| 5 | Dean audit shows combined activity (DDH-07, DDH-15). | Kept for the Dean audit log only. | AUD-01, AUD-02 |

---

## 5. Traceability: original ID to revised ID

| Original | Topic | Revised |
| --- | --- | --- |
| DDH-01 | Expand and collapse three groups | NAV-01, NAV-02, NAV-03, NAV-04 |
| DDH-02 | Visit one page per group; Back/Forward | NAV-05, NAV-06 |
| DDH-03 | Department and Dean student rows | Removed (Head behaviour out of scope). Dean rows: dean-adviser-revised.md DIR cases. |
| DDH-04 | Scope labels and totals | Removed (Head behaviour out of scope). Dean report: dean-adviser-revised.md RPT cases. |
| DDH-05 | Department Reports term and program matrix | Removed (Head behaviour out of scope). |
| DDH-06 | Department and faculty report previews | Removed (Head behaviour out of scope). Dean PDF: dean-adviser-revised.md RPT-22 to RPT-27. |
| DDH-07 | Audit screens and view event | AUD-01, AUD-02 |
| DDH-08 | Head Settings and Dean reports | Removed (Head behaviour out of scope). |
| DDH-09 | Approved transfer in all views | Removed (Head behaviour out of scope). |
| DDH-10 | Own advisee, oversight student, other-faculty student | Removed (Head and Adviser behaviour out of scope). Dean scope: dean-adviser-revised.md DIR-11, DIR-13. |
| DDH-11 | Head responsibility removed mid-session | ROL-02 |
| DDH-12 | Remove each grant separately | ROL-02, ROL-03, ROL-04 |
| DDH-13 | Concurrent shift and stale adviser revision | Removed (Head and Adviser behaviour out of scope). |
| DDH-14 | Scope switching with delayed responses | Removed here. Dean version: dean-adviser-revised.md RPT-20. |
| DDH-15 | Attribution for one user in three roles | AUD-02 |
| DDH-16 | Consistency after exception history | Removed (Head and Adviser behaviour out of scope). |
| DDH-17 | Notifications | Removed here. Dean notifications: dean-adviser-revised.md NTF cases. |
| DDH-18 | Cross-role PDFs | Removed (Head behaviour out of scope). |
| DDH-19 | Shared management in other readers | Removed (Head behaviour out of scope). |

---

## 6. Test cases

### NAV: Shell, navigation and access

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | NAV-01 | P1 | Dean + Head account | Sign in and read the sidebar. | Three groups in this order: **ADVISER**, **DEPARTMENT HEAD**, **DEAN**, followed by "Help & documentation" (verified for the three-role mock account). The DEAN group lists Faculty reports, Students and Audit log. |
| ☐ | NAV-02 | P2 | Same account | Visit a Dean page and a Department Head page. | The top-left label and breadcrumb follow the page: "Office of the Dean › ‹page›" on Dean pages and "Department Head › ‹page›" on Head pages (both verified). The current page is highlighted. |
| ☐ | NAV-03 | P3 | Browser height about 900 px | Open a Department Head page and look at the sidebar. | The Dean group is below the visible area and the sidebar scrolls inside itself (verified in a screenshot). The Dean group is reachable by scrolling and by keyboard. |
| ☐ | NAV-04 | P3 | Same account | Collapse and expand each sidebar group by mouse and by keyboard. | Groups toggle without losing the active page. |
| ☐ | NAV-05 | P2 | Same account | Visit one Dean page and one Department Head page, then use Back and Forward several times. | The correct saved page returns each time. The group and label match the page. |
| ☐ | NAV-06 | P2 | Same account | Reload each page and open each URL in a new tab. | Every page reloads at the same URL with no 404. |
| ☐ | NAV-07 | P1 | Same account | Open `/department-head`, `/dean`, `/department-staff` and `/` by URL. | `/department-head` → `/department-head/curriculum-transfers`, `/dean` → `/dean/reports`, `/department-staff` → `/dean/reports` (not a granted role), `/` stays on the home page (all verified). |
| ☐ | NAV-08 | P1 | Same account | Open `/dean/does-not-exist`. | **Confirmed defect:** endless redirect loop (see dean-adviser-revised.md NAV-05). Expected after a fix: one redirect to `/dean/reports`. |
| ☐ | NAV-09 | P2 | Same account with an open dialog on a Dean page | Sign out and sign in as a different account. | The new session starts clean: no open dialog, no leftover form, no toast. |

### ROL: Role checks and role changes

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | ROL-01 | P1 | Dean + Head account (Head role confirmed); Dean + Adviser account (no Head role); Head-only account (no Dean role) | 1. As Dean + Head, open `/department-head/curriculum-transfers` and `/department-head/students` by URL and from the sidebar.<br>2. As Dean + Adviser (no Head role), open the same URLs.<br>3. As Head-only, open `/dean/reports`. | **Role check.** With the Head role confirmed the Dean can open Department Head routes (verified). Without the Head role the Dean is redirected to `/dean/reports` (verified). A Head without the Dean role cannot open Dean routes and is redirected to `/department-head/curriculum-transfers` (verified). Each role grants only its own routes: no union of scopes. |
| ☐ | ROL-02 | P1 | **[Cross-portal]** Dean + Head session open; an Admin removes the Head role | Reload a Department Head page, then open Dean pages. | Department Head routes are denied (redirect to `/dean/reports`) and the Department Head sidebar group disappears after a refresh. Dean pages keep working. |
| ☐ | ROL-03 | P1 | **[Cross-portal]** Admin removes the Dean role instead | Reload a Dean page and open Department Head pages. | Dean routes are denied and the DEAN group disappears. Department Head routes keep working. |
| ☐ | ROL-04 | P1 | **[Cross-portal]** Remove one role at a time, then test every group again | After each removal open each remaining route. | Only the roles still granted work. No scope stays from a removed role. |
| ☐ | ROL-05 | P1 | A user whose job title says "Department Head" but who has no Head role; **[API]** variant | Open `/department-head/students` and call a Head endpoint. | The route redirects away and the API refuses. A job title alone grants no access. A genuine Head succeeds. |
| ☐ | ROL-06 | P2 | **[Cross-portal]** a Head role is added to a Dean | Sign out and in. | The Department Head group appears and its routes open within the Head's own department scope only. |

### AUD: Dean audit with a combined account

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | AUD-01 | P1 | **[Cross-portal]** a Head, Staff or other actor changed something in the faculty | Open the Dean Audit log and reload. | The event appears with its true actor, student and wording (verified: a Head's reassignment appears as "Reassigned to … effective …" by the acting person). Only this faculty's events are shown. |
| ☐ | AUD-02 | P1 | The combined account opens a student record in Dean Students | Open the Dean Audit log. | A View entry "Viewed student academic record (‹student number›)" names the signed-in person as the actor (verified on a Dean + Adviser account). The entry is not attributed to anyone else. Check the recorded role or scope against the role actually used (**Observe**: the mock records the primary role). |

### SEC: Security and non-functional

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | SEC-01 | P1 | **[API]** a Head-only token | Call Dean read endpoints (faculty roster, faculty report, audit). | Refused. Head scope never becomes faculty scope. |
| ☐ | SEC-02 | P2 | Production build | Reload every page URL in all three groups. | No 404 on refresh. |
| ☐ | SEC-03 | P2 | Keyboard and screen reader | Walk the sidebar across the three groups. | Group toggles and links are reachable and named. |
| ☐ | SEC-04 | P2 | Narrow screen (375 px) | View a Dean page and open the sidebar. | No horizontal scroll. The long sidebar remains usable. |

---

## 7. Observations to confirm with the team

| # | Area | Observation | Related case |
| --- | --- | --- | --- |
| 1 | Navigation | **Confirmed:** any unknown `/dean/...` URL loops forever. | NAV-08 |
| 2 | Navigation | With three groups the Dean group sits below the fold on a 900 px screen. | NAV-03 |
| 3 | Audit | In the mock, view events are recorded with the primary role. Check that the real back end records the acting role. | AUD-02 |

### Coverage summary

| Module | Cases | P1 | P2 | P3 |
| --- | --- | --- | --- | --- |
| ROL | 6 | 5 | 1 | 0 |
| NAV | 9 | 3 | 4 | 2 |
| AUD | 2 | 2 | 0 | 0 |
| SEC | 4 | 1 | 3 | 0 |
| **Total** | **21** | **11** | **8** | **2** |

Every Dean and combined-session behaviour in scope has at least one case. Every original case DDH-01 to DDH-19 is either mapped to a revised case or explicitly marked removed with the reason (section 5).

---

## 8. Verification run in the running app

### How the app was run

Dev server in mock mode, signed in as the `dean_dept_head` persona (and comparison personas `dean`, `department_head_only`, `department_staff`, `dean_only`, `student`, `adviser`, `admin`), driven with headless Chromium.

### Seen working as written (verified)

NAV-01, NAV-02, NAV-03, NAV-07, NAV-08 (defect), ROL-01, AUD-01, AUD-02.

### Not verifiable in mock mode

| Group | Why |
| --- | --- |
| Role removal and addition (ROL-02, ROL-03, ROL-04, ROL-06) | Need the Admin workflow and a real back end. |
| **[API]** and **[Multi-session]** cases (ROL-05 API part, SEC-01) | Need tooling. |
| Everything else not listed as verified | Written from the source only. Not run. |
