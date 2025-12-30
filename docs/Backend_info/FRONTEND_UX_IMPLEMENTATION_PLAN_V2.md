# FRONTEND UX IMPLEMENTATION PLAN V2 — Kobatela KCT

**Status:** Active (V2)  
**Aligned sources (canonical):** FRONTEND_API_GUIDE.md, FRONTEND_UI_CONTRACT.md, end_to_end.md  
**Evidence rule:** Any backend-dependent statement must cite code or the evidence-backed API guide sections. UX-only assumptions are labeled **UX PROPOSAL**.  

## 0) Scope, Inputs, and Guardrails
- This plan only uses endpoints listed in FRONTEND_API_GUIDE.md (canonical API truth).【F:docs/FRONTEND_API_GUIDE.md†L47-L70】
- Role gating and redaction rules follow FRONTEND_UI_CONTRACT.md; UI must enforce masking where backend schemas expose sensitive fields.【F:docs/FRONTEND_UI_CONTRACT.md†L9-L69】
- Polling cadence and stop conditions follow the UX horizon in end_to_end.md (polling doctrine).【F:end_to_end.md†L101-L110】
- Error handling for 401/403/409/422 follows the frontend error doctrine in FRONTEND_API_GUIDE.md.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】

## 1) Screen Catalog (Canonical Screens Only)
Each screen below maps to endpoints already present in FRONTEND_API_GUIDE.md. Field lists use the UI contract’s schema visibility matrix.

### Screen IDs
- **S1 Login** — POST /auth/login
- **S2 Session** — GET /auth/me
- **S3 Escrow List** — GET /escrows
- **S4 Escrow Detail** — GET /escrows/{id}
- **S5 Escrow Summary** — GET /escrows/{id}/summary
- **S6 Funding (Deposit + PSP session)** — POST /escrows/{id}/deposit, POST /escrows/{id}/funding-session
- **S7 Milestones** — GET /escrows/{id}/milestones, GET /escrows/milestones/{milestone_id}
- **S8 Proof List/Detail** — GET /proofs
- **S9 Proof Upload** — POST /files/proofs, POST /proofs
- **S10 Proof Decision** — POST /proofs/{id}/decision
- **S11 Payments Admin List** — GET /admin/payments
- **S12 Payment Execute** — POST /payments/execute/{payment_id}
- **S13 Escrow Actions** — POST /escrows/{id}/mark-delivered, /client-approve, /client-reject, /check-deadline
- **S14 Milestone Create (Admin/Support)** — POST /escrows/{id}/milestones

Endpoints and role requirements are taken directly from FRONTEND_API_GUIDE.md.【F:docs/FRONTEND_API_GUIDE.md†L47-L70】

## 2) Phase Plan (P0 / P1 / P2)
**Rule:** Each row includes screen → endpoints → schema fields → redaction → polling/retry → acceptance criteria.

### P0 — Core Sender/Provider Flows
| Screen | Endpoints | Schema fields used | Redaction rules | Polling/retry notes | Test acceptance criteria |
| --- | --- | --- | --- | --- | --- |
| S1 Login | POST /auth/login | `AuthLoginResponse.user` fields (id, email, username, role, payout_channel).【F:docs/FRONTEND_API_GUIDE.md†L72-L80】【F:docs/FRONTEND_UI_CONTRACT.md†L71-L90】 | None beyond standard auth token handling. | No polling; retry only on network errors. | 401/403 shows login error; token stored on 200.【F:docs/FRONTEND_API_GUIDE.md†L143-L149】 |
| S2 Session | GET /auth/me | `AuthMeResponse.user` fields (same as login).【F:docs/FRONTEND_API_GUIDE.md†L50-L51】【F:docs/FRONTEND_UI_CONTRACT.md†L71-L90】 | None beyond standard auth token handling. | No polling; invalidate on 401. | 401 clears session; 403 blocks view.【F:docs/FRONTEND_API_GUIDE.md†L143-L149】 |
| S3 Escrow List | GET /escrows | `EscrowListItem` fields (id, status, amount_total, currency, deadline_at, created_at, provider_user_id, beneficiary_id).【F:docs/FRONTEND_UI_CONTRACT.md†L103-L110】 | Advisor must not see amount/currency/beneficiary_id; mask per UI contract.【F:docs/FRONTEND_UI_CONTRACT.md†L103-L110】 | Optional refresh; if funding in progress, poll by status pill rules (see end_to_end polling).【F:end_to_end.md†L101-L110】 | 403 shows access denied; 422 shows filter validation errors.【F:docs/FRONTEND_API_GUIDE.md†L148-L151】 |
| S4 Escrow Detail | GET /escrows/{id} | `EscrowRead` fields (id, sender/client ids, provider_user_id, beneficiary_id, amount_total, currency, status, domain, release_conditions_json, deadline_at).【F:docs/FRONTEND_UI_CONTRACT.md†L92-L101】 | Advisor must not see amount/currency/beneficiary_id; redact sensitive release_conditions_json fields if present.【F:docs/FRONTEND_UI_CONTRACT.md†L92-L101】 | Poll for funding/progress updates per end_to_end polling cadence until terminal status.【F:end_to_end.md†L101-L110】 | 401/403/404 shows not-authorized or not-found; 409 triggers refetch and CTA disablement.【F:docs/FRONTEND_API_GUIDE.md†L143-L150】 |
| S5 Escrow Summary | GET /escrows/{id}/summary | `SenderEscrowSummary` fields: escrow, milestones, proofs, payments (via EscrowRead/MilestoneRead/ProofRead/PaymentRead).【F:docs/FRONTEND_API_GUIDE.md†L132-L141】【F:docs/FRONTEND_UI_CONTRACT.md†L92-L154】 | Apply proof/payment redactions (metadata/PSP refs/idempotency keys) per UI contract. Advisor must not see amounts/payout fields.【F:docs/FRONTEND_UI_CONTRACT.md†L56-L69】【F:docs/FRONTEND_UI_CONTRACT.md†L128-L152】 | Poll while payment status PENDING/SENT; stop at SETTLED/ERROR/REFUNDED per horizon guidance.【F:end_to_end.md†L101-L110】 | 403 blocks summary; 409 refetches summary + list data.【F:docs/FRONTEND_API_GUIDE.md†L148-L150】 |
| S6 Funding | POST /escrows/{id}/deposit, POST /escrows/{id}/funding-session | `EscrowRead` (deposit response) + `FundingSessionRead` (session response).【F:docs/FRONTEND_API_GUIDE.md†L54-L55】 | No additional redactions beyond escrow rules. | Deposit requires Idempotency-Key and is safe to retry with same key.【F:docs/FRONTEND_API_GUIDE.md†L157-L159】 Poll escrow status until FUNDED/RELEASABLE/REFUNDED/CANCELLED.【F:end_to_end.md†L101-L110】 | 409/422 disable CTA and refetch escrow; 401/403 blocks action.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】 |
| S7 Milestones | GET /escrows/{id}/milestones, GET /escrows/milestones/{milestone_id} | `MilestoneRead` fields (id, escrow_id, label, amount, currency, sequence_index, status, proof_kind, proof_requirements).【F:docs/FRONTEND_UI_CONTRACT.md†L112-L120】 | Advisor must not see amount/currency; mask geofence details inside proof_requirements if present.【F:docs/FRONTEND_UI_CONTRACT.md†L115-L120】 | Poll while PENDING_REVIEW/PAYING; stop at APPROVED/REJECTED/PAID.【F:end_to_end.md†L101-L110】 | 403 access denied; 404 milestone not found; 409 refetch list/detail.【F:docs/FRONTEND_API_GUIDE.md†L148-L150】 |
| S8 Proof List/Detail | GET /proofs | `ProofRead` fields (id, escrow_id, milestone_id, type, storage_url, sha256, metadata, status, created_at, updated_at, AI fields, review fields).【F:docs/FRONTEND_UI_CONTRACT.md†L122-L144】 | Hide restricted metadata/AI/PSP fields for non-admin/support; provider must not see AI fields; advisor must not see metadata or amounts.【F:docs/FRONTEND_UI_CONTRACT.md†L56-L69】【F:docs/FRONTEND_UI_CONTRACT.md†L128-L144】 | Poll while proof status PENDING; stop when status changes.【F:end_to_end.md†L101-L110】 | 403 blocks access; 422 filter validation errors; 409 triggers refetch if decision already made.【F:docs/FRONTEND_API_GUIDE.md†L148-L152】 |
| S9 Proof Upload | POST /files/proofs, POST /proofs | `ProofFileUploadResponse` (storage_url, sha256, content_type, size_bytes) + `ProofRead` on create.【F:docs/FRONTEND_UI_CONTRACT.md†L156-L159】 | Do not log storage_url; redact metadata for non-admin/support once returned in ProofRead.【F:docs/FRONTEND_UI_CONTRACT.md†L126-L129】【F:docs/FRONTEND_UI_CONTRACT.md†L213-L218】 | Upload errors 422 for file constraints; proof submit is non-idempotent (disable CTA after click).【F:docs/FRONTEND_API_GUIDE.md†L151-L152】 | 422 shows file errors; 403 blocks submit; success shows PENDING and starts polling in S8.【F:docs/FRONTEND_API_GUIDE.md†L148-L152】 |
| S10 Proof Decision | POST /proofs/{id}/decision | `ProofRead` response fields per proof detail.【F:docs/FRONTEND_API_GUIDE.md†L68-L68】【F:docs/FRONTEND_UI_CONTRACT.md†L122-L144】 | Only sender/support/admin can decide; advisor/provider CTAs hidden. Redact restricted proof fields in response view.【F:docs/FRONTEND_API_GUIDE.md†L66-L68】【F:docs/FRONTEND_UI_CONTRACT.md†L56-L69】 | Non-idempotent; disable CTA after click and refetch proof + milestones + summary.【F:end_to_end.md†L141-L153】 | 409 shows already decided; 403 blocks; 422 shows decision validation errors.【F:docs/FRONTEND_API_GUIDE.md†L148-L152】 |
| S13 Escrow Actions | POST /escrows/{id}/mark-delivered, /client-approve, /client-reject, /check-deadline | `EscrowRead` response fields. | Sender-only CTAs; hide for provider/advisor. | Non-idempotent; disable CTA and refetch escrow + summary; follow status polling rules for terminal states.【F:end_to_end.md†L101-L110】 | 403/409/422: block action and refetch; 401 clears session.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】 |

### P1 — Support/Admin Operations
| Screen | Endpoints | Schema fields used | Redaction rules | Polling/retry notes | Test acceptance criteria |
| --- | --- | --- | --- | --- | --- |
| S11 Payments Admin List | GET /admin/payments | `PaymentRead` fields (id, escrow_id, milestone_id, amount, psp_ref, status, idempotency_key, created_at, updated_at).【F:docs/FRONTEND_UI_CONTRACT.md†L146-L154】 | PSP refs/idempotency keys visible to admin/support only; mask for other roles if view leaks occur.【F:docs/FRONTEND_UI_CONTRACT.md†L56-L69】【F:docs/FRONTEND_UI_CONTRACT.md†L146-L153】 | Poll while PENDING/SENT; stop at SETTLED/ERROR/REFUNDED.【F:end_to_end.md†L101-L110】 | 403 blocks non-admin/support; 422 shows filter validation; 409 triggers refetch after execute actions.【F:docs/FRONTEND_API_GUIDE.md†L148-L152】 |
| S12 Payment Execute | POST /payments/execute/{payment_id} | `PaymentRead` response fields.【F:docs/FRONTEND_API_GUIDE.md†L69-L70】【F:docs/FRONTEND_UI_CONTRACT.md†L146-L154】 | Admin/support only; advisor CTA forbidden per UI contract. Mask PSP refs outside support/admin view.【F:docs/FRONTEND_UI_CONTRACT.md†L17-L27】 | Non-idempotent; disable CTA and poll payment list/summary for status change.【F:end_to_end.md†L101-L110】 | 409 payment already executed -> disable CTA + refetch; 403 blocks; 422 validation errors surfaced if any.【F:docs/FRONTEND_API_GUIDE.md†L148-L152】 |
| S14 Milestone Create (Admin/Support) | POST /escrows/{id}/milestones | `MilestoneRead` fields returned on create.【F:docs/FRONTEND_API_GUIDE.md†L62-L63】【F:docs/FRONTEND_UI_CONTRACT.md†L112-L120】 | Admin/support only; advisor/provider/sender must not see CTA. | Non-idempotent; refetch milestones list after create; no polling needed unless status changes to PENDING_REVIEW later.【F:end_to_end.md†L101-L110】 | 403 blocks non-admin/support; 422 show validation; 409 refetch list if concurrency issues.【F:docs/FRONTEND_API_GUIDE.md†L148-L152】 |

### P2 — Secondary/Optional Enhancements
| Screen | Endpoints | Schema fields used | Redaction rules | Polling/retry notes | Test acceptance criteria |
| --- | --- | --- | --- | --- | --- |
| S6 Funding (PSP session UX) | POST /escrows/{id}/funding-session | `FundingSessionRead` fields.【F:docs/FRONTEND_API_GUIDE.md†L55-L55】 | Sender/admin only; no extra redaction. | Poll escrow status after external PSP completion; stop at terminal states.【F:end_to_end.md†L101-L110】 | 401/403 blocks; 422 validation errors; success triggers polling flow.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】 |
| S7 Milestone Detail (deep view) | GET /escrows/milestones/{milestone_id} | `MilestoneRead` fields per UI contract.【F:docs/FRONTEND_UI_CONTRACT.md†L112-L120】 | Same redaction as milestone list (amount/currency for advisor, geofence details).【F:docs/FRONTEND_UI_CONTRACT.md†L115-L120】 | Poll only if status in PENDING_REVIEW/PAYING; otherwise no polling. | 403/404 for access/absent; 409 refetch if status changed during action.【F:docs/FRONTEND_API_GUIDE.md†L148-L150】 |

## 3) Definition of Done (Per Screen)
Each screen’s DoD includes role gating, forbidden field handling, 401/403/409/422 behavior, and query invalidation + polling stop conditions.

### S1 Login
- **Role gating:** none (public login) but scope returned by backend determines access.【F:docs/FRONTEND_API_GUIDE.md†L50-L52】
- **Forbidden fields:** N/A.
- **401/403/409/422:** 401/403 show login error; 422 shows validation errors; 409 not applicable.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】
- **Invalidation/polling:** clear cached user on 401; no polling.

### S2 Session
- **Role gating:** sender/provider/admin only per endpoint scope; others blocked.【F:docs/FRONTEND_API_GUIDE.md†L50-L51】
- **Forbidden fields:** N/A.
- **401/403/409/422:** 401 clears session; 403 blocks access; 422 show validation (rare).【F:docs/FRONTEND_API_GUIDE.md†L143-L152】
- **Invalidation/polling:** invalidate all queries on 401; no polling.

### S3 Escrow List
- **Role gating:** sender/provider/support; advisor/admin not in scope.【F:docs/FRONTEND_API_GUIDE.md†L52-L52】
- **Forbidden fields:** mask amount/currency/beneficiary_id for advisor if any exposure occurs; apply UI contract redaction rules.【F:docs/FRONTEND_UI_CONTRACT.md†L103-L110】
- **401/403/409/422:** 401 clears session; 403 shows access denied; 422 shows filter errors; 409 refetch list if conflict after mutations.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】
- **Invalidation/polling:** invalidate list on escrow mutations (create/fund/actions); poll only when funding in progress, stop at terminal statuses.【F:end_to_end.md†L101-L110】

### S4 Escrow Detail
- **Role gating:** sender/provider/support/admin only; advisor blocked.【F:docs/FRONTEND_API_GUIDE.md†L60-L60】
- **Forbidden fields:** redact advisor view of amount/currency/beneficiary_id; mask sensitive release_conditions_json content if present.【F:docs/FRONTEND_UI_CONTRACT.md†L92-L101】
- **401/403/409/422:** 401 clears session; 403/404 show not-authorized/not-found; 409 refetch; 422 show validation on actions.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】
- **Invalidation/polling:** invalidate detail on funding/proof decisions/escrow actions; poll while status non-terminal per horizon stop conditions.【F:end_to_end.md†L101-L110】

### S5 Escrow Summary
- **Role gating:** sender/provider only.【F:docs/FRONTEND_API_GUIDE.md†L61-L61】
- **Forbidden fields:** mask proof metadata, PSP refs, idempotency keys for non-admin/support; hide amounts for advisor if summary used in advisor context (should not be).【F:docs/FRONTEND_UI_CONTRACT.md†L56-L69】【F:docs/FRONTEND_UI_CONTRACT.md†L146-L153】
- **401/403/409/422:** 401 clears session; 403 blocks; 409 refetch after decisions; 422 show validation errors on filters if any.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】
- **Invalidation/polling:** invalidate summary on proof decisions, payments execute; poll payments until terminal status per horizon rules.【F:end_to_end.md†L101-L110】

### S6 Funding
- **Role gating:** sender (deposit), sender/admin (funding-session).【F:docs/FRONTEND_API_GUIDE.md†L54-L55】
- **Forbidden fields:** none beyond escrow redaction.
- **401/403/409/422:** 401 clears session; 403 blocks; 409/422 show conflicts/validation (e.g., over-funded).【F:docs/FRONTEND_API_GUIDE.md†L143-L152】
- **Invalidation/polling:** invalidate escrow detail/list after deposit; poll escrow status until terminal states; stop on FUNDED/RELEASABLE/REFUNDED/CANCELLED.【F:end_to_end.md†L101-L110】

### S7 Milestones
- **Role gating:** list access for sender/provider/admin/support; detail access for admin/sender/provider only.【F:docs/FRONTEND_API_GUIDE.md†L63-L64】
- **Forbidden fields:** advisor must not see amount/currency; mask geofence details in proof_requirements.【F:docs/FRONTEND_UI_CONTRACT.md†L115-L120】
- **401/403/409/422:** 401 clears session; 403/404 for access/not-found; 422 for validation filters; 409 refetch if state conflicts.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】
- **Invalidation/polling:** invalidate after proof decisions or payouts; poll only during PENDING_REVIEW/PAYING and stop at APPROVED/REJECTED/PAID.【F:end_to_end.md†L101-L110】

### S8 Proof List/Detail
- **Role gating:** sender/provider/support/admin/advisor; decision CTA only for sender/support/admin.【F:docs/FRONTEND_API_GUIDE.md†L67-L68】
- **Forbidden fields:** mask metadata/OCR/EXIF/ML fields for non-admin/support; provider cannot see AI fields; advisor must not see metadata or amounts.【F:docs/FRONTEND_UI_CONTRACT.md†L56-L69】【F:docs/FRONTEND_UI_CONTRACT.md†L128-L144】
- **401/403/409/422:** 401 clears session; 403 blocks; 409 refetch after decisions; 422 shows filter validation errors.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】
- **Invalidation/polling:** invalidate list on upload/decision; poll only while proof status PENDING, stop when status changes.【F:end_to_end.md†L101-L110】

### S9 Proof Upload
- **Role gating:** sender/provider/support/admin depending on proof context; follow proof submit scope in API guide.【F:docs/FRONTEND_API_GUIDE.md†L65-L66】
- **Forbidden fields:** never log storage_url; redact metadata once proof returned for non-admin/support.【F:docs/FRONTEND_UI_CONTRACT.md†L126-L129】【F:docs/FRONTEND_UI_CONTRACT.md†L213-L218】
- **401/403/409/422:** 401 clears session; 403 blocks; 422 shows file validation errors; 409 refetch proof list if conflict in submission.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】
- **Invalidation/polling:** invalidate proof list and milestones after submit; start polling proof status until non-PENDING.【F:end_to_end.md†L101-L110】

### S10 Proof Decision
- **Role gating:** sender/support/admin only; provider/advisor CTAs hidden.【F:docs/FRONTEND_API_GUIDE.md†L68-L68】
- **Forbidden fields:** mask restricted proof fields in response for non-admin/support.【F:docs/FRONTEND_UI_CONTRACT.md†L56-L69】
- **401/403/409/422:** 401 clears session; 403 blocks; 409 shows already decided and refetch; 422 shows validation errors.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】
- **Invalidation/polling:** invalidate proof list/detail, milestone list, summary; polling stop when proof status != PENDING and milestone status terminal.【F:end_to_end.md†L101-L110】

### S11 Payments Admin List
- **Role gating:** admin/support only.【F:docs/FRONTEND_API_GUIDE.md†L69-L70】
- **Forbidden fields:** PSP refs/idempotency keys only visible to admin/support; mask if reused in other roles.【F:docs/FRONTEND_UI_CONTRACT.md†L56-L69】【F:docs/FRONTEND_UI_CONTRACT.md†L146-L153】
- **401/403/409/422:** 401 clears session; 403 blocks; 422 filter validation errors; 409 after execute action triggers refetch.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】
- **Invalidation/polling:** invalidate list after execute; poll until payments terminal (SETTLED/ERROR/REFUNDED).【F:end_to_end.md†L101-L110】

### S12 Payment Execute
- **Role gating:** admin/support only; advisor must never see CTA.【F:docs/FRONTEND_UI_CONTRACT.md†L17-L27】
- **Forbidden fields:** same PSP/idempotency redaction as payments list for non-admin/support views.【F:docs/FRONTEND_UI_CONTRACT.md†L56-L69】
- **401/403/409/422:** 401 clears session; 403 blocks; 409 shows already executed; 422 show validation errors if any.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】
- **Invalidation/polling:** invalidate payments list + summary; poll payment status until terminal per horizon rules.【F:end_to_end.md†L101-L110】

### S13 Escrow Actions
- **Role gating:** sender-only endpoints; block provider/advisor. Admin/support do not use these endpoints.【F:docs/FRONTEND_API_GUIDE.md†L56-L59】
- **Forbidden fields:** same as escrow detail; mask sensitive release conditions as needed.【F:docs/FRONTEND_UI_CONTRACT.md†L92-L101】
- **401/403/409/422:** 401 clears session; 403 blocks; 409 refetch; 422 shows validation errors.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】
- **Invalidation/polling:** invalidate escrow detail/summary; poll escrow status until terminal after action.【F:end_to_end.md†L101-L110】

### S14 Milestone Create
- **Role gating:** admin/support only; hide CTA for sender/provider/advisor.【F:docs/FRONTEND_API_GUIDE.md†L62-L63】
- **Forbidden fields:** same as milestone list; mask geofence details as needed.【F:docs/FRONTEND_UI_CONTRACT.md†L115-L120】
- **401/403/409/422:** 401 clears session; 403 blocks; 422 show validation errors; 409 refetch list if conflicts.【F:docs/FRONTEND_API_GUIDE.md†L143-L152】
- **Invalidation/polling:** invalidate milestones list after create; no polling unless milestone status moves to PENDING_REVIEW/PAYING later.【F:end_to_end.md†L101-L110】

## 4) Risks & Missing Backend Capabilities (TODO / Not found)
- **Advisor endpoints** (e.g., advisor profile/queue) are referenced in end_to_end.md but do not appear in FRONTEND_API_GUIDE.md endpoint inventory; treat as TODO until confirmed in backend/guide.【F:end_to_end.md†L204-L215】【F:docs/FRONTEND_API_GUIDE.md†L47-L70】
- **Admin user/advisor/merchant suggestions/pricing endpoints** appear in end_to_end.md navigation horizon but are not in FRONTEND_API_GUIDE.md; not in scope for this plan unless added to canonical API guide.【F:end_to_end.md†L72-L80】【F:docs/FRONTEND_API_GUIDE.md†L47-L70】
- **Role-based redaction is UI-only** today (schemas expose sensitive fields); any leakage risk remains until backend adds role-aware schemas. Track as compliance risk.【F:docs/FRONTEND_UI_CONTRACT.md†L56-L69】
- **Rate limiting / 429 behavior** is documented as TODO in FRONTEND_API_GUIDE; UI should treat as not available until backend confirms limits.【F:docs/FRONTEND_API_GUIDE.md†L152-L153】

