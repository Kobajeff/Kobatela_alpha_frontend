<!--
  Frontend-facing UX + data contract for Mandate → Escrow interactions.
  V2: focused on mandate + escrow flows only, strictly backed by backend endpoints/schemas.
-->

# FRONTEND_MANDATE_ESCROW_UX_CONTRACT (V2)

## What changed (V2)
* Re-scoped to Mandate ↔ Escrow interactions only (no milestones/proofs/payouts).
* Added explicit data mapping + non-mapping TODOs based on current schemas.
* Documented UX flows for classic mandate, Direct Pay mandate, standalone escrow, and UI-only bridge CTA.
* Added safety rules: role constraints, forbidden fields, and mandate creation error handling.

---

## 0) Sources of truth (backend-only)
* Mandate endpoints + scope enforcement: `POST /mandates` sender-only, `GET /mandates`/`GET /mandates/{id}` sender/provider/support/admin.【F:app/routers/mandates.py†L32-L74】
* Mandate schemas: `UsageMandateCreate/Read` (beneficiary target XOR, payout destination fields).【F:app/schemas/mandates.py†L29-L129】
* Direct Pay enums: `PayoutDestinationType` values `BENEFICIARY_PROVIDER` / `MERCHANT`.【F:app/models/direct_pay.py†L14-L18】
* Mandate creation validations + error codes (sender spoof, target XOR, direct-pay merchant rules).【F:app/services/mandates.py†L201-L296】【F:app/use_cases/protocol/create_smart_mandate.py†L55-L106】
* Escrow endpoint + schema: `POST /escrows` sender-only; `EscrowCreate` fields and aliases.【F:app/routers/escrow.py†L79-L98】【F:app/schemas/escrow.py†L22-L37】
* Escrow creation rules: sender required/spoof blocked, provider vs beneficiary XOR, provider eligibility, public/aid domain gate.【F:app/services/escrow.py†L232-L276】【F:app/services/escrow.py†L1152-L1186】
* Beneficiary schemas: `BeneficiaryCreate` (escrow) and `BeneficiaryOffPlatformCreate` (mandate).【F:app/schemas/beneficiary.py†L12-L93】
* Merchant suggestion endpoints for optional pre-step (sender-only).【F:app/routers/merchant_suggestions.py†L20-L63】

---

## 1) Data mapping (Mandate → Escrow)
> **Scope:** mapping is **UI-only prefill**. There is **no backend endpoint** to create escrows from mandates.

### 1.1 Fields that can be mapped (UI prefill)
Mandate field (UsageMandateRead) | Escrow create field (EscrowCreate) | When allowed | Notes | Evidence
---|---|---|---|---
`beneficiary_id` | `provider_user_id` | Mandate target kind is on-platform user | Usage mandates treat `beneficiary_id` as the on-platform beneficiary user; `provider_user_id` is the on-platform receiver in escrow creation. | Mandate target fields + `provider_user_id` alias【F:app/schemas/mandates.py†L95-L129】; EscrowCreate `provider_user_id`【F:app/schemas/escrow.py†L22-L33】
`provider_user_id` (computed alias) | `provider_user_id` | Same as above | `provider_user_id` is an alias of `beneficiary_id` in mandate reads; safe to prefill. | Computed field alias in mandate read【F:app/schemas/mandates.py†L124-L129】
`total_amount` | `amount_total` | Optional prefill | Mandate total amount can be used as default escrow amount, but escrow still requires explicit confirmation. | Mandate amount field【F:app/schemas/mandates.py†L29-L35】; EscrowCreate amount【F:app/schemas/escrow.py†L33-L35】
`currency` | `currency` | Optional prefill | Both use 3-letter uppercase currency; escrow restricts to USD/EUR. | Mandate currency normalization【F:app/schemas/mandates.py†L30-L47】; Escrow currency restriction【F:app/schemas/escrow.py†L33-L35】

### 1.2 Fields that **cannot** be mapped (TODO)
Mandate field | Why it cannot map to escrow create | Evidence
---|---|---
`beneficiary_profile` (public) | Escrow requires full `BeneficiaryCreate` (email, phone, address, bank details, national ID). Mandate public profile lacks these required fields. UI must collect them again. | Beneficiary public read fields are minimal【F:app/schemas/beneficiary.py†L160-L171】 vs escrow `BeneficiaryCreate` required fields【F:app/schemas/beneficiary.py†L12-L79】
`expires_at` | Escrow requires `deadline_at`, which is a different concept; no explicit mapping in backend. | Mandate `expires_at`【F:app/schemas/mandates.py†L34-L47】 vs escrow `deadline_at`【F:app/schemas/escrow.py†L33-L36】
`payout_destination_type` / `merchant_registry_id` / `merchant_suggestion` | Escrow creation has **no merchant fields**; no backend mapping exists. | Mandate direct pay fields【F:app/schemas/mandates.py†L66-L77】 vs EscrowCreate fields (no merchant data)【F:app/schemas/escrow.py†L22-L37】

---

## 2) UX flows (Mandate ↔ Escrow)

### 2.1 Create Mandate — Classic (beneficiary/provider destination)
**Role:** sender only (API key scope).【F:app/routers/mandates.py†L32-L41】

**Request:** `POST /mandates`
* Provide exactly one of `beneficiary_id` (on-platform) **or** `beneficiary` (off-platform). XOR enforced in schema/service.【F:app/schemas/mandates.py†L66-L89】【F:app/services/mandates.py†L231-L248】
* `total_amount`, `currency`, `expires_at` required; currency is normalized to uppercase; expiry normalized to UTC.【F:app/schemas/mandates.py†L29-L47】
* `payout_destination_type` can be omitted; backend defaults to `BENEFICIARY_PROVIDER`.【F:app/use_cases/protocol/create_smart_mandate.py†L55-L73】【F:app/models/direct_pay.py†L14-L18】

**UI notes:**
* Do **not** send `sender_id`; it is derived from the API key and spoofing is blocked.【F:app/schemas/mandates.py†L66-L74】【F:app/services/mandates.py†L231-L238】
* If choosing off-platform `beneficiary`, the payload must satisfy `BeneficiaryOffPlatformCreate` requirements (bank account + min phone length).【F:app/schemas/beneficiary.py†L82-L93】

### 2.2 Create Mandate — Direct Pay (merchant destination)
**Role:** sender only.【F:app/routers/mandates.py†L32-L41】

**Request:** `POST /mandates` with `payout_destination_type=MERCHANT`.
* Exactly one of `merchant_registry_id` **or** `merchant_suggestion` must be provided; otherwise 422 `MANDATE_PAYOUT_DESTINATION_INVALID`.【F:app/use_cases/protocol/create_smart_mandate.py†L74-L83】
* Direct-pay feature flags can block creation (`DIRECT_PAY_REGISTRY_DISABLED` or `DIRECT_PAY_SUGGESTIONS_DISABLED`).【F:app/use_cases/protocol/create_smart_mandate.py†L85-L105】
* If using `merchant_registry_id`, backend validates registry existence; otherwise 404 `MERCHANT_REGISTRY_NOT_FOUND`.【F:app/use_cases/protocol/create_smart_mandate.py†L85-L97】

**Optional pre-step:** create a merchant suggestion independently via `POST /merchant-suggestions` (sender-only) if the UI prefers a dedicated suggestion flow.【F:app/routers/merchant_suggestions.py†L20-L29】

### 2.3 Create Escrow independently (no mandate dependency)
**Role:** sender only (`POST /escrows`).【F:app/routers/escrow.py†L79-L98】

**Request:** `EscrowCreate` fields:
* `provider_user_id` **or** `beneficiary` (external profile) — mutually exclusive; backend returns 400 `INVALID_BENEFICIARY_CONTEXT` if both are set.【F:app/schemas/escrow.py†L22-L37】【F:app/services/escrow.py†L268-L276】
* `amount_total`, `currency` (USD/EUR), `release_conditions`, `deadline_at` required.【F:app/schemas/escrow.py†L33-L37】

**Constraints:**
* Sender identity is derived from the API key; spoofing `sender_user_id` is blocked with 403 `SENDER_SPOOF_BLOCKED` when mismatched.【F:app/services/escrow.py†L1152-L1186】
* Provider must exist and be eligible; invalid providers return 400 `UNKNOWN_PROVIDER` or `INVALID_PROVIDER_ROLE`.【F:app/services/escrow.py†L240-L255】
* Public/Aid domains are restricted to GOV/ONG users; otherwise 403 `PUBLIC_DOMAIN_FORBIDDEN`.【F:app/services/escrow.py†L257-L266】

### 2.4 “Bridge” CTA — Prefill Escrow from Mandate (UI-only)
**No backend endpoint exists** to create an escrow from a mandate. The CTA must only prefill the existing escrow creation form using the mapping above.

**Suggested prefill rules (UI-only):**
* If mandate target is on-platform (`beneficiary_id` present), prefill `provider_user_id` and show receiver as on-platform provider.【F:app/schemas/mandates.py†L95-L129】
* Prefill `amount_total` and `currency` from mandate if desired, but require user confirmation.【F:app/schemas/mandates.py†L29-L35】【F:app/schemas/escrow.py†L33-L35】
* If mandate target is off-platform (beneficiary profile), collect the full `BeneficiaryCreate` payload; do **not** assume mandate profile is sufficient.【F:app/schemas/beneficiary.py†L12-L79】【F:app/schemas/beneficiary.py†L160-L171】

---

## 3) Safety rules

### 3.1 Role constraints (must enforce in UI)
* `POST /mandates` is sender-only (API key scope).【F:app/routers/mandates.py†L32-L41】
* `POST /escrows` is sender-only (API key scope).【F:app/routers/escrow.py†L79-L98】
* `POST /merchant-suggestions` is sender-only when used for Direct Pay setup.【F:app/routers/merchant_suggestions.py†L20-L29】

### 3.2 Forbidden or unsafe fields (UI must block)
Forbidden input | Why | Evidence
---|---|---
`sender_id` in mandate payload | Sender is derived from API key; mismatches return 403 `SENDER_SPOOF_BLOCKED`. | Sender_id deprecated in schema + spoof check【F:app/schemas/mandates.py†L66-L74】【F:app/services/mandates.py†L231-L238】
`sender_user_id` in escrow payload (sender UI flow) | Sender derived from API key; mismatches return 403 `SENDER_SPOOF_BLOCKED`. | Escrow sender spoof check【F:app/services/escrow.py†L1152-L1186】
Both `beneficiary_id` and `beneficiary` in mandate payload | XOR enforced with 400 `MANDATE_TARGET_XOR_VIOLATION`. | Mandate XOR validation【F:app/schemas/mandates.py†L79-L88】
Both `provider_user_id` and `beneficiary` in escrow payload | XOR enforced with 400 `INVALID_BENEFICIARY_CONTEXT`. | Escrow XOR validation【F:app/services/escrow.py†L268-L276】
`merchant_registry_id`/`merchant_suggestion` when `payout_destination_type=BENEFICIARY_PROVIDER` | Merchant details are rejected for classic mandates with 422 `MANDATE_PAYOUT_DESTINATION_INVALID`. | Direct pay validation【F:app/use_cases/protocol/create_smart_mandate.py†L62-L71】
Both `merchant_registry_id` and `merchant_suggestion` when `payout_destination_type=MERCHANT` | Must provide exactly one; otherwise 422 `MANDATE_PAYOUT_DESTINATION_INVALID`. | Direct pay validation【F:app/use_cases/protocol/create_smart_mandate.py†L74-L83】

### 3.3 Mandate creation error handling (UI expectations)
Error code | Typical cause | UI action | Evidence
---|---|---|---
`SENDER_SPOOF_BLOCKED` (403) | Sender ID does not match authenticated API key. | Clear form, re-auth, do not retry with same payload. | Mandate create validation【F:app/services/mandates.py†L231-L238】
`MANDATE_TARGET_XOR_VIOLATION` (400) | Both or neither of `beneficiary_id` and `beneficiary` provided. | Enforce radio choice and re-submit. | Mandate target validation【F:app/schemas/mandates.py†L79-L88】
`MANDATE_PAYOUT_DESTINATION_INVALID` (422) | Merchant fields missing/extra for Direct Pay settings. | Display field errors, block submission. | Direct pay validation【F:app/use_cases/protocol/create_smart_mandate.py†L62-L83】
`DIRECT_PAY_REGISTRY_DISABLED` / `DIRECT_PAY_SUGGESTIONS_DISABLED` (409) | Feature flags disabled for Direct Pay registry/suggestions. | Show “temporarily unavailable” and offer classic mandate path. | Direct pay feature flag checks【F:app/use_cases/protocol/create_smart_mandate.py†L85-L105】
`MERCHANT_REGISTRY_NOT_FOUND` (404) | Registry ID not found when using Direct Pay. | Prompt user to pick a valid merchant or create a suggestion. | Registry validation【F:app/use_cases/protocol/create_smart_mandate.py†L85-L97】
`USER_NOT_FOUND` (403) | API key not linked to a valid user (mandate creation). | Force re-auth and block submission. | Sender lookup in mandate router【F:app/routers/mandates.py†L21-L28】

---

## 4) Compliance checklist (V2)
* ✅ All Mandate/Escrow flows reference existing endpoints only.
* ✅ No backend call for “mandate → escrow” bridge; UI-only prefill described.
* ✅ Field mappings limited to what schemas support; missing data explicitly flagged as TODO.
* ✅ Role gating and error semantics are derived from backend code.
