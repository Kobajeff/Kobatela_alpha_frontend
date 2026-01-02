# PROOF_UPLOAD_EXTERNAL_AUDIT_V1

Status: drafted for external beneficiary proof flow (B8) — token-only contract.

## Endpoint inventory (external UI)
| Method | Path | Purpose | Auth | Response |
| --- | --- | --- | --- | --- |
| POST | `/external/proofs/tokens` | Issue single-use external proof token bound to escrow + milestone + beneficiary | API key (sender/support/admin) | `ExternalProofTokenResponse` |
| POST | `/external/tokens/beneficiary` | Issue beneficiary-scoped token (same shape as above) | API key (sender/support/admin) | `ExternalProofTokenResponse` |
| POST | `/external/files/proofs` | Upload proof file (multipart) | External token header | `ExternalProofUploadResponse` |
| POST | `/external/proofs/submit` | Submit proof metadata (token-scoped) | External token header | `ExternalProofSubmitResponse` |
| GET | `/external/escrows/summary` | Escrow + milestones summary (token-resolved) | External token header | `ExternalEscrowSummary` |
| GET | `/external/escrows/{escrow_id}` | Path fallback summary (must match token escrow) | External token header | `ExternalEscrowSummary` |
| GET | `/external/proofs/{proof_id}/status` | Poll proof status | External token header | `ExternalProofStatusResponse` |

## Token rules
- Official transport: `Authorization: Bearer <token>`; `X-External-Token` accepted equivalently. Query parameters are rejected (401). Tokens are never logged.【F:app/security/external_tokens.py†L1-L25】
- Scope: tokens are single-use by default (`max_uploads` defaults to 1) and escrow + milestone + beneficiary bound; `consume_external_proof_token` enforces purpose/expiry, rejects reused tokens with 410 (`TOKEN_ALREADY_USED`) and caps uploads with 410 (`TOKEN_UPLOAD_LIMIT_REACHED`).【F:app/services/external_proof_tokens.py†L38-L366】
- TTL: default 7 days; min 10 minutes; max 30 days. Custom TTL outside bounds returns 422 (`TOKEN_EXPIRY_TOO_SHORT`/`TOKEN_EXPIRY_TOO_LONG`).【F:app/services/external_proof_tokens.py†L26-L118】
- Issuers: sender (must own escrow), support, admin. Beneficiary_id must match escrow; otherwise 403 (`BENEFICIARY_MISMATCH`). Revocation is available via `/sender/external-proof-tokens/{token_id}/revoke` (idempotent, sets `revoked_at`).【F:app/services/external_proof_tokens.py†L58-L172】【F:app/services/external_proof_tokens.py†L520-L563】
- Token lifecycle statuses: `ACTIVE`, `EXPIRED`, `REVOKED`, `USED`; revoked/expired/used tokens surface 410 responses when consumed or reserved, and status is reflected on token reads.【F:app/services/external_proof_tokens.py†L38-L427】【F:app/routers/external_proof_tokens.py†L120-L172】

## Escrow resolution
- Token-only resolution is the default: `/external/escrows/summary` infers escrow_id from the token; path variant requires escrow_id to match the token (403 on mismatch).【F:app/routers/external_proofs.py†L318-L389】
- Submit accepts optional `escrow_id`/`milestone_idx`; when omitted, the token supplies values. If provided and mismatched, 403 (`TOKEN_ESCROW_MISMATCH` / `TOKEN_MILESTONE_MISMATCH`).【F:app/routers/external_proofs.py†L196-L276】

## Upload contract
- Request: `multipart/form-data` with `file` part; token via Authorization/X-External-Token header.
- Constraints: MIME types `image/jpeg`, `image/png`, `application/pdf`; max 5 MB for images, 10 MB for PDFs. Violations → 422 (`UNSUPPORTED_FILE_TYPE`, `FILE_TOO_LARGE`).【F:app/routers/external_proofs.py†L114-L169】【F:app/config.py†L77-L87】
- Response: `storage_key`, `storage_url`, `sha256`, `content_type`, `size_bytes`, `escrow_id`, `milestone_idx`. Storage errors → 500 (`FILE_UPLOAD_FAILED`).【F:app/routers/external_proofs.py†L138-L194】【F:app/schemas/external_proofs.py†L34-L55】

## Submit contract
- Request body (token-scoped): `type`, `storage_key`, `storage_url`, `sha256`, optional `metadata`; `escrow_id`/`milestone_idx` optional (token fills when missing).【F:app/routers/external_proofs.py†L196-L276】【F:app/schemas/external_proofs.py†L57-L99】
- Guards: token/escrow/milestone mismatch → 403; file namespace mismatch → 403; missing storage_url/sha256 → 422; token already bound to another file/proof → 409. Unknown uploader → 404; unresolved uploader context → 422.【F:app/routers/external_proofs.py†L196-L276】
- Response: `proof_id`, `status` (PENDING), `escrow_id`, `milestone_idx`, `created_at`. Token marked used after submit to prevent replays.【F:app/routers/external_proofs.py†L262-L276】【F:app/services/external_proof_tokens.py†L150-L213】

## Status / polling contract
- Endpoint: `GET /external/proofs/{proof_id}/status` with token header.
- Response: `proof_id`, `status`, `escrow_id`, `milestone_idx`, `submitted_at`, optional `reviewed_at`, `terminal` boolean (true when status in {APPROVED, REJECTED}).【F:app/routers/external_proofs.py†L392-L430】【F:app/schemas/external_proofs.py†L120-L138】
- Recommended polling: start at 3–5 s, back off exponentially to 15 s max with jitter; stop when `terminal` is true or after ~5 minutes total wait to avoid hammering (UI responsibility).

## Redaction rules (external vs sender vs admin/support)
| Field group | External beneficiary | Sender | Admin/Support |
| --- | --- | --- | --- |
| Escrow summary | Exposes escrow_id, status, currency, amount_total, milestones (idx/label/amount/status/requires_proof/last_proof_status); no user identities or bank data. | Full sender summary endpoints; identities already known to sender. | Full internal detail via `/escrows/*` & proof listings. |
| Proof upload/submit | Storage metadata only (storage_key/url/sha256/content_type/size); no uploader ids exposed. | Standard proof APIs expose uploader ids and metadata. | Full proof detail including metadata/flags. |
| Proof status | Status + timestamps + terminal flag; no storage URLs or metadata returned. | Full proof read endpoints with metadata. | Full proof read endpoints with metadata and flags. |

## Error matrix (external endpoints)
| Condition | HTTP | Code | Surface |
| --- | --- | --- | --- |
| Missing/invalid token header | 401 | UNAUTHORIZED | All external endpoints【F:app/security/external_tokens.py†L1-L25】 |
| Token invalid purpose | 401 | INVALID_TOKEN | Token consumption【F:app/services/external_proof_tokens.py†L230-L292】 |
| Token revoked/expired/used/upload cap hit | 410 | TOKEN_REVOKED / TOKEN_EXPIRED / TOKEN_ALREADY_USED / TOKEN_UPLOAD_LIMIT_REACHED | Token consumption/reservation【F:app/services/external_proof_tokens.py†L230-L366】 |
| Escrow/milestone mismatch | 403 | TOKEN_ESCROW_MISMATCH / TOKEN_MILESTONE_MISMATCH | Submit/summary/status【F:app/routers/external_proofs.py†L196-L430】 |
| Beneficiary mismatch | 403 | BENEFICIARY_MISMATCH | Token issuance【F:app/services/external_proof_tokens.py†L62-L118】 |
| Unsupported MIME / too large | 422 | UNSUPPORTED_FILE_TYPE / FILE_TOO_LARGE | Upload【F:app/routers/external_proofs.py†L114-L169】 |
| File/escrow namespace mismatch | 403 | FILE_ESCROW_MISMATCH / STORAGE_ESCROW_MISMATCH | Submit【F:app/routers/external_proofs.py†L230-L254】 |
| File metadata missing | 422 | FILE_METADATA_REQUIRED | Submit【F:app/routers/external_proofs.py†L230-L254】 |
| Token already bound to file/proof | 409 | TOKEN_FILE_ALREADY_SET / TOKEN_ALREADY_USED | Submit【F:app/routers/external_proofs.py†L230-L276】【F:app/services/external_proof_tokens.py†L150-L213】 |
| Proof not found / token on wrong escrow | 404 / 403 | PROOF_NOT_FOUND / TOKEN_ESCROW_MISMATCH | Status【F:app/routers/external_proofs.py†L392-L430】 |

## Examples
- Happy path: issue token → upload file (JPEG/PDF under size limit) → submit proof with token-only body (no escrow_id needed) → poll `/external/proofs/{proof_id}/status` until `terminal=true`.【F:app/routers/external_proofs.py†L114-L430】
- Failure 1: upload PNG over 5 MB → 422 `FILE_TOO_LARGE`; no token consumption occurs.【F:app/routers/external_proofs.py†L114-L169】
- Failure 2: reuse token on second submit → 409 `TOKEN_ALREADY_USED`; proof is not duplicated.【F:app/services/external_proof_tokens.py†L150-L213】

## Change log
### Substitutions
- BEFORE: `Scope: tokens are single-use, escrow + milestone + beneficiary bound; consume_external_proof_token enforces purpose/expiry, rejects reused tokens with 409.`  
  AFTER: `Scope: tokens are single-use by default (max_uploads defaults to 1) and escrow + milestone + beneficiary bound; consume_external_proof_token enforces purpose/expiry, rejects reused tokens with 410 (TOKEN_ALREADY_USED) and caps uploads with 410 (TOKEN_UPLOAD_LIMIT_REACHED).`  
  Reason: Align scope and reuse behavior with max_uploads cap and 410 responses in B1.1.  
  Backend source: `app/services/external_proof_tokens.py`【F:app/services/external_proof_tokens.py†L38-L366】

- BEFORE: `TTL: default 72h; min 5 minutes; max 7 days. Custom TTL outside bounds returns 422 (TOKEN_EXPIRY_TOO_SHORT/TOKEN_EXPIRY_TOO_LONG).`  
  AFTER: `TTL: default 7 days; min 10 minutes; max 30 days. Custom TTL outside bounds returns 422 (TOKEN_EXPIRY_TOO_SHORT/TOKEN_EXPIRY_TOO_LONG).`  
  Reason: Reflect updated TTL bounds and defaults.  
  Backend source: `app/services/external_proof_tokens.py`【F:app/services/external_proof_tokens.py†L26-L118】

- BEFORE: `Issuers: sender (must own escrow), support, admin. Beneficiary_id must match escrow; otherwise 403 (BENEFICIARY_MISMATCH).`  
  AFTER: `Issuers: sender (must own escrow), support, admin. Beneficiary_id must match escrow; otherwise 403 (BENEFICIARY_MISMATCH). Revocation is available via /sender/external-proof-tokens/{token_id}/revoke (idempotent, sets revoked_at).`  
  Reason: Document revocation flow exposed in B1.1.  
  Backend source: `app/routers/external_proof_tokens.py`, `app/services/external_proof_tokens.py`【F:app/routers/external_proof_tokens.py†L120-L172】【F:app/services/external_proof_tokens.py†L520-L563】

- BEFORE: `Token expired/used/wrong purpose | 401/409 | FORBIDDEN / TOKEN_ALREADY_USED | Token consumption`  
  AFTER: Split into `Token invalid purpose | 401 | INVALID_TOKEN | Token consumption` and `Token revoked/expired/used/upload cap hit | 410 | TOKEN_REVOKED / TOKEN_EXPIRED / TOKEN_ALREADY_USED / TOKEN_UPLOAD_LIMIT_REACHED | Token consumption/reservation` rows.  
  Reason: Reflect accurate status codes and upload cap enforcement for lifecycle transitions.  
  Backend source: `app/services/external_proof_tokens.py`【F:app/services/external_proof_tokens.py†L230-L366】

### Additions
- Added lifecycle bullet `Token lifecycle statuses: ACTIVE, EXPIRED, REVOKED, USED; revoked/expired/used tokens surface 410 responses when consumed or reserved, and status is reflected on token reads.`  
  Reason: Surface terminal states required by B1.1.  
  Backend source: `app/services/external_proof_tokens.py`, `app/routers/external_proof_tokens.py`【F:app/services/external_proof_tokens.py†L38-L427】【F:app/routers/external_proof_tokens.py†L120-L172】
