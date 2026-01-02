# Kobatela KCT Backend API Guide (Global Architecture) — V2
Last updated: 2025-12-30 (Europe/Brussels)

**Audience**: Frontend engineers, partner integrators, auditors, and operations/support teams.

**Scope (in)**: All FastAPI routes defined under `app/routers/**`, their request/response schemas, state machines, auth/scopes, error model, and security considerations as implemented in backend code.

**Scope (out)**: Frontend behavior, UX decisions, third-party provider SLAs, and any endpoint/behavior not present in backend code.

**Non-goals**: Introducing new endpoints or behavior, extrapolating beyond code evidence, or proposing breaking changes.

**Evidence rule**: Every backend claim is backed by code evidence in the format `【F:path†Lx-Ly】`.

**Source of truth**: Backend code (FastAPI routers, models, schemas, services, and utilities).

---

## Table of Contents
1. Overview of API Architecture
2. Authentication & Scopes
3. Contextual Role Enforcement (global rules)
4. Endpoint Inventory (FULL DETAIL)
   - Health
   - Auth
   - Users/Admin users
   - Beneficiaries
   - Mandates (SmartMandate)
   - Escrows
   - Milestones
   - Proof upload + Proof lifecycle
   - Merchants (registry + suggestions)
   - Pricing (reference + inflation)
   - Fraud Engine / Risk features (exposed vs internal)
   - Advisor review
   - Payments/Payouts
   - PSP webhooks
   - Admin tools / support operations
   - Public sector (KCT Public)
   - Spend/Usage
   - Transactions
5. Field-level schema documentation (Pydantic)
6. Invariants & Validation Rules
7. State Models
8. Error model (standard response shape + code registry)
9. Versioning & stability guarantees
10. Security considerations (PII, redaction, logging, replay/idempotency)
11. Diagrams (API surface + state machine overview)
12. API readiness checklist + score
13. Deprecations

---

## 1. Overview of API Architecture
- FastAPI mounts the aggregated router from `get_api_router()` plus standalone routers for `/apikeys`, `/kct_public`, and `/sender` at the root (no version prefix).【F:app/main.py†L201-L219】【F:app/routers/__init__.py†L33-L63】
- `get_api_router()` includes routers for health, auth, users, admin users, profiles, transactions, escrow, merchant suggestions (admin + sender), admin tools/settings, alerts, beneficiaries, mandates, spend, PSP webhooks, proofs, uploads, payments, admin advisors, admin pricing (reference + inflation), advisors, debug stripe, and external proofs.【F:app/routers/__init__.py†L4-L63】
- `admin_dashboard` and `admin_senders` router modules exist but are **not mounted** in `get_api_router()` or `app.main`. Marked as TODO/Not found for runtime exposure until mounted.【F:app/routers/admin_dashboard.py†L11-L28】【F:app/routers/admin_senders.py†L17-L62】【F:app/routers/__init__.py†L33-L63】【F:app/main.py†L214-L219】

---

## 2. Authentication & Scopes
**API key extraction**
- Keys are accepted via `Authorization: Bearer <token>` or `X-API-Key` headers.【F:app/security/__init__.py†L21-L30】

**Auth dependency behavior**
- Missing API key → `NO_API_KEY` (401). Invalid/expired key → `UNAUTHORIZED` (401). Legacy dev key is supported when enabled; otherwise `LEGACY_KEY_FORBIDDEN` (401).【F:app/security/__init__.py†L33-L113】
- `require_scope` allows admin bypass or one of the allowed scopes, otherwise `INSUFFICIENT_SCOPE` (403).【F:app/security/__init__.py†L136-L153】

**Scopes**
- API scopes: sender, provider, support, admin, advisor, pricing_admin, risk_admin (aliases preserved).【F:app/models/api_key.py†L31-L48】
- Pricing admin guard allows `pricing_admin` or `risk_admin`.【F:app/security/__init__.py†L158-L166】
- Advisor scope guard requires advisor scope only (no admin bypass).【F:app/security/__init__.py†L169-L181】
- KCT Public endpoints require a GOV/ONG user linked to the API key, or return `PUBLIC_USER_NOT_FOUND`/`PUBLIC_ACCESS_FORBIDDEN`.【F:app/security/__init__.py†L186-L207】

**Auth endpoints**
- `/auth/login` issues an API key scoped to the user’s allowed scopes (sender/provider/support/admin/advisor).【F:app/routers/auth.py†L64-L176】
- `/auth/me` returns the user tied to the API key or `USER_NOT_FOUND` if missing.【F:app/routers/auth.py†L179-L198】

---

## 3. Contextual Role Enforcement (global rules)
- Escrow context checks enforce sender/provider/participant constraints and raise standardized errors (`NOT_ESCROW_SENDER`, `NOT_ESCROW_PROVIDER`, `NOT_ESCROW_PARTICIPANT`).【F:app/security/context.py†L16-L123】【F:app/errors/domain_errors.py†L8-L38】
- Proof uploads also enforce escrow context in the upload router, using sender/provider checks when `escrow_id` is supplied.【F:app/routers/uploads.py†L110-L128】【F:app/security/context.py†L73-L97】
- Advisor endpoints enforce advisor-only access and prevent advisor decisions (`ADVISOR_CANNOT_DECIDE`).【F:app/security/__init__.py†L169-L181】【F:app/routers/advisors.py†L253-L296】

**Scopes & contextual rules summary**
- `sender`: escrow creation/funding, proof submission, advisor review requests, dashboards.【F:app/routers/escrow.py†L79-L248】【F:app/routers/proofs.py†L36-L178】【F:app/routers/advisors.py†L147-L213】
- `provider`: proof listing/reading on assigned escrows; contextual checks gate uploads via escrow validation rules.【F:app/routers/proofs.py†L61-L150】【F:app/security/context.py†L84-L97】
- `support`/`admin`: operational endpoints (payments execution, admin tools, pricing, alerts).【F:app/routers/payments.py†L20-L66】【F:app/routers/admin_tools.py†L20-L251】【F:app/routers/admin_pricing_inflation.py†L24-L266】【F:app/routers/alerts.py†L12-L40】
- `advisor`: advisor queue read-only access; decisions blocked.【F:app/routers/advisors.py†L216-L296】【F:app/security/__init__.py†L169-L181】
- `pricing_admin`/`risk_admin`: pricing import/adjustment endpoints via dedicated guard.【F:app/security/__init__.py†L158-L166】【F:app/routers/admin_pricing_reference.py†L19-L43】

---

## 4. Endpoint Inventory (FULL DETAIL)
**Legend:**
- **Auth**: `API key` indicates `require_api_key`/`require_scope` is enforced; `Public` means no API key dependency.
- **Common error codes** list only those explicitly defined in the router/security stack; if none are explicit, mark as `—`.
**Auth error baseline (API key endpoints)**: `NO_API_KEY`, `UNAUTHORIZED`, `INSUFFICIENT_SCOPE`.【F:app/security/__init__.py†L33-L153】

**Pagination convention**: endpoints returning `PaginatedResponse` use `limit` and `offset` query parameters and include `items`, `total`, `limit`, `offset` in responses.【F:app/schemas/pagination.py†L6-L21】【F:app/routers/escrow.py†L33-L76】

### Health
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
GET | /health | `healthcheck` | Public | — | — | `dict[str, object]` | 200 | — | 【F:app/routers/health.py†L13-L32】

### Auth
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
POST | /auth/login | `login` | Public | — | `AuthLoginRequest` | `AuthLoginResponse` | 200 | INVALID_CREDENTIALS, INSUFFICIENT_SCOPE | 【F:app/routers/auth.py†L133-L176】【F:app/schemas/auth.py†L9-L32】
GET | /auth/me | `auth_me` | API key | sender, provider, admin, advisor | — | `AuthMeResponse` | 200 | USER_NOT_FOUND, INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/auth.py†L179-L198】【F:app/schemas/auth.py†L31-L32】【F:app/security/__init__.py†L33-L153】

### Users/Admin users
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
POST | /users | `create_user` | API key | admin, support | `UserCreate` | `UserRead` | 201 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/users.py†L32-L45】【F:app/schemas/user.py†L7-L26】【F:app/security/__init__.py†L33-L153】
POST | /users/{user_id}/psp/stripe/account-link | `create_stripe_account_link_for_user` | API key | admin | — | `StripeAccountLinkRead` | 201 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/users.py†L48-L65】【F:app/schemas/user.py†L29-L30】【F:app/security/__init__.py†L33-L153】
POST | /users/{user_id}/stripe/sync | `sync_user_stripe_account` | API key | admin, support | — | `UserRead` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/users.py†L68-L80】【F:app/schemas/user.py†L7-L26】【F:app/security/__init__.py†L33-L153】
POST | /admin/users | `admin_create_user` | API key | admin | `AdminUserCreate` | `AdminUserCreateResponse` | 201 | INSUFFICIENT_SCOPE, ADMIN_USER_CREATION_FAILED, ADVISOR_PROFILE_CREATION_FAILED | 【F:app/routers/admin_users.py†L34-L139】
GET | /admin/users | `list_admin_users` | API key | admin | Query (limit, offset, q, role, active) | `PaginatedResponse[AdminUserListItem]` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/admin_users.py†L142-L165】【F:app/schemas/admin_users.py†L10-L17】【F:app/schemas/pagination.py†L6-L21】
GET | /admin/users/{user_id} | `get_admin_user` | API key | admin | — | `AdminUserDetailRead` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/admin_users.py†L168-L171】【F:app/schemas/admin_users.py†L20-L29】【F:app/security/__init__.py†L33-L153】
GET | /admin/users/{user_id}/api-keys | `list_admin_user_api_keys` | API key | admin | Query (active) | `list[ApiKeyRead]` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/admin_users.py†L174-L185】【F:app/schemas/apikey.py†L8-L21】【F:app/security/__init__.py†L33-L153】
POST | /admin/users/{user_id}/api-keys | `create_admin_user_api_key` | API key | admin | `AdminUserApiKeyCreate` | `AdminUserApiKeyCreateResponse` | 201 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/admin_users.py†L188-L225】【F:app/schemas/admin_users.py†L32-L58】【F:app/security/__init__.py†L33-L153】
DELETE | /admin/users/{user_id}/api-keys/{api_key_id} | `revoke_admin_user_api_key` | API key | admin | — | Empty (204) | 204 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/admin_users.py†L228-L240】【F:app/security/__init__.py†L33-L153】
GET | /admin/users/{user_id}/profile | `get_user_profile_admin` | API key | admin, support | — | `UserProfileRead` | 200 | USER_NOT_FOUND, INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/admin_users.py†L243-L262】【F:app/schemas/user_profile.py†L29-L53】【F:app/security/__init__.py†L33-L153】
GET | /me/profile | `get_my_profile` | API key | sender, provider, admin, support | — | `UserProfileRead` | 200 | USER_NOT_FOUND, INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/user_profiles.py†L35-L46】【F:app/schemas/user_profile.py†L29-L53】【F:app/security/__init__.py†L33-L153】
PATCH | /me/profile | `patch_my_profile` | API key | sender, provider, admin, support | `UserProfileUpdate` | `UserProfileRead` | 200 | USER_NOT_FOUND, INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/user_profiles.py†L49-L61】【F:app/schemas/user_profile.py†L56-L76】【F:app/security/__init__.py†L33-L153】

### Beneficiaries
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
POST | /beneficiaries | `create_beneficiary` | API key | sender | `BeneficiaryCreate` | `BeneficiaryProfilePublicRead` | 201 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/beneficiaries.py†L23-L38】【F:app/schemas/beneficiary.py†L12-L79】【F:app/security/__init__.py†L33-L153】
GET | /beneficiaries/{beneficiary_id} | `read_beneficiary` | API key | sender, provider, support, admin, advisor | — | `BeneficiaryProfilePublicRead` or `BeneficiaryProfileAdminRead` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/beneficiaries.py†L41-L54】【F:app/schemas/beneficiary.py†L160-L175】【F:app/security/__init__.py†L33-L153】

### Mandates (SmartMandate)
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
POST | /mandates | `create_mandate` | API key | sender | `UsageMandateCreate` | `UsageMandateRead` | 201 | USER_NOT_FOUND, INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/mandates.py†L32-L42】【F:app/schemas/mandates.py†L63-L131】【F:app/security/__init__.py†L33-L153】
GET | /mandates | `list_mandates` | API key | sender, provider, support, admin | Query (none) | `list[UsageMandateRead]` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/mandates.py†L44-L57】【F:app/schemas/mandates.py†L92-L131】【F:app/security/__init__.py†L33-L153】
GET | /mandates/{mandate_id} | `get_mandate` | API key | sender, provider, support, admin | — | `UsageMandateRead` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/mandates.py†L60-L74】【F:app/schemas/mandates.py†L92-L131】【F:app/security/__init__.py†L33-L153】
POST | /mandates/cleanup | `cleanup_expired_mandates` | API key | sender | — | `dict[str, int]` | 202 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/mandates.py†L77-L85】【F:app/security/__init__.py†L33-L153】

### Escrows
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
GET | /escrows | `list_escrows` | API key | sender, provider, support | Query (mine, status, sender_id, provider_id, advisor_id, limit, offset) | `PaginatedResponse[EscrowListItem]` or `list[EscrowListItem]` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/escrow.py†L33-L76】【F:app/schemas/escrow.py†L106-L124】【F:app/schemas/pagination.py†L6-L21】【F:app/security/__init__.py†L33-L153】
POST | /escrows | `create_escrow` | API key | sender | `EscrowCreate` | `EscrowRead` | 201 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/escrow.py†L79-L98】【F:app/schemas/escrow.py†L22-L104】【F:app/security/__init__.py†L33-L153】
POST | /escrows/{escrow_id}/deposit | `deposit` | API key | sender | `EscrowDepositCreate` + `Idempotency-Key` header | `EscrowRead` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/escrow.py†L101-L124】【F:app/schemas/escrow.py†L127-L128】【F:app/security/__init__.py†L33-L153】
POST | /escrows/{escrow_id}/funding-session | `create_funding_session` | API key | sender, admin | — | `FundingSessionRead` | 201 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/escrow.py†L127-L142】【F:app/schemas/funding.py†L7-L9】【F:app/security/__init__.py†L33-L153】
POST | /escrows/{escrow_id}/mark-delivered | `mark_delivered` | API key | sender | `EscrowActionPayload` | `EscrowRead` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/escrow.py†L145-L160】【F:app/schemas/escrow.py†L131-L134】【F:app/security/__init__.py†L33-L153】
POST | /escrows/{escrow_id}/client-approve | `client_approve` | API key | sender | `EscrowActionPayload` (optional) | `EscrowRead` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/escrow.py†L163-L178】【F:app/schemas/escrow.py†L131-L134】【F:app/security/__init__.py†L33-L153】
POST | /escrows/{escrow_id}/client-reject | `client_reject` | API key | sender | `EscrowActionPayload` (optional) | `EscrowRead` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/escrow.py†L181-L196】【F:app/schemas/escrow.py†L131-L134】【F:app/security/__init__.py†L33-L153】
POST | /escrows/{escrow_id}/check-deadline | `check_deadline` | API key | sender | — | `EscrowRead` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/escrow.py†L199-L213】【F:app/security/__init__.py†L33-L153】
GET | /escrows/{escrow_id} | `read_escrow` | API key | sender, provider, support, admin | — | `EscrowRead` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/escrow.py†L216-L230】【F:app/schemas/escrow.py†L61-L104】【F:app/security/__init__.py†L33-L153】
GET | /escrows/{escrow_id}/summary | `get_sender_escrow_summary` | API key | sender, provider | — | `SenderEscrowSummary` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/escrow.py†L233-L249】【F:app/schemas/escrow.py†L174-L178】【F:app/security/__init__.py†L33-L153】
GET | /admin/escrows/{escrow_id}/summary | `read_admin_escrow_summary` | API key | admin, support | Query: `proofs_limit` (default 20, max 100), `include_milestones`, `include_proofs` | `AdminEscrowSummaryRead` (escrow header, parties, milestones/proofs aggregates, amounts, generated_at) | 200 | ESCROW_NOT_FOUND, INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/admin_escrows.py†L13-L43】【F:app/services/admin_escrows.py†L80-L136】【F:app/schemas/admin_escrows.py†L8-L60】

Admin/support interfaces should rely on `/admin/escrows/{escrow_id}/summary` instead of sender/provider summary routes to avoid redaction and scope-based filtering.【F:app/routers/admin_escrows.py†L13-L43】

### Milestones
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
POST | /escrows/{escrow_id}/milestones | `create_milestone_for_escrow` | API key | admin, support, sender (own draft escrow only) | `MilestoneCreate` (escrow schema) | `MilestoneRead` (escrow schema) | 201 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/escrow.py†L252-L268】【F:app/schemas/escrow.py†L136-L171】【F:app/security/__init__.py†L33-L153】
GET | /escrows/{escrow_id}/milestones | `list_milestones_for_escrow` | API key | sender, provider, admin, support | — | `list[MilestoneRead]` (escrow schema) | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/escrow.py†L271-L285】【F:app/schemas/escrow.py†L145-L171】【F:app/security/__init__.py†L33-L153】
GET | /escrows/milestones/{milestone_id} | `get_milestone` | API key | admin, sender, provider | — | `MilestoneRead` (escrow schema) | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/escrow.py†L288-L303】【F:app/schemas/escrow.py†L145-L171】【F:app/security/__init__.py†L33-L153】

**Milestone creation constraints**
- Senders may add milestones only to their own escrows while the escrow is in `DRAFT`; creation is blocked once funding, proofs, or payments have started. Currency must match the escrow, amount must be greater than zero, sequence_index is unique per escrow, and cumulative milestone amounts cannot exceed the escrow total.【F:app/routers/escrow.py†L252-L268】【F:app/services/escrow.py†L965-L1050】

### Proof upload + Proof lifecycle
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
POST | /files/proofs | `upload_proof_file` | API key | sender, provider, support, admin | multipart/form-data (file + optional escrow_id) | `ProofFileUploadResponse` | 201 | ESCROW_ID_REQUIRED, UNSUPPORTED_FILE_TYPE, FILE_TOO_LARGE, FILE_UPLOAD_FAILED | 【F:app/routers/uploads.py†L74-L162】【F:app/schemas/proof.py†L199-L211】
GET | /files/signed/{token} | `download_signed_proof` | Public | — | Query: `key` | Binary `Response` | 200 | SIGNED_URL_EXPIRED, SIGNED_URL_INVALID, FILE_NOT_FOUND, SIGNED_URL_READ_FAILED, STORAGE_UNAVAILABLE | 【F:app/routers/uploads.py†L165-L217】
POST | /proofs | `submit_proof` | API key | sender, provider, support, admin | `ProofCreate` | Proof payload (JSON) | 201 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/proofs.py†L36-L58】【F:app/schemas/proof.py†L31-L117】【F:app/security/__init__.py†L33-L153】
GET | /proofs | `list_proofs` | API key | sender, provider, support, admin, advisor | Query (filters, limit/offset) | `PaginatedResponse[ProofDetailRead]` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/proofs.py†L61-L122】【F:app/schemas/proof.py†L83-L148】【F:app/schemas/pagination.py†L6-L21】【F:app/security/__init__.py†L33-L153】
GET | /proofs/{proof_id} | `get_proof` | API key | sender, provider, support, admin, advisor | — | `ProofDetailRead` (normalized JSON) | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/proofs.py†L124-L150】【F:app/schemas/proof.py†L83-L148】【F:app/security/__init__.py†L33-L153】
POST | /proofs/{proof_id}/decision | `decide_proof` | API key | sender, support, admin | `ProofDecision` | `ProofRead` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/proofs.py†L153-L178】【F:app/schemas/proof.py†L83-L157】【F:app/security/__init__.py†L33-L153】
POST | /sender/external-proof-tokens | `issue_external_proof_token` | API key | sender, support, admin | `ExternalProofTokenRequest` (target_type, expires_in_minutes bounded 10–43200, max_uploads, note) | `ExternalProofTokenResponse` (token_id/token/status/target returned; raw token only on creation) | 201 | TOKEN_EXPIRY_TOO_SHORT, TOKEN_EXPIRY_TOO_LONG, TOKEN_MAX_UPLOADS_INVALID, INSUFFICIENT_SCOPE | 【F:app/routers/external_proof_tokens.py†L39-L74】【F:app/schemas/external_proofs.py†L13-L78】【F:app/services/external_proof_tokens.py†L80-L208】
GET | /sender/external-proof-tokens | `list_external_proof_tokens` | API key | sender (own escrows), support, admin | Query: escrow_id?, milestone_idx?, limit/offset | `ExternalProofTokenList` (no raw token field) | 200 | INSUFFICIENT_SCOPE | 【F:app/routers/external_proof_tokens.py†L77-L116】【F:app/services/external_proof_tokens.py†L461-L488】
GET | /sender/external-proof-tokens/{token_id} | `get_external_proof_token` | API key | sender (own escrows), support, admin | — | `ExternalProofTokenRead` | 200 | TOKEN_NOT_FOUND, INSUFFICIENT_SCOPE | 【F:app/routers/external_proof_tokens.py†L119-L143】【F:app/services/external_proof_tokens.py†L490-L518】
POST | /sender/external-proof-tokens/{token_id}/revoke | `revoke_external_proof_token` | API key | sender, support, admin | — | `ExternalProofTokenRead` (status=REVOKED) | 200 | TOKEN_NOT_FOUND | 【F:app/routers/external_proof_tokens.py†L146-L172】【F:app/services/external_proof_tokens.py†L520-L563】
POST | /external/proofs/tokens | `issue_external_proof_token` (legacy alias, deprecated) | API key | sender, support, admin | `ExternalProofTokenRequest` | `ExternalProofTokenResponse` | 201 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/external_proofs.py†L79-L114】
POST | /external/tokens/beneficiary | `issue_external_beneficiary_token` (legacy alias, deprecated) | API key | sender, support, admin | `ExternalBeneficiaryTokenRequest` | `ExternalProofTokenResponse` | 201 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/external_proofs.py†L116-L150】
POST | /external/files/proofs | `upload_external_proof_file` | Public (token) | — | multipart/form-data + token via `Authorization: Bearer <token>` (official) or `X-External-Token` header | `ExternalProofUploadResponse` | 201 | INVALID_TOKEN, TOKEN_EXPIRED (410), TOKEN_REVOKED (410), TOKEN_ALREADY_USED, UNSUPPORTED_FILE_TYPE, FILE_TOO_LARGE, FILE_UPLOAD_FAILED | 【F:app/routers/external_proofs.py†L179-L233】【F:app/security/external_tokens.py†L1-L25】【F:app/services/external_proof_tokens.py†L226-L384】
POST | /external/proofs/submit | `submit_external_proof` | Public (token) | — | `ExternalProofSubmit` (escrow_id/milestone_idx optional; token fills when omitted) + token via `Authorization: Bearer <token>` (official) or `X-External-Token` header | `ExternalProofSubmitResponse` | 201 | TOKEN_ESCROW_MISMATCH, TOKEN_MILESTONE_MISMATCH, TOKEN_ALREADY_USED, TOKEN_EXPIRED (410), TOKEN_REVOKED (410), FILE_METADATA_REQUIRED, TOKEN_FILE_ALREADY_SET | 【F:app/routers/external_proofs.py†L235-L316】【F:app/security/external_tokens.py†L1-L25】【F:app/services/external_proof_tokens.py†L226-L384】
GET | /external/escrows/summary | `get_external_escrow_summary` | Public (token) | — | Token via `Authorization: Bearer <token>` (official) or `X-External-Token` header | `ExternalEscrowSummary` | 200 | TOKEN_ESCROW_MISMATCH, TOKEN_EXPIRED (410), TOKEN_REVOKED (410) | 【F:app/routers/external_proofs.py†L318-L352】【F:app/security/external_tokens.py†L1-L25】【F:app/services/external_proof_tokens.py†L226-L291】
GET | /external/escrows/{escrow_id} | `get_external_escrow_summary_by_path` | Public (token) | — | Backward-compatible path param + token via `Authorization: Bearer <token>` (official) or `X-External-Token` header | `ExternalEscrowSummary` | 200 | TOKEN_ESCROW_MISMATCH, TOKEN_EXPIRED (410), TOKEN_REVOKED (410) | 【F:app/routers/external_proofs.py†L355-L389】【F:app/security/external_tokens.py†L1-L25】【F:app/services/external_proof_tokens.py†L226-L291】
GET | /external/proofs/{proof_id}/status | `get_external_proof_status` | Public (token) | — | Token via `Authorization: Bearer <token>` (official) or `X-External-Token` header | `ExternalProofStatusResponse` | 200 | PROOF_NOT_FOUND, TOKEN_ESCROW_MISMATCH, TOKEN_EXPIRED (410), TOKEN_REVOKED (410) | 【F:app/routers/external_proofs.py†L392-L430】【F:app/security/external_tokens.py†L1-L25】【F:app/services/external_proof_tokens.py†L226-L291】

### External Beneficiary UI endpoints (approved for UI use)
- **Auth (single transport)**: `Authorization: Bearer <external_token>` is the canonical header. `X-External-Token` is accepted as an exact equivalent for clients that cannot set Authorization. Query parameters are rejected (401).【F:app/security/external_tokens.py†L1-L25】【F:tests/test_external_proof_tokens.py†L370-L412】【F:tests/test_external_proof_tokens.py†L576-L591】
- **Token lifecycle + TTL**: tokens default to 7 days (bounds: min 10 minutes, max 43,200 minutes) and expose `status` (`ACTIVE`, `EXPIRED`, `REVOKED`, `USED`), `expires_at`, and target metadata via issuance/list/detail endpoints; raw token is only returned at creation.【F:app/services/external_proof_tokens.py†L26-L208】【F:app/routers/external_proof_tokens.py†L39-L143】
- **Error semantics**: invalid tokens → 401 `INVALID_TOKEN`; expired/revoked tokens → 410 `TOKEN_EXPIRED` / `TOKEN_REVOKED`; reused tokens → 410 `TOKEN_ALREADY_USED`; target mismatches remain 403. All errors follow the `error.code/message/details` shape.【F:app/services/external_proof_tokens.py†L226-L384】【F:app/routers/external_proofs.py†L179-L316】
- **Escrow resolution model**: token-only. `/external/escrows/summary` resolves `escrow_id` and `milestone_idx` from the token; the `{escrow_id}` path variant only succeeds when the path matches the token escrow (403 otherwise). UI should prefer the token-only summary for simplicity.【F:app/routers/external_proofs.py†L318-L389】
- **Upload constraints**: accepts `image/jpeg`, `image/png`, `application/pdf`; max 5 MB for images and 10 MB for PDFs. Violations return 422 with `UNSUPPORTED_FILE_TYPE` or `FILE_TOO_LARGE`.【F:app/routers/external_proofs.py†L114-L182】【F:app/config.py†L73-L87】
- **Status polling contract**: `status` is one of `PENDING`, `APPROVED`, `REJECTED`; `terminal` becomes true for `APPROVED`/`REJECTED`. Recommend polling every 3–5 s with exponential backoff up to 15 s and stop when `terminal=true`.【F:app/routers/external_proofs.py†L392-L430】【F:app/services/state_machines.py†L150-L199】
- **Redaction**: responses expose only escrow amounts/status, milestone labels/status, proof status, timestamps, and storage metadata; no user identities or bank fields leak to external beneficiaries.【F:app/routers/external_proofs.py†L138-L430】

Method | Path | Auth | Request highlights | Response highlights | Common errors | Evidence
---|---|---|---|---|---|---
POST | /external/files/proofs | External token header | multipart `file`; token via Authorization or `X-External-Token` | `ExternalProofUploadResponse` (`storage_key`, `storage_url`, `sha256`, `content_type`, `size_bytes`, `escrow_id`, `milestone_idx`) | 401 UNAUTHORIZED, 422 UNSUPPORTED_FILE_TYPE/FILE_TOO_LARGE, 500 FILE_UPLOAD_FAILED | 【F:app/routers/external_proofs.py†L114-L194】【F:app/schemas/external_proofs.py†L34-L55】
POST | /external/proofs/submit | External token header | JSON: `type`, `storage_key`, `storage_url`, `sha256`, optional `metadata`; `escrow_id`/`milestone_idx` optional (token default) | `ExternalProofSubmitResponse` (`proof_id`, `status`, `escrow_id`, `milestone_idx`, `created_at`) | 403 TOKEN_ESCROW_MISMATCH/TOKEN_MILESTONE_MISMATCH/FILE_ESCROW_MISMATCH, 409 TOKEN_FILE_ALREADY_SET, 422 FILE_METADATA_REQUIRED | 【F:app/routers/external_proofs.py†L196-L315】【F:app/schemas/external_proofs.py†L57-L120】
GET | /external/escrows/summary | External token header | Header only (token resolves escrow) | `ExternalEscrowSummary` (escrow status/amount + milestone list with last proof status) | 401 UNAUTHORIZED, 403 TOKEN_ESCROW_MISMATCH | 【F:app/routers/external_proofs.py†L318-L352】【F:app/schemas/external_proofs.py†L102-L131】
GET | /external/proofs/{proof_id}/status | External token header | Path `proof_id` + token header | `ExternalProofStatusResponse` (`status`, `terminal`, `submitted_at`, optional `reviewed_at`) | 401 UNAUTHORIZED, 403 TOKEN_ESCROW_MISMATCH, 404 PROOF_NOT_FOUND | 【F:app/routers/external_proofs.py†L392-L430】【F:app/schemas/external_proofs.py†L120-L138】

### Merchants (registry + suggestions)
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
POST | /merchant-suggestions | `create_suggestion` | API key | sender | `MerchantSuggestionCreate` | `MerchantSuggestionRead` | 201 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/merchant_suggestions.py†L20-L30】【F:app/schemas/merchant_suggestions.py†L14-L51】【F:app/security/__init__.py†L33-L153】
GET | /merchant-suggestions | `list_suggestions` | API key | sender | — | `list[MerchantSuggestionRead]` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/merchant_suggestions.py†L32-L40】【F:app/schemas/merchant_suggestions.py†L31-L51】【F:app/security/__init__.py†L33-L153】
GET | /merchant-suggestions/{suggestion_id} | `get_suggestion` | API key | sender | — | `MerchantSuggestionRead` | 200 | MERCHANT_SUGGESTION_NOT_FOUND, INSUFFICIENT_SCOPE | 【F:app/routers/merchant_suggestions.py†L43-L63】【F:app/schemas/merchant_suggestions.py†L31-L51】【F:app/security/__init__.py†L33-L153】
GET | /admin/merchant-suggestions | `list_suggestions` | API key | admin, support | Query (status, created_by_user_id) | `list[MerchantSuggestionRead]` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/admin_merchant_suggestions.py†L29-L45】【F:app/schemas/merchant_suggestions.py†L31-L51】【F:app/security/__init__.py†L33-L153】
POST | /admin/merchant-suggestions/{suggestion_id}/approve | `approve_suggestion` | API key | admin, support | `MerchantSuggestionAdminUpdate` | `MerchantSuggestionRead` | 200 | INVALID_DECISION | 【F:app/routers/admin_merchant_suggestions.py†L48-L66】【F:app/schemas/merchant_suggestions.py†L61-L67】
POST | /admin/merchant-suggestions/{suggestion_id}/reject | `reject_suggestion` | API key | admin, support | `MerchantSuggestionAdminUpdate` | `MerchantSuggestionRead` | 200 | INVALID_DECISION | 【F:app/routers/admin_merchant_suggestions.py†L69-L87】【F:app/schemas/merchant_suggestions.py†L61-L67】
POST | /admin/merchant-suggestions/{suggestion_id}/promote | `promote_suggestion` | API key | admin, support | `MerchantSuggestionPromote` | `MerchantSuggestionRead` | 200 | — | 【F:app/routers/admin_merchant_suggestions.py†L90-L102】【F:app/schemas/merchant_suggestions.py†L84-L102】

**Merchant registry endpoints**: Not found under `app/routers/**` (TODO). Merchant creation exists under `/spend/merchants` (usage subsystem), which is separate from the direct-pay registry concept.【F:app/routers/spend.py†L45-L56】

### Pricing (reference + inflation)
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
POST | /admin/pricing/reference/import-csv | `import_price_reference` | API key | pricing_admin, risk_admin | UploadFile (CSV) | `PriceReferenceImportResponse` | 200 | INVALID_CSV, PRICE_REFERENCE_IMPORT_FAILED | 【F:app/routers/admin_pricing_reference.py†L37-L74】
POST | /admin/pricing/inflation/upload-csv | `upload_inflation_csv` | API key | pricing_admin, risk_admin | UploadFile (CSV) | `InflationCsvImportResponse` | 200 | INVALID_CSV, INFLATION_IMPORT_FAILED | 【F:app/routers/admin_pricing_inflation.py†L76-L109】
GET | /admin/pricing/inflation | `list_inflation_adjustments` | API key | pricing_admin, risk_admin | Query (country_code, category, active_on) | `list[InflationAdjustmentResponse]` | 200 | — | 【F:app/routers/admin_pricing_inflation.py†L112-L143】
POST | /admin/pricing/inflation | `create_inflation_adjustment` | API key | pricing_admin, risk_admin | `InflationAdjustmentPayload` | `InflationAdjustmentResponse` | 201 | INFLATION_* validation errors | 【F:app/routers/admin_pricing_inflation.py†L145-L178】
PUT | /admin/pricing/inflation/{adjustment_id} | `update_inflation_adjustment` | API key | pricing_admin, risk_admin | `InflationAdjustmentPayload` | `InflationAdjustmentResponse` | 200 | INFLATION_ADJUSTMENT_NOT_FOUND | 【F:app/routers/admin_pricing_inflation.py†L181-L233】
DELETE | /admin/pricing/inflation/{adjustment_id} | `delete_inflation_adjustment` | API key | pricing_admin, risk_admin | — | `dict[str, str]` | 200 | INFLATION_ADJUSTMENT_NOT_FOUND | 【F:app/routers/admin_pricing_inflation.py†L236-L266】

### Fraud Engine / Risk features (exposed vs internal)
**Exposed endpoints (admin/support)**
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
GET | /admin/fraud/score_comparison | `fraud_score_comparison` | API key | admin, support | Query: proof_id | `FraudScoreComparisonResponse` (object) | 200 | PROOF_NOT_FOUND | 【F:app/routers/admin_tools.py†L60-L104】【F:app/schemas/fraud.py†L10-L33】
GET | /admin/risk-snapshots | `list_risk_snapshots` | API key | admin, support | Query: subject_type, subject_id, limit, offset | `PaginatedResponse[RiskFeatureSnapshotRead]` | 200 | — | 【F:app/routers/admin_tools.py†L156-L193】【F:app/schemas/pagination.py†L6-L21】【F:app/schemas/risk_snapshot.py†L8-L49】

- Query params: `subject_type` enum (`MANDATE`, `ESCROW`, `PROOF`), `subject_id` (>=1), `limit` default 20 (1–100), `offset` default 0. Ordered by `computed_at DESC` then `id DESC`. Response envelope exposes `items`, `total`, `limit`, `offset`.【F:app/routers/admin_tools.py†L156-L193】【F:app/schemas/pagination.py†L6-L21】
- `RiskFeatureSnapshotRead` fields: `subject_type`, `subject_id`, `version`, `features_json` (risk features such as presence/flags/amount bucket/merchant mode without PII), `computed_at`, `source_event`, optional `correlation_id`. `features_json` shape is constrained by `RiskFeaturesV1`/`OffPlatformBeneficiaryPresence` (flags and buckets only).【F:app/schemas/risk_snapshot.py†L8-L49】
- No PII is returned: the ORM model is documented as a “snapshot of non-PII risk features,” and stored features only capture presence/flags (no emails/phones/addresses).【F:app/models/risk_feature_snapshot.py†L11-L34】【F:app/schemas/risk_snapshot.py†L22-L49】
- `FraudScoreComparisonResponse` fields (single object, no pagination): `proof_id` (string), `rule_based` (score float|null, `ai_risk_level` string|null, `fraud_flags` list of strings), `ml` (model_version string, score float|null, `threshold_high_risk` float, `threshold_medium_risk` float, `suggested_decision` “MANUAL_REVIEW” or “APPROVED” or null). All fields are derived from proof metadata/ML model and contain no beneficiary/sender PII.【F:app/routers/admin_tools.py†L60-L104】【F:app/schemas/fraud.py†L10-L33】
Example response:
```json
{
  "proof_id": "123",
  "rule_based": {
    "score": 0.2,
    "ai_risk_level": "LOW",
    "fraud_flags": ["PRICE_OK"]
  },
  "ml": {
    "model_version": "fraud_model_v1",
    "score": 0.65,
    "threshold_high_risk": 0.8,
    "threshold_medium_risk": 0.5,
    "suggested_decision": "MANUAL_REVIEW"
  }
}
```

**Internal processing (not directly exposed)**
- Risk features are derived from proofs and stored as snapshots; the only exposed API surface is via the admin/support risk snapshot listing above (no public endpoints found).【F:app/routers/admin_tools.py†L156-L193】

### Advisor review
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
GET | /me/advisor | `get_my_advisor` | API key | sender | — | `AdvisorProfileRead` | 200 | NO_ADVISOR_AVAILABLE | 【F:app/routers/advisors.py†L147-L164】【F:app/schemas/advisor.py†L19-L45】
POST | /proofs/{proof_id}/request_advisor_review | `request_advisor_review` | API key | sender | — | `ProofRead` | 200 | PROOF_NOT_FOUND, INVALID_PROOF_STATE, MILESTONE_NOT_FOUND, NO_ADVISOR_AVAILABLE | 【F:app/routers/advisors.py†L167-L213】【F:app/schemas/proof.py†L83-L117】
GET | /advisor/me/profile | `get_advisor_profile` | API key | advisor | — | `AdvisorProfileRead` | 200 | ADVISOR_PROFILE_NOT_FOUND, INSUFFICIENT_SCOPE | 【F:app/routers/advisors.py†L216-L228】【F:app/schemas/advisor.py†L19-L45】
GET | /advisor/me/proofs | `list_assigned_proofs` | API key | advisor | Query: status | `list[AdvisorProofItem]` | 200 | INSUFFICIENT_SCOPE | 【F:app/routers/advisors.py†L231-L250】【F:app/schemas/advisor.py†L66-L80】
POST | /advisor/proofs/{proof_id}/approve | `advisor_approve_proof` | API key | advisor | `AdvisorProofDecision` (optional) | `ProofRead` | 200 | ADVISOR_CANNOT_DECIDE | 【F:app/routers/advisors.py†L253-L273】【F:app/schemas/advisor.py†L63-L65】
POST | /advisor/proofs/{proof_id}/reject | `advisor_reject_proof` | API key | advisor | `AdvisorProofDecision` (optional) | `ProofRead` | 200 | ADVISOR_CANNOT_DECIDE | 【F:app/routers/advisors.py†L276-L296】【F:app/schemas/advisor.py†L63-L65】
POST | /admin/advisors | `create_advisor` | API key | admin | `AdvisorProfileCreate` | `AdvisorProfileRead` | 201 | USER_NOT_FOUND | 【F:app/routers/admin_advisors.py†L28-L47】【F:app/schemas/advisor.py†L7-L45】
GET | /admin/advisors | `list_advisors` | API key | admin | Query: active | `list[AdvisorProfileListItem]` | 200 | INSUFFICIENT_SCOPE | 【F:app/routers/admin_advisors.py†L50-L62】【F:app/schemas/advisor.py†L52-L54】
GET | /admin/advisors/{advisor_id} | `get_advisor` | API key | admin | — | `AdvisorProfileRead` | 200 | ADVISOR_NOT_FOUND | 【F:app/routers/admin_advisors.py†L65-L75】【F:app/schemas/advisor.py†L19-L45】
PATCH | /admin/advisors/{advisor_id} | `admin_update_advisor` | API key | admin | `AdvisorProfileUpdate` | `AdvisorProfileRead` | 200 | ADVISOR_NOT_FOUND | 【F:app/routers/admin_advisors.py†L78-L119】【F:app/schemas/advisor.py†L57-L61】
GET | /admin/advisors/{advisor_id}/senders | `admin_list_advisor_senders` | API key | admin | — | `list[AdvisorSenderItem]` | 200 | ADVISOR_NOT_FOUND | 【F:app/routers/admin_advisors.py†L122-L151】【F:app/schemas/advisor.py†L46-L51】
POST | /admin/advisors/{advisor_id}/assign-sender | `admin_assign_sender_to_advisor` | API key | admin | `AdminAssignSenderRequest` | `AdvisorProfileRead` | 200 | ADVISOR_NOT_FOUND, ADVISOR_NOT_ACTIVE, SENDER_NOT_FOUND, INVALID_SENDER | 【F:app/routers/admin_advisors.py†L154-L194】【F:app/schemas/advisor.py†L55-L62】

### Payments/Payouts
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
POST | /payments/execute/{payment_id} | `execute_payment` | API key | admin, support | — | `PaymentRead` | 200 | Auth errors | 【F:app/routers/payments.py†L27-L43】【F:app/schemas/payment.py†L10-L36】
GET | /admin/payments | `list_admin_payments` | API key | admin, support | Query (status, escrow_id, limit, offset) | `PaginatedResponse[PaymentRead]` | 200 | INSUFFICIENT_SCOPE | 【F:app/routers/payments.py†L46-L68】【F:app/schemas/payment.py†L10-L36】【F:app/schemas/pagination.py†L6-L21】

### PSP webhooks
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
POST | /psp/webhook | `psp_webhook` | Public (signature) | — | Raw JSON | `dict[str, str]` | 200 | PSP_WEBHOOK_SECRET_MISSING, MISSING_EVENT_ID, WEBHOOK_SIGNATURE_MISSING, WEBHOOK_SIGNATURE_INVALID, WEBHOOK_REPLAY | 【F:app/routers/psp.py†L17-L23】【F:app/services/psp_webhooks.py†L72-L118】【F:app/services/psp_webhooks.py†L371-L455】
POST | /psp/stripe/webhook | `stripe_webhook` | Public (signature) | — | Stripe webhook payload | `dict[str, bool]` | 200 | STRIPE_DISABLED, STRIPE_SIGNATURE_MISSING, STRIPE_SIGNATURE_INVALID, STRIPE_EVENT_INVALID, STRIPE_NOT_CONFIGURED | 【F:app/routers/psp.py†L25-L30】【F:app/services/psp_webhooks.py†L121-L194】

### Admin tools / support operations
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
GET | /alerts | `list_alerts` | API key | admin, support | Query (type, status, limit, offset) | `PaginatedResponse[AlertRead]` | 200 | INSUFFICIENT_SCOPE, NO_API_KEY, UNAUTHORIZED | 【F:app/routers/alerts.py†L12-L40】【F:app/schemas/alert.py†L7-L15】【F:app/schemas/pagination.py†L6-L21】【F:app/security/__init__.py†L33-L153】
GET | /admin/proofs/review-queue | `get_proof_review_queue` | API key | admin, support | Query (filters, limit, offset) | `PaginatedResponse[AdminProofReviewItem]` | 200 | INSUFFICIENT_SCOPE | 【F:app/routers/admin_tools.py†L39-L107】【F:app/schemas/proof.py†L159-L190】
GET | /admin/advisors/overview | `get_advisors_overview` | API key | admin, support | Query (limit, offset) | `list[AdvisorWorkloadSummary]` | 200 | INSUFFICIENT_SCOPE | 【F:app/routers/admin_tools.py†L182-L251】【F:app/schemas/advisor.py†L82-L95】
GET | /admin/settings/ai-proof | `get_ai_proof_setting` | API key | admin (string scope) | — | `dict` | 200 | INSUFFICIENT_SCOPE | 【F:app/routers/admin_settings.py†L26-L43】
POST | /admin/settings/ai-proof | `set_ai_proof_setting` | API key | admin (string scope) | Query: enabled (bool) | `dict` | 200 | INSUFFICIENT_SCOPE | 【F:app/routers/admin_settings.py†L46-L63】
GET | /debug/stripe/account/{user_id} | `debug_stripe_account` | API key | admin, support | — | `dict[str, Any]` | 200 | INSUFFICIENT_SCOPE | 【F:app/routers/debug_stripe.py†L14-L32】
GET | /sender/dashboard | `get_sender_dashboard` | API key | sender | Query: limit (default 10, max 50), include_actions | `SenderDashboardRead` | 200 | USER_NOT_FOUND, INSUFFICIENT_SCOPE | 【F:app/routers/sender_dashboard.py†L29-L55】【F:app/schemas/dashboard.py†L11-L129】【F:app/services/escrow.py†L873-L1047】
GET | /admin/dashboard | `read_admin_dashboard` | API key | admin | — | `AdminDashboard` | 200 | INSUFFICIENT_SCOPE | 【F:app/routers/admin_dashboard.py†L11-L28】【F:app/schemas/admin_dashboard.py†L8-L16】
GET | /admin/senders | `list_admin_senders` | API key | admin | Query (limit, offset, q) | `PaginatedResponse[AdminSenderRead]` | 200 | INSUFFICIENT_SCOPE | 【F:app/routers/admin_senders.py†L24-L62】【F:app/schemas/admin_senders.py†L8-L15】【F:app/schemas/pagination.py†L6-L21】

- **Sender dashboard payload** (`GET /sender/dashboard`):
  - `profile`: sender basics (id, display name, created_at, optional email)
  - `counts`: total/active/completed escrows and pending proofs
  - `recent_escrows`: compact summaries ordered by `updated_at` (limit controls list length)
  - `actions`: optional items when `include_actions=true`
  - Legacy compatibility: `pending_proofs`, `recent_payments`, and `stats` remain included

- Legacy alias: `GET /proofs?review_mode=review_queue` remains available for backward compatibility but is **deprecated**; it is restricted to admin/support scopes, returns the same paginated review queue as `/admin/proofs/review-queue`, and emits `Deprecation: true` plus a successor `Link` header pointing to the replacement endpoint.【F:app/routers/proofs.py†L66-L106】【F:app/services/proofs.py†L124-L150】【F:app/services/proofs.py†L2036-L2121】
> **Note**: `/admin/dashboard` and `/admin/senders` are defined but not mounted in `app.main` or `get_api_router()`. Treat as TODO until mounted.【F:app/routers/admin_dashboard.py†L11-L28】【F:app/routers/admin_senders.py†L17-L62】【F:app/routers/__init__.py†L33-L63】【F:app/main.py†L214-L219】

### Public sector (KCT Public)
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
POST | /kct_public/projects | `create_project` | API key + public user | sender, admin | `GovProjectCreate` | `GovProjectRead` | 201 | PUBLIC_USER_NOT_FOUND, PUBLIC_ACCESS_FORBIDDEN, INSUFFICIENT_SCOPE | 【F:app/routers/kct_public.py†L24-L41】【F:app/schemas/kct_public.py†L14-L33】【F:app/security/__init__.py†L186-L207】
POST | /kct_public/projects/{project_id}/managers | `add_project_manager` | API key + public user | sender, admin | `GovProjectManagerCreate` | `dict` | 201 | PUBLIC_USER_NOT_FOUND, PUBLIC_ACCESS_FORBIDDEN | 【F:app/routers/kct_public.py†L44-L56】【F:app/schemas/kct_public.py†L52-L55】
POST | /kct_public/projects/{project_id}/mandates | `attach_project_mandate` | API key + public user | sender, admin | `GovProjectMandateCreate` | `dict` | 201 | PUBLIC_USER_NOT_FOUND, PUBLIC_ACCESS_FORBIDDEN | 【F:app/routers/kct_public.py†L59-L71】【F:app/schemas/kct_public.py†L58-L59】
GET | /kct_public/projects/{project_id} | `get_project_view` | API key + public user | sender, admin | — | `GovProjectRead` | 200 | PUBLIC_USER_NOT_FOUND, PUBLIC_ACCESS_FORBIDDEN | 【F:app/routers/kct_public.py†L74-L82】【F:app/schemas/kct_public.py†L36-L50】
GET | /kct_public/projects | `list_projects` | API key + public user | sender, admin | Query (domain, country, status) | `list[GovProjectRead]` | 200 | PUBLIC_USER_NOT_FOUND, PUBLIC_ACCESS_FORBIDDEN | 【F:app/routers/kct_public.py†L85-L99】【F:app/schemas/kct_public.py†L36-L50】

### Spend/Usage
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
POST | /spend/categories | `create_category` | API key | admin, support | `SpendCategoryCreate` | `SpendCategoryRead` | 201 | INSUFFICIENT_SCOPE | 【F:app/routers/spend.py†L31-L42】【F:app/schemas/spend.py†L10-L22】
POST | /spend/merchants | `create_merchant` | API key | admin, support | `MerchantCreate` | `MerchantRead` | 201 | INSUFFICIENT_SCOPE | 【F:app/routers/spend.py†L45-L56】【F:app/schemas/spend.py†L25-L37】
POST | /spend/allow | `allow_usage` | API key | admin, support | `AllowedUsageCreate` | `dict` | 201 | INSUFFICIENT_SCOPE | 【F:app/routers/spend.py†L59-L69】【F:app/schemas/spend.py†L40-L54】
POST | /spend/purchases | `create_purchase` | API key | sender, admin | `PurchaseCreate` + `Idempotency-Key` header | `PurchaseRead` | 201 | INSUFFICIENT_SCOPE | 【F:app/routers/spend.py†L72-L86】【F:app/schemas/spend.py†L57-L75】
POST | /spend/allowed | `add_allowed_payee` | API key | admin, support | `AddPayeeIn` | `dict` | 201 | INSUFFICIENT_SCOPE | 【F:app/routers/spend.py†L89-L115】
POST | /spend | `spend` | API key | sender, admin | `SpendIn` + optional `Idempotency-Key` | `dict` | 200 | INSUFFICIENT_SCOPE | 【F:app/routers/spend.py†L118-L144】

### Transactions
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
POST | /allowlist | `add_to_allowlist` | API key | admin | `AllowlistCreate` | `dict[str, str]` | 201 | INSUFFICIENT_SCOPE | 【F:app/routers/transactions.py†L23-L35】【F:app/schemas/transaction.py†L26-L34】
POST | /certified | `add_certification` | API key | admin | `CertificationCreate` | `dict[str, str]` | 201 | INSUFFICIENT_SCOPE | 【F:app/routers/transactions.py†L38-L50】【F:app/schemas/transaction.py†L37-L52】
POST | /transactions | `post_transaction` | API key | admin | `TransactionCreate` + optional `Idempotency-Key` | `TransactionRead` | 201 | INSUFFICIENT_SCOPE | 【F:app/routers/transactions.py†L53-L69】【F:app/schemas/transaction.py†L8-L22】
GET | /transactions/{transaction_id} | `get_transaction` | API key | admin | — | `TransactionRead` | 200 | INSUFFICIENT_SCOPE | 【F:app/routers/transactions.py†L72-L86】【F:app/schemas/transaction.py†L13-L22】

### API keys (admin tooling)
Method | Path | Handler | Auth | Required scope(s) | Request model | Response model | Success codes | Common error codes | Evidence
---|---|---|---|---|---|---|---|---|---
GET | /apikeys | `deprecated_list_apikeys` | Public | — | — | JSON error payload | 410 | DEPRECATED_ENDPOINT | 【F:app/routers/apikeys.py†L51-L59】
POST | /apikeys | `create_api_key` | API key | admin | `CreateKeyIn` | `ApiKeyCreateOut` | 201 | INSUFFICIENT_SCOPE | 【F:app/routers/apikeys.py†L62-L84】
GET | /apikeys/{api_key_id} | `get_apikey` | API key | admin | — | `ApiKeyRead` | 200 | INSUFFICIENT_SCOPE | 【F:app/routers/apikeys.py†L87-L93】【F:app/schemas/apikey.py†L8-L21】
DELETE | /apikeys/{api_key_id} | `deprecated_delete_apikey` | Public | — | — | JSON error payload | 410 | DEPRECATED_ENDPOINT | 【F:app/routers/apikeys.py†L96-L103】

---

## 5. Field-level schema documentation (Pydantic)
This section lists the Pydantic models referenced by the API surface with their fields (non-exhaustive but field-accurate).

### Auth schemas
- **AuthLoginRequest**: `email`, `scope`.【F:app/schemas/auth.py†L9-L12】
- **AuthUser**: `id`, `email`, `username`, `role`, `payout_channel`.【F:app/schemas/auth.py†L14-L21】
- **AuthLoginResponse**: `access_token`, `token`, `token_type`, `user`.【F:app/schemas/auth.py†L24-L29】
- **AuthMeResponse**: `user`.【F:app/schemas/auth.py†L31-L32】

### User & profile schemas
- **UserCreate**: `username`, `email`, `is_active`, `role`, `payout_channel`.【F:app/schemas/user.py†L7-L13】
- **UserRead**: `id`, `username`, `email`, `is_active`, `role`, `payout_channel`, Stripe payout fields.【F:app/schemas/user.py†L16-L26】
- **StripeAccountLinkRead**: `url`.【F:app/schemas/user.py†L29-L30】
- **UserProfileRead/UserProfileUpdate**: address, contact, bank, national ID, regions, languages (with masking support).【F:app/schemas/user_profile.py†L10-L76】

### Escrow & milestone schemas
- **EscrowCreate**: sender/provider ids, beneficiary, amount/currency, release_conditions, deadline, domain.【F:app/schemas/escrow.py†L22-L38】
- **EscrowRead**: escrow identifiers, amount, currency, status, domain, release_conditions_json, deadline, beneficiary profile.【F:app/schemas/escrow.py†L61-L76】
- **EscrowListItem**: escrow summary fields (status, amount, deadline, created_at).【F:app/schemas/escrow.py†L106-L118】
- **EscrowDepositCreate**: `amount`.【F:app/schemas/escrow.py†L127-L128】
- **MilestoneCreate/MilestoneRead** (escrow schema): label, amount, currency, sequence_index, status, proof_kind/requirements.【F:app/schemas/escrow.py†L136-L171】
- **ProofRequirements** (milestone schema): expected proof metadata rules and validation constraints.【F:app/schemas/milestone.py†L76-L118】

### Proof schemas
- **ProofCreate**: escrow_id, milestone_idx, type, storage_key/url, sha256, metadata (invoice validation for INVOICE).【F:app/schemas/proof.py†L31-L67】
- **ProofRead/ProofDetailRead**: identifiers, storage fields, metadata, status, AI fields, invoice totals, payout eligibility. Includes computed `proof_id` alias.【F:app/schemas/proof.py†L83-L148】
- **ProofDecision**: `decision`, `note`.【F:app/schemas/proof.py†L151-L157】
- **ProofFileUploadResponse**: file_id, storage_key/url, sha256, content_type, size_bytes, uploader metadata.【F:app/schemas/proof.py†L199-L211】

### Payments & funding
- **PaymentRead**: id, escrow_id, milestone_id, amount, psp_ref, status, idempotency_key, timestamps.【F:app/schemas/payment.py†L10-L36】
- **FundingSessionRead**: `funding_id`, `client_secret`.【F:app/schemas/funding.py†L7-L9】

### Mandates
- **UsageMandateCreate**: total_amount, currency, target beneficiary (XOR), payout destination, merchant suggestion/registry.【F:app/schemas/mandates.py†L29-L88】
- **UsageMandateRead**: target info, sender_id, status, payout destination, merchant ids.【F:app/schemas/mandates.py†L92-L131】

### Merchant suggestions
- **MerchantSuggestionCreate**: name, country_code, contact, mandate/escrow ids.【F:app/schemas/merchant_suggestions.py†L14-L28】
- **MerchantSuggestionRead**: status, promotion_registry_id, metadata, timestamps.【F:app/schemas/merchant_suggestions.py†L31-L51】
- **MerchantSuggestionAdminUpdate/Promote**: decision, note, registry promotion config.【F:app/schemas/merchant_suggestions.py†L61-L102】

### Beneficiaries
- **BeneficiaryCreate**: identity, contact, bank, national ID, metadata; includes validation for bank details.【F:app/schemas/beneficiary.py†L12-L79】
- **BeneficiaryProfilePublicRead/AdminRead**: redacted vs. full views; `masked` flag for public-safe view.【F:app/schemas/beneficiary.py†L160-L175】

### Advisor
- **AdvisorProfileCreate/Read/Update**: advisor identity, status, ratings, timestamps.【F:app/schemas/advisor.py†L7-L61】
- **AdvisorProofItem/AdvisorWorkloadSummary**: advisor queue items + workload aggregates.【F:app/schemas/advisor.py†L66-L95】

### Admin dashboards, alerts, and pagination
- **AdminDashboard**: alert/proof/payment counts plus recent escrows/alerts.【F:app/schemas/admin_dashboard.py†L8-L16】
- **AlertRead**: alert id, type, message, payload, timestamps.【F:app/schemas/alert.py†L7-L15】
- **PaginatedResponse**: `items`, `total`, `limit`, `offset`.【F:app/schemas/pagination.py†L14-L21】

### External proofs
**Token transport (external beneficiary portal)**
- Official: `Authorization: Bearer <external_token>` header; `X-External-Token` is accepted as an equivalent header. Query parameters are rejected to avoid leakage and ambiguity.【F:app/security/external_tokens.py†L1-L25】【F:tests/test_external_proof_tokens.py†L143-L187】

**Schemas**
- **ExternalProofTokenRequest/Response**: escrow_id, milestone_idx, token, expires_at.【F:app/schemas/external_proofs.py†L13-L32】
- **ExternalProofUploadResponse**: storage metadata for external uploads. Uploads accept `image/jpeg`, `image/png`, `application/pdf`; size limits are 5 MB for images and 10 MB for PDFs, enforced before storage.【F:app/routers/external_proofs.py†L114-L169】【F:app/config.py†L77-L87】【F:app/schemas/external_proofs.py†L35-L55】
- **ExternalProofSubmit** (request): escrow_id and milestone_idx optional (token provides defaults); type, storage_key/storage_url/sha256 required; metadata optional.【F:app/schemas/external_proofs.py†L57-L99】【F:app/routers/external_proofs.py†L196-L276】
- **ExternalProofSubmitResponse**: proof_id, status, escrow_id, milestone_idx, created_at.【F:app/schemas/external_proofs.py†L101-L118】
- **ExternalEscrowSummary**: escrow status + milestone summaries without PII, exposed via `/external/escrows/summary` (preferred) or `/external/escrows/{escrow_id}` for backward compatibility.【F:app/routers/external_proofs.py†L318-L389】【F:app/schemas/external_proofs.py†L102-L131】
- **ExternalProofStatusResponse**: proof_id, status, escrow_id, milestone_idx, submitted_at, reviewed_at (optional), `terminal` flag (true when status is APPROVED or REJECTED).【F:app/routers/external_proofs.py†L392-L430】【F:app/schemas/external_proofs.py†L120-L138】

**External proof upload response (example)**
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
Example derived from `ExternalProofUploadResponse`.【F:app/schemas/external_proofs.py†L35-L55】

**External proof submit (request/response example)**
```json
{
  "escrow_id": 1024,
  "milestone_idx": 1,
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
Examples derived from `ExternalProofSubmit` and `ExternalProofSubmitResponse`.【F:app/schemas/external_proofs.py†L58-L120】

**External escrow summary (example)**
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
      "amount": "500.00",
      "status": "PENDING_REVIEW",
      "requires_proof": true,
      "last_proof_status": "PENDING"
    }
  ]
}
```
Example derived from `ExternalEscrowSummary`.【F:app/schemas/external_proofs.py†L123-L158】

### Public sector (KCT Public)
- **GovProjectCreate/Read/Manager/Mandate**: public project identifiers, status, amounts.【F:app/schemas/kct_public.py†L14-L59】

### Spend/Usage
- **SpendCategoryCreate/Read**, **MerchantCreate/Read**, **AllowedUsageCreate**, **PurchaseCreate/Read**.【F:app/schemas/spend.py†L10-L75】

### Transactions
- **TransactionCreate/Read**, **AllowlistCreate**, **CertificationCreate**.【F:app/schemas/transaction.py†L8-L52】

### API keys
- **ApiKeyRead**: id, name, scope, user_id, is_active, timestamps.【F:app/schemas/apikey.py†L8-L21】

### Inline/router-local schemas
- **AdminUserCreate/AdminUserCreateResponse** (router-defined): `email`, `role`, `issue_api_key`; response includes `user`, `token`, `token_type`.【F:app/routers/admin_users.py†L44-L61】
- **CreateKeyIn/ApiKeyCreateOut** (API key router-defined): name, scope, days_valid, user_id; response includes raw key once and expires_at.【F:app/routers/apikeys.py†L25-L47】
- **AddPayeeIn/SpendIn** (spend router-defined): escrow_id, payee_ref, label/limits; spend request uses escrow_id/payee_ref/amount/note.【F:app/routers/spend.py†L89-L123】
- **PriceReferenceImportResponse/ImportErrorItem** (pricing reference router-defined): imported/rejected counts and row errors.【F:app/routers/admin_pricing_reference.py†L26-L35】
- **InflationAdjustmentPayload/Response/InflationCsvImportResponse** (pricing inflation router-defined): country_code/category/date range/factor/source; response includes id and timestamps; CSV import response includes counts + errors.【F:app/routers/admin_pricing_inflation.py†L31-L59】

---

## 6. Invariants & Validation Rules
**Escrow & milestone invariants (database/model level)**
- Escrow `amount_total` must be non-negative; status is an enum with fixed values; escrow domain is constrained to `private/public/aid`.【F:app/models/escrow.py†L31-L78】
- Escrow deposits require positive amount and unique `idempotency_key`.【F:app/models/escrow.py†L130-L139】
- Milestone requires positive amount/idx, non-negative geofence radius, and validator must be in `SENDER/PROVIDER/ADVISOR/SUPPORT`.【F:app/models/milestone.py†L65-L107】

**Proof invariants**
- Proof file attributes (`type`, `storage_url`, `storage_key`, `sha256`) are immutable once persisted; uploader must match escrow sender/provider. 【F:app/models/proof.py†L147-L186】

**Schema validation highlights**
- Escrow create: `amount_total > 0`, currency restricted to USD/EUR; milestone sequence index and proof requirements enforce type constraints.【F:app/schemas/escrow.py†L22-L154】【F:app/schemas/milestone.py†L121-L134】
- ProofCreate enforces INVOICE metadata validation and strips reserved fraud fields from user input.【F:app/schemas/proof.py†L31-L67】
- Mandate creation enforces XOR between `beneficiary_id` and `beneficiary` with explicit error code `MANDATE_TARGET_XOR_VIOLATION`.【F:app/schemas/mandates.py†L63-L88】【F:app/utils/error_codes.py†L229-L234】
- Beneficiary creation requires bank details (IBAN or account number) and non-empty core identity fields.【F:app/schemas/beneficiary.py†L44-L79】

**State machine constraints**
- Escrow status transitions are limited to specific target states (e.g., DRAFT → FUNDED/CANCELLED/RELEASED).【F:app/services/state_machines.py†L53-L69】
- Milestone status transitions: WAITING → PENDING_REVIEW/APPROVED; PENDING_REVIEW → APPROVED/REJECTED; APPROVED → PAYING/PENDING_REVIEW; PAYING → PAID.【F:app/services/state_machines.py†L105-L116】
- Proof transitions: PENDING → APPROVED/REJECTED; APPROVED → REJECTED; REJECTED terminal.【F:app/services/state_machines.py†L152-L199】
- Payment transitions: PENDING → SENT/ERROR/SETTLED; SENT → SETTLED/ERROR; SETTLED → REFUNDED; ERROR/REFUNDED terminal.【F:app/services/state_machines.py†L202-L212】

---

## 7. State Models
### Escrow status enum
- DRAFT, FUNDED, RELEASABLE, RELEASED, REFUNDED, CANCELLED.【F:app/models/escrow.py†L31-L39】
- Allowed transitions are enforced by `EscrowStateMachine`.【F:app/services/state_machines.py†L53-L102】

### Milestone status enum
- WAITING, PENDING_REVIEW, APPROVED, REJECTED, PAYING, PAID.【F:app/models/milestone.py†L21-L29】
- Transition rules enforced by `MilestoneStateMachine`.【F:app/services/state_machines.py†L105-L149】

### Payment status enum
- PENDING, SENT, SETTLED, ERROR, REFUNDED.【F:app/models/payment.py†L15-L22】
- Transition rules enforced by `PaymentStateMachine`.【F:app/services/state_machines.py†L202-L239】

### Proof status semantics
- Proof status is a string with allowed transitions: PENDING → APPROVED/REJECTED; APPROVED → REJECTED; REJECTED terminal.【F:app/services/state_machines.py†L152-L199】
- Proof model defaults to `PENDING` at creation.【F:app/models/proof.py†L43-L44】

**Transition triggers (endpoint-driven vs server-driven)**

- Escrow funding via `/escrows/{id}/deposit` transitions escrow state server-side according to escrow service/state machine logic; approvals/rejections are sender-driven via `/escrows/{id}/client-approve` and `/escrows/{id}/client-reject`.【F:app/routers/escrow.py†L101-L196】【F:app/services/state_machines.py†L53-L102】
- Milestone status advances with proof submissions and payout execution; proofs are submitted via `/proofs`, decisions via `/proofs/{id}/decision`.【F:app/routers/proofs.py†L36-L178】【F:app/services/state_machines.py†L105-L199】
- Payment status transitions are server-driven (payout execution + PSP webhooks).【F:app/routers/payments.py†L27-L43】【F:app/services/psp_webhooks.py†L486-L516】

---

## 8. Error model (standard response shape + code registry)
**Standard error response**
- Standard payload uses `{"error": {"code", "message", "details"}}` and always exposes the nullable `details` field while keeping backward-compatible `context` and `field_errors` when provided.【F:app/utils/errors.py†L17-L46】
- HTTPException and validation errors are wrapped into the same payload shape by global exception handlers; validation errors map to `VALIDATION_ERROR` with per-field messages.【F:app/main.py†L241-L312】
- Example (missing API key): `{"error": {"code": "NO_API_KEY", "message": "API key required.", "details": null}, "detail": {...}}` demonstrating the canonical fields plus the legacy echo of the original detail for compatibility.【F:app/security/__init__.py†L33-L78】【F:app/main.py†L241-L292】
- Domain authorization helpers use the same `error` payload shape via `domain_error_payload`.【F:app/errors/domain_errors.py†L19-L38】

**Error Code Registry (from ERROR_CATALOG)**
Code | HTTP status | Meaning | Where raised | Evidence
---|---|---|---|---
ESCROW_NOT_FOUND | 404 | Escrow not found | `error_codes` catalog | 【F:app/utils/error_codes.py†L10-L68】
ESCROW_OVER_FUNDED | 400 | Escrow already funded above expected amount | `error_codes` catalog | 【F:app/utils/error_codes.py†L11-L72】
MILESTONE_SEQUENCE_ERROR | 422 | Previous milestone not paid | `error_codes` catalog | 【F:app/utils/error_codes.py†L12-L78】
MILESTONE_AMOUNT_INVALID | 422 | Milestone amount must be greater than zero | `error_codes` catalog | 【F:app/utils/error_codes.py†L13-L90】
MILESTONE_CURRENCY_MISMATCH | 422 | Milestone currency must match escrow currency | `error_codes` catalog | 【F:app/utils/error_codes.py†L14-L96】
MILESTONE_AMOUNT_EXCEEDS_ESCROW | 422 | Total milestone amounts exceed escrow total | `error_codes` catalog | 【F:app/utils/error_codes.py†L15-L102】
MILESTONE_SEQUENCE_EXISTS | 422 | Milestone sequence_index already exists | `error_codes` catalog | 【F:app/utils/error_codes.py†L16-L108】
MILESTONE_CREATION_LOCKED | 422 | Milestones blocked after funding/proofs/payments | `error_codes` catalog | 【F:app/utils/error_codes.py†L17-L114】
PROOF_INVALID_STATUS | 400 | Proof cannot transition | `error_codes` catalog | 【F:app/utils/error_codes.py†L13-L82】
PROOF_TYPE_MISMATCH | 400 | Proof type mismatch | `error_codes` catalog | 【F:app/utils/error_codes.py†L14-L88】
INVALID_PROOF_FILE_KIND | 400 | Proof file kind mismatch | `error_codes` catalog | 【F:app/utils/error_codes.py†L15-L94】
PAYMENT_ALREADY_EXECUTED | 409 | Payment already processed | `error_codes` catalog | 【F:app/utils/error_codes.py†L16-L99】
NOT_ESCROW_PROVIDER | 403 | Not escrow provider | `error_codes` catalog | 【F:app/utils/error_codes.py†L17-L104】
NOT_ESCROW_SENDER | 403 | Not escrow sender | `error_codes` catalog | 【F:app/utils/error_codes.py†L18-L109】
NOT_ESCROW_PARTICIPANT | 403 | Not escrow participant | `error_codes` catalog | 【F:app/utils/error_codes.py†L19-L114】
EXIF_MISSING | 422 | Missing EXIF timestamp/metadata | `error_codes` catalog | 【F:app/utils/error_codes.py†L22-L120】
EXIF_TIMESTAMP_INVALID | 422 | Invalid EXIF timestamp | `error_codes` catalog | 【F:app/utils/error_codes.py†L23-L126】
GEOFENCE_VIOLATION | 422 | Proof outside geofence | `error_codes` catalog | 【F:app/utils/error_codes.py†L24-L132】
UNSUPPORTED_FILE_TYPE | 400 | Unsupported file type | `error_codes` catalog | 【F:app/utils/error_codes.py†L25-L138】
OCR_FAILED | 400 | OCR failed (soft fail) | `error_codes` catalog | 【F:app/utils/error_codes.py†L26-L143】
AI_PROOF_ERROR | 400 | AI advisor failed (soft fail) | `error_codes` catalog | 【F:app/utils/error_codes.py†L27-L148】
FRAUD_PIPELINE_ERROR | 400 | Fraud pipeline failed (soft fail) | `error_codes` catalog | 【F:app/utils/error_codes.py†L28-L153】
FRAUD_HIGH_RISK | 400 | Fraud high-risk signal | `error_codes` catalog | 【F:app/utils/error_codes.py†L29-L158】
PAYOUT_EXECUTION_FAILED | 502 | Payout execution failed | `error_codes` catalog | 【F:app/utils/error_codes.py†L30-L164】
MANDATE_PAYOUT_DESTINATION_INVALID | 422 | Invalid mandate destination | `error_codes` catalog | 【F:app/utils/error_codes.py†L31-L170】
DIRECT_PAY_REGISTRY_DISABLED | 409 | Registry disabled | `error_codes` catalog | 【F:app/utils/error_codes.py†L32-L175】
DIRECT_PAY_SUGGESTIONS_DISABLED | 409 | Suggestions disabled | `error_codes` catalog | 【F:app/utils/error_codes.py†L33-L180】
MERCHANT_REGISTRY_NOT_FOUND | 404 | Registry entry missing | `error_codes` catalog | 【F:app/utils/error_codes.py†L34-L186】
MERCHANT_SUGGESTION_NOT_FOUND | 404 | Suggestion missing | `error_codes` catalog | 【F:app/utils/error_codes.py†L35-L192】
MERCHANT_SUGGESTION_INVALID_STATE | 409 | Suggestion invalid state | `error_codes` catalog | 【F:app/utils/error_codes.py†L36-L198】
MERCHANT_SUGGESTION_NOT_PROMOTED | 409 | Suggestion not promoted | `error_codes` catalog | 【F:app/utils/error_codes.py†L37-L204】
MERCHANT_BLACKLISTED | 409 | Merchant blacklisted | `error_codes` catalog | 【F:app/utils/error_codes.py†L38-L210】
MERCHANT_SUSPENDED | 409 | Merchant suspended | `error_codes` catalog | 【F:app/utils/error_codes.py†L39-L216】
MERCHANT_MATCH_MISMATCH | 409 | Merchant mismatch | `error_codes` catalog | 【F:app/utils/error_codes.py†L40-L222】
MERCHANT_MATCH_UNKNOWN | 409 | Merchant match unknown | `error_codes` catalog | 【F:app/utils/error_codes.py†L41-L227】
MANDATE_TARGET_XOR_VIOLATION | 400 | Beneficiary target XOR | `error_codes` catalog | 【F:app/utils/error_codes.py†L42-L234】
BENEFICIARY_IDENTITY_REQUIRED | 400 | Beneficiary identity required | `error_codes` catalog | 【F:app/utils/error_codes.py†L43-L239】

**Domain authorization error codes**
- `FORBIDDEN`, `ADVISOR_CANNOT_DECIDE`, `NOT_ESCROW_*`, `PROVIDER_ONLY_UPLOAD` are defined as domain-level codes for authorization checks.【F:app/errors/domain_errors.py†L8-L16】

---

## 9. Versioning & stability guarantees
- No versioned URL prefix is configured; routers are mounted at the root (`/`).【F:app/main.py†L214-L219】【F:app/routers/__init__.py†L33-L63】
- Numeric fields are normalized to deterministic JSON strings (not floats), including canonical formatting for `ai_score` and `ai_score_ml`.【F:app/utils/json.py†L10-L58】
- `ProofRead` exposes a stable `proof_id` alias equal to `id` for polling compatibility.【F:app/schemas/proof.py†L111-L117】
- Error payloads retain backward-compatible `context` and `field_errors` fields to avoid breaking clients.【F:app/utils/errors.py†L25-L45】

---

## 10. Security considerations (PII, redaction, logging, replay/idempotency)
**PII & redaction**
- Beneficiary profiles implement masking for sensitive fields (`bank_account`, national ID, address, etc.) and expose public-safe views with `masked=true`.【F:app/schemas/beneficiary.py†L96-L175】
- User profile reads support masking of `bank_account` and `national_id_number` when requested by service logic.【F:app/schemas/user_profile.py†L29-L53】
- Advisor proof views explicitly mask amounts (`invoice_total_amount`, `invoice_currency`) and sender identifiers when listing proofs for advisors.【F:app/routers/advisors.py†L36-L40】【F:app/routers/advisors.py†L70-L98】

**Scope enforcement reminder**
- Backend enforces API key scopes via `require_scope`; UIs and partner clients should also prevent disallowed actions client-side (defense-in-depth).【F:app/security/__init__.py†L136-L153】

**Replay protection & idempotency**
- PSP webhook replay protection is enforced via in-memory recent-event checks and database-level provider/event_id dedupe, returning `WEBHOOK_REPLAY`.【F:app/services/psp_webhooks.py†L325-L516】
- Escrow deposits require an `Idempotency-Key` header and store unique idempotency keys in `EscrowDeposit`.【F:app/routers/escrow.py†L101-L124】【F:app/models/escrow.py†L130-L139】
- Transaction creation and spend purchase creation accept `Idempotency-Key` headers for idempotent processing.【F:app/routers/transactions.py†L53-L69】【F:app/routers/spend.py†L72-L86】

**Sensitive metadata surfaces**
- Proof model stores raw `metadata`, `invoice_merchant_metadata`, AI scores, and merchant match data; schemas expose metadata and AI fields, so clients should handle with care and follow redaction rules in service responses.【F:app/models/proof.py†L39-L145】【F:app/schemas/proof.py†L83-L117】
- OCR/EXIF/geofence validation outcomes are expressed via error codes (`OCR_FAILED`, `EXIF_MISSING`, `EXIF_TIMESTAMP_INVALID`, `GEOFENCE_VIOLATION`), indicating sensitive image/OCR processing occurs server-side; these codes are returned as standard errors when applicable.【F:app/utils/error_codes.py†L22-L143】
- Pricing reference/inflation APIs are admin-only under `/admin/pricing` via `require_pricing_admin_scope`, keeping pricing internals out of sender/provider surfaces.【F:app/routers/admin_pricing_reference.py†L19-L43】【F:app/routers/admin_pricing_inflation.py†L24-L143】【F:app/security/__init__.py†L158-L166】

---

## 11. Diagrams (API surface + state machine overview)

### 11.1 Router aggregation (text)
```
FastAPI app
  ├─ get_api_router()
  │   ├─ /health
  │   ├─ /auth
  │   ├─ /users
  │   ├─ /admin/users
  │   ├─ /me/profile
  │   ├─ /transactions
  │   ├─ /escrows
  │   ├─ /admin/merchant-suggestions
  │   ├─ /admin/tools (review-queue, risk snapshots, fraud comparison)
  │   ├─ /admin/settings
  │   ├─ /alerts
  │   ├─ /beneficiaries
  │   ├─ /mandates
  │   ├─ /merchant-suggestions
  │   ├─ /spend
  │   ├─ /psp
  │   ├─ /proofs
  │   ├─ /files
  │   ├─ /payments, /admin/payments
  │   ├─ /admin/advisors
  │   ├─ /admin/pricing/*
  │   ├─ /advisor/*
  │   ├─ /debug/stripe
  │   └─ /external/*
  ├─ /apikeys
  ├─ /kct_public/*
  └─ /sender/dashboard
```
Evidence: router registration and mounting.【F:app/routers/__init__.py†L33-L63】【F:app/main.py†L214-L219】

### 11.2 E2E pipeline diagram (escrow → milestone → proof → merchant/pricing/fraud → payout → webhook)
```
Sender (API key)
  └─ POST /escrows → EscrowAgreement (DRAFT/FUNDED/...) → milestones
        └─ POST /escrows/{id}/deposit (Idempotency-Key)
             └─ Proof upload: POST /files/proofs → POST /proofs
                   └─ Proof review/decision → payment execution
                        └─ POST /payments/execute/{id}
                             └─ PSP webhook settlement (/psp/webhook or /psp/stripe/webhook)
```
Evidence: escrow/proof/payment/PSP routes and state transitions.【F:app/routers/escrow.py†L79-L249】【F:app/routers/uploads.py†L74-L162】【F:app/routers/proofs.py†L36-L178】【F:app/routers/payments.py†L27-L43】【F:app/routers/psp.py†L17-L30】

### 11.3 State machine overview (text)
```
Escrow: DRAFT -> FUNDED -> RELEASABLE -> RELEASED
        DRAFT/FUNDED -> CANCELLED
        FUNDED/RELEASABLE -> REFUNDED

Milestone: WAITING -> PENDING_REVIEW -> APPROVED -> PAYING -> PAID
          PENDING_REVIEW -> REJECTED
          APPROVED -> PENDING_REVIEW (re-review)

Proof: PENDING -> APPROVED/REJECTED
      APPROVED -> REJECTED

Payment: PENDING -> SENT/SETTLED/ERROR
        SENT -> SETTLED/ERROR
        SETTLED -> REFUNDED
```
Evidence: state machine definitions for escrow/milestone/proof/payment.【F:app/services/state_machines.py†L53-L239】

---

## 12. API readiness checklist + score
**Checklist (evidence-based)**
Item | Status | Evidence
---|---|---
Auth via API keys + scopes | ✅ | 【F:app/security/__init__.py†L21-L153】
Standard error model | ✅ | 【F:app/utils/errors.py†L17-L44】【F:app/main.py†L222-L284】
Idempotency coverage (escrow deposit / transactions / spend) | ✅ | 【F:app/routers/escrow.py†L101-L124】【F:app/routers/transactions.py†L53-L69】【F:app/routers/spend.py†L72-L86】
PSP webhook replay protection | ✅ | 【F:app/services/psp_webhooks.py†L325-L516】
Pagination conventions (limit/offset + PaginatedResponse) | ✅ | 【F:app/schemas/pagination.py†L6-L21】【F:app/routers/escrow.py†L33-L76】
Explicit state machines for escrow/milestone/proof/payment | ✅ | 【F:app/services/state_machines.py†L53-L212】
Public versioning prefix | ❌ (Not found) | 【F:app/main.py†L214-L219】
Mounted admin dashboard endpoints | ⚠️ (Defined but not mounted) | 【F:app/routers/admin_dashboard.py†L11-L28】【F:app/routers/__init__.py†L33-L63】

**Score**: 6 / 8 criteria fully satisfied (75%).

---

## 13. Deprecations

Deprecated surfaces remain available temporarily for compatibility but MUST NOT be used for new client implementations.

| Deprecated surface | Replacement | Status | Notes |
|---|---|---|---|
| GET /proofs?review_mode=review_queue | GET /admin/proofs/review-queue | Deprecated | Admin/support only; emits `Deprecation: true` with successor `Link`; will be removed after frontend migration |
