# Kobatela KCT — Administrative Operations Manual (Runbook V2)

**Version:** V2  
**Last updated:** 2025-12-30 (UTC)  
**Repo snapshot:** 28b6c9c22019159f96734a90cb941fce77ec2785  
**Audience:** Admin / Support / Advisor / Pricing Admin / Risk Admin  
**Scope:** Backend operational playbooks based strictly on current FastAPI routes, services, and state machines.  

---

## 1) Roles & Scopes (Ops) + Key Issuance Flow

### 1.1 Available scopes
The backend defines API key scopes for ops in the `ApiScope` enum: `admin`, `support`, `advisor`, `pricing_admin`, `risk_admin` (plus sender/provider).【F:app/models/api_key.py†L16-L39】

### 1.2 How ops obtains keys (auth flow)
1) **Login**: `POST /auth/login` accepts an email (and optional `scope`) to issue a key; it derives allowed scopes from user roles and rejects disallowed scopes.【F:app/routers/auth.py†L64-L176】  
2) **Key usage**: Ops send the key as `Authorization: Bearer <token>` or `X-API-Key` header (both are accepted).【F:app/security/__init__.py†L21-L30】  
3) **Scope enforcement**: `require_scope` allows admin bypass or requires the allowed scope list (e.g., admin/support on payments routes).【F:app/security/__init__.py†L136-L155】【F:app/routers/payments.py†L20-L38】

### 1.3 Ops scope matrix (what routes exist)
- **admin / support**: Operational execution routes (`/payments/execute/{payment_id}`, `/admin/payments`, admin tools, merchant suggestions).【F:app/routers/payments.py†L20-L63】【F:app/routers/admin_tools.py†L20-L179】【F:app/routers/admin_merchant_suggestions.py†L22-L102】
- **advisor**: Advisory routes are separate; advisor scope is enforced without admin bypass in `require_advisor_scope`.【F:app/security/__init__.py†L169-L182】
- **pricing_admin / risk_admin**: Pricing governance endpoints require `require_pricing_admin_scope`, which accepts both `PRICING_ADMIN` and `RISK_ADMIN`.【F:app/security/__init__.py†L158-L166】【F:app/routers/admin_pricing_reference.py†L19-L23】

**TODO / Not found:** No dedicated risk_admin-only routes are present.  
**FUTURE (minimal safe endpoint):** `GET /admin/risk/overview` (admin/support + risk_admin) to view risk pipeline status and snapshots.

---

## 2) Observability Doctrine (Logs, Redaction, Errors)

### 2.1 What to log (auditable events)
- Use `AuditLog` records with `actor`, `action`, `entity`, `entity_id`, and `data_json` for critical ops events.【F:app/models/audit.py†L10-L21】
- API key usage automatically logs `API_KEY_USED` and writes sanitized payloads via `sanitize_payload_for_audit`.【F:app/security/__init__.py†L115-L133】
- PSP webhook failures (payment errors) also create audit entries (`PAYMENT_FAILED`).【F:app/services/psp_webhooks.py†L600-L616】

### 2.2 What NOT to log or expose (PII / OCR / EXIF / PSP refs / idempotency)
**Rule:** When logging or exporting metadata, always use masking/redaction utilities (do not emit raw fields). These are implemented in the code base and should be reused in ops tooling.

- **PII masking:** `sanitize_payload_for_audit` masks `iban`, `account_number`, `card_number`, `email`, `storage_url`, `psp_reference`, etc.【F:app/utils/audit.py†L12-L75】
- **Proof metadata masking:** `mask_proof_metadata` and `redact_proof_for_role` remove or mask sensitive fields before external exposure.【F:app/utils/masking.py†L10-L138】【F:app/utils/redaction.py†L117-L153】
- **PSP refs + idempotency keys:** `redact_payment_for_role` removes `psp_ref` and `idempotency_key` for non-admin/support roles; do not expose these in shared logs or UI exports.【F:app/utils/redaction.py†L156-L164】
- **OCR / EXIF:** OCR output is stored in `metadata_payload["ocr_raw"]` and EXIF timestamps are parsed from `metadata["exif_timestamp"]`; treat these as sensitive and never log raw values outside audit-safe channels.【F:app/services/proofs.py†L1225-L1277】【F:app/services/rules.py†L15-L48】

### 2.3 Error standardization
- `error_response` produces the canonical error payload shape (`{"error": {"code", "message", ...}}`).【F:app/utils/errors.py†L17-L44】
- Global exception handlers wrap both HTTP and validation errors into this shape (500, 4xx, 422).【F:app/main.py†L221-L284】

---

## 3) Core Operational Pipelines (Truth-Based)

### 3.1 Escrow funding path (sender → PSP → funding success)
1) **Create escrow**: `POST /escrows` (sender scope).【F:app/routers/escrow.py†L79-L97】
2) **Start funding session (PSP)**: `POST /escrows/{id}/funding-session` returns a client secret for PSP payment flow (sender/admin).【F:app/routers/escrow.py†L127-L141】
3) **Idempotent deposit**: `POST /escrows/{id}/deposit` requires `Idempotency-Key` header (sender).【F:app/routers/escrow.py†L101-L124】
4) **Stripe webhook updates funding**: `payment_intent.succeeded` triggers `mark_funding_succeeded`, which creates an escrow deposit with idempotency key `stripe:<payment_intent_id>`.【F:app/services/psp_webhooks.py†L202-L229】【F:app/services/funding.py†L172-L223】

### 3.2 Proof ingestion path (upload → submit → enrichment)
1) **Upload file**: `POST /files/proofs` validates file type/size and returns `storage_url` + `sha256`.【F:app/routers/uploads.py†L41-L159】
2) **Submit proof**: `POST /proofs` records proof metadata and assigns upload rules to sender/provider scope.【F:app/routers/proofs.py†L36-L58】
3) **OCR enrichment**: invoice proofs run OCR; outputs stored under `ocr_status`, `ocr_provider`, and `ocr_raw` in metadata.【F:app/services/proofs.py†L1233-L1277】
4) **Fraud pipeline (if enabled)**: PDF/INVOICE/CONTRACT proofs route through fraud scoring when `is_fraud_pipeline_enabled` is true.【F:app/services/proofs.py†L1545-L1577】【F:app/services/feature_flags.py†L65-L73】

### 3.3 Merchant resolution + pricing analyzer + fraud pipeline
- **Merchant + pricing features** are assembled inside `run_fraud_pipeline` using merchant resolver and pricing data, producing `fraud_*` fields, risk bands, and flags (including hard-fail on high risk).【F:app/services/fraud_pipeline.py†L27-L195】
- **Pricing aggregates** are computed by `run_price_analyzer_job`, which rolls up pricing lines from proof metadata and persists merchant-level stats (must be run after enrichment).【F:app/services/price_analyzer_job.py†L341-L371】

### 3.4 Payout execution path (manual + webhook settlement)
1) **Manual execution (admin/support)**: `POST /payments/execute/{payment_id}` triggers the ReleaseFunds use-case for a pending payment.【F:app/routers/payments.py†L27-L43】【F:app/services/payments.py†L1054-L1068】
2) **Payout preconditions**: escrow must be FUNDED/RELEASABLE, milestone APPROVED, fraud/pricing/merchant checks must pass, and payout channel must be ready (Stripe onboarding).【F:app/services/payments.py†L171-L320】
3) **Settlement via PSP webhook**: `POST /psp/webhook` registers events idempotently and marks payments SETTLED or ERROR based on `psp_ref` + event type.【F:app/routers/psp.py†L17-L30】【F:app/services/psp_webhooks.py†L486-L618】

---

## 4) Playbooks (Step-by-step Checklists)

### 4.1 Funding stuck / webhook delayed
**Goal:** escrow remains unfunded despite PSP payment completion.

Checklist:
1) Confirm escrow status via `GET /admin/escrows/{id}/summary` for an unredacted view of milestones/proofs/parties (admin/support; tune `proofs_limit`/`include_milestones`/`include_proofs` as needed).【F:app/routers/admin_escrows.py†L17-L41】【F:app/services/admin_escrows.py†L27-L170】
2) Verify that the Stripe webhook endpoint is reachable: `/psp/stripe/webhook` is the handler for Stripe events.【F:app/routers/psp.py†L25-L30】
3) For Stripe, ensure `payment_intent.succeeded` is received and mapped to funding success (`mark_funding_succeeded` → escrow deposit).【F:app/services/psp_webhooks.py†L202-L229】【F:app/services/funding.py†L172-L223】
4) If the PSP confirms it sent a valid event, **replay** the event from PSP with valid signature (see playbook 4.6).【F:app/services/psp_webhooks.py†L121-L194】

**TODO / Not found:** No admin endpoint to query PSP webhook events.  
**FUTURE:** `GET /admin/psp/events?psp_ref=...` (admin/support) to inspect `PSPWebhookEvent` rows.

---

### 4.2 Payout failed / retry safely
**Goal:** prevent double payout while safely retrying failures.

Checklist:
1) Find payment record via `GET /admin/payments` (filter by escrow/status).【F:app/routers/payments.py†L46-L63】
2) Confirm payout preconditions (milestone APPROVED, fraud/pricing/merchant ok, Stripe readiness). These are enforced in `_assert_payout_preconditions`.【F:app/services/payments.py†L171-L320】
3) If PSP webhook marked payment ERROR, confirm audit entry `PAYMENT_FAILED` exists (evidence capture).【F:app/services/psp_webhooks.py†L600-L616】
4) **Retry** only when the payment is ERROR and preconditions are now satisfied; the unique payment constraint prevents multiple active payments for a milestone unless status is ERROR.【F:app/models/payment.py†L42-L48】
5) Execute the retry using `POST /payments/execute/{payment_id}` (admin/support).【F:app/routers/payments.py†L27-L43】

**Do NOT** double-trigger payout execution without verifying status; `POST /payments/execute/{payment_id}` has no idempotency header, so replay must be guarded manually by status checks.【F:app/routers/payments.py†L27-L43】【F:app/models/payment.py†L15-L23】

---

### 4.3 Proof blocked by merchant/pricing/fraud flags
**Goal:** identify why payout gating blocks and resolve safely.

Checklist:
1) Pull proof details or review queue using `/admin/proofs/review-queue` with filters (`advisor_id`, `unassigned_only`, `sender_id`, `provider_id`, `review_mode`, `status`) to inspect review_mode and AI risk indicators.【F:app/routers/admin_tools.py†L26-L56】
2) Check payout gating reasons (fraud/pricing/merchant) enforced by payout preconditions; these map to error codes such as `PAYOUT_BLOCKED_BY_FRAUD`, `MERCHANT_BLOCKED`, `PRICING_BLOCKING_FLAG_PRESENT` or `ML_RISK_REVIEW_REQUIRED`.【F:app/services/payments.py†L287-L316】
3) If mismatch relates to merchant matching in Direct Pay, review proof metadata signals written during submission (merchant match status/flags).【F:app/services/proofs.py†L1589-L1677】
4) If fraud or pricing pipeline errors exist, **do not override** without rerunning the pipeline and clearing flags. The pipeline sets `fraud_pipeline_error` when exceptions occur.【F:app/services/fraud_pipeline.py†L186-L190】

**TODO / Not found:** No API endpoint to re-run fraud pipeline or re-enrich proof metadata.  
**FUTURE:** `POST /admin/proofs/{id}/reprocess` (admin/support) to re-run OCR + fraud pipeline with audit trail.

---

### 4.4 Merchant suggestion approval/promotion
**Goal:** review and promote Direct Pay merchant suggestions.

Checklist:
1) List suggestions: `GET /admin/merchant-suggestions` (admin/support).【F:app/routers/admin_merchant_suggestions.py†L29-L45】
2) Approve or reject pending suggestion: `/admin/merchant-suggestions/{id}/approve` or `/reject`.【F:app/routers/admin_merchant_suggestions.py†L48-L88】
3) Promote approved suggestion to registry: `POST /admin/merchant-suggestions/{id}/promote`.【F:app/routers/admin_merchant_suggestions.py†L90-L102】

---

### 4.5 Pricing import + recompute + verify
**Goal:** refresh pricing references and recompute merchant aggregates.

Checklist:
1) Import CSV references: `POST /admin/pricing/reference/import-csv` (pricing_admin / risk_admin).【F:app/routers/admin_pricing_reference.py†L19-L59】
2) Optional: manage inflation adjustments via `/admin/pricing/inflation` endpoints (upload, create, update).【F:app/routers/admin_pricing_inflation.py†L76-L178】
3) Recompute aggregates: call `run_price_analyzer_job` after proofs are enriched (job relies on `Proof.metadata_` lines).【F:app/services/price_analyzer_job.py†L341-L371】

**TODO / Not found:** No HTTP endpoint exists to trigger `run_price_analyzer_job`.  
**FUTURE:** `POST /admin/pricing/recompute` (pricing_admin/risk_admin) to run `run_price_analyzer_job` with audit logging.

---

### 4.6 Stripe webhook replay / signature failure
**Goal:** safely replay Stripe events and resolve signature errors.

Checklist:
1) Confirm Stripe signature header: `Stripe-Signature` is required; missing header returns `STRIPE_SIGNATURE_MISSING`.【F:app/services/psp_webhooks.py†L133-L142】
2) Validate secrets: Stripe secrets must be configured or `STRIPE_NOT_CONFIGURED` is raised.【F:app/services/psp_webhooks.py†L151-L173】
3) If signature is invalid, the handler returns `STRIPE_SIGNATURE_INVALID` and logs warning; replay only with correct signature. 【F:app/services/psp_webhooks.py†L175-L181】
4) Re-send the event to `/psp/stripe/webhook` using provider replay tooling (Stripe dashboard).【F:app/routers/psp.py†L25-L30】

---

### 4.7 External proof token issuance & revocation
**Goal:** issue, inspect, and revoke upload tokens for external proof contributors.

Checklist:
1) Issue a scoped token bound to an escrow + milestone via `POST /sender/external-proof-tokens` (sender/support/admin; honors expiry, beneficiary match, and max_uploads).【F:app/routers/external_proof_tokens.py†L39-L75】【F:app/services/external_proof_tokens.py†L52-L188】
2) List or fetch token details without exposing the raw secret using `GET /sender/external-proof-tokens` (optional `escrow_id`/`milestone_idx`) or `GET /sender/external-proof-tokens/{token_id}` (same scopes).【F:app/routers/external_proof_tokens.py†L77-L143】【F:app/services/external_proof_tokens.py†L477-L513】
3) Revoke compromised/expired tokens via `POST /sender/external-proof-tokens/{token_id}/revoke`; revocation is idempotent and updates token status for subsequent uploads.【F:app/routers/external_proof_tokens.py†L146-L172】【F:app/services/external_proof_tokens.py†L520-L535】

---

## 5) Idempotency & Replay Safety

### 5.1 Idempotent operations (safe retry)
- **Escrow deposit**: requires `Idempotency-Key`, persisted as `EscrowDeposit.idempotency_key` (unique).【F:app/routers/escrow.py†L101-L124】【F:app/models/escrow.py†L130-L138】
- **Funding via Stripe webhook**: creates deposit with idempotency key `stripe:<payment_intent_id>`, preventing double funding on replays.【F:app/services/funding.py†L216-L223】
- **PSP webhooks**: replay protection uses in-memory TTL + `PSPWebhookEvent` uniqueness (`provider`, `event_id`).【F:app/services/psp_webhooks.py†L42-L455】【F:app/models/psp_webhook.py†L10-L21】

### 5.2 Operations that are NOT idempotent by API contract
- **Manual payout execution** (`POST /payments/execute/{payment_id}`) has no idempotency header; you must check payment status before retrying to avoid double payouts.【F:app/routers/payments.py†L27-L43】【F:app/models/payment.py†L15-L23】
- **Proof decisions** are stateful and should not be replayed without confirming current status (no idempotency header on `/proofs/{id}/decision`).【F:app/routers/proofs.py†L153-L176】

---

## 6) Incident Response

### 6.1 Severity levels (ops convention)
- **SEV-1:** Payments incorrect or PSP webhooks failing across many escrows.
- **SEV-2:** Fraud/pricing pipeline degraded; payouts blocked for a subset.
- **SEV-3:** Single-escrow operational failure (proof stuck, missing OCR, etc.).

### 6.2 Immediate containment steps (only what exists)
- **Disable AI proof advisor (admin-only):** `POST /admin/settings/ai-proof` toggles `ai_proof_enabled`.【F:app/routers/admin_settings.py†L26-L62】

**TODO / Not found:** No endpoints exist to toggle OCR, fraud pipeline, or direct pay flags (even though AdminSetting supports keys like `invoice_ocr_enabled`, `fraud_pipeline_enabled`, and direct-pay flags).【F:app/routers/admin_settings.py†L16-L23】【F:app/services/feature_flags.py†L10-L149】  
**FUTURE (minimal safe endpoints):**  
- `POST /admin/settings/invoice-ocr` (admin) → `invoice_ocr_enabled`  
- `POST /admin/settings/fraud-pipeline` (admin) → `fraud_pipeline_enabled`  
- `POST /admin/settings/direct-pay` (admin) → direct pay flags

### 6.3 Evidence capture (safe)
- Capture `AuditLog` entries for PSP failures and key usage; they mask sensitive fields by default.【F:app/models/audit.py†L10-L21】【F:app/services/psp_webhooks.py†L600-L616】【F:app/utils/audit.py†L12-L75】
- Do not export raw OCR/EXIF data; use masked metadata and redaction utilities first.【F:app/utils/masking.py†L130-L138】【F:app/services/proofs.py†L1272-L1277】【F:app/services/rules.py†L15-L48】

---

## 7) Appendix

### 7.1 Command Index (Ops-relevant API endpoints)
| Method | Path | Purpose | Required scope(s) | Evidence |
| --- | --- | --- | --- | --- |
| POST | /auth/login | Issue API key | None | 【F:app/routers/auth.py†L133-L176】 |
| GET | /auth/me | Validate key / user | sender/provider/admin | 【F:app/routers/auth.py†L179-L198】 |
| GET | /escrows/{id} | Inspect escrow | sender/provider/support/admin | 【F:app/routers/escrow.py†L216-L230】 |
| GET | /admin/escrows/{id}/summary | Admin escrow summary (unredacted) | admin/support | 【F:app/routers/admin_escrows.py†L17-L41】 |
| POST | /escrows/{id}/deposit | Idempotent funding | sender | 【F:app/routers/escrow.py†L101-L124】 |
| POST | /escrows/{id}/funding-session | Start PSP funding session | sender/admin | 【F:app/routers/escrow.py†L127-L141】 |
| POST | /files/proofs | Upload proof file | sender/provider/support/admin | 【F:app/routers/uploads.py†L74-L159】 |
| POST | /proofs | Submit proof | sender/provider/support/admin | 【F:app/routers/proofs.py†L36-L58】 |
| POST | /proofs/{id}/decision | Approve/reject proof | sender/support/admin | 【F:app/routers/proofs.py†L153-L176】 |
| GET | /admin/proofs/review-queue | Review queue | admin/support | 【F:app/routers/admin_tools.py†L39-L107】 |
| POST | /payments/execute/{payment_id} | Execute payout | admin/support | 【F:app/routers/payments.py†L27-L43】 |
| GET | /admin/payments | List payments | admin/support | 【F:app/routers/payments.py†L46-L63】 |
| GET | /admin/merchant-suggestions | Merchant suggestions list | admin/support | 【F:app/routers/admin_merchant_suggestions.py†L29-L45】 |
| POST | /admin/merchant-suggestions/{id}/approve | Approve suggestion | admin/support | 【F:app/routers/admin_merchant_suggestions.py†L48-L66】 |
| POST | /admin/merchant-suggestions/{id}/reject | Reject suggestion | admin/support | 【F:app/routers/admin_merchant_suggestions.py†L69-L88】 |
| POST | /admin/merchant-suggestions/{id}/promote | Promote to registry | admin/support | 【F:app/routers/admin_merchant_suggestions.py†L90-L102】 |
| POST | /admin/pricing/reference/import-csv | Import price references | pricing_admin/risk_admin | 【F:app/routers/admin_pricing_reference.py†L19-L59】 |
| POST | /admin/pricing/inflation/upload-csv | Import inflation data | pricing_admin/risk_admin | 【F:app/routers/admin_pricing_inflation.py†L76-L109】 |
| GET | /admin/pricing/inflation | List inflation adjustments | pricing_admin/risk_admin | 【F:app/routers/admin_pricing_inflation.py†L112-L143】 |
| POST | /admin/settings/ai-proof | Toggle AI proof advisor | admin | 【F:app/routers/admin_settings.py†L46-L62】 |
| POST | /psp/webhook | Generic PSP webhook | PSP | 【F:app/routers/psp.py†L17-L22】 |
| POST | /psp/stripe/webhook | Stripe webhook | PSP | 【F:app/routers/psp.py†L25-L30】 |
| POST | /sender/external-proof-tokens | Issue external proof token | sender/support/admin | 【F:app/routers/external_proof_tokens.py†L39-L75】 |
| GET | /sender/external-proof-tokens | List external proof tokens | sender/support/admin | 【F:app/routers/external_proof_tokens.py†L77-L117】 |
| GET | /sender/external-proof-tokens/{token_id} | Inspect external proof token | sender/support/admin | 【F:app/routers/external_proof_tokens.py†L119-L143】 |
| POST | /sender/external-proof-tokens/{token_id}/revoke | Revoke external proof token | sender/support/admin | 【F:app/routers/external_proof_tokens.py†L146-L172】 |

### 7.2 State Machine Tables (Ops-relevant)

#### Escrow
Escrow states are defined by `EscrowStatus` and used to gate funding and payouts.【F:app/models/escrow.py†L31-L39】

| State | Meaning | Ops gating notes | Evidence |
| --- | --- | --- | --- |
| DRAFT | Created, not funded | No payout allowed | 【F:app/models/escrow.py†L31-L39】 |
| FUNDED | Funds received | Payouts allowed if milestones approved | 【F:app/models/escrow.py†L31-L39】【F:app/services/payments.py†L184-L190】 |
| RELEASABLE | Ready for release | Same as FUNDED for payout gating | 【F:app/models/escrow.py†L31-L39】【F:app/services/payments.py†L184-L190】 |
| RELEASED | All milestones paid | Final state | 【F:app/models/escrow.py†L31-L39】 |
| REFUNDED | Funds returned | No further payouts | 【F:app/models/escrow.py†L31-L39】 |
| CANCELLED | Escrow cancelled | No further payouts | 【F:app/models/escrow.py†L31-L39】 |

#### Milestone
Milestone status gates payout execution and is validated at payout time.【F:app/models/milestone.py†L21-L29】【F:app/services/payments.py†L281-L285】

| State | Meaning | Ops gating notes | Evidence |
| --- | --- | --- | --- |
| WAITING | Proof not submitted | No payout | 【F:app/models/milestone.py†L21-L29】 |
| PENDING_REVIEW | Proof submitted | Review required | 【F:app/models/milestone.py†L21-L29】 |
| APPROVED | Ready to pay | Required for payout | 【F:app/models/milestone.py†L21-L29】【F:app/services/payments.py†L281-L285】 |
| REJECTED | Proof rejected | Payout blocked | 【F:app/models/milestone.py†L21-L29】 |
| PAYING | Payout in flight | Await PSP webhook | 【F:app/models/milestone.py†L21-L29】 |
| PAID | Settled | Terminal for milestone | 【F:app/models/milestone.py†L21-L29】 |

#### Payment
Payment status reflects payout execution state and PSP settlement outcome.【F:app/models/payment.py†L15-L23】

| State | Meaning | Ops gating notes | Evidence |
| --- | --- | --- | --- |
| PENDING | Awaiting execution | Executable via admin/support | 【F:app/models/payment.py†L15-L23】【F:app/routers/payments.py†L27-L43】 |
| SENT | Sent to PSP | Await settlement | 【F:app/models/payment.py†L15-L23】 |
| SETTLED | PSP confirmed | Finalized by webhook | 【F:app/models/payment.py†L15-L23】【F:app/services/psp_webhooks.py†L546-L582】 |
| ERROR | PSP failure | Eligible for retry if safe | 【F:app/models/payment.py†L15-L23】【F:app/services/psp_webhooks.py†L584-L618】 |
| REFUNDED | Funds returned | Terminal | 【F:app/models/payment.py†L15-L23】 |

---

## 8) Evidence Index (Quick Links)
- API key extraction + scope enforcement + audit logging: 【F:app/security/__init__.py†L21-L166】
- Auth login & scope issuance: 【F:app/routers/auth.py†L64-L176】
- Escrow funding routes: 【F:app/routers/escrow.py†L79-L141】
- Proof upload + submission routes: 【F:app/routers/uploads.py†L74-L159】【F:app/routers/proofs.py†L36-L58】
- Fraud pipeline + pricing aggregation: 【F:app/services/fraud_pipeline.py†L27-L197】【F:app/services/price_analyzer_job.py†L341-L371】
- Payments execution + gating: 【F:app/routers/payments.py†L27-L63】【F:app/services/payments.py†L171-L320】
- PSP webhooks + replay protection: 【F:app/routers/psp.py†L17-L30】【F:app/services/psp_webhooks.py†L42-L618】
- Audit log model & masking: 【F:app/models/audit.py†L10-L21】【F:app/utils/audit.py†L12-L75】
- Redaction/masking of sensitive metadata: 【F:app/utils/masking.py†L10-L138】【F:app/utils/redaction.py†L117-L164】

---

## Change Log (Document Sync Safe Mode)
### Substitutions
1) BEFORE: “Confirm escrow status via `GET /escrows/{id}` (support/admin allowed).” → AFTER: “Confirm escrow status via `GET /admin/escrows/{id}/summary`… (admin/support; tune proofs_limit/include_milestones/include_proofs).” Reason: admin/support now have a dedicated unredacted escrow summary endpoint with optional proof/milestone toggles. Source: 【F:app/routers/admin_escrows.py†L17-L41】【F:app/services/admin_escrows.py†L27-L170】
2) BEFORE: “Pull proof details or review queue using `/admin/proofs/review-queue` to inspect review_mode and AI risk indicators.” → AFTER: adds explicit filters (`advisor_id`, `unassigned_only`, `sender_id`, `provider_id`, `review_mode`, `status`). Reason: review queue accepts these filters for scoped triage. Source: 【F:app/routers/admin_tools.py†L26-L56】

### Additions
1) Added playbook 4.7 covering external proof token issuance/listing/inspection/revocation with scoped endpoints and guardrails. Source: 【F:app/routers/external_proof_tokens.py†L39-L172】【F:app/services/external_proof_tokens.py†L52-L188】【F:app/services/external_proof_tokens.py†L520-L535】
2) Added command index entries for admin escrow summary and external proof token CRUD to surface operational endpoints. Source: 【F:app/routers/admin_escrows.py†L17-L41】【F:app/routers/external_proof_tokens.py†L39-L172】

### Deletions
- None (no information removed; only substitutions and additions applied).
