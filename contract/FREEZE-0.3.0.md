# OpenAPI 0.3.0 freeze candidate

Status: **candidate, not frozen**. Issue [#39](https://github.com/csci153-saais-2026/saais-web/issues/39) requires approval from both frontend and backend representatives. Neither approval is recorded here.

- Contract: `contract/openapi.yaml`, `info.version: 0.3.0`.
- Candidate contract SHA-256 (Git blob content): `4520ed43d0a03f875aa41f2885cfb8c952e8765f0c681f9b429a46b7ae55c8c7`.
- Integrated source baseline: `4746ac6a8d56d1011099ba6d2a8607cddde956c8` (merged SRS, contract, documentation, mocks, Postman and prototype changes).
- The candidate is identified by the contract file hash, not this document's commit. If the contract changes, replace the hash, repeat the checks and obtain approvals for the revised candidate.
- This is an API specification, not evidence that the backend, authorization or deployment is implemented.

## Production workflow crosswalk

Operation names below refer to `operationId` values in the canonical OpenAPI file. See the SRS for complete authorization, academic rules and acceptance criteria. SDK, scheduled, client-side and excluded behaviors are identified explicitly; they are not extra application operations.

| Workflow and SRS requirements | Contract operation(s) or disposition |
| --- | --- |
| Identity, sign-in, recovery, session persistence, password change (FR-AUTH-01–08, 10, 13–14) | Supabase Auth SDK and server integration, not application API paths; see `SUPABASE-AUTH.md`. Provisioning and invitation lifecycle: `inviteUser`, `previewInviteToken`, `verifyInviteToken`, `declineInviteToken`, `resendAccountInvite`, `revokeAccountInvite`. |
| Profiles, roles, account management and student provisioning (FR-AUTH-01–03, 09–12, 15; FR-ADM-01–02, 14) | `listProfiles`, `listRoleAssignments`, `listAccounts`, `updateProfile`, `inviteUser`, `importStudentsBatch`, `listStudentRoster`, `listStudentOrganizations`, `uploadStudentPhoto`, `deleteStudentPhoto`. Student creation requires an initial adviser and curriculum assignment. |
| Faculty, department, program and catalog administration (FR-ORG-01–02, FR-ADM-03, 10–13, FR-CRS-01–04) | `listFaculties`, `createFaculty`, `updateFaculty`, `deleteFaculty`; `listDepartments`, `createDepartment`, `updateDepartment`, `deleteDepartment`; `listPrograms`, `createProgram`, `updateProgram`, `deleteProgram`; `listCourses`, `createCourse`, `updateCourse`, `deleteCourse`; `listPrerequisites`, `createPrerequisite`, `deletePrerequisite`. |
| Curriculum versions, terms and slots, including cloning (FR-ADM-04–08, 13; FR-CUR-01) | `listCurriculumVersions`, `createCurriculumVersion`, `updateCurriculumVersion`, `deleteCurriculumVersion`; `listCurriculumTerms`, `createCurriculumTerm`, `updateCurriculumTerm`, `deleteCurriculumTerm`; `listCurriculumTermCourses`, `createCurriculumTermCourse`, `updateCurriculumTermCourse`, `deleteCurriculumTermCourse`. `createCurriculumVersion` permits cloning only to a Department Head within scope, even if the account has other roles; Staff and administrators may create blank versions. Course creation uses `createCourse`. |
| School terms, offerings and encoding locks (FR-CRS-05–11, FR-ENR-10–14) | `listSchoolTerms`, `createSchoolTerm`, `updateSchoolTerm`, `listCourseOfferings`, `createCourseOffering`, `updateCourseOffering`, `deleteCourseOffering`, `listDepartmentTermEncodings`, `closeSchoolTermEncoding`, `reopenDepartmentTermEncoding`, `setSchoolTermOverride`. The student's current department controls department closure; first timely INC completion remains permitted under a closure. |
| Adviser assignments and student history (FR-ADV-03–04, 16; FR-STU-04, 09) | `listAdviserAssignments`, `reassignAdviser`, `bulkReassignAdvisers`, `listStudentCurriculumAssignments`. A transfer does not silently reassign the adviser. |
| Student dashboard, roster, progress, checklist, grades and history (FR-STU-01–09, FR-ADV-05–07, FR-CHK-01–02, FR-GWA-01–09) | `listStudentRoster`, `getAcademicSummary`, `getChecklist`, `getTermGrades`, `listAttempts`, `listAttemptResults`, `listINCResolutions`, `listStudentOrganizations`, `listAdviserAssignments`, `listStudentCurriculumAssignments`, `listAdvisingPlans`, `listAdvisingPlanItems`, `listAdvisingNotes`, `listNotifications`. Per-term and cumulative GWA use units; repeated failures remain in term history but are superseded in cumulative GWA only after a later numeric result. |
| Initial enrollment/grades, corrections, INC and grade imports (FR-ENR-01–14, FR-GRD-01–06, FR-IMP-01) | `searchStudentCourseOfferings`, `recordGrades`, `encodeTermGrades`, `correctGrades`, `deleteOpenTermAttempt`, `correctPrerequisiteGrade`, `completeINC`, `correctINCCompletion`, `importGradesBatch`. Passed courses cannot be retaken. Preview and commit behavior is documented on `importGradesBatch`. |
| Advising recommendations, plans and assistant (FR-ADV-08–13, 15) | `listRecommendations`, `saveAdvisingPlan`, `listAdvisingPlans`, `listAdvisingPlanItems`, `askAdvisingAssistant`. The assistant is a server-side, adviser-only boundary; demo replies are not a production provider. |
| Advising notes and staff-only attempt remarks (FR-NTE-01–05, FR-AUTH-09) | `listAdvisingNotes`, `addAdvisingNote`, `updateAdvisingNoteArchiveState`, `listAttemptRemarks`, `addAttemptRemark`. Students can read their own active and archived notes, never staff-only remarks. Archiving and restoring is limited to the current adviser or an authorized System Administrator. |
| Grade questions and resolution (FR-FLG-01) | `listGradeFlags`, `createGradeFlag`, `resolveGradeFlag`. |
| Elective mappings and individual equivalencies (FR-ELM-01–05, FR-EQV-01–07) | `listElectiveMappings`, `createElectiveMapping`, `updateElectiveMapping`, `revokeElectiveMapping`; `listEquivalencyDecisions`, `createEquivalencyDecision`, `updateEquivalencyDecision`, `revokeEquivalencyDecision`. Revocation affects current and future calculations while preserving historical reports. |
| Curriculum shift, transfer and pair equivalencies (FR-ADV-14, FR-ADM-09, FR-TRN-01, FR-EQV-08) | `previewCurriculumShift`, `assignStudentCurriculum`, `listCurriculumTransferRequests`, `endorseCurriculumTransfer`, `decideCurriculumTransfer`, `listCurriculumPairEquivalences`, `createCurriculumPairEquivalence`, `deleteCurriculumPairEquivalence`. Cross-department transfers retain the existing adviser until separately reassigned. |
| Outside credits (FR-CRD-01) | `listOutsideCredits`, `createOutsideCredit`, `revokeOutsideCredit`; accepted institutional-scale grades are 1.00–3.00. |
| Notifications and scheduled alerts (FR-NOT-01, FR-GWA-05) | `listNotifications`, `markNotificationsRead`, `evaluateScheduledNotifications`. A server scheduler invokes deadline evaluation; the operation is the authorized on-demand boundary and does not itself implement scheduling. |
| Adviser, department and faculty reports (FR-RPT-01, FR-ADV-05) | `getAdviserDashboardReport`, `getDepartmentReport`, `getFacultyReport`, `listStudentRoster`, `recordAuditViewEvent`. Filters and drill-downs use authorized reads; PDF/CSV generation is client-side and does not require a separate export operation. |
| Settings, backup records and audit (FR-SET-01, FR-AUD-01–05) | `getSystemSettings`, `updateSystemSettings`, `recordCompletedBackup`, `listAuditLogEntries`, `recordAuditViewEvent`. Backup recording is metadata, not a backup service. Authentication lifecycle audit events are server-owned. |
| Documentation, navigation and display (FR-DOC-01, NFR-06–07) | Client routes, rendering and local presentation actions need no academic API operation. Authenticated production document delivery is a separate `/api/docs` server endpoint; the OpenAPI describes the academic API and is not a specification of that endpoint. |
| Liveness | `getHealthStatus`. |

The table traces workflow families, not an assertion that implementation, role checks, database guards, scheduler, OAuth settings, provider integration or hosted backups already exist. The SRS screen trace provides the finer-grained presentation references. Each operation's own role and scope metadata remains authoritative for the proposed API; and the scope restrictions on individual requests remain authoritative.

## Approval record

| Representative | Decision | Evidence |
| --- | --- | --- |
| Frontend: [Htaruo](https://github.com/Htaruo) | Pending | Approval of the candidate hash and version must be recorded in the review. |
| Backend: [Matt-cant-code](https://github.com/Matt-cant-code) | Pending | Approval of the same candidate hash and version must be recorded in the review. |

After both decisions and any further discrepancies are resolved, record the names, dates, links to approvals, final contract hash, version and merged commit here. Until then do not mark issue #39 complete or call version 0.3.0 frozen.

## Change process after approval

1. Propose changes in a linked issue and pull request, describing affected workflows, authorization, compatibility, data migration and rollout where relevant.
2. Classify breaking versus compatible changes; propose a new contract version according to the agreed compatibility policy. Do not silently change an approved contract under the same frozen identifier.
3. Update `contract/openapi.yaml`, the SRS when requirements change, generated types, affected docs, mocks, tests and collections in the same coordinated change or clearly linked stack.
4. Run `npm run contract:lint`, `npm run contract:check`, `npm run contract:security` and relevant tests. Record migration and rollout requirements rather than treating the contract as backend enforcement.
5. Have frontend and backend representatives review the new contract and compatibility impact; record their approvals and the new version/hash. Communicate breaking changes and rollout coordination before implementation teams switch.
