# SAAIS Contract Mocks — Prism & MSW (`src/mocks`)

Contract-faithful mock infrastructure generated from [`contract/openapi.yaml`](../../contract/openapi.yaml) so frontend development and automated tests can run against all **119 OpenAPI operations** and **6 roles** using 100% synthetic VSU data.

---

## 1. Two Ways to Run Mock Mode

### Option A: In-App / Vitest MSW Interception (Default `VITE_API_MODE=mock`)

When `VITE_API_MODE=mock` (or when no Supabase environment variables are set) and `VITE_API_BASE_URL` is left blank:
- **Browser (`npm run dev`)**: [`src/main.tsx`](../main.tsx) starts the MSW Service Worker ([`src/mocks/browser.ts`](./browser.ts) + [`public/mockServiceWorker.js`](../../public/mockServiceWorker.js)).
- **Vitest (`npm test`)**: Node tests use [`saaisMockServer`](./node.ts) (`setupServer(...saaisMswHandlers)`).

### Option B: Standalone Stoplight Prism Mock Server (`http://127.0.0.1:4010`)

To run a standalone OpenAPI 3.1 HTTP mock server directly from [`contract/openapi.yaml`](../../contract/openapi.yaml):

```bash
npm run contract:prism
# or:
npm run mock:prism
```

This starts Prism on `http://127.0.0.1:4010` with CORS enabled. Point the Vite app or Postman/Bruno at Prism by setting:

```env
VITE_API_MODE=mock
VITE_API_BASE_URL=http://127.0.0.1:4010
```

---

## 2. Synthetic Role Personas & Switching Roles

Zero real student or faculty PII is stored in this repository. Use [`loginAsMockPersona`](./personas.ts) and [`logoutMockPersona`](./personas.ts) to switch the active session token in `VITE_API_MODE=mock`:

```ts
import {
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_PERSONAS,
  resetMockDatabase,
} from '@/mocks'

// Switch active persona (updates setMockSessionToken automatically):
loginAsMockPersona('student')           // Sta. Agata, Jerome Daniel S. (24-1-01798@vsu.edu.ph, BSCS DCST)
loginAsMockPersona('student_secondary') // Concoles, Cyril Jade M. (23-1-02121@vsu.edu.ph, BSCS DCST)
loginAsMockPersona('student_other_dept')// Flores, Raniel John B. (24-1-01926@vsu.edu.ph, DABE)
loginAsMockPersona('adviser')           // Polo, Marco Antonio P. (23-1-02224@vsu.edu.ph, DCST Adviser)
loginAsMockPersona('adviser_secondary') // Coting, Eulo Rod M. (22-1-00856@vsu.edu.ph, DCST Adviser)
loginAsMockPersona('department_head')   // Bucol, Matthew Gerald A. (23-1-02044@vsu.edu.ph, DCST Head + Adviser)
loginAsMockPersona('department_staff')  // Dumilon, John Earl Patrick G. (23-1-01072@vsu.edu.ph, DCST Staff)
loginAsMockPersona('dean')              // Montera, Mhac Alester (23-1-02106@vsu.edu.ph, Dean + Adviser)
loginAsMockPersona('dean_dept_head')    // Tan, Ron Nicolas (23-1-00972@vsu.edu.ph, Dean + DCST Head + Adviser)
loginAsMockPersona('admin')             // Lelis, Nietzchan Jake (23-1-01457@vsu.edu.ph, System Admin + Adviser)

// Sign out:
logoutMockPersona()
```

### Persona Tokens Reference

| Persona Key | Name | VSU Email | Roles | Scope | Bearer Token |
| --- | --- | --- | --- | --- | --- |
| `student` | Sta. Agata, Jerome Daniel S. | `24-1-01798@vsu.edu.ph` | `student` | Own record (`DCST`) | `mock-jwt:student:00000000-0000-4000-8000-000000000101` |
| `student_secondary` | Concoles, Cyril Jade M. | `23-1-02121@vsu.edu.ph` | `student` | Own record (`DCST`, invited) | `mock-jwt:student_secondary:00000000-0000-4000-8000-000000000102` |
| `student_other_dept` | Flores, Raniel John B. | `24-1-01926@vsu.edu.ph` | `student` | Own record (`DABE`) | `mock-jwt:student_other_dept:00000000-0000-4000-8000-000000000103` |
| `adviser` | Polo, Marco Antonio P. | `23-1-02224@vsu.edu.ph` | `adviser` | `DCST` (`Faculty of Computing`) | `mock-jwt:adviser:00000000-0000-4000-8000-000000000201` |
| `adviser_secondary` | Coting, Eulo Rod M. | `22-1-00856@vsu.edu.ph` | `adviser` | `DCST` (`Faculty of Computing`) | `mock-jwt:adviser_secondary:00000000-0000-4000-8000-000000000202` |
| `department_head` | Bucol, Matthew Gerald A. | `23-1-02044@vsu.edu.ph` | `department_head`, `adviser` | `DCST` | `mock-jwt:department_head:00000000-0000-4000-8000-000000000301` |
| `department_staff` | Dumilon, John Earl Patrick G. | `23-1-01072@vsu.edu.ph` | `department_staff` | `DCST` | `mock-jwt:department_staff:00000000-0000-4000-8000-000000000401` |
| `dean` | Montera, Mhac Alester | `23-1-02106@vsu.edu.ph` | `dean`, `adviser` | `Faculty of Computing` + `DCST` | `mock-jwt:dean:00000000-0000-4000-8000-000000000501` |
| `dean_dept_head` | Tan, Ron Nicolas | `23-1-00972@vsu.edu.ph` | `dean`, `department_head`, `adviser` | `Faculty of Computing` + `DCST` | `mock-jwt:dean_dept_head:00000000-0000-4000-8000-000000000502` |
| `admin` | Lelis, Nietzchan Jake | `23-1-01457@vsu.edu.ph` | `admin`, `adviser` | Institution-wide + `DCST` | `mock-jwt:admin:00000000-0000-4000-8000-000000000601` |

---

## 3. Resetting Stateful Mock Data

Mutations (`POST`, `PUT`, `PATCH`, `DELETE`) update the in-memory synthetic store ([`src/mocks/store.ts`](./store.ts)). To reset all collections back to the deterministic seed state between tests or demo flows:

```ts
import { resetMockDatabase } from '@/mocks'

resetMockDatabase()
```
