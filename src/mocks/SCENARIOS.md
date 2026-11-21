# Shared mock scenario map

This is a deterministic development dataset for the routed pages in `mockup/prototype-routes.js`. It is not real academic data. An empty result is still valid for a user or filter with no matching records; do not insert unrelated records to make every query nonempty.

| Prototype areas | Shared sources | Seeded scenarios |
| --- | --- | --- |
| Student dashboard, checklist, grades, history, profile, notes | profiles, organizations, curriculum assignments and slots, attempts, plans, notes, audit entries | Passing, failed, INC and in-progress work; an archived note; cross-department student; a 52-requirement checklist with linked transcript and current enrollment for `student_sample_29` |
| Adviser dashboard, roster, student record, grade flags and record grades | adviser assignments, attempts/results, flags, catalog, terms, notes and plans | Multiple advisers and students; current assignments; assigned staff with additional roles; questions on grades |
| Department Head transfers, outside credits, equivalencies, curricula, reports and students | transfer requests, credit and equivalency decisions, catalog/curriculum, scoped reports | Pending transfer including a cross-department request; passing outside credit; active and teach-out curricula |
| Department Staff accounts, students, assignment, course catalog and terms | accounts, role assignments, organizations, advisers, curriculum and course catalog | Student and staff roles, initial adviser assignments, an Engineering department and seeded catalog data |
| Dean reports, students and audit; Dean-with-Adviser/Head portals | faculty and department records, scoped organizations, reports, audit entries and assignments | Faculty aggregation, separate Engineering faculty, and multi-role personas with their own assigned advisees |
| System Admin accounts, programs, departments, audit and settings | profiles/roles, programs, faculties, departments, audit entries, system settings | Multiple role accounts, invited and active profiles, faculty/program settings and backup reference |
| Notifications for Student, Adviser, Department Head, Department Staff, Dean and Admin | recipient-owned notifications linked to seeded people and records | Read and unread examples; the multi-role Dean/Head account receives notifications for both roles in one account-owned inbox |

`student_sample_1`–`student_sample_29` are fictional names with stable mock keys and UUIDs. Sample 10 is a transferee whose `26-2-10010` number records entry at year level 2; the middle digit is not updated as the student progresses. The 52-slot reference curriculum follows the routed mockup checklist, but uses the existing catalog definitions for conflicting CSCI 102 and CSCI 198 codes. Existing BSCS 2024 records are not rewritten to adopt the reference curriculum.

The mock service is a simulation, not a substitute for production authorization or a full Supabase implementation. Some operations and pages still use canned or incomplete behaviors; adding fixtures alone does not guarantee every current frontend page consumes them. In particular, import preview rows come from the selected input file, empty search/filter results remain possible, and password/sign-in flows must not be seeded with real credentials. Check the contract and SRS for each operation before relying on mock behavior.

Adding advising notes uses the current adviser assignment (or an administrator account), validates the request, and creates a notification for the student. A historical adviser retains read access but cannot create a note. These changes are local until this branch is integrated; adviser UI controls may also need to be enabled by their owner.
