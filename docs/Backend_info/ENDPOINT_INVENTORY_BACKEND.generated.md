# Backend Endpoint Inventory (Block 1) — Generated

Scope: core escrow (sender UX), admin review queue, admin settings. FE3/fraud-config endpoints are intentionally excluded.

## Escrow (Sender Core)
| Method | Path | Scopes | Request schema | Response schema | Response keys (top-level → nested) |
| --- | --- | --- | --- | --- | --- |
| GET | `/escrows` | sender, provider, support | Query: `mine`, `status`, `sender_id`, `provider_id`, `advisor_id`, `limit`, `offset` | `list[EscrowListItem]` **or** `PaginatedResponse[EscrowListItem]` | `items`, `total`, `limit`, `offset` → `EscrowListItem.{id,status,amount_total,currency,deadline_at,created_at,provider_user_id,provider_id,beneficiary_id}` (or list of EscrowListItem when `mine=true`) |
| POST | `/escrows` | sender | `EscrowCreate` | `EscrowRead` | `EscrowRead.{id,client_id,sender_user_id,provider_user_id,provider_id,beneficiary_id,beneficiary_profile,amount_total,currency,status,domain,release_conditions_json,deadline_at}` |
| POST | `/escrows/{escrow_id}/deposit` | sender | `EscrowDepositCreate` + `Idempotency-Key` | `EscrowRead` | `EscrowRead.{id,client_id,sender_user_id,provider_user_id,provider_id,beneficiary_id,beneficiary_profile,amount_total,currency,status,domain,release_conditions_json,deadline_at}` |
| POST | `/escrows/{escrow_id}/funding-session` | sender, admin | — | `FundingSessionRead` | `FundingSessionRead.{funding_id,client_secret}` |
| POST | `/escrows/{escrow_id}/mark-delivered` | sender | `EscrowActionPayload` | `EscrowRead` | `EscrowRead.{id,client_id,sender_user_id,provider_user_id,provider_id,beneficiary_id,beneficiary_profile,amount_total,currency,status,domain,release_conditions_json,deadline_at}` |
| POST | `/escrows/{escrow_id}/client-approve` | sender | `EscrowActionPayload` (optional) | `EscrowRead` | `EscrowRead.{id,client_id,sender_user_id,provider_user_id,provider_id,beneficiary_id,beneficiary_profile,amount_total,currency,status,domain,release_conditions_json,deadline_at}` |
| POST | `/escrows/{escrow_id}/client-reject` | sender | `EscrowActionPayload` (optional) | `EscrowRead` | `EscrowRead.{id,client_id,sender_user_id,provider_user_id,provider_id,beneficiary_id,beneficiary_profile,amount_total,currency,status,domain,release_conditions_json,deadline_at}` |
| POST | `/escrows/{escrow_id}/check-deadline` | sender | — | `EscrowRead` | `EscrowRead.{id,client_id,sender_user_id,provider_user_id,provider_id,beneficiary_id,beneficiary_profile,amount_total,currency,status,domain,release_conditions_json,deadline_at}` |
| GET | `/escrows/{escrow_id}` | sender, provider, support, admin | — | `EscrowRead` | `EscrowRead.{id,client_id,sender_user_id,provider_user_id,provider_id,beneficiary_id,beneficiary_profile,amount_total,currency,status,domain,release_conditions_json,deadline_at}` |
| GET | `/escrows/{escrow_id}/summary` | sender, provider | — | `SenderEscrowSummary` | `SenderEscrowSummary.{escrow,milestones,proofs,payments}` → `EscrowRead`, `MilestoneRead[]`, `ProofRead[]`, `PaymentRead[]` |

## Admin Review Queue
| Method | Path | Scopes | Request schema | Response schema | Response keys (top-level → nested) |
| --- | --- | --- | --- | --- | --- |
| GET | `/admin/proofs/review-queue` | admin, support | Query: `advisor_id`, `unassigned_only`, `sender_id`, `provider_id`, `review_mode`, `status`, `limit`, `offset` | `PaginatedResponse[AdminProofReviewItem]` | `items`, `total`, `limit`, `offset` → `AdminProofReviewItem.{proof_id,escrow_id,milestone_id,status,type,storage_key,storage_url,sha256,created_at,invoice_total_amount,invoice_currency,ai_risk_level,ai_score,ai_flags,ai_explanation,ai_checked_at,ai_reviewed_by,ai_reviewed_at,metadata,advisor,payout_eligible,payout_blocked_reasons}` → `AdvisorSummary.{id,advisor_id,first_name,last_name,email,phone,country,language,advisor_grade,advisor_review,sender_managed,total_number_of_case_managed}` |

## Admin Settings
| Method | Path | Scopes | Request schema | Response schema | Response keys (top-level → nested) |
| --- | --- | --- | --- | --- | --- |
| GET | `/admin/settings/ai-proof` | admin | — | `AdminSettingRead` | `AdminSettingRead.{key,value,effective}` |
| POST | `/admin/settings/ai-proof` | admin | Query: `enabled` (bool) | `AdminSettingRead` (write response omits `effective`) | `AdminSettingRead.{key,value}` |
