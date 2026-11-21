# Department Head test cases (revised)

These acceptance scenarios describe Department Head behavior using the supplied QA draft and mockup. The contract branch does not register Department Head routes; UI cases are Blocked until the relevant pages are available in the revision under test. The observations below do not identify the tested revision and must be independently reproduced.

- **Status of all cases:** Not run
- **Assumption:** the complete system is operational and seeded with realistic Department of Computer Science and Technology (DCST) data.
- **Verification:** section 8 retains the author's reported mock-mode observations. The tested revision is not identified; inline "verified" labels are historical claims, not verification of this branch. Cases remain Not run here.
- **Execution rule:** perform workflows through the UI, then verify saved results through the UI (refresh, other pages, other roles) unless a case says "API".

## Contents

1. [Scope, legend and conventions](#1-scope-legend-and-conventions)
2. [Test data and accounts](#2-test-data-and-accounts)
3. [What changed from the original file](#3-what-changed-from-the-original-file)
4. [Traceability: original ID to revised ID](#4-traceability-original-id-to-revised-id)
5. Test cases
   - [NAV: Shell, navigation and access](#nav-shell-navigation-and-access)
   - [NTF: Notifications](#ntf-notifications)
   - [TRF: Curriculum transfers](#trf-curriculum-transfers)
   - [CUR: Curricula](#cur-curricula)
   - [EQV: Equivalence](#eqv-equivalence)
   - [CRD: Outside credits](#crd-outside-credits)
   - [STU: Students directory and record](#stu-students-directory-and-record)
   - [IMP: Student spreadsheet import](#imp-student-spreadsheet-import)
   - [ASG: Adviser assignments](#asg-adviser-assignments)
   - [TRM: Academic terms](#trm-academic-terms)
   - [RPT: Department reports](#rpt-department-reports)
   - [AUD: Audit log](#aud-audit-log)
   - [SET: Settings](#set-settings)
   - [INT: Cross-module, security and non-functional](#int-cross-module-security-and-non-functional)
6. [Observations to confirm with the team](#6-observations-to-confirm-with-the-team)
7. [Coverage summary](#7-coverage-summary)
8. [Verification run in the running app](#8-verification-run-in-the-running-app)

---

## 1. Scope, legend and conventions

### Pages in scope

| Module | Route | Source |
| --- | --- | --- |
| Curriculum transfers | `/department-head/curriculum-transfers` (`?history=1` for history tab) | `curriculum-transfers/CurriculumTransfersPage.tsx` |
| Curricula | `/department-head/curricula` | `curricula/CurriculaPage.tsx` |
| Equivalence | `/department-head/equivalence` | `equivalence/EquivalencePage.tsx` |
| Outside credits | `/department-head/outside-credits` | `outside-credits/OutsideCreditsPage.tsx` |
| Students | `/department-head/students` | `students/StudentsPage.tsx`, `StudentRecordDialog.tsx`, `CourseInfoDialog.tsx`, `StudentImportDialog.tsx` |
| Adviser assignments | `/department-head/adviser-assignments` | `adviser-assignments/AdviserAssignmentsPage.tsx`, `ReassignAdviserDialog.tsx` |
| Academic terms | `/department-head/academic-terms` | `academic-terms/AcademicTermsPage.tsx` |
| Department reports | `/department-head/reports` | `reports/DepartmentReportsPage.tsx`, `ReportCohortDialog.tsx` |
| Audit log | `/department-head/audit-log` | `audit-log/AuditLogPage.tsx` |
| Settings | `/department-head/settings` | `settings/SettingsPage.tsx` and its three panels |
| Notifications | `/department-head/notifications` | shared `NotificationsPage` |
| Shell and redirects | `/department-head`, `/department-head/transfers`, `/dept-head/*` | `App.tsx`, `DepartmentHeadLayout.tsx`, `navigation/department-head.ts` |

### Column legend

| Column | Meaning |
| --- | --- |
| Done | Tick the box (☐ becomes ☑) when the case has been run and passed. |
| ID | `DH-<module>-<nn>`. Written in short form (for example `TRF-08`) inside tables. |
| Pri | **P1** critical business or data-integrity flow, **P2** important functional or validation behaviour, **P3** cosmetic, edge or low-risk behaviour. |
| Preconditions / data | State and data needed before step 1. |
| Steps | Numbered actions, separated by line breaks. |
| Expected result | What must be observed. Quoted text is the exact on-screen wording in the current build. |

### Conventions

- All dates and times the Department Head sees are in **Philippine time (Asia/Manila)**, whatever the tester's computer clock says.
- "Toast" means the dark-green confirmation message at the bottom right. It disappears after about 3 seconds, and a newer toast replaces an older one.
- "Dialog" means a modal. Esc, the X button and clicking outside close it unless the case says it is locked while saving.
- "Department scope" means DCST only. Every list page footer shows "DCST department scope".
- Cases marked **[API]** need an API client (for example Postman) or developer tools. Cases marked **[Multi-session]** need two browsers or profiles. Cases marked **[Cross-portal]** need another role's account. Cases marked **[Fault injection]** need a way to force a server error, such as a staging toggle, a proxy or network blocking.
- A case marked **Observe** documents behaviour that looks questionable in the code. Record what actually happens and raise it with the team (see [section 6](#6-observations-to-confirm-with-the-team)).
- The original file asked testers to also run Adviser cases (`adviser.md`) as `DH-ADV-xx` on a multi-role account. That file is not in this folder. Keep that practice for a user who holds both roles: see NAV-09 and run the adviser suite under that account.

---

## 2. Test data and accounts

| Item | Requirement |
| --- | --- |
| **Head-only account** | Role Department Head only (no Adviser role). Primary account for all cases. |
| **Head + Adviser account** | Holds Adviser and Department Head roles (NAV-08, NAV-09). |
| **Second Head account** | Another department's Head, or a second session of the same Head (INT scope and concurrency cases). |
| **Non-Head accounts** | One each: Student, Adviser-only, Department Staff, Dean, Admin. |
| **Departments** | DCST with programs BSCS and BSIT. At least one other department with its own students, transfers and audit events. |
| **Students** | At least 26 DCST students across at least two curricula. Include one Unassigned student, one with a scheduled adviser change, one with grades and a failed or INC attempt, one with no grades, one with no entry year, and one with no cumulative GWA. |
| **Advisers** | At least three active DCST advisers, one inactive adviser, and one adviser from another department. |
| **Curricula** | At least one active, one draft and one retired version. One version with enrolled students. One referenced by a transfer request or equivalence rule. One new, unused draft (for deletion tests). One slot with academic history. |
| **Transfer requests** | At least three pending, one approved with a reason, one rejected with a reason. Include one for a student with passed courses that have no equivalence mapping. |
| **Equivalencies** | At least one pair with mappings and one pair without. |
| **Outside credits** | At least one existing credit (Transferee). A student with no credit. |
| **Terms** | At least one Open term and two Closed terms. One closed term with a closure note. |
| **Audit events** | Events of each type (view, change, sign-in) from at least two actors and two students, across at least three dates, one near midnight Manila time. |
| **Settings** | Default thresholds 25 / 50 / 75, sender `*@vsu.edu.ph`, one recorded backup. A second environment with no backup recorded. |
| **Notifications** | At least two unread notifications addressed to the Head, one with a transfer target route. |
| **Sample files** | Valid `.csv`, valid `.xlsx`, `.csv` with missing columns, empty `.csv`, header-only `.csv`, `.csv` with mixed valid and invalid rows, `.csv` with quoted commas and a BOM, corrupt `.xlsx`, password-protected `.xlsx`, `.xls`, `.txt`, `.pdf`. |

Example student, adviser and curriculum names in the cases (for instance "Sta. Agata, Jerome Daniel S.", "BSCS 2024-2025 v1") come from the standard mock dataset. Substitute equivalents in other data sets.

---

## 3. What changed from the original file

The original cases were written against HTML mockups. The built pages differ. These differences drove the revision:

| # | Original assumption | What the application does | Handling in this file |
| --- | --- | --- | --- |
| 1 | A "Guide" page with expandable Adviser and Department Head groups. | There is no guide page. The Department Head sidebar section lists 10 pages. A second group appears only for multi-role users. | NAV-01, NAV-09 |
| 2 | Transfer review dialog is reachable from any row; approval needs a reason. | A decision reason is **optional for Approve** and **required for Reject** (max 2,000 characters). | TRF-07 to TRF-14 |
| 3 | Student detail has a breadcrumb and a detail URL (DH-13, DH-27). | The student record is a **read-only modal** with Checklist, Grades and Audit log tabs. There is no detail URL. | STU-09 to STU-19, INT-07 |
| 4 | Import has "Import valid rows" and partial acceptance (DH-14). | FR-ADM-14 requires valid rows to be committed atomically while invalid rows are rejected. The author reported an all-or-nothing UI in an unidentified build; treat it as an observed mismatch to verify, not the expected contract behavior. | IMP-02, IMP-16 |
| 5 | Pressing Reassign with nothing selected shows a validation message (DH-15). | The **Reassign selected button is disabled** until a student is selected. | ASG-06 |
| 6 | Reports work for both listed terms (DH-20, DH-39). | The roster describes **only the current term**. Any other term shows "No report available" and disables Export PDF. | RPT-08, RPT-09 |
| 7 | PDF footer shows generated date **and actor** (DH-19, DH-21). | The PDF footer shows "Generated d MMM yyyy through SAAIS" and "Page X of Y". It has **no actor**. Signature blocks read "Prepared by: Department Head" and "Noted by: Dean". | TRM-26, RPT-27 |
| 8 | Export button label "Download PDF" at page level. | The page button is **Export PDF**. It opens a preview, and **Download PDF** is inside the preview. | TRM-24, RPT-26 |
| 9 | Settings has a "test notification" check (DH-24). | There is **no test-send control**. The sender is verified by saving and by observing real notification emails. | SET-17 |
| 10 | Notification bell with "See all" and Unread tab (DH-38). | Bell is in the shell top bar. The inbox page has All and Unread (N) filters, Mark read and Mark all as read. | NTF-01 to NTF-14 |
| 11 | Curriculum slot validation is "negative slot units" only. | Version units must be **positive**, slot and course units must be **zero or more**, and separate duplicate rules apply to versions, terms and course codes. | CUR-06 to CUR-37 |
| 12 | Several cases (DH-29 to DH-37, DH-40 to DH-42) describe back-end rules with no screen. | Kept, but rewritten as observable cross-module or API checks and flagged **[API]**, **[Cross-portal]** or **[Fault injection]**. | INT-01 to INT-16 and linked module cases |

---

## 4. Traceability: original ID to revised ID

| Original | Topic | Revised |
| --- | --- | --- |
| DH-01 | Guide / group navigation | NAV-01, NAV-02, NAV-09 |
| DH-02 | Review transfer request | TRF-03, TRF-05 |
| DH-03 | Approve transfer | TRF-07, TRF-08, TRF-20, TRF-21 |
| DH-04 | Reject transfer | TRF-09, TRF-10, TRF-11, TRF-23 |
| DH-05 | Decision history | TRF-16, TRF-17, TRF-18 |
| DH-06 | Curricula switch/add/edit/save | CUR-01, CUR-02, CUR-04, CUR-12, CUR-22, CUR-24, CUR-28, CUR-32 |
| DH-07 | Curricula validations | CUR-06 to CUR-09, CUR-14, CUR-23, CUR-29, CUR-30, CUR-36 |
| DH-08 | Curricula deletion | CUR-17 to CUR-20, CUR-25 to CUR-27, CUR-33, CUR-34 |
| DH-09 | Equivalence pair switch | EQV-01, EQV-02 |
| DH-10 | Pair guidance vs student equivalency | EQV-19 |
| DH-11 | Credit a course | CRD-05, CRD-13, CRD-14, CRD-15 |
| DH-12 | Students search/filter | STU-02 to STU-08 |
| DH-13 | Student record open | STU-09 to STU-19 |
| DH-14 | Import spreadsheet | IMP-01 to IMP-25 |
| DH-15 | Assignments selection | ASG-03 to ASG-09 |
| DH-16 | Assignments reassign | ASG-10 to ASG-20, ASG-29 |
| DH-17 | Add term | TRM-03 to TRM-13 |
| DH-18 | Close encoding | TRM-14 to TRM-21 |
| DH-19 | Terms PDF | TRM-24 to TRM-29 |
| DH-20 | Reports term/program matrix | RPT-01 to RPT-14 |
| DH-21 | Reports PDF | RPT-26 to RPT-31 |
| DH-22 | Audit filters | AUD-01 to AUD-14 |
| DH-23 | Thresholds | SET-02 to SET-08 |
| DH-24 | Sender email | SET-09 to SET-12 |
| DH-25 | Backup record | SET-13 to SET-22 |
| DH-26 | Concurrent transfer decision | TRF-24 |
| DH-27 | Cross-department access | TRF-26, STU-22, INT-07 |
| DH-28 | Equivalence/credit conflicts | EQV-06 to EQV-09, CRD-06 to CRD-13 |
| DH-29 | Grants vs job title | INT-08 |
| DH-30 | Unmapped passed course on shift | TRF-22 |
| DH-31 | Transfer rollback | TRF-25 |
| DH-32 | Outside credit under-unit | CRD-17 |
| DH-33 | Report filters/drill/export | RPT-15 to RPT-18, RPT-26 |
| DH-34 | Bulk reassignment with ineligible student | ASG-27, ASG-28 |
| DH-35 | Deadline boundary | TRM-19, TRM-20 |
| DH-36 | Delegated operation / immutable log | AUD-15, AUD-18, INT-16 |
| DH-37 | Department vs system settings | SET-23, INT-04 |
| DH-38 | Notifications | NTF-01 to NTF-14 |
| DH-39 | Report matrix | RPT-07 to RPT-10, RPT-31 |
| DH-40 | Reassignment persistence | ASG-18, ASG-19, INT-01 |
| DH-41 | Shared settings | SET-23, INT-04 |
| DH-42 | Cohort audit | RPT-24, INT-06 |

---

## 5. Test cases

### NAV: Shell, navigation and access

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | NAV-01 | P1 | Signed in as Head-only account | 1. Land on the portal.<br>2. Read the sidebar. | Sidebar section "Department Head" lists exactly, in order: Curriculum transfers, Curricula, Equivalence, Outside credits, Students, Adviser assignments, Academic terms, Department reports, Audit log, Settings. Portal label reads "Department Head". No Adviser group is shown. |
| ☐ | NAV-02 | P1 | Head-only account | 1. Click each sidebar item in turn.<br>2. Watch URL, active highlight, page heading and breadcrumb. | URL is `/department-head/<page>` (reports is `/department-head/reports`, audit is `/department-head/audit-log`). The clicked item is highlighted. Breadcrumb shows "Department Head › ‹item label›". Page heading matches: "Curriculum transfers", "Shape the path to graduation." (Curricula), "Equivalence", "Outside credits", "Students", "Adviser assignments", "Academic terms", "Department reports", "Audit log", "Settings". |
| ☐ | NAV-03 | P2 | Head-only account | Open `/department-head`. | Redirects to `/department-head/curriculum-transfers`. |
| ☐ | NAV-04 | P3 | Head-only account | Open `/department-head/transfers`. | Redirects to `/department-head/curriculum-transfers`. |
| ☐ | NAV-05 | P3 | Head-only account | Open `/dept-head` and `/dept-head/students`. | Both redirect to `/department-head` and then to Curriculum transfers. |
| ☐ | NAV-06 | P1 | Signed out | Open `/department-head/reports` directly. | Redirected to `/login`. No Department Head content is shown, even briefly. After sign-in the user reaches their own portal. |
| ☐ | NAV-07 | P1 | Accounts: Student, Adviser, Department Staff, Dean, Admin, plus a deactivated account | For each account open `/department-head/students` and `/department-head/settings` by typing the URL. | **Verified in the running app.** Each role is redirected to its own portal home (Student → `/student`, Adviser → `/adviser/dashboard`, Department Staff → `/department-staff/students`, Dean → `/dean/reports`, Admin → `/admin`). A deactivated account goes to `/login`. No Department Head data loads for any of them. (A Dean who also holds the Department Head role legitimately reaches the page.) |
| ☐ | NAV-08 | P1 | Head-only account | Open `/adviser/advisees` by URL. | Redirected to `/department-head/curriculum-transfers`. No Adviser page is shown. |
| ☐ | NAV-09 | P2 | Head + Adviser account (or a Dean who also holds Head) | 1. Read the sidebar.<br>2. Open an Adviser page, then a Department Head page.<br>3. Repeat in reverse.<br>4. Run the Adviser suite from `adviser.md` under this account. | Sidebar shows an **Adviser** group first (Dashboard, Advisees, Encode grades, Import grades, Grade flags, and so on) and then the **Department Head** group (verified). Portal label and breadcrumb follow the page being viewed. Department Head pages keep Department Head navigation. Adviser cases pass with the same results as for an Adviser-only account. |
| ☐ | NAV-10 | P2 | Head-only account | Open `/department-head/does-not-exist`. | **Confirmed defect:** the whole page goes blank. There is no sidebar, top bar, breadcrumb or "Page not found" message (only the developer persona badge shows in mock mode). Expected after a fix: the shell stays and a not-found message or redirect appears. |
| ☐ | NAV-11 | P2 | Open dialog and unsaved form (for example Add term) | 1. Sign out.<br>2. Sign in as a different Head. | The new user starts with a fresh workspace: no open dialog, no leftover form values, no toast. Data shown belongs to the new user's department. |
| ☐ | NAV-12 | P2 | Head-only account | 1. For each page, copy the URL.<br>2. Open it in a new tab and refresh.<br>3. Use browser Back and Forward between pages.<br>4. Open Curriculum transfers with `?history=1`. | Every page reloads at the same URL without a 404. Back and Forward restore the correct page. `?history=1` opens the Decision history tab. |
| ☐ | NAV-13 | P1 | Head-only account | 1. Open the account menu at the foot of the sidebar and click **Sign out**.<br>2. Press browser Back.<br>3. Re-open a protected URL. | Redirected to `/login` (verified). With a real login, Back must not reveal Department Head data and the protected URL must redirect to login. (Step 2 could not be checked in mock mode because the mock persona is re-applied on every navigation.) |
| ☐ | NAV-14 | P3 | Any action that shows a toast | 1. Trigger a toast.<br>2. Trigger another within 3 seconds.<br>3. Wait. | Toast appears bottom right with the exact message. A second toast replaces the first. It disappears about 3.2 seconds after the latest one. It does not block clicks on the page. |
| ☐ | NAV-15 | P3 | Head-only account | Click the account area at the foot of the sidebar (name and email). | Menu shows **Change Password** and **Sign out** only (verified). Change Password opens `/settings` with the heading "Change password". Its breadcrumb reads "Department Head › Settings", which looks like the Department Head Settings page but is not (**Observe**). Department Head Settings stays a separate sidebar item. |
| ☐ | NAV-16 | P2 | Head-only account | View each page at widths 360, 768 and 1280 px. | No horizontal page scroll (verified at 375 px on Students). Tables switch to labelled stacked rows at narrow widths. Dialogs fit the viewport (scroll inside when tall). Buttons stay reachable. |
| ☐ | NAV-17 | P2 | Network blocked or API returning errors | Open each of the ten pages. | While loading each page shows "Loading ‹label›…" (transfers, curricula, equivalencies, outside credits, students, adviser assignments, academic terms, department reports, the audit log, settings). On failure shows "We couldn't load ‹label›." with the message and a **Try again** button that reloads data once the network is restored. |
| ☐ | NAV-18 | P3 | Head-only account | Click Change Password from the account menu, then use the sidebar to return to a Department Head page. | The password page keeps the Head shell (sidebar, top bar). Returning through the sidebar works. Note that the sidebar item "Settings" and the breadcrumb "Settings" on the password page can be confused (see NAV-15). |

### NTF: Notifications

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | NTF-01 | P1 | Head has unread notifications (the standard mock Head account has none: seed some first) | Look at the bell in the top bar. | Bell's accessible name is "Notifications, N unread" (just "Notifications" when there are none) and a red count badge shows N. With no unread items there is no badge. |
| ☐ | NTF-02 | P2 | Unread notification with a Department Head target (for example a transfer) | 1. Open the bell.<br>2. Click the item. | Popover shows the heading "Notifications", "Mark all as read", the list (title, time, unread dot) and "See all notifications". Clicking the item opens the target page inside the Head shell. Sidebar and breadcrumb stay Department Head. |
| ☐ | NTF-03 | P1 | Notification whose target route belongs to another role or is external | Open it from the bell and from the inbox. | Inbox shows "No available destination" with no Open link. In the bell the item has no allowed destination, so clicking it only goes to the notifications page; it never opens the unauthorized route. |
| ☐ | NTF-04 | P2 | Bell open | Choose "See all notifications". | Opens `/notifications` (not `/department-head/notifications`) with the heading "Notifications" and the same list as the Head inbox. With no notifications both show "You are all caught up." (verified). |
| ☐ | NTF-05 | P2 | Unread notifications | Use "Mark all" from the bell. | All items become read, badge clears, and it stays cleared after reload. |
| ☐ | NTF-06 | P2 | Open `/department-head/notifications` | Read the page. | Heading "Notifications". Subtitle "N unread of M notifications." Filter buttons "All" and "Unread (N)". "Mark all as read" button. List items show icon, title, body, time and "Open" link where allowed. |
| ☐ | NTF-07 | P2 | Mixed read and unread items | Click "Unread (N)", then "All". | Unread view lists only unread items and panel title "Unread notifications". All view lists everything under "All notifications". Active filter button is highlighted. |
| ☐ | NTF-08 | P1 | Two unread items | Click "Mark read" on one. | That item loses its unread dot and button. Count becomes N−1 in the subtitle, the filter and the bell. Other item remains unread. Persists on reload. |
| ☐ | NTF-09 | P2 | Unread items | Click "Mark all as read". | All items become read. Button becomes disabled when nothing is unread. In Unread view shows "You are all caught up." |
| ☐ | NTF-10 | P3 | No notifications (the standard mock Head account) | Open the bell and the inbox. | Bell and inbox show "You are all caught up." Inbox subtitle "0 unread of 0 notifications." "Mark all as read" is disabled. No error (verified). |
| ☐ | NTF-11 | P2 | **[Fault injection]** mark-read request fails | Click "Mark read". | Alert shows the server message. The item stays unread. No count change. |
| ☐ | NTF-12 | P2 | Mark items read | Reload the page and open another browser as the same user. | Read state persists on the server for the same user and does not affect other users. |
| ☐ | NTF-13 | P1 | Adviser endorses a transfer request (**[Cross-portal]**) | 1. Sign in as Head.<br>2. See the unread transfer message.<br>3. Open it.<br>4. Go back and "Mark all as read". | Message arrives. It opens Curriculum transfers with the Head shell kept. Pending queue shows the request. Unread count and read state persist. |
| ☐ | NTF-14 | P3 | 1,000 or more notifications | Open the inbox. | Subtitle reads "Showing the latest 1000 notifications; N unread in this list." Bell hides the exact unread count. |
| ☐ | NTF-15 | P3 | Head-only account | Open `/department-head/notifications` and read the breadcrumb. | Verified: the breadcrumb shows only "Department Head" with no "Notifications" crumb, while `/notifications` shows "Department Head › Notifications" (**Observe**). |

### TRF: Curriculum transfers

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | TRF-01 | P1 | Pending and historical requests exist | Open Curriculum transfers. | Heading "Curriculum transfers" with subtitle "Review adviser-endorsed requests to move students to another curriculum." Three stat tiles: "Pending review" (note "Requests endorsed by advisers"), "Approved" ("All recorded decisions"), "Rejected" ("Decisions include a reason"). Tabs "Pending review (N)" and "Decision history (N)". Pending tab is active. |
| ☐ | TRF-02 | P2 | As TRF-01 | Compare tile and tab counts with the lists. | Pending tile = pending tab count = pending rows. Approved + Rejected = history tab count. Approved and Rejected tiles equal the number of "Approved" and "Rejected" badges in history. |
| ☐ | TRF-03 | P1 | Pending requests | Inspect the pending table. | Columns: Student (name plus mono student ID), Current curriculum, Requested curriculum, Adviser (the endorsing adviser), Submitted (dd Mmm yyyy), Actions ("Review request →"). Footer "N request(s) awaiting a decision" (singular "request" when 1) and "DCST department scope". Advisory note under the table: "Requests originate from the student's adviser. Approved transfers use the equivalencies defined for the curriculum pair." |
| ☐ | TRF-04 | P3 | No pending requests | Open the pending tab. | Empty message "No transfer requests currently awaiting review." Footer "0 requests awaiting a decision". |
| ☐ | TRF-05 | P1 | Pending request | Click "Review request →". | Dialog "Review curriculum transfer" shows: student name and ID, badge "Pending review", "Endorsed by" adviser, "Submitted" date, Current curriculum → Requested curriculum, "Adviser's reason for transfer" text, a "Decision reason" textarea (placeholder "Enter a reason for this decision"), buttons Cancel, Reject request, Approve request. All values match the selected row. |
| ☐ | TRF-06 | P2 | Review dialog open | 1. Type a reason.<br>2. Close with Cancel, then reopen the same request.<br>3. Repeat with X and Esc. | Nothing is saved. Request stays in the pending queue. Reopened dialog has an empty reason and no error. |
| ☐ | TRF-07 | P1 | Valid pending request | 1. Enter a decision reason.<br>2. Click "Approve request".<br>3. Refresh. | Toast "Request for ‹student› approved." Dialog closes. Request leaves the pending tab, counts update, and a single "Approved" history row appears with decision date and the reason. Persists after refresh. |
| ☐ | TRF-08 | P2 | Valid pending request | Approve with the reason left empty. | Approval succeeds (reason is optional for approval). History shows the decision with "—" in Decision reason. |
| ☐ | TRF-09 | P1 | Review dialog open | Leave reason empty and click "Reject request". | Error under the field: "Add a decision reason to reject the request." (verified). Field is marked invalid. Request is not rejected, dialog stays open. |
| ☐ | TRF-10 | P2 | As TRF-09 | 1. Enter only spaces and click Reject.<br>2. Type a letter. | Spaces count as empty, so the same error appears. Typing real text clears the error immediately. |
| ☐ | TRF-11 | P1 | Review dialog open | Enter a reason and click "Reject request". | Toast "Request for ‹student› rejected." Request leaves the pending queue. History shows a "Rejected" row with date and the exact reason. Student's current curriculum is unchanged. |
| ☐ | TRF-12 | P3 | Review dialog open | Type or paste more than 2,000 characters into Decision reason. | Textarea keeps only 2,000 characters (verified with 2,100). A 2,000-character reason saves successfully. |
| ☐ | TRF-13 | P2 | Slow connection (throttle) | Click Approve and quickly click again or click Reject. | Both decision buttons and Cancel are disabled while saving. The dialog cannot be dismissed. Only one decision is recorded. |
| ☐ | TRF-14 | P2 | **[Fault injection]** decision request fails | Click Approve. | The server message (or "The decision could not be saved.") appears in red inside the dialog. Dialog stays open, the typed reason is kept, buttons re-enable, request stays pending. |
| ☐ | TRF-15 | P2 | Pending list | Press Tab to reach "Review request →" and activate with Enter. In the dialog tab through controls and press Esc. | All controls are keyboard reachable. Focus stays inside the dialog and returns to the page on close. |
| ☐ | TRF-16 | P2 | History exists | 1. Click "Decision history (N)".<br>2. Check the URL.<br>3. Refresh.<br>4. Click "Pending review". | URL gains `?history=1`. History tab persists on refresh. Returning to Pending removes the parameter. |
| ☐ | TRF-17 | P1 | History exists | Inspect the history table. | Columns: Student, "Curriculum transfer" (From → To), Adviser, Decision (green "Approved" or red "Rejected" badge with "· date"), "Decision reason" ("—" if none). Panel description "N recorded decisions." Footer "N decisions of N" and "DCST department scope". Tile counts match. With exactly one decision the wording is "1 recorded decisions." and "1 decisions of 1" (verified; grammar **Observe**). |
| ☐ | TRF-18 | P3 | Empty history | Open the history tab. | "No transfer decisions have been recorded." Tiles show 0 for Approved and Rejected. |
| ☐ | TRF-19 | P3 | Requests whose student, curriculum or adviser record cannot be resolved | Open pending and history. | Missing values show "Unknown student", "Unknown curriculum" or "Unknown adviser". Nothing crashes. |
| ☐ | TRF-20 | P1 | Approved request | After TRF-07 open Students and the student's record Checklist. | Student's curriculum in the directory is the requested curriculum. Exactly one active curriculum. Previous assignment and earlier attempts remain in history. Credits that match the pair's equivalencies are applied once, with no duplicate units. |
| ☐ | TRF-21 | P2 | Approved request | Open Curricula for both versions and Department reports. | "Enrolled students" on the old version decreases by one and on the new one increases by one. Reports curriculum counts reflect the move. |
| ☐ | TRF-22 | P1 | Transfer for a student with a passed course that is **not** mapped in the pair's equivalencies | Approve, then open the student's checklist. | Only identical courses or explicitly mapped equivalencies are satisfied. No credit is given because of similar codes or titles. The unmapped course stays unsatisfied or is shown as it was. |
| ☐ | TRF-23 | P1 | Reject a request | After TRF-11 open the student's record and Students directory. | Curriculum, adviser and checklist are unchanged. Rejection reason appears only in history. |
| ☐ | TRF-24 | P1 | **[Multi-session]** same pending request open in two Head sessions | 1. Approve in session A.<br>2. In session B (still showing it as pending) click Approve or Reject.<br>3. Refresh B. | Only session A's decision exists. Session B shows an error in its dialog (already decided) and, after refresh, the request is in history once. No second transition or duplicate history entry. |
| ☐ | TRF-25 | P1 | **[Fault injection]** failure while the transfer is closing the old assignment, creating the new one or writing the audit entry | Approve, force the failure, then retry. | No half-transfer: the student keeps exactly one curriculum, no history is lost, and request status is consistent. After the retry succeeds the result matches TRF-20. |
| ☐ | TRF-26 | P1 | **[API]** transfer request belonging to another department | As DCST Head, call the decision endpoint and read endpoints with the other department's request ID. | Request is absent from the list. The decision call is rejected. Record stays unchanged. |
| ☐ | TRF-27 | P3 | More than 100 requests exist | Open the page. | All requests load across pages (counts and rows are complete, ordered newest first). |
| ☐ | TRF-28 | P2 | Approve or reject | Open Audit log. | A "Change" entry exists for the decision with the Head as actor, the student and transfer details. |
| ☐ | TRF-29 | P3 | Pending request whose requested curriculum is retired or draft | Review and approve. | Behaviour follows the API rules: either success per TRF-20 or a clear error in the dialog (TRF-14). Record the outcome. |
| ☐ | TRF-30 | P3 | One pending request and one decision | Read counts and dates on both tabs. | Wording is correct for one item. Verified issues: "1 recorded decisions." and "1 decisions of 1" (grammar). Submitted dates read "01 Sept 2026" while other pages abbreviate September as "Sep" (**Observe**). |

### CUR: Curricula

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | CUR-01 | P1 | Multiple versions | Open Curricula. | Heading "Shape the path to graduation." with "Add version" button. "Curriculum version" selector lists every version as "‹PROGRAM› · ‹label›". First version is selected. Toolbar: Edit version, Delete version, Add term, New course. Four tiles: Required units, Enrolled students, Effective from, Status. One panel per term titled "Year N · Semester X" with the description "Positional curriculum term; not a calendar school term." |
| ☐ | CUR-02 | P1 | Multiple versions with different data | Switch between versions in the selector. | Tiles and term panels change to the selected version each time. Units, enrolled count, effective date (d Mon yyyy), status text (active, draft or retired) and terms match that version. |
| ☐ | CUR-03 | P2 | A version without terms; a term without courses; no versions at all | View each state. | "This version has no terms yet. Use Add term to start." / "No courses in this term yet." / "No curriculum versions yet. Use Add version to create one." with Edit, Delete, Add term and New course disabled and selector disabled when no versions. |
| ☐ | CUR-04 | P1 | Unique academic year not yet used | 1. Click "Add version".<br>2. Keep default program and units 147.<br>3. Enter Academic year and Effective from.<br>4. Click "Add version". | Dialog "Add version" shows Program (first program), Academic year (placeholder 2023–2024), Required units 147, Effective from, Status (default "draft"). Toast "‹PROG› · ‹year› was saved." Dialog closes, the new version is selected and shown with correct values, terms empty. Persists after refresh. |
| ☐ | CUR-05 | P2 | As CUR-04 | Create versions with Status "active" and "retired" and every Program option. | Each version saves with the chosen status and program and shows that status in the Status tile. |
| ☐ | CUR-06 | P2 | Add version dialog | Leave Academic year empty or spaces and submit. | Error "Enter the academic year, for example 2023–2024." No record created. |
| ☐ | CUR-07 | P2 | Add version dialog, year filled | Try Required units: `0`, `-5`, empty, `abc`. | Each shows "Required units must be a positive number." |
| ☐ | CUR-08 | P2 | Add version dialog, year and units filled | Clear Effective from and submit. | Error "Choose the date this version takes effect." |
| ☐ | CUR-09 | P2 | Existing version "BSCS · 2024-2025 v1" | Add another BSCS version with academic year `2024-2025 v1` (also try with extra leading/trailing spaces). | Error "BSCS · 2024-2025 v1 already exists." Same label for the other program is allowed. |
| ☐ | CUR-10 | P3 | Add version dialog | Enter units such as `147.5`. | Verified: the form accepts it, saves it and the Required units tile shows 147.5. Confirm with the team whether decimals are allowed (**Observe**). |
| ☐ | CUR-11 | P2 | **[Fault injection]** create fails | Submit a valid version. | Server message shown in the dialog alert. Dialog stays open with values kept. No new version. |
| ☐ | CUR-12 | P1 | Selected version | 1. Click "Edit version".<br>2. Change units, effective date and status.<br>3. Save. | Dialog "Edit version" is pre-filled with the current values. "Save changes" shows toast "‹PROG› · ‹year› was saved." Tiles reflect the new values. Persists after refresh. |
| ☐ | CUR-13 | P2 | Edit version dialog | Save with no changes. | Succeeds. The version does not conflict with itself. |
| ☐ | CUR-14 | P2 | Edit version dialog | Change Academic year to one that another version of the same program already uses. | Error "‹PROG› · ‹year› already exists." Original not changed. |
| ☐ | CUR-15 | P2 | Edit version dialog | Change the **Program** dropdown and save. | **Observe:** verify the version's program, label and prefix stay consistent after refresh (the code sends a new label but no program change). |
| ☐ | CUR-16 | P2 | Add or edit dialog with typed values | Cancel, or close with X or Esc, then reopen. | Nothing saved. Reopened dialog is reset (add: defaults; edit: current stored values). |
| ☐ | CUR-17 | P2 | Version with no dependants (new draft) | 1. Click "Delete version".<br>2. Read the dialog.<br>3. Cancel.<br>4. Repeat and confirm. | Dialog "Delete record": "Delete ‹PROG · label› and all of its terms? This can't be undone." Cancel keeps the version. Confirm deletes it, selection moves to the first remaining version and toast "‹PROG · label› was deleted." |
| ☐ | CUR-18 | P1 | Version with enrolled students | Click Delete version. | Dialog shows alert "Students are assigned to this curriculum. Retire it to preserve existing records." The Delete button is disabled. |
| ☐ | CUR-19 | P1 | Version referenced by a transfer request or equivalence rule, no students | Click Delete version. | Alert "This curriculum is referenced by curriculum transfer requests and/or course equivalence rules. Retire it to preserve existing records." Delete disabled. |
| ☐ | CUR-20 | P1 | Version with a slot used by academic history | Click Delete version. | Alert "This curriculum contains slots used by academic history. Retire it to preserve those records." Delete disabled. |
| ☐ | CUR-21 | P2 | Version, no terms yet | Click "Add term". | Dialog "Add term" with Year level 1–5 (default 1) and Term "Semester 1", "Semester 2", "Midyear". |
| ☐ | CUR-22 | P1 | As CUR-21 | Choose year and term and click "Add term". | Toast "Year N · ‹term› was saved." A panel appears, ordered by year then term, showing "No courses in this term yet." Persists after refresh. |
| ☐ | CUR-23 | P2 | Version already has Year 1 · Semester 1 | Add the same year and term again. | Error "Year 1 · Semester 1 already exists in this version." Same year and term in another version is allowed. |
| ☐ | CUR-24 | P2 | Existing term | 1. Click "Edit term".<br>2. Change year or term.<br>3. Save. | Dialog "Edit term" is pre-filled. Toast "Year N · ‹term› was saved." Panel title and order update. Saving unchanged values succeeds. Changing to a slot already used by another term gives the duplicate error. |
| ☐ | CUR-25 | P2 | Term with courses and no academic history | 1. Click "Delete term".<br>2. Cancel.<br>3. Repeat and confirm. | Dialog "Delete Year N · ‹term› and its N course(s)?" Cancel keeps it. Confirm removes the term and its rows only. Toast "The term was deleted." |
| ☐ | CUR-26 | P1 | Term containing a slot with academic history | Click "Delete term" on it. | Alert "This term contains slots used by academic history." Delete disabled. |
| ☐ | CUR-27 | P1 | Referenced version with only one term | Click "Delete term". | Alert "A referenced curriculum must retain at least one term." Delete disabled. |
| ☐ | CUR-28 | P1 | Term panel | Click "Add course / slot", enter name, keep units 3 and type "Required course", then Add. | Dialog "Add course / slot" with Course / slot, Required units (default 3), Type (Required course, Elective slot, GE slot). Toast "‹name› was saved." Row appears with units and type. Persists after refresh. |
| ☐ | CUR-29 | P2 | Add slot dialog | Submit with empty name or spaces. | Error "Enter the course or slot name." |
| ☐ | CUR-30 | P2 | Add slot dialog | Try units `-1`, empty, `abc`; then `0`. | Negative, empty and non-numeric give "Required units must be zero or more." Zero is accepted and saved. |
| ☐ | CUR-31 | P2 | Add or edit slot dialog | Save one slot of each Type. | Each saves and shows the chosen type in the Type column. |
| ☐ | CUR-32 | P2 | Existing row | Click "Edit", change name, units and type, Save. | Dialog "Edit course / slot" pre-filled. Toast "‹name› was saved." Row updates. For a row that shows a real course (code — title) confirm that the edited name is displayed after refresh (**Observe**). |
| ☐ | CUR-33 | P2 | Row with no academic history and siblings in the term | Click row "Delete", read, Cancel, then confirm. | Dialog "Delete ‹name› from Year N · ‹term›?" Cancel keeps it. Confirm removes only that row, toast "The course was removed." |
| ☐ | CUR-34 | P1 | Row with academic history; and last row of a term in a referenced curriculum | Click Delete on each. | "This slot is used by academic history." and "Each term in a referenced curriculum must retain at least one slot." respectively. Delete disabled. |
| ☐ | CUR-35 | P1 | Version selected | Click "New course". | Dialog "New course": Course code, Course title, Units (3), Curriculum (current version), Term (15 options "Year 1 · Semester 1" … "Year 5 · Midyear"), Course type (Non-Elective, Elective). |
| ☐ | CUR-36 | P2 | New course dialog | Submit with empty code, empty title (separately), and units `-1`, empty, `abc`. | "Enter the course code, for example CSIT 100." / "Enter the course title." / "Units must be zero or more." No record created. |
| ☐ | CUR-37 | P2 | Course code already used (also with different letter case) | Submit a duplicate code. | Error "‹code› already exists. Course codes must be unique." |
| ☐ | CUR-38 | P1 | New unique course; term that exists and term that does not yet exist | Add the course to each. | Toast "‹code› was added to ‹PROG · label›, ‹term›." Course row "‹code› — ‹title›" appears under the right term with chosen units. A missing term is created automatically. The target curriculum becomes the selected version. |
| ☐ | CUR-39 | P2 | New course dialog | Choose type Elective, and separately Non-Elective. | Elective course appears with type "Elective slot". Non-Elective appears as "Required course". |
| ☐ | CUR-40 | P2 | New course targeting a different curriculum than the selected one | Pick another Curriculum and add. | Course is added to the chosen curriculum, and the page switches to it. The originally selected version is unchanged. |
| ☐ | CUR-41 | P2 | Any dialog | Press Enter in a text field. | Form submits and validates the same as clicking the confirm button. |
| ☐ | CUR-42 | P3 | Slow connection | Click a confirm button twice quickly (Add version, Add term, Add). | Only one record is created (**Observe**: confirm buttons are not disabled while saving). |
| ☐ | CUR-43 | P2 | **[Fault injection]** any catalog write fails | Try add term, add slot, delete. | Server message appears in the dialog alert, dialog stays open, data is unchanged. |
| ☐ | CUR-44 | P3 | Page loading and server error | Block the network and open the page. | "Loading curricula…" then "We couldn't load curricula." with Try again. |
| ☐ | CUR-45 | P1 | **[Cross-portal]** Student or Adviser account | After the Head creates, edits or deletes curriculum items, sign in as Adviser or Student. | Their checklist and curriculum views show the saved structure. They cannot reach the Curricula page or its write APIs (**[API]**). |

### EQV: Equivalence

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | EQV-01 | P1 | Pair with mappings exists | Open Equivalence. | Heading "Equivalence" with subtitle "Define one-to-one course equivalencies between curriculum versions." Advisory about pairs and credit counted once. Panel "Curriculum equivalencies". The From and To selectors start on a pair that has mappings (otherwise the first two curricula). Table columns: Old course subject (code and title), Units, Equivalent course subject, Units, Curriculum pair ("From → To"), Status ("Equivalent"), Actions (Delete). Footer "N course equivalencies" and "DCST department scope". |
| ☐ | EQV-02 | P1 | Pairs with and without mappings | 1. Change "From curriculum" and "To curriculum".<br>2. Return to the first pair. | Rows change with the pair and count updates. A pair without mappings shows "No equivalencies recorded for this pair." and "0 course equivalencies". Returning restores the earlier rows. |
| ☐ | EQV-03 | P3 | No curricula or no courses exist | Open the page. | "Add course equivalence" is disabled. |
| ☐ | EQV-04 | P2 | Pair selected on the page | Click "Add course equivalence". | Dialog "Add course equivalence" with From and To curricula pre-set to the current pair, Old course subject (first course) and Equivalent course subject (second course). Options read "‹code› · ‹title› · ‹units› units". Note: "One-to-one equivalence applies to this curriculum pair only. Units are counted once." |
| ☐ | EQV-05 | P1 | Courses not yet mapped in the pair | Choose unmapped source and target and click "Add equivalence". | Toast "Added equivalence for ‹source code› → ‹target code›." Dialog closes. Page selects the pair used and the new row shows both courses, units and "Equivalent". Footer count increases. Persists after refresh. |
| ☐ | EQV-06 | P1 | Source course already mapped in the pair | Reuse the mapped source with a different target. | Error "A selected course is already mapped in this curriculum pair. Choose courses without an existing mapping in this pair." No change. |
| ☐ | EQV-07 | P1 | Target course already mapped in the pair | Reuse the mapped target with a different source. | Same error. No change. |
| ☐ | EQV-08 | P2 | Course mapped in pair A | Map the same source and target courses in a different curriculum pair B. | Allowed. Conflicts are checked within a pair only. |
| ☐ | EQV-09 | P2 | Existing mapping | Add the exact same mapping again. | Rejected with the conflict error. Only one row remains. |
| ☐ | EQV-10 | P3 | Add dialog | Pick the same course as source and target. | Observe and record the result (the data set may already contain such a mapping). |
| ☐ | EQV-11 | P3 | Add dialog showing an error | Change any selector. | Error message clears. |
| ☐ | EQV-12 | P2 | **[Fault injection]** create fails | Submit a valid mapping. | Server message in the dialog alert. Dialog stays open with all selections retained. No row added. |
| ☐ | EQV-13 | P2 | Slow connection | Submit and watch the dialog. | Fields, Cancel and the close button are disabled while saving. Dialog cannot be closed. Only one record is created. |
| ☐ | EQV-14 | P2 | Add dialog with selections | Cancel, X or Esc, then reopen. | Nothing saved. Reopening resets to the current pair and default courses. |
| ☐ | EQV-15 | P1 | Existing mapping | 1. Click Delete on a row.<br>2. Read the dialog.<br>3. Cancel.<br>4. Repeat and click "Delete equivalence". | Dialog "Delete course equivalence": "Remove the rule mapping ‹source› to ‹target›? Existing student credit decisions are preserved." Cancel keeps the row. Confirm shows toast "Course equivalence deleted.", the row disappears, count updates, empty state shows if last. |
| ☐ | EQV-16 | P2 | **[Fault injection]** delete fails | Confirm deletion. | Button shows "Deleting…" then the server message in red. Dialog stays and the row remains. Dialog cannot be closed while deleting. |
| ☐ | EQV-17 | P2 | Existing student credits that came from the mapping | Delete the mapping, then open that student's checklist. | The student's existing credit decisions remain intact. |
| ☐ | EQV-18 | P3 | Screen reader or accessibility tool | Inspect each Delete button. | Accessible name "Delete equivalence ‹source› to ‹target›". |
| ☐ | EQV-19 | P1 | Pair with mapping; student transferring who has passed the source course | 1. Create the mapping only.<br>2. Check the student's checklist.<br>3. Approve their transfer request (TRF).<br>4. Check the checklist again. | The mapping alone grants no credit. After the approved transfer the mapped requirement is satisfied once by an equivalence, with no synthetic attempt and no duplicate units. (Student-specific application of equivalencies is outside the Department Head pages; verify it from the Adviser portal.) |
| ☐ | EQV-20 | P3 | Page loading and server error | Block the equivalence read and open the page. | "Loading equivalencies…" then an error with Try again. After the network returns, Try again loads the data. |
| ☐ | EQV-21 | P3 | More than 100 courses, curricula or mappings | Open the page and Add dialog. | All items are available in selectors and the table (complete data, not truncated). |
| ☐ | EQV-22 | P2 | Mapping added or deleted | Open Audit log. | A "Change" event with the Head as actor is recorded. |

### CRD: Outside credits

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | CRD-01 | P1 | Existing outside credits | Open Outside credits. | Heading "Outside credits", subtitle "Review credited subjects for shiftees and transferees in your department." Button "Credit a course". Three tiles: "Credited subjects" ("Active outside credits"), "Students with outside credits" (note "N transferee(s) · N shiftee(s)"), "Units recognized" (note "Across N curricul(um/a)"). Table "Outside credit records". |
| ☐ | CRD-02 | P2 | Known data | Compute the tiles by hand from the table. | Credited subjects = rows. Students = distinct students. Transferee and Shiftee counts = distinct students per type. Units recognized = sum of credited units. Curricula = distinct target curricula. Singular and plural wording is correct (for example "1 transferee", "1 curriculum"). |
| ☐ | CRD-03 | P2 | Existing records | Inspect the table. | Columns: Student (name, ID), "Original course / units" (code · title, units), "School / origin", Grade, "Equivalent subject / units" (code · title, units · target curriculum), Type (Transferee or Shiftee badge). Footer "N credited subject(s)" and "DCST department scope". Revoked credits are not listed. |
| ☐ | CRD-04 | P3 | No credits | Open the page. | "No outside credits have been recorded." Tiles show 0. |
| ☐ | CRD-05 | P1 | Page open | Click "Credit a course". | Dialog "Credit an outside course" with Student, Entry type (default Transferee), Original course code, Original course name, Units, Grade, School / degree of origin, Equivalent course (hint "Pick the course in the student's curriculum that this credit replaces."), Reason; Cancel and "Credit course". |
| ☐ | CRD-06 | P1 | Dialog open | Submit completely empty (reason as spaces). | Errors in order: "Choose a student." / "Enter the original course code." / "Enter the original course name." / "Enter units as a whole number of 1 or more." / "Enter a passing grade from 1.00 to 3.00 with two decimal places." / "Enter the school or degree of origin." / "Choose an equivalent course." / "Enter the reason for crediting the course." Nothing saved. |
| ☐ | CRD-07 | P2 | Dialog filled except the field under test | Try Units: `0`, `-1`, `1.5`, empty, `abc`, `1`, `12`. | The first five show "Enter units as a whole number of 1 or more." Whole numbers 1 and above are accepted. |
| ☐ | CRD-08 | P1 | As CRD-07 | Try Grade: `0.99`, `3.01`, `5.00`, `1.5`, `1`, `A`, `4.00`, empty. Then `1.00`, `1.25`, `2.75`, `3.00`. | The first group shows "Enter a passing grade from 1.00 to 3.00 with two decimal places." The second group is accepted. Boundaries 1.00 and 3.00 save. |
| ☐ | CRD-09 | P3 | As CRD-07 | Enter code over 100 characters, course name or school over 250, reason over 2,000. | Each shows "Use at most N characters." |
| ☐ | CRD-10 | P1 | Student with curriculum A and another with B | 1. Select the first student and open Equivalent course.<br>2. Change to the second student. | Equivalent course lists only slots of the selected student's curriculum, as "‹code› · ‹title› · ‹units› units". Changing the student clears the chosen course. |
| ☐ | CRD-11 | P1 | Student has credit for a course from an origin | Credit the same original code from the same origin again, using different capitalisation and extra spaces. | Error under the code: "This student already has credit for this course from this origin." No record added. The same code from a different origin is allowed. |
| ☐ | CRD-12 | P1 | Slot already has an outside credit for the student | Credit a different source course into the same slot. | Error under the equivalent course: "This slot already has an outside credit." |
| ☐ | CRD-13 | P1 | Valid new credit | Fill every field correctly (try both Entry types) and click "Credit course". | Toast "Credited ‹code› for ‹student›." Dialog closes. New row shows all values and the matching Type badge. Tiles and footer update. Persists after refresh. |
| ☐ | CRD-14 | P1 | After CRD-13 | Open Students → that student's record → Checklist. | The destination requirement is satisfied once with the source shown as outside credit and units counted once in the term and total units. |
| ☐ | CRD-15 | P2 | **[Fault injection]** or API rejects the credit | Submit a valid credit. | Button shows "Saving…" and is disabled. The server message appears under Reason. All entered values stay. Row count is unchanged. Only one request was sent even if clicked repeatedly. |
| ☐ | CRD-16 | P2 | Dialog with typed values | Cancel, X or Esc, then reopen. | Nothing saved. The reopened dialog is empty and shows defaults. |
| ☐ | CRD-17 | P1 | Source units lower than destination units (and an equal/higher case); discontinued destination | Submit each combination. | Rules from the API apply: an inadequate (under-unit) or discontinued replacement is rejected with the message in the dialog. An eligible one is accepted and keeps provenance (original code, school, grade, units). The page itself does not compare units: record the outcomes. |
| ☐ | CRD-18 | P2 | Page loaded | Search for edit or revoke controls. | No edit, revoke or delete controls exist on this page. |
| ☐ | CRD-19 | P2 | Keyboard only | Open, fill and submit the dialog with keyboard. | All fields are reachable. Errors are announced (alerts). Esc closes. |
| ☐ | CRD-20 | P2 | Credit saved | Open Audit log. | A "Change" event with the Head as actor, the student and the credit details. |
| ☐ | CRD-21 | P3 | More than 100 slots, courses or credits | Open the page and dialog. | All students, slots and records are available (no truncation). |
| ☐ | CRD-22 | P3 | Page loading and server error | Block the network. | "Loading outside credits…" then error with Try again. |

### STU: Students directory and record

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | STU-01 | P1 | Department has students | Open Students. | Heading "Students" with subtitle "Find and review students across the Department of Computer Science and Technology." and an "Import spreadsheet" button. Panel "Department directory" with description "N enrolled students · BSCS and BSIT · AY 2025–2026, 1st semester". Table columns: Student (name, ID), School email, Curriculum badge, Year standing, Adviser. Count line "Showing N of N students". |
| ☐ | STU-02 | P2 | Directory loaded | Search by full name, part of a name, different capitalisation and with leading/trailing spaces. | Matching rows only, count updates ("Showing X of N students"). |
| ☐ | STU-03 | P2 | Directory loaded | Search by full student number and by part of it (for example `26-1`). | Matching students only. |
| ☐ | STU-04 | P2 | Directory loaded | Open the Curriculum filter and pick one curriculum, then "All curricula". | Options are "All curricula" plus each curriculum alphabetically. Rows and counts match each selection. |
| ☐ | STU-05 | P2 | Directory loaded | Open the Adviser filter and pick an adviser, an unassigned option if it exists, and "All advisers". | Rows and counts match. Students without an adviser appear under "Unassigned". |
| ☐ | STU-06 | P2 | Directory loaded | Combine search, curriculum and adviser filters. | Results satisfy all conditions at once (AND). |
| ☐ | STU-07 | P2 | Directory loaded | Apply a combination with no match. | "No students match these filters." with "Change your search or reset the filters." and "Showing 0 of N students". |
| ☐ | STU-08 | P2 | Filters applied | 1. Check "Reset filters" before filtering.<br>2. Apply filters, click it. | Disabled when no filter is active. After reset search is empty, both dropdowns show "All curricula" and "All advisers", and all students show. |
| ☐ | STU-09 | P1 | Directory loaded | Click a student row, then close and click the student's name button. | Both open the dialog "‹name› · Student record". Description "‹student number› · ‹curriculum› · ‹year standing›". Tabs "Checklist", "Grades", "Audit log"; "Close" button. |
| ☐ | STU-10 | P2 | Directory loaded | Tab to a student name button and press Enter, then Space. | Dialog opens by keyboard. Esc closes and focus returns to the page. |
| ☐ | STU-11 | P1 | Student with grades | Open Checklist tab. | Requirements are grouped under collapsible headers "Year N · Semester N" (plus "Other requirements" if needed), sorted, all open by default. Header shows "Passed units x/y" and "Total units". Table columns: Requirement (code and title), Units earned / required, Status (Passed, INC, Enrolled, Not taken and so on), Satisfaction source (for example "Direct", "Direct attempt", "Outside credit", "Not yet satisfied"), Attempts ("N attempt(s)"), Course info button. |
| ☐ | STU-12 | P2 | Checklist open | Click "Course info" on a row with attempts and on one without. | Dialog "‹code› · ‹title›" with a meta line (units · category · year and semester), "Status:" badge and attempt count. With attempts: table Attempt, Term, Midterm, Final, Completion, Instructor, Result. Without: "No attempts recorded yet." "Grade fix history" lists "date · old → new" or "No grade fixes recorded." Closing returns to the record dialog. |
| ☐ | STU-13 | P2 | Student with grades and one without | Open Grades tab. | One section per term titled "‹school year› · ‹term type›" (for example "2026 - 2027 · 1st Semester") with "GWA x.xx" ("—" if none). Rows show Course (code, title), Units, Midterm, Final (completion grade if present), Result badge. Grades have two decimals; missing show "—". A student without grades shows "No grades have been recorded for this student." |
| ☐ | STU-14 | P2 | Student with and without audit events | Open Audit log tab. | Table (Timestamp, Person, Action, Details) in Manila time, or "No audit events have been recorded for this student." Events agree with the main Audit log filtered by this student. |
| ☐ | STU-15 | P1 | Record dialog | Inspect all tabs and dialogs. | Everything is read-only: no Save, Edit, Record grade or Delete controls. |
| ☐ | STU-16 | P2 | Note the main Audit log count | Open and close a student record with all tabs, then check Audit log. | Verified: opening a record does not add an audit event. Compare with the business rule that record views are logged (the Audit log page says "Record views are logged alongside changes and sign-ins") and report the mismatch (**Observe**). |
| ☐ | STU-17 | P2 | Record open | Close using Close, X and Esc; then open a different student. | The dialog closes each way. The next student's dialog shows only that student's data (no leftover tab state or data). |
| ☐ | STU-18 | P3 | **[Fault injection]** one of the three record requests fails | Open the failing tab. | "We couldn't load the checklist/grades/the audit log." with Try again. Other tabs still work. |
| ☐ | STU-19 | P3 | Students in years 1 to 5+ | Read the Year standing column. | Shows "1st year", "2nd year", "3rd year", "4th year", "5th year" and so on. |
| ☐ | STU-20 | P3 | Long names or emails | View at narrow widths. | Text wraps without overlapping. Email breaks across lines. |
| ☐ | STU-21 | P2 | Page loading and server error | Block the network. | "Loading students…" then error with Try again. The Import spreadsheet button is still visible. |
| ☐ | STU-22 | P1 | **[API]** student of another department | Request that student's checklist, grades or audit through the API using the Head's token. | Access is denied or returns nothing. Other-department students never appear in the directory. |
| ☐ | STU-23 | P2 | Student record open on Checklist | 1. Click a term group header.<br>2. Click it again.<br>3. Collapse every group, then open Course info on a row after re-expanding. | Verified: groups are open by default. Clicking a header hides that group's table and clicking again shows it. Other groups are not affected. Header figures (Passed units, Total units) stay visible while collapsed. |

### IMP: Student spreadsheet import

Template columns: `student_number, full_name, email, program, curriculum, adviser_email, entry_year` (entry_year is optional).

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | IMP-01 | P1 | Students page | Click "Import spreadsheet". | Dialog "Import students from spreadsheet" with notice "Required columns: student name, student ID, school email, program, curriculum, and adviser.", file field "Spreadsheet file" with hint "XLSX or CSV · IDs must follow YY-N-NNNNN (example: 24-1-00124).", file picker limited to `.csv` and `.xlsx`, a "Validation preview" table (Row, Student ID, Result) saying "Choose a spreadsheet to validate its rows.", buttons Cancel and "Import students" (disabled). |
| ☐ | IMP-02 | P2 | Dialog open | Choose `.txt`, `.xls`, `.pdf` (use "All files" in the picker or drag in). Then try `students.CSV`. | Unsupported types are rejected without a preview; legacy `.xls` receives conversion guidance as required by FR-ADM-14. The uppercase `.CSV` extension is accepted. The author reported missing `.xls` guidance in an unidentified build; verify and report any mismatch. |
| ☐ | IMP-03 | P2 | Empty `.csv` | Choose it. | "The file is empty." No preview. |
| ☐ | IMP-04 | P2 | CSV with header only | Choose it. | "The file has no student rows." |
| ☐ | IMP-05 | P1 | CSV missing some required columns | Choose it. | "Missing columns: email, program, curriculum, adviser_email." lists every missing column (verified). |
| ☐ | IMP-06 | P2 | CSV with alias headers | Use `student_id`/`id`/`student_no`, `name`/`student_name`, `school_email`, `program_code`/`degree_program`, `curriculum_label`/`curriculum_version`, `adviser`. | Aliases are recognised and rows validate. |
| ☐ | IMP-07 | P3 | CSV with headers such as `Student Number`, `Full Name`, `ADVISER EMAIL` | Choose it. | Case, spaces and punctuation in headers are normalised and accepted. |
| ☐ | IMP-08 | P2 | CSV without `entry_year` | Choose it. | Accepted. Column is optional. |
| ☐ | IMP-09 | P2 | CSV with quoted fields containing commas and doubled quotes, a BOM, CRLF line endings and blank lines | Choose it. | Fields parse correctly. Blank lines are ignored. Row numbers shown start at 2 for the first student row. |
| ☐ | IMP-10 | P1 | Valid `.csv` (all rows valid) | Choose it. | Each row shows "Ready" (green). Summary "N valid · 0 with errors". Button reads "Import N students" ("Import 1 student" for one) and is enabled. |
| ☐ | IMP-11 | P1 | Valid `.xlsx` | Choose it. | Same as IMP-10. Only the first worksheet is read. Empty rows are skipped. |
| ☐ | IMP-12 | P2 | Corrupt `.xlsx` and password-protected `.xlsx` | Choose each. | "The .xlsx workbook could not be read. Check that it is a valid, unencrypted file." (verified for a corrupt file). |
| ☐ | IMP-13 | P1 | CSV rows with a blank student ID, blank name or blank email | Choose it. | Those rows show "Student ID, name and email are required." (red). |
| ☐ | IMP-14 | P1 | Rows with an unknown program, an unknown curriculum for the program, an unknown adviser email, an adviser from another department or inactive | Choose it. | Row messages: `Unknown program "NOPE".` (verified), `Unknown curriculum "<x>" for <program>.`, `No active department adviser has the email "<x>".` |
| ☐ | IMP-15 | P2 | Row with `entry_year` of `20x6` or `2026.5` | Choose it. | "Entry year must be a whole number." |
| ☐ | IMP-16 | P1 | CSV with mixed valid and invalid rows | Preview it, inspect row messages, then confirm valid rows. | Preview writes nothing. On confirmation the valid rows are imported atomically and invalid rows are rejected with row-specific reasons. If the UI disables import for mixed rows, record the mismatch with FR-ADM-14. |
| ☐ | IMP-17 | P1 | Row with a malformed student ID (not `YY-N-NNNNN`), a duplicate ID inside the file, and an ID that already exists | Choose it. | Invalid rows receive reasons and are rejected; existing students are not changed. Preview writes nothing. Independently valid rows may be confirmed and imported atomically. |
| ☐ | IMP-18 | P3 | Rows that the API marks as warnings | Choose a file that triggers a warning. | The row message is shown in green style with the warning text. It does not block import. |
| ☐ | IMP-19 | P1 | Valid file previewed | Click "Import N students". | While saving: "Importing valid rows…", Cancel and button disabled, dialog cannot be closed. After success: row result "Imported", summary "N imported", button "Import complete" (disabled), toast "Imported N student(s)." (singular for 1). Directory count rises (26 → 27 verified). |
| ☐ | IMP-20 | P1 | After IMP-19 | Close the dialog and look at the directory, Adviser assignments and Reports. | New students appear once each with the right curriculum, adviser and email. Counts increase by N. Importing the same file again flags the existing IDs. |
| ☐ | IMP-21 | P2 | **[Fault injection]** commit request fails | Click Import. | Error shown, nothing imported (no partial rows), button re-enables, and the file can be retried. |
| ☐ | IMP-22 | P2 | A previewed file | Choose a different file, or clear and choose again. | Previous preview, errors and counts reset and are replaced by the new file's results. |
| ☐ | IMP-23 | P2 | Dialog open with a preview | Cancel, X or Esc. | Dialog closes and nothing is imported. Reopening starts empty. |
| ☐ | IMP-24 | P3 | File with several hundred rows | Choose, preview and import. | Preview completes with all rows listed (scrollable). Performance is acceptable. **Observe** whether row limits or lookup limits (advisers, curricula) affect results. |
| ☐ | IMP-25 | P2 | After a successful import | Open Audit log. | A "Change" event exists for the import with the Head as actor. |
| ☐ | IMP-26 | P2 | CSV that has a blank line between data rows (for example header, valid row, blank line, bad row) | Choose it and compare the "Row" numbers with the line numbers in the file. | Row numbers should equal the spreadsheet line numbers. **Verified defect:** blank lines are skipped before numbering, so every row after the blank line is shown one number too low. |

### ASG: Adviser assignments

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | ASG-01 | P1 | Department has students | Open Adviser assignments. | Heading "Adviser assignments" with subtitle "Keep every student connected to an adviser in your department." Advisory "Reassignment takes effect on the selected date. The previous adviser and assignment history remain visible." Panel "Student–adviser assignments" ("Select one or more students to reassign together."). Columns: select checkbox, Student (name, ID, curriculum badge), Current adviser, Since (formatted like "Aug 01, 2024"), Previous adviser. Status "Showing N of N assignments" and "DCST department scope". |
| ☐ | ASG-02 | P2 | Directory loaded | Use search, curriculum and adviser filters and Reset filters. | Behaves like the Students page (STU-02 to STU-08). Empty result shows "No students match these filters." |
| ☐ | ASG-03 | P1 | Directory loaded | Tick one student's checkbox; tick another; untick the first. | Selected count text reads "N student(s) selected" (singular for 1). Selected rows are highlighted. |
| ☐ | ASG-04 | P2 | Directory loaded | Click anywhere on a row (not on the checkbox); then click the checkbox itself. | Row click toggles selection. Clicking the checkbox toggles once (no double toggle). |
| ☐ | ASG-05 | P2 | Directory loaded | Use "Select all visible students". | With none selected the header box is empty. With some selected it shows a mixed state (verified). Clicking while mixed or empty selects all visible rows (verified: "26 students selected"). Clicking when all are selected clears. Disabled if no rows are visible. |
| ☐ | ASG-06 | P1 | No selection | Look at "Reassign selected". | Button is disabled. No dialog can be opened. After selecting one student it becomes enabled. |
| ☐ | ASG-07 | P2 | Students selected | Apply a filter that hides some selected students. | Hidden students are removed from the selection and the count drops. |
| ☐ | ASG-08 | P2 | Filter applied | Use "Select all visible students" then Reset filters. | Only the visible rows were selected earlier. After reset the header box is in the mixed state and the count equals the earlier visible rows. |
| ☐ | ASG-09 | P1 | Students selected | Click "Reassign selected". | Dialog "Reassign selected students" with alert "N selected student(s)", New adviser (placeholder "Choose an adviser"), Effective since (today in Manila by default), Reason for reassignment, note about history, Cancel and "Apply reassignment". |
| ☐ | ASG-10 | P2 | Several selected students share one adviser; another selection has different advisers | Open New adviser each time. | When every selected student has the same adviser that adviser is not offered (verified: Polo is hidden for a Polo-only selection). With different advisers all department advisers are offered. Only active department advisers appear, sorted by name. |
| ☐ | ASG-11 | P1 | Dialog open | Submit with no adviser. | "Choose the new adviser." Dialog stays open. |
| ☐ | ASG-12 | P1 | Adviser chosen | Submit with an empty reason, then spaces only. | "Add a reason for the reassignment." |
| ☐ | ASG-13 | P2 | Adviser and reason set | Clear the Effective since date and submit. | "Choose a valid effective date." |
| ☐ | ASG-14 | P1 | Student whose current assignment began on date D | Set Effective since to the day before D. Then D itself. | Before D: "The effective date cannot precede a selected student's current assignment." On D it is accepted. |
| ☐ | ASG-15 | P1 | Student with an existing scheduled reassignment | Select that student and try another reassignment. | "A selected student already has a scheduled reassignment. Review it before making another change." |
| ☐ | ASG-16 | P2 | Selection where some students already have the chosen adviser | Reassign. | Only students who change are moved. Toast counts only those who changed ("Reassigned N student(s)."). |
| ☐ | ASG-17 | P1 | Dialog open | 1. Choose a future date.<br>2. Read the hint and button.<br>3. Submit. | Hint "A future date schedules the change and keeps the current adviser displayed." Button "Schedule reassignment". Toast "Scheduled reassignment for N student(s)." Row keeps the current adviser and adds "Scheduled: ‹adviser› from ‹date›". |
| ☐ | ASG-18 | P1 | Today's date | Choose adviser, reason, keep today, click "Apply reassignment". | Toast "Reassigned N student(s)." Dialog closes. Selection clears ("0 students selected"). The row shows the new adviser, Since = effective date and Previous adviser = the old adviser. Persists after refresh. |
| ☐ | ASG-19 | P1 | After ASG-18 | Open Students, Audit log and student record. | Students page shows the new adviser. Audit log has an entry "Reassigned to ‹adviser› effective ‹date›" by the Head. |
| ☐ | ASG-20 | P2 | Dialog filled | Cancel (and X, Esc), reopen with the same or other selection. | Assignments unchanged. The reopened dialog is fresh: no adviser, today's date, empty reason, no error. |
| ☐ | ASG-21 | P3 | Page loaded | Check the check boxes and rows for accessibility. | Each checkbox is named "Select ‹student›". Count text is announced politely. |
| ☐ | ASG-22 | P2 | **[Fault injection]** reassignment fails | Submit a valid reassignment. | Server message appears in the dialog. Dialog stays open, values are kept, nothing changes. |
| ☐ | ASG-23 | P2 | Adviser filter on adviser X | Move all of X's students away. | The adviser filter still shows X as selected, "No students match these filters." appears, and Reset filters restores the full list. |
| ☐ | ASG-24 | P2 | Stale page (student removed or changed in another session) | Reassign using the stale selection. | A clear error is shown ("A selected student is no longer in the directory. Select the students again." or the API message). Nothing changes. |
| ☐ | ASG-25 | P3 | Student with no adviser | Look at the row. | Current adviser "Unassigned", Since and Previous adviser show "—". Student can be reassigned. |
| ☐ | ASG-26 | P3 | Page loading and server error | Block the network. | "Loading adviser assignments…" then error with Try again. |
| ☐ | ASG-27 | P1 | Selection includes a student the API treats as ineligible (for example inactive or other department, or backdated) | Confirm the reassignment. | The result is explicit: either the whole request is rejected with a message and no one moves, or per-row outcomes are shown. No silent partial handover. Record which. |
| ☐ | ASG-28 | P1 | Large selection (all visible students) | Reassign all. | Every student moves once. Toast count equals the number who changed. |
| ☐ | ASG-29 | P1 | Student reassigned twice on different dates | Check Since and Previous adviser after each. | One current adviser at a time. Dates are gap-free: the previous assignment ends when the next starts. |
| ☐ | ASG-30 | P3 | Slow connection | Click "Apply reassignment" repeatedly. | One reassignment results (**Observe**: the submit button is not disabled while saving). |

### TRM: Academic terms

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | TRM-01 | P1 | Open and closed terms | Open Academic terms. | Heading "Academic terms" with subtitle "Review semester dates and manage the grade encoding period." Buttons "Export PDF" and "Add a term". Advisory about closing encoding. Panel "Academic term history" ("Encoding windows are tracked separately for each semester.") with columns Academic year, Semester, Term dates, Encoding deadline, Status, action. |
| ☐ | TRM-02 | P2 | Terms with different statuses | Read the table and footer. | Newest term first. Open rows are bold with a "current" Open badge and a "Close encoding" button. Closed rows have a Closed badge and a "View term" link. Dates show "dd Mon – dd Mon yyyy". Deadline shows a date or "—". Footer "N open term(s) · N closed term(s)" with correct singular and plural, and "DCST department scope". |
| ☐ | TRM-03 | P1 | Page open | Click "Add a term". | Dialog "Add academic term" with Academic year (default "2025–2026"), Semester (default "2nd semester"; options "1st semester", "2nd semester", "Midyear"), Start date, Actual end date, Encoding deadline, Encoding status (Open default, Closed). |
| ☐ | TRM-04 | P1 | Dates that make sense for a new semester | Fill valid data (status Open) and click "Add term". | Toast "Added academic term ‹start›–‹end› ‹semester›." Dialog closes. The new term appears at the right chronological position, shown Open with correct dates and deadline. Persists after refresh. Footer counts update. |
| ☐ | TRM-05 | P2 | Add dialog | Create one term for each semester option. | Each saves with the right semester label (Midyear shows as "Midyear"). |
| ☐ | TRM-06 | P1 | Add dialog | Create a term with Encoding status "Closed". | Term is created and closed in one flow. It shows Closed with a View term link. |
| ☐ | TRM-07 | P2 | Add dialog | Enter academic year in wrong forms: `2025`, `2025/2026`, `20252026`, text. Then `2025-2026` (hyphen) and `2025–2026` (en dash). | Wrong forms show "Enter the academic year as 2025–2026." Both dash types are accepted. |
| ☐ | TRM-08 | P2 | Add dialog | Clear Academic year and submit with other fields valid. | **Observe:** a blank year silently becomes "2025–2026". Record whether a term is created for that year. |
| ☐ | TRM-09 | P2 | Add dialog | Leave start, end or deadline blank; set end before start; set deadline before start or after end. | Blank dates show "Missing required school term fields." in red inside the dialog (verified). Other combinations show the server's message. Dialog stays open and no term is created. |
| ☐ | TRM-10 | P1 | Existing term for an academic year and semester | Add the same year and semester again; add one with overlapping dates. | Rejected with a message in the dialog. No duplicate term. |
| ☐ | TRM-11 | P2 | Add dialog with entered values | Cancel, then reopen. | Nothing saved. **Observe** whether the previous values are still in the form (they are not reset in this build). |
| ☐ | TRM-12 | P2 | Slow connection | Click "Add term" repeatedly. | Button is disabled while saving. Only one term is created. |
| ☐ | TRM-13 | P2 | After adding a term | Open Department reports and Settings. | Term appears in the reports term list. The default report term still makes sense (**Observe** how the "current" term is picked). |
| ☐ | TRM-14 | P1 | Open term | Click "Close encoding". | Dialog "Close grade encoding": "Close encoding for ‹AY · semester›?" plus an advisory "New grade entries will be closed for this term. A backup reminder will be sent to the administrator." and an optional "Closure note" field. Buttons Cancel and "Close encoding". |
| ☐ | TRM-15 | P2 | Close dialog | Type a note, Cancel, reopen. | Term remains Open. The note is cleared on reopen. |
| ☐ | TRM-16 | P1 | Open term | Confirm with a closure note. | Toast "Encoding closed for ‹AY · semester›. Administrator notified." Dialog closes. Row becomes Closed with "View term". Persists after refresh. Footer counts update. |
| ☐ | TRM-17 | P2 | Open term | Confirm with no note. | Succeeds. View term later shows no "Closure note" field. |
| ☐ | TRM-18 | P2 | **[Fault injection]** close fails, or term already closed in another session **[Multi-session]** | Confirm closing. | A toast with the server message appears. The dialog stays open. Term status is unchanged by this attempt. |
| ☐ | TRM-19 | P1 | **[Cross-portal]** after closing a term | As an Adviser, try to save or edit grades for that term (before and after the deadline, and an unexpired INC). | Ordinary grade writes are blocked once encoding is closed. The deadline and explicit closure are applied consistently. A still-valid INC completion exception remains allowed. |
| ☐ | TRM-20 | P1 | Term with a deadline | Save grades the day before, on, and the day after the deadline (**[Cross-portal]**). | Policy is applied consistently at the boundary. Record the exact behaviour for the deadline day. |
| ☐ | TRM-21 | P1 | **[Cross-portal]** after closing the open term | Check the Administrator's notifications, then open Department Head Settings. | Administrator receives the backup reminder. The Settings banner reads "Last backup: ‹date›. No backup has been recorded since the latest encoding period closed. Record a recent backup." (verified) until a newer backup is recorded. |
| ☐ | TRM-22 | P2 | Closed term | Click "View term". | Dialog "Academic term details" with Academic year, Semester, Term dates, Encoding deadline, Status badge, "Closed by" and, if present, "Closure note". Close button works. |
| ☐ | TRM-23 | P2 | Term closed by someone else (or by a different Head) | Open View term. | "Closed by" names the person who actually closed it (**Observe**: when the record has no name the page shows the fixed name "Dr. Andrea Dela Cruz"). |
| ☐ | TRM-24 | P1 | Terms exist | Click "Export PDF". | A dialog "Preview: Academic terms" appears with the filename `SAAIS-academic-terms.pdf`, "Preparing PDF preview…" and then an embedded PDF. Nothing downloads yet. "Close" and "Download PDF" buttons are visible (Download disabled while preparing). |
| ☐ | TRM-25 | P2 | Preview open | Click Close. | The preview closes. No file is saved to the computer. |
| ☐ | TRM-26 | P1 | Preview open | Inspect every page, then click "Download PDF". | Verified content: letterhead ("Office of the Department Head", "Department of Computer Science and Technology" with logos), title "ACADEMIC TERMS" and the subtitle, section "Academic term history" with all terms and the five columns, note "N open terms \| N closed terms \| DCST department scope", the Head's and Dean's names on the signature lines, "Prepared by: Department Head", "Noted by: Dean", and on every page "Generated ‹date› through SAAIS" and "Page X of Y". The downloaded file is `SAAIS-academic-terms.pdf` and matches the preview. No generating-actor name appears. |
| ☐ | TRM-27 | P3 | Many terms (more than fit on a page) | Export. | Table continues across pages with heading "(continued)" and repeated column headers. |
| ☐ | TRM-28 | P3 | **[Fault injection]** PDF cannot be built | Export. | "Unable to create the PDF. Close the preview and try again." Download stays disabled. |
| ☐ | TRM-29 | P3 | Data with typographic characters | Export. | Characters are flattened for the PDF (– becomes -, · becomes \|, → becomes ->). Text is readable. |
| ☐ | TRM-30 | P3 | Page loading and server error | Block the network. | "Loading academic terms…" then error with Try again. |
| ☐ | TRM-31 | P2 | Close, add or view | Check Audit log. | Closing and adding terms create "Change" events by the Head. |
| ☐ | TRM-32 | P2 | **[Cross-portal]** another department's Head | Close their term and check yours. | Closure only affects the Head's own department (scope "department"). |

### RPT: Department reports

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | RPT-01 | P1 | Students exist | Open Department reports. | Heading "Department reports" with subtitle "A semester snapshot of student progress across your department." and an "Export PDF" button. Filters "Academic term" and "Degree program". Defaults: the current (first unlocked) term and "All department programs". |
| ☐ | RPT-02 | P2 | Report loaded | Open both dropdowns. | Terms are listed newest first as "AY 2026–2027 · 1st semester". Programs are "All department programs" plus each program found in the student roster, shown by **full name** (for example "Bachelor of Science in Computer Science"), not by code. The standard mock data has only BSCS students, so BSIT needs seeded students before RPT-07 can be run. |
| ☐ | RPT-03 | P1 | Report for the current term, all programs | Read the three tiles. | "Currently enrolled" = number of students with the note "‹PROG› n · ‹PROG› n". "Mean GWA" = average of the students' cumulative GWAs to 2 decimals, note "Average of student cumulative GWAs". "Students with deficiencies" = students with at least one deficiency, note "x.x% of enrolled students". Totals match the Students page. |
| ☐ | RPT-04 | P1 | Report loaded | Inspect "GWA distribution". | Bands: 1.00–1.50, 1.51–2.25, 2.26–3.00, Above 3.00, No GWA yet, each with percent and "N student(s)". Percentages sum to exactly 100. Counts add up to enrolled. Footnote "X of Y students have a cumulative GWA · Percentages sum to 100%." Band edges (1.50, 2.25, 3.00) fall in the lower band. |
| ☐ | RPT-05 | P2 | Report loaded | Inspect "Department summary". | "Enrollment by active curriculum": each curriculum with a "Current" (active version) or "Older" badge and student count. Newest version of each program first. Counts add up to enrolled. |
| ☐ | RPT-06 | P1 | Report loaded | Inspect "GWA by batch and curriculum". | Rows: Entry year, Study range (entry year – entry year + 4), Curriculum, Students, Mean GWA (2 decimals or "—"), "View students →". Newest entry year first. Students with no entry year are not in any cohort. Footer "N cohorts · ‹program label›". |
| ☐ | RPT-07 | P1 | Programs BSCS and BSIT | Select BSCS, then BSIT. | Every tile, band, curriculum list and cohort row is recalculated for that program only. The note shows the program name. Numbers across programs add up to the "All" report. |
| ☐ | RPT-08 | P1 | At least two terms | Select the older (not current) term. | Panel "No report available" says "There are no records for this academic term and degree program." No tiles or tables. Export PDF is disabled (verified). |
| ☐ | RPT-09 | P2 | Return to the current term after RPT-08 | Select the current term again. | The report returns with the same values as before. |
| ☐ | RPT-10 | P2 | Cohort dialog open | Change the term or the program. | The cohort dialog closes and the report refreshes. |
| ☐ | RPT-11 | P3 | Roster with no students (or program with none) | View the report. | "No report available" shows. No NaN or errors. Export disabled. |
| ☐ | RPT-12 | P3 | Students where all have no GWA | View the report. | Mean GWA shows "—". All students fall in "No GWA yet". |
| ☐ | RPT-13 | P3 | Zero deficiencies | View tiles. | Shows 0 and "0.0% of enrolled students". |
| ☐ | RPT-14 | P3 | Screen reader | Change filters. | A hidden status announces "Showing ‹term›, ‹program›." |
| ☐ | RPT-15 | P1 | Cohort rows | Click "View students →" on a cohort. | Dialog "Batch ‹year› · Student GWA" with an alert "N students · ‹PROGRAM› · Study range ‹year›–‹year+4›", a scrollable table (Student, Student ID, Curriculum, GWA), "All students in this cohort are shown." and Close. N equals the cohort's Students value. |
| ☐ | RPT-16 | P2 | Cohort dialog | Compare with the Students page. | Each student's number, name and GWA matches their record. No student appears twice. A student without GWA shows "—". Mean of the listed GWAs equals the cohort's Mean GWA. |
| ☐ | RPT-17 | P3 | Cohort dialog | Close with Close, X and Esc. | Dialog closes. Report remains with the same filters. |
| ☐ | RPT-18 | P1 | **[Multi-version]** several entry years and curricula | Compare cohort rows to the roster. | One row per entry year, curriculum and program combination. Counts and means are correct per group with no duplicates across rows. |
| ☐ | RPT-19 | P1 | **[Cross-portal]** | Compare enrolled, deficiencies and GWA against the Adviser, Staff or Dean views for the same students. | Figures agree. |
| ☐ | RPT-20 | P1 | **[API]** another department's students | Verify none appear in totals, cohorts or exports. | Only the Head's department is included. |
| ☐ | RPT-21 | P3 | Page loading and server error | Block the network. | "Loading department reports…" then error with Try again. |
| ☐ | RPT-22 | P2 | Narrow screen | View the report. | Tiles stack, tables turn into labelled rows, dialog fits. |
| ☐ | RPT-23 | P3 | Roster where percentages don't divide evenly | Check distribution percentages. | Rounded to whole numbers that still total 100 (largest remainder). |
| ☐ | RPT-24 | P1 | **[Cross-portal]** | Open a cohort, Close, then Export PDF (preview, then download). Check the Audit log. | Audit shows the Head as actor with the department scope for the actions the system records. Record whether opening a cohort and exporting are logged and whether preview and download are told apart (**Observe**). |
| ☐ | RPT-25 | P3 | Slow or long data | Open a cohort with many students. | List scrolls inside the dialog. Header stays visible. |
| ☐ | RPT-26 | P1 | Report shown | Click "Export PDF". | "Preview: Department reports" dialog opens with filename `SAAIS-department-report-<term id>-<program>.pdf` (`-all` for all programs; the term part is a long ID, verified). Nothing downloads until "Download PDF" is clicked. |
| ☐ | RPT-27 | P1 | Preview open | Read the whole PDF, then Download. | Verified content: letterhead and title "DEPARTMENT REPORTS". Subtitle "AY 2026-2027 \| 1st semester \| All department programs". Three stat boxes (Currently enrolled with note, Mean GWA with note, Students with deficiencies). Sections "GWA distribution" (GWA range, Percent, Students plus the "X of Y students have a cumulative GWA." note), "Department summary" (Curriculum, Status, Students plus "Enrollment by active curriculum"), "GWA by batch and curriculum" (all cohorts). Numbers right-aligned. Signature lines with Head and Dean names, "Prepared by: Department Head", "Noted by: Dean". Footer "Generated ‹date› through SAAIS" and "Page X of Y". All figures equal the on-screen report. No generating-actor name appears. |
| ☐ | RPT-28 | P2 | Programs BSCS and BSIT | Export for All, BSCS and BSIT. | Each PDF contains only the selected program's data. Filenames end `-all`, `-BSCS` and `-BSIT`. |
| ☐ | RPT-29 | P2 | Large report | Export a report with many cohorts. | Pagination is readable with "(continued)" headings. No row is split or lost. |
| ☐ | RPT-30 | P3 | Preview open | Click Close. | Preview closes without downloading. |
| ☐ | RPT-31 | P2 | Report scope changed after export | Compare PDFs for different term and program choices. | Each PDF reflects the selection that was active when it was exported. |
| ☐ | RPT-32 | P3 | **[Fault injection]** PDF build fails | Export. | "Unable to create the PDF. Close the preview and try again." |
| ☐ | RPT-33 | P3 | Cohort or curriculum with exactly one student | Read "Department summary" and the distribution details. | Wording is correct for one student. Verified: the summary says "1 students" (grammar, **Observe**). Distribution rows correctly say "1 student". |

### AUD: Audit log

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | AUD-01 | P1 | Events exist | Open Audit log. | Heading "Audit log" with subtitle "Review record views, changes, and sign-ins within your department." Panel "Department activity" ("Record views are logged alongside changes and sign-ins."). Filters Person, Student, Action, From date, To date and "Reset filters". Columns Timestamp, Person, Action, "Student / record", Details. Footer "N matching event(s) of M" and "DCST department scope". |
| ☐ | AUD-02 | P2 | Events exist | Read the rows. | Newest first. Timestamp shows the date and a 12-hour time in Manila time. Action badges are View, Change or Sign-in. Events without an actor name show "System". Student column reads "‹number› · ‹name›" or "—". |
| ☐ | AUD-03 | P1 | Several actors | Type part of a person's name in Person (any letter case, extra spaces). | Only that actor's events remain. Count updates. |
| ☐ | AUD-04 | P1 | Events about different students | Type a student name, a student number, and part of each in Student. | Only events for matching students remain. |
| ☐ | AUD-05 | P1 | All three action types exist | Choose each Action and "All actions". | Only that action's events appear each time. |
| ☐ | AUD-06 | P2 | Events on several dates | Set only From date, only To date, and both (including both the same date). | Date boundaries are inclusive. Same-day range returns that whole day. |
| ☐ | AUD-07 | P2 | Event near midnight Manila time (for example 00:30 PHT) | Filter by that date. | The event is counted under the Manila calendar date, not the UTC date. |
| ☐ | AUD-08 | P1 | Date fields | Set From later than To. | Red message "From date must be on or before To date." and the table shows "Choose a valid date range to view events." Fixing a date clears the message. |
| ☐ | AUD-09 | P1 | Filters set | Combine Person, Student, Action and dates. | Only events that satisfy all conditions remain. Each filter also works alone. |
| ☐ | AUD-10 | P2 | A filter that matches nothing | Apply it. | "No entries match these filters." and "0 matching events of M". |
| ☐ | AUD-11 | P2 | Filters applied | 1. Check "Reset filters" with no filter.<br>2. Apply filters, click it. | Disabled with no filter. After clicking, all fields clear, Action returns to "All actions" and the full list shows. |
| ☐ | AUD-12 | P2 | Event categories (view, record_view, export, sign_in and other) | Review the Action column. | Views, record views and exports show as View. Sign-ins show as Sign-in. Everything else shows as Change. |
| ☐ | AUD-13 | P3 | Event with long details | View on narrow screens. | Text wraps and no layout break. |
| ☐ | AUD-14 | P1 | **[API]** other department's events | Compare with the other department's log. | Only the Head's department events show. |
| ☐ | AUD-15 | P1 | Audit log page | Look for any control that edits, deletes or imports entries. Try changing entries through the API **[API]**. | No edit or delete control exists. Direct changes through the API are refused. Entries are read-only and immutable. |
| ☐ | AUD-16 | P1 | Perform actions below, then check the log | Make one of each: approve and reject transfer, add and delete equivalence, credit a course, curriculum add/edit/delete, import students, reassign students, add term, close encoding, save thresholds, save sender, record a backup. | Each action appears as an entry with the correct actor (the Head), the right student where relevant and a clear detail text. Timestamps are current. In the standard mock app only reassignments ("Reassigned to ‹adviser› effective ‹date›. Reason: …") and settings changes ("Updated department settings.") were logged during a test run; transfer decisions and term closing were not. Re-check every action against the real back end. |
| ☐ | AUD-17 | P2 | Sign in and out as the Head | Check the log. | A "Sign-in" entry exists for the sign-in. |
| ☐ | AUD-18 | P1 | **[Cross-portal]** an operation performed on the Head's behalf or by another role in the department | Inspect the entry. | The true actor and scope are kept. The log never shows the Head as the actor for someone else's action. |
| ☐ | AUD-19 | P3 | More than 100 events | Open the log. | All events load (footer total equals the true count). |
| ☐ | AUD-20 | P3 | Page loading and server error | Block the network. | "Loading the audit log…" then error with Try again. |
| ☐ | AUD-21 | P2 | Student with events | Compare this log filtered to the student with the student's "Audit log" tab. | Same events. |

### SET: Settings

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | SET-01 | P1 | Settings stored | Open Settings. | Heading "Settings" with subtitle "Configure department standing rules, email, and backup records." A backup banner at the top, panel "Scholastic standing thresholds" (Warning from (%), Probation from (%), Dismissal from (%), Save), panel "Email" (Sender address, Save), panel "Backups" with "Record a backup made today". Fields are filled with the stored values. |
| ☐ | SET-02 | P1 | Settings page | Try each threshold with: blank, `-1`, `101`, `10.5`, `1e1` and spaces. | Rejected with "Enter a whole percentage from 0 to 100." under the field. Nothing saved. |
| ☐ | SET-03 | P1 | Settings page | Make warning ≥ probation (try equal values and higher), then probation ≥ dismissal. | "Probation must be higher than warning." and "Dismissal must be higher than probation." Stored values are unchanged. |
| ☐ | SET-04 | P2 | Settings page | Save boundary sets: 0 / 1 / 2, and 98 / 99 / 100. Then 100 / 100 / 100. | The first two sets save. The last is rejected by the ordering rule. |
| ☐ | SET-05 | P1 | Settings page | Enter 10 / 20 / 30 and Save. | Toast "Standing rules saved." Reload and see 10 / 20 / 30 persist. |
| ☐ | SET-06 | P1 | After SET-05 **[Cross-portal]** | Check scholastic standing for students (Adviser, Dean views) with failed-unit percentages near the new thresholds. | Standing calculations use the new thresholds. |
| ☐ | SET-07 | P2 | **[Fault injection]** save fails | Save valid thresholds. | The server message appears under the Dismissal field and the stored values are unchanged. |
| ☐ | SET-08 | P3 | Settings page | Click Save without changing anything; click Save repeatedly. | Succeeds without error. The button is disabled while saving. |
| ☐ | SET-09 | P1 | Settings page | Try sender values: blank, `qa`, `qa@example.com`, `@vsu.edu.ph`, `qa @vsu.edu.ph`, `qa@mail.vsu.edu.ph`, `qa@vsu.edu.ph.ph`. | All rejected with "Use a VSU sender address ending in @vsu.edu.ph." |
| ☐ | SET-10 | P1 | Settings page | Enter `qa@vsu.edu.ph` (also uppercase domain and spaces around) and Save. | Toast "Email settings saved." The value is trimmed and persists after reload. |
| ☐ | SET-11 | P2 | **[Fault injection]** save fails | Save a valid sender. | Server message under the field. Stored sender unchanged. |
| ☐ | SET-12 | P1 | After SET-10 **[Cross-portal]** | Trigger a system email (for example a transfer or notification email). | The email is sent from the configured address. |
| ☐ | SET-13 | P2 | No backup recorded yet | Read the banner and Backups panel. | Banner: "No backup has been recorded yet. Record a recent backup." Panel has no details list. |
| ☐ | SET-14 | P2 | A backup exists | Read the Backups panel. | Details: Completed (date and time followed by PHT), Reference ID, Storage location and Scope label (All department records / Department records and audit log / Institution-wide). |
| ☐ | SET-15 | P2 | Recorded backup older than the last encoding closure; and a newer one | Read the banner each time. | Older backup: "Last backup: ‹date›. No backup has been recorded since the latest encoding period closed. Record a recent backup." Newer backup: green message with "This records completion information only; it does not verify backup contents." |
| ☐ | SET-16 | P1 | Settings page | Click "Record a backup made today". | Dialog "Record a completed backup" (explaining it does not create a backup or upload a file) with Completion date and time (Philippine time, default now), Backup reference, Storage location (hint "Name the institutional folder or storage reference."), Backup scope (default "All department records"), Cancel, "Save backup record". |
| ☐ | SET-17 | P3 | Settings page | Search for a button to send a test email. | None exists. Sender verification is by SET-12. |
| ☐ | SET-18 | P1 | Dialog open (the completion field starts with the current Manila time, so clear it first to test blank) | Try: clear completion time; a future time (for example year 2999); a time before the latest recorded backup; empty reference; empty location (also spaces). | "Enter the completion date and time." / "Completion cannot be in the future." / "Use a completion time on or after the latest recorded backup." (verified) / "Enter the backup reference." and "Enter the institutional storage location." (verified). Nothing saved. |
| ☐ | SET-19 | P1 | Dialog open | Enter valid values and save. | Toast "Completed backup record saved." Dialog closes. The Backups panel shows the new record and the banner updates (including a newer backup clearing the overdue message). Persists after reload. |
| ☐ | SET-20 | P2 | Existing backup with time T | Record a new one at exactly T. | Accepted (on or after the latest). |
| ☐ | SET-21 | P2 | Dialog open | Open the scope list. | Three options as in SET-14. Each can be saved and is shown afterwards. |
| ☐ | SET-22 | P2 | **[Fault injection]** save fails | Save a valid record. | Server message appears under the completion field. Dialog stays open, values kept. |
| ☐ | SET-23 | P1 | **[Cross-portal]** Admin Settings (or other role with the same settings) | Save a permitted threshold, sender or backup record as Head. Reload both screens. Then change a value as Admin. | Both show the same persisted values. Neither shows stale form data after reload. Each change is recorded in the audit log with the correct actor and scope. |
| ☐ | SET-24 | P2 | Each saved setting | Open Audit log. | An event "Department settings" (or similar) with the Head as actor exists for each save. |
| ☐ | SET-25 | P3 | Cancel, X or Esc in the backup dialog | Reopen it. | Nothing saved. Dialog is reset with a new default time. |
| ☐ | SET-26 | P3 | Page loading and server error | Block the network. | "Loading settings…" then error with Try again. Heading still shows. |
| ☐ | SET-27 | P2 | Edit thresholds only | Click the thresholds Save while the sender field is changed (and the reverse). | Each form saves only its own values. The other form's unsaved edit is not saved. |

### INT: Cross-module, security and non-functional

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | INT-01 | P1 | **[Cross-portal]** | Reassign a student to a new adviser. Open Students and Audit log, then sign in as Staff, Admin, Dean and the old and new adviser. Open the student's profile and PDF where available. | All readers agree on the current adviser, previous adviser and dates. Generated PDFs use the new adviser. The old adviser no longer sees the student; the new adviser does. |
| ☐ | INT-02 | P1 | A transfer approved with equivalencies and an outside credit | Check Students, Reports, Curricula enrolled counts and the checklist. | Counts, checklist and unit totals agree everywhere. No unit is counted twice. |
| ☐ | INT-03 | P2 | A term closed | Check Academic terms, Settings banner, Reports term list and the Adviser's grade screens. | Status is consistent in every place. |
| ☐ | INT-04 | P1 | Head and Admin accounts | Change a setting as Head, view it as Admin and vice versa. | Values and precedence between department and system scope are correct. Changes are audited. The other department's Head does not see a change made for another department. |
| ☐ | INT-05 | P1 | Equivalence, outside credit and transfer data | Follow one student through map → credit → transfer. | Each step is reflected exactly once in the checklist, with provenance shown. |
| ☐ | INT-06 | P1 | A report cohort and the audit log | Open a cohort, Close, export the report (preview only, then download) and inspect the Audit log. | Required view and export entries exist with the Head as actor and the department scope. Note whether preview-only and download are distinguishable. |
| ☐ | INT-07 | P1 | **[Multi-session]** two departments | As the DCST Head, try ID-based URLs or API calls for records of the other department (students, transfers, credits, terms, audit). | Department scope holds on every list, dialog and API call. Other-department records and decisions are unavailable. |
| ☐ | INT-08 | P1 | **[API]** a user whose job title says "Department Head" but has no Head role or grant | Call each management operation (transfers, curricula, equivalence, credits, assignments, terms, settings, import) through the API. | Every call is refused. Job title alone grants nothing. A true Head with the role succeeds for the same calls. |
| ☐ | INT-09 | P1 | Signed-in Head | Expire the session (delete the token or wait), then try to save in a dialog. | The user is sent to login or shown an error. No partial or silent save. |
| ☐ | INT-10 | P2 | **[Multi-session]** | Edit the same curriculum item, term or setting in two sessions. | Last valid saves are applied without corrupting data. Stale sessions show a clear error or refresh cleanly. |
| ☐ | INT-11 | P2 | Chrome, Edge, Firefox, Safari (latest) | Run smoke checks on every page and every dialog. | Layout, dialogs, date pickers, file chooser and PDF preview work in each browser. |
| ☐ | INT-12 | P2 | Keyboard and screen reader | Walk each page: Tab order, focus rings, dialog focus trap, Esc, labelled fields, error announcements (alerts) and live regions (counts, toasts). | All controls are reachable and named. Errors are announced. Colour is not the only status indicator. |
| ☐ | INT-13 | P2 | Tester computer set to a non-Manila timezone | View terms, audit timestamps, assignment dates and default dates. | All dates follow Manila time. "Today" defaults use the Manila date. |
| ☐ | INT-14 | P2 | Network goes offline mid-action | Submit a form while offline. | A visible error appears. The dialog stays with entered values. Retrying after reconnect succeeds once. |
| ☐ | INT-15 | P1 | Free-text fields (decision reason, closure note, slot name, course title, reason, school) | Enter `<script>alert(1)</script>` and HTML tags, emoji and very long text, then view them everywhere they appear. | Content is shown as plain text. No script runs. Layout holds. |
| ☐ | INT-16 | P1 | **[API]** | Using the Head token, try to PATCH or DELETE audit entries and to change another user's actor name. | All attempts are refused. The log is unchanged. |
| ☐ | INT-17 | P3 | Slow 3G throttling | Open each page and each dialog. | Loading text appears. No double submissions. The UI remains usable. |
| ☐ | INT-18 | P2 | Production build (`npm run build`, `npm run preview`) | Repeat NAV-12 (refresh each page URL). | No 404 on refresh. Assets load. Behaviour matches development. |
| ☐ | INT-19 | P3 | Pages with dates (Transfers, Curricula, Assignments, Terms, Settings, Audit log, PDFs) | Compare date formats. | Dates use one consistent style. Verified inconsistencies: "01 Sept 2026" (Transfers), "1 Aug 2024" (Curricula), "Aug 01, 2024" (Assignments), "05 Jan 2027" (Terms), "15 Oct 2026, 14:00 PHT" (Settings). Record for the team (**Observe**). |

---

## 6. Observations to confirm with the team

These were found while reading the code. They are not necessarily defects. Each is covered by an **Observe** case; record the real behaviour and decide with the developers.

| # | Area | Observation | Related case |
| --- | --- | --- | --- |
| 1 | Academic terms | A blank Academic year in "Add academic term" is silently replaced with "2025–2026". The form does not warn the user. | TRM-08 |
| 2 | Academic terms | The Add term dialog keeps old values after Cancel (and the default year is a fixed `2025–2026`). | TRM-11 |
| 3 | Academic terms | "Closed by" in View term falls back to a fixed name ("Dr. Andrea Dela Cruz") when the record has no closer name. | TRM-23 |
| 4 | Academic terms / Reports | PDFs say "Generated ‹date› through SAAIS" and have no generating actor, but the earlier test plan expected one. | TRM-26, RPT-27 |
| 5 | Curricula | Editing a version lets the Program change, but only the label and other fields are sent. The program may not actually change. | CUR-15 |
| 6 | Curricula | Editing the name of a slot that shows a real course (code — title) may not change what is displayed. | CUR-32 |
| 7 | Curricula, Adviser assignments | Confirm buttons are not disabled while saving, so rapid double clicks could send two requests. | CUR-42, ASG-30 |
| 8 | Curricula | Positive decimals (for example 147.5) are accepted for required units by the form. | CUR-10 |
| 9 | Students | Opening a student record adds no audit event even though the Audit log page says "Record views are logged". | STU-16 |
| 10 | Students | The panel text "BSCS and BSIT · AY 2025–2026, 1st semester" is fixed text, not derived from data. | STU-01 |
| 11 | Students import | Large imports depend on lookups limited to 100 programs, curricula and profiles. Advisers beyond the first 100 profiles may not be found. | IMP-24 |
| 12 | Students import | `.xls` files get a generic "Choose a .xlsx or .csv file." and no conversion guidance. | IMP-02 |
| 13 | Reports | Only the current term has data. Every other term shows "No report available". | RPT-08 |
| 14 | Audit log | Export actions are shown as "View", so preview and download cannot be told apart in the Action filter. | AUD-12, RPT-24, INT-06 |
| 15 | Navigation | An unknown URL under `/department-head/` has no "Page not found" screen. | NAV-10 |
| 16 | Equivalence | The form allows the same course as source and target. | EQV-10 |
| 17 | Settings | There is no test-send control for the sender address. | SET-17 |
| 18 | Navigation | **Confirmed:** an unknown URL under `/department-head/` renders a completely blank page (no sidebar or top bar). | NAV-10 |
| 19 | Import | **Confirmed:** row numbers are one too low for every row after a blank line in the file. | IMP-26 |
| 20 | Wording | **Confirmed:** "1 recorded decisions.", "1 decisions of 1", "1 course equivalencies", "1 students". | TRF-30, RPT-33, EQV-01 |
| 21 | Dates | **Confirmed:** at least five date styles across pages ("01 Sept 2026", "1 Aug 2024", "Aug 01, 2024", "05 Jan 2027", "15 Oct 2026, 14:00 PHT"). | INT-19 |
| 22 | Notifications | **Confirmed:** `/department-head/notifications` breadcrumb lacks "Notifications". A bell item without an allowed target links to the notifications page. | NTF-15, NTF-03 |
| 23 | Navigation | Change Password page breadcrumb says "Settings", which is also the name of a Department Head page. | NAV-15 |
| 24 | Reports | The program list shows full program names, and report PDF file names embed a long term ID instead of a readable term. | RPT-02, RPT-26 |
| 25 | Audit log | In the mock app, transfer decisions and term closing did not create audit entries. Needs a check on the real back end. | AUD-16 |

---

## 7. Coverage summary

| Module | Cases | P1 | P2 | P3 |
| --- | --- | --- | --- | --- |
| NAV | 18 | 6 | 7 | 5 |
| NTF | 15 | 4 | 8 | 3 |
| TRF | 30 | 13 | 10 | 7 |
| CUR | 45 | 15 | 27 | 3 |
| EQV | 22 | 7 | 9 | 6 |
| CRD | 22 | 10 | 8 | 4 |
| STU | 23 | 5 | 15 | 3 |
| IMP | 26 | 10 | 13 | 3 |
| ASG | 30 | 14 | 12 | 4 |
| TRM | 32 | 12 | 16 | 4 |
| RPT | 33 | 13 | 9 | 11 |
| AUD | 21 | 10 | 8 | 3 |
| SET | 27 | 12 | 11 | 4 |
| INT | 19 | 10 | 7 | 2 |
| **Total** | **363** | **141** | **160** | **62** |

The draft includes cases for pages, dialogs, fields, filters, tabs, PDFs and redirects described by its author. Department Head routes are absent from this branch, so implementation coverage is not established here. Original cases DH-01 to DH-42 map to revised cases in section 4. Backend-dependent behavior requires separate execution.

---

## 8. Verification run in the running app

**Author-reported historical observations:** the tested revision is unknown and is not this contract branch. Treat every result and inline "verified" label below as unverified until rerun with a recorded revision and evidence. The sessionStorage setup and unsupported persona keys reported below cannot be reproduced on this branch. In a supported mock test harness use `loginAsMockPersona` with an existing `MockPersonaKey`; obtain missing Head-only and disabled shared personas from the mock-data owner.

### How the app was run

- Dev server in mock mode: `VITE_API_MODE=mock npx vite --force --port 5199` (the in-browser mock API supplies the data). On the first start without `--force` every page crashed with "Cannot read properties of null (reading 'useState')" because of a stale dependency cache; restarting with `--force` fixed it.
- The author reported using Head-only and disabled personas in an unidentified build. Those keys are unavailable on this branch; use `loginAsMockPersona` with a documented `MockPersonaKey` in a supported harness, and obtain missing shared personas from the mock-data owner before rerunning those cases.
- Driven with headless Chromium at 1280 px width (375 px for the mobile check).

### Seen working as written (verified)

NAV-01 to NAV-10, NAV-12 (deep links), NAV-13 (Sign out to `/login`), NAV-15, NAV-16 (375 px), NTF-04, NTF-10, TRF-01 to TRF-03, TRF-05, TRF-06, TRF-07 (toast), TRF-09, TRF-11, TRF-12, TRF-16, TRF-17, CUR-01, CUR-04 (create and toast), CUR-06 to CUR-10, CUR-18, CUR-23, CUR-29, CUR-30, CUR-35 to CUR-38, EQV-01, EQV-04, EQV-06, EQV-15, CRD-01, CRD-03, CRD-05, CRD-06, STU-01, STU-09, STU-11 to STU-16, STU-23, IMP-01 to IMP-05, IMP-12, IMP-14 to IMP-17, IMP-19, IMP-20 (count), IMP-26, ASG-01, ASG-05, ASG-06, ASG-09 to ASG-12, ASG-14, ASG-15, ASG-17, ASG-18, TRM-01, TRM-03, TRM-07, TRM-09, TRM-14, TRM-16, TRM-21, TRM-22, TRM-24, TRM-26, RPT-01 to RPT-06, RPT-08, RPT-15, RPT-26, RPT-27, AUD-01, AUD-03, AUD-06, AUD-08, AUD-10, SET-01 to SET-03, SET-09, SET-10, SET-14 to SET-16, SET-18, SET-19.

### Differences found while verifying (already folded into the cases above)

NAV-07, NAV-09, NAV-10, NAV-13, NAV-15, NTF-01 to NTF-04, NTF-10, NTF-15, TRF-17, TRF-30, STU-11, STU-13, STU-16, STU-23, IMP-02, IMP-17, IMP-26, TRM-09, TRM-26, RPT-02, RPT-26, RPT-27, RPT-33, ASG-01, CUR-10, AUD-16, INT-19.

### Not verifiable in mock mode (run these against the real back end or seeded data)

| Group | Why |
| --- | --- |
| "Persists after refresh", audit entries for every write, TRF-20 to TRF-23, TRF-28, EQV-22, CRD-14, CRD-20, TRM-31, ASG-19 (audit and other pages after reload) | The mock database resets on every page reload and logs only some writes. |
| NTF-02, NTF-05 to NTF-09, NTF-11 to NTF-14 | The Head mock account has no notifications. Seed some first. |
| RPT-07, RPT-13, RPT-19, RPT-20, RPT-28 | Mock data has one program (BSCS) and one current term, so the BSIT and multi-term matrices are not available. |
| All **[Fault injection]**, **[Multi-session]**, **[API]** and **[Cross-portal]** cases (TRF-14, TRF-24 to TRF-26, TRM-18 to TRM-20, TRM-32, SET-12, SET-23, INT-01 to INT-10, INT-16) | Need a real back end, a second session or tooling. |
| NAV-11, NAV-14, TRM-13, TRM-28, INT-11 to INT-15, INT-17, INT-18 | Not run yet (browser matrix, keyboard and screen reader, timezone, offline, production build). |
| Everything else not listed above as verified | Written from the source code only. Not run. |
