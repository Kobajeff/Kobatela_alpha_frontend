# FRONTEND_BACKEND_SYNC_AUDIT_V1

## Executive summary
- **Admin surfaces use sender summaries**: Admin escrow dashboards call the sender `/escrows/{id}/summary` endpoint instead of the unredacted `/admin/escrows/{id}/summary`, preventing support/admin from requesting proof/payment expansions and exposing them to sender redaction rules. 【F:src/lib/queries/admin.ts†L734-L760】
- **External tokens shared via query strings**: The external proof token issuer builds portal links as `?token=...`, contradicting backend guidance that query parameters are rejected to avoid leakage; this risks token exfiltration and browser history exposure for PII-bearing uploads. 【F:src/app/sender/escrows/[id]/external-proof-tokens/page.tsx†L115-L189】【F:docs/Backend_info/FRONTEND_API_GUIDE (12).md†L374-L382】
- **Schema drift on payments and proofs**: Frontend types omit sensitive fields that the backend returns (e.g., `psp_ref`, `idempotency_key`, `payout_blocked_reasons`, AI flags, invoice totals), so admin/support UI cannot render blocking reasons or enforce redaction/PII masking per contract. 【F:src/types/api.ts†L350-L368】【F:docs/Backend_info/API_GUIDE (11).md†L259-L365】
- **Unused surfaces**: Beneficiary, alerts, spend/transactions, fraud/risk snapshot, and public-sector endpoints remain absent from the UI, leaving backend features idle and untested. 【F:docs/Backend_info/FRONTEND_API_GUIDE (12).md†L332-L415】

## Scope and methodology
- Parsed all backend truth sources under `docs/Backend_info/**`, UX implementation/audit plans, and API usage guides.
- Cataloged frontend HTTP calls via axios wrappers (`src/lib/apiClient.ts`, `src/lib/api/externalClient.ts`) and React Query hooks/components in `src/lib/queries/**` and `src/app/**`.
- Mapped each documented backend endpoint to frontend usage (USED/UNUSED/PARTIAL/MISUSED) and flagged undocumented frontend call patterns.
- Inspected polling/error-handling and type definitions for drift, redaction, and operational-risk gaps.

## Findings by severity
### P0 (breaks core flows / security)
1) **Admin dashboards miss unredacted data** – Admin escrow views use the sender summary route, so support/admin cannot request proof/payment expansions and continue to see sender-level redaction. 【F:src/lib/queries/admin.ts†L734-L760】
2) **External tokens in URLs** – Issuer UI shares portal links with `?token=` even though backend forbids query transport, exposing tokens in history/logs and contradicting contract. 【F:src/app/sender/escrows/[id]/external-proof-tokens/page.tsx†L115-L189】【F:docs/Backend_info/FRONTEND_API_GUIDE (12).md†L374-L382】

### P1 (blocks UX completeness)
1) **Payment/proof schema gaps** – Missing fields (`psp_ref`, `idempotency_key`, payout blockers, AI flags/invoice totals) prevent admin/support from showing payout blockers or applying required PII redaction per contract. 【F:src/types/api.ts†L350-L368】【F:docs/Backend_info/API_GUIDE (11).md†L259-L365】

### P2 (cleanup / quality / perf)
1) **Unused backend capabilities** – Beneficiaries, alerts, spend/transactions, fraud/risk snapshots, and public-sector endpoints are not represented in the UI, leaving backend features idle and contract coverage untested. 【F:docs/Backend_info/FRONTEND_API_GUIDE (12).md†L332-L415】
2) **Admin payments filtering drift** – Custom `payment_id`/`id` filters are sent to `/admin/payments` even though the documented filters are `status`/`escrow_id`/`limit`/`offset`, increasing 422/ignored-param risk. 【F:src/lib/queries/admin.ts†L195-L221】【F:docs/Backend_info/API_GUIDE (11).md†L259-L365】

## Detailed sections
### A) Endpoint mismatch findings
- **Admin summary path**: Admin escrow view calls `/escrows/{id}/summary` instead of `/admin/escrows/{id}/summary` with `proofs_limit`/`include_milestones`/`include_proofs`, leading to redacted data and no pagination controls for proofs. 【F:src/lib/queries/admin.ts†L734-L760】
- **Admin payments filters**: `payment_id`/`id` query params are sent to `/admin/payments` but are not documented, risking backend validation drift. 【F:src/lib/queries/admin.ts†L195-L221】

### B) Role/scope/routing mismatch findings
- **Token transport**: External proof portal links embed the token in query params, conflicting with the documented header-only transport and increasing leakage risk for beneficiary-upload tokens (contains potential PII/financial proof files). 【F:src/app/sender/escrows/[id]/external-proof-tokens/page.tsx†L169-L189】【F:docs/Backend_info/FRONTEND_API_GUIDE (12).md†L374-L382】
- **Admin proof context**: Using sender summaries in admin context means support/admin still see sender redactions for payments (psp_ref/idempotency_key), reducing operational visibility despite admin scope. 【F:src/lib/queries/admin.ts†L734-L760】

### C) Proof lifecycle/external portal mismatch findings
- **External portal link shape**: Share links rely on `?token=` while backend rejects query tokens; beneficiaries following the link depend on the frontend to set headers, but token remains in URL logs. 【F:src/app/sender/escrows/[id]/external-proof-tokens/page.tsx†L169-L189】【F:docs/Backend_info/FRONTEND_API_GUIDE (12).md†L374-L382】
- **Proof metadata coverage**: Proof types omit AI flags/invoice totals; sender/admin components therefore cannot display payout blockers or redact invoice amounts as required by backend redaction rules. 【F:src/types/api.ts†L245-L290】【F:docs/Backend_info/FRONTEND_UI_CONTRACT (5).md†L137-L175】

### D) Fraud/risk data capture mismatch findings (no PII leakage)
- **Payment blocking signals absent**: Payment type lacks `payout_blocked_reasons` and PSP identifiers, so fraud/eligibility gating from backend cannot be surfaced; admins lack context for payout retries. 【F:src/types/api.ts†L350-L358】【F:docs/Backend_info/API_GUIDE (11).md†L259-L365】
- **Fraud/risk endpoints unused**: Admin tools for fraud score comparison and risk snapshots are not wired into the UI, leaving fraud signals invisible. 【F:docs/Backend_info/FRONTEND_API_GUIDE (12).md†L355-L358】

### E) Inefficiencies and tech debt hotspots
- **Admin summary polling on sender route**: Polling admin dashboards via the sender summary omits `proofs_limit`/`include_*` tuning, forcing repeated full-summary fetches and exposing admin views to sender-side masking. 【F:src/lib/queries/admin.ts†L734-L760】
- **Error-silent unused surfaces**: Missing UI for alerts/beneficiaries/spend means any backend changes here will go unnoticed until breakage, increasing long-term drift.

## Doc gaps that block UX
- **Admin summary shape**: Clarify whether `/admin/escrows/{id}/summary` should always include payments/proofs with `proofs_limit` defaults and whether PSP references remain unredacted for admin/support; current docs do not specify client-side masking expectations, blocking a safe switch-over.
- **External token delivery**: Backend forbids query tokens, but there is no documented, copyable header-based link pattern for beneficiaries; need guidance on a safe deep-link pattern (e.g., one-time code to header exchange) to avoid URL leakage.
- **Payment redaction expectations**: Docs list `psp_ref`/`idempotency_key` but do not define UI redaction rules for admin vs sender/provider views; frontend cannot confidently render or hide these fields without explicit guidance (RGPD warning for PSP/PII).

## What to change in frontend (recommendations only)
- Switch admin escrow summary calls to `/admin/escrows/{id}/summary` with `proofs_limit`/`include_milestones`/`include_proofs` to restore unredacted admin visibility.
- Replace external portal share links with a header-only handoff (e.g., one-time token capture page) to comply with header transport and avoid leaking tokens in URLs/history.
- Extend `Payment`/`Proof` types and admin screens to include payout blockers, PSP refs/idempotency keys, AI flags, and invoice amounts, while hiding PSP/PII fields for non-admin/support roles.
- Prioritize wiring or explicitly deferring unused backend capabilities (beneficiaries, alerts, spend/transactions, fraud/risk snapshots).
