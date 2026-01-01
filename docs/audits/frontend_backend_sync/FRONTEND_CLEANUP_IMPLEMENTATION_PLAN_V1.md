# FRONTEND_CLEANUP_IMPLEMENTATION_PLAN_V1

## B12: Remove or guard maintenance/undocumented endpoints
- **Files**: `src/lib/queries/sender.ts` (mandate cleanup), `src/lib/queries/admin.ts` (proof review queue params), related UI entry points.
- **Change**: Hide `/mandates/cleanup` actions from sender UI; replace `review_mode` reliance with the documented `/admin/proofs/review-queue` call or add a wrapper that falls back gracefully.
- **Guardrails**: Keep mutation/query keys stable; do not alter backend payloads beyond path swap. Ensure admin queue still paginates and maps to `AdminProofReviewItem`.
- **Validation**: (1) Sender mandate page no longer issues cleanup requests. (2) Admin proof queue lists items and approve/reject still invalidates caches. (3) 403/404 handling unchanged.

## B13: Align authentication and scopes (advisor + provider/support readiness)
- **Files**: `src/lib/queries/sender.ts` (`useAuthMe`), `src/components/system/RequireScope.tsx`, `src/app/advisor/layout.tsx`, `src/lib/authIdentity.ts`.
- **Change**: Introduce advisor-safe session fetch (advisor-specific endpoint or scope-aware `/auth/me` fallback); update `RequireScope` to avoid infinite resets when advisor tokens are used; prepare provider/support role guards for proof upload/decision CTAs.
- **Guardrails**: Preserve demo-mode behavior; avoid breaking sender/admin redirects. Keep token reset semantics on true 401/404.
- **Validation**: (1) Advisor reaches queue/profile without redirect loop. (2) Sender/admin flows still redirect correctly on 401/403. (3) Provider/support gates remain no-op until role is enabled.

## B14: Proof lifecycle alignment
- **Files**: `src/lib/queries/admin.ts` (proof queue + decisions), `src/lib/queries/sender.ts` (advisor review request), `src/components/sender/SenderEscrowDetails.tsx` (decision CTAs), `src/types/api.ts` (proof list types).
- **Change**: Point proof queue to documented endpoint; add advisor availability/role messaging when request advisor review; ensure decision CTAs hide for unauthorized roles and surface backend error codes distinctly.
- **Guardrails**: Keep polling intervals/pagination sizes; avoid altering `queryKeys` to limit cache churn.
- **Validation**: (1) Proof queue still paginates and approve/reject works. (2) Sender can request advisor review and receives explicit “no advisor available” copy. (3) Unauthorized roles see hidden CTAs without 403 spam.

## B15: External portal enablement
- **Files**: `src/lib/api/externalClient.ts`, `src/lib/queries/external.ts`, new issuer UI under `src/app/external/*` or sender/admin space.
- **Change**: Add token issuance UI for `/external/proofs/tokens` and `/external/tokens/beneficiary` with expiry bounds and escrow/milestone selection; store tokens securely (avoid URL persistence after first load). Add path-variant support for `/external/escrows/{id}` if needed.
- **Guardrails**: Respect token transport rules (Authorization + X-External-Token, no query param logging); cap polling per backend recommendations; avoid exposing escrow IDs in logs.
- **Validation**: (1) Issued token can upload/submit and status-poll successfully. (2) Token TTL validation errors are shown. (3) Token is cleared on 401/403/410 per backend rules.

## B16: Dashboard and polling performance hardening
- **Files**: `src/lib/queries/sender.ts` (dashboard, proof polling), `src/lib/pollingDoctrine.ts`, `src/components/sender/SenderEscrowDetails.tsx` (payment list), `src/components/common/ErrorAlert.tsx` (optional messaging).
- **Change**: Use `/sender/dashboard` or batch summary requests to avoid N+1; surface explicit messages when polling stops due to 403/410/409; add conflict/idempotency hints on deposit/funding actions.
- **Guardrails**: Maintain existing UI data shape; keep maxDuration/backoff semantics for polling; do not change demo-mode fixtures.
- **Validation**: (1) Dashboard loads with fewer HTTP calls (<=3) and shows same cards. (2) Proof polling shows user-facing reason when stopped. (3) Deposit/funding CTA copy mentions reusing Idempotency-Key on retry.
