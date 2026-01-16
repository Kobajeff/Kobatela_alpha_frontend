Status: Canonical (proof-bound expectations)  
Deprecated sections removed: escrow/milestone-bound expectations  
Aligned references: docs/API_GUIDE.md, docs/FRONTEND_API_GUIDE.md

# Proof Expectations & Checks (Proof-Bound Model)

This document is the canonical reference for how proof expectations are defined, stored, and consumed. It aligns with the current API contracts in `docs/API_GUIDE.md` and `docs/FRONTEND_API_GUIDE.md`. Legacy escrow/milestone fraud-config flows are deprecated and must not be treated as active.

## 1) Definitions (contract-aligned)

### Proof Request
A proof request is implemented as a **Proof row in `REQUESTED` status** with attached **ProofExpectations**. Expectations are proof-bound and are not stored on escrows or milestones.

### Proof Expectations storage (proof-bound)
Expectations are stored in `proof_expectations` and are bound to a proof by `proof_id`. The stored fields are:
- `requested_format`
- `requested_content`
- `fraud_context_expectations`
- `document_checks_expectations` (conditional)
- `proof_requirements_json` (format/content + file constraints only)

## 2) Endpoint chain (UX-ready)

### A) Create proof request
**POST** `/escrows/{escrow_id}/proof-requests`
- Required fields: `requested_format`, `requested_content`, `fraud_context_expectations`
- Optional: `document_checks_expectations` (only when allowed, see rules below)
- This creates a **REQUESTED proof** with proof-bound expectations attached.

### B) Upload file
**POST** `/files/proofs`
- Returns `storage_url` + `sha256` for use in the submit step.

### C) Submit proof linked to request
**POST** `/proofs`
- Link to the proof request using `proof_request_id` (or the proof’s `proof_id` when provided by the UI contract).
- Proof submission resolves expectations from the proof-bound record associated with the request.
- Milestone usage rules (required/optional) follow the escrow payment mode constraints described in `docs/FRONTEND_API_GUIDE.md`.

## 3) Format/content matrix (contract)

Requested format/content must match the allowed matrix below. Invalid combinations are rejected.

| requested_format | allowed requested_content |
| --- | --- |
| `PDF` | `INVOICE`, `CONTRACT`, `OTHER` |
| `PHOTO` | `INVOICE`, `WORK_PROGRESS`, `PRODUCT`, `MATERIAL`, `PROOF_OF_DELIVERY` |
| `VIDEO` | `WORK_PROGRESS`, `PRODUCT`, `MATERIAL`, `PROOF_OF_DELIVERY` |

## 4) Expectations rules (strict separation)

### fraud_context_expectations
- **Always required** on proof requests.
- Holds context/purpose/geo/hints/policy inputs as defined in the API guides.

### document_checks_expectations
- **Allowed only** for invoice proofs:
  - `requested_content = INVOICE` **and**
  - `requested_format` in `{PDF, PHOTO}`
- Otherwise rejected.
- Holds invoice/document comparison expectations as defined in the API guides:
  - `expected_amount`, `expected_currency`, `amount_tolerance`, `expected_merchant_name`,
    `expected_merchant_country`, `expected_iban`, `expected_vat_number`,
    `enforce_match`, `require_observed_fields`.

### proof_requirements_json
- Format/content/file constraints only (e.g., allowed file kinds, allowed mime types).
- Must not duplicate `fraud_context_expectations` or `document_checks_expectations`.

## 5) Multi-proof support
- An escrow may have **multiple proof requests** of different kinds.
- A milestone may have **one or more** proof requests.
- An escrow may require proof **without milestones** when allowed by the contract described in `docs/FRONTEND_API_GUIDE.md`.

## 6) Fraud pipeline usage (high-level)
- On proof submission, expectations are **loaded from the proof-bound record** attached to the request.
- OCR extraction occurs for invoice content and feeds document checks comparisons.
- Document checks and comparisons produce flags/metadata and may route to review.
- No escrow/milestone expectation merges are part of the active pipeline.

## 7) Deprecated legacy paths (explicit)
The following are deprecated and must not be treated as active:
- Legacy escrow/milestone fraud-config endpoints:
  - `/sender/escrows/{escrow_id}/fraud-config`
  - `/sender/escrows/{escrow_id}/milestones/{milestone_idx}/fraud-config`
- Escrow `release_conditions_json` fraud-config expectations and milestone proof requirements storage are not part of the active model.

