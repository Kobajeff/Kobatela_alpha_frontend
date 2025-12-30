# V2: End-to-End UX Projection (UI Horizon Scope)

Status: Draft for UI planning (backend-grounded)

**Evidence rule**: Any backend-facing claim must cite the current backend code (preferred) or a grounded contract doc with line references.

---

## 1) Personas & Role Boundaries

Backend roles/scopes available to the UI are defined by `ApiScope` and `UserRole` enums.【F:app/models/api_key.py†L16-L38】【F:app/models/user.py†L12-L21】

| Persona | Scope(s) used by UI | Role boundary (backend-grounded) | Notes |
| --- | --- | --- | --- |
| **Sender** | `sender` | Can create escrows, fund/deposit, mark delivered, approve/reject, and list/view their escrows; can submit or decide proofs depending on workflow.【F:app/routers/escrow.py†L79-L245】【F:app/routers/proofs.py†L36-L167】 | Primary funder/decision-maker. |
| **Provider** | `provider` | Can list/view escrows, view summaries/milestones, and submit proofs; cannot decide proofs or execute payouts.【F:app/routers/escrow.py†L33-L245】【F:app/routers/proofs.py†L36-L167】 | Proof uploader. |
| **Advisor** | `advisor` | Read-only proof access via list/detail endpoints; no proof decisions or payouts available to this scope.【F:app/routers/proofs.py†L61-L151】【F:app/routers/proofs.py†L153-L167】 | Read-only review. |
| **Support** | `support` | Can list escrows, list proofs, decide proofs, and execute payouts; can access admin payments list.【F:app/routers/escrow.py†L33-L299】【F:app/routers/proofs.py†L61-L167】【F:app/routers/payments.py†L20-L68】 | Operational actions, not general governance. |
| **Admin** | `admin` | Same payment/proof operations as support, plus escrow/milestone CRUD access where provided.【F:app/routers/escrow.py†L127-L302】【F:app/routers/proofs.py†L61-L167】【F:app/routers/payments.py†L20-L68】 | Governance UI is not backed by endpoints yet (see TODO). |

---

## 2) Global Navigation Map per Role (API-supported screens only)

> Each screen below is backed by existing endpoints. Any UX element not backed by APIs is flagged elsewhere as **UX PROPOSAL**.

### Sender
- **Login / Session** → `POST /auth/login`, `GET /auth/me`【F:app/routers/auth.py†L133-L198】
- **Escrow List** → `GET /escrows?mine=true`【F:app/routers/escrow.py†L33-L75】
- **Escrow Detail** (status, milestones, proofs, payments summary) → `GET /escrows/{id}`, `GET /escrows/{id}/summary`, `GET /escrows/{id}/milestones`【F:app/routers/escrow.py†L216-L285】
- **Funding** → `POST /escrows/{id}/funding-session`, `POST /escrows/{id}/deposit`【F:app/routers/escrow.py†L127-L142】【F:app/routers/escrow.py†L101-L124】
- **Delivery Decision** → `POST /escrows/{id}/mark-delivered`, `POST /escrows/{id}/client-approve`, `POST /escrows/{id}/client-reject`【F:app/routers/escrow.py†L145-L196】
- **Proof Review & Decision** → `GET /proofs?escrow_id=...`, `GET /proofs/{id}`, `POST /proofs/{id}/decision`【F:app/routers/proofs.py†L61-L178】

### Provider
- **Login / Session** → `POST /auth/login`, `GET /auth/me`【F:app/routers/auth.py†L133-L198】
- **Escrow List** → `GET /escrows?mine=true`【F:app/routers/escrow.py†L33-L75】
- **Escrow Detail (read)** → `GET /escrows/{id}`, `GET /escrows/{id}/summary`, `GET /escrows/{id}/milestones`【F:app/routers/escrow.py†L216-L285】
- **Proof Upload** → `POST /files/proofs` then `POST /proofs`【F:app/routers/uploads.py†L74-L162】【F:app/routers/proofs.py†L36-L58】
- **Proof Status** → `GET /proofs?escrow_id=...`, `GET /proofs/{id}`【F:app/routers/proofs.py†L61-L151】

### Advisor
- **Login / Session** → `POST /auth/login` (advisor scope), `GET /auth/me` is not scoped to advisor today (see TODO).【F:app/routers/auth.py†L64-L198】
- **Assigned Proof Queue (read-only)** → `GET /proofs?advisor_id=...&review_mode=...`【F:app/routers/proofs.py†L61-L120】
- **Proof Detail (read-only)** → `GET /proofs/{id}`【F:app/routers/proofs.py†L124-L151】

### Support
- **Escrow Lookup** → `GET /escrows` (filter by sender/provider/status)【F:app/routers/escrow.py†L33-L75】
- **Proof Queue + Decision** → `GET /proofs`, `POST /proofs/{id}/decision`【F:app/routers/proofs.py†L61-L178】
- **Payments Console** → `GET /admin/payments`, `POST /payments/execute/{id}`【F:app/routers/payments.py†L20-L68】
- **Milestone Detail (read)** → `GET /escrows/{id}/milestones` / `GET /escrows/milestones/{id}`【F:app/routers/escrow.py†L271-L302】

### Admin
- **Escrow Lookup** → `GET /escrows`, `GET /escrows/{id}`【F:app/routers/escrow.py†L33-L230】
- **Milestone Management** → `POST /escrows/{id}/milestones`, `GET /escrows/{id}/milestones`【F:app/routers/escrow.py†L252-L285】
- **Proof Queue + Decision** → `GET /proofs`, `POST /proofs/{id}/decision`【F:app/routers/proofs.py†L61-L178】
- **Payments Console** → `GET /admin/payments`, `POST /payments/execute/{id}`【F:app/routers/payments.py†L20-L68】

---

## 3) Shared UX Rules

### 3.1 Performance Budgets (Targets)
- **UX PROPOSAL**: Initial dashboard load ≤ 2.5s (P75), detail screens ≤ 2.0s (P75), polling refresh ≤ 300ms (P75). These are UX goals only; backend has no explicit SLA.

### 3.2 Polling Strategy (Aligned to FRONTEND_API_USAGE)
- Polling cadence and stop conditions must follow the playbook (funding, proofs, milestones, payouts, webhook lag).【F:docs/FRONTEND_API_USAGE.md†L70-L121】
- Actions that trigger async transitions (funding, proof processing, payouts) require server refetch and state-based polling, not optimistic UI state simulation.【F:docs/FRONTEND_API_USAGE.md†L8-L79】

### 3.3 Error Handling Mapping (Backend Codes → UI Response)
- **409 conflicts** (e.g., `PAYMENT_ALREADY_EXECUTED`, merchant conflicts) → show conflict banner, disable CTA, refetch state.【F:app/utils/error_codes.py†L16-L227】
- **403 forbidden** (`NOT_ESCROW_PROVIDER/SENDER/PARTICIPANT`) → access denied, hide CTA, offer role switch.【F:app/utils/error_codes.py†L17-L114】
- **422 validation** (`EXIF_*`, `GEOFENCE_VIOLATION`, `FILE_TOO_LARGE`) → show field-level errors; do not auto-retry.【F:app/utils/error_codes.py†L22-L132】
- **400 proof mismatch** (`PROOF_TYPE_MISMATCH`, `INVALID_PROOF_FILE_KIND`) → blocking message; user must re-upload correct type.【F:app/utils/error_codes.py†L14-L93】
- **502 payout execution** (`PAYOUT_EXECUTION_FAILED`) → show failure state with manual retry for support/admin only.【F:app/utils/error_codes.py†L159-L163】

### 3.4 Redaction Rules (Role-Safe Display)
- **Do not surface raw proof metadata** (OCR/EXIF/invoice metadata) to non-admin/support; proof metadata is stored in `Proof.metadata` and `invoice_merchant_metadata`.【F:app/models/proof.py†L39-L69】
- **Hide PSP identifiers & idempotency keys** from non-admin/support (payment fields `psp_ref`, `idempotency_key`).【F:app/models/payment.py†L54-L57】
- **Hide geofence details** from non-admin/support; milestone stores geofence coordinates and radius.【F:app/models/milestone.py†L97-L105】
- **AI/ML fields** (`ai_score_ml`, `ai_explanation`, `ai_flags`) should be limited to admin/support views only.【F:app/models/proof.py†L110-L128】

---

## 4) End-to-End Journeys (Intent → Screen → API → Expected State)

> Expected states reference backend enums (`EscrowStatus`, `MilestoneStatus`, `PaymentStatus`) and proof status strings.【F:app/models/escrow.py†L31-L39】【F:app/models/milestone.py†L21-L29】【F:app/models/payment.py†L15-L22】【F:app/models/proof.py†L41-L44】

### 4.1 Sender: Create Escrow → Fund → Review Proof → Decision → Observe Payout
1. **Intent:** Create an escrow
   - Screen: Escrow Create
   - API: `POST /escrows`
   - Expected state: Escrow `DRAFT` after creation.【F:app/routers/escrow.py†L79-L98】【F:app/models/escrow.py†L31-L39】
2. **Intent:** Fund escrow
   - Screen: Funding
   - API: `POST /escrows/{id}/funding-session` (optional) then `POST /escrows/{id}/deposit` (idempotent).
   - Expected state: Escrow is eligible to transition from `DRAFT` toward `FUNDED` (or other terminal states) after funding actions per the state machine.【F:app/routers/escrow.py†L101-L142】【F:app/services/state_machines.py†L56-L69】
3. **Intent:** Track milestones/proofs
   - Screen: Escrow Detail
   - API: `GET /escrows/{id}/summary`, `GET /escrows/{id}/milestones`, `GET /proofs?escrow_id=...`
   - Expected state: Milestones progress `WAITING → PENDING_REVIEW` after proof submission; proofs start in `PENDING`.【F:app/routers/escrow.py†L233-L285】【F:app/routers/proofs.py†L61-L120】【F:app/services/proofs.py†L2524-L2533】
4. **Intent:** Decide on proof
   - Screen: Proof Review
   - API: `POST /proofs/{id}/decision`
   - Expected state: Proof transitions to `APPROVED` or `REJECTED` (status string).【F:app/routers/proofs.py†L153-L178】【F:app/services/proofs.py†L3186-L3196】【F:app/services/proofs.py†L3250-L3263】
5. **Intent:** Approve or reject escrow delivery
   - Screen: Escrow Decision
   - API: `POST /escrows/{id}/client-approve` or `POST /escrows/{id}/client-reject`
   - Expected state: Escrow transitions to `RELEASED` or `REFUNDED/CANCELLED` depending on backend rules.【F:app/routers/escrow.py†L163-L196】【F:app/services/state_machines.py†L56-L69】
6. **Intent:** Observe payout status
   - Screen: Escrow Detail / Payment Status
   - API: `GET /escrows/{id}/summary` (includes payments) or support-facing `GET /admin/payments` for visibility.
   - Expected state: Payment status `PENDING → SENT/SETTLED` or `ERROR/REFUNDED`.【F:app/routers/escrow.py†L233-L249】【F:app/routers/payments.py†L46-L68】【F:app/services/state_machines.py†L205-L212】

### 4.2 Provider: Upload Proof → Submit → Track Status
1. **Intent:** Upload proof file
   - Screen: Proof Upload
   - API: `POST /files/proofs`
   - Expected state: Receive `storage_url` + `sha256` for proof submission.【F:app/routers/uploads.py†L74-L162】
2. **Intent:** Submit proof
   - Screen: Proof Upload (step 2)
   - API: `POST /proofs`
   - Expected state: Proof created with status `PENDING`; milestone progresses to `PENDING_REVIEW`.【F:app/routers/proofs.py†L36-L58】【F:app/services/proofs.py†L2524-L2552】
3. **Intent:** Track review status
   - Screen: Proof Status
   - API: `GET /proofs?escrow_id=...` or `GET /proofs/{id}`
   - Expected state: Proof transitions to `APPROVED` or `REJECTED`; milestones to `APPROVED/REJECTED/PAID`.【F:app/routers/proofs.py†L61-L151】【F:app/services/proofs.py†L3186-L3196】【F:app/services/proofs.py†L3250-L3263】【F:app/services/state_machines.py†L108-L115】

### 4.3 Advisor: Review Assigned Proofs (Read-only)
1. **Intent:** View assigned queue
   - Screen: Advisor Proof Queue
   - API: `GET /proofs?advisor_id=...&review_mode=...`
   - Expected state: Proof list filtered by review mode/status (read-only).【F:app/routers/proofs.py†L61-L120】
2. **Intent:** Inspect proof detail
   - Screen: Proof Detail (read-only)
   - API: `GET /proofs/{id}`
   - Expected state: Proof detail without decision actions (no endpoint for advisor decision).【F:app/routers/proofs.py†L124-L178】

### 4.4 Support: Proof Queue + Payments Console + Merchant Suggestions Admin
1. **Intent:** Triage proofs
   - Screen: Support Proof Queue
   - API: `GET /proofs`, `POST /proofs/{id}/decision`
   - Expected state: Proofs transition from `PENDING` to `APPROVED/REJECTED`.【F:app/routers/proofs.py†L61-L178】【F:app/services/proofs.py†L3186-L3196】【F:app/services/proofs.py†L3250-L3263】
2. **Intent:** Execute payouts
   - Screen: Payments Console
   - API: `GET /admin/payments`, `POST /payments/execute/{id}`
   - Expected state: Payment `PENDING → SENT/SETTLED` or `ERROR`.【F:app/routers/payments.py†L20-L68】【F:app/services/state_machines.py†L205-L212】
3. **Intent:** Manage merchant suggestions
   - **UX PROPOSAL**: Support-facing admin console for merchant suggestions (approve/reject).
   - **Backend gap**: only sender-scoped suggestion endpoints exist today (`/merchant-suggestions` is sender-only).【F:app/routers/merchant_suggestions.py†L17-L63】

### 4.5 Admin: Governance (Users/Advisors/Pricing)
- **UX PROPOSAL**: Admin governance console (user, advisor, pricing controls).
- **Backend gap**: no admin endpoints exist for user/advisor/pricing management in the current API surface.

---

## 5) Edge Cases & Recovery Flows

| Edge Case | Backend Signal | UX Recovery | Evidence |
| --- | --- | --- | --- |
| **409 already decided** (e.g., payout already executed) | `PAYMENT_ALREADY_EXECUTED` | Disable CTA, refetch payment/summary, show “Already processed”. | 【F:app/utils/error_codes.py†L16-L99】 |
| **Proof already decided** | `PROOF_INVALID_STATUS` | Refetch proof + milestone, show conflict banner. | 【F:app/utils/error_codes.py†L13-L82】 |
| **Webhook lag** (funding or payout not updated yet) | Async PSP processing | Poll summary/payments per playbook; show “Webhook pending”. | 【F:docs/FRONTEND_API_USAGE.md†L70-L133】 |
| **Deposit conflict** | `ESCROW_OVER_FUNDED` | Inform user, refetch escrow, block further deposit. | 【F:app/utils/error_codes.py†L10-L72】 |
| **Payout error** | `PAYOUT_EXECUTION_FAILED` or `ERROR` status | Surface failure state + retry for support/admin only. | 【F:app/utils/error_codes.py†L159-L163】【F:app/models/payment.py†L15-L22】 |
| **Proof upload mismatch** | `NOT_ESCROW_PROVIDER` | Block upload, instruct to switch role. | 【F:app/utils/error_codes.py†L17-L104】 |

---

## 6) Horizon Scope Matrix

> MVP must list only features implementable with existing endpoints. V2/V3 can contain **UX PROPOSAL** items.

| Horizon | Scope (UI) | Backend reality |
| --- | --- | --- |
| **MVP (implementable now)** | Sender escrow creation & funding; provider proof upload; sender/support proof decisions; support/admin payout execution; escrow/proof/payment lists & detail views. | Backed by `/escrows`, `/files/proofs`, `/proofs`, `/payments/execute`, `/admin/payments` and read endpoints.【F:app/routers/escrow.py†L33-L249】【F:app/routers/uploads.py†L74-L162】【F:app/routers/proofs.py†L36-L178】【F:app/routers/payments.py†L20-L68】 |
| **V2** | **UX PROPOSAL**: Advisor workflow enhancements (notes, recommendations), support merchant suggestion moderation, richer analytics. | Requires new endpoints beyond current API surface. |
| **V3** | **UX PROPOSAL**: Pricing governance, automated dispute workflows, advanced reporting, multi-region compliance dashboards. | Requires new endpoints + domain services. |

---

## 7) Appendix

### 7.1 API Call Index by Screen

| Screen | Primary API Calls | Evidence |
| --- | --- | --- |
| Login | `POST /auth/login` | 【F:app/routers/auth.py†L133-L176】 |
| Session / Me | `GET /auth/me` | 【F:app/routers/auth.py†L179-L198】 |
| Escrow List | `GET /escrows` | 【F:app/routers/escrow.py†L33-L75】 |
| Escrow Detail | `GET /escrows/{id}`, `GET /escrows/{id}/summary`, `GET /escrows/{id}/milestones` | 【F:app/routers/escrow.py†L216-L285】 |
| Funding | `POST /escrows/{id}/funding-session`, `POST /escrows/{id}/deposit` | 【F:app/routers/escrow.py†L101-L142】 |
| Delivery Decision | `POST /escrows/{id}/mark-delivered`, `/client-approve`, `/client-reject` | 【F:app/routers/escrow.py†L145-L196】 |
| Proof Upload | `POST /files/proofs`, `POST /proofs` | 【F:app/routers/uploads.py†L74-L162】【F:app/routers/proofs.py†L36-L58】 |
| Proof Queue | `GET /proofs` | 【F:app/routers/proofs.py†L61-L120】 |
| Proof Detail | `GET /proofs/{id}` | 【F:app/routers/proofs.py†L124-L151】 |
| Proof Decision | `POST /proofs/{id}/decision` | 【F:app/routers/proofs.py†L153-L178】 |
| Payments Console | `GET /admin/payments`, `POST /payments/execute/{id}` | 【F:app/routers/payments.py†L20-L68】 |
| Merchant Suggestions (sender only) | `POST /merchant-suggestions`, `GET /merchant-suggestions` | 【F:app/routers/merchant_suggestions.py†L17-L41】 |

### 7.2 Evidence Index / TODO List

**Evidence index (backend-grounded)**
- Auth endpoints & scopes: `/auth/login`, `/auth/me`【F:app/routers/auth.py†L133-L198】
- Escrow endpoints (list/create/fund/summary/milestones)【F:app/routers/escrow.py†L33-L302】
- Proof endpoints (submit/list/detail/decision)【F:app/routers/proofs.py†L36-L178】
- Upload endpoint (`/files/proofs`)【F:app/routers/uploads.py†L74-L162】
- Payment execution & admin payments list【F:app/routers/payments.py†L20-L68】
- Merchant suggestions (sender only)【F:app/routers/merchant_suggestions.py†L17-L63】
- Status enums for escrow/milestone/payment & proof status field【F:app/models/escrow.py†L31-L39】【F:app/models/milestone.py†L21-L29】【F:app/models/payment.py†L15-L22】【F:app/models/proof.py†L41-L44】
- Error codes catalog (409/422/403/502 mapping)【F:app/utils/error_codes.py†L10-L227】

**TODO / gaps (explicit)**
1. **Advisor session endpoint**: `/auth/me` does not include advisor scope today; confirm if advisor UI needs a dedicated session endpoint.【F:app/routers/auth.py†L179-L198】
2. **Support merchant suggestion moderation**: only sender-scoped endpoints exist; need admin/support endpoints for review actions.【F:app/routers/merchant_suggestions.py†L17-L63】
3. **Admin governance APIs**: no endpoints exist for user/advisor/pricing management; treat governance UI as **UX PROPOSAL** until APIs are defined.
