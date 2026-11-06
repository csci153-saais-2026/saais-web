# Project: SAAIS Documentation and Database Schema Reconciliation

## Architecture
- **Interactive Mockup (`mockup/`)**: Single Source of Truth for workflows, domain entities, and UI architecture.
- **Academic Hierarchy**:
  - `Faculty`: Represents College / Division (e.g. "College of Arts and Sciences").
  - `Department`: Subordinate to Faculty (e.g. "Department of Computer Science").
  - Foreign key associations: `programs.faculty_id`, `courses.department_id`, `profiles.department_id`.
- **Advisee 360 Workspace Architecture**:
  - 7 canonical subnavigation tabs: `Overview`, `Advising`, `Checklist`, `Grades`, `History`, `Notes`, `Documents`.
  - Dual-pane Advising Workspace on the `Advising` tab:
    - Left pane: `Course Recommendations` (dynamically derived from term offerings, unfulfilled checklist slots, and satisfied strict prerequisites; supports retake prioritization and "Add selected to plan").
    - Right pane: `AI Advising Assistant` (grounded chat interface with disclaimer banner; read-only preview in v1).
  - Curriculum Shift Preview: Embedded read-only simulator on `Checklist` tab (computes carried/lost units and projected GWA in-memory; no backend state or database mutations).
- **Database Architecture**:
  - Strict 20-table PostgreSQL relational schema in topologically sorted DAG order.
  - 10 custom ENUM types.
  - Zero persistent tables for course recommendations, student plans, or chat history (all derived via query logic).
  - Production file: `docs/database-schema.sql`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Advisee 360 7 Tabs | Update subnavigation to Overview, Advising, Checklist, Grades, History, Notes, Documents | M1 | Mockup & Survey 1/2 |
| 2 | Advising Workspace | Dual-pane layout with Course Recommendations & AI Advising Assistant | M1 | Mockup & Survey 1/2 |
| 3 | Academic Hierarchy in PRD | Add Faculty and Department entities and associations to administrative accounts, programs, courses | M1 | Mockup & Survey 1/2 |
| 4 | Curriculum Shift Simulator in PRD | Clarify read-only simulator behavior without persistent backend mutations | M1 | Mockup & Survey 1/2 |
| 5 | Advising Tab SRS Requirements | Add FR-ADV-07 through FR-ADV-14 covering Advisee 360 tabs, recommendations, AI assistant, and simulator | M2 | Survey 2 |
| 6 | Academic Hierarchy SRS Requirements | Update FR-ADM-* and FR-CRS-* with Faculty/Department CRUD and associations | M2 | Survey 2 |
| 7 | OOS Boundary Preservation | Reaffirm OOS-02 excluding section/schedule registrar mechanics and timetable management | M2 | Survey 2 |
| 8 | SRS Taxonomy & Formatting | Maintain strict FR-ID taxonomy and standard table layout | M2 | Survey 2 |
| 9 | 20-Table PostgreSQL Schema Audit | Verify tables, enums, FKs, CHECK constraints, and partial unique indexes | M3 | Mockup & Survey 3 |
| 10 | Derived Planning Integrity | Verify no extra persistent planning/recommendation tables exist | M3 | Mockup & Survey 3 |
| 11 | Finalized Schema DDL Output | Generate and validate syntax of `docs/database-schema.sql` | M3 | Survey 3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: PRD Reconciliation | Reconcile `PRD.md` with 7 tabs, Advising Workspace, Faculty/Department hierarchy, read-only Curriculum Shift | Survey | PLANNED |
| 2 | M2: SRS Reconciliation | Reconcile `Software Requirements Specification(SRS).md` with FR-ADV-*, FR-ADM-*, FR-CRS-*, OOS-02 preservation | M1 | PLANNED |
| 3 | M3: Schema Finalization | Audit & finalize validated 20-table PostgreSQL schema in `docs/database-schema.sql` | M2 | PLANNED |
| 4 | M4: Final Verification | Cross-document consistency audit & E2E verification across all deliverables | M1, M2, M3 | PLANNED |

## Interface Contracts
### Documentation ↔ Mockup
- PRD and SRS entities match mockup models in `mockup/_gen/demo-model.js` and `product.js`.
- Requirement IDs follow established taxonomy (`FR-ADV-*`, `FR-ADM-*`, `FR-CRS-*`).
- OOS-02 strictly limits scope: section strings are cosmetic; registrar mechanics excluded.

### Database Schema ↔ Documentation
- Schema defines exactly 20 tables: `faculty`, `department`, `profile`, `adviser_assignment`, `program`, `curriculum_version`, `curriculum_term`, `course`, `prerequisite`, `curriculum_term_course`, `student_curriculum_assignment`, `school_term`, `course_offering`, `attempt`, `elective_mapping`, `equivalency_decision`, `inc_resolution`, `advising_note`, `attempt_remark`, `audit_log_entry`.
- 10 enums: `role_type`, `profile_status`, `program_status`, `curriculum_version_status`, `course_status`, `repeatable_type`, `prerequisite_type`, `attempt_status`, `decision_type`, `school_term_type`.
- Recommendations and planning remain purely derived (no persistent tables).

## Code & File Layout
- `PRD.md`: Owned by Milestone 1 Worker
- `Software Requirements Specification(SRS).md`: Owned by Milestone 2 Worker
- `docs/database-schema.sql`: Owned by Milestone 3 Worker
- `.agents/teamwork/`: Orchestrator and agent metadata only
