# TC-05 — Department Staff provisions a student and applies department grade closure

**Role:** Department Staff
**Shared personas/data:** department_staff, an eligible same-department adviser, and a shared cross-department course-offering record for the closure check.
**Mockup sources:** mockup/Department Staff/AccountsRoles.dc.html, AcademicTerms.dc.html, Students.dc.html.

## Preconditions

- The staff member is scoped to the student’s current department.
- An active curriculum and an eligible initial adviser are available in shared data.
- For the closure check, the student’s current department differs from the department offering one of the student’s courses.

## Steps and expected results

1. Begin student account provisioning and provide the required student details, valid institutional student number, curriculum, and initial adviser.
2. Attempt to save without an initial adviser. The student record is not created and a clear validation message identifies the missing requirement.
3. Select an eligible adviser in the student’s department and save. The student account and initial assignment are created.
4. Open Academic Terms and close grade encoding for the student’s department.
5. Attempt to encode/correct a grade for the student in a course offered by another department. The student’s current department’s closure controls the record, so the closed state is enforced.

## Review checks

- Student numbers use YY-N-NNNNN; the middle digit records entry year level and does not change as the student advances.
- Initial adviser assignment is required.
- Grade closure follows the student’s current department, not the course-offering department.
- QA approval: [ ]  Department operations reviewer approval: [ ]

**Execution status:** Specification only; not yet run. Confirm the shared fixture for a cross-department offering before execution.
