# FRONTEND_BACKEND_SYNC_AUDIT_V1

## Executive summary
- Advisor area is built on `/auth/me`, which the backend limits to sender/provider/admin scopes; advisors hit 401/403 loops and are redirected despite valid advisor API keys. 【F:src/app/advisor/layout.tsx†L7-L15】【F:src/lib/queries/sender.ts†L274-L299】
- Admin proof review relies on an undocumented `review_mode` query on `/proofs` instead of the documented `/admin/proofs/review-queue`, risking silent drift if the backend removes the alias. 【F:src/lib/queries/admin.ts†L563-L581】
- Maintenance-only endpoints (`/mandates/cleanup`) and capability gaps (external proof token issuance, beneficiary creation, alerts/spend/transactions) are exposed or missing in UI, leaving backend features either unused or incorrectly surfaced. 【F:src/lib/queries/sender.ts†L165-L173】【F:docs/Backend_info/API_GUIDE (10).md†L344-L370】
- Performance/operability: the sender dashboard executes N+1 summary calls for recent escrows, and proof/escrow polling lacks role-aware error messaging; these patterns inflate request volume and mask 403/410 causes. 【F:src/lib/queries/sender.ts†L360-L387】【F:src/lib/queries/sender.ts†L1000-L1044】

## Scope and methodology
- Parsed all backend truth sources under `docs/Backend_info/**`, UX contracts, and API usage guides to build the canonical endpoint inventory.
- Indexed frontend HTTP usage via axios/react-query wrappers (`src/lib/apiClient.ts`, `src/lib/queries/**`, `src/lib/api/externalClient.ts`) and route components under `src/app/**`.
- Compared inventories to classify each endpoint as USED/UNUSED/PARTIAL/MISUSED and highlighted undocumented frontend calls.
- Reviewed polling/error handling and role/scope guards for operational and privacy risks.

## Findings by severity
### P0 (breaks core flows / security)
1. **Advisor access blocked** — Advisor layout depends on `/auth/me`, which the backend restricts to sender/provider/admin; advisors are reset/redirected even with valid advisor tokens. 【F:src/app/advisor/layout.tsx†L7-L15】【F:src/lib/queries/sender.ts†L274-L299】
2. **Proof review endpoint drift** — Admin proof queue uses `/proofs?review_mode=review_queue` (undocumented), bypassing `/admin/proofs/review-queue`. Any backend tightening will break the queue. 【F:src/lib/queries/admin.ts†L563-L581】

### P1 (blocks UX completeness)
1. **External beneficiary flow incomplete** — UI implements upload/submit/status but lacks token issuance (`/external/proofs/tokens`, `/external/tokens/beneficiary`), so senders/admins cannot generate links for beneficiaries. 【F:src/lib/api/externalClient.ts†L15-L109】
2. **Backend maintenance endpoint exposed** — Mandate cleanup (`/mandates/cleanup`) is surfaced in sender mutations even though docs flag it as maintenance-only, risking accidental deletions. 【F:src/lib/queries/sender.ts†L165-L173】
3. **Sender dashboard bypasses canonical endpoint** — UI builds dashboard via multiple list/summary calls instead of `/sender/dashboard`, missing backend-ready aggregates and over-fetching. 【F:src/lib/queries/sender.ts†L340-L393】
4. **Advisor role lacks profile/me bootstrap** — Advisor hooks rely on the same `useAuthMe` session and do not fetch advisor-specific context after 401/403, blocking advisor queue/profile screens. 【F:src/lib/queries/advisor.ts†L16-L44】【F:src/lib/queries/sender.ts†L274-L299】

### P2 (cleanup / quality / perf)
1. **N+1 summary fetch on sender dashboard** — For every dashboard load, the app fetches recent escrows then issues a summary request per escrow to extract payments. 【F:src/lib/queries/sender.ts†L360-L387】
2. **Admin/sender polling lacks role-aware error surfacing** — Proof polling stops on errors but only logs generic messages; 403/410 causes are hidden from users. 【F:src/lib/queries/sender.ts†L1000-L1044】
3. **Unimplemented backend surfaces** — Beneficiaries, alerts, spend/transactions, fraud/risk snapshots, and public-sector routes are unused, leaving backend capabilities idle and increasing drift risk. 【F:docs/Backend_info/API_GUIDE (10).md†L270-L370】【F:docs/Backend_info/API_GUIDE (10).md†L420-L518】
4. **Idempotency UX gaps** — Deposit mutation adds headers but UI copy does not instruct re-use of the same key or surface 409/422 conflict reasons. 【F:src/lib/queries/sender.ts†L881-L929】

## Detailed sections
### A) Endpoint mismatch findings
- **Advisor session**: `/auth/me` exclusion of advisor scope contradicts advisor layout reliance, causing hard redirects. 【F:src/app/advisor/layout.tsx†L7-L15】
- **Proof review**: Using `/proofs?review_mode=review_queue` instead of `/admin/proofs/review-queue` is undocumented and risks breakage. 【F:src/lib/queries/admin.ts†L563-L581】
- **Maintenance endpoint exposure**: `/mandates/cleanup` surfaced in UI despite docs marking it non-UI. 【F:src/lib/queries/sender.ts†L165-L173】
- **Dashboard aggregation**: UI bypasses `/sender/dashboard` and recreates aggregates via N+1 calls, diverging from backend contract. 【F:src/lib/queries/sender.ts†L340-L393】

### B) Role/scope/routing mismatch findings
- **Advisor scope**: RequireScope requests `ADVISOR` scope but backing `useAuthMe` cannot authenticate advisor tokens, leading to perpetual session resets. 【F:src/app/advisor/layout.tsx†L7-L15】【F:src/lib/queries/sender.ts†L274-L299】
- **Provider/scope gaps**: UI only models sender/admin/advisor; provider/support-only routes (e.g., `/proofs` provider upload) lack dedicated guards, risking incorrect CTAs when those roles are added. 【F:src/lib/queries/sender.ts†L74-L120】

### C) Proof lifecycle / external portal mismatch findings
- **External portal**: Upload/submit/status implemented, but no token issuance UI; beneficiaries cannot be onboarded without backend token issuers. 【F:src/lib/api/externalClient.ts†L15-L109】
- **Advisor review request**: Sender CTA exists, but advisor queue relies on blocking `/auth/me`, so the workflow dead-ends for advisor users. 【F:src/lib/queries/sender.ts†L1159-L1179】【F:src/lib/queries/advisor.ts†L16-L44】

### D) Fraud/risk data capture mismatch findings
- **Alerts/fraud snapshots unused**: `/alerts`, `/admin/risk-snapshots`, and `/admin/fraud/score_comparison` are not surfaced, limiting observability promised in backend docs. 【F:docs/Backend_info/API_GUIDE (10).md†L420-L476】
- **Proof metadata minimization**: Proof creation UI only accepts a free-form note; invoice/EXIF/geofence metadata defined in backend schemas is not collected, reducing fraud signal quality. 【F:src/components/sender/ProofForm.tsx†L129-L195】

### E) Inefficiencies and tech debt hotspots
- **Dashboard N+1**: Payment extraction loops over summaries per escrow (at most 5 today), multiplying latency and load. 【F:src/lib/queries/sender.ts†L360-L387】
- **Polling opacity**: Proof polling hides 403/410 reasons and stops silently, leaving users without remediation steps. 【F:src/lib/queries/sender.ts†L1000-L1044】
- **Query alias risk**: Reliance on undocumented `review_mode` query adds hidden coupling to backend internals. 【F:src/lib/queries/admin.ts†L563-L581】

## Doc gaps that block UX
- **Admin proof queue contract**: Docs do not mention `review_mode` query; frontend uses it as a substitute for `/admin/proofs/review-queue`, creating ambiguity about the supported surface.
- **Advisor authentication path**: Docs lack a clear advisor-equivalent to `/auth/me`, leaving the frontend without a supported session endpoint for advisor routes.
- **External token issuer UX**: Backend docs describe token issuance endpoints, but UX requirements (fields, expiry constraints) are not mirrored in frontend guidance, blocking end-user onboarding for beneficiaries.

## What to change in frontend (recommendations only)
- Add advisor-aware session bootstrap (either adjust `useAuthMe` to call an advisor-safe endpoint or gate advisor layouts via advisor-specific fetch) to stop 401 loops.
- Switch admin proof queue to the documented `/admin/proofs/review-queue` (or add fallback handling) and align filters with backend schema.
- Remove or hard-hide `/mandates/cleanup` from sender UI; constrain dashboard to `/sender/dashboard` or cache summaries to avoid N+1 calls.
- Build token issuance UI for external proofs and expose beneficiary management only after aligning with backend contract fields (IBAN/bank/ID validation).
- Surface idempotency guidance and conflict messages on deposit/funding actions; add role-aware polling messaging for 403/410 stops.
