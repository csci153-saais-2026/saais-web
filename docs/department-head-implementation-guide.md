# Department Head implementation guide

## 1. Purpose and starting point

The Department Head module supports department-level academic administration in SAAIS. Its pages cover curriculum management, transfer decisions, recognition of outside credits, student records, adviser allocation, academic terms, reporting, audit history, and department settings.

The current React implementation contains working presentation flows backed partly by local records and session-only state. The implementation goal is to retain the required workflows, match the supplied designs, and make reads and writes flow through the project's typed API and shared MSW backend. Production-ready page code must handle the actual API responses and supported validation rules.

This guide records the original review requirements, the subsequent team ownership decisions, and repository findings at commit `b455802`. It is a handoff for future implementation. Creating this guide does not complete any implementation task. Each group decides how its members divide work within the boundaries below.

The original review is the source for required corrections. Later planning decisions in this guide define ownership, sequencing, and temporary compatibility arrangements. Findings described as gaps are observations of the inspected implementation. They do not establish new product requirements. [Original PR review](https://github.com/csci153-saais-2026/saais-web/pull/63#pullrequestreview-5922784133)

### Sources to consult

Paths in this document are relative to the repository root.

| Source | Use |
| --- | --- |
| `mockup/prototype.html` | Overall prototype reference requested by the reviewer. |
| `/styleguide`, implemented by `src/routes/styleguide/StyleguidePage.tsx` | Existing application components, typography, and design conventions. |
| `mockup/Department Head/*.dc.html` | Page-specific layout and content. Adviser screens in this directory remain outside this PR's implementation scope. |
| `mockup/Department Head/department-head.css` | DH table, dialog, and page measurements. |
| `mockup/department-head.js` | Dialog content, field labels, and page interactions. |
| `mockup/pdf-export.js` | PDF layout and export behavior reference. |
| `mockup/audit-settings.js` | Audit filtering and Settings interactions. |
| `mockup/Department Head/curricula-editor.js` | Curriculum editor interactions and dialogs. |
| `src/lib/api/README.md`, `contract/openapi.yaml`, `contract/generated/schema.d.ts` | Typed requests, responses, and supported backend behavior. |
| `src/mocks/handlers.ts`, `src/mocks/store.ts`, `src/mocks/personas.ts` | Existing MSW handlers, records, and role/persona setup. |
| `AGENTS.md` | Repository Vite/React guidance, including build and preview validation. |

The visual and behavioral references include static mockup scaffolding. The review explicitly requires removing sample footers and preview/demo copy even where those appear in the mockups. API operations replace the reference scripts' local-memory or localStorage persistence.

`DEPARTMENT_HEAD_WORK_SPLIT.md` and `docs/department-head-mock.md` describe the older preview implementation and contain obsolete assignments and behavior. Their local-only instructions are superseded by the review and this agreed plan. Their eventual update or removal belongs to final cleanup.

## 2. Original PR requirements that apply across pages

### Production-code cleanup

- [ ] Remove the `Department Head preview` Alert in `DepartmentHeadLayout.tsx`, including the message about sample records and session-only changes.
- [ ] Remove every page note describing the app as a preview, sample, demo, fictional, or illustrative. Remove extra explanatory text absent from the mockup.
- [ ] Remove every DH page's `SampleFooter` usage. The cited messages include `Sample records for presentation · Reference date… · Static design` and `Fictional records. Changes stay in this preview…`.
- [ ] Replace the Students panel's `Select a student to open a read-only checklist preview.` with the mockup's directory summary line.
- [ ] Use `Select one or more students to reassign together.` for Adviser assignments instead of the explanatory reassignment description identified in the review.
- [ ] Remove the Audit log's `Sample activity plus changes made in this preview.` and Reports' `Illustrative cohorts…` descriptions.
- [ ] Remove Settings descriptions beginning `A sample sender address…`, `These sample values await confirmation…`, and `Sample metadata only…`.
- [ ] Remove extra helper text identified by the reviewer, including `Select all applies to the filtered list…`, `Dates and timestamps use Philippine time.`, `Use whole percentages from 0–100…`, and `Swipe across the course table…`.
- [ ] Remove the equivalence empty-state instruction about selecting BSCS 2021 and BSCS 2024 to see a populated sample.
- [ ] Replace mockup-only report states such as `No sample report available` and `Show latest sample report` with behavior based on the real API response.
- [ ] Remove the `Sample data` badge and change `Close preview` buttons to `Close`.
- [ ] Replace toasts mentioning `…in this preview` or `Sample data reset.` and remove the synthetic audit actor `Demo Department Head`.
- [ ] Retire `PreviewStateProvider`, `shared/preview-state.ts`, and the `resetPreview` flow after all page migrations are complete.
- [ ] After local records are retired, remove or rename `preview-data.ts` files and remaining `Preview*` types/IDs according to their actual use.
- [ ] Update or remove the two obsolete preview documents during final cleanup.

Removing copy does not remove required validation or status feedback. Follow the mockup and actual operation when choosing replacement text.

### Local data files identified for retirement

The original review prohibits creating page data inside `src/routes/department-head` and explicitly identifies the following deletion targets. Their removal is deferred until every page migration is complete and remaining importers have been handled.

```text
src/routes/department-head/*/preview-data.ts
src/routes/department-head/reports/reports-data.ts
src/routes/department-head/settings/settings-data.ts
src/routes/department-head/audit-log/audit-data.ts
src/routes/department-head/students/checklist-preview-data.ts
src/routes/department-head/shared/mock-students.ts
src/routes/department-head/shared/students-data.ts
```

Also retire the hardcoded `cohorts` and `STUDENT_OPTIONS`. Derive page records and eligible choices from supported API responses. Retain useful pure formatting or UI logic only after separating it from fixture data and obsolete preview types.

### Scope and shared shell

- [ ] Remove Adviser pages, placeholders, routes, or navigation introduced by the DH branch. Preserve the Adviser module already present in `origin/feat/frontend`.
- [ ] Preserve the DH Adviser assignments page. It is a DH management page.
- [ ] Restore `src/components/features/AuthenticatedPortalLayout.tsx` to the frontend version, removing the DH-specific `currentPage`, `topbarTrailing`, and `children` additions.
- [ ] Restore `src/layouts/AuthenticatedLayout.tsx` to the frontend version as agreed during planning.
- [ ] Keep the shared DH navigation configuration aligned with frontend. Raise URL/menu changes with the shell developer.
- [ ] Register DH routes inside the shared `<Route element={<AuthenticatedPortalLayout />}>` in `src/App.tsx`.
- [ ] Remove the DH layout's nested authenticated shell, breadcrumb-title logic, custom notification bell, and eventually its notification state. Preserve the Notifications page's required context until reviewer clarification.
- [ ] Drop DH sidebar/shell assertions from `department-head.integration.test.tsx`. Delete the failing Advisees assertion and obsolete related coverage.

At the inspected baseline, `git diff origin/feat/frontend -- src/routes/adviser src/navigation/adviser.ts` is empty. There are zero Adviser portal files on the current removal list. Recheck the diff before deleting anything if the base changes.

The following added files belong to the required DH Adviser assignments feature and remain in scope.

```text
src/routes/department-head/adviser-assignments/AdviserAssignmentsPage.tsx
src/routes/department-head/adviser-assignments/ReassignAdviserDialog.tsx
src/routes/department-head/adviser-assignments/adviser-assignments.test.tsx
src/routes/department-head/adviser-assignments/assignment-model.ts
```

### Shared components, tables, and dialogs

- [ ] Use `DataTablePanel` from `src/components/features/data-table-panel.tsx` for the repeated panel/table pattern. Audit log already uses it. Migrate the other applicable tables.
- [ ] Use `Tabs` from `src/components/ui/tabs.tsx` for the student-record tabs.
- [ ] Use shared `Button` in place of raw buttons identified in Students and Notifications, subject to the Notifications decision below.
- [ ] Finish with one toast implementation. The current `DepartmentToast` and the inline provider toast duplicate this behavior.
- [ ] Match table header padding of `10px 14px`, body padding of `11px 14px`, 13.5px body text, normal ink color, and vertical centering.
- [ ] Remove added muted cell colors, general `font-mono text-xs` styling, right-aligned Units/Grade columns, and fixed `w-20` columns where they differ from the mockup.
- [ ] Render student identity cells with a bold name and mono student ID on the line below.
- [ ] Include the table footer with count on the left and `DCST department scope` on the right.
- [ ] Size every DH dialog to the reference `min(680px, 100% − 32px)`. This includes transfer review, curriculum editing, equivalence, outside credits, student workflows, assignments, terms, backup recording, and cohort drill-downs.

The base `DialogContent` has `sm:max-w-lg`. Adding only `max-w-md`, `max-w-lg`, or `max-w-xl` does not override that desktop breakpoint. Use a breakpoint-aware override such as `sm:max-w-[680px]` while retaining the mobile viewport margin.

## 3. Page responsibilities and acceptance requirements

The owners below are coordination boundaries. Each group chooses its own internal delegation and page work order.

### Curriculum Transfers — Group C

**Route** `/department-head/curriculum-transfers`  
**Folder** `src/routes/department-head/curriculum-transfers/`  
**Reference** `mockup/Department Head/CurriculumTransfers.dc.html`

- Read pending requests and decision history through the API rather than `MOCK_TRANSFER_REQUESTS` and `MOCK_TRANSFER_HISTORY`.
- Preserve the pending/history workflow and review dialog, including supported approve/reject decisions and reason handling.
- Submit decisions to the transactional transfer-decision endpoint and reflect the returned state.
- Fix Transfer requests table column spacing to match the mockup.
- Apply the shared table, dialog-width, copy, and test requirements.

The current decision handler already persists transfer decisions. Approval updates the student's curriculum assignment and related organization/profile records. Its implementation does not call the curriculum-pair equivalence endpoint, so this page does not need to wait for JD's Equivalence page.

### Curricula — JD

**Route** `/department-head/curricula`  
**Folder** `src/routes/department-head/curricula/`  
**References** `Curricula.dc.html` and `curricula-editor.js` under `mockup/Department Head/`

- Read versions, terms, and course/slot records through the typed client.
- Connect the existing version, term, and course/slot operations to the catalog endpoints.
- Match the reference dialogs, including 680px widths. The current implementation uses one shared dialog whose desktop width is constrained by the base component.
- Preserve meaningful reference/deletion safeguards while reconciling the local rules with the mock backend.
- Load catalog options from supported sources rather than hardcoded page records. The current New course flow also needs an explicit mapping to the existing course/catalog contract.
- Apply table reuse, production copy, and MSW test requirements.

### Course Equivalence — JD

**Route** `/department-head/equivalence`  
**Folder** `src/routes/department-head/equivalence/`  
**Reference** `mockup/Department Head/Equivalence.dc.html`

- Read curriculum-pair equivalences and use real catalog IDs for curriculum/course selection.
- Connect supported creation and deletion operations through the catalog API.
- Preserve the one-to-one mapping rule within a curriculum pair and reconcile the mock handler's missing conflict validation.
- Match table spacing, plain left-aligned Units, plain `BSCS 2021 → 2024` pair text, and course code above title.
- Remove the instructional sample-pair empty state and apply the standard dialog width.

Curricula and Equivalence share catalog IDs and reference rules, which supports keeping their ownership together. They do not import each other's page implementation and can both begin using the existing mock records.

### Outside Credits — Group C

**Route** `/department-head/outside-credits`  
**Folder** `src/routes/department-head/outside-credits/`  
**Reference** `mockup/Department Head/OutsideCredits.dc.html`

- Read outside-credit records and submit course-credit entries through the listed endpoints.
- Replace `shared/mock-students.ts` and hardcoded `STUDENT_OPTIONS` consumption with supported student/catalog reads.
- Keep the Credit a course dialog's approved design and layout while matching its width to the mockup.
- Fix Outside credit records table spacing.
- Implement persistent outside-credit creation in MSW so a subsequent read can return the created record.

### Students — Group A

**Route** `/department-head/students`  
**Folder** `src/routes/department-head/students/`  
**Reference** `mockup/Department Head/Students.dc.html` and its dialog definitions in `mockup/department-head.js`

- Load the department directory through `GET /functions/v1/students`.
- Fix directory entry spacing and positioning. Preserve the approved search box, filter dropdowns, and filter button.
- Change `Preview spreadsheet import` to `Import spreadsheet`.
- Build the dialog titled `Import students from spreadsheet`.
- Include the required-columns notice. The reference names student name, student ID, school email, curriculum, and adviser.
- Include a `Spreadsheet file` input accepting `.xlsx` and `.csv` and the student ID format hint. The reference uses `YY-N-NNNNN` with an example such as `24-1-00124`.
- Include a `Validation preview` table with Row, Student ID, and Result columns. Results must come from actual file validation and the supported import workflow.
- Submit supported validation/commit requests to the import endpoint. Implement persistent committed imports in its MSW handler.
- Preserve the student-record modal and add Checklist, Grades, and Audit log tabs using shared `Tabs`. Each tab loads its supported data through the API.
- Use shared `Button` for the raw Students actions identified in the review.

Group A's **student-record Audit log tab** shows the selected student's events. Group C's **standalone Audit Log page** manages department-wide audit browsing. They share an endpoint and have separate page ownership.

Group A owns Students-specific adaptation at the `StudentDirectoryFilters` call site. The existing shared filter also serves Adviser assignments. Unrelated shared filter behavior or appearance is outside that adaptation.

### Adviser Assignments — Group A

**Route** `/department-head/adviser-assignments`  
**Folder** `src/routes/department-head/adviser-assignments/`  
**Reference** `mockup/Department Head/AdviserAssignments.dc.html`

- Read assignments and use the bulk-reassignment endpoint for writes.
- Put select-all in the table header.
- Place `N students selected` and `Reassign selected` in the toolbar row.
- Match the notice beginning `Reassignment takes effect on the selected date…` above the panel.
- Include the count and department-scope footer.
- Match the Reassign selected students dialog with an `N selected student(s)` notice, New adviser, Effective since, and Reason for reassignment fields.
- Include the reference assignment-history caption and use 680px dialog width.
- Verify the assignment result through the API-backed directory. Keep the two workflows consistent without relying on the old preview provider.

### Academic Terms — Group B

**Route** `/department-head/academic-terms`  
**Folder** `src/routes/department-head/academic-terms/`  
**Reference** `mockup/Department Head/AcademicTerms.dc.html`

- Read school terms and department encoding status. Connect supported term creation and encoding-closure operations.
- Match Academic term history table design and spacing.
- Replace `window.print()` export with the shared PDF viewer/export flow described below.
- Match the Add academic term dialog. The reference includes Academic year, Semester, Start date, Actual end date, Encoding deadline, and Encoding status.
- Match Close grade encoding, including its confirmation, warning notice, and Closure note. Connect supported API behavior and report any contract mismatch instead of simulating side effects.
- Keep Academic term details content, match the width, and change its close button to white fill.

### Department Reports — Group B

**Route** `/department-head/reports`  
**Folder** `src/routes/department-head/reports/`  
**Reference** `mockup/Department Head/DepartmentReports.dc.html`

- Follow the full report mockup, including summaries, supported selectors, distributions, enrollment by curriculum, and cohort GWA/drill-down presentation.
- Use `Department summary · Enrollment by active curriculum` as requested.
- Load the report through the department-report API. Improve that handler's supported fields using existing database records and contract types.
- Replace local report fixtures and hardcoded `cohorts` with supported API-backed data.
- Match the cohort dialog titled `Batch YYYY · Student GWA` and the standard width.
- Replace the existing direct-download export with the same viewer used by Academic Terms.
- Use public logos and the reference PDF layout.

#### One PDF implementation for both Group B pages

Group B may create new reusable viewer/export files and edit its two page folders. Existing shared component files remain under JD's ownership. The assigned report handler is an explicit shared-file exception.

The existing `Dialog` and `Button` components, installed `jspdf` dependency, and assets under `public/` provide a verified basis for a viewer without changes to existing shared components. Available assets include `vsu-wordmark.png`, `logo.png`, `logo-mark.png`, `FC.png`, `DCST.png`, and `bagong-pilipinas.png`. Use the assets and placement supported by the reference design.

Both pages must open a viewer containing Close and Download PDF actions. Reuse one viewer/export flow and match `mockup/pdf-export.js`. Check the resulting PDF visually and verify that it contains the selected page's report data and logos.

### Audit Log — Group C

**Route** `/department-head/audit-log`  
**Folder** `src/routes/department-head/audit-log/`  
**References** `mockup/Department Head/AuditLog.dc.html` and `mockup/audit-settings.js`

- Follow the full mockup, including independent Person and Student filters, supported action/date filtering, table, count, and scope footer.
- Read audit entries through the API rather than `audit-data.ts` and local preview-generated events.
- Preserve useful filtering behavior while removing sample descriptions and synthetic preview actors.
- Retain and correctly use the existing `DataTablePanel` integration.

This standalone page belongs to Group C. Group A owns the Audit log tab inside the student-record modal.

### Settings — Group C

**Route** `/department-head/settings`  
**Folder** `src/routes/department-head/settings/`  
**References** `mockup/Department Head/Settings.dc.html`, `settings-layout.html`, and `mockup/audit-settings.js`

- Read settings through the API and connect saves and backup recording to their listed endpoints.
- Place thresholds across the full width, with Email and Backups in equal-height columns below.
- Keep only the sender address in Email and remove Proposed notification events checkboxes.
- Match the Backups card and its `Record a backup made today` action.
- Match the backup dialog's reference fields and labels. The dialog definition includes Completed on, Backup reference, Storage location / reference, and Scope.
- Use the requested `Save` and `Record backup` button labels.
- Preserve supported threshold ordering validation and handle actual API errors.
- Record a completed backup's metadata through the API. The existing endpoint records metadata, and the mockup describes an already completed backup.

### Notifications — JD, pending reviewer clarification

**DH route** `/department-head/notifications`  
**DH folder** `src/routes/department-head/notifications/`  
**Reference** `mockup/Department Head/Notifications.dc.html`

Preserve the page, its URL, and the context it requires until the reviewer clarifies its intended relationship to the shared `/notifications` page. Ask the reviewer first. A redirect is not approved.

The original review identifies raw buttons in `NotificationsPage.tsx` and broadly requires production copy cleanup. Retain those requirements in the backlog while respecting the preservation decision. JD coordinates the eventual approved migration.

| Current owner or consumer | Responsibility |
| --- | --- |
| `DepartmentHeadWorkspace` in `DepartmentHeadLayout.tsx` | Owns local notification records, `markNotificationRead`, and `markAllNotificationsRead`. Supplies outlet context. |
| DH `notifications/preview-data.ts` | Defines records, context types, and initial notification data. |
| DH `NotificationsPage.tsx` | Consumes `DepartmentNotificationsContext` through `useOutletContext`. Owns its All/Unread filter. |
| Shared `NotificationBell` | Receives records and a callback. Owns presentation/action feedback rather than the DH records. |
| Shared `AuthenticatedPortalLayout` and `useNotifications` | Provide the API-backed bell and its query/mutation flow. |
| Shared `src/routes/notifications/NotificationsPage.tsx` | Implements the existing `/notifications` inbox. |

Removing the DH bell does not remove the DH page. Removing layout notification state before replacing its consumer would break the page. Temporarily retain that state and outlet context until the approved consumer transition can be implemented together.

## 4. Backend and typed API reference

All page data access must use the actual typed client from `@/lib/api`. Follow `src/lib/api/README.md` for `apiClient`, `ApiSchema`, `postgrestFilter`, `unwrapApiResult`, and error handling. The contract and generated schema define payloads. Do not hand-edit generated types or bypass the client to maintain another local data backend.

Set `VITE_API_MODE=mock`. MSW serves the existing handlers in `src/mocks/handlers.ts`. Its database and personas are in `src/mocks/store.ts` and `src/mocks/personas.ts`. Persistence in this guide means later reads from the running mock database observe a write. It does not promise persistence across a database reset or app reload.

### Endpoints named by the original review

The table expands the review's shortened checklist/grades paths to their verified full paths. `:id` notation represents a path parameter. Calls through the typed client use the matching schema path syntax and `params.path`.

| Page | Reads | Writes |
| --- | --- | --- |
| Curriculum Transfers | `GET /rest/v1/curriculum_transfer_request` | `POST /functions/v1/curriculum-transfers/:transfer_id/decision` |
| Curricula | `GET /rest/v1/curriculum_version`, `GET /rest/v1/curriculum_term`, `GET /rest/v1/curriculum_term_course` | Catalog POST/PATCH/DELETE operations for `curriculum_version`, `curriculum_term`, and `curriculum_term_course`, detailed below. |
| Equivalence | `GET /rest/v1/curriculum_pair_equivalence` | `POST /functions/v1/catalog/curriculum-pair-equivalences`; `DELETE /functions/v1/catalog/curriculum-pair-equivalences/:id` |
| Outside Credits | `GET /rest/v1/outside_credit` | `POST /functions/v1/students/:student_id/outside-credits` |
| Students | `GET /functions/v1/students`; record modal uses `GET /functions/v1/students/:student_id/checklist`, `GET /functions/v1/students/:student_id/grades`, and `GET /rest/v1/audit_log_entry` | `POST /functions/v1/students/import` |
| Adviser Assignments | `GET /rest/v1/adviser_assignment` | `POST /functions/v1/adviser-assignments/bulk-reassign` |
| Academic Terms | `GET /rest/v1/school_term`, `GET /rest/v1/department_term_encoding` | `POST /functions/v1/catalog/school_term`; `POST /functions/v1/school-terms/:school_term_id/close-encoding` |
| Department Reports | `GET /functions/v1/reports/department` | No write endpoint was assigned in the review. |
| Audit Log | `GET /rest/v1/audit_log_entry` | No write endpoint was assigned in the review. |
| Settings | `GET /rest/v1/system_settings` | `PUT /functions/v1/settings`; `POST /functions/v1/settings/record-backup` |

Curricula catalog operations exist at the following verified paths.

| Resource | Create | Update | Delete |
| --- | --- | --- | --- |
| Version | `POST /functions/v1/catalog/curriculum_version` | `PATCH /functions/v1/catalog/curriculum_version/:id` | `DELETE /functions/v1/catalog/curriculum_version/:id` |
| Term | `POST /functions/v1/catalog/curriculum_term` | `PATCH /functions/v1/catalog/curriculum_term/:id` | `DELETE /functions/v1/catalog/curriculum_term/:id` |
| Course/slot | `POST /functions/v1/catalog/curriculum_term_course` | `PATCH /functions/v1/catalog/curriculum_term_course/:id` | `DELETE /functions/v1/catalog/curriculum_term_course/:id` |

Supporting catalog lookups exist for profiles, faculties, departments, programs, courses, student organizations, and student curriculum assignments under `/rest/v1/`. Use the exact supported filters and types when a page needs labels or eligible options. The current New course UI also has a verified `POST /functions/v1/catalog/course` handler. These supporting operations supplement the original endpoint list and do not authorize unrelated module changes.

The existing shared notification hook uses `GET /rest/v1/notification` and `POST /functions/v1/notifications/mark-read`. Both handlers exist. The original review did not assign a DH Notifications endpoint migration. Its page behavior remains subject to clarification.

Endpoint existence has been checked in source. Completeness and consistency of every workflow have not been established by that check. The known gaps below require implementation and tests.

## 5. Shared components and exact ownership boundaries

### Page folders

| Owner | Owned folders |
| --- | --- |
| JD | `src/routes/department-head/curricula/`, `src/routes/department-head/equivalence/` |
| Group A | `src/routes/department-head/students/`, `src/routes/department-head/adviser-assignments/` |
| Group B | `src/routes/department-head/academic-terms/`, `src/routes/department-head/reports/`, and new PDF viewer/export files agreed for those callers |
| Group C | `src/routes/department-head/curriculum-transfers/`, `src/routes/department-head/outside-credits/`, `src/routes/department-head/audit-log/`, `src/routes/department-head/settings/` |

Page ownership includes colocated page/API helpers and relevant tests. Fixture deletion follows the shared final-cleanup gate even when the fixture lives inside an owned folder.

### Existing shared files

| File or area | Boundary |
| --- | --- |
| `src/App.tsx` | JD owns DH route integration. Coordinate with other route work. |
| `src/components/features/AuthenticatedPortalLayout.tsx` | JD restores the frontend implementation. |
| `src/layouts/AuthenticatedLayout.tsx` | JD restores the frontend implementation after its custom caller is removed. |
| `src/routes/department-head/DepartmentHeadLayout.tsx` | JD owns shell removal, temporary providers/context, and the later approved notification transition. |
| `src/components/features/data-table-panel.tsx` | JD owns modifications. Group A provides requirements and consumes the proposed interface. |
| `src/routes/department-head/shared/StudentDirectoryFilters.tsx` | Existing shared behavior requires JD coordination. Group A owns only Students-specific call-site/data adaptation. |
| `src/routes/department-head/shared/PreviewStateProvider.tsx`, `preview-state.ts`, `students-data.ts`, `mock-students.ts` | Retain until all page migrations finish. JD owns final removal and relocation of still-needed nonfixture helpers. |
| `src/routes/department-head/shared/dh-ui.tsx`, `dh-utils.ts` | Page groups can consume existing APIs. JD owns coordinated changes and final toast consolidation. |
| `src/routes/department-head/department-head.integration.test.tsx` | JD owns shared integration coverage and removal of obsolete shell assertions. |
| `src/navigation/navigation-config.ts`, `src/navigation/department-head.ts`, shared breadcrumb/navigation helpers | Coordinate proposed changes with the shell developer. The current navigation configuration matches frontend. |
| Existing shared `Dialog`, `Tabs`, `Button`, `Table`, shell, and other component files | Reuse their APIs. Coordinate required shared changes with JD and their existing owners. |
| `src/mocks/handlers.ts` | Endpoint-level ownership is defined in the next section. |
| `src/mocks/store.ts`, `src/mocks/personas.ts`, shared mock helpers, `src/mocks/node.ts`, `src/test/setup.ts` | Coordinate changes with JD and affected owners before editing. |
| API client, contract, generated schema, package/configuration files | Coordinate any necessary change. They are outside blanket page-folder ownership. |
| `DEPARTMENT_HEAD_WORK_SPLIT.md`, `docs/department-head-mock.md` | JD handles their eventual update or removal. |

### DataTablePanel interface and independent page work

The current column interface has `header: string`, which supplies displayed text, keys, and responsive cell labels. It cannot directly render the required select-all checkbox. Group A identifies the page requirements, including the Adviser assignments checkbox. JD implements the shared change.

The agreed proposed addition preserves the existing text property.

```tsx
header: string
headerContent?: React.ReactNode
```

`headerContent` optionally replaces displayed header content. `header` remains the stable text key/mobile label. Check the existing `action` and `footer` props before proposing more slots. Existing callers must retain their behavior.

Group A must not modify the shared component directly. To continue independently, it may use a typed page-local adapter implementing the proposed interface and header rendering against existing primitives. Its branch must build and its selection tests must run before JD's shared change lands. Once the shared implementation is available, integrate it and remove the temporary adapter. The adapter is a compatibility step for page UI and does not supply alternate data fixtures.

Other groups can use the current string-header API immediately. They do not need to wait for Group A's checkbox support. Any shared spacing changes must preserve other modules and use coordinated opt-in behavior where needed.

## 6. MSW improvements and validation

### Exact handler ownership

Every handler block below is currently in the same file, `src/mocks/handlers.ts`.

| Owner | Handler blocks | Verified gap and required improvement |
| --- | --- | --- |
| Group A | `POST /functions/v1/students/import` | Currently computes validation/import results without inserting students. Implement supported committed-import persistence using existing database structures. Preserve validation-only behavior. |
| Group B | `GET /functions/v1/reports/department` | Returns a fixed subset of the typed report. Supply the needed supported report data from existing records and project metric logic. |
| Group C | `POST /functions/v1/students/:student_id/outside-credits` | Returns a created credit without storing it. Persist it so subsequent reads observe the write. |
| JD | DELETE handlers for `catalog/curriculum_version/:id`, `catalog/curriculum_term/:id`, `catalog/curriculum_term_course/:id`; relevant curriculum-pair equivalence validation | Reconcile deletion/reference checks and one-to-one validation with the existing UI and contract. |

The current version-delete handler blocks enrolled students, while local Curricula also represents transfer/equivalence references. Term/slot deletion currently removes the matched record directly. The equivalence-create handler checks source/target curriculum IDs but does not enforce the page's one-to-one source/target mapping rule. JD owns reconciling these inconsistencies and testing supported rejection paths.

`src/mocks/store.ts` already has collections for profiles, role assignments, student organizations, adviser assignments, student curriculum assignments, curricula, equivalences, and outside credits. Runtime mutation through `getMockDatabase()` does not itself require editing the store file or adding seed data.

### Data sources and limits

- Use existing MSW handlers and personas. Do not introduce local route fixtures to make a page or test pass.
- Derive report values and choices from supported project records and existing metric logic. Do not invent cohorts, grades, totals, faculty, or student identities to resemble the static display.
- Import rows come from the selected user file. Use the contract's request structure and eligible existing related records.
- Improve only the assigned handler blocks. Coordinate shared helpers, seed initialization, and additional endpoint changes.
- Preserve unrelated consumers of the same endpoints, including other portals.
- Treat incomplete contract mappings as open questions. Record the exact missing field or behavior rather than simulating success.

The typed `DepartmentReport` supports optional `curriculum_summaries`, `batch_curriculum_gwa`, and `grade_distribution`. The current department-report handler omits them. The full cohort-student drill-down source and supported selector behavior still need to be mapped to verified endpoint responses. Group B owns that investigation and its supported handler implementation.

### Test setup and meaningful checks

All contributors set `VITE_API_MODE=mock`. Page tests use their own required router, query, and auth wrapper rather than rendering through `DepartmentHeadLayout`. This keeps page development independent of JD's shell commits.

`src/mocks/node.ts` exports `saaisMockServer`, created from the existing handler list. `src/mocks/index.ts` exports persona login/logout and mock database reset helpers. Existing API tests, such as `src/routes/adviser/advisees/checklist/record.api.test.ts`, show how to use a real `createSaaisApiClient` against the MSW server. Use an actual typed client instance in tests rather than replacing API methods with local fixture returns.

Run relevant page and API tests after meaningful changes. Include tests for the supported reads, selected-record identity, successful writes, validation failures, and post-write reads where persistence is required. Reset MSW handlers, database state, persona/session, and query caches between tests as appropriate.

Existing preview smoke tests, provider-mocking tests, and tests asserting local fixture state must migrate with the page behavior. Retain meaningful coverage when deleting obsolete preview/shell expectations. Do not claim passing builds prove that imports, mutation persistence, or PDF behavior works.

## 7. Foundation sequence and notification dependency

JD's shared foundation work uses these small commits. Run build at every commit boundary and relevant tests after behavior changes. This sequence has been inspected statically and still requires execution-time verification during implementation.

| Commit | Scope | Required safeguards/checks |
| --- | --- | --- |
| 1 | Delete obsolete DH sidebar/shell coverage, including the failing dual-role Advisees test. | Deleting only its first assertion leaves later obsolete expectations. Preserve meaningful page/access-control checks and run DH integration tests. |
| 2 | Remove the DH preview banner and unused imports. | Run relevant DH page/route checks and build. |
| 3 | Give the DH Notifications page independent read/unread coverage and remove obsolete local-bell coupling from tests. | Retain the runtime DH bell and notification context during this intermediate commit. |
| 4 | Move DH routes inside the shared layout, remove the nested shell/breadcrumb logic, and remove the DH bell together. | Preserve user-keyed workspace, preview provider, and outlet notification context. Run DH routes, auth, notification, and shared-layout checks. |
| 5 | Restore `AuthenticatedPortalLayout.tsx` to frontend. | Commit 4 removes its custom DH caller. Run shared-layout and breadcrumb tests. |
| 6 | Restore `AuthenticatedLayout.tsx` to frontend. | Commit 5 removes its custom children caller. Run both layout suites and build. |

Bell removal happens with route movement in commit 4. The current nested `AuthenticatedPortalLayout` also has an API-bell fallback, so merely removing the custom override earlier could activate it before route integration. The agreed sequence keeps that transition together.

`App.tsx` already supplies `QueryClientProvider`. After custom DH callers are removed, the inspected remaining layout callers use route outlets. Restore the layout files in the specified order and recheck callers if other work has landed.

Temporarily retain DH notification state because its page still consumes outlet context. Its eventual removal depends on the reviewer-approved page transition. The shared breadcrumb helper currently has no entry for `/department-head/notifications`, so that page receives only the portal-root crumb after commit 4 unless an approved change addresses it.

## 8. Coordination and conflict prevention

### Independent work

Group A can implement student and assignment requests, dialogs, selection, import persistence, and its own tests without JD's shell. Group B owns both PDF callers and the new viewer files, so neither caller depends on another group's export implementation. Group C can implement transfer decisions, credits, audit browsing, and settings against existing catalog IDs and personas.

JD's shell work does not gate those page tasks. Curricula/Equivalence catalog changes can affect records used elsewhere, which requires integration checks after merging rather than a prerequisite page implementation.

### Shared handler file

Multiple branches will edit `src/mocks/handlers.ts`. Keep each change limited to owned endpoint blocks. Avoid formatting the entire file, reordering handlers, or changing global helpers as part of a page commit. Communicate the affected endpoint blocks before integration and inspect conflicting hunks carefully when merging.

If a helper is needed by multiple owners, agree on one owner and its interface before editing that shared region. Keep unrelated handler changes out of another group's resolution. Rerun affected existing API tests after resolving a conflict.

### Provider and fixture dependencies

`PreviewStateProvider.tsx` imports the Assignment model, Audit data, Settings data, and shared student records. The preview context also imports their types. Groups A and C must preserve those legacy exports until final cleanup, even after their pages use APIs. New page-local typed representations can coexist temporarily.

The Students and Adviser assignments pages share `StudentDirectoryFilters` and student identities. Only Students-specific adaptation belongs to Group A's call-site scope. Changes to the shared filter itself require coordination, including effects on Adviser assignments.

The student Audit log tab and standalone Audit page can independently query the existing audit endpoint. Keep their rendering/filter logic within their respective folders. JD owns cross-page integration tests that exercise mutations followed by directory/audit reads.

### Files requiring coordination before modification

Coordinate changes outside assigned page folders or handler blocks, especially shared layouts, `App.tsx`, `DataTablePanel`, `StudentDirectoryFilters`, shared DH utilities/provider/data files, navigation/breadcrumb helpers, mock store/personas/global helpers, test setup, API client, contract/generated schema, dependencies, and build configuration.

Group B may add new reusable PDF files and consume existing components. It must not modify existing shared UI files. Its report-handler ownership remains the explicit exception in the shared MSW file.

## 9. Git workflow and reviewable commits

The shared integration branch is `feat/department-head-ui`. Commit `b455802` is the approved merge of `origin/feat/frontend` and the common starting point for this work. It was pushed with a normal push.

Other contributors use separate feature branches with the `codex/` prefix. The following are example group branch names. Groups can choose their own meaningful suffixes and internal delegation.

```text
codex/dh-students-assignments
codex/dh-terms-reports
codex/dh-transfers-credits-audit-settings
```

Before beginning implementation, inspect status, confirm the intended base, and create the feature branch from `b455802`. If a newer coordinated integration base is agreed later, communicate it explicitly. An independent branch can consume the stable proposed component interface without waiting for shared commits.

Use meaningful commits for real behavior or UI changes, with their relevant tests. Page reads, a transactional write, a dialog correction, and a focused handler persistence fix can be separately reviewable where each commit remains coherent and builds. The group chooses its internal commit breakdown.

Before committing, inspect the diff and staged files. Include only the intended page work and assigned handler/test changes. Avoid unrelated lockfile, formatting, configuration, or generated-output changes. Coordinate necessary dependency or contract work explicitly. Preserve other developers' work during integration and use normal pushes. Never force push the shared branch or delete `backup/before-undo`.

## 10. Validation workflow

The existing scripts provide typechecking, tests, lint, production build, and preview. The project declares Node 24.x. On PowerShell, set mock mode for the session before running the commands.

```powershell
$env:VITE_API_MODE = 'mock'
npm run typecheck
npm test -- src/routes/department-head/students src/routes/department-head/adviser-assignments
npm run lint
npm run build
npm run preview
```

The test line is an example for Group A. Select the owned page folders and affected existing API/shared tests for each change. During final integration, run the complete relevant DH suite and affected shared/other-portal tests, then the project's full test suite as part of final validation. Record failures and their cause accurately.

For shell changes, include the existing authenticated-layout, authenticated-portal-layout, adviser-breadcrumb, ProtectedRoute, and DH integration coverage as relevant. The old DH Advisees expectation is known to be obsolete and is scheduled for deletion.

Verify the built app through `npm run preview` before re-requesting review. Open direct DH routes, exercise the migrated dialogs and writes under the correct persona, and check the resulting reads. Inspect table spacing, narrow-screen behavior, modal widths, and both PDF viewer/download flows. Verify exported PDFs visually against the supplied layout and public logos.

Build/preview results from earlier work are historical. Each implementation branch and final integrated result need their own current verification.

## 11. Completion checklist

### Each page

- [ ] All requirements for the page in section 3 and the original review are addressed.
- [ ] Reads and writes use the actual typed API client and supported IDs/payloads.
- [ ] Existing MSW handlers/personas support the tested flow, including persistent writes where assigned.
- [ ] Supported loading, empty, validation, and failure states are usable.
- [ ] Relevant page/API tests run after meaningful changes and verify actual behavior.
- [ ] Table/panel reuse, spacing, identity cells, alignment, and count/scope footer match the review.
- [ ] Dialog sizing works at the desktop breakpoint and within narrow viewports.
- [ ] Required `Tabs` and `Button` usage is complete.
- [ ] Preview/demo text, badges, footer calls, and synthetic success messages are removed as applicable.
- [ ] Required controls and approved existing behavior are preserved.
- [ ] Page work stays inside the agreed ownership boundary, with shared edits coordinated.
- [ ] Commits are meaningful, independently reviewable, and free of unrelated changes.

### API and mocks

- [ ] Group A validates and persists committed imports through the supported mock structures.
- [ ] Group B supplies supported department-report data from verified project sources.
- [ ] Group C persists created outside credits and verifies later reads.
- [ ] JD reconciles curriculum deletion and equivalence validation inconsistencies.
- [ ] Existing consumers of changed handlers continue to work.
- [ ] Tests reset shared mock/session/query state and use existing personas.
- [ ] No new route-local fixture backend or invented academic records were introduced.
- [ ] Unresolved contract/data mismatches are documented and resolved or explicitly reported.

### Integration and final cleanup — JD

- [ ] DH routes use one shared authenticated shell and existing shared navigation.
- [ ] Both shared layout files match the agreed frontend implementation.
- [ ] Obsolete DH shell assertions, including the failing Advisees coverage, are removed.
- [ ] Required DH Adviser assignments files remain, and no unrelated Adviser work is removed.
- [ ] The Notifications decision is recorded and its page/context transition is safe.
- [ ] Every page migration has landed before deleting preview state or fixtures.
- [ ] All remaining importers are checked before deleting legacy exports/files.
- [ ] Still-needed helpers such as `todayInManila` are retained or relocated before deleting `preview-state.ts`.
- [ ] The preview provider, reset flow, obsolete data files, and obsolete names are retired.
- [ ] One toast implementation remains and temporary page adapters are retired when their shared replacement is integrated.
- [ ] `DEPARTMENT_HEAD_WORK_SPLIT.md` and `docs/department-head-mock.md` are updated or removed.
- [ ] Relevant page/API, cross-page, shared-layout, and regression tests pass.
- [ ] Typecheck, lint, and production build pass, with any warnings recorded.
- [ ] Production preview, direct-route behavior, dialogs, and both PDF flows are verified.
- [ ] Review evidence identifies any remaining unresolved requirement accurately.

## 12. Open questions and verification limits

| Question or limit | Owner and next step |
| --- | --- |
| Intended future of `/department-head/notifications` and its relationship to `/notifications` | JD asks the reviewer first. Preserve the page, URL, and required context until clarified. No redirect has been approved. |
| DH Notifications breadcrumb after shell integration | JD includes this in reviewer/shell coordination. The current helper supplies only a root crumb for that URL. |
| Full report cohort-student drill-down and selector mapping | Group B maps the mockup to existing supported responses and records. The typed report has optional summary fields, but the current handler omits them. A complete drill-down source has not yet been verified. |
| Spreadsheet file parsing and reference-to-ID mapping | Group A verifies the `.xlsx`/`.csv` parsing approach and maps names/labels to valid typed import rows. No particular parser or new dependency is approved by this guide. |
| Full New course and academic-term form mapping | JD and Group B respectively compare reference fields to the actual contract. List any unsupported field or side effect for clarification. Endpoint existence alone does not verify every form mapping. |
| Exact deletion/reference and equivalence validation semantics | JD reconciles the existing UI, contract, and mock behavior. Preserve supported safeguards and avoid inventing backend rules. |
| Production runtime behavior | Source inspection verifies available interfaces and known gaps. End-to-end success for the future migrations requires implementation, tests, and preview checks. |

This guide records planned work and inspected evidence. Implementation begins only after further instruction.
