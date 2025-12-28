% Backend mandate, milestone, and identity audit

## A) Data model evidence
- **User (`app/models/user.py`)**: stores `username`, `email`, `role`, payout and Stripe fields; no profile attributes like names, address, phone, bank account, or national ID.【F:app/models/user.py†L25-L51】
- **UsageMandate (`app/models/usage_mandate.py`)**: `sender_id` and `beneficiary_id` FKs to `users`, payout destination fields, merchant linkage, and monetary limits.【F:app/models/usage_mandate.py†L53-L102】
- **EscrowAgreement (`app/models/escrow.py`)**: `sender_user_id`, `provider_user_id`, `beneficiary_id` (FK to `beneficiary_profiles`), amount, release_conditions JSON, deadline, payout destination, merchant refs.【F:app/models/escrow.py†L58-L100】
- **BeneficiaryProfile (`app/models/beneficiary.py`)**: optional FK `user_id` to `users`; stores `full_name`, contact, payout, and metadata fields—missing required off-platform identity fields (first/last name, address, phone, bank_account, national_id).【F:app/models/beneficiary.py†L25-L40】
- **Milestone (`app/models/milestone.py`)**: `escrow_id`, `idx` (sequence), label, amount/currency, `proof_type`/requirements JSON, geofence, status, validator role; unique per-escrow sequence constraint and positive amount/index checks.【F:app/models/milestone.py†L65-L107】
- **Proof (`app/models/proof.py`)**: ties to `escrow_id` and `milestone_id`, stores type, storage refs, SHA256, metadata, status, AI/advisor fields, invoice merchant metadata, uploader FK with validator enforcing sender/provider context.【F:app/models/proof.py†L29-L183】
- **Merchant registry/observed (`app/models/merchants.py`)**: registry entries with tax/bank/contact fields; observed merchant captures raw/canonical names and optional tax/account linkage.【F:app/models/merchants.py†L34-L121】
- **MerchantSuggestion (`app/models/direct_pay.py`)**: sender-submitted merchant suggestions with `name`, contact, optional `tax_id` or `account_number`, mandate/escrow linkage, status, metadata.【F:app/models/direct_pay.py†L38-L92】

## B) Endpoint evidence
- **Mandate creation & sender derivation**: `/mandates` POST router delegates to `create_mandate` service without overriding `sender_id`; client-provided `payload.sender_id` is persisted into `SmartMandate`/`UsageMandate` directly.【F:app/routers/mandates.py†L20-L24】【F:app/services/mandates.py†L171-L217】
- **Escrow creation**: `/escrows` POST accepts `sender_user_id` in payload; service trusts payload, resolves optional provider, and may create `BeneficiaryProfile` if provided.【F:app/routers/escrow.py†L79-L99】【F:app/services/escrow.py†L226-L345】
- **Milestone creation path**: admin POST `/escrows/{id}/milestones` pipes to `create_milestone_for_escrow`, validating currency/amount/sequence and storing proof requirements JSON before inserting `Milestone` rows.【F:app/routers/escrow.py†L252-L285】【F:app/services/escrow.py†L946-L1022】
- **Proof gating logic**: proof submission moves the linked milestone to `PENDING_REVIEW`, enforces a single active proof per milestone, and applies geofence/EXIF validations when applicable.【F:app/services/proofs.py†L908-L1050】【F:app/services/proofs.py†L2362-L2395】
- **Beneficiary creation/linking**: `BeneficiaryCreate` schema includes optional `user_id`; escrow creation directly persists a `BeneficiaryProfile` with that user reference when provided.【F:app/schemas/escrow.py†L19-L35】【F:app/services/escrow.py†L271-L285】
- **Direct Pay merchant suggestion**: `/merchant-suggestions` POST accepts payload with `name`, optional contact, optional `tax_id` or `account_number`; no validation enforcing “VAT number OR bank_account” requirement.【F:app/routers/merchant_suggestions.py†L20-L40】【F:app/schemas/merchant_suggestions.py†L14-L49】【F:app/services/merchant_suggestions.py†L23-L58】

## C) Pass/Fail matrix
| Requirement | Status | Evidence | Risk | Fix recommendation |
| --- | --- | --- | --- | --- |
| (1) Single User can act as sender or provider per mandate context | **PASS** | Escrow stores `sender_user_id` and `provider_user_id`; user roles include sender/provider/both, allowing contextual assignment.【F:app/models/escrow.py†L58-L107】【F:app/models/user.py†L27-L47】 | Low | Keep contextual role checks; add explicit validation if same-user role conflicts become a concern (P2). |
| (2) Milestones: zero-or-more; proofs required to unlock; zero milestones = simple escrow | **PARTIAL** | Milestones and proof gating exist; proofs push milestones to review. However, escrows can be created without milestones and release_conditions have no enforcement path ensuring proof/milestone presence before payout for zero-milestone flows.【F:app/services/proofs.py†L2362-L2395】【F:app/services/escrow.py†L226-L345】 | Medium | Define release policy for zero-milestone escrows and enforce proof/milestone checks before release; add tests for no-milestone escrows (P1). |
| (3) Mandate creation auto-includes sender ID server-side | **FAIL** | Mandate creation trusts client-supplied `sender_id` without deriving from authenticated user/API key.【F:app/services/mandates.py†L171-L217】【F:app/routers/mandates.py†L20-L24】 | High | Derive sender from API key/session server-side, ignore/validate payload sender_id mismatch, and cover with auth-bound tests (P0). |
| (4) Beneficiary != Provider; off-platform beneficiary fields required | **FAIL** | No check preventing provider=beneficiary; `BeneficiaryProfile` lacks required identity fields (first/last name, address, phone, bank_account, national_id) and creation is optional/unchecked.【F:app/models/beneficiary.py†L25-L40】【F:app/services/escrow.py†L271-L285】 | High | Enforce provider!=beneficiary, extend BeneficiaryProfile/schema with required identity fields, and validate at escrow creation (P0). |
| (5) User profile stores full identity/contact/banking/residency info | **FAIL** | User model stores only username/email/role/payout flags—no personal identity, address, phone, bank account, national ID, languages, or regions.【F:app/models/user.py†L25-L51】 | High | Add user profile fields/models + update schemas/endpoints to read/write them; include migrations and tests (P0). |
| (6) Beneficiaries stored with FK to owning User | **PARTIAL** | `BeneficiaryProfile.user_id` FK exists but nullable; creation accepts arbitrary `user_id` without ownership/authorization enforcement.【F:app/models/beneficiary.py†L25-L40】【F:app/services/escrow.py†L271-L285】 | Medium | Make ownership mandatory or validate linkage to the authenticated sender; backfill nulls with migrations and add auth checks (P1). |
| (7) Direct Pay merchant suggestion requires merchant identity + VAT or bank | **FAIL** | Schema/service allow suggestions without tax_id or account_number; no validation that at least one is present despite requirement.【F:app/schemas/merchant_suggestions.py†L14-L49】【F:app/services/merchant_suggestions.py†L23-L58】 | Medium | Add validation enforcing VAT (tax_id) or bank account presence and extend tests to cover rejection paths (P1). |

## D) Missing/ambiguous items and proposed minimal changes (do not implement now)
- **Sender derivation for mandates**: Resolve sender from authenticated principal (API key/user session) in router/service, reject mismatched payloads, and adjust tests accordingly. Update mandate schemas to omit or mark `sender_id` read-only; add migration safeguards if needed.
- **Beneficiary identity completeness and constraints**: Add first/last name, address, phone, bank_account, and national_id fields to `BeneficiaryProfile` + Pydantic schemas; enforce provider!=beneficiary during escrow creation; create migrations and validator tests.
- **User profile enrichment**: Introduce profile fields (first_name, last_name, email, address, phone, bank_account, national_id, spoken_languages, residence_region, habitual_send_region) on the user or a linked profile model; expose update endpoints and add tests.
- **Zero-milestone escrow policy**: Define and enforce release policy when `release_conditions.requires_proof` is true but no milestones exist (e.g., block release until a proof record exists or disallow zero milestones when proof is required); add service tests.
- **Beneficiary ownership enforcement**: Require `user_id` on beneficiary creation to match the authenticated sender or default it to sender; add authorization checks and migrations to backfill null `user_id` and constrain FK non-null where appropriate.
- **Merchant suggestion validation**: Require either `tax_id` (VAT) or `account_number` in merchant suggestion schema/service validation; extend tests for acceptance/rejection of payloads.

## E) Inspected files
- REPO_CHANGE_CONTRACT.md
- HORIZON/document.md
- app/models/user.py
- app/models/usage_mandate.py
- app/models/escrow.py
- app/models/beneficiary.py
- app/models/milestone.py
- app/models/proof.py
- app/models/merchants.py
- app/models/direct_pay.py
- app/routers/mandates.py
- app/services/mandates.py
- app/schemas/mandates.py
- app/routers/escrow.py
- app/services/escrow.py
- app/schemas/escrow.py
- app/services/proofs.py
- app/routers/merchant_suggestions.py
- app/schemas/merchant_suggestions.py
- app/services/merchant_suggestions.py
