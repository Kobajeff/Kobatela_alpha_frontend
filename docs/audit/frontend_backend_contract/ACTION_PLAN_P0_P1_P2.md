# Action Plan (P0 / P1 / P2)

## P0 — unblock build/release without guessing
1. **Resolve escrow deposit payload mismatch**
   - **Owner**: Backend + Frontend
   - **Targets**: Backend request schema for `/escrows/{id}/deposit` in docs; frontend deposit mutation in `src/lib/queries/sender.ts`.
   - **Expected result**: Either backend accepts empty body or frontend sends `amount` as per `EscrowDepositCreate` contract. 【src/lib/queries/sender.ts#L783-L801】【docs/Backend_info/API_GUIDE (17).md#L147-L149】
2. **Clarify `mark-delivered` request payload**
   - **Owner**: Backend Docs
   - **Targets**: Document whether `EscrowActionPayload` is optional for `/escrows/{id}/mark-delivered`.
   - **Expected result**: Explicit doc guidance or frontend payload update. 【src/lib/queries/sender.ts#L695-L708】【docs/Backend_info/API_GUIDE (17).md#L149-L151】
3. **Fix admin AI-proof settings contract mismatch**
   - **Owner**: Backend Docs + Frontend
   - **Targets**: `/admin/settings/ai-proof` contract (request param vs body) and response schema; frontend `updateAiProofSetting` + `AiProofSetting` type.
   - **Expected result**: Documented request/response fields and aligned frontend payload. 【src/lib/adminApi.ts#L111-L115】【src/types/api.ts#L914-L918】【docs/Backend_info/API_GUIDE (17).md#L321-L323】
4. **Inflation adjustments list pagination alignment**
   - **Owner**: Backend Docs + Frontend
   - **Targets**: `/admin/pricing/inflation` query params/response shape; frontend pagination logic in `src/lib/queries/pricingAdmin.ts`.
   - **Expected result**: Either document pagination (`PaginatedResponse`) or update frontend to list response + filters. 【src/lib/queries/pricingAdmin.ts#L38-L53】【docs/Backend_info/API_GUIDE (17).md#L248-L251】
5. **Transactions response field alignment**
   - **Owner**: Backend Docs + Frontend
   - **Targets**: `/transactions` response fields in docs and UI table columns in `src/app/admin/transactions/page.tsx`.
   - **Expected result**: Either document `sender_id/receiver_id` or remove from UI. 【src/app/admin/transactions/page.tsx#L140-L151】【docs/Backend_info/FRONTEND_API_GUIDE (18).md#L135-L139】
6. **Document missing response schemas for critical admin views**
   - **Owner**: Backend Docs
   - **Targets**: `AdminProofReviewItem`, `AdminEscrowSummaryRead`, `AllowedUsageRead`, `AdminUser*`, `AdvisorProfileListItem` schemas.
   - **Expected result**: Field-level schema lists in API guide to unblock UI without guessing. 【docs/Backend_info/API_GUIDE (17).md#L319-L320】【docs/Backend_info/API_GUIDE (17).md#L155-L156】【docs/Backend_info/API_GUIDE (17).md#L352-L358】【docs/Backend_info/API_GUIDE (17).md#L119-L123】【docs/Backend_info/API_GUIDE (17).md#L297-L302】

## P1 — fill schema gaps + role/scope alignment
1. **Align admin/support role gating in UI**
   - **Owner**: Frontend
   - **Targets**: `src/app/admin/layout.tsx` and any admin pages that should be admin-only (users, advisors).
   - **Expected result**: Support role only sees endpoints documented for support; admin-only endpoints gated accordingly. 【src/app/admin/layout.tsx#L3-L15】【docs/Backend_info/API_GUIDE (17).md#L119-L123】【docs/Backend_info/API_GUIDE (17).md#L297-L302】
2. **Document `SenderEscrowSummary` response schema**
   - **Owner**: Backend Docs
   - **Targets**: `SenderEscrowSummary` fields in API guide schema section.
   - **Expected result**: Explicit list of escrow/milestone/proof/payment fields used by sender UI. 【src/components/sender/SenderEscrowDetails.tsx#L100-L332】【docs/Backend_info/API_GUIDE (17).md#L155-L155】
3. **Document `EscrowListItem.currency` or remove from UI**
   - **Owner**: Backend Docs + Frontend
   - **Targets**: Escrow list schema fields; sender list UI rendering.
   - **Expected result**: Align docs/response field for currency. 【src/components/sender/SenderEscrowList.tsx#L29-L40】【docs/Backend_info/API_GUIDE (17).md#L406-L406】
4. **Clarify beneficiary profile field list**
   - **Owner**: Backend Docs
   - **Targets**: `BeneficiaryProfileAdminRead` field list in API guide.
   - **Expected result**: UI fields are explicitly supported. 【src/app/admin/beneficiaries/lookup/page.tsx#L16-L94】【docs/Backend_info/API_GUIDE (17).md#L430-L432】

## P2 — refactors / hardening
1. **Shared schema typing between frontend + docs**
   - **Owner**: Frontend + Docs
   - **Targets**: Generate or sync TypeScript types from backend Pydantic/OpenAPI.
   - **Expected result**: Reduced drift for admin/support endpoints and summary schemas. 【src/types/api.ts#L914-L918】【docs/Backend_info/API_GUIDE (17).md#L388-L415】
2. **Centralize role gating**
   - **Owner**: Frontend
   - **Targets**: `RequireScope` and portal routing to ensure admin/support visibility matches backend scopes.
   - **Expected result**: Avoid UI entry into admin-only pages for support role. 【src/components/system/RequireScope.tsx#L68-L116】【src/app/admin/layout.tsx#L3-L15】
