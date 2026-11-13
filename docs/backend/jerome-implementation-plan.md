# Jerome Edge Function implementation checklist

Baseline: `cfa620c97c2a506537825edc1323f37ee5f843b3` (OpenAPI 0.3.0). The checked-in contract remains 0.2.1, by explicit user direction. This implementation must be integrated with the approved 0.3.0 contract, generated client and frontend before deployment. No frontend or contract files are changed.

Initial checkout: `feat/jerome-edge-functions`, `03ce7ac1764334deeee564601de8a68e6a4bdf00`, clean, matching `feat/backend`.

## Assigned operations

All 47 operations now have domain implementations and successful local SQL coverage. Hosted Supabase/Deno integration remains unverified; see jerome-implementation-report.md for conservative per-operation statuses. Schemas below refer to the pinned baseline.

| Operation | Method and path | Request schema | Success | Roles |
| --- | --- | --- | --- | --- |
| `createFaculty` | `POST /functions/v1/catalog/faculty` | FacultyInsert | 201 Faculty | admin |
| `updateFaculty` | `PATCH /functions/v1/catalog/faculty/{id}` | FacultyUpdate | 200 Faculty | admin |
| `deleteFaculty` | `DELETE /functions/v1/catalog/faculty/{id}` | none | 204 empty | admin |
| `createDepartment` | `POST /functions/v1/catalog/department` | DepartmentInsert | 201 Department | admin |
| `updateDepartment` | `PATCH /functions/v1/catalog/department/{id}` | DepartmentUpdate | 200 Department | admin |
| `deleteDepartment` | `DELETE /functions/v1/catalog/department/{id}` | none | 204 empty | admin |
| `createProgram` | `POST /functions/v1/catalog/program` | ProgramInsert | 201 Program | admin |
| `updateProgram` | `PATCH /functions/v1/catalog/program/{id}` | ProgramUpdate | 200 Program | admin |
| `deleteProgram` | `DELETE /functions/v1/catalog/program/{id}` | none | 204 empty | admin |
| `createCurriculumVersion` | `POST /functions/v1/catalog/curriculum_version` | CurriculumVersionInsert | 201 CurriculumVersion | department_head, department_staff, admin |
| `updateCurriculumVersion` | `PATCH /functions/v1/catalog/curriculum_version/{id}` | CurriculumVersionUpdate | 200 CurriculumVersion | department_head, department_staff, admin |
| `deleteCurriculumVersion` | `DELETE /functions/v1/catalog/curriculum_version/{id}` | none | 204 empty | department_head, department_staff, admin |
| `createCurriculumTerm` | `POST /functions/v1/catalog/curriculum_term` | CurriculumTermInsert | 201 CurriculumTerm | department_head, department_staff, admin |
| `updateCurriculumTerm` | `PATCH /functions/v1/catalog/curriculum_term/{id}` | CurriculumTermUpdate | 200 CurriculumTerm | department_head, department_staff, admin |
| `deleteCurriculumTerm` | `DELETE /functions/v1/catalog/curriculum_term/{id}` | none | 204 empty | department_head, department_staff, admin |
| `createCurriculumTermCourse` | `POST /functions/v1/catalog/curriculum_term_course` | CurriculumTermCourseInsert | 201 CurriculumTermCourse | department_head, department_staff, admin |
| `updateCurriculumTermCourse` | `PATCH /functions/v1/catalog/curriculum_term_course/{id}` | CurriculumTermCourseUpdate | 200 CurriculumTermCourse | department_head, department_staff, admin |
| `deleteCurriculumTermCourse` | `DELETE /functions/v1/catalog/curriculum_term_course/{id}` | none | 204 empty | department_head, department_staff, admin |
| `createCourse` | `POST /functions/v1/catalog/course` | CourseInsert | 201 Course | department_head, department_staff, admin |
| `updateCourse` | `PATCH /functions/v1/catalog/course/{id}` | CourseUpdate | 200 Course | department_head, department_staff, admin |
| `deleteCourse` | `DELETE /functions/v1/catalog/course/{id}` | none | 204 empty | department_head, department_staff, admin |
| `createPrerequisite` | `POST /functions/v1/catalog/prerequisite` | PrerequisiteInsert | 201 Prerequisite | department_head, department_staff, admin |
| `deletePrerequisite` | `DELETE /functions/v1/catalog/prerequisite/{id}` | none | 204 empty | department_head, department_staff, admin |
| `createSchoolTerm` | `POST /functions/v1/catalog/school_term` | SchoolTermInsert | 201 SchoolTerm | department_head, department_staff, admin |
| `updateSchoolTerm` | `PATCH /functions/v1/catalog/school_term/{id}` | SchoolTermUpdate | 200 SchoolTerm | department_head, department_staff, admin |
| `createCourseOffering` | `POST /functions/v1/catalog/course_offering` | CourseOfferingInsert | 201 CourseOffering | department_head, department_staff, admin |
| `updateCourseOffering` | `PATCH /functions/v1/catalog/course_offering/{id}` | CourseOfferingUpdate | 200 CourseOffering | department_head, department_staff, admin |
| `deleteCourseOffering` | `DELETE /functions/v1/catalog/course_offering/{id}` | none | 204 empty | department_head, department_staff, admin |
| `closeSchoolTermEncoding` | `POST /functions/v1/school-terms/{school_term_id}/close-encoding` | SchoolTermCloseEncodingRequest | 200 SchoolTerm | department_head, department_staff, admin |
| `reopenDepartmentTermEncoding` | `POST /functions/v1/school-terms/{school_term_id}/reopen-encoding` | SchoolTermCloseEncodingRequest | 200 DepartmentTermEncodingClosure | department_head, department_staff, admin |
| `setSchoolTermOverride` | `PUT /functions/v1/school-terms/{school_term_id}/override` | SchoolTermOverrideRequest | 200 SchoolTerm | admin |
| `assignStudentCurriculum` | `PUT /functions/v1/students/{student_id}/curriculum` | CurriculumAssignmentRequest | 200 StudentOrganization | department_head, admin |
| `createElectiveMapping` | `POST /functions/v1/students/{student_id}/elective-mappings` | ElectiveMappingRequest | 201 ElectiveMapping | adviser |
| `updateElectiveMapping` | `PATCH /functions/v1/students/{student_id}/elective-mappings/{decision_id}` | ElectiveMappingUpdate | 200 ElectiveMapping | adviser |
| `revokeElectiveMapping` | `POST /functions/v1/students/{student_id}/elective-mappings/{decision_id}/revoke` | RevokeCreditDecisionRequest | 200 ElectiveMapping | adviser |
| `createEquivalencyDecision` | `POST /functions/v1/students/{student_id}/equivalencies` | EquivalencyDecisionRequest | 201 EquivalencyDecision | adviser |
| `updateEquivalencyDecision` | `PATCH /functions/v1/students/{student_id}/equivalencies/{decision_id}` | EquivalencyDecisionEdit | 200 EquivalencyDecision | adviser |
| `revokeEquivalencyDecision` | `POST /functions/v1/students/{student_id}/equivalencies/{decision_id}/revoke` | RevokeCreditDecisionRequest | 200 EquivalencyDecision | adviser |
| `previewCurriculumShift` | `POST /functions/v1/students/{student_id}/shift-preview` | ShiftPreviewRequest | 200 ShiftPreviewResponse | adviser, department_head, admin |
| `endorseCurriculumTransfer` | `POST /functions/v1/students/{student_id}/curriculum-transfers` | CurriculumTransferEndorseRequest | 201 CurriculumTransferRequest | adviser |
| `decideCurriculumTransfer` | `POST /functions/v1/curriculum-transfers/{transfer_id}/decision` | CurriculumTransferDecisionRequest | 200 CurriculumTransferRequest | department_head, admin |
| `createCurriculumPairEquivalence` | `POST /functions/v1/catalog/curriculum-pair-equivalences` | CurriculumPairEquivalenceInsert | 201 CurriculumPairEquivalence | department_head, admin |
| `deleteCurriculumPairEquivalence` | `DELETE /functions/v1/catalog/curriculum-pair-equivalences/{id}` | none | 204 empty | department_head, admin |
| `createOutsideCredit` | `POST /functions/v1/students/{student_id}/outside-credits` | OutsideCreditCreateRequest | 201 OutsideCredit | department_head, admin |
| `revokeOutsideCredit` | `POST /functions/v1/students/{student_id}/outside-credits/{credit_id}/revoke` | RevokeCreditDecisionRequest | 200 OutsideCredit | department_head, admin |
| `markNotificationsRead` | `POST /functions/v1/notifications/mark-read` | MarkNotificationsReadRequest | 200 MarkNotificationsReadResponse | student, adviser, department_head, department_staff, dean, admin |
| `evaluateScheduledNotifications` | `POST /functions/v1/notifications/evaluate-alerts` | EvaluateAlertsRequest | 200 EvaluateAlertsResponse | department_head, admin |

## Implementation sequence and dependencies

1. Reuse the six base schema migrations from `origin/supabase/migrations` at `ec38495` unchanged, preserving team authorship in this record. They are not newly authored schema work. Add non-destructive dependencies for role assignments, revised catalog fields, empty drafts, transfers, pair rules, outside credits, term closures, notifications, audit and effective-dated credit history.
2. Generate a deterministic request/response snapshot from the assigned Git object. Validate the same request schemas in HTTP and SQL so direct RPC calls cannot bypass validation. Verify active Supabase sessions, current provisioned roles, exact scopes and record ownership on the server.
3. Implement catalog transactions with parent locking, dependency protection, cloning, nested curriculum creation and computed totals.
4. Implement school-term settings, department closure/reopening and independent Admin override.
5. Implement read-only curriculum preview, assignment, endorsement and atomic approval/rejection with pair-rule application. Preserve the existing adviser during transfers.
6. Implement outside credits and adviser credit mappings with cross-table exclusivity, optimistic concurrency, soft revocation, audit history and cache revision invalidation.
7. Implement recipient-owned mark-read and scoped, idempotent scheduled alerts, including dry-run and Asia/Manila dates.
8. Add HTTP, SQL, contract, authorization, conflict, rollback and complete workflow tests; record actual results.

## Matt integration

No students entry point or handlers exist in the initial checkout. Jerome supplies a separate route module and an extensible router. Matt can register his routes in the same entry point; do not replace either route set. Matt owns reads, provisioning, grades, advising, reports, audit view endpoints and settings endpoints. Shared database dependencies and cache invalidation must be integrated with those implementations. No Matt handlers are implemented here.

## Testing and environment

The current contract passes `npm run contract:lint` and all seven `npm run contract:security` checks. These inspect 0.2.1 and do not establish 0.3.0 implementation compliance. Deno is absent; Docker Desktop is not running. A disposable PostgreSQL 18 cluster is being prepared under ignored `supabase/.temp` to run real migration and transactional tests. Hosted Supabase gateway/Auth and deployed Edge runtime verification remain separate.

## Known decisions requiring integration

- The baseline is a freeze candidate; team approval/integration is separate from this implementation.
- Base schema has only three roles, positive-only draft totals, mandatory lecture/lab hours, no section support, and no authorization policies. Additive changes are required; do not assume the base branch is deployable.
- Scheduled backup reminder age is not specified by the contract. Keep an operator-configured interval instead of inventing a policy. Settings thresholds and sender identity must come from provisioned settings, with no fabricated institution defaults.
- Email notifications are queued as pending; delivery transport and retry operations need deployment integration.

## Final checklist

- [x] Read both reference documents completely and inspect the repository/branches.
- [x] Report the contract mismatch and obtain the user's explicit cfa620c baseline decision.
- [x] Reuse the existing team schema and implement shared validation, authorization and transactions.
- [x] Implement catalog (30), school terms (3), student routes (11), transfer decisions (1), notifications (2).
- [x] Run fresh migrations, 47-operation success/auth/input sweeps, workflow rollback and real concurrency tests.
- [x] Verify contract snapshots, lint, TypeScript, frontend regression tests, production build and preview.
- [x] Preserve frontend/contract files, existing team work and the shared students integration boundary.
- [x] Record exact local implementation commits and changed files in the final report; do not push.
- [ ] Execute deployed Supabase/Auth/PostgREST/Deno integration and production cron/email verification when available.
- [ ] Confirm the documented academic interpretation and deployment configuration items with the team.
