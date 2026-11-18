# TC-07 — Department Head reviews a cross-department curriculum transfer

**Role:** Department Head
**Shared personas/data:** department_head and an existing pending cross-department transfer request.
**Mockup sources:** mockup/Department Head/CurriculumTransfers.dc.html, Students.dc.html, AdviserAssignments.dc.html.

## Preconditions

- A pending request exists for a student moving between departments/curricula.
- The request includes the source and requested curriculum and the currently assigned adviser.

## Steps and expected results

1. Open Curriculum Transfers and review the pending request details.
2. Approve or reject the request using the mockup’s decision flow and provide the requested decision reason.
3. Confirm the result. Approval updates the student’s curriculum/department according to the mockup; rejection leaves the current curriculum in place and records the decision.
4. After an approved transfer, inspect the adviser assignment. The former adviser remains assigned until the new department separately reassigns the student.
5. Perform that separate reassignment through Adviser Assignments. Only then does the active adviser change; both actions remain auditable.

## Review checks

- Transfer approval does not silently trigger adviser reassignment.
- Follow the mockup’s cross-department transfer flow and preserve its decision history.
- QA approval: [ ] Department Head/academic reviewer approval: [ ]

**Execution status:** Automated prototype coverage: pending transfer review screen is visible. Approval/rejection persistence and separate adviser reassignment are not implemented as testable prototype actions.
