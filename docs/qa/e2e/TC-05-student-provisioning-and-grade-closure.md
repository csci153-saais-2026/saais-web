# TC-05 — Department Staff provisions a student and applies department grade closure

**Role:** Department Staff
**Shared personas/data:** department_staff, an eligible same-department adviser, and a shared cross-department course-offering record for the closure check.
**Mockup sources:** mockup/Department Staff/AccountsRoles.dc.html, AcademicTerms.dc.html, Students.dc.html.

## Preconditions

- The staff member is scoped to the student’s current department.
- An active curriculum and an eligible initial adviser are available in shared data.
- For the closure check, use a shared student whose current adviser may record grades and an ungraded course attempt offered by another department. Keep this closure scenario separate from the student-provisioning record if the shared fixtures differ.
- For closure setup, use a Department Staff account authorized for the department being closed. Department Staff changes the lock; the student’s current Adviser performs every grade-entry action.

## Steps and expected results

1. Begin student account provisioning and provide the required student details, valid institutional student number, curriculum, and initial adviser.
2. Attempt to save without an initial adviser. The student record is not created and a clear validation message identifies the missing requirement.
3. Select an eligible adviser in the student’s department and save. The student account and initial assignment are created.
4. Reset the shared closure scenario so both departments are open. The student’s current Adviser records the ungraded cross-department course attempt; grade entry succeeds.
5. Reset the same scenario. Using a Department Staff account authorized for the course-offering department, close only that department’s grade encoding. Keep the student’s current department open and every other lock open. The student’s current Adviser attempts grade entry again; it succeeds because a closed offering department alone does not close the student’s record.
6. Reset the same scenario. Using a Department Staff account authorized for the student’s current department, close only that department’s grade encoding. Keep the course-offering department and every other lock open. The student’s current Adviser attempts grade entry or correction; the operation returns the closure conflict (409), not a role denial (403).

## Review checks

- Student numbers use YY-N-NNNNN; the middle digit records entry year level and does not change as the student advances.
- Initial adviser assignment is required.
- Grade closure follows the student’s current department, not the course-offering department.
- The grade action is performed by the student’s current adviser so the test reaches the closure rule rather than failing adviser-role authorization.
- QA approval: [ ]  Department operations reviewer approval: [ ]

**Execution status:** Specification only; not yet run. Confirm the shared fixture for a cross-department offering before execution.
