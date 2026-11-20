# Department Staff Step 41: integration boundaries

The Vitest/MSW workflow coverage is a frontend and mock-contract check only. It does not prove authorization in a deployed Supabase project.

Before release, run a separate staging integration pass with real authenticated sessions and verify:

- Department Staff can read and mutate records only in their assigned department.
- Requests for a foreign department are denied by the deployed API/database policies, including roster reads and catalog/curriculum writes and deletes.
- Signed-out and wrong-role requests are rejected by server-side authorization, not only by React route guards.
- Successful import, adviser reassignment, and curriculum/catalog operations persist the expected related records and audit actor/time fields.

Record the staging project, test identities/roles, request outcomes, and any RLS or API defects in the release/QA record. Do not use mock success as evidence that backend/RLS authorization passed.
