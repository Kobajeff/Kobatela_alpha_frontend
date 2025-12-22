# Frontend ↔ Backend Alignment Audit

Repo: `kobatela_alpha_frontend` (frontend)

> **Audit mode**: Read-only analysis. All observations are grounded in code references with file paths and line numbers. Inferences are labeled explicitly.

---

## A. Repo Overview

### Framework & Routing
- **Framework**: Next.js `14.2.13` (App Router) (see `package.json` dependencies).
- **Routing style**: App Router under `src/app/*` (e.g., `src/app/sender/escrows/[id]/page.tsx`).
- **State / caching**: React Query (`@tanstack/react-query`) used for data fetching and caching (e.g., `src/lib/queries/admin.ts:1-2`, `src/lib/queries/sender.ts:3-6`).
- **HTTP client**: Axios (`axios`) configured in `src/lib/apiClient.ts`.
- **Auth storage**: `localStorage` key `kobatela_token` (see `src/lib/auth.ts:6-18`).
- **Environment config**:
  - `NEXT_PUBLIC_API_BASE_URL` for API base URL with fallback `http://localhost:8000` (see `src/lib/apiClient.ts:6-11`).
  - `NEXT_PUBLIC_DEMO_MODE` toggles demo behavior (see `src/lib/config.ts:1-2`).
  - Demo role stored in `localStorage` key `kobatela_demo_role` (see `src/lib/config.ts:5-23`).

### Folder Map
- `src/app/` — Next.js App Router pages & layouts (routes for sender/admin/login, etc.).
- `src/components/` — UI components (admin, sender, layout, shared UI primitives).
- `src/lib/` — API client, query hooks, config, demo data, error helpers.
- `src/types/` — TypeScript API models used by frontend.
- `docs/` — Existing audit/summary documents.

---

## B. API Surface Inventory (Frontend-consumed endpoints)

> **Legend**
> - **Auth**: Bearer token from `localStorage` is attached by Axios interceptor (`Authorization: Bearer <token>`) (see `src/lib/apiClient.ts:13-18`).
> - **Error handling**: `extractErrorMessage` expects `error.response.data.error.message` or `error.response.data.message` (see `src/lib/apiClient.ts:22-41`). `isNoAdvisorAvailable` expects `{ error: { code } }` or `{ code }` with HTTP 503 (see `src/lib/errors.ts:3-12`).

### Endpoint Table

| Method | Path | Where used | Request shape (payload/query) | Response fields used in UI | Auth | Error handling expectations |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/auth/login` | `src/lib/queries/sender.ts:49` | `{ email }` | `user.role` (redirect), `token`/`access_token` for storage (`src/lib/queries/sender.ts:52-56`, `src/app/login/page.tsx:16-25`) | Bearer (not required for login) | `error.message` or `error.error.message` (`src/lib/apiClient.ts:22-41`) |
| GET | `/auth/me` | `src/lib/queries/sender.ts:106` | None | `user.role`, `user.email`, `user.username`, `user.created_at`, `user.is_active`, `user.payout_channel` across layouts and profile page (`src/app/sender/profile/page.tsx:32-66`, `src/app/admin/layout.tsx:21-38`, `src/app/sender/layout.tsx:21-38`) | Bearer | 401/403/404 treated as unauthorized (`src/lib/apiClient.ts:47-50`) |
| GET | `/sender/dashboard` | `src/lib/queries/sender.ts:151` | None | `recent_escrows`, `pending_proofs`, `recent_payments` and subfields (`src/app/sender/dashboard/page.tsx:17-102`) | Bearer | `extractErrorMessage` |
| GET | `/me/advisor` | `src/lib/queries/sender.ts:75` | None | Advisor profile fields: names, email, status, counts, languages, specialties, country (`src/components/sender/MyAdvisorCard.tsx:13-59`) | Bearer | 404 treated as “no advisor”, 503 with `code` indicates “no advisor available” (`src/lib/queries/sender.ts:75-88`, `src/lib/errors.ts:3-12`) |
| GET | `/escrows` | `src/lib/queries/sender.ts:175` | Query: `mine=true`, `limit`, `offset`, `status?` | Escrow list fields: `id`, `status`, `amount`, `currency`, `created_at` (`src/components/sender/SenderEscrowList.tsx:29-40`) | Bearer | `extractErrorMessage` |
| GET | `/escrows/{id}/summary` | `src/lib/queries/sender.ts:194` | None | `escrow`, `milestones`, `proofs`, `payments` with details (`src/components/sender/SenderEscrowDetails.tsx:43-163`) | Bearer | `extractErrorMessage` |
| POST | `/escrows/{id}/mark-delivered` | `src/lib/queries/sender.ts:224-225` | None | No response fields used; triggers refetch (`src/lib/queries/sender.ts:215-216`) | Bearer | `extractErrorMessage` |
| POST | `/escrows/{id}/client-approve` | `src/lib/queries/sender.ts:228-229` | None | No response fields used | Bearer | `extractErrorMessage` |
| POST | `/escrows/{id}/client-reject` | `src/lib/queries/sender.ts:232-233` | None | No response fields used | Bearer | `extractErrorMessage` |
| POST | `/escrows/{id}/check-deadline` | `src/lib/queries/sender.ts:236-237` | None | No response fields used | Bearer | `extractErrorMessage` |
| POST | `/files/proofs` | `src/lib/apiClient.ts:77` | `multipart/form-data` with `file` | `file_id`, `file_url` (`src/components/sender/ProofForm.tsx:166-179`) | Bearer | Axios error shape (`src/lib/apiClient.ts:22-41`) |
| POST | `/proofs` | `src/lib/queries/sender.ts:262` | `{ escrow_id, milestone_id?, description?, file_id?, attachment_url? }` (`src/components/sender/ProofForm.tsx:153-189`) | `escrow_id` used to invalidate cache (`src/lib/queries/sender.ts:265-266`) | Bearer | `extractErrorMessage` |
| GET | `/admin/dashboard` | `src/lib/queries/admin.ts:49` | None | `total_escrows`, `pending_proofs`, `approved_proofs`, `rejected_proofs`, `total_payments` (`src/app/admin/dashboard/page.tsx:32-37`) | Bearer | `extractErrorMessage` |
| POST | `/admin/users` | `src/lib/services/admin.ts:7-9` | `{ email, role, issue_api_key }` (`src/components/admin/AdminUserCreator.tsx:36-40`) | `user`, `token` displayed (`src/components/admin/AdminUserCreator.tsx:104-116`) | Bearer | `extractErrorMessage` |
| GET | `/admin/senders` | `src/lib/queries/admin.ts:67-71` | Query: `limit`, `offset`, `q?` | `items[].email`, `role`, `created_at`, `is_active` (`src/app/admin/senders/page.tsx:63-78`) | Bearer | `extractErrorMessage` |
| GET | `/apikeys` | `src/lib/queries/admin.ts:89-90` | Query: `scope=sender`, `active=true`, `limit`, `offset` | `id`, `name`, `is_active`, `created_at`, `user.{id,email,username,role}` (mapped to sender account rows) (`src/lib/queries/admin.ts:23-36`, `src/app/admin/senders/[id]/page.tsx:124-134`) | Bearer | `extractErrorMessage` |
| DELETE | `/apikeys/{id}` | `src/lib/queries/admin.ts:138` | None | No response fields used | Bearer | `extractErrorMessage` |
| GET | `/users/{id}` | `src/lib/queries/admin.ts:127` | None | `email`, `username`, `role`, `is_active`, `payout_channel`, `created_at` (`src/app/admin/senders/[id]/page.tsx:83-109`) | Bearer | `extractErrorMessage` |
| GET | `/proofs?review_mode=review_queue` | `src/lib/queries/admin.ts:171` | Query: `limit`, `offset`, `advisor_id?`, `unassigned_only?`, `review_mode=review_queue` | `id`, `escrow_id`, `milestone_name`, `sender_email`, `created_at`, `status`, AI fields (`src/components/admin/AdminProofReviewTable.tsx:47-58`) | Bearer | `extractErrorMessage` |
| POST | `/admin/proofs/{id}/approve` | `src/lib/queries/admin.ts:266` | None | No response fields used | Bearer | `extractErrorMessage` |
| POST | `/admin/proofs/{id}/reject` | `src/lib/queries/admin.ts:374` | None | No response fields used | Bearer | `extractErrorMessage` |
| GET | `/admin/advisors/overview` | `src/lib/queries/admin.ts:182-183` | None | `advisor_id`, `name`, `email`, `sender_managed`, `open_proofs`, `total_number_of_case_managed` (`src/components/admin/advisors/AdvisorOverviewCards.tsx:19-35`) | Bearer | `extractErrorMessage` |
| GET | `/admin/advisors` | `src/lib/queries/admin.ts:199-200` | Query: `active?` | `id`, `display_name`, `first_name`, `last_name`, `email`, `country`, `languages`, `sender_managed`, `open_proofs`, `is_active`, `blocked` (`src/components/admin/advisors/AdvisorsTable.tsx:41-58`) | Bearer | `extractErrorMessage` |
| POST | `/admin/advisors` | `src/lib/queries/admin.ts:331` | `{ user_id, display_name?, country?, languages?, grade? }` (`src/components/admin/advisors/CreateAdvisorForm.tsx:14-65`) | No response fields used | Bearer | `extractErrorMessage` |
| PATCH | `/admin/advisors/{id}` | `src/lib/queries/admin.ts:307` | `Partial<AdvisorProfile>` (e.g. `{ is_active, blocked }`) (`src/app/admin/advisors/page.tsx:33-42`) | No response fields used | Bearer | `extractErrorMessage` |
| GET | `/admin/advisors/{id}` | `src/lib/queries/admin.ts:282` | None | `first_name`, `last_name`, `email`, `languages`, `specialties`, `subscribe_date`, `sender_managed`, `total_number_of_case_managed`, `is_active`, `blocked` (`src/app/admin/advisors/[id]/page.tsx:80-152`) | Bearer | `extractErrorMessage` |
| GET | `/admin/advisors/{id}/senders` | `src/lib/queries/admin.ts:293-294` | None | `sender_email`, `active`, `assigned_at` (`src/app/admin/advisors/[id]/page.tsx:173-183`) | Bearer | `extractErrorMessage` |
| POST | `/admin/advisors/{id}/assign-sender` | `src/lib/queries/admin.ts:349-351` | `{ sender_email }` (`src/app/admin/advisors/[id]/page.tsx:64-75`) | No response fields used | Bearer | `extractErrorMessage` |
| GET | `/admin/escrows/{id}/summary` | `src/lib/queries/admin.ts:248-249` | None | `escrow`, `milestones`, `proofs`, `payments`, `advisor` (`src/app/admin/escrows/[id]/page.tsx:48-155`) | Bearer | `extractErrorMessage` |
| GET | `/admin/settings/ai-proof` | `src/lib/queries/admin.ts:211-212` | None | `bool_value`, `source` (`src/app/admin/settings/ai-proof/page.tsx:12-40`) | Bearer | `extractErrorMessage` |
| POST | `/admin/settings/ai-proof` | `src/lib/queries/admin.ts:223-225` | `{ bool_value }` | No response fields used | Bearer | `extractErrorMessage` |

---

## C. Domain Feature Coverage Map

**Legend**: Implemented / Partial / Missing / Stubbed

| Feature | Status | Evidence |
| --- | --- | --- |
| Auth login/logout/session | **Implemented** | Login -> `/auth/login` (`src/lib/queries/sender.ts:33-58`, `src/app/login/page.tsx:16-25`), session -> `/auth/me` (`src/lib/queries/sender.ts:94-123`), logout clears token (`src/lib/queries/sender.ts:275-285`). |
| Users/admin user creation | **Implemented** | Admin “Create test user” UI uses `/admin/users` (`src/components/admin/AdminUserCreator.tsx:36-40`, `src/lib/services/admin.ts:7-9`). |
| Escrows list/detail/status | **Partial** | List via `/escrows` (`src/lib/queries/sender.ts:157-177`, `src/components/sender/SenderEscrowList.tsx:29-40`), details via `/escrows/{id}/summary` (`src/lib/queries/sender.ts:181-196`, `src/components/sender/SenderEscrowDetails.tsx:43-163`). No create/funding UI found. |
| Escrow actions (deliver/approve/reject/deadline) | **Implemented** | Action buttons in sender escrow detail and POSTs (`src/app/sender/escrows/[id]/page.tsx:45-113`, `src/lib/queries/sender.ts:224-237`). |
| Milestones list/sequence | **Partial** | Milestones displayed in escrow summary (`src/components/sender/SenderEscrowDetails.tsx:75-95`), but no create/update UI or API calls. |
| Proofs upload/list/decision | **Implemented** | Proof upload form (`/files/proofs`, `/proofs`) and listing (`src/components/sender/ProofForm.tsx:153-204`, `src/components/sender/SenderEscrowDetails.tsx:98-139`). Admin review queue with approve/reject (`src/app/admin/proofs/` + `review-queue/page.tsx:12-45`, `src/lib/queries/admin.ts:257-375`). |
| Spend / usage / purchases | **Missing** | No spend-related pages, types, or endpoints detected. |
| Mandates | **Missing** | No mandates pages/types/endpoints detected. |
| Admin dashboards (counts/queues) | **Implemented** | Dashboard stats (`src/app/admin/dashboard/page.tsx:32-37`), proof review queue (`src/app/admin/proofs/` + `review-queue/page.tsx:12-78`). |
| PSP/Stripe connect/onboarding | **Missing** | No Stripe/PSP UI or endpoints detected. |
| Advisor management | **Implemented** | Sender view (`/me/advisor`), admin list/detail/create/assign (`src/lib/queries/admin.ts:178-352`, `src/app/admin/advisors/*.tsx`). |

---

## D. Auth & Contextual Roles Readiness

### Role Representation
- Roles declared in `UserRole`: `sender | admin | both | advisor | support` (`src/types/api.ts:2`).
- Layout role gating:
  - Sender layout allows `sender` or `both` and redirects others (`src/app/sender/layout.tsx:21-38`).
  - Admin layout allows `admin` or `both` and redirects others (`src/app/admin/layout.tsx:21-38`).
- Header uses role to show admin link and sender profile link (`src/components/layout/Header.tsx:19-83`).

### Contextual-role enforcement UX
- No explicit per-action role checks in UI beyond route-level gating (actions like escrow approve/reject are always visible once in sender UI; see `src/components/sender/SenderEscrowDetails.tsx:52-63`).
- No specialized handling for domain-specific role errors such as `NOT_ESCROW_PROVIDER`, `NOT_ESCROW_SENDER`, or `INSUFFICIENT_SCOPE` (no references found; error parsing is generic in `src/lib/apiClient.ts:22-41`).

### Token Types Supported
- Bearer tokens are attached to all requests via Axios interceptor (see `src/lib/apiClient.ts:13-18`).
- Admin user creation returns `token_type: 'api_key'` and `token` in response types (`src/types/api.ts:165-168`), and UI displays the token but does not store it (`src/components/admin/AdminUserCreator.tsx:104-116`).
- API key management uses `/apikeys` and `/apikeys/{id}` endpoints (admin screens) (see `src/lib/queries/admin.ts:89-138`).

### Hard-coded tokens or dev bypasses
- Demo mode bypass: if `NEXT_PUBLIC_DEMO_MODE === 'true'`, hooks return demo data without calling API (e.g., `src/lib/queries/sender.ts:37-47`, `src/lib/queries/admin.ts:44-47`).
- Demo login returns `access_token: 'demo-token'` (`src/lib/queries/sender.ts:41-45`).
- Demo role stored in `localStorage` (`kobatela_demo_role`) and can switch admin/sender views in header (`src/lib/config.ts:5-23`, `src/components/layout/Header.tsx:25-69`).

---

## E. Error Contract & UX

### Error parsing in frontend
- `extractErrorMessage` expects:
  - `error.response.data.error.message` **or**
  - `error.response.data.message`
  - Handles status 400/422 as validation errors and 405/5xx with hard-coded messages (`src/lib/apiClient.ts:22-40`).
- `isNoAdvisorAvailable` expects `error.response.data.error.code` **or** `error.response.data.code` with HTTP 503 (`src/lib/errors.ts:3-12`).
- `isUnauthorizedError` treats 401/403/404 as unauthorized (`src/lib/apiClient.ts:47-50`).

### Where error shapes are assumed (risk points)
- `extractErrorMessage` is used across nearly all pages and mutations (e.g., `src/app/login/page.tsx:19-28`, `src/app/sender/escrows/[id]/page.tsx:33-41`, `src/app/admin/proofs/` + `review-queue/page.tsx:24-43`).
- `isNoAdvisorAvailable` assumes 503 + `code`/`error.code` (see `src/lib/errors.ts:3-12`), and is used in sender advisor screens (`src/app/sender/advisor/page.tsx:22-31`, `src/components/sender/MyAdvisorCard.tsx:78-90`).

### Expected server response error shapes
- `{ error: { message, code? } }` (primary)
- `{ message }`
- `{ code }` for 503 no-advisor case

### Recommended (non-implemented) normalization strategy
- Standardize backend errors to a single envelope such as:
  ```json
  { "error": { "code": "STRING", "message": "STRING", "details": {} } }
  ```
- On the frontend, implement a unified error normalizer that accepts:
  - `{ error: { message, code } }`
  - `{ detail: { message, code } }`
  - `{ detail: "string" }`
  - `{ message: "string" }`
  and returns `{ code?, message }`.

---

## F. Data Models / Types Alignment

### Core frontend models (TypeScript)
- User / AuthUser / UserRole (`src/types/api.ts:2-24`)
- EscrowListItem (`src/types/api.ts:34-46`)
- SenderEscrowSummary / AdminEscrowSummary (`src/types/api.ts:97-111`)
- Proof / ProofStatus / ProofType (`src/types/api.ts:63-76`, `src/types/api.ts:196`)
- MilestoneStatus (`src/types/api.ts:80-86`)
- Payment / PaymentStatus (`src/types/api.ts:78-95`)
- AdvisorProfile / AdminAdvisor* (`src/types/api.ts:203-248`)
- ApiKey (`src/types/api.ts:129-138`)
- AdminUserCreateResponse includes `token_type: 'api_key'` (`src/types/api.ts:165-168`)

### Potential mismatches (inferred)

| Frontend field / pattern | Evidence | Potential backend equivalent (inferred) |
| --- | --- | --- |
| `EscrowListItem.client_id` / `provider_id` | `src/types/api.ts:41-42` | Might correspond to `sender_user_id` / `provider_user_id` or `client_user_id` / `provider_user_id` (inference). |
| `AuthUser.id` is `number | string` while `User.id` is `string` | `src/types/api.ts:11-23` | Backend may consistently use `int` (FastAPI) or UUID; frontend allows both (inference). |
| `ProofStatus` enum is uppercase, but demo proof creation uses lowercase `'pending'` | `src/types/api.ts:63-64`, `src/lib/queries/sender.ts:246-255` | Potential mismatch in backend enum case handling (inference). |
| Advisor summary uses `advisor_id` while list/detail uses `id` | `src/types/api.ts:223-234` | Backend may return either `id` or `advisor_id` for summary objects (inference). |
| `AdvisorProfile.subscribe_date` naming | `src/types/api.ts:211-213` | Backend might use `created_at` or `subscribed_at` (inference). |

---

## G. Routing & UX Flows (Horizon-style)

### Routes (App Router)
- `/` → redirect to `/login` or role dashboard (`src/app/page.tsx:11-34`).
- `/login` → login form (`src/app/login/page.tsx:12-45`).
- `/sender/*` routes protected by sender layout (`src/app/sender/layout.tsx:21-38`):
  - `/sender/dashboard` (summary cards + recent items) (`src/app/sender/dashboard/page.tsx`).
  - `/sender/escrows` (list + filter) (`src/app/sender/escrows/page.tsx`).
  - `/sender/escrows/[id]` (detail + actions + proof upload) (`src/app/sender/escrows/[id]/page.tsx`).
  - `/sender/advisor` (advisor profile) (`src/app/sender/advisor/page.tsx`).
  - `/sender/profile` (profile details) (`src/app/sender/profile/page.tsx`).
- `/admin/*` routes protected by admin layout (`src/app/admin/layout.tsx:21-38`):
  - `/admin/dashboard` (stats + create user) (`src/app/admin/dashboard/page.tsx`).
  - `/admin/senders` (sender list) (`src/app/admin/senders/page.tsx`).
  - `/admin/senders/[id]` (sender profile + API keys) (`src/app/admin/senders/[id]/page.tsx`).
  - `/admin/advisors` (overview + list + create) (`src/app/admin/advisors/page.tsx`).
  - `/admin/advisors/[id]` (advisor detail + assign sender) (`src/app/admin/advisors/[id]/page.tsx`).
  - Admin proof review queue (approve/reject proofs) (`src/app/admin/proofs/` + `review-queue/page.tsx`).
  - `/admin/settings/ai-proof` (AI toggle) (`src/app/admin/settings/ai-proof/page.tsx`).
  - `/admin/escrows/[id]` (escrow summary) (`src/app/admin/escrows/[id]/page.tsx`).

### Business flow mapping
1. **Create escrow → fund/deposit → milestones → proof upload → review/decision → payout**
   - **Create escrow**: **Missing** (no UI/API call for creation).
   - **Fund/deposit**: **Missing** (no PSP/Stripe flow).
   - **Milestones view**: Implemented in escrow detail (`src/components/sender/SenderEscrowDetails.tsx:75-95`).
   - **Proof upload**: Implemented (`src/components/sender/ProofForm.tsx:153-204`).
   - **Review/decision**: Implemented in admin proof queue (`src/app/admin/proofs/` + `review-queue/page.tsx:12-78`).
   - **Payout view**: Payments list in escrow details (`src/components/sender/SenderEscrowDetails.tsx:143-163`), but no payout initiation UI.

2. **Usage/Spend flows**: **Missing** (no routes or API calls).

### Dead routes / placeholders
- No explicit placeholder routes detected; however, lack of create/fund flows implies partial end-to-end coverage.

---

## H. Gaps & P0/P1/P2 Backlog (Frontend-side)

> Each item lists evidence and the backend contract it depends on.

### P0 (blocks integration)
1. **Escrow creation & funding flow missing**
   - Evidence: No POST `/escrows` calls or payment initiation routes; sender UI starts at list/detail only (`src/app/sender/escrows/page.tsx`, `src/lib/queries/sender.ts:157-177`).
   - Depends on backend: Escrow creation API (e.g., `POST /escrows` with amount/currency/provider/sender), funding initiation endpoints (Stripe/PSP).

2. **Spend/Mandates/PSP flows absent**
   - Evidence: No `spend`, `mandate`, `stripe`, or `psp` routes/endpoints in codebase (rg scan results).
   - Depends on backend: Mandate creation/list endpoints and PSP webhooks/checkout session creation.

### P1 (correctness/UX)
1. **Role-specific error handling not implemented**
   - Evidence: `extractErrorMessage` ignores `detail.code` and no mapping for domain error codes (see `src/lib/apiClient.ts:22-41`).
   - Depends on backend: Standardized error envelope with `code` fields for role/scope enforcement.

2. **Proof status case mismatch in demo** (consistency issue)
   - Evidence: Demo proof status uses lowercase `'pending'` (`src/lib/queries/sender.ts:246-255`) while `ProofStatus` is uppercase (`src/types/api.ts:63-64`).
   - Depends on backend: Consistent status casing or normalization rules.

### P2 (improvements/cleanup)
1. **Normalize advisor and escrow identifier naming**
   - Evidence: `advisor_id` vs `id` in advisor summary/list (`src/types/api.ts:223-234`), `client_id` vs `provider_id` in escrow list (`src/types/api.ts:41-42`).
   - Depends on backend: Consistent naming or frontend mapping layer.

2. **Error normalization strategy**
   - Evidence: Multiple error shapes assumed; missing support for `{ detail: ... }` (see `src/lib/apiClient.ts:22-41`).
   - Depends on backend: Standardized error response format.

---

### Appendix: Reference grep targets
- `src/lib/apiClient.ts` (API base URL, auth, error parsing)
- `src/lib/queries/admin.ts`, `src/lib/queries/sender.ts` (all API calls)
- `src/types/api.ts` (data models)
- `src/app/*` and `src/components/*` (routes & UI usage)
