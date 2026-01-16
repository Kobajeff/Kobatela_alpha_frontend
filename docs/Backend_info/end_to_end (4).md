# V2: End-to-End UX Projection (UI Horizon Scope)

Status: Draft for UI planning (backend-grounded)

**Evidence rule**: Any backend-facing claim must cite the current backend code (preferred) or a grounded contract doc with line references.

---

## 1) Personas & Role Boundaries

Backend roles/scopes available to the UI are defined by `ApiScope` and `UserRole` enums.【F:app/models/api_key.py†L16-L38】【F:app/models/user.py†L12-L21】

| Persona | Scope(s) used by UI | Role boundary (backend-grounded) | Notes |
| --- | --- | --- | --- |
| **Sender** | `sender` | Can create escrows, activate, fund/deposit, mark delivered, approve/reject, check deadlines, manage milestones + proof requests/expectations, issue external proof tokens, request advisor review, execute sender payouts, and list/view their escrows; can submit or decide proofs depending on workflow.【F:app/routers/escrow.py†L79-L385】【F:app/routers/sender_escrow_milestones.py†L15-L49】【F:app/routers/external_proof_tokens.py†L17-L129】【F:app/routers/sender_payments.py†L9-L35】【F:app/routers/proofs.py†L36-L178】【F:app/routers/advisors.py†L184-L228】 | Primary funder/decision-maker. |
| **Provider** | `provider` | Can view inbox/list escrows, view milestones with proof kind only (no proof requirements), submit proofs, and track proof status; cannot decide proofs or execute payouts.【F:app/routers/provider_inbox.py†L10-L35】【F:app/routers/escrow.py†L33-L316】【F:app/schemas/milestone.py†L238-L260】【F:app/routers/proofs.py†L36-L151】 | Proof uploader. |
| **Advisor** | `advisor` | Read-only advisor queue via `/advisor/me/proofs` and proof detail via `/proofs/{id}`; advisor approve/reject endpoints return 403 (no decisions or payouts).【F:app/routers/advisors.py†L184-L275】【F:app/routers/proofs.py†L124-L178】 | Read-only review. |
| **Support** | `support` | Can access admin escrow summaries, admin proof review queue, decide proofs, execute payouts, and list admin payments.【F:app/routers/admin_escrows.py†L7-L37】【F:app/routers/admin_tools.py†L22-L83】【F:app/routers/proofs.py†L153-L178】【F:app/routers/payments.py†L20-L89】 | Operational actions, not general governance. |
| **Admin** | `admin` | Same operational access as support (admin escrow summary, proof review queue/decisions, payouts, admin payments list).【F:app/routers/admin_escrows.py†L7-L37】【F:app/routers/admin_tools.py†L22-L83】【F:app/routers/proofs.py†L153-L178】【F:app/routers/payments.py†L20-L89】 | Governance UI is not backed by endpoints yet (see TODO). |

---

## 2) Global Navigation Map per Role (API-supported screens only)

> Each screen below is backed by existing endpoints. Any UX element not backed by APIs is flagged elsewhere as **UX PROPOSAL**.

### Sender
- **Login / Session** → `POST /auth/login`, `GET /auth/me`【F:app/routers/auth.py†L133-L198】
- **Escrow List** → `GET /escrows?mine=true`【F:app/routers/escrow.py†L33-L75】
- **Escrow Detail / Summary** → `GET /escrows/{id}`, `GET /escrows/{id}/summary` (includes `viewer_context.allowed_actions`)【F:app/routers/escrow.py†L216-L285】【F:app/schemas/escrow.py†L183-L224】
- **Escrow Activation** → `POST /escrows/{id}/activate`【F:app/routers/escrow.py†L101-L124】
- **Funding** → `POST /escrows/{id}/funding-session`, `POST /escrows/{id}/deposit`【F:app/routers/escrow.py†L127-L162】
- **Milestones (sender detail)** → `POST /sender/escrows/{id}/milestones`, `GET /sender/escrows/{id}/milestones`【F:app/routers/sender_escrow_milestones.py†L15-L49】
- **Proof Requests (sender)** → `POST/GET/PATCH/DELETE /escrows/{id}/proof-requests`【F:app/routers/escrow.py†L260-L385】
- **Delivery Decision** → `POST /escrows/{id}/mark-delivered`, `POST /escrows/{id}/client-approve`, `POST /escrows/{id}/client-reject`, `POST /escrows/{id}/check-deadline`【F:app/routers/escrow.py†L164-L230】
- **Proof Upload (sender fallback)** → `POST /files/proofs` then `POST /proofs`【F:app/routers/uploads.py†L73-L158】【F:app/routers/proofs.py†L36-L58】
- **Proof Review & Decision** → `GET /proofs?escrow_id=...`, `GET /proofs/{id}`, `POST /proofs/{id}/decision`【F:app/routers/proofs.py†L61-L178】
- **External Proof Tokens** → `POST/GET /sender/external-proof-tokens`, `GET /sender/external-proof-tokens/{id}`, `POST /sender/external-proof-tokens/{id}/revoke`【F:app/routers/external_proof_tokens.py†L32-L198】
- **Advisor Review Request** → `POST /proofs/{id}/request_advisor_review`【F:app/routers/advisors.py†L184-L228】
- **Sender Payout Execute** → `POST /sender/payments/{payment_id}/execute`【F:app/routers/sender_payments.py†L12-L35】

### Provider
- **Login / Session** → `POST /auth/login`, `GET /auth/me`【F:app/routers/auth.py†L133-L198】
- **Provider Inbox** → `GET /provider/inbox/escrows`【F:app/routers/provider_inbox.py†L10-L35】
- **Escrow Detail (read)** → `GET /escrows/{id}`【F:app/routers/escrow.py†L233-L249】
- **Milestones (participant-safe)** → `GET /escrows/{id}/milestones`【F:app/routers/escrow.py†L288-L302】
- **Proof Upload** → `POST /files/proofs` then `POST /proofs`【F:app/routers/uploads.py†L74-L162】【F:app/routers/proofs.py†L36-L58】
- **Proof Status** → `GET /proofs?escrow_id=...`, `GET /proofs/{id}`【F:app/routers/proofs.py†L61-L151】

### Advisor
- **Login / Session** → `POST /auth/login`, `GET /auth/me` (advisor scope allowed).【F:app/routers/auth.py†L133-L198】
- **Advisor Profile** → `GET /advisor/me/profile`【F:app/routers/advisors.py†L184-L197】
- **Assigned Proof Queue (read-only)** → `GET /advisor/me/proofs`【F:app/routers/advisors.py†L204-L221】
- **Proof Detail (read-only)** → `GET /proofs/{id}`【F:app/routers/proofs.py†L124-L151】

### Support
- **Admin Escrow Summary** → `GET /admin/escrows/{id}/summary`【F:app/routers/admin_escrows.py†L7-L37】
- **Proof Review Queue + Decision** → `GET /admin/proofs/review-queue`, `POST /proofs/{id}/decision`【F:app/routers/admin_tools.py†L22-L83】【F:app/routers/proofs.py†L153-L178】
- **Payments Console** → `GET /admin/payments`, `POST /payments/execute/{id}`【F:app/routers/payments.py†L20-L89】

### Admin
- **Admin Escrow Summary** → `GET /admin/escrows/{id}/summary`【F:app/routers/admin_escrows.py†L7-L37】
- **Proof Review Queue + Decision** → `GET /admin/proofs/review-queue`, `POST /proofs/{id}/decision`【F:app/routers/admin_tools.py†L22-L83】【F:app/routers/proofs.py†L153-L178】
- **Payments Console** → `GET /admin/payments`, `POST /payments/execute/{id}`【F:app/routers/payments.py†L20-L89】

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
- **Provider milestone view only includes proof kind (no proof requirements/fraud expectations).** `MilestoneProviderRead` omits `proof_requirements` and related fraud expectations entirely.【F:app/schemas/milestone.py†L238-L260】【F:app/routers/escrow.py†L288-L302】
- **External beneficiary views are minimal:** external token summary includes escrow + milestone amounts/status/proof kind only (no fraud expectations or metadata).【F:app/routers/external_proofs.py†L384-L447】【F:app/schemas/external_proofs.py†L166-L198】
- **CTA gating must follow `viewer_context.allowed_actions` from `GET /escrows/{id}/summary` (no implicit permissions).**【F:app/schemas/escrow.py†L183-L224】【F:app/services/escrow.py†L1686-L1733】

---

## 4) End-to-End Journeys (Intent → Screen → API → Expected State)

> Expected states reference backend enums (`EscrowStatus`, `MilestoneStatus`, `PaymentStatus`) and proof status strings.【F:app/models/escrow.py†L31-L39】【F:app/models/milestone.py†L21-L29】【F:app/models/payment.py†L15-L22】【F:app/models/proof.py†L41-L44】

### 4.1 Sender: Create Escrow → Fund → Review Proof → Decision → Observe Payout
1. **Intent:** Create an escrow
   - Screen: Escrow Create
   - API: `POST /escrows`
   - Expected state: Escrow `DRAFT` after creation.【F:app/routers/escrow.py†L79-L98】【F:app/models/escrow.py†L31-L39】
2. **Intent:** Activate escrow (when required)
   - Screen: Escrow Activation
   - API: `POST /escrows/{id}/activate`
   - Expected state: Escrow transitions to `ACTIVE` when activation is allowed.【F:app/routers/escrow.py†L101-L124】【F:app/services/state_machines.py†L56-L69】
3. **Intent:** Fund escrow
   - Screen: Funding
   - API: `POST /escrows/{id}/funding-session` (optional) then `POST /escrows/{id}/deposit` (idempotent).
   - Expected state: Escrow transitions to `FUNDED` when funding succeeds (or remains in allowed intermediate states per the state machine).【F:app/routers/escrow.py†L127-L162】【F:app/services/state_machines.py†L56-L69】
4. **Intent:** Track milestones/proofs
   - Screen: Escrow Detail
   - API: `GET /escrows/{id}/summary`, `GET /escrows/{id}/milestones`, `GET /proofs?escrow_id=...`
   - Expected state: Milestones progress `WAITING → PENDING_REVIEW` after proof submission; proofs start in `PENDING`.【F:app/routers/escrow.py†L233-L302】【F:app/routers/proofs.py†L61-L120】【F:app/services/proofs.py†L2524-L2533】
5. **Intent:** Optional external beneficiary upload
   - Screen: External Proof Invite + External Upload
   - API: `POST /sender/external-proof-tokens`, external beneficiary uses `POST /external/files/proofs` (binary `multipart/form-data` with `file`; token via `Authorization: Bearer <token>` or `X-External-Token` header) then `POST /external/proofs/submit`, and can view `GET /external/escrows/summary` or `GET /external/escrows/{escrow_id}` plus `GET /external/proofs/{id}/status`.
   - Expected state: External uploads create `PENDING` proofs and expose only escrow/milestone amounts + proof kind in the external summary (no fraud expectations).【F:app/routers/external_proof_tokens.py†L32-L129】【F:app/routers/external_proofs.py†L148-L483】【F:app/security/external_tokens.py†L8-L31】【F:app/schemas/external_proofs.py†L46-L198】
6. **Intent:** Request advisor review (optional)
   - Screen: Proof Review
   - API: `POST /proofs/{id}/request_advisor_review`
   - Expected state: Proof stays `PENDING` but switches to advisor review mode with an assigned advisor profile.【F:app/routers/advisors.py†L184-L228】
7. **Intent:** Decide on proof
   - Screen: Proof Review
   - API: `POST /proofs/{id}/decision`
   - Expected state: Proof transitions to `APPROVED` or `REJECTED` (status string).【F:app/routers/proofs.py†L153-L178】【F:app/services/proofs.py†L3186-L3196】【F:app/services/proofs.py†L3250-L3263】
8. **Intent:** Approve or reject escrow delivery
   - Screen: Escrow Decision
   - API: `POST /escrows/{id}/client-approve` or `POST /escrows/{id}/client-reject`
   - Expected state: Escrow transitions to `RELEASED` or `REFUNDED/CANCELLED` depending on backend rules.【F:app/routers/escrow.py†L182-L213】【F:app/services/escrow.py†L758-L833】
9. **Intent:** Execute or observe payout status
   - Screen: Escrow Detail / Payment Status
   - API: `POST /sender/payments/{payment_id}/execute` (sender) or `POST /payments/execute/{payment_id}` (support/admin), with status reads via `GET /escrows/{id}/summary` or `GET /payments/{id}`.
   - Expected state: Payment status `PENDING → SENT/SETTLED` or `ERROR/REFUNDED`.【F:app/routers/sender_payments.py†L12-L35】【F:app/routers/payments.py†L20-L61】【F:app/routers/escrow.py†L233-L249】【F:app/models/payment.py†L15-L22】

### 4.2 Provider: Upload Proof → Submit → Track Status
1. **Intent:** Upload proof file
   - Screen: Proof Upload
   - API: `POST /files/proofs` (binary `multipart/form-data` with `file`; optional `escrow_id` form field).
   - Expected state: Receive `storage_url` + `sha256` for proof submission.【F:app/routers/uploads.py†L73-L158】【F:app/schemas/proof.py†L280-L293】
2. **Intent:** Submit proof
   - Screen: Proof Upload (step 2)
   - API: `POST /proofs`
   - Expected state: Proof created with status `PENDING`; milestone progresses to `PENDING_REVIEW`.【F:app/routers/proofs.py†L36-L58】【F:app/services/proofs.py†L2524-L2552】
3. **Intent:** Track review status
   - Screen: Proof Status
   - API: `GET /proofs?escrow_id=...` or `GET /proofs/{id}`
   - Expected state: Proof transitions to `APPROVED` or `REJECTED`; milestones to `APPROVED/REJECTED/PAID`. Provider milestone lists expose `proof_kind` only (no proof requirements).【F:app/routers/proofs.py†L61-L151】【F:app/services/proofs.py†L3186-L3196】【F:app/services/proofs.py†L3250-L3263】【F:app/services/state_machines.py†L108-L115】【F:app/schemas/milestone.py†L238-L260】

### 4.3 Advisor: Review Assigned Proofs (Read-only)
1. **Intent:** View assigned queue
   - Screen: Advisor Proof Queue
   - API: `GET /advisor/me/proofs`
   - Expected state: Proof list filtered to the advisor’s assigned queue (read-only).【F:app/routers/advisors.py†L204-L221】
2. **Intent:** Inspect proof detail
   - Screen: Proof Detail (read-only)
   - API: `GET /proofs/{id}`
   - Expected state: Proof detail without decision actions (advisor approve/reject endpoints always 403).【F:app/routers/proofs.py†L124-L178】【F:app/routers/advisors.py†L223-L275】

### 4.4 Support: Proof Queue + Payments Console + Merchant Suggestions Admin
1. **Intent:** Triage proofs
   - Screen: Support Proof Queue
   - API: `GET /admin/proofs/review-queue`, `POST /proofs/{id}/decision`
   - Expected state: Proofs transition from `PENDING` to `APPROVED/REJECTED`.【F:app/routers/admin_tools.py†L22-L83】【F:app/routers/proofs.py†L153-L178】【F:app/services/proofs.py†L3186-L3196】【F:app/services/proofs.py†L3250-L3263】
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
| **MVP (implementable now)** | Sender escrow creation/activation/funding, milestone + proof request management, proof review/decisions, and sender payout execution; provider inbox + proof upload; support/admin proof review queue + payout execution; external proof tokens + external beneficiary upload summary. | Backed by `/escrows`, `/sender/escrows/*`, `/escrows/{id}/proof-requests`, `/files/proofs`, `/proofs`, `/sender/payments/*/execute`, `/admin/proofs/review-queue`, `/payments/execute`, `/admin/payments`, `/sender/external-proof-tokens`, and `/external/*` endpoints.【F:app/routers/escrow.py†L33-L385】【F:app/routers/sender_escrow_milestones.py†L15-L49】【F:app/routers/uploads.py†L73-L158】【F:app/routers/proofs.py†L36-L178】【F:app/routers/sender_payments.py†L12-L35】【F:app/routers/admin_tools.py†L22-L83】【F:app/routers/payments.py†L20-L89】【F:app/routers/external_proof_tokens.py†L32-L161】【F:app/routers/external_proofs.py†L110-L483】 |
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
| Escrow Detail | `GET /escrows/{id}` | 【F:app/routers/escrow.py†L233-L249】 |
| Escrow Summary | `GET /escrows/{id}/summary` | 【F:app/routers/escrow.py†L252-L268】 |
| Escrow Activation | `POST /escrows/{id}/activate` | 【F:app/routers/escrow.py†L101-L124】 |
| Funding | `POST /escrows/{id}/funding-session`, `POST /escrows/{id}/deposit` | 【F:app/routers/escrow.py†L127-L162】 |
| Delivery Decision | `POST /escrows/{id}/mark-delivered`, `/client-approve`, `/client-reject`, `/check-deadline` | 【F:app/routers/escrow.py†L164-L230】 |
| Sender Milestones | `POST /sender/escrows/{id}/milestones`, `GET /sender/escrows/{id}/milestones` | 【F:app/routers/sender_escrow_milestones.py†L15-L49】 |
| Milestones (participant-safe) | `GET /escrows/{id}/milestones`, `GET /escrows/milestones/{id}` | 【F:app/routers/escrow.py†L288-L316】 |
| Proof Requests | `POST/GET/PATCH/DELETE /escrows/{id}/proof-requests` | 【F:app/routers/escrow.py†L260-L385】 |
| Provider Inbox | `GET /provider/inbox/escrows` | 【F:app/routers/provider_inbox.py†L10-L35】 |
| Proof Upload | `POST /files/proofs` (binary `multipart/form-data` with `file`), `POST /proofs` | 【F:app/routers/uploads.py†L73-L158】【F:app/routers/proofs.py†L36-L58】 |
| Proof Queue | `GET /proofs` | 【F:app/routers/proofs.py†L61-L120】 |
| Proof Detail | `GET /proofs/{id}` | 【F:app/routers/proofs.py†L124-L151】 |
| Proof Decision | `POST /proofs/{id}/decision` | 【F:app/routers/proofs.py†L153-L178】 |
| Request Advisor Review | `POST /proofs/{id}/request_advisor_review` | 【F:app/routers/advisors.py†L184-L228】 |
| Proof Review Queue (admin/support) | `GET /admin/proofs/review-queue` | 【F:app/routers/admin_tools.py†L22-L83】 |
| Payments Console | `GET /admin/payments`, `POST /payments/execute/{id}` | 【F:app/routers/payments.py†L20-L89】 |
| Sender Payment Execute | `POST /sender/payments/{id}/execute` | 【F:app/routers/sender_payments.py†L12-L35】 |
| Payment Detail | `GET /payments/{id}` | 【F:app/routers/payments.py†L46-L61】 |
| Admin Escrow Summary | `GET /admin/escrows/{id}/summary` | 【F:app/routers/admin_escrows.py†L7-L37】 |
| External Proof Tokens | `POST/GET /sender/external-proof-tokens`, `GET /sender/external-proof-tokens/{token_id}`, `POST /sender/external-proof-tokens/{id}/revoke` | 【F:app/routers/external_proof_tokens.py†L32-L198】 |
| External Beneficiary Proofs | `POST /external/files/proofs` (binary `multipart/form-data` with `file`; token via `Authorization: Bearer <token>` or `X-External-Token`), `POST /external/proofs/submit`, `GET /external/escrows/summary`, `GET /external/escrows/{escrow_id}`, `GET /external/proofs/{id}/status` | 【F:app/routers/external_proofs.py†L148-L483】【F:app/security/external_tokens.py†L8-L31】 |
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
1. **Admin/support escrow list endpoint**: ops can read summaries by ID but there is no admin escrow list; add listing if required for ops dashboards.【F:app/routers/admin_escrows.py†L7-L37】
2. **Support merchant suggestion moderation**: only sender-scoped endpoints exist; need admin/support endpoints for review actions.【F:app/routers/merchant_suggestions.py†L17-L63】
3. **Admin governance APIs**: no endpoints exist for user/advisor/pricing management; treat governance UI as **UX PROPOSAL** until APIs are defined.
