# Department Staff implementation baseline

## Step 01 record

This is a documentation-only baseline for the Department Staff feature. It records what is present in the reviewed checkout; it does not approve frontend behavior, backend behavior, deployment readiness, or a Git commit.

| Item | Recorded value |
| --- | --- |
| Branch | `feat/department-staff` |
| Full revision | `e690b63a00eb1730095fc147de07c5773c51eb99` |
| API contract | `contract/openapi.yaml`, OpenAPI `3.1.0`, API version `0.3.0` |
| Contract SHA-256 | `E1ED1FAD2DFF5FF0070F7884607C98E0FD3BF810ED587055AA9A20C501F7633D` |
| Runtime baseline | Node `24.x`, as declared by `package.json` and `.nvmrc` |

Re-run `git branch --show-current`, `git rev-parse HEAD`, and `Get-FileHash contract/openapi.yaml -Algorithm SHA256` before relying on this record. A different value requires a new baseline record.

## Page scope

The checked-out Department Staff navigation declares these six target URLs:

1. `/department-staff/students`
2. `/department-staff/adviser-assignments`
3. `/department-staff/academic-terms`
4. `/department-staff/curricula`
5. `/department-staff/course-catalog`
6. `/department-staff/accounts`

`App.tsx` mounts `DepartmentStaffPortal` at `/department-staff/*` behind the existing `department_staff` `ProtectedRoute`; `/staff/*` redirects to that root. At this baseline, `DepartmentStaffPortal` is a tracked placeholder. A route mount or a navigation entry is not proof that a page implementation, authorization check, or endpoint integration is complete.

## Observed contract content vs approval

### Observed in `contract/openapi.yaml`

The contract declares the Department Staff-relevant reads and writes listed below. It describes the intended browser-to-service interface, including role metadata and request/response shapes.

| Area | Observed operation IDs |
| --- | --- |
| Students | `listStudentRoster`, `importStudentsBatch` |
| Adviser assignments | `listAdviserAssignments`, `bulkReassignAdvisers` |
| Academic terms and offerings | `listSchoolTerms`, `listDepartmentTermEncodings`, `listCourseOfferings`, `createSchoolTerm`, `updateSchoolTerm`, `createCourseOffering`, `updateCourseOffering`, `deleteCourseOffering`, `closeSchoolTermEncoding`, `reopenDepartmentTermEncoding` |
| Curricula | `listCurriculumVersions`, `listCurriculumTerms`, `listCurriculumTermCourses`, `createCurriculumVersion`, `updateCurriculumVersion`, `deleteCurriculumVersion`, `createCurriculumTerm`, `updateCurriculumTerm`, `deleteCurriculumTerm`, `createCurriculumTermCourse`, `updateCurriculumTermCourse`, `deleteCurriculumTermCourse` |
| Course catalog | `listCourses`, `listPrerequisites`, `createCourse`, `updateCourse`, `deleteCourse`, `createPrerequisite`, `deletePrerequisite` |
| Accounts and invitations | `listAccounts`, `inviteUser`, `resendAccountInvite`, `revokeAccountInvite` |

The contract itself says that its role metadata does not implement authorization, pagination, rate limiting, or database guards. Those controls must be supplied by the gateway, RLS, and verified server operations.

### Not approved by this record

This record does **not** approve any of the following merely because a contract declaration, generated type, mock, or placeholder exists:

- Frontend rendering, query, mutation, cache, refresh, error, or accessibility behavior.
- Backend/RLS enforcement, transactions, audit metadata, invitation delivery, or deployed endpoint availability.
- Department scope selection, pagination semantics, authoritative enrollment counts, import-warning eligibility, or offering-unit totals.
- A production preview, deployment rewrite/header configuration, or authorization against a real backend.

Frontend approval is complete only when the Staff FE owner meets the acceptance conditions below. Backend approval is complete only when the API/Platform owner verifies the matching server, RLS, and transactional behavior. QA acceptance is separate.

## Shell reuse and ownership

### Reused shell boundary

Department Staff pages must render inside the existing chain:

`App.tsx` -> `ProtectedRoute` -> `AuthenticatedPortalLayout` -> `AuthenticatedLayout` -> existing `AppShell` / `Outlet` -> `DepartmentStaffPortal`.

Reuse the existing role guard, `deptStaffNav`, and the current feature/UI primitives where their current interfaces fit: `PageHeading`, `Panel`, `DataTablePanel`, `FilterBar`, `SearchInput`, `StatTile`, `FormField`, and `src/components/ui`. Do not modify or redesign `app-shell.tsx`, `sidebar.tsx`, `topbar.tsx`, `AuthenticatedLayout.tsx`, `AuthenticatedPortalLayout.tsx`, or navigation files for this feature work.

### Ownership and acceptance conditions

| Owner | Responsibility | Acceptance condition |
| --- | --- | --- |
| Staff FE | Feature pages, feature-local forms, typed API helpers/hooks, and feature tests. | Each implemented URL renders inside the reused shell; requests are typed and scope-aware; loading, empty, denied, and error states are truthful; focused tests pass. |
| Shared FE | Query provider, routing policy, common components, notification integration, and shared route/title handoffs. | Shared changes preserve the existing shell/auth flow and are reviewed before Staff depends on them. |
| API/Platform | Contract changes, RLS, migrations, transactional writes, audit metadata, and server notifications/invitation delivery. | Every used operation enforces role and department scope server-side and is verified against a real service; the SPA receives no privileged credentials. |
| QA | Cross-page acceptance and end-to-end coordination. | Evidence covers all six URLs, direct-route authorization/refresh, permission boundaries, responsive/keyboard behavior, and known backend limitations. |

## Unresolved integration agreements

| Agreement | Owner | Acceptance condition |
| --- | --- | --- |
| Staff scope model | Staff FE + Shared FE + API/Platform | Agree the `useAuth` assignment shape, loading/absent/multiple-scope behavior, and query-key inputs. Missing scope fails closed; URLs and sidebar labels do not grant scope. |
| Query and refresh boundary | Shared FE + Staff FE | Agree the one-time provider, mutation retry policy, invalidation/refresh rules, cancellation, and identity/scope-change reset behavior before feature hooks depend on it. |
| Student record destination | Shared FE + API/Platform | Agree a read-only Staff-authorized destination before adding student-record links; the current Department Head guard does not authorize Staff-only users. |
| Accounts route policy | Shared FE + API/Platform | Define any Department Head access to `/department-staff/accounts` without broadening access to all Staff pages. |
| Authoritative data semantics | API/Platform + Staff FE | Confirm enrolled-count source, initial curriculum-child creation, and eventual warning-row commit eligibility before corresponding UI claims them. Step 14 offering-unit totals are resolved in SRS FR-CRS-07: sum `Course.units` once per matching explicit `CourseOffering` record/section; separate sections count separately, repeated curriculum references do not duplicate an offering, and by-request offerings are included and labeled. In the preview step, warnings remain distinct from valid outcomes and are not represented as eligible. |
| Deployment behavior | Deployment owner + QA | Verify SPA rewrites for direct routes, cache headers, public `VITE_` configuration, CORS, and the fact that browser MSW runs only in development. |

No agreement may be satisfied by fictional mock persistence or by assuming that the OpenAPI description is deployed.

## Explicit exclusions

Step 01 and the subsequent Department Staff feature scope exclude:

- New authentication flows or changes to the existing auth guard.
- Shell, sidebar, topbar, or general navigation redesign.
- Privileged backend code, Auth admin APIs, service-role credentials, RLS changes, migrations, or server transaction implementation.
- Department Staff curriculum cloning.
- Term PDF export.
- Institutional lock overrides.

## Step 01 acceptance

This step is complete when this file records the actual branch, full revision, contract SHA-256, all six URLs, observed contract operations, approval boundaries, shell reuse, owners, acceptance conditions, and unresolved agreements. Confirm every referenced path and operation against the checkout. This change remains documentation-only; do not stage or commit it automatically.
