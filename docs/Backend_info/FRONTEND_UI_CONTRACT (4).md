FRONTEND UI CONTRACT — Kobatela KCT (Role Safety & State Machines)
Version: V2
Last updated: 2025-12-18 (Europe/Brussels)
Audience: Frontend + Backend maintainers + Compliance (light)
Canonical dependencies: FRONTEND_API_GUIDE.md (API truth)
Non-goals: aucun changement runtime, aucun nouvel endpoint/role/champ non prouvé.
Evidence rule: chaque fait issu du code backend doit être cité avec 【F:path†Lx-Ly】.

## 1) Executive Summary (V2)
- This contract defines **role-based visibility, redaction, and forbidden data handling** for UI consumption of backend responses.
- Backend roles/scopes are defined by `ApiScope` and `UserRole`; UI must not invent additional roles or scopes.【F:app/models/api_key.py†L16-L38】【F:app/models/user.py†L11-L20】
- UI must treat Pydantic schemas as the authoritative shape for API responses and must apply **additional redaction** where required.【F:app/schemas/auth.py†L14-L32】【F:app/schemas/escrow.py†L61-L179】【F:app/schemas/proof.py†L83-L211】【F:app/schemas/payment.py†L10-L19】
- **Never simulate state transitions client-side**; use backend state machines as the source of truth.【F:app/services/state_machines.py†L53-L213】

## 2) Non‑Negotiable UI Safety Rules
1) **UI must not allow even if hidden**: Do not call endpoints or render CTAs for forbidden actions (e.g., payout execution for non-support/admin). Backend will enforce, but UI must still hard-block.
2) **Never simulate transitions client‑side**: always re-fetch/poll to confirm state changes per state machines.【F:app/services/state_machines.py†L53-L213】
3) **Role-based redaction is additive**: even if backend redacts, UI must still avoid logging and analytics leakage of sensitive fields (see Forbidden Data List).
4) **No credential exposure**: access tokens/keys must never be logged, stored in analytics, or shown outside authenticated contexts.【F:app/schemas/auth.py†L24-L28】

## 3) Forbidden Data List (V2 — Mandatory)
All items below are **forbidden to display or log** for the listed roles, even if the backend returns them. If backend protection is incomplete, mark as **RISK** and apply UI mitigation.

| Field / Data | Why dangerous | Who must NEVER see it | Where it exists (model/schema/service) | Current backend protection (if any) | UI mitigation | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `access_token`, `token` (API key) | Credential leakage / account takeover | Everyone except the authenticated user at login; never log/share | `AuthLoginResponse` | None (returned by login) | Store securely; never log; never expose in UI except copy action | 【F:app/schemas/auth.py†L24-L28】 |
| `ApiKey.key_hash`, `ApiKey.prefix` | Secret material / replay risk | All UI roles | `ApiKey` model | Not exposed in UI schemas | Never build UI to display; treat as backend-only | 【F:app/models/api_key.py†L41-L48】 |
| `PaymentRead.psp_ref` | PSP traceability / payout leakage | Sender/Provider/Advisor | `PaymentRead` schema | Redacted for non admin/support via `redact_payment_for_role` when summary/dashboard is built | Hide in UI; never log; if present treat as RISK | 【F:app/schemas/payment.py†L10-L19】【F:app/utils/redaction.py†L156-L163】【F:app/services/escrow.py†L920-L930】 |
| `PaymentRead.idempotency_key` | Replay risk / PSP coupling | Sender/Provider/Advisor | `PaymentRead` schema | Redacted for non admin/support via `redact_payment_for_role` when summary/dashboard is built | Hide in UI; never log; if present treat as RISK | 【F:app/schemas/payment.py†L10-L19】【F:app/utils/redaction.py†L156-L163】【F:app/services/escrow.py†L920-L930】 |
| `Payment.destination_iban`, `Payment.destination_stripe_account_id` | Bank account leakage | All non-admin/support | `Payment` model | Not exposed via `PaymentRead` | Never display; admin-only if future endpoint added | 【F:app/models/payment.py†L78-L85】 |
| Proof `metadata` (raw) including `ocr_raw` | OCR text can contain PII/financial data | Sender/Provider/Advisor | `ProofRead.metadata` + OCR enrichment | Backend masks keys and strips payout/analytics patterns but does **not** explicitly drop `ocr_raw` → **RISK** | Hide raw metadata; surface only safe, pre-approved summaries | 【F:app/schemas/proof.py†L83-L109】【F:app/services/proofs.py†L1225-L1274】【F:app/utils/redaction.py†L117-L153】【F:app/utils/masking.py†L10-L138】 |
| `invoice_merchant_metadata` in proof metadata | Merchant identity + account hints | Sender/Provider/Advisor | Proof pipeline stores `invoice_merchant_metadata` | Masking/stripping does not explicitly remove this key → **RISK** | UI must drop this field entirely | 【F:app/services/proofs.py†L2289-L2367】【F:app/models/proof.py†L60-L69】【F:app/utils/redaction.py†L117-L153】 |
| `gps_lat`, `gps_lng` (EXIF/GPS) | Precise location disclosure | All non-admin/support | Proof metadata / EXIF checks | Not explicitly removed → **RISK** | UI must remove; never log or persist | 【F:app/services/proofs.py†L1042-L1110】 |
| Proof AI internals: `ai_explanation`, `ai_score_ml`, `ai_risk_level_ml`, `ai_flags` | Internal model reasoning & signals | Sender/Provider/Advisor | `ProofRead` schema + model | Redacted for sender/provider only; advisor still receives → **RISK** | Hide for Advisor + client roles; display only `ai_risk_level` (if allowed) | 【F:app/schemas/proof.py†L96-L109】【F:app/models/proof.py†L110-L127】【F:app/utils/redaction.py†L138-L153】 |
| Beneficiary PII (`bank_account`, `iban`, `national_id_number`, addresses) | Financial & identity PII | All non-admin/support | Beneficiary schemas | Redacted via beneficiary profile redaction | UI must never log; show only masked public profile | 【F:app/schemas/beneficiary.py†L12-L129】【F:app/services/beneficiaries.py†L86-L99】 |
| Merchant registry PII (`iban`, `tax_id`, `stripe_account_id`, pricing stats) | Financial/identity data, pricing intel | All non-admin/support | Merchant registry/observed models | Not exposed in UI schemas | Do not render in UI unless future admin-only endpoint is added | 【F:app/models/merchants.py†L34-L120】 |
| Milestone geofence fields (`geofence_lat/lng/radius`) | Location privacy | All non-admin/support | Milestone model | Not exposed via `MilestoneRead` | Do not infer/show; treat as backend-only | 【F:app/models/milestone.py†L97-L106】【F:app/schemas/escrow.py†L145-L155】 |

## 4) Field Visibility Matrix (Single Table — Mandatory)
Legend: **Yes** = displayable, **Masked** = displayable only after UI redaction, **No** = must be hidden.

Field | Sender | Provider | Advisor | Support | Admin | Redaction rule | Enforced where | Evidence
---|---|---|---|---|---|---|---|---
User.id | Yes | Yes | Yes | Yes | Yes | None | Auth schema only | 【F:app/schemas/auth.py†L14-L21】
User.email | Yes | Yes | Yes | Yes | Yes | None (but never log) | Auth schema only | 【F:app/schemas/auth.py†L14-L21】
User.username | Yes | Yes | Yes | Yes | Yes | None | Auth schema only | 【F:app/schemas/auth.py†L14-L21】
User.role | Yes | Yes | Yes | Yes | Yes | None | Auth schema only | 【F:app/schemas/auth.py†L14-L21】
User.payout_channel | Yes | Yes | Yes | Yes | Yes | None | Auth schema only | 【F:app/schemas/auth.py†L14-L21】

Escrow.id | Yes | Yes | No (no escrow endpoints for advisor) | Yes | Yes | None | Escrow schemas + scope | 【F:app/schemas/escrow.py†L61-L76】【F:app/routers/escrow.py†L216-L226】
Escrow.sender_user_id (client_id) | Yes | Yes | No | Yes | Yes | None | Escrow schemas + scope | 【F:app/schemas/escrow.py†L61-L69】【F:app/routers/escrow.py†L216-L226】
Escrow.provider_user_id | Yes | Yes | No | Yes | Yes | None | Escrow schemas + scope | 【F:app/schemas/escrow.py†L64-L69】【F:app/routers/escrow.py†L216-L226】
Escrow.beneficiary_id | Yes | Yes | No | Yes | Yes | None (but treat as sensitive ref) | Escrow schemas + scope | 【F:app/schemas/escrow.py†L69-L76】【F:app/routers/escrow.py†L216-L226】
Escrow.beneficiary_profile | Masked (public view only) | Masked | No | Yes | Yes | Beneficiary redaction by actor | `redact_beneficiary_profile_for_actor` | 【F:app/schemas/escrow.py†L69-L76】【F:app/services/escrow.py†L845-L863】【F:app/services/beneficiaries.py†L86-L99】
Escrow.amount_total | Yes | Yes | No | Yes | Yes | None | Escrow schemas + scope | 【F:app/schemas/escrow.py†L71-L76】【F:app/routers/escrow.py†L216-L226】
Escrow.currency | Yes | Yes | No | Yes | Yes | None | Escrow schemas + scope | 【F:app/schemas/escrow.py†L71-L76】【F:app/routers/escrow.py†L216-L226】
Escrow.status | Yes | Yes | No | Yes | Yes | None | Escrow schemas + scope | 【F:app/schemas/escrow.py†L72-L76】【F:app/models/escrow.py†L31-L39】
Escrow.domain | Yes | Yes | No | Yes | Yes | None | Escrow schemas + scope | 【F:app/schemas/escrow.py†L73-L76】【F:app/models/escrow.py†L42-L45】
Escrow.release_conditions_json | Yes | Yes | No | Yes | Yes | Mask nested sensitive data if present | UI-only redaction | 【F:app/schemas/escrow.py†L74-L76】
Escrow.deadline_at | Yes | Yes | No | Yes | Yes | None | Escrow schemas + scope | 【F:app/schemas/escrow.py†L75-L76】

Milestone.id | Yes | Yes | No (advisor has no milestone endpoints) | Yes | Yes | None | Milestone schema + scope | 【F:app/schemas/escrow.py†L145-L155】【F:app/routers/escrow.py†L271-L300】
Milestone.escrow_id | Yes | Yes | No | Yes | Yes | None | Milestone schema + scope | 【F:app/schemas/escrow.py†L145-L155】【F:app/routers/escrow.py†L271-L300】
Milestone.label | Yes | Yes | No | Yes | Yes | None | Milestone schema + scope | 【F:app/schemas/escrow.py†L145-L155】
Milestone.amount | Yes | Yes | No | Yes | Yes | None | Milestone schema + scope | 【F:app/schemas/escrow.py†L145-L155】
Milestone.currency | Yes | Yes | No | Yes | Yes | None | Milestone schema + scope | 【F:app/schemas/escrow.py†L145-L155】
Milestone.sequence_index | Yes | Yes | No | Yes | Yes | None | Milestone schema + scope | 【F:app/schemas/escrow.py†L145-L155】
Milestone.status | Yes | Yes | No | Yes | Yes | None | Milestone schema + scope | 【F:app/schemas/escrow.py†L145-L155】【F:app/models/milestone.py†L21-L29】
Milestone.proof_kind | Yes | Yes | No | Yes | Yes | None | Milestone schema + scope | 【F:app/schemas/escrow.py†L145-L155】
Milestone.proof_requirements | Yes | Yes | No | Yes | Yes | Mask any sensitive nested fields (e.g., gps_required details) | UI-only redaction | 【F:app/schemas/escrow.py†L145-L155】【F:app/models/milestone.py†L97-L105】

Proof.id | Yes | Yes | Yes | Yes | Yes | None | Proof schema + redaction pipeline | 【F:app/schemas/proof.py†L83-L109】【F:app/services/proofs.py†L2002-L2033】
Proof.escrow_id | Yes | Yes | Yes | Yes | Yes | None | Proof schema + redaction pipeline | 【F:app/schemas/proof.py†L83-L109】【F:app/services/proofs.py†L2002-L2033】
Proof.milestone_id | Yes | Yes | Yes | Yes | Yes | None | Proof schema + redaction pipeline | 【F:app/schemas/proof.py†L83-L109】
Proof.type | Yes | Yes | Yes | Yes | Yes | None | Proof schema + redaction pipeline | 【F:app/schemas/proof.py†L83-L109】
Proof.storage_key | Masked (never log) | Masked | Masked | Yes | Yes | Do not log/persist | UI-only redaction | 【F:app/schemas/proof.py†L83-L109】
Proof.storage_url | Masked (never log) | Masked | Masked | Yes | Yes | Do not log/persist | UI-only redaction | 【F:app/schemas/proof.py†L83-L109】
Proof.sha256 | Yes | Yes | Yes | Yes | Yes | None | Proof schema | 【F:app/schemas/proof.py†L83-L109】
Proof.metadata | Masked (drop `ocr_raw`, `invoice_merchant_metadata`) | Masked | Masked | Yes (masked) | Yes (masked) | `mask_proof_metadata` + `_redact_metadata_for_role` | `redact_proof_for_role` | 【F:app/schemas/proof.py†L83-L109】【F:app/utils/masking.py†L10-L138】【F:app/utils/redaction.py†L117-L153】
Proof.status | Yes | Yes | Yes | Yes | Yes | None | Proof schema | 【F:app/schemas/proof.py†L92-L94】
Proof.created_at | Yes | Yes | Yes | Yes | Yes | None | Proof schema | 【F:app/schemas/proof.py†L93-L94】
Proof.updated_at | Yes | Yes | Yes | Yes | Yes | None | Proof schema | 【F:app/schemas/proof.py†L93-L94】
Proof.ai_risk_level | Yes | Yes | Yes | Yes | Yes | Optional UI masking for clients | UI policy | 【F:app/schemas/proof.py†L96-L105】【F:app/models/proof.py†L110-L118】
Proof.ai_score | No (redacted) | No (redacted) | **RISK: backend allows** | Yes | Yes | Redacted for sender/provider only | `redact_proof_for_role` | 【F:app/schemas/proof.py†L96-L101】【F:app/utils/redaction.py†L138-L149】
Proof.ai_risk_level_ml | No (redacted) | No (redacted) | **RISK: backend allows** | Yes | Yes | Redacted for sender/provider only | `redact_proof_for_role` | 【F:app/schemas/proof.py†L96-L101】【F:app/utils/redaction.py†L138-L149】
Proof.ai_score_ml | No (redacted) | No (redacted) | **RISK: backend allows** | Yes | Yes | Redacted for sender/provider only | `redact_proof_for_role` | 【F:app/schemas/proof.py†L98-L100】【F:app/utils/redaction.py†L138-L149】
Proof.ai_flags | No | No | **RISK: backend allows** | Yes | Yes | UI must hide for non-admin/support | UI-only redaction | 【F:app/schemas/proof.py†L100-L101】
Proof.ai_explanation | No (redacted) | No (redacted) | **RISK: backend allows** | Yes | Yes | Redacted for sender/provider only | `redact_proof_for_role` | 【F:app/schemas/proof.py†L101-L102】【F:app/utils/redaction.py†L138-L149】
Proof.ai_checked_at | Yes | Yes | Yes | Yes | Yes | None | Proof schema | 【F:app/schemas/proof.py†L102-L103】
Proof.ai_reviewed_by | Yes | Yes | Yes | Yes | Yes | None | Proof schema | 【F:app/schemas/proof.py†L103-L104】
Proof.ai_reviewed_at | Yes | Yes | Yes | Yes | Yes | None | Proof schema | 【F:app/schemas/proof.py†L104-L105】
Proof.review_mode | Yes | Yes | Yes | Yes | Yes | None | Proof schema | 【F:app/schemas/proof.py†L105-L106】
Proof.advisor_profile_id | Yes | Yes | Yes | Yes | Yes | None | Proof schema | 【F:app/schemas/proof.py†L106-L107】
Proof.invoice_total_amount | **RISK: backend allows** | **RISK: backend allows** | **RISK: backend allows** | Yes | Yes | UI must hide for non-admin/support | UI-only redaction | 【F:app/schemas/proof.py†L108-L109】
Proof.invoice_currency | **RISK: backend allows** | **RISK: backend allows** | **RISK: backend allows** | Yes | Yes | UI must hide for non-admin/support | UI-only redaction | 【F:app/schemas/proof.py†L108-L109】
Proof.payout_eligible | Yes | Yes | Yes | Yes | Yes | None | Proof detail schema | 【F:app/schemas/proof.py†L144-L148】
Proof.payout_blocked_reasons | Yes | Yes | Yes | Yes | Yes | None | Proof detail schema | 【F:app/schemas/proof.py†L144-L148】
Proof.proof_id | Yes | Yes | Yes | Yes | Yes | None | Computed field in schema | 【F:app/schemas/proof.py†L111-L116】

Payment.id | Yes | Yes | No (advisor has no payment endpoints) | Yes | Yes | None | Payment schema + scope | 【F:app/schemas/payment.py†L10-L19】【F:app/routers/payments.py†L27-L43】
Payment.escrow_id | Yes | Yes | No | Yes | Yes | None | Payment schema + scope | 【F:app/schemas/payment.py†L10-L19】【F:app/routers/payments.py†L27-L43】
Payment.milestone_id | Yes | Yes | No | Yes | Yes | None | Payment schema + scope | 【F:app/schemas/payment.py†L10-L19】
Payment.amount | Yes | Yes | No | Yes | Yes | None | Payment schema | 【F:app/schemas/payment.py†L10-L19】
Payment.psp_ref | No (redacted) | No (redacted) | No | Yes | Yes | Redact for non admin/support | `redact_payment_for_role` | 【F:app/schemas/payment.py†L10-L19】【F:app/utils/redaction.py†L156-L163】
Payment.status | Yes | Yes | No | Yes | Yes | None | Payment schema | 【F:app/schemas/payment.py†L10-L19】【F:app/models/payment.py†L15-L22】
Payment.idempotency_key | No (redacted) | No (redacted) | No | Yes | Yes | Redact for non admin/support | `redact_payment_for_role` | 【F:app/schemas/payment.py†L10-L19】【F:app/utils/redaction.py†L156-L163】
Payment.created_at | Yes | Yes | No | Yes | Yes | None | Payment schema | 【F:app/schemas/payment.py†L10-L19】
Payment.updated_at | Yes | Yes | No | Yes | Yes | None | Payment schema | 【F:app/schemas/payment.py†L10-L19】

## 5) CTA Safety Matrix (Mandatory)
For every action button, **UI must enforce role + preconditions** and must handle error codes consistently.

Action | Allowed roles | Required status preconditions | Endpoint | UI on 401 | UI on 403 | UI on 409 | UI on 422 | Evidence
---|---|---|---|---|---|---|---|---
Create escrow | Sender | None (auth required) | `POST /escrows` | Logout + login | Hide CTA | Refetch escrows | Show validation errors | 【F:app/routers/escrow.py†L79-L98】
Deposit escrow | Sender | Idempotency-Key required; total deposit must not exceed amount_total | `POST /escrows/{id}/deposit` | Logout + login | Hide CTA | Refetch escrow + show conflict | Show validation errors | 【F:app/routers/escrow.py†L101-L124】【F:app/services/escrow.py†L472-L507】
Start funding session | Sender, Admin | Escrow exists | `POST /escrows/{id}/funding-session` | Logout + login | Hide CTA | Refetch escrow | Show validation errors | 【F:app/routers/escrow.py†L127-L142】
Mark delivered | Sender | Escrow must allow transition to `RELEASABLE` | `POST /escrows/{id}/mark-delivered` | Logout + login | Hide CTA | Refetch escrow | Show validation errors | 【F:app/routers/escrow.py†L145-L160】【F:app/services/escrow.py†L592-L603】【F:app/services/state_machines.py†L56-L66】
Approve escrow | Sender | Escrow must allow transition to `RELEASED` | `POST /escrows/{id}/client-approve` | Logout + login | Hide CTA | Refetch escrow | Show validation errors | 【F:app/routers/escrow.py†L163-L178】【F:app/services/escrow.py†L625-L641】【F:app/services/state_machines.py†L56-L66】
Reject escrow | Sender | If status `FUNDED/RELEASABLE` → refund; otherwise cancel | `POST /escrows/{id}/client-reject` | Logout + login | Hide CTA | Refetch escrow | Show validation errors | 【F:app/routers/escrow.py†L181-L196】【F:app/services/escrow.py†L663-L695】
Submit proof | Sender/Provider (contextual) | Milestone status must be `WAITING` | `POST /proofs` | Logout + login | Hide CTA | Refetch proofs/milestones | Show validation errors | 【F:app/routers/proofs.py†L36-L58】【F:app/services/proofs.py†L2280-L2283】
Upload proof file | Sender/Provider/Support/Admin | If escrow_id is required, must be provided | `POST /files/proofs` | Logout + login | Hide CTA | Refetch proof upload status | Show validation errors | 【F:app/routers/uploads.py†L74-L105】
Approve proof | Sender/Support/Admin | Proof must not already be APPROVED/REJECTED | `POST /proofs/{id}/decision` | Logout + login | Hide CTA | Refetch proof/milestone | Show validation errors | 【F:app/routers/proofs.py†L153-L176】【F:app/services/proofs.py†L3165-L3171】
Reject proof | Sender/Support/Admin | Proof must not already be REJECTED/APPROVED | `POST /proofs/{id}/decision` | Logout + login | Hide CTA | Refetch proof/milestone | Show validation errors | 【F:app/routers/proofs.py†L153-L176】【F:app/services/proofs.py†L3226-L3232】
Execute payout | Support/Admin only (advisor blocked) | Payment must not already be SENT/SETTLED/ERROR | `POST /payments/execute/{payment_id}` | Logout + login | Hide CTA | Refetch payment | Show validation errors | 【F:app/routers/payments.py†L27-L43】【F:app/services/payments.py†L931-L962】

## 6) State Machine Interpretation Rules (Mandatory)
- **Never simulate state transitions client-side**; the backend state machine is authoritative for escrow/milestone/proof/payment status changes.【F:app/services/state_machines.py†L53-L213】
- **Polling requirements**: When actions initiate async transitions (funding/payout/proof review), poll the relevant read endpoints (`/escrows/{id}`, `/escrows/{id}/summary`, `/proofs`, `/admin/payments`) until the state changes server-side.【F:app/routers/escrow.py†L216-L249】【F:app/routers/proofs.py†L61-L150】【F:app/routers/payments.py†L46-L68】

## 7) Logging & Analytics Safe Rules (Mandatory)
- Never log or send to analytics: `access_token`, `token`, `psp_ref`, `idempotency_key`, proof `storage_url`, proof `metadata`, OCR blobs, or any bank/national-id fields.【F:app/schemas/auth.py†L24-L28】【F:app/schemas/payment.py†L10-L19】【F:app/schemas/proof.py†L83-L109】【F:app/schemas/beneficiary.py†L12-L129】
- Never store OCR raw text or proof metadata in browser storage (localStorage/sessionStorage/IndexedDB). OCR raw content is stored in proof metadata (`ocr_raw`).【F:app/services/proofs.py†L1225-L1274】
- Avoid logging storage URLs or signed download tokens; treat them as secrets until expiry.【F:app/schemas/proof.py†L83-L109】【F:app/routers/uploads.py†L74-L162】

## 8) Known Backend Leaks / Required Future Backend Fixes (Explicit)
These items are **current backend risks**. UI must apply mitigation until backend fixes ship.

1) **Advisor exposure to AI internals**: `ai_score`, `ai_score_ml`, `ai_risk_level_ml`, `ai_explanation`, `ai_flags` are only redacted for sender/provider; advisors still receive them → **RISK**. UI must hide these for advisors and non-admin roles. Recommended backend fix: extend `redact_proof_for_role` to cover advisors.【F:app/schemas/proof.py†L96-L101】【F:app/utils/redaction.py†L138-L149】

2) **OCR raw data and invoice merchant metadata**: proof metadata includes `ocr_raw` and `invoice_merchant_metadata`. Current redaction masks keys but does not explicitly drop these → **RISK**. UI must drop these fields completely. Recommended backend fix: remove or fully redact `ocr_raw` and `invoice_merchant_metadata` for non-admin/support roles.【F:app/services/proofs.py†L1225-L1274】【F:app/services/proofs.py†L2289-L2367】【F:app/utils/redaction.py†L117-L153】

3) **Proof invoice totals in ProofRead**: `invoice_total_amount` and `invoice_currency` are exposed in `ProofRead` without role-based redaction → **RISK**. UI must hide for sender/provider/advisor. Recommended backend fix: redact these fields for non admin/support roles in `redact_proof_for_role`.【F:app/schemas/proof.py†L108-L109】【F:app/utils/redaction.py†L138-L153】

4) **Payment PSP identifiers in schemas**: `PaymentRead` includes `psp_ref` and `idempotency_key`; redaction is applied only when `redact_payment_for_role` is explicitly used (e.g., summary/dashboard). Any non-admin endpoint returning `PaymentRead` without redaction would leak → **RISK**. UI must hide these fields for non-admin/support roles. Recommended backend fix: enforce role-based payment schemas or centralized redaction for all payment responses.【F:app/schemas/payment.py†L10-L19】【F:app/utils/redaction.py†L156-L163】【F:app/services/escrow.py†L920-L930】

## 9) Appendix — Evidence Index (V2)
- Roles/scopes: `ApiScope`, `UserRole`【F:app/models/api_key.py†L16-L38】【F:app/models/user.py†L11-L20】
- Schemas: Auth【F:app/schemas/auth.py†L14-L32】; Escrow/Milestone【F:app/schemas/escrow.py†L61-L179】; Proof【F:app/schemas/proof.py†L83-L211】; Payment【F:app/schemas/payment.py†L10-L19】
- Redaction: Proof + Payment redaction helpers【F:app/utils/redaction.py†L117-L163】; metadata masking【F:app/utils/masking.py†L10-L138】
- Proof pipeline metadata (OCR, invoice metadata, GPS)【F:app/services/proofs.py†L1225-L1274】【F:app/services/proofs.py†L2289-L2367】【F:app/services/proofs.py†L1042-L1110】
- State machines (escrow/milestone/proof/payment)【F:app/services/state_machines.py†L53-L213】
- Endpoint evidence: Escrow【F:app/routers/escrow.py†L79-L249】; Proofs【F:app/routers/proofs.py†L36-L178】; Payments【F:app/routers/payments.py†L27-L68】; Uploads【F:app/routers/uploads.py†L74-L162】
