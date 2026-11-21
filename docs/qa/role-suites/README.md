# Role-based QA specifications

These drafts were provided by QA for issue #45. They describe test cases, not an approval or proof that every case has passed. Observations and verification claims in the source documents are attributed to their author and need independent review.

| Suite | Document | Tracking issue |
| --- | --- | --- |
| Authentication | [authentication.md](authentication.md) | #101 |
| Student | [student.md](student.md) | #102 |
| Adviser | [adviser.md](adviser.md) | #103 |
| Department Staff | [department-staff.md](department-staff.md) | #104 |
| Department Head | [department-head-revised.md](department-head-revised.md) | #105 |
| Dean | [dean-adviser-revised.md](dean-adviser-revised.md) | #106 |
| System Administrator | [admin.md](admin.md) | #107 |
| Multi-role access | [dean-department-head-revised.md](dean-department-head-revised.md) | #108 |

Before approval, QA and the relevant role reviewers should compare these drafts against the frozen contract, agreed requirements, and current implementation. Check archived-note visibility, initial adviser assignment, passing outside-credit grades, retakes and cumulative GWA, term closures, cross-department transfers, and independent role assignments. Record unavailable shared data as blocked instead of adding case-local fixtures.

The Staff and Admin drafts describe importing accepted rows from a mixed file; the Department Head draft describes an all-or-nothing import. Confirm the applicable behavior for each operation against the contract before approving those cases.

Prototype checks and observations do not establish production authorization, backend behavior, or completion of these test cases.
