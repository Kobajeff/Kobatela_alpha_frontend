# FRONTEND API GUIDE — Kobatela KCT (Backend Contract) — V2
Last updated: 2026-01-11 (Europe/Brussels)
Audience: Frontend (Next.js) + Backend maintainers
Scope (In/Out): In – canonical HTTP contracts exposed by FastAPI routers, Pydantic models consumed by UI, domain enums, error handling, pagination. Out – runtime behavior changes or undocumented endpoints.
Evidence rule: every backend claim is cited with 【F:...†Lx-Ly】.

---

## 1) Base URL + Versioning Policy
- All routers are mounted at the root path (no global `/v1` prefix) via `app.include_router(...)` calls; additional routers (`/apikeys`, `/kct_public`, `/sender`) are also mounted at root. 【F:app/main.py†L214-L219】
- Versioning policy: no explicit API version prefix is present in router mounts; any versioning must be introduced explicitly in code. 【F:app/main.py†L214-L219】

---

## 2) Auth Model (Login, `/auth/me`, Scopes)
### 2.1 Auth headers
| Mechanism | Header | Evidence |
| --- | --- | --- |
| API key | `Authorization: Bearer <token>` **or** `X-API-Key: <token>` | 【F:app/security/__init__.py†L21-L30】 |

### 2.2 Scopes
`ApiScope` values (case-insensitive aliases exist): `sender`, `provider`, `support`, `admin`, `advisor`, `pricing_admin`, `risk_admin`. 【F:app/models/api_key.py†L16-L38】

### 2.3 Login + session
| Method | Path | Purpose | Request | Response | Scope rules | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/auth/login` | Issue API key for an allowed scope | `AuthLoginRequest` (`email`, optional `scope`) | `AuthLoginResponse` (`access_token`, `token`, `token_type`, `user`) | Scope is derived from the user’s allowed scopes; rejects invalid scope with `INSUFFICIENT_SCOPE`. | 【F:app/routers/auth.py†L64-L176】【F:app/schemas/auth.py†L9-L32】 |
| GET | `/auth/me` | Return user linked to API key | — | `AuthMeResponse` (`user`) | Requires an authenticated API key; scope is not enforced. | 【F:app/routers/auth.py†L179-L198】【F:app/security/__init__.py†L118-L124】 |

---

## 3) State Enums + Proof Status Semantics
### 3.1 Escrow, Milestone, Payment enums
| Entity | Enum/Field | Allowed values | Evidence |
| --- | --- | --- | --- |
| Escrow | `EscrowStatus` | `DRAFT`, `ACTIVE`, `FUNDED`, `RELEASABLE`, `RELEASED`, `REFUNDED`, `CANCELLED` | 【F:app/models/escrow.py†L31-L40】 |
| Milestone | `MilestoneStatus` | `WAITING`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `PAYING`, `PAID` | 【F:app/models/milestone.py†L21-L29】 |
| Milestone | `MilestoneValidator` (expected validator) | `SENDER`, `PROVIDER`, `ADVISOR`, `SUPPORT` | 【F:app/models/milestone.py†L32-L55】 |
| Payment | `PaymentStatus` | `PENDING`, `SENT`, `SETTLED`, `ERROR`, `REFUNDED` | 【F:app/models/payment.py†L15-L23】 |
| Payment | `PayoutChannel` | `off_platform`, `stripe_connect` | 【F:app/models/payment.py†L25-L30】 |

Typical escrow lifecycle for UI flows: `DRAFT → ACTIVE → FUNDED → RELEASABLE → RELEASED` (funds released), with cancellation/refund transitions enforced by the escrow state machine; payout completion is represented by the Milestone `PAID` status (escrow status never becomes `PAID`).【F:app/services/state_machines.py†L53-L116】【F:app/models/escrow.py†L31-L40】

### 3.2 Proof status semantics
- Proofs are created in `PENDING` status when submitted. 【F:app/services/proofs.py†L2524-L2552】
- Allowed status transitions are defined as: `PENDING → APPROVED/REJECTED`, `APPROVED → REJECTED`, `REJECTED` is terminal. 【F:app/services/state_machines.py†L152-L160】

---

## 4) Endpoint Inventory (UI-Relevant)
> All endpoints are mounted at root without a global version prefix. 【F:app/main.py†L214-L219】

### 4.1 Auth
| Method | Path | Summary | Scope | Request → Response | Notes | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/auth/login` | Login with email and receive API key | None | `AuthLoginRequest` → `AuthLoginResponse` | Scope chosen from the user’s allowed scopes | 【F:app/routers/auth.py†L64-L176】【F:app/schemas/auth.py†L9-L32】 |
| GET | `/auth/me` | Return authenticated user | any authenticated user | — → `AuthMeResponse` | 404 if key not linked to a user | 【F:app/routers/auth.py†L179-L198】 |

### 4.2 Escrows (Sender/Provider UI)
| Method | Path | Summary | Scope | Request → Response | Notes | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/escrows` | List escrows (mine vs paginated) | sender/provider/support | Query params (`mine`, `status`, `sender_id`, `provider_id`, `advisor_id`, `limit`, `offset`) → `PaginatedResponse[EscrowListItem]` **or** `list[EscrowListItem]` | When `mine=true`, response is a list (no pagination wrapper). | 【F:app/routers/escrow.py†L33-L76】 |
| POST | `/escrows` | Create escrow | sender | `EscrowCreate` → `EscrowRead` |  | 【F:app/routers/escrow.py†L79-L98】【F:app/schemas/escrow.py†L22-L77】 |
| POST | `/escrows/{escrow_id}/activate` | Activate escrow | sender | `EscrowActivateRequest` (optional) → `EscrowRead` | Draft-only activation to lock configuration before funding. | 【F:app/routers/escrow.py†L100-L116】【F:app/schemas/escrow.py†L135-L139】 |
| POST | `/escrows/{escrow_id}/deposit` | Deposit funds (idempotent) | sender | `EscrowDepositCreate` + `Idempotency-Key` → `EscrowRead` | Requires `Idempotency-Key` header. | 【F:app/routers/escrow.py†L119-L140】【F:app/schemas/escrow.py†L127-L129】 |
| POST | `/escrows/{escrow_id}/funding-session` | Create PSP funding session | sender/admin | — → `FundingSessionRead` | Returns PSP session data. | 【F:app/routers/escrow.py†L127-L142】 |
| POST | `/escrows/{escrow_id}/mark-delivered` | Mark delivered | sender | `EscrowActionPayload` → `EscrowRead` |  | 【F:app/routers/escrow.py†L145-L160】【F:app/schemas/escrow.py†L131-L134】 |
| POST | `/escrows/{escrow_id}/client-approve` | Sender approves | sender | `EscrowActionPayload` (optional) → `EscrowRead` |  | 【F:app/routers/escrow.py†L163-L178】 |
| POST | `/escrows/{escrow_id}/client-reject` | Sender rejects | sender | `EscrowActionPayload` (optional) → `EscrowRead` |  | 【F:app/routers/escrow.py†L181-L196】 |
| POST | `/escrows/{escrow_id}/check-deadline` | Check deadline | sender | — → `EscrowRead` |  | 【F:app/routers/escrow.py†L199-L213】 |
| GET | `/escrows/{escrow_id}` | Read escrow | sender/provider/support/admin | — → `EscrowRead` |  | 【F:app/routers/escrow.py†L216-L230】 |
| GET | `/escrows/{escrow_id}/summary` | Escrow summary (milestones/proofs/payments) | sender/provider | — → `SenderEscrowSummary` | JSON normalized for numeric fields. | 【F:app/routers/escrow.py†L233-L249】【F:app/schemas/escrow.py†L174-L178】 |
| GET | `/provider/inbox/escrows` | Provider inbox (relationship-based) | authenticated user | Query (`limit`, `offset`) → `ProviderInboxResponse` | Returns non-draft escrows linked to the provider relation with `current_submittable_milestone_idx` and `required_proof_kinds` derived from milestones (no proof requirements payload). | 【F:app/routers/provider_inbox.py†L16-L36】【F:app/schemas/provider_inbox.py†L8-L29】【F:app/services/provider_inbox.py†L32-L88】 |
| GET | `/escrows/{escrow_id}/milestones` | List milestones (read) | sender/provider/admin/support | — → `list[MilestoneProviderRead]` | Participant-safe milestone list with proof requirements removed. | 【F:app/routers/escrow.py†L271-L285】【F:app/schemas/milestone.py†L8-L69】 |
| GET | `/escrows/milestones/{milestone_id}` | Get milestone detail | sender/provider/admin | — → `MilestoneRead` |  | 【F:app/routers/escrow.py†L288-L303】 |
| POST | `/escrows/{escrow_id}/milestones` | Add milestone | admin/support/sender (sender limited to own draft escrows) | `MilestoneCreate` → `MilestoneRead` | Sender can only add milestones before funding; currency must match and sums cannot exceed escrow total. | 【F:app/routers/escrow.py†L252-L268】【F:app/services/escrow.py†L965-L1050】 |

#### Block 1 — Escrow (Sender Core) field-level contract
##### EscrowCreate (request body)
- `client_id` (int, nullable; alias `sender_user_id` accepted)  
- `provider_user_id` (int, nullable; alias `provider_id` accepted)  
- `beneficiary` (BeneficiaryCreate, nullable)  
- `amount_total` (string decimal)  
- `currency` (string, `"USD"` or `"EUR"`)  
- `release_conditions` (object)  
- `deadline_at` (string, ISO 8601 datetime)  
- `domain` (string, nullable; `"private" | "public" | "aid"`)  
- `payment_mode` (string enum `"MILESTONE" | "DIRECT_PAY"`, default `"MILESTONE"`)  

##### EscrowRead (response)
- `id` (int)  
- `client_id` (int)  
- `provider_user_id` (int, nullable) — null until an on-platform provider is linked.  
- `provider_id` (int, nullable) — alias of `provider_user_id` (same nullability).  
- `beneficiary_id` (int, nullable) — null when no beneficiary profile is attached.  
- `beneficiary_profile` (BeneficiaryProfilePublicRead | BeneficiaryProfileAdminRead, nullable) — null when missing; non-ops viewers receive masked public fields.  
- `merchant_registry_id` (string UUID, nullable) — null when no registry linkage exists.  
- `merchant_suggestion_id` (string UUID, nullable) — null when no suggestion linkage exists.  
- `amount_total` (string decimal)  
- `currency` (string)  
- `status` (string enum `EscrowStatus`)  
- `domain` (string enum `EscrowDomain`)  
- `payment_mode` (string enum `"MILESTONE" | "DIRECT_PAY"`)  
- `release_conditions_json` (object)  
- `deadline_at` (string, ISO 8601 datetime)  

Nullability notes (EscrowRead):
- `provider_user_id`/`provider_id` are null until a provider is linked to the escrow relationship.【F:app/schemas/escrow.py†L49-L83】  
- `beneficiary_id`/`beneficiary_profile` are null when no beneficiary profile is attached.【F:app/schemas/escrow.py†L53-L74】  
- `merchant_registry_id`/`merchant_suggestion_id` are null when no merchant linkage exists.【F:app/schemas/escrow.py†L55-L74】  

##### EscrowListItem (response item)
- `id` (int)  
- `status` (string enum `EscrowStatus`)  
- `amount_total` (string decimal)  
- `currency` (string)  
- `deadline_at` (string, ISO 8601 datetime)  
- `created_at` (string, ISO 8601 datetime)  
- `payment_mode` (string enum `"MILESTONE" | "DIRECT_PAY"`)  
- `provider_user_id` (int, nullable) — null until an on-platform provider is linked.  
- `provider_id` (int, nullable) — alias of `provider_user_id` (same nullability).  
- `beneficiary_id` (int, nullable) — null when no beneficiary profile is attached.  

##### EscrowDepositCreate (request body)
- `amount` (string decimal)  

##### EscrowActionPayload (request body)
- `note` (string, nullable)  
- `proof_url` (string, nullable)  

##### EscrowActivateRequest (request body)
- `note` (string, nullable)  

##### FundingSessionRead (response body)
- `funding_id` (int)  
- `client_secret` (string)  

##### SenderEscrowSummary (response body)
- `escrow` (EscrowRead)  
- `milestones` (array of MilestoneProviderRead)  
- `proofs` (array of ProofRead)  
- `payments` (array of PaymentRead)  
- `viewer_context` (EscrowViewerContextRead)  
- `current_submittable_milestone_id` (int, nullable) — null when no milestone is open for submission.  
- `current_submittable_milestone_idx` (int, nullable) — null when no milestone is open for submission.  
- `pricing_summary` (PricingSummaryRead)  

`pricing_summary` details:
- `currency`, `amount_total`, `pricing_flags`, `last_computed_at` (nullable until pricing is computed).【F:app/schemas/escrow.py†L204-L228】  
- `milestones[]` items expose `milestone_idx`, `amount`, `currency`, `proof_kind`, `status`, `pricing_flags`.【F:app/schemas/escrow.py†L184-L214】  

`viewer_context` details (relationship-based access, not global labels):
- `relation` is one of `SENDER`, `PROVIDER`, `PARTICIPANT`, `OPS`, `UNKNOWN`. It is derived from the escrow linkage, or set to `OPS` for ops viewers and `UNKNOWN` when no escrow relation is present.  
- `is_sender`, `is_provider`, `is_participant`, `viewer_user_id` are always present to drive UI gating.  
- `allowed_actions` is the backend source of truth for CTAs and always includes `VIEW_SUMMARY`, `VIEW_MILESTONES`, `VIEW_PROOFS`. The escrow sender relation may additionally receive `ACTIVATE_ESCROW` (draft + milestones + valid fraud config), `FUND_ESCROW` (funding allowed by invariants), `EDIT_MILESTONES` (draft with no proofs/payments), `EDIT_FRAUD_CONFIG_ESCROW` (always), `EDIT_FRAUD_CONFIG_MILESTONE` (current WAITING milestone with no proof), `MARK_DELIVERED` (escrow FUNDED), `CLIENT_APPROVE` (status in DRAFT/ACTIVE/FUNDED/RELEASABLE and requires_proof is false or any proof submitted), `CLIENT_REJECT` (non-terminal), `CHECK_DEADLINE` (FUNDED + past deadline), `DECIDE_PROOF` (pending proof with sender validator and non-advisor/support review_mode), and `REQUEST_ADVISOR_REVIEW` (any pending proof). The escrow provider relation may receive `UPLOAD_PROOF_FILE` when escrow status is ACTIVE/FUNDED and a current milestone is submittable, and `SUBMIT_PROOF` when no active proof exists for that milestone (`PENDING`/`UNDER_REVIEW`). `OPS`/`UNKNOWN` relations keep only the view actions.【F:app/schemas/escrow.py†L182-L203】【F:app/protocol/policies/escrow_allowed_actions.py†L15-L204】【F:app/services/escrow.py†L1760-L1837】

Nullability notes (SenderEscrowSummary):
- `current_submittable_milestone_id`/`current_submittable_milestone_idx` are null when no milestone is open for submission.【F:app/schemas/escrow.py†L230-L236】  
- `pricing_summary.last_computed_at` can be null when pricing has not been computed for the escrow yet.【F:app/schemas/escrow.py†L204-L228】  

Redaction rules per viewer relation (summary + list endpoints):
- Milestone `proof_requirements` are nulled for `PROVIDER`/`PARTICIPANT` relations; `SENDER` and `OPS` views retain requirements when present.  
- Proof AI scores (`ai_score`, `ai_score_ml`, `ai_risk_level_ml`, `ai_explanation`) are cleared for any non-OPS viewer mode (`PARTICIPANT` or `PUBLIC`); `ai_summary_text` is exposed only for escrow sender relations or ops viewers.  
- Proof metadata is stripped of payout rails and internal analytics/pricing for `PARTICIPANT`/`PUBLIC` viewer modes; advisor views keep limited analytics (`pricing_features`, `price_reference`, `risk_decision`) while still removing payout rails.  
- Payments redact `psp_ref` and `idempotency_key` for non-OPS viewer modes (and for any non-admin/support viewer when no viewer mode is supplied).  
These redactions are applied before returning summary payloads to the frontend.【F:app/utils/redaction.py†L203-L401】【F:app/protocol/policies/ai_exposure_policy.py†L90-L132】【F:app/services/escrow.py†L1683-L1700】

Provider inbox response details (`/provider/inbox/escrows`):
- `ProviderInboxResponse`: `items`, `total`, `limit`, `offset`.  
- Each `ProviderInboxItemRead` includes `escrow_id`, `escrow_status`, `sender_display`, `amount_total`, `currency`, `deadline_at`, `current_submittable_milestone_idx` (nullable when no milestone is open), `required_proof_kinds`, `last_update_at`.【F:app/schemas/provider_inbox.py†L10-L26】

### 4.3 Proof Upload + Submit + List + Decision
| Method | Path | Summary | Scope | Request → Response | Notes | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/files/proofs` | Upload proof file | sender/provider/support/admin | multipart file → `ProofFileUploadResponse` | Returns storage fields (file_id, storage_key, storage_url, sha256, etc.). | 【F:app/routers/uploads.py†L74-L162】【F:app/schemas/proof.py†L199-L212】 |
| GET | `/files/signed/{token}` | **NOT FOR UI** signed download | None (signed token) | — → raw file | Requires `key` query param; returns bytes (no JSON). `Content-Type` uses resolved content_type or key extension (fallback `application/octet-stream`). `Content-Disposition` is set only when the signed token resolution marks disposition as attachment. | 【F:app/routers/uploads.py†L165-L207】 |
| POST | `/proofs` | Submit proof metadata | sender/provider/support/admin | `ProofCreate` → `ProofRead` | Returns proof payload (normalized numeric fields). | 【F:app/routers/proofs.py†L36-L58】【F:app/services/proofs.py†L1850-L1890】【F:app/schemas/proof.py†L31-L157】 |
| GET | `/proofs` | List proofs | sender/provider/support/admin/advisor | Query params (`escrow_id`, `milestone_id`, `status`, `type`, `review_mode`, `sender_id`, `provider_id`, `advisor_id`, `limit`, `offset`) → `PaginatedResponse[ProofDetailRead]` |  | 【F:app/routers/proofs.py†L61-L121】 |
| GET | `/proofs/{proof_id}` | Proof detail | sender/provider/support/admin/advisor | — → `ProofDetailRead` | Includes `proof_id` alias. | 【F:app/routers/proofs.py†L124-L150】【F:app/schemas/proof.py†L83-L149】 |
| GET | `/proofs/{proof_id}/risk_summary` | Proof risk summary | sender/provider (user scope) | — → `ProofRiskSummaryRead` | Client-safe fraud risk level + flags; no admin-only details. | 【F:app/routers/proofs.py†L124-L166】【F:app/schemas/proof.py†L155-L179】 |
| POST | `/proofs/{proof_id}/decision` | Approve/reject proof | sender/support/admin | `ProofDecision` → `ProofRead` |  | 【F:app/routers/proofs.py†L153-L178】【F:app/schemas/proof.py†L151-L157】 |

ProofRead/ProofDetailRead nullability notes (for UI rendering):
- `storage_key` can be null when a proof was created with legacy data or when only a URL is stored; use `storage_url` + `sha256` as the canonical download reference.  
- `metadata` is nullable when no metadata was provided or when redaction removes sensitive subtrees for the current viewer relation.  
- `ai_*` fields (`ai_score`, `ai_score_ml`, `ai_risk_level_ml`, `ai_explanation`, `ai_flags`, `ai_checked_at`, `ai_reviewed_at`, `ai_reviewed_by`) are nullable until the AI pipeline runs and are also nulled for non-OPS relations.  
- `ai_summary_text` is nullable and only present for `SENDER`/`OPS` relations.  
- `invoice_total_amount`/`invoice_currency` are nullable for non-invoice proofs or before invoice extraction completes.  
- `review_mode`/`advisor_profile_id` are nullable until a review path is set or an advisor is attached.  
- `payout_eligible`/`payout_blocked_reasons` are nullable because they are only present on `ProofDetailRead` and depend on payout gating evaluation.  
All fields above follow the backend schemas and redaction policies; do not infer values client-side.【F:app/schemas/proof.py†L83-L189】【F:app/utils/redaction.py†L203-L401】【F:app/protocol/policies/ai_exposure_policy.py†L90-L132】

### 4.4 Mandates + Merchant Suggestions (Direct Pay)
| Method | Path | Summary | Scope | Request → Response | UI Label | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/mandates` | Create mandate | sender | `UsageMandateCreate` → `UsageMandateRead` | UI | 【F:app/routers/mandates.py†L32-L41】【F:app/schemas/mandates.py†L29-L123】 |
| GET | `/mandates` | List mandates | sender/provider/support/admin | — → `list[UsageMandateRead]` | UI | 【F:app/routers/mandates.py†L44-L58】 |
| GET | `/mandates/{mandate_id}` | Mandate detail | sender/provider/support/admin | — → `UsageMandateRead` | UI | 【F:app/routers/mandates.py†L60-L74】 |
| POST | `/mandates/cleanup` | Expire old mandates | sender | — → `dict[str, int]` | **NOT FOR UI** (maintenance) | 【F:app/routers/mandates.py†L77-L85】 |
| GET | `/merchants/registry` | List merchant registry | authenticated user | Query (`limit`, `offset`, `country_code`, `q`) → `PaginatedResponse[MerchantRegistryListItemRead]` | Results are paginated; filter by country or name substring. | 【F:app/routers/merchant_registry.py†L38-L74】【F:app/schemas/merchants_registry.py†L15-L49】【F:app/schemas/pagination.py†L6-L21】 |
| GET | `/merchants/registry/{registry_id}` | Merchant registry detail | authenticated user | — → `MerchantRegistryRead` | 404 `MERCHANT_REGISTRY_NOT_FOUND` if missing. | 【F:app/routers/merchant_registry.py†L77-L91】【F:app/schemas/merchants_registry.py†L31-L49】 |
| POST | `/merchants/registry` | Create merchant registry entry | admin/support | `MerchantRegistryCreate` → `MerchantRegistryRead` | **ADMIN ONLY** | 【F:app/routers/merchant_registry.py†L22-L35】【F:app/schemas/merchants_registry.py†L52-L104】 |
| POST | `/merchant-suggestions` | Create merchant suggestion | sender | `MerchantSuggestionCreate` → `MerchantSuggestionRead` | UI | 【F:app/routers/merchant_suggestions.py†L20-L30】【F:app/schemas/merchant_suggestions.py†L14-L52】 |
| GET | `/merchant-suggestions` | List my suggestions | sender | — → `list[MerchantSuggestionRead]` | UI | 【F:app/routers/merchant_suggestions.py†L32-L40】 |
| GET | `/merchant-suggestions/{suggestion_id}` | Suggestion detail | sender | — → `MerchantSuggestionRead` | UI | 【F:app/routers/merchant_suggestions.py†L43-L63】 |
| GET | `/admin/merchant-suggestions` | List suggestions (admin/support) | admin/support | — → `list[MerchantSuggestionRead]` | **ADMIN ONLY** | 【F:app/routers/admin_merchant_suggestions.py†L22-L45】 |
| POST | `/admin/merchant-suggestions/{suggestion_id}/approve` | Approve suggestion | admin/support | `MerchantSuggestionAdminUpdate` → `MerchantSuggestionRead` | **ADMIN ONLY** | 【F:app/routers/admin_merchant_suggestions.py†L48-L66】 |
| POST | `/admin/merchant-suggestions/{suggestion_id}/reject` | Reject suggestion | admin/support | `MerchantSuggestionAdminUpdate` → `MerchantSuggestionRead` | **ADMIN ONLY** | 【F:app/routers/admin_merchant_suggestions.py†L69-L87】 |
| POST | `/admin/merchant-suggestions/{suggestion_id}/promote` | Promote suggestion | admin/support | `MerchantSuggestionPromote` → `MerchantSuggestionRead` | **ADMIN ONLY** | 【F:app/routers/admin_merchant_suggestions.py†L90-L102】 |

Direct Pay enums for UI display:
- `PayoutDestinationType`: `BENEFICIARY_PROVIDER`, `MERCHANT`. 【F:app/models/direct_pay.py†L14-L19】
- `MerchantSuggestionStatus`: `PENDING`, `APPROVED`, `REJECTED`. 【F:app/models/direct_pay.py†L21-L26】
- `MerchantMatchStatus`: `MATCHED`, `MISMATCHED`, `UNKNOWN`, `PENDING`. 【F:app/models/direct_pay.py†L29-L35】

### 4.5 Advisor Routes (UI)
| Method | Path | Summary | Scope | Request → Response | Notes | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/me/advisor` | Get or assign advisor for sender | sender | — → `AdvisorProfileRead` | 503 if no advisor available. | 【F:app/routers/advisors.py†L147-L164】 |
| POST | `/proofs/{proof_id}/request_advisor_review` | Request advisor review | sender | — → `ProofRead` | Proof must be `PENDING`. | 【F:app/routers/advisors.py†L167-L213】 |
| GET | `/advisor/me/profile` | Advisor profile | advisor | — → `AdvisorProfileRead` | Advisor-only scope. | 【F:app/routers/advisors.py†L216-L228】 |
| GET | `/advisor/me/proofs` | Advisor assigned proofs | advisor | Query `status` → `list[AdvisorProofItem]` | Read-only view. | 【F:app/routers/advisors.py†L231-L250】 |
| POST | `/advisor/proofs/{proof_id}/approve` | Advisor approve (blocked) | advisor | — → 403 | **NOT FOR UI** (always 403). | 【F:app/routers/advisors.py†L253-L273】 |
| POST | `/advisor/proofs/{proof_id}/reject` | Advisor reject (blocked) | advisor | — → 403 | **NOT FOR UI** (always 403). | 【F:app/routers/advisors.py†L276-L296】 |

### 4.6 Sender Routes (Escrow Milestones)
| Method | Path | Summary | Scope | Request → Response | UI Label | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/sender/escrows/{escrow_id}/milestones` | Create milestone | sender | `MilestoneCreate` → `MilestoneRead` | **SENDER ONLY** | 【F:app/routers/sender_escrow_milestones.py†L16-L39】 |
| GET | `/sender/escrows/{escrow_id}/milestones` | List milestone details | sender | — → `list[MilestoneRead]` | Sender-only, includes proof requirements | 【F:app/routers/sender_escrow_milestones.py†L42-L56】 |

### 4.7 Sender Routes (Payments)
| Method | Path | Summary | Scope | Request → Response | UI Label | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/sender/payments/{payment_id}/execute` | Execute payout as sender | authenticated user (escrow sender relation required) | — → `PaymentRead` | Requires escrow-linked sender relation; returns redacted `PaymentRead` if already executed. | 【F:app/routers/sender_payments.py†L17-L39】【F:app/services/payments.py†L324-L357】【F:app/security/context.py†L60-L97】 |
| GET | `/payments/{payment_id}` | Read payment (escrow relationship required) | authenticated user | — → `PaymentRead` | Redacts `psp_ref` and `idempotency_key` for non-ops relations. | 【F:app/routers/payments.py†L46-L74】【F:app/services/payments.py†L304-L322】【F:app/utils/redaction.py†L343-L401】 |

PaymentRead nullability notes (for UI rendering):
- `milestone_id` is nullable because payments can exist without a milestone linkage (legacy or non-milestone payouts).  
- `psp_ref` and `idempotency_key` are nullable until execution and are redacted for non-ops viewers even after execution.  
Treat nulls as “not available for this viewer/state,” and rely on refreshed reads instead of client inference.【F:app/models/payment.py†L36-L76】【F:app/schemas/payment.py†L8-L33】【F:app/utils/redaction.py†L343-L401】

### 4.8 Admin/Support Routes (Payments)
| Method | Path | Summary | Scope | Request → Response | UI Label | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/payments/execute/{payment_id}` | Execute payout | admin/support | — → `PaymentRead` | **ADMIN ONLY** | 【F:app/routers/payments.py†L27-L43】 |
| GET | `/admin/payments` | List payments | admin/support | Query `status`, `escrow_id`, `limit`, `offset` → `PaginatedResponse[PaymentRead]` | **ADMIN ONLY** | 【F:app/routers/payments.py†L46-L68】 |

### 4.9 FE3 Fraud Config + Runtime Mode
| Method | Path | Summary | Scope | Request → Response | Notes | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/admin/risk/fe3-mode` | Read FE3 runtime mode | admin/support | — → `Fe3ModeState` (`mode`, `allowed_modes`, `updated_at`, `updated_by`, `reason`) | Read-only for support; controls FE3 comparator enforcement | 【F:app/routers/admin_risk.py†L45-L96】 |
| PUT | `/admin/risk/fe3-mode` | Update FE3 runtime mode | admin | `Fe3ModeUpdateRequest` (`mode`, `reason`) → `Fe3ModeState` | Admin-only; persists reason + audit log | 【F:app/routers/admin_risk.py†L62-L96】 |
| GET | `/sender/escrows/{escrow_id}/fraud-config` | Read escrow fraud expectations | sender | — → `FraudConfigRead` (fraud_context_expectations, document_checks_expectations, updated_at/by) | Sender-only | 【F:app/routers/sender_fraud_config.py†L19-L64】 |
| PATCH | `/sender/escrows/{escrow_id}/fraud-config` | Update escrow fraud expectations | sender | `FraudConfigUpdate` (partial) → `FraudConfigRead` | Partial updates; sender-only | 【F:app/routers/sender_fraud_config.py†L40-L64】 |
| GET | `/sender/escrows/{escrow_id}/milestones/{milestone_idx}/fraud-config` | Read milestone fraud expectations | sender | — → `FraudConfigRead` | Merges escrow defaults + milestone overrides | 【F:app/routers/sender_fraud_config.py†L65-L86】 |
| PATCH | `/sender/escrows/{escrow_id}/milestones/{milestone_idx}/fraud-config` | Update milestone fraud expectations | sender | `FraudConfigUpdate` → `FraudConfigRead` | 409 `FRAUD_CONFIG_IMMUTABLE` if milestone not WAITING or proof already exists | 【F:app/routers/sender_fraud_config.py†L88-L112】【F:app/services/fraud_config.py†L254-L286】 |

Contracts (all fields optional for PATCH):
- `FraudContextExpectationUpdate`: `purpose` (invoice|invoice_photo|progress|generic|delivery|service|other), `geo.gps_required`, `geo.geofence{lat,lng,radius_m}`, `human_hints{description,supplier_name_hint,notes}`, `policy_hooks{require_exif,require_location_signal}`.【F:app/schemas/fraud_config.py†L11-L66】
- `DocumentChecksExpectationUpdate`: `expected_amount`, `expected_currency`, `amount_tolerance{type:percent|absolute,value}`, `expected_merchant_name`, `expected_merchant_country`, `expected_iban`, `expected_vat_number`, `enforce_match`, `require_observed_fields`.【F:app/schemas/fraud_config.py†L68-L100】
- Runtime behavior: configs merge (escrow → milestone) and are injected into proof fraud_context + FE3 comparisons (amount tolerance, merchant enforcement). Computed FE3 outputs (`fraud_features_*`, `comparison_bundle*`, `review_reasons`, `fraud_flags`, `fraud_hard_fail`, `risk_decision`) are stripped from requests; fraud_context accepts optional `human_hints`/`policy_hooks` and alias `fraud_context_intent`.【F:app/services/proofs.py†L197-L210】【F:app/services/proofs.py†L2732-L2876】【F:tests/test_proof_metadata_safety.py†L40-L77】

### 4.10 Admin Transactions (read-only Ops)
| Method | Path | Summary | Scope | Request → Response | Notes | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/transactions` | List transactions (paginated) | admin | Query `limit` (default 20, max 100), `offset` (default 0) → `PaginatedResponse[TransactionRead]` | Sorted by `created_at` DESC then `id` DESC for stable paging. Items expose ids, status, amount, currency, timestamps only (no PII). | 【F:app/routers/transactions.py†L72-L90】【F:app/services/transactions.py†L31-L46】【F:app/schemas/transaction.py†L13-L22】 |

--- 

## 5) Payload Examples (Copy/Paste, Schema-Accurate)
> Examples mirror Pydantic schemas; do not add fields not defined in the schema.

### Auth login
```json
{
  "email": "alice@example.com",
  "scope": "sender"
}
```
`AuthLoginRequest` fields: `email`, optional `scope`. 【F:app/schemas/auth.py†L9-L12】

### Escrow create (sender)
```json
{
  "client_id": 12,
  "provider_user_id": 34,
  "amount_total": "1500.00",
  "currency": "USD",
  "release_conditions": {
    "requires_proof": true,
    "milestones": [
      {"label": "Initial delivery", "idx": 1},
      {"label": "Final report", "idx": 2}
    ]
  },
  "deadline_at": "2024-07-15T18:00:00Z",
  "domain": "private"
}
```
`EscrowCreate` fields and example are defined in schema. 【F:app/schemas/escrow.py†L22-L58】

**Direct Pay escrow flow**
- Set `payment_mode` to `"DIRECT_PAY"` to create a no-milestone escrow.
- Direct Pay escrows must **not** include milestones in `release_conditions` or via milestone creation endpoints.
- In `"MILESTONE"` mode (default), at least one milestone is required before activation/funding; missing milestones return `ESCROW_MISSING_MILESTONES`.
- If milestones are supplied while `payment_mode="DIRECT_PAY"`, the API returns `ESCROW_MILESTONES_NOT_ALLOWED`.

### Escrow deposit (idempotent)
Header: `Idempotency-Key: pay-1024`
```json
{
  "amount": "1500.00"
}
```
`EscrowDepositCreate` accepts `amount`. 【F:app/schemas/escrow.py†L127-L129】

### Proof file upload response (after `POST /files/proofs`)
```json
{
  "file_id": "proofs/escrows/1024/9001.jpg",
  "storage_key": "proofs/escrows/1024/9001.jpg",
  "storage_url": "https://cdn.example.com/proofs/9001.jpg",
  "sha256": "f5c0c21bd2d7...",
  "content_type": "image/jpeg",
  "size_bytes": 204800,
  "escrow_id": 1024,
  "uploaded_by_role": "sender",
  "uploaded_by_user_id": 12,
  "bound": false
}
```
`ProofFileUploadResponse` fields. 【F:app/schemas/proof.py†L199-L212】

### Proof submit
```json
{
  "escrow_id": 1024,
  "milestone_idx": 1,
  "type": "PHOTO",
  "storage_key": "proofs/escrows/1024/9001.jpg",
  "storage_url": "https://cdn.example.com/proofs/9001.jpg",
  "sha256": "f5c0c21bd2d7...",
  "metadata": {
    "fraud_context": {
      "schema_version": 1,
      "purpose": "progress",
      "description": "Installed water pump",
      "expected_location": {
        "country_code": "RW",
        "city": "Kigali",
        "geo": {"lat": -1.947, "lng": 30.058, "radius_m": 150.0}
      },
      "expected_items": [{"label": "Water pump", "qty": 1}]
    },
    "gps_lat": -1.947,
    "gps_lng": 30.058,
    "source": "app"
  }
}
```
PHOTO proofs MUST include `metadata.fraud_context` with canonical keys: `country_code`, `city`, and nested `geo.lat/lng/radius_m`. Legacy aliases such as `expected_location.country`, `gps_lat`/`gps_lng` inside `expected_location`, or `expected_items.name` return 422 validation errors.
`ProofCreate` schema and example. 【F:app/schemas/proof.py†L31-L80】

### External proof upload response (beneficiary portal)
```json
{
  "storage_key": "proofs/escrows/1024/9001.jpg",
  "storage_url": "https://cdn.example.com/proofs/9001.jpg",
  "sha256": "f5c0c21bd2d7...",
  "content_type": "image/jpeg",
  "size_bytes": 204800,
  "escrow_id": 1024,
  "milestone_idx": 1
}
```
`ExternalProofUploadResponse` example. Uploads accept `image/jpeg`, `image/png`, or `application/pdf` and are capped at 5 MB (images) or 10 MB (PDF) before storage. 【F:app/schemas/external_proofs.py†L35-L55】【F:app/routers/external_proofs.py†L114-L169】【F:app/config.py†L77-L87】

### External proof submit (beneficiary portal)
```json
{
  "type": "PHOTO",
  "storage_key": "proofs/escrows/1024/9001.jpg",
  "storage_url": "https://cdn.example.com/proofs/9001.jpg",
  "sha256": "f5c0c21bd2d7...",
  "metadata": {"note": "External beneficiary upload"}
}
```
```json
{
  "proof_id": 9001,
  "status": "PENDING",
  "escrow_id": 1024,
  "milestone_idx": 1,
  "created_at": "2024-07-10T17:30:00Z"
}
```
`ExternalProofSubmit` and `ExternalProofSubmitResponse` examples. `escrow_id` and `milestone_idx` can be omitted because the token already scopes them. 【F:app/schemas/external_proofs.py†L58-L120】【F:app/routers/external_proofs.py†L196-L276】

### External escrow summary (beneficiary portal)
```json
{
  "escrow_id": 1024,
  "status": "FUNDED",
  "currency": "USD",
  "amount_total": "1500.00",
  "milestones": [
    {
      "milestone_idx": 1,
      "label": "Initial delivery",
      "status": "PENDING_REVIEW",
      "proof_kind": "PHOTO",
      "amount": "500.00"
    }
  ]
}
```
`ExternalEscrowSummary` example. Fetch via `/external/escrows/summary` with the token header; `/external/escrows/{escrow_id}` remains as a backward-compatible path variant. 【F:app/schemas/external_proofs.py†L123-L158】【F:app/routers/external_proofs.py†L318-L389】
External summaries are intentionally redacted: they expose escrow amounts/status and milestone summaries only (no user identities or payout details).【F:app/schemas/external_proofs.py†L123-L182】

### External proof status (beneficiary portal)
```json
{
  "proof_id": 9001,
  "status": "PENDING",
  "escrow_id": 1024,
  "milestone_idx": 1,
  "terminal": false,
  "submitted_at": "2024-07-10T17:30:00Z",
  "reviewed_at": null
}
```
`ExternalProofStatusResponse` example. `terminal` becomes true once status reaches `APPROVED` or `REJECTED`; poll with token + proof_id. 【F:app/schemas/external_proofs.py†L120-L138】【F:app/routers/external_proofs.py†L392-L430】

### Proof decision
```json
{
  "decision": "approve",
  "note": "OK for payout"
}
```
`ProofDecision` accepts `decision` (approve/approved/reject/rejected) and optional `note`. 【F:app/schemas/proof.py†L151-L157】

### Usage mandate (Direct Pay example)
```json
{
  "beneficiary_id": 34,
  "total_amount": "500.00",
  "currency": "USD",
  "expires_at": "2024-08-01T00:00:00Z",
  "payout_destination_type": "MERCHANT",
  "merchant_registry_id": "c4f9b6f0-2f2f-4cbf-9e47-0a8c61d2c1b4"
}
```
`UsageMandateCreate` supports direct-pay fields (`payout_destination_type`, `merchant_registry_id`, `merchant_suggestion`). 【F:app/schemas/mandates.py†L63-L77】

### Merchant suggestion (sender)
```json
{
  "name": "Sample Merchant",
  "country_code": "FR"
}
```
`MerchantSuggestionCreate` fields. 【F:app/schemas/merchant_suggestions.py†L14-L27】

---

## 6) Error Handling Doctrine (Frontend Rules)
### 6.1 Standard error response shape
- `error_response(...)` returns `{ "error": { "code", "message", "context"?, "details"?, "field_errors"? } }`. 【F:app/utils/errors.py†L17-L44】
- HTTPException handler wraps error payloads as `{ "error": { ... }, "detail": ... }` when `detail` is a dict. 【F:app/main.py†L228-L263】

### 6.2 HTTP status behavior
| Status | Typical cause in KCT | Evidence |
| --- | --- | --- |
| 401 | Missing/invalid API key (`NO_API_KEY`, `UNAUTHORIZED`) | 【F:app/security/__init__.py†L33-L113】 |
| 403 | Scope mismatch (`INSUFFICIENT_SCOPE`) or advisor-only guard | 【F:app/security/__init__.py†L136-L155】【F:app/security/__init__.py†L169-L181】 |
| 409 | Conflict (e.g., proof already pending) | 【F:app/services/proofs.py†L2501-L2522】 |
| 422 | Validation errors (`VALIDATION_ERROR`, file size/type checks) | 【F:app/main.py†L267-L284】【F:app/routers/uploads.py†L49-L70】 |

### 6.3 Common error codes the UI should map
- Auth / scope: `INVALID_CREDENTIALS`, `INSUFFICIENT_SCOPE`, `USER_NOT_FOUND`, `NO_API_KEY`, `UNAUTHORIZED`. 【F:app/routers/auth.py†L133-L196】【F:app/security/__init__.py†L33-L113】
- Escrow / milestone / proof / payment domain: `ESCROW_NOT_FOUND`, `ESCROW_OVER_FUNDED`, `ESCROW_MISSING_MILESTONES`, `ESCROW_MILESTONES_NOT_ALLOWED`, `MILESTONE_SEQUENCE_ERROR`, `PROOF_INVALID_STATUS`, `PROOF_TYPE_MISMATCH`, `INVALID_PROOF_FILE_KIND`, `PAYMENT_ALREADY_EXECUTED`, `NOT_ESCROW_PROVIDER`, `NOT_ESCROW_SENDER`, `NOT_ESCROW_PARTICIPANT`. 【F:app/utils/error_codes.py†L10-L120】
- Proof pipeline + file upload: `UNSUPPORTED_FILE_TYPE`, `EXIF_MISSING`, `EXIF_TIMESTAMP_INVALID`, `GEOFENCE_VIOLATION`, `OCR_FAILED`, `AI_PROOF_ERROR`, `FRAUD_PIPELINE_ERROR`, `FRAUD_HIGH_RISK`. 【F:app/utils/error_codes.py†L22-L158】
- Direct Pay / mandates / merchants: `MANDATE_PAYOUT_DESTINATION_INVALID`, `DIRECT_PAY_REGISTRY_DISABLED`, `DIRECT_PAY_SUGGESTIONS_DISABLED`, `MERCHANT_REGISTRY_NOT_FOUND`, `MERCHANT_SUGGESTION_NOT_FOUND`, `MERCHANT_SUGGESTION_INVALID_STATE`, `MERCHANT_SUGGESTION_NOT_PROMOTED`, `MERCHANT_BLACKLISTED`, `MERCHANT_SUSPENDED`, `MERCHANT_MATCH_MISMATCH`, `MERCHANT_MATCH_UNKNOWN`, `MANDATE_TARGET_XOR_VIOLATION`, `BENEFICIARY_IDENTITY_REQUIRED`. 【F:app/utils/error_codes.py†L165-L239】

---

## 7) Pagination Conventions
- `PaginationParams` defines `limit` (1–100) and `offset` (>=0). 【F:app/schemas/pagination.py†L10-L15】
- `PaginatedResponse` wraps `items`, `total`, `limit`, `offset`. 【F:app/schemas/pagination.py†L17-L24】
- List endpoints using limit/offset include `/escrows`, `/proofs`, `/admin/payments`, `/alerts`, `/admin/users`, `/admin/proofs/review-queue`, `/admin/risk-snapshots`, `/admin/advisors/overview`. 【F:app/routers/escrow.py†L33-L76】【F:app/routers/proofs.py†L61-L121】【F:app/routers/payments.py†L46-L68】【F:app/routers/alerts.py†L19-L33】【F:app/routers/admin_users.py†L142-L165】【F:app/routers/admin_tools.py†L39-L108】【F:app/routers/admin_tools.py†L156-L193】【F:app/routers/admin_tools.py†L182-L193】

---

## 8) Other Mounted Endpoints (NOT FOR UI / ADMIN ONLY)
> These routes are mounted and must be documented. If the UI needs any of them, flag with backend before using.

### 8.1 Admin/Support-only or internal
| Method | Path | Summary | Scope | UI Label | Evidence |
| --- | --- | --- | --- | --- | --- |
| GET | `/health` | Health check | None | NOT FOR UI | 【F:app/routers/health.py†L13-L31】 |
| GET | `/alerts` | Alerts feed | admin/support | ADMIN ONLY | 【F:app/routers/alerts.py†L12-L33】 |
| POST | `/users` | Create user | admin/support | ADMIN ONLY | 【F:app/routers/users.py†L32-L46】 |
| POST | `/users/{user_id}/psp/stripe/account-link` | Stripe onboarding link | admin | ADMIN ONLY | 【F:app/routers/users.py†L48-L65】 |
| POST | `/users/{user_id}/stripe/sync` | Sync Stripe status | admin/support | ADMIN ONLY | 【F:app/routers/users.py†L68-L80】 |
| POST | `/allowlist` | Add allowlist entry | admin | ADMIN ONLY | 【F:app/routers/transactions.py†L23-L35】 |
| POST | `/certified` | Add certification | admin | ADMIN ONLY | 【F:app/routers/transactions.py†L38-L50】 |
| POST | `/transactions` | Create transaction | admin | ADMIN ONLY | 【F:app/routers/transactions.py†L53-L69】 |
| GET | `/transactions/{transaction_id}` | Transaction detail | admin | ADMIN ONLY | 【F:app/routers/transactions.py†L72-L85】 |
| POST | `/admin/users` | Create admin user | admin | ADMIN ONLY | 【F:app/routers/admin_users.py†L73-L117】 |
| GET | `/admin/users` | List admin users | admin | ADMIN ONLY | 【F:app/routers/admin_users.py†L142-L165】 |
| GET | `/admin/users/{user_id}` | Admin user detail | admin | ADMIN ONLY | 【F:app/routers/admin_users.py†L168-L171】 |
| GET | `/admin/users/{user_id}/api-keys` | List user keys | admin | ADMIN ONLY | 【F:app/routers/admin_users.py†L174-L185】 |
| POST | `/admin/users/{user_id}/api-keys` | Create user key | admin | ADMIN ONLY | 【F:app/routers/admin_users.py†L188-L225】 |
| DELETE | `/admin/users/{user_id}/api-keys/{api_key_id}` | Revoke key | admin | ADMIN ONLY | 【F:app/routers/admin_users.py†L228-L240】 |
| GET | `/admin/users/{user_id}/profile` | Admin profile view | admin/support | ADMIN ONLY | 【F:app/routers/admin_users.py†L243-L258】 |
| POST | `/admin/advisors` | Create advisor profile | admin | ADMIN ONLY | 【F:app/routers/admin_advisors.py†L28-L47】 |
| GET | `/admin/advisors` | List advisors | admin | ADMIN ONLY | 【F:app/routers/admin_advisors.py†L50-L62】 |
| GET | `/admin/advisors/{advisor_id}` | Advisor detail | admin | ADMIN ONLY | 【F:app/routers/admin_advisors.py†L65-L75】 |
| PATCH | `/admin/advisors/{advisor_id}` | Update advisor | admin | ADMIN ONLY | 【F:app/routers/admin_advisors.py†L78-L119】 |
| GET | `/admin/advisors/{advisor_id}/senders` | Advisor senders | admin | ADMIN ONLY | 【F:app/routers/admin_advisors.py†L122-L151】 |
| POST | `/admin/advisors/{advisor_id}/assign-sender` | Assign sender | admin | ADMIN ONLY | 【F:app/routers/admin_advisors.py†L154-L194】 |
| GET | `/admin/settings/ai-proof` | Get AI proof flag | admin | ADMIN ONLY | 【F:app/routers/admin_settings.py†L26-L43】 |
| POST | `/admin/settings/ai-proof` | Set AI proof flag | admin | ADMIN ONLY | 【F:app/routers/admin_settings.py†L46-L63】 |
| GET | `/admin/proofs/review-queue` | Proof review queue | admin/support | ADMIN ONLY | 【F:app/routers/admin_tools.py†L39-L108】 |
| GET | `/admin/fraud/score_comparison` | Fraud score comparison | admin/support | Admin Ops (read-only, UI OK) | 【F:app/routers/admin_tools.py†L60-L104】【F:app/schemas/fraud.py†L10-L33】 |
| GET | `/admin/risk-snapshots` | Risk snapshots | admin/support | ADMIN ONLY | 【F:app/routers/admin_tools.py†L156-L193】 |
| GET | `/admin/advisors/overview` | Advisor workload | admin/support | ADMIN ONLY | 【F:app/routers/admin_tools.py†L182-L193】 |
| POST | `/admin/pricing/reference/import-csv` | Import price references | pricing_admin/risk_admin | ADMIN ONLY | 【F:app/routers/admin_pricing_reference.py†L19-L74】【F:app/security/__init__.py†L158-L166】 |
| POST | `/admin/pricing/inflation/upload-csv` | Import inflation CSV | pricing_admin/risk_admin | ADMIN ONLY | 【F:app/routers/admin_pricing_inflation.py†L76-L109】【F:app/security/__init__.py†L158-L166】 |
| GET | `/admin/pricing/inflation` | List inflation adjustments | pricing_admin/risk_admin | ADMIN ONLY | 【F:app/routers/admin_pricing_inflation.py†L112-L143】【F:app/security/__init__.py†L158-L166】 |
| POST | `/admin/pricing/inflation` | Create inflation adjustment | pricing_admin/risk_admin | ADMIN ONLY | 【F:app/routers/admin_pricing_inflation.py†L145-L178】【F:app/security/__init__.py†L158-L166】 |
| PUT | `/admin/pricing/inflation/{adjustment_id}` | Update inflation adjustment | pricing_admin/risk_admin | ADMIN ONLY | 【F:app/routers/admin_pricing_inflation.py†L181-L233】【F:app/security/__init__.py†L158-L166】 |
| DELETE | `/admin/pricing/inflation/{adjustment_id}` | Delete inflation adjustment | pricing_admin/risk_admin | ADMIN ONLY | 【F:app/routers/admin_pricing_inflation.py†L236-L250】【F:app/security/__init__.py†L158-L166】 |
| GET | `/apikeys` | Deprecated list | — (410) | NOT FOR UI | 【F:app/routers/apikeys.py†L51-L59】 |
| POST | `/apikeys` | Create API key | admin | ADMIN ONLY | 【F:app/routers/apikeys.py†L62-L84】 |
| GET | `/apikeys/{api_key_id}` | Get API key | admin | ADMIN ONLY | 【F:app/routers/apikeys.py†L87-L93】 |
| DELETE | `/apikeys/{api_key_id}` | Deprecated delete | — (410) | NOT FOR UI | 【F:app/routers/apikeys.py†L96-L104】 |
| GET | `/debug/stripe/account/{user_id}` | Stripe debug details | admin/support | NOT FOR UI (dev/test only) | 【F:app/routers/debug_stripe.py†L14-L32】 |
| POST | `/psp/webhook` | PSP webhook | None | NOT FOR UI | 【F:app/routers/psp.py†L14-L22】 |
| POST | `/psp/stripe/webhook` | Stripe webhook | None | NOT FOR UI | 【F:app/routers/psp.py†L25-L30】 |

#### Block 1 — Admin review queue + settings (field-level)
##### AdminProofReviewItem (response item)
- `proof_id` (int)  
- `escrow_id` (int)  
- `milestone_id` (int, nullable)  
- `status` (string)  
- `type` (string)  
- `storage_key` (string, nullable)  
- `storage_url` (string, nullable)  
- `sha256` (string, nullable)  
- `created_at` (string, ISO 8601 datetime)  
- `invoice_total_amount` (string decimal, nullable)  
- `invoice_currency` (string, nullable)  
- `ai_risk_level` (string, nullable)  
- `ai_score` (string decimal, nullable)  
- `ai_flags` (array of string, nullable)  
- `ai_explanation` (string, nullable)  
- `ai_checked_at` (string, ISO 8601 datetime, nullable)  
- `ai_reviewed_by` (string, nullable)  
- `ai_reviewed_at` (string, ISO 8601 datetime, nullable)  
- `metadata` (object, nullable)  
- `advisor` (AdvisorSummary, nullable)  
- `payout_eligible` (bool, nullable)  
- `payout_blocked_reasons` (array of string, nullable)  

##### AdvisorSummary (nested)
- `id` (int)  
- `advisor_id` (string, nullable)  
- `first_name` (string)  
- `last_name` (string)  
- `email` (string)  
- `phone` (string, nullable)  
- `country` (string, nullable)  
- `language` (string, nullable)  
- `advisor_grade` (string, nullable)  
- `advisor_review` (string decimal, nullable)  
- `sender_managed` (int, nullable)  
- `total_number_of_case_managed` (int, nullable)  

##### AdminSettingRead (response)
- `key` (string)  
- `value` (bool, nullable)  
- `effective` (bool)  

##### AdminSettingWrite (request query)
- `enabled` (bool)  

- Admin Ops (UI OK): `/admin/risk-snapshots` is read-only and paginated (`items`/`total`/`limit`/`offset`); it returns non-PII risk feature summaries (flags, buckets, presence) safe for admin/support display only.【F:app/routers/admin_tools.py†L156-L193】【F:app/schemas/risk_snapshot.py†L8-L49】【F:app/models/risk_feature_snapshot.py†L11-L34】
- Admin Ops (UI OK): `/admin/fraud/score_comparison` is read-only, requires `proof_id`, and returns a single object with `proof_id`, rule-based scores (`score`, `ai_risk_level`, `fraud_flags`), and ML scores (`model_version`, `score`, thresholds, `suggested_decision`). No beneficiary/sender PII is included; safe for admin/support dashboards.【F:app/routers/admin_tools.py†L60-L104】【F:app/schemas/fraud.py†L10-L33】

### 8.2 External / beneficiary portal flows (UI — token-based)
**Token transport (Beneficiary Portal)**
- Official: `Authorization: Bearer <external_token>` header. `X-External-Token` is accepted as an equivalent header. Query params are rejected to avoid leakage/ambiguous transport.【F:app/security/external_tokens.py†L1-L25】【F:tests/test_external_proof_tokens.py†L143-L187】
**Token issuance (frontend MUST use canonical path)**
- Canonical issuance path: `/sender/external-proof-tokens` (API key). Legacy `/external/proofs/tokens` stays mounted but is **deprecated**—frontend should migrate. Expiry bounds: 10–43,200 minutes (default 7 days). `max_uploads` defaults to 1 and must be ≥1.【F:app/routers/external_proof_tokens.py†L39-L172】【F:app/services/external_proof_tokens.py†L26-L114】

### 8.2 External Beneficiary UI endpoints (approved for UI use)
**Auth model**: `Authorization: Bearer <external_token>` is the canonical header; `X-External-Token` is accepted equivalently. Query params are rejected to avoid leakage. 【F:app/security/external_tokens.py†L1-L25】【F:tests/test_external_proof_tokens.py†L370-L412】【F:tests/test_external_proof_tokens.py†L576-L591】

**Escrow resolution**: token-only. `/external/escrows/summary` resolves escrow + milestone scope from the token; the `{escrow_id}` path variant only works when the path matches the token escrow (403 otherwise). UI should rely on the token-only summary. 【F:app/routers/external_proofs.py†L318-L389】

**Upload constraints**: allowed MIME types are `image/jpeg`, `image/png`, `application/pdf`; max 5 MB for images and 10 MB for PDFs. Violations return 422 (`UNSUPPORTED_FILE_TYPE` or `FILE_TOO_LARGE`). 【F:app/routers/external_proofs.py†L114-L182】【F:app/config.py†L73-L87】

**Status polling**: statuses are `PENDING`, `APPROVED`, `REJECTED`; `terminal` is true for the last two. Recommended polling cadence: start at 3–5 s and back off to 15 s max until `terminal=true`. 【F:app/routers/external_proofs.py†L392-L430】【F:app/services/state_machines.py†L150-L199】

| Method | Path | Auth | Request → Response | UI Notes / Common errors | Evidence |
| --- | --- | --- | --- | --- | --- |
| POST | `/sender/external-proof-tokens` | API key (sender/support/admin) | `ExternalProofTokenRequest` → `ExternalProofTokenResponse` | Canonical issuance; legacy `/external/proofs/tokens` is **deprecated**. Expiry 10–43,200 minutes, `max_uploads` ≥1 (default 1). | 【F:app/routers/external_proof_tokens.py†L39-L172】【F:app/services/external_proof_tokens.py†L26-L114】 |
| POST | `/external/files/proofs` | External token header | multipart `file` → `ExternalProofUploadResponse` | Enforces MIME/size above; 500 on storage failures. | 【F:app/routers/external_proofs.py†L114-L194】【F:app/schemas/external_proofs.py†L34-L55】 |
| POST | `/external/proofs/submit` | External token header | `ExternalProofSubmit` (escrow_id/milestone_idx optional) → `ExternalProofSubmitResponse` | 403 on escrow/milestone mismatch; 409 when token already bound; 422 when storage_url/sha256 missing. | 【F:app/routers/external_proofs.py†L196-L315】【F:app/schemas/external_proofs.py†L57-L120】 |
| GET | `/external/escrows/summary` | External token header | Header-only → `ExternalEscrowSummary` | Preferred summary endpoint; 401 on missing/invalid token. | 【F:app/routers/external_proofs.py†L318-L352】【F:app/schemas/external_proofs.py†L102-L131】 |
| GET | `/external/escrows/{escrow_id}` | External token header | Path + header → `ExternalEscrowSummary` | Backward-compatible; 403 when path escrow_id mismatches token. | 【F:app/routers/external_proofs.py†L355-L389】【F:app/schemas/external_proofs.py†L102-L131】 |
| GET | `/external/proofs/{proof_id}/status` | External token header | Path `proof_id` → `ExternalProofStatusResponse` | 404 when proof missing; `terminal` marks APPROVED/REJECTED. | 【F:app/routers/external_proofs.py†L392-L430】【F:app/schemas/external_proofs.py†L120-L138】 |

### 8.3 KCT Public (feature-flagged read-only UI)
**Auth model**: requires API key with `sender` or `admin` scope **and** a GOV/ONG user (`public_tag`); otherwise `PUBLIC_USER_NOT_FOUND` or `PUBLIC_ACCESS_FORBIDDEN` is returned. 【F:app/security/__init__.py†L186-L207】【F:app/routers/kct_public.py†L24-L99】

| Method | Path | Summary | Scope | UI Label | Evidence |
| --- | --- | --- | --- | --- | --- |
| GET | `/kct_public/projects` | List projects managed by the caller (filters: `domain`, `country`, `status`) | sender/admin + GOV/ONG | UI (read-only, feature flag) | 【F:app/routers/kct_public.py†L85-L99】【F:app/services/kct_public.py†L363-L391】 |
| GET | `/kct_public/projects/{project_id}` | Project detail + aggregated stats | sender/admin + GOV/ONG | UI (read-only, feature flag) | 【F:app/routers/kct_public.py†L74-L82】【F:app/services/kct_public.py†L355-L361】 |
| POST | `/kct_public/projects` | Create project (attaches caller as primary manager) | sender/admin + GOV/ONG | NOT FOR UI | 【F:app/routers/kct_public.py†L24-L41】【F:app/services/kct_public.py†L274-L302】 |
| POST | `/kct_public/projects/{project_id}/managers` | Add additional manager | sender/admin + GOV/ONG | NOT FOR UI | 【F:app/routers/kct_public.py†L44-L56】【F:app/services/kct_public.py†L304-L320】 |
| POST | `/kct_public/projects/{project_id}/mandates` | Link escrow mandate (domain/risk checked) | sender/admin + GOV/ONG | NOT FOR UI | 【F:app/routers/kct_public.py†L59-L71】【F:app/services/kct_public.py†L322-L352】 |

- **Pagination**: list response is a plain list (no `items/total` wrapper); filters are optional and limited to `domain`, `country`, and `status`. Results are scoped to projects where the caller is a manager and the domain is `public` or `aid`.【F:app/routers/kct_public.py†L85-L99】【F:app/services/kct_public.py†L363-L391】
- **Fields safe to render**: `GovProjectRead` includes ids/labels, location, domain, status, aggregated amounts (`total_amount`, `released_amount`, `remaining_amount`), `current_milestone`, and risk-exclusion counters; no PII is exposed. Amounts are Decimal strings; safe for UI display.【F:app/schemas/kct_public.py†L26-L41】【F:app/services/kct_public.py†L195-L271】

Example (list/detail shape):
```json
[
  {
    "id": 42,
    "label": "Water Infrastructure Upgrade",
    "project_type": "infrastructure",
    "country": "RW",
    "city": "Kigali",
    "domain": "public",
    "status": "active",
    "total_amount": "1500000.00",
    "released_amount": "250000.00",
    "remaining_amount": "1250000.00",
    "current_milestone": 2,
    "risk_excluded_escrows": 1,
    "risk_excluded_amount": "50000.00"
  }
]
```

### 8.4 Additional sender-facing endpoints (UI OK)
| Method | Path | Summary | Scope | UI Label | Evidence |
| --- | --- | --- | --- | --- | --- |
| GET | `/sender/dashboard` | Sender dashboard | sender | UI | 【F:app/routers/sender_dashboard.py†L29-L49】 |
| GET | `/me/profile` | Get current profile | sender/provider/admin/support | UI | 【F:app/routers/user_profiles.py†L35-L46】 |
| PATCH | `/me/profile` | Update current profile | sender/provider/admin/support | UI | 【F:app/routers/user_profiles.py†L49-L61】 |
| POST | `/beneficiaries` | Create beneficiary profile | sender | UI | 【F:app/routers/beneficiaries.py†L23-L38】 |
| GET | `/beneficiaries/{beneficiary_id}` | Beneficiary detail (redacted) | sender/provider/support/admin/advisor | UI | 【F:app/routers/beneficiaries.py†L41-L54】 |
| GET | `/admin/spend/allowed` | List spend allowlist | admin/support | ADMIN ONLY (ops read) | 【F:app/routers/admin_spend.py†L18-L36】 |
| POST | `/spend/categories` | Create spend category | admin/support | ADMIN ONLY | 【F:app/routers/spend.py†L31-L42】 |
| POST | `/spend/merchants` | Create spend merchant | admin/support | ADMIN ONLY | 【F:app/routers/spend.py†L45-L56】 |
| POST | `/spend/allow` | Allow usage | admin/support | ADMIN ONLY | 【F:app/routers/spend.py†L59-L69】 |
| POST | `/spend/purchases` | Create purchase | sender/admin | NOT FOR UI (ops-controlled) | 【F:app/routers/spend.py†L72-L86】 |
| POST | `/spend/allowed` | Add allowed payee | admin/support | ADMIN ONLY | 【F:app/routers/spend.py†L97-L115】 |
| POST | `/spend` | Spend to allowed payee | sender/admin | NOT FOR UI (ops-controlled) | 【F:app/routers/spend.py†L125-L144】 |

- **Admin spend allowlist read**: paginated (`limit`/`offset`) ordered by `created_at` DESC then `id` DESC; items return IDs only (`owner_id`, `merchant_id`, `category_id`, timestamps) to avoid PII exposure on ops dashboards.【F:app/routers/admin_spend.py†L18-L36】【F:app/services/spend.py†L341-L352】【F:app/schemas/spend.py†L81-L89】

---

## 9) Changelog (V2)
- Rebuilt the guide to V2 structure with explicit base URL/versioning policy, auth model, enums, and endpoint inventory sourced from routers and schemas. 【F:app/main.py†L214-L219】【F:app/routers/__init__.py†L1-L63】
- Added proof status semantics from the state machine and proof submission flow. 【F:app/services/state_machines.py†L152-L160】【F:app/services/proofs.py†L2524-L2552】
- Split UI-relevant endpoints from admin/support and internal/public routes with clear UI labels. 【F:app/routers/payments.py†L27-L68】【F:app/routers/admin_tools.py†L39-L193】【F:app/routers/external_proofs.py†L50-L369】
- Updated payload examples to match Pydantic schemas (escrow, proof, mandate, merchant suggestion). 【F:app/schemas/escrow.py†L22-L58】【F:app/schemas/proof.py†L31-L212】【F:app/schemas/mandates.py†L63-L123】【F:app/schemas/merchant_suggestions.py†L14-L52】
- Documented standardized error shape, status semantics, and common error codes from the error catalog. 【F:app/utils/errors.py†L17-L44】【F:app/main.py†L228-L284】【F:app/utils/error_codes.py†L10-L239】

---

## Change log (document sync 2025-12-30)
**Substitutions**
- BEFORE: `POST | /external/proofs/tokens | ... | Binds to escrow + milestone + beneficiary; expiry bounds enforced (422 when too short/long).`
  AFTER: `POST | /sender/external-proof-tokens | ... | Canonical issuance; legacy /external/proofs/tokens is **deprecated**. Expiry 10–43,200 minutes, max_uploads ≥1 (default 1).`
  Reason: Align with canonical issuance router and deprecate legacy path per backend routing/service behavior.
  Backend source of truth: 【F:app/routers/external_proof_tokens.py†L39-L172】【F:app/services/external_proof_tokens.py†L26-L114】
- BEFORE: `Last updated: 2025-02-20 (Europe/Brussels)`
  AFTER: `Last updated: 2025-12-30 (Europe/Brussels)`
  Reason: Mirror API_GUIDE timestamp for consistency with backend reference doc.
  Backend source of truth: 【F:docs/API_GUIDE.md†L1-L4】

**Additions**
- Added “Token issuance (frontend MUST use canonical path)” note specifying `/sender/external-proof-tokens`, legacy deprecation, expiry bounds (10–43,200 minutes, default 7 days), and `max_uploads` rules.
  Backend source of truth: 【F:app/routers/external_proof_tokens.py†L39-L172】【F:app/services/external_proof_tokens.py†L26-L114】

**Deletions**
- None.
