# Dean Adviser test cases (revised)

Revised against the implemented Dean portal in `src/routes/dean/` and the shared shell, navigation, notifications and routing it depends on. It replaces the mockup-based [dean-adviser.md](dean-adviser.md). Every case below is traceable to a real screen, control, label or API call in the application.

- **"Dean Adviser"** means one signed-in account that holds the **Dean** role (faculty scope) and a confirmed **Adviser** role (department scope). In the mock data this is "Montera, Mhac Alester" (`dean` persona).
- **Status of all cases:** Not run.
- **Verification:** a first pass was run against the live app in mock mode (section 8). Cases and expected results that were seen working are marked **verified**.
- **Execution rule:** perform workflows through the UI, then verify saved results through the UI (reload, other pages, other roles) unless a case says "API".

## Contents

1. [Scope, legend and conventions](#1-scope-legend-and-conventions)
2. [Test data and accounts](#2-test-data-and-accounts)
3. [What changed from the original file](#3-what-changed-from-the-original-file)
4. [Traceability: original ID to revised ID](#4-traceability-original-id-to-revised-id)
5. Test cases
   - [NAV: Shell, navigation and access](#nav-shell-navigation-and-access)
   - [DIR: Faculty students directory](#dir-faculty-students-directory)
   - [REC: Student record](#rec-student-record)
   - [RPT: Faculty reports](#rpt-faculty-reports)
   - [AUD: Faculty audit log](#aud-faculty-audit-log)
   - [NTF: Notifications](#ntf-notifications)
   - [SEC: Security and non-functional](#sec-security-and-non-functional)
6. [Observations to confirm with the team](#6-observations-to-confirm-with-the-team)
7. [Coverage summary](#7-coverage-summary)
8. [Verification run in the running app](#8-verification-run-in-the-running-app)

---

## 1. Scope, legend and conventions

### Pages in scope

| Module | Route | Source |
| --- | --- | --- |
| Faculty reports | `/dean/reports` (also `/dean`, which redirects here) | `dean/reports/DeanReportsPage.tsx`, `FacultyReportHeader.tsx`, `FacultyReportStatsAndDistribution.tsx`, `FacultyBatchGwaTable.tsx`, `CohortStudentsDialog.tsx`, `DeanPdfViewerDialog.tsx`, `faculty-report-pdf.ts`, `build-faculty-report.ts` |
| Students | `/dean/students` | `dean/students/DeanStudentsPage.tsx`, `StudentDirectoryFilters.tsx`, `StudentDirectoryTable.tsx`, `DeanStudentRecordDialog.tsx` and its Checklist, Grades and Audit tabs |
| Audit log | `/dean/audit-log` | `dean/audit-log/DeanAuditLogPage.tsx`, `FacultyAuditFilters.tsx`, `use-dean-audit-log.ts` |
| Shell, redirects, notifications | `/notifications`, sidebar, breadcrumbs | `DeanPortal.tsx`, `AuthenticatedPortalLayout.tsx`, `navigation/dean.ts`, `navigation/adviser.ts` |

Adviser pages are **not** tested in this file. The only Adviser-related case is the role check NAV-09: a Dean can open Adviser routes only when the Adviser role is confirmed.

### Column legend

| Column | Meaning |
| --- | --- |
| Done | Tick the box (☐ becomes ☑) when the case has been run and passed. |
| ID | `DA-‹module›-‹nn›`, written in short form (for example `RPT-04`) inside tables. |
| Pri | **P1** critical scope, privacy, audit or data-accuracy flow. **P2** important functional or validation behaviour. **P3** cosmetic, edge or low-risk behaviour. |
| Expected result | What must be observed. Quoted text is the exact on-screen wording in the current build. |

### Conventions

- Times in the Dean portal are shown in **Philippine time (Asia/Manila)**.
- Cases marked **[API]** need an API client or developer tools. **[Multi-session]** needs two browsers. **[Cross-portal]** needs another role's account. **[Fault injection]** needs a way to force a server error. **Observe** marks behaviour that looks questionable in the code or app: record what happens and raise it (see [section 6](#6-observations-to-confirm-with-the-team)).
- "Faculty" means the Dean's own faculty (for example "Faculty of Computing" with departments DCST and DIS). Nothing outside it should ever appear.

---

## 2. Test data and accounts

| Item | Requirement |
| --- | --- |
| **Dean + Adviser account** | Roles Dean (faculty scope) and Adviser (department scope), no Head role. Primary account for all cases. |
| **Dean-only account** | Dean role only, to prove the Adviser group is not granted by the Dean role. |
| **Other accounts** | Student, Adviser-only, Department Head, Department Staff, Admin, a deactivated account, and a Dean of a **second faculty**. |
| **Faculty data** | One faculty with at least two departments, at least one student in **each** department, and at least one department with no students. A second faculty with its own students. |
| **Students** | At least 26 across at least two curricula and two entry years. Include: one Unassigned student, one with a flag or probation standing (to see Flagged or Delinquent), one with a GWA, one without a GWA, one with an INC attempt, one with a failing (5.00) grade, one with outside credit, one with no grade records. |
| **Cohorts** | At least three batch and curriculum cohorts of different sizes (for example 2, 23 and 1 students) to test weighting. |
| **Audit events** | Events of each kind from at least two actors: advising plan saves, grade changes, sign-ins, record views, report views, exports. Include one near midnight Manila time and events on at least three dates. |
| **Notifications** | Unread notifications for the Dean account with a faculty report target. |

Names used as examples (for instance "Sta. Agata, Jerome Daniel S.", "Faculty of Computing", "DCST", "DIS") come from the standard mock data.

---

## 3. What changed from the original file

| # | Original assumption | What the application does | Handling |
| --- | --- | --- | --- |
| 1 | Departments in the report selector: All departments, DCST, DIT Alang-alang, DIT Isabel. | The list is built from the Dean's own faculty. The mock has **All departments, DCST, DIS**. | RPT-03, RPT-15 |
| 2 | Department reports have the **department's header** in the PDF (DA-21). | The PDF **always** uses the faculty letterhead ("Office of the Dean" and the faculty name). The department only appears as the subtitle under "FACULTY REPORTS". | RPT-24 |
| 3 | PDF has "prepared-by" block and generated actor (DA-22). | The PDF has **one** signature block: the signed-in Dean's name over "Noted by: Dean". There is no "Prepared by" and no generated-by actor. Footer is "Generated d MMM yyyy through SAAIS" and "Page X of Y". | RPT-25 |
| 4 | The page button downloads the PDF. | The page button is labelled **Download PDF** but only opens a preview. The real **Download PDF** link is inside the preview, and only that click logs an export event. | RPT-22, RPT-26 |
| 5 | Student detail has a breadcrumb and detail URL (DA-04, DA-13). | The student record is a **modal** with Checklist, Grades and Audit log tabs. There is no student URL. | DIR-09, REC-01, SEC-02 |
| 6 | Cohort drill-down uses pagination (DA-07). | The cohort dialog lists every student in one scrollable table. | RPT-17 |
| 7 | Audit filters: Person, Student, Action, From date (DA-10). | Same four filters, but the date control is labelled just **From**. There is no To date. | AUD-03 to AUD-07 |
| 8 | Opening a student logs a View event naming actor, student and time (DA-05). | Confirmed, with wording "Viewed student academic record (‹student number›)". Opening a cohort logs "Report drill-down: batch ‹year› (‹n› students)". Preview does not log; Download does ("Exported faculty report (‹scope›) as PDF"). | REC-08, RPT-23, RPT-26 |
| 9 | Report distribution is a distribution of students (DA-16). | It is a distribution of **final grades (attempts)**: bands 1.00–1.50, 1.75–2.25, 2.50–3.00, 5.00 and "INC / DR / NA". Each percentage is rounded separately and the denominator includes every grade, so totals need not reach 100%. | RPT-10 to RPT-13 |
| 10 | Dean Adviser sections expand and collapse together (DA-01). | Sidebar shows a **Dean** group (Faculty reports, Students, Audit log) and, only for a confirmed Adviser role, an **Adviser** group. | NAV-01, NAV-02, NAV-09 |
| 11 | Adviser behaviour was tested here (DA-12, DA-18). | Out of scope for this file. Only the role check remains: Dean can open Adviser routes if the Adviser role is confirmed. Back-end rules (DA-14 to DA-19) are kept as **[API]**, **[Cross-portal]** or **[Multi-session]** checks. | NAV-09, SEC |

---

## 4. Traceability: original ID to revised ID

| Original | Topic | Revised |
| --- | --- | --- |
| DA-01 | Expand/collapse and navigate both groups | NAV-01, NAV-02, NAV-12 |
| DA-02 | Students search and filters | DIR-02 to DIR-06 |
| DA-03 | No match and reset | DIR-07, DIR-08 |
| DA-04 | Student detail identity and read-only | DIR-09, DIR-10, REC-01, REC-07 |
| DA-05 | Persistent View event | REC-08, REC-09 |
| DA-06 | Report values | RPT-02 to RPT-09 |
| DA-07 | Cohort drill-down | RPT-14 to RPT-18 |
| DA-08 | Cohort drill-down audit event | RPT-23 |
| DA-09 | Department selector, PDF preview and download | RPT-03, RPT-15, RPT-22 to RPT-26 |
| DA-10 | Audit filters | AUD-03 to AUD-07 |
| DA-11 | Audit empty state and no edit controls | AUD-08, AUD-09, AUD-12 |
| DA-12 | Moving between Advisees and Dean Students | NAV-02, NAV-09 (role check only) |
| DA-13 | Out-of-faculty student and report | DIR-13, RPT-19, SEC-02 |
| DA-14 | Cross-faculty disclosure | SEC-02, SEC-03 |
| DA-15 | Weighted report arithmetic | RPT-05, RPT-06, RPT-09 |
| DA-16 | Empty cohort and INC/DR/NA | RPT-10 to RPT-13 |
| DA-17 | Read and export audit paths | REC-08, RPT-23, RPT-26, AUD-11 |
| DA-18 | Dean loses current advisee | Removed: Adviser behaviour is out of scope (role check only: NAV-09) |
| DA-19 | Export privacy | RPT-27, SEC-04 |
| DA-20 | Notifications | NTF-01 to NTF-04 |
| DA-21 | Department selector scope in UI and PDF | RPT-03, RPT-24 |
| DA-22 | Report signatory | RPT-25 |
| DA-23 | Shared oversight audit | AUD-11, AUD-12 |

---

## 5. Test cases

### NAV: Shell, navigation and access

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | NAV-01 | P1 | Dean + Adviser account | Sign in and read the sidebar. | Portal label "Office of the Dean". Sidebar shows the **DEAN** group (Faculty reports, Students, Audit log) and the Adviser group granted by the confirmed Adviser role, plus "Help & documentation". No Department Head or Staff group (verified). |
| ☐ | NAV-02 | P2 | Dean + Adviser account | Open each Dean page from the sidebar. | Each Dean page opens at `/dean/reports`, `/dean/students`, `/dean/audit-log` with breadcrumb "Office of the Dean › ‹page›" (verified for Faculty reports). Student context is not carried over between pages. |
| ☐ | NAV-03 | P2 | Dean account | Open `/dean`. | Redirects once to `/dean/reports` (verified). After sign-in the Dean lands in the Dean portal. |
| ☐ | NAV-04 | P3 | Dean account | Open `/dean/students/anything-here`. | Redirects to `/dean/students` (verified). |
| ☐ | NAV-05 | P1 | Dean account | Open `/dean/does-not-exist`. | **Confirmed defect:** the browser enters an endless redirect loop (`/dean/does-not-exist/reports/reports/reports…`), the address grows without end and the tab becomes unresponsive. Reproduced on the production build too. Expected after a fix: one redirect to `/dean/reports`. |
| ☐ | NAV-06 | P1 | Accounts: Student, Adviser-only, Department Head, Department Staff, Admin | Type `/dean/reports` for each. | **Verified:** each is redirected to its own home (`/student`, `/adviser/dashboard`, `/department-head/curriculum-transfers`, `/department-staff/students`, `/admin`). No Dean data loads. |
| ☐ | NAV-07 | P1 | Signed-out visitor; deactivated account | Open `/dean/reports`. | Redirected to `/login`. No Dean content, even briefly. |
| ☐ | NAV-08 | P1 | Dean + Adviser account | Open `/department-head/students`, `/department-staff/students`, `/admin`. | Redirected to `/dean/reports` (verified for Head and Staff). The Dean role grants no access to those portals. |
| ☐ | NAV-09 | P1 | Dean + Adviser account (Adviser role confirmed) and a Dean-only account (no Adviser role) | 1. As Dean + Adviser, open `/adviser/dashboard` and `/adviser/advisees` by URL and from the sidebar.<br>2. As Dean-only, open the same URLs. | **Role check.** With the Adviser role confirmed the Dean can open Adviser routes (verified: `/adviser/advisees` opens). Without it the Dean-only account sees only the DEAN group and both URLs redirect to `/dean/reports` (verified). The Dean role alone never grants Adviser routes. |
| ☐ | NAV-10 | P2 | Dean + Adviser account | Reload every Dean page, use Back and Forward, and open each URL in a new tab. | Every page reloads at the same URL with no 404. Back and Forward restore the right page. |
| ☐ | NAV-11 | P2 | Dean account | 1. Use **Sign out** in the account menu at the sidebar foot.<br>2. Press Back.<br>3. Re-open a Dean URL. | Redirected to `/login`. Back does not reveal Dean data with a real login. Protected URLs redirect to login. |
| ☐ | NAV-12 | P3 | Dean + Adviser account | Collapse and expand the sidebar groups by mouse and by keyboard. | Groups toggle without losing the active page. Keyboard works. Active group stays visible. |
| ☐ | NAV-13 | P2 | Dean account | Read the subtitle of Faculty reports, Students and Audit log. | All three show the faculty name (verified: "Faculty of Computing"). |
| ☐ | NAV-14 | P2 | Faculty record missing or inactive **[Fault injection]** | Open each Dean page. | Each shows "Faculty unavailable" with "Faculty information is unavailable for this account." and a Retry button. No fallback faculty name is invented. |
| ☐ | NAV-15 | P2 | Network blocked | Open each Dean page. | While loading: "Loading ‹faculty reports / students / the audit log›…". On failure: "Unable to load ‹label›. Please try again." with **Retry**; Retry reloads when the network returns. |
| ☐ | NAV-16 | P2 | Dean account | Use the account menu "Change Password" link. | Opens `/settings` ("Change password") with the Dean shell. |
| ☐ | NAV-17 | P2 | Dean account | View each Dean page at 360, 768 and 1280 px. | No horizontal page scroll. Tables stack into labelled rows on narrow screens. Dialogs fit the viewport. |

### DIR: Faculty students directory

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | DIR-01 | P1 | Faculty with students | Open Students. | Heading "Students", subtitle is the faculty name. Filters Search students, Curriculum, Adviser, "Reset filters". Panel "Faculty student roster" with a count ("26 students" when unfiltered). Columns: Student, Student no., Department, Curriculum, Adviser (verified). |
| ☐ | DIR-02 | P1 | Directory loaded | Search a full name, part of a name, in other letter case and with surrounding spaces. | Matching students only. Count reads "Showing X of N students" and the right-hand count updates (verified with "  STA. agata "). |
| ☐ | DIR-03 | P1 | Directory loaded | Search a full student number and part of one. | Matching students only. |
| ☐ | DIR-04 | P2 | Directory loaded | Open Curriculum and choose each option, then "All curricula". | Options are "All curricula" plus each curriculum alphabetically. Rows and counts follow. |
| ☐ | DIR-05 | P2 | Directory loaded | Open Adviser and choose an adviser, "Unassigned" and "All advisers". | Options include "Unassigned" when a student has no adviser (verified). Rows and counts follow. |
| ☐ | DIR-06 | P1 | Directory loaded | Combine search, curriculum and adviser. | Rows satisfy all three at once. |
| ☐ | DIR-07 | P2 | Directory loaded | Search `zzznomatch`. | "No students match these filters." with a **Reset filters** button inside the table (two Reset buttons exist at that moment: filter bar and table; verified). Count reads "Showing 0 of N students". |
| ☐ | DIR-08 | P2 | Filters applied | Click either Reset filters button. | All filters clear and all students return. The filter-bar Reset is disabled when no filter is active. |
| ☐ | DIR-09 | P1 | Directory loaded | Click a student row. | Dialog "‹name› · Academic record" opens (see REC). |
| ☐ | DIR-10 | P2 | Directory loaded | Tab to a row (rows are focusable buttons named "Open record for ‹name›"), press Enter, close, then press Space. | Both keys open the record (Enter verified). Esc closes and focus returns. |
| ☐ | DIR-11 | P1 | Faculty with two departments | Compare rows to departments. | Every faculty department's students appear, each with its Department name. Students outside the faculty never appear. |
| ☐ | DIR-12 | P3 | More than 100 students | Open the page. | All students load (counts and rows complete). |
| ☐ | DIR-13 | P1 | **[API]** a student from another faculty | Request that student's roster entry, checklist or grades with the Dean's token. | Denied or empty. The student is absent from the directory. |
| ☐ | DIR-14 | P3 | A student appears twice in the roster payload | Open the directory. | Each student shows once (rows are keyed by student number: check for missing or duplicated rows). |

### REC: Student record

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | REC-01 | P1 | Directory loaded | Open a student. | Header: name, student number, program name, year label ("1st Year" style), email and a standing badge (Good, Flagged or Delinquent). Tabs Checklist, Grades, Audit log. Footer Close button. No Save, Edit or Delete controls anywhere (verified). |
| ☐ | REC-02 | P2 | Students with different standing | Compare badges with the student's data. | Probation, dismissed or delinquent shows **Delinquent**. Warning or any open flag shows **Flagged**. Otherwise **Good**. |
| ☐ | REC-03 | P2 | Student with grades | Open Checklist. | A degree progress block ("Your degree, in view", program, curriculum, "N units earned", "x% of N units", "Cumulative GWA: x.xx"). Collapsible term groups "Year N · Semester N" with Passed units and Total units. Rows show code, title, units, status, satisfaction source ("Outside credit", "Direct", "Direct attempt", "Not yet satisfied") and attempts. The wording "Your degree" is student-facing copy shown to a Dean (**Observe**). |
| ☐ | REC-04 | P2 | Checklist open | Click "Course info" on rows with and without attempts. | Dialog with "‹code› · ‹title›", a meta line, "Status:" badge and attempt count. Attempts table (Attempt, Term, Midterm, Final, Completion, Instructor, Result) or "No attempts recorded yet." "Grade fix history" lists entries or "No grade fixes recorded." Closing returns to the record. |
| ☐ | REC-05 | P2 | Student with and without grades | Open Grades. | Panel "Grades by term" with "N record(s)". Columns Term ("1st Semester AY 2026 - 2027"), Course, Units, Final grade, Status. Completion grade is used when present. A lapsed INC shows an "INC lapsed" style status. Empty: "No grade records available for this student." There is no midterm column here. |
| ☐ | REC-06 | P2 | Student with and without events | Open Audit log. | Panel "Record audit trail" with "N record(s)" and columns When, Who, Action, Details, or "No audit events recorded for this student yet." Only events for this student appear. |
| ☐ | REC-07 | P1 | Any student | Look for any way to change data. | None. All tabs and dialogs are read-only (verified). |
| ☐ | REC-08 | P1 | Audit log noted before | Open a student record, then open Dean Audit log. | A "View" entry reads "Viewed student academic record (‹student number›)" with the acting Dean, the student and the time. One entry per open on the production build (verified). In development mode two entries appear because of React StrictMode. |
| ☐ | REC-09 | P2 | **[Fault injection]** the audit-event request fails | Open a record. | The record still opens and shows data. No error is shown, so the missing audit entry goes unnoticed (**Observe**). |
| ☐ | REC-10 | P2 | Record open | Close with Close, Esc and click outside, then open another student. | The next record shows only that student's data on the Checklist tab. |
| ☐ | REC-11 | P3 | **[Fault injection]** one tab request fails | Open the failing tab. | "Unable to load ‹student checklist / student grades / record audit trail›. Please try again." with Retry. Other tabs still work. |
| ☐ | REC-12 | P3 | Student in 5th year or later | Read the year label. | Reads "5th Year" and so on (fallback pattern "Nth Year"). |
| ☐ | REC-13 | P2 | Record opened from Reports cohort (RPT-17) | Open the record. | Same record dialog, same read-only behaviour, same audit entry. |

### RPT: Faculty reports

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | RPT-01 | P1 | Faculty with departments | Open Faculty reports. | Heading "Reports", subtitle the faculty name, a "Department" selector (default "All departments") and a **Download PDF** button. Three tiles, panel "Final grade distribution", table "GWA by batch and curriculum" (verified). |
| ☐ | RPT-02 | P1 | All departments | Read the tiles. | "Students" (note "Across ‹dept codes›", for example "Across DCST and DIS"), "Mean GWA" (note "Cumulative weighted average"), "With deficiencies" (note "5.00, INC, DR, or NA on record"). Totals match the sum of the Students directory. |
| ☐ | RPT-03 | P1 | Departments DCST and DIS | Open the Department selector and choose each option. | Options are "All departments" plus each faculty department code (verified: All departments, DCST, DIS). Choosing a department changes every tile, the distribution and the cohort table. The Students note becomes "Enrolled in ‹code›". |
| ☐ | RPT-04 | P1 | A department with students | Choose it and compare with the Students directory (Department column). | Student count and deficiencies match the directory for that department. |
| ☐ | RPT-05 | P1 | Independently calculated expected values | Compare Mean GWA for All departments and for one department. | All departments uses the faculty figure from the server. A department uses the server's department summary, or the average of its students' GWAs when no summary exists. Both match the independent calculation. |
| ☐ | RPT-06 | P1 | Cohorts of unequal size (for example 2, 23 and 1 students) | Compare the report Mean GWA with a plain average of cohort means. | The report is not a simple average of cohort means: it reflects the correct student weighting. A cohort's own Mean GWA is the plain mean of its members that have a GWA. |
| ☐ | RPT-07 | P2 | A cohort where no student has a GWA | Read its Mean GWA. | Shows "—". |
| ☐ | RPT-08 | P2 | Students with a 5.00, INC, DR or NA | Read "With deficiencies". | Counts students (not grades) that have such a result and matches the underlying records. |
| ☐ | RPT-09 | P1 | Report values known | Compare with the Department Head's Department reports for the same department **[Cross-portal]**. | Student count, Mean GWA and deficiencies agree (verified: 26, 3.50, 2). |
| ☐ | RPT-10 | P1 | Known grade data | Read "Final grade distribution". | Five bands: 1.00–1.50, 1.75–2.25, 2.50–3.00, 5.00 and "INC / DR / NA". Each shows a percent and "N grades" in its detail. Counts agree with the underlying attempts for the selected scope only. |
| ☐ | RPT-11 | P1 | Grades that are still enrolled, or between 3.00 and 5.00 (for example 4.00) | Add up the percentages. | Verified: the bands can total far less than 100% (20% in the mock) because the denominator is every grade, including grades with no final result yet and grades that fit no band. The panel says "Share of final grades". Confirm the intended denominator with the team (**Observe**). |
| ☐ | RPT-12 | P1 | Department with no students (DIS in the mock) | Choose it. | No crash or divide-by-zero. Tiles show 0 students and 0 deficiencies, all bands 0%, and the cohort table says "No cohort records available for this department." Mean GWA shows "0.00", which looks like a real GWA, while cohort rows use "—" for no data (verified, **Observe**). |
| ☐ | RPT-13 | P2 | Empty scope | Look at the bands. | All five bands read 0% with no invented grades. |
| ☐ | RPT-14 | P1 | Cohorts exist | Read "GWA by batch and curriculum". | Columns Batch, Curriculum, Students, Mean GWA, Actions with "View students →". Rows sorted by batch year ascending. Counts per department filter. Inside the same batch the order of curricula is not sorted (**Observe**). |
| ☐ | RPT-15 | P2 | Dean of another faculty **[Cross-portal]** | Open the selector. | Only departments of that Dean's own faculty are offered. |
| ☐ | RPT-16 | P2 | Cohort rows | Click "View students" on each cohort. | Dialog "Batch ‹year› · Student GWA" with the description "‹curriculum› · N students". |
| ☐ | RPT-17 | P1 | Cohort dialog open | 1. Compare the list with the row's Students value.<br>2. Click a student's name.<br>3. Close. | The list is complete and in one scrollable table (Student, Student ID, Curriculum, GWA with "—" when none). Counts and GWAs match the report and directory. Clicking a name closes the dialog and opens that student's record (verified). Empty cohort: "No students match this cohort." |
| ☐ | RPT-18 | P3 | Cohort dialog | Close with Close, X and Esc. | Dialog closes. Report keeps the same department. |
| ☐ | RPT-19 | P1 | **[API]** | Request reports or attempts for another faculty. | No other faculty data returned. Report totals never include it. |
| ☐ | RPT-20 | P2 | Report loaded | Change the department several times quickly. | Final view matches the last selection. No stale mix of tiles and table. |
| ☐ | RPT-21 | P2 | **[Fault injection]** reports request fails | Open Faculty reports. | "Unable to load faculty reports. Please try again." with Retry that recovers once the fault clears (see NAV-14, NAV-15). While no report is shown the Department selector and Download PDF are disabled. |
| ☐ | RPT-22 | P1 | Report shown | Click **Download PDF** on the page. | A preview dialog "Preview: Faculty reports" opens with the filename. Nothing downloads yet. The page button name suggests a download but only previews (**Observe**). |
| ☐ | RPT-23 | P1 | Audit log noted | Open a cohort, then check the Audit log. | A View entry "Report drill-down: batch ‹year› (‹n› students)" by the acting Dean with no student (verified). |
| ☐ | RPT-24 | P1 | Preview open | Inspect the PDF for All departments and for each department. | Letterhead always reads "Office of the Dean" with the faculty name (verified for DCST). Title "FACULTY REPORTS". Subtitle is the department or "All departments". Three stat boxes (Students, Mean GWA, With deficiencies). Section "Final grade distribution" (Grade range, Share of final grades) and "GWA by batch and curriculum version" (Batch, Curriculum, Students, Mean GWA). Figures equal the screen. |
| ☐ | RPT-25 | P1 | Preview open | Read the signature area and footer. | The signed-in Dean's name over "Noted by: Dean" (verified). No "Prepared by", no Department Head or Adviser name. Footer "Generated ‹date› through SAAIS" and "Page X of Y". |
| ☐ | RPT-26 | P1 | Preview open | Click Close (no download), then reopen and click **Download PDF**. Check the Audit log. | Close downloads nothing and logs nothing. Download saves `SAAIS-faculty-reports.pdf` for all departments or `SAAIS-faculty-reports-‹department-slug›.pdf` (for example `...-dcst.pdf`, verified). The file equals the preview. An entry "Exported faculty report (‹scope›) as PDF" is logged for the Dean. |
| ☐ | RPT-27 | P1 | Downloaded PDF | Share the file or the preview address with another account **[Multi-session]**. | The PDF is built in the browser. No server link exists. The preview address stops working after the dialog closes, and no other account can fetch it. |
| ☐ | RPT-28 | P3 | **[Fault injection]** PDF cannot be built | Open the preview. | "Unable to create the PDF. Close the preview and try again." Download stays disabled. |
| ☐ | RPT-29 | P3 | Many cohorts | Export. | Tables continue on a new page with "(continued)" headings. Nothing is cut off. |

### AUD: Faculty audit log

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | AUD-01 | P1 | Events exist | Open Audit log. | Heading "Audit log", subtitle the faculty name. Panel "Audit events" with "N record(s)". Filters Person, Student, Action, From, "Reset filters". Columns When, Who, Action, Student, Details (verified). |
| ☐ | AUD-02 | P2 | Events on several dates | Read the row order. | Rows appear in the order the server returns them. In the mock this is oldest first, while the Department Head log is newest first (**Observe**: no sort is applied). |
| ☐ | AUD-03 | P1 | Several actors | Type part of a name in Person (other case, surrounding spaces). | Only that actor's events remain (verified with "  bucol "). |
| ☐ | AUD-04 | P1 | Events about different students | Type a student name or a student number in Student. | Only events for that student remain. Person searches the actor and Student searches the affected student (verified). |
| ☐ | AUD-05 | P1 | All action types present | Choose View, Change, Sign-in and All actions. | Options are "All actions", "View", "Change", "Sign-in". Each filter shows matching rows. See AUD-08 for how events are classified. |
| ☐ | AUD-06 | P2 | Events on several dates | Set From to a date before, on and after an event day. | Inclusive from that day in Manila time (verified: 2026-10-01 keeps an event of 1 Oct, 2026-10-02 drops it). There is no To date. |
| ☐ | AUD-07 | P2 | Event near midnight Manila time | Filter From on that date. | The event is counted by its Manila date. |
| ☐ | AUD-08 | P1 | Events of every kind (grade update, advising plan save, note change, override, sign-in, export, record view, term change) | Filter by Action and compare each event with what it is. | Each event is classified sensibly. **Confirmed defect:** only categories `change` and `grade_change` count as Change and only `auth` and `login` as Sign-in. The real categories are `sign_in`, `grade_update`, `plan_save`, `note_change`, `override` and others, so sign-ins and saved advising plans show as **View** (verified: "Saved advising plan…" shows View; Change and Sign-in filters returned 0). The Department Head log classifies the same events differently. |
| ☐ | AUD-09 | P1 | Audit page | Look for edit, delete, import or export controls. | None. Entries are read-only. |
| ☐ | AUD-10 | P2 | Combined filters | Combine Person, Student, Action and From. | Only rows meeting every condition remain. Each also works alone. |
| ☐ | AUD-11 | P1 | Recent changes by a Head, Staff or Adviser in the faculty **[Cross-portal]** | Reload the Dean audit log. | Those events appear with their true actor, student and wording (verified: a Head's reassignment appears as "Reassigned to …" by that actor). |
| ☐ | AUD-12 | P1 | **[API]** other faculty's events | Compare with the other faculty's log. | Only this faculty's events are visible. |
| ☐ | AUD-13 | P2 | No matches | Filter for something absent, then Reset. | "No audit records match these filters." then the full list. Reset is disabled when no filter is active. |
| ☐ | AUD-14 | P3 | Events with and without students | Read the Student column. | "‹number› · ‹name›" or "—". Timestamps read "dd Mon yyyy, hh:mm" in 24-hour time (the Head log uses 12-hour time: inconsistent, **Observe**). |
| ☐ | AUD-15 | P3 | More than 100 events | Open the page. | All events load (record count equals the real total). |

### NTF: Notifications

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | NTF-01 | P1 | Dean account with unread notifications | Look at the bell in the top bar. | Accessible name "Notifications, N unread" with a count badge. No badge when none. |
| ☐ | NTF-02 | P2 | Dean account | Open the bell and click "See all notifications". | Opens `/notifications` with the Dean shell and breadcrumb "Office of the Dean › Notifications" (verified). With none: "0 unread of 0 notifications." and "You are all caught up." (verified for the standard Dean account). |
| ☐ | NTF-03 | P1 | Unread notification with a Dean target (Faculty reports, Students or Audit log) | Open it from the bell and from the inbox. | Opens the Dean page inside the Dean shell. Read state persists and is the Dean's own. |
| ☐ | NTF-04 | P2 | Unread items | Use Mark read, Unread filter and Mark all as read. | Same behaviour as in the Department Head suite (NTF cases there). |

### SEC: Security and non-functional

| Done | ID | Pri | Preconditions / data | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| ☐ | SEC-01 | P1 | **[API]** a user who is only named "Dean" in a title but has no Dean role | Call the faculty roster, faculty report, audit and checklist endpoints. | All refused. A genuine Dean succeeds. |
| ☐ | SEC-02 | P1 | **[API]** | Using the Dean's token request records of a second faculty (students, checklist, grades, audit, reports). | No cross-faculty disclosure. |
| ☐ | SEC-03 | P1 | **[Multi-session]** two Deans of different faculties | Compare their directory, reports and audit log. | Each sees only its own faculty. |
| ☐ | SEC-04 | P1 | Exported PDF | Inspect where the file lives. | The file only exists on the Dean's computer. No hosted link exists. |
| ☐ | SEC-05 | P1 | **[API]** | Try to edit or delete audit entries or student data with the Dean token. | Refused. |
| ☐ | SEC-06 | P1 | Free-text values such as names containing HTML or script text | View them in the directory, record, cohort dialog, PDF and audit log. | Shown as plain text. Nothing runs. Layout holds. |
| ☐ | SEC-07 | P2 | Tester computer in a non-Manila timezone | View audit times, From filter and the PDF date. | Times follow Manila time. The PDF "Generated" date follows the computer clock (**Observe**). |
| ☐ | SEC-08 | P2 | Keyboard and screen reader | Walk each page and dialog. | Rows are operable by keyboard, dialogs trap focus, errors are announced, counts are live. |
| ☐ | SEC-09 | P2 | Chrome, Edge, Firefox, Safari | Smoke-test every page, dialog and PDF preview. | Works in each browser. |
| ☐ | SEC-10 | P2 | Production build | Reload each page URL. | No 404 on refresh. Behaviour matches development, except audit entries are written once per open (REC-08). |

---

## 6. Observations to confirm with the team

| # | Area | Observation | Related case |
| --- | --- | --- | --- |
| 1 | Navigation | **Confirmed:** any unknown `/dean/...` URL causes an endless redirect loop and hangs the tab (also in production). | NAV-05 |
| 2 | Audit log | **Confirmed:** categories are mapped with the wrong names, so sign-ins and saved advising plans appear as "View" and the Change and Sign-in filters can miss real events. | AUD-08 |
| 3 | Audit log | Rows are not sorted. Order is whatever the server returns (oldest first in the mock). | AUD-02 |
| 4 | Reports | **Confirmed:** an empty department shows Mean GWA "0.00" instead of "—". | RPT-12 |
| 5 | Reports | **Confirmed:** distribution percentages are rounded one by one over all grades, so they do not add to 100% (20% in the mock). | RPT-11 |
| 6 | Reports | The page button "Download PDF" opens a preview and does not download. | RPT-22 |
| 7 | Reports | The PDF always uses the faculty letterhead and has no generated-by actor or "Prepared by" line. | RPT-24, RPT-25 |
| 8 | Reports | Cohort rows with the same batch are not sorted by curriculum. | RPT-14 |
| 9 | Student record | The Checklist uses student-facing wording ("Your degree, in view"). | REC-03 |
| 10 | Student record | A failed audit-event request is ignored silently, so a view may go unlogged without notice. | REC-09 |
| 11 | Student record | In development mode each open is logged twice (React StrictMode). Production logs once. | REC-08 |

---

## 7. Coverage summary

| Module | Cases | P1 | P2 | P3 |
| --- | --- | --- | --- | --- |
| NAV | 17 | 6 | 9 | 2 |
| DIR | 14 | 7 | 5 | 2 |
| REC | 13 | 3 | 8 | 2 |
| RPT | 29 | 19 | 7 | 3 |
| AUD | 15 | 8 | 5 | 2 |
| NTF | 4 | 2 | 2 | 0 |
| SEC | 10 | 6 | 4 | 0 |
| **Total** | **102** | **51** | **40** | **11** |

Every Dean page, dialog, filter, tab, PDF and redirect in `src/routes/dean/` has at least one case. Every original case DA-01 to DA-23 maps to at least one revised case (section 4). Behaviour that depends on the real back end (other faculties, role changes, concurrency, notification targets) is covered by cases but could not be proven in mock mode (section 8).

---

## 8. Verification run in the running app

### How the app was run

- Dev server in mock mode (`VITE_API_MODE=mock npx vite`), plus a production build previewed in mock mode for NAV-05 and REC-08. First start needed `--force` to clear a stale dependency cache.
- Signed in through the mock personas `dean` (Dean + Adviser), `dean_only`, `dean_dept_head`, `student`, `adviser`, `department_head`, `department_head_only`, `department_staff` and `admin`, driven with headless Chromium.

### Seen working as written (verified)

NAV-01, NAV-02 (reports), NAV-03, NAV-04, NAV-05 (defect), NAV-06, NAV-08, NAV-09, NAV-13, DIR-01, DIR-02, DIR-05, DIR-07, DIR-10 (Enter), REC-01, REC-03, REC-05, REC-06, REC-07, REC-08 (production), RPT-01 to RPT-03, RPT-09, RPT-10, RPT-11, RPT-12, RPT-14, RPT-17, RPT-22, RPT-24, RPT-25, RPT-26 (file name only), AUD-01, AUD-03, AUD-04, AUD-06, AUD-08, AUD-11, NTF-02.

### Differences found while verifying (already folded into the cases above)

NAV-05, AUD-02, AUD-08, REC-03, REC-08, RPT-03, RPT-11, RPT-12, RPT-22, RPT-24, RPT-25, RPT-26.

### Not verifiable in mock mode

| Group | Why |
| --- | --- |
| Cases about another faculty (DIR-13, RPT-15, RPT-19, AUD-12, SEC-02, SEC-03) | The mock has one faculty. |
| **[Fault injection]**, **[API]**, **[Multi-session]** cases (NAV-14, REC-09, REC-11, RPT-21, RPT-28, SEC-01, SEC-04, SEC-05) | Need tooling. |
| NTF-01, NTF-03, NTF-04 | The Dean mock account has no notifications. |
| Everything else not listed as verified | Written from the source only. Not run. |
