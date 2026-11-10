# SAAIS Postman & Bruno API Collection (`contract/postman`)

Shareable API collection and environment definitions generated directly from [`contract/openapi.yaml`](../openapi.yaml) covering all **120 OpenAPI operations** and **6 SAAIS roles** (`student`, `adviser`, `department_head`, `department_staff`, `dean`, `admin`) with both **Authorized (`2xx`)** and **Denied (`401` / `403` / `409`)** verification requests.

---

## 1. Included Artifacts

| File | Description |
| --- | --- |
| [`saais-api.postman_collection.json`](./saais-api.postman_collection.json) | Postman Collection v2.1.0 containing all **120 OpenAPI operations** (240+ authorized & denied requests) plus the **`00. Role & Scope Authorization Scenarios`** matrix folder. Can be imported directly into **Postman** or **Bruno** (*Import Collection → Postman Collection*). |
| [`saais-mock.postman_environment.json`](./saais-mock.postman_environment.json) | Pre-configured environment for local **Prism (`http://127.0.0.1:4010`)** and **MSW** testing using synthetic UUIDs and mock persona tokens (`mock-jwt:<role>:<uuid>`). |
| [`saais-staging.postman_environment.json`](./saais-staging.postman_environment.json) | Template environment for **Supabase Staging** using `<PLACEHOLDER_*>` variables only (no committed credentials, secrets, or real student PII). |

---

## 2. Regenerating & Validating the Collection

Whenever [`contract/openapi.yaml`](../openapi.yaml) is updated, regenerate and verify the collection:

```bash
npm run contract:postman        # Regenerate collection & environments from contract/openapi.yaml
npm run contract:postman:check  # Verify operation parity, role coverage, and zero-secret rules
```

---

## 3. Setup & Execution Instructions

### A. Running Against Local Prism or MSW Mock Server

1. Start the standalone Prism mock server in one terminal:
   ```bash
   npm run contract:prism
   ```
2. Open **Postman** (or **Bruno**):
   - Import [`contract/postman/saais-api.postman_collection.json`](./saais-api.postman_collection.json).
   - Import [`contract/postman/saais-mock.postman_environment.json`](./saais-mock.postman_environment.json) and select **`SAAIS Local Mock / Prism Environment`** as the active environment.
3. Run any folder or individual request:
   - Each operation folder `[METHOD] /path (operationId)` contains:
     - **`Authorized (<role>)`** — sends `apikey: {{supabase_publishable_key}}` and `Authorization: Bearer {{token_<role>}}` (or omits `Authorization` on the 3 pre-session invitation endpoints `/functions/v1/auth/{preview-invite,verify-invite,decline-invite}`) and asserts a `2xx` response.
     - **`Denied (Unauthorized role / Missing Credentials)`** — sends an unauthorized role token or omits required credentials and asserts a `403 Forbidden` or `401 Unauthorized` response with a sanitized error body.

### B. Running Automated End-to-End Collection Verification in Vitest (MSW)

Our test suite ([`src/mocks/postman-collection.test.ts`](../../src/mocks/postman-collection.test.ts)) executes every request in [`saais-api.postman_collection.json`](./saais-api.postman_collection.json) against the MSW contract server:

```bash
npm test
```

### C. Running Against Supabase Staging

1. Import [`contract/postman/saais-staging.postman_environment.json`](./saais-staging.postman_environment.json).
2. In your local Postman/Bruno client (never committed to Git), fill in the **Current Value** column for:
   - `base_url`: `https://<project-ref>.supabase.co`
   - `supabase_publishable_key`: Your project's publishable / anon key (`sb_publishable_...`)
   - `token_student`, `token_adviser`, `token_department_head`, `token_department_staff`, `token_dean`, `token_admin`: Short-lived user access tokens obtained by signing in as synthetic test accounts for each role.
   - **Never** use a Supabase `service_role` or `sb_secret_` key in Postman client requests.
