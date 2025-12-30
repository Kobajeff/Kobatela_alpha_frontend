# FRONTEND API GUIDE — Kobatela KCT (Backend Contract) — V2
Last updated: 2025-02-20 (Europe/Brussels)
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
| POST | `/auth/login` | Issue API key for an allowed scope | `AuthLoginRequest` (`email`, optional `scope`) | `AuthLoginResponse` (`access_token`, `token`, `token_type`, `user`) | Scope is derived from user role; rejects invalid scope with `INSUFFICIENT_SCOPE` | 【F:app/routers/auth.py†L64-L176】【F:app/schemas/auth.py†L9-L32】 |
| GET | `/auth/me` | Return user linked to API key | — | `AuthMeResponse` (`user`) | Requires scope in {sender, provider, admin} | 【F:app/routers/auth.py†L179-L198】【F:app/schemas/auth.py†L31-L32】 |

---

## 3) State Enums + Proof Status Semantics
### 3.1 Escrow, Milestone, Payment enums
| Entity | Enum/Field | Allowed values | Evidence |
| --- | --- | --- | --- |
| Escrow | `EscrowStatus` | `DRAFT`, `FUNDED`, `RELEASABLE`, `RELEASED`, `REFUNDED`, `CANCELLED` | 【F:app/models/escrow.py†L31-L39】 |
| Milestone | `MilestoneStatus` | `WAITING`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `PAYING`, `PAID` | 【F:app/models/milestone.py†L21-L29】 |
| Milestone | `MilestoneValidator` (expected validator) | `SENDER`, `PROVIDER`, `ADVISOR`, `SUPPORT` | 【F:app/models/milestone.py†L32-L55】 |
| Payment | `PaymentStatus` | `PENDING`, `SENT`, `SETTLED`, `ERROR`, `REFUNDED` | 【F:app/models/payment.py†L15-L23】 |
| Payment | `PayoutChannel` | `off_platform`, `stripe_connect` | 【F:app/models/payment.py†L25-L30】 |

### 3.2 Proof status semantics
- Proofs are created in `PENDING` status when submitted. 【F:app/services/proofs.py†L2524-L2552】
- Allowed status transitions are defined as: `PENDING → APPROVED/REJECTED`, `APPROVED → REJECTED`, `REJECTED` is terminal. 【F:app/services/state_machines.py†L152-L160】

---

## 4) Endpoint Inventory (UI-Relevant)
> All endpoints are mounted at root without a global version prefix. 【F:app/main.py†L214-L219】

### 4.1 Auth
| Method | Path | Summary | Scope | Request → Response | Notes | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/auth/login` | Login with email and receive API key | None | `AuthLoginRequest` → `AuthLoginResponse` | Scope chosen from user roles | 【F:app/routers/auth.py†L64-L176】【F:app/schemas/auth.py†L9-L32】 |
| GET | `/auth/me` | Return authenticated user | sender/provider/admin | — → `AuthMeResponse` | 404 if key not linked to a user | 【F:app/routers/auth.py†L179-L198】 |

### 4.2 Escrows (Sender/Provider UI)
| Method | Path | Summary | Scope | Request → Response | Notes | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/escrows` | List escrows (mine vs paginated) | sender/provider/support | Query params (`mine`, `status`, `sender_id`, `provider_id`, `advisor_id`, `limit`, `offset`) → `PaginatedResponse[EscrowListItem]` **or** `list[EscrowListItem]` | When `mine=true`, response is a list (no pagination wrapper). | 【F:app/routers/escrow.py†L33-L76】 |
| POST | `/escrows` | Create escrow | sender | `EscrowCreate` → `EscrowRead` |  | 【F:app/routers/escrow.py†L79-L98】【F:app/schemas/escrow.py†L22-L77】 |
| POST | `/escrows/{escrow_id}/deposit` | Deposit funds (idempotent) | sender | `EscrowDepositCreate` + `Idempotency-Key` → `EscrowRead` | Requires `Idempotency-Key` header. | 【F:app/routers/escrow.py†L101-L124】【F:app/schemas/escrow.py†L127-L129】 |
| POST | `/escrows/{escrow_id}/funding-session` | Create PSP funding session | sender/admin | — → `FundingSessionRead` | Returns PSP session data. | 【F:app/routers/escrow.py†L127-L142】 |
| POST | `/escrows/{escrow_id}/mark-delivered` | Mark delivered | sender | `EscrowActionPayload` → `EscrowRead` |  | 【F:app/routers/escrow.py†L145-L160】【F:app/schemas/escrow.py†L131-L134】 |
| POST | `/escrows/{escrow_id}/client-approve` | Sender approves | sender | `EscrowActionPayload` (optional) → `EscrowRead` |  | 【F:app/routers/escrow.py†L163-L178】 |
| POST | `/escrows/{escrow_id}/client-reject` | Sender rejects | sender | `EscrowActionPayload` (optional) → `EscrowRead` |  | 【F:app/routers/escrow.py†L181-L196】 |
| POST | `/escrows/{escrow_id}/check-deadline` | Check deadline | sender | — → `EscrowRead` |  | 【F:app/routers/escrow.py†L199-L213】 |
| GET | `/escrows/{escrow_id}` | Read escrow | sender/provider/support/admin | — → `EscrowRead` |  | 【F:app/routers/escrow.py†L216-L230】 |
| GET | `/escrows/{escrow_id}/summary` | Escrow summary (milestones/proofs/payments) | sender/provider | — → `SenderEscrowSummary` | JSON normalized for numeric fields. | 【F:app/routers/escrow.py†L233-L249】【F:app/schemas/escrow.py†L174-L178】 |
| GET | `/escrows/{escrow_id}/milestones` | List milestones (read) | sender/provider/admin/support | — → `list[MilestoneRead]` | Read-only UI view. | 【F:app/routers/escrow.py†L271-L285】 |
| GET | `/escrows/milestones/{milestone_id}` | Get milestone detail | sender/provider/admin | — → `MilestoneRead` |  | 【F:app/routers/escrow.py†L288-L303】 |
| POST | `/escrows/{escrow_id}/milestones` | **ADMIN ONLY** add milestone | admin/support | `MilestoneCreate` → `MilestoneRead` | Marked ADMIN ONLY. | 【F:app/routers/escrow.py†L252-L268】 |

### 4.3 Proof Upload + Submit + List + Decision
| Method | Path | Summary | Scope | Request → Response | Notes | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/files/proofs` | Upload proof file | sender/provider/support/admin | multipart file → `ProofFileUploadResponse` | Returns storage fields (file_id, storage_key, storage_url, sha256, etc.). | 【F:app/routers/uploads.py†L74-L162】【F:app/schemas/proof.py†L199-L212】 |
| GET | `/files/signed/{token}` | **NOT FOR UI** signed download | None (signed token) | — → raw file | Token + storage key required. | 【F:app/routers/uploads.py†L165-L217】 |
| POST | `/proofs` | Submit proof metadata | sender/provider/support/admin | `ProofCreate` → `ProofRead` | Returns proof payload (normalized numeric fields). | 【F:app/routers/proofs.py†L36-L58】【F:app/services/proofs.py†L1850-L1890】【F:app/schemas/proof.py†L31-L157】 |
| GET | `/proofs` | List proofs | sender/provider/support/admin/advisor | Query params (`escrow_id`, `milestone_id`, `status`, `type`, `review_mode`, `sender_id`, `provider_id`, `advisor_id`, `limit`, `offset`) → `PaginatedResponse[ProofDetailRead]` |  | 【F:app/routers/proofs.py†L61-L121】 |
| GET | `/proofs/{proof_id}` | Proof detail | sender/provider/support/admin/advisor | — → `ProofDetailRead` | Includes `proof_id` alias. | 【F:app/routers/proofs.py†L124-L150】【F:app/schemas/proof.py†L83-L149】 |
| POST | `/proofs/{proof_id}/decision` | Approve/reject proof | sender/support/admin | `ProofDecision` → `ProofRead` |  | 【F:app/routers/proofs.py†L153-L178】【F:app/schemas/proof.py†L151-L157】 |

### 4.4 Mandates + Merchant Suggestions (Direct Pay)
| Method | Path | Summary | Scope | Request → Response | UI Label | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/mandates` | Create mandate | sender | `UsageMandateCreate` → `UsageMandateRead` | UI | 【F:app/routers/mandates.py†L32-L41】【F:app/schemas/mandates.py†L29-L123】 |
| GET | `/mandates` | List mandates | sender/provider/support/admin | — → `list[UsageMandateRead]` | UI | 【F:app/routers/mandates.py†L44-L58】 |
| GET | `/mandates/{mandate_id}` | Mandate detail | sender/provider/support/admin | — → `UsageMandateRead` | UI | 【F:app/routers/mandates.py†L60-L74】 |
| POST | `/mandates/cleanup` | Expire old mandates | sender | — → `dict[str, int]` | **NOT FOR UI** (maintenance) | 【F:app/routers/mandates.py†L77-L85】 |
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

### 4.6 Admin/Support Routes (Payments)
| Method | Path | Summary | Scope | Request → Response | UI Label | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/payments/execute/{payment_id}` | Execute payout | admin/support | — → `PaymentRead` | **ADMIN ONLY** | 【F:app/routers/payments.py†L27-L43】 |
| GET | `/admin/payments` | List payments | admin/support | Query `status`, `escrow_id`, `limit`, `offset` → `PaginatedResponse[PaymentRead]` | **ADMIN ONLY** | 【F:app/routers/payments.py†L46-L68】 |

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
  "metadata": {"caption": "Installed water pump", "gps": "-1.947,30.058"}
}
```
`ProofCreate` schema and example. 【F:app/schemas/proof.py†L31-L80】

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
- Escrow / milestone / proof / payment domain: `ESCROW_NOT_FOUND`, `ESCROW_OVER_FUNDED`, `MILESTONE_SEQUENCE_ERROR`, `PROOF_INVALID_STATUS`, `PROOF_TYPE_MISMATCH`, `INVALID_PROOF_FILE_KIND`, `PAYMENT_ALREADY_EXECUTED`, `NOT_ESCROW_PROVIDER`, `NOT_ESCROW_SENDER`, `NOT_ESCROW_PARTICIPANT`. 【F:app/utils/error_codes.py†L10-L114】
- Proof pipeline + file upload: `UNSUPPORTED_FILE_TYPE`, `EXIF_MISSING`, `EXIF_TIMESTAMP_INVALID`, `GEOFENCE_VIOLATION`, `OCR_FAILED`, `AI_PROOF_ERROR`, `FRAUD_PIPELINE_ERROR`, `FRAUD_HIGH_RISK`. 【F:app/utils/error_codes.py†L22-L158】
- Direct Pay / mandates / merchants: `MANDATE_PAYOUT_DESTINATION_INVALID`, `DIRECT_PAY_REGISTRY_DISABLED`, `DIRECT_PAY_SUGGESTIONS_DISABLED`, `MERCHANT_REGISTRY_NOT_FOUND`, `MERCHANT_SUGGESTION_NOT_FOUND`, `MERCHANT_SUGGESTION_INVALID_STATE`, `MERCHANT_SUGGESTION_NOT_PROMOTED`, `MERCHANT_BLACKLISTED`, `MERCHANT_SUSPENDED`, `MERCHANT_MATCH_MISMATCH`, `MERCHANT_MATCH_UNKNOWN`, `MANDATE_TARGET_XOR_VIOLATION`, `BENEFICIARY_IDENTITY_REQUIRED`. 【F:app/utils/error_codes.py†L165-L239】

---

## 7) Pagination Conventions
- `PaginationParams` defines `limit` (1–100) and `offset` (>=0). 【F:app/schemas/pagination.py†L10-L15】
- `PaginatedResponse` wraps `items`, `total`, `limit`, `offset`. 【F:app/schemas/pagination.py†L17-L24】
- List endpoints using limit/offset include `/escrows`, `/proofs`, `/admin/payments`, `/alerts`, `/admin/users`, `/admin/proofs/review-queue`, `/admin/risk-snapshots`, `/admin/advisors/overview`. 【F:app/routers/escrow.py†L33-L76】【F:app/routers/proofs.py†L61-L121】【F:app/routers/payments.py†L46-L68】【F:app/routers/alerts.py†L19-L33】【F:app/routers/admin_users.py†L142-L165】【F:app/routers/admin_tools.py†L39-L108】【F:app/routers/admin_tools.py†L156-L179】【F:app/routers/admin_tools.py†L182-L193】

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
| GET | `/admin/fraud/score_comparison` | Fraud score comparison | admin/support | ADMIN ONLY | 【F:app/routers/admin_tools.py†L110-L153】 |
| GET | `/admin/risk-snapshots` | Risk snapshots | admin/support | ADMIN ONLY | 【F:app/routers/admin_tools.py†L156-L179】 |
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

### 8.2 External / public-sector flows (NOT FOR UI)
| Method | Path | Summary | Scope | UI Label | Evidence |
| --- | --- | --- | --- | --- | --- |
| POST | `/external/proofs/tokens` | Issue external proof token | sender/support/admin | NOT FOR UI | 【F:app/routers/external_proofs.py†L50-L78】 |
| POST | `/external/tokens/beneficiary` | Issue beneficiary token | sender/support/admin | NOT FOR UI | 【F:app/routers/external_proofs.py†L81-L109】 |
| POST | `/external/files/proofs` | Upload external proof file | token | NOT FOR UI | 【F:app/routers/external_proofs.py†L138-L193】 |
| POST | `/external/proofs/submit` | Submit external proof | token | NOT FOR UI | 【F:app/routers/external_proofs.py†L196-L323】 |
| GET | `/external/escrows/{escrow_id}` | External escrow summary | token | NOT FOR UI | 【F:app/routers/external_proofs.py†L326-L369】 |
| POST | `/kct_public/projects` | Create public-sector project | sender/admin + GOV/ONG user | NOT FOR UI | 【F:app/routers/kct_public.py†L24-L41】【F:app/security/__init__.py†L186-L200】 |
| POST | `/kct_public/projects/{project_id}/managers` | Add project manager | sender/admin + GOV/ONG user | NOT FOR UI | 【F:app/routers/kct_public.py†L44-L56】【F:app/security/__init__.py†L186-L200】 |
| POST | `/kct_public/projects/{project_id}/mandates` | Attach project mandate | sender/admin + GOV/ONG user | NOT FOR UI | 【F:app/routers/kct_public.py†L59-L71】【F:app/security/__init__.py†L186-L200】 |
| GET | `/kct_public/projects/{project_id}` | Project detail | sender/admin + GOV/ONG user | NOT FOR UI | 【F:app/routers/kct_public.py†L74-L82】【F:app/security/__init__.py†L186-L200】 |
| GET | `/kct_public/projects` | List projects | sender/admin + GOV/ONG user | NOT FOR UI | 【F:app/routers/kct_public.py†L85-L99】【F:app/security/__init__.py†L186-L200】 |

### 8.3 Additional sender-facing endpoints (UI OK)
| Method | Path | Summary | Scope | UI Label | Evidence |
| --- | --- | --- | --- | --- | --- |
| GET | `/sender/dashboard` | Sender dashboard | sender | UI | 【F:app/routers/sender_dashboard.py†L29-L49】 |
| GET | `/me/profile` | Get current profile | sender/provider/admin/support | UI | 【F:app/routers/user_profiles.py†L35-L46】 |
| PATCH | `/me/profile` | Update current profile | sender/provider/admin/support | UI | 【F:app/routers/user_profiles.py†L49-L61】 |
| POST | `/beneficiaries` | Create beneficiary profile | sender | UI | 【F:app/routers/beneficiaries.py†L23-L38】 |
| GET | `/beneficiaries/{beneficiary_id}` | Beneficiary detail (redacted) | sender/provider/support/admin/advisor | UI | 【F:app/routers/beneficiaries.py†L41-L54】 |
| POST | `/spend/categories` | Create spend category | admin/support | ADMIN ONLY | 【F:app/routers/spend.py†L31-L42】 |
| POST | `/spend/merchants` | Create spend merchant | admin/support | ADMIN ONLY | 【F:app/routers/spend.py†L45-L56】 |
| POST | `/spend/allow` | Allow usage | admin/support | ADMIN ONLY | 【F:app/routers/spend.py†L59-L69】 |
| POST | `/spend/purchases` | Create purchase | sender/admin | NOT FOR UI (ops-controlled) | 【F:app/routers/spend.py†L72-L86】 |
| POST | `/spend/allowed` | Add allowed payee | admin/support | ADMIN ONLY | 【F:app/routers/spend.py†L97-L115】 |
| POST | `/spend` | Spend to allowed payee | sender/admin | NOT FOR UI (ops-controlled) | 【F:app/routers/spend.py†L125-L144】 |

---

## 9) Changelog (V2)
- Rebuilt the guide to V2 structure with explicit base URL/versioning policy, auth model, enums, and endpoint inventory sourced from routers and schemas. 【F:app/main.py†L214-L219】【F:app/routers/__init__.py†L1-L63】
- Added proof status semantics from the state machine and proof submission flow. 【F:app/services/state_machines.py†L152-L160】【F:app/services/proofs.py†L2524-L2552】
- Split UI-relevant endpoints from admin/support and internal/public routes with clear UI labels. 【F:app/routers/payments.py†L27-L68】【F:app/routers/admin_tools.py†L39-L193】【F:app/routers/external_proofs.py†L50-L369】
- Updated payload examples to match Pydantic schemas (escrow, proof, mandate, merchant suggestion). 【F:app/schemas/escrow.py†L22-L58】【F:app/schemas/proof.py†L31-L212】【F:app/schemas/mandates.py†L63-L123】【F:app/schemas/merchant_suggestions.py†L14-L52】
- Documented standardized error shape, status semantics, and common error codes from the error catalog. 【F:app/utils/errors.py†L17-L44】【F:app/main.py†L228-L284】【F:app/utils/error_codes.py†L10-L239】
