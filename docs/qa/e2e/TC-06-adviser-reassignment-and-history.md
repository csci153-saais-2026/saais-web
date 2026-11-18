# TC-06 — Department Staff or Department Head reassigns an adviser

**Roles:** Department Staff and Department Head, each tested with the permissions shown in the mockup.
**Shared personas/data:** department_staff, department_head, and a student with a current adviser assignment.
**Mockup sources:** mockup/Department Staff/AdviserAssignments.dc.html, mockup/Department Head/AdviserAssignments.dc.html.

## Preconditions

- The student and replacement adviser are within the acting user’s permitted department scope.
- The student has a current assignment.

## Steps and expected results

1. Search for the student and select the student-adviser assignment.
2. Attempt reassignment without a reason. The action is blocked and a reason is requested.
3. Select an eligible replacement adviser and enter a reason.
4. Confirm the reassignment. The new adviser is current, the former adviser remains in assignment history, and the audit log records actor, student, old/new advisers, and reason.
5. Sign in as each adviser and confirm current-record access follows the active assignment while historical assignment information is preserved.

## Review checks

- Department Staff and Department Head access must match their mockup role permissions.
- No assignment history is erased.
- QA approval: [ ]  Department/adviser reviewer approval: [ ]

**Execution status:** Automated prototype coverage: adviser assignment workspace and current table are visible. Reassignment reason validation, assignment-history persistence, and adviser access changes are not tested.
