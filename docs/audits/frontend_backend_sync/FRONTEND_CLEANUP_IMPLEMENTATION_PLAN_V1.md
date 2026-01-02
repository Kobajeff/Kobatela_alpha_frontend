# FRONTEND_CLEANUP_IMPLEMENTATION_PLAN_V1

## B12 — External portal token transport hardening
- **Files impacted**: `src/app/sender/escrows/[id]/external-proof-tokens/page.tsx`, `src/lib/external/externalSession.ts`, `src/app/external/escrow/page.tsx` (and related external entrypoints).
- **Expected minimal behavior change**: Beneficiary portal links should avoid `?token=` in URLs; tokens are captured once (clipboard or one-time code) and applied to `Authorization: Bearer` headers without leaving secrets in the address bar or history.
- **Guardrails**: Keep backward compatibility by supporting a one-time landing page that reads a short code and immediately strips it from the URL. Do not loosen backend token scope/expiry rules.
- **Validation checklist**: Issue token → copy/share link → portal loads with header-based auth and URL cleaned; uploads and submit succeed; revoked/expired tokens still produce 410; no token visible in network logs or browser history after landing.

## B13 — Admin escrow summary alignment
- **Files impacted**: `src/lib/queries/admin.ts`, `src/types/api.ts`, `src/app/admin/escrows/[id]/page.tsx`, `src/lib/queryKeys.ts`.
- **Expected minimal behavior change**: Admin/support views should call `/admin/escrows/{id}/summary` with `proofs_limit`/`include_milestones`/`include_proofs`, receiving unredacted payments/proofs while sender views remain unchanged.
- **Guardrails**: Preserve existing polling cadence and error handling; ensure sender/provider redaction rules are not relaxed for non-admin views; keep compatibility with demo mode.
- **Validation checklist**: Admin escrow page loads with proofs and payments visible (including PSP refs/idempotency keys); toggling include flags works; polling stops on terminal states; 403/404/410 continue to halt polling gracefully.

## B14 — Payment & proof schema/redaction alignment
- **Files impacted**: `src/types/api.ts`, `src/components/sender/SenderEscrowDetails.tsx`, `src/app/admin/payments/[id]/page.tsx`, `src/components/sender/ProofAiStatus.tsx`, `src/lib/queries/admin.ts` (payment/proof mappings).
- **Expected minimal behavior change**: Extend types/UI to include `psp_ref`, `idempotency_key`, `payout_blocked_reasons`, AI flags, and invoice totals; surface blockers to admin/support, while hiding PSP/PII fields from sender/provider/advisor (RGPD: redact PSP identifiers and invoice amounts for non-ops roles).
- **Guardrails**: Keep existing statuses and polling intact; avoid leaking PSP refs or invoice amounts outside admin/support; maintain backward compatibility with existing API responses that lack new fields.
- **Validation checklist**: Type check passes; admin payment detail shows blockers and PSP refs; sender/provider/advisor views omit PSP/PII; proof AI badges still restricted to admin/support; no runtime errors when optional fields are absent.

## B15 — Mandate maintenance gating
- **Files impacted**: `src/lib/queries/sender.ts`, `src/app/sender/mandates/page.tsx`, `src/lib/queryKeys.ts` (mandate keys).
- **Expected minimal behavior change**: Remove `/mandates/cleanup` from sender UI and, if needed, replace with a mandate list view based on GET `/mandates` to keep caches coherent.
- **Guardrails**: Ensure existing mandate creation flow remains intact; avoid breaking mandate-to-escrow prefill; handle 403/404 gracefully without session reset.
- **Validation checklist**: Mandate creation still succeeds; no calls to `/mandates/cleanup`; any new list view paginates correctly; prefill into escrow create still works.

## B16 — Coverage for unused backend surfaces
- **Files impacted**: (scoped per feature) `src/app/admin/**` and `src/lib/queries/**` for alerts, fraud/risk snapshots, beneficiaries, spend/transactions, public-sector.
- **Expected minimal behavior change**: Either add explicit UI gating/feature flags or lightweight read-only views for currently unused endpoints to keep contracts exercised without altering sender/admin core flows.
- **Guardrails**: Do not expose PII (beneficiaries/spend/transactions) without redaction rules; keep new screens behind role/scope checks; prefer read-only dashboards before enabling mutations.
- **Validation checklist**: Feature flags default to off; authorized roles can load new read-only views without errors; no unauthorized access for sender/provider; CI/type checks cover new query keys and schemas.
