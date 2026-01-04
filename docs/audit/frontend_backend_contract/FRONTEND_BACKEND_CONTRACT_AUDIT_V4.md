# Frontend ↔ Backend Contract Audit V4

## Executive summary
- **PASS**: 47
- **FAIL**: 0
- **STOP**: 15

These counts are derived from the contract matrix covering every frontend API call observed in the codebase.【docs/audit/frontend_backend_contract/CONTRACT_MATRIX.md#L1-L200】

## Key blockers (top 10)
1. **Sender escrow summary schema not explicit**: UI depends on many `SenderEscrowSummary` fields (escrow, milestones, proofs, payments), but the backend docs do not enumerate the summary schema fields. **STOP** required to avoid guessing.【src/components/sender/SenderEscrowDetails.tsx#L100-L332】【docs/Backend_info/API_GUIDE (17).md#L155-L155】
2. **Escrow list response missing `currency` in docs**: UI renders `currency` from `EscrowListItem`, but API guide lists only status/amount/deadline/created_at. **STOP** until field is documented. 【src/components/sender/SenderEscrowList.tsx#L29-L40】【docs/Backend_info/API_GUIDE (17).md#L406-L406】
3. **Escrow deposit payload mismatch**: Docs require `EscrowDepositCreate.amount`, but frontend posts an empty body with only the idempotency header. **STOP** until backend confirms body is optional or frontend adds amount. 【src/lib/queries/sender.ts#L783-L801】【docs/Backend_info/API_GUIDE (17).md#L147-L149】【docs/Backend_info/API_GUIDE (17).md#L407-L408】
4. **Mark delivered payload mismatch**: Docs specify `EscrowActionPayload`, but frontend sends no body. **STOP** pending backend confirmation of optional payload. 【src/lib/queries/sender.ts#L695-L708】【docs/Backend_info/API_GUIDE (17).md#L149-L151】
5. **Admin AI-proof setting contract mismatch**: Docs say `POST /admin/settings/ai-proof` uses query param `enabled` and returns a `dict`, while frontend sends `{ bool_value }` and expects `AiProofSetting`. **STOP**. 【src/lib/adminApi.ts#L111-L115】【src/types/api.ts#L914-L918】【docs/Backend_info/API_GUIDE (17).md#L321-L323】
6. **Inflation adjustments list pagination mismatch**: Frontend expects paginated results with `limit/offset`, but docs define list response with `country_code/category/active_on` filters. **STOP**. 【src/lib/queries/pricingAdmin.ts#L38-L53】【docs/Backend_info/API_GUIDE (17).md#L248-L251】
7. **Transactions response field mismatch**: Admin UI displays `sender_id`/`receiver_id`, but docs say transaction items expose only ids/status/amount/currency/timestamps. **STOP**. 【src/app/admin/transactions/page.tsx#L140-L151】【docs/Backend_info/FRONTEND_API_GUIDE (18).md#L135-L139】
8. **Admin proof review queue fields not explicit**: UI maps many fields (AI scores, invoice amounts), but docs only reference `AdminProofReviewItem` without field list. **STOP**. 【src/lib/queries/admin.ts#L153-L182】【docs/Backend_info/API_GUIDE (17).md#L319-L320】
9. **Admin escrow summary fields not explicit**: UI reads multiple summary fields, but docs only provide a high-level description. **STOP**. 【src/app/admin/escrows/[id]/page.tsx#L311-L348】【docs/Backend_info/API_GUIDE (17).md#L155-L156】
10. **Admin user/advisor/spend/beneficiary schemas incomplete or role-mismatched**: Multiple admin endpoints lack explicit field lists, while UI relies on many fields; additionally, admin layout allows support role access though endpoints are admin-only. **STOP** until schemas/role gating are reconciled. 【src/app/admin/layout.tsx#L3-L15】【src/lib/adminApi.ts#L22-L94】【src/lib/queries/admin.ts#L850-L1214】【docs/Backend_info/API_GUIDE (17).md#L119-L123】【docs/Backend_info/API_GUIDE (17).md#L297-L302】【docs/Backend_info/API_GUIDE (17).md#L352-L358】

## Risks
### Security / Role enforcement
- **Support role access to admin-only endpoints**: Admin layout admits support role broadly, but several endpoints are admin-only in the API guide (admin users, admin advisors). This produces a role mismatch and potential unauthorized UI access. 【src/app/admin/layout.tsx#L3-L15】【docs/Backend_info/API_GUIDE (17).md#L119-L123】【docs/Backend_info/API_GUIDE (17).md#L297-L302】

### Operability
- **Admin proof review queue cannot be safely rendered** without explicit field-level schema, leaving UI dependent on undocumented fields. 【src/lib/queries/admin.ts#L153-L182】【docs/Backend_info/API_GUIDE (17).md#L319-L320】
- **Admin escrow summary UI depends on undocumented fields**, blocking reliable admin operations. 【src/app/admin/escrows/[id]/page.tsx#L311-L348】【docs/Backend_info/API_GUIDE (17).md#L155-L156】

### Correctness / Data integrity
- **Escrow deposit payload mismatch** risks 422/validation errors or silent failures if `amount` is required by backend. 【src/lib/queries/sender.ts#L783-L801】【docs/Backend_info/API_GUIDE (17).md#L147-L149】
- **Transactions UI expects sender/receiver IDs** that the docs explicitly omit. This could lead to missing data in production. 【src/app/admin/transactions/page.tsx#L140-L151】【docs/Backend_info/FRONTEND_API_GUIDE (18).md#L135-L139】

## High-level conclusions
- The frontend is broadly aligned with documented endpoints, but **15 STOP conditions** remain due to missing field-level schemas or request/response mismatches in docs. The admin surface is the primary risk area (proof review queue, escrow summary, settings, users/advisors).【docs/audit/frontend_backend_contract/CONTRACT_MATRIX.md#L1-L200】
- The sender escrow lifecycle has two critical payload mismatches (`deposit`, `mark-delivered`) that must be reconciled before release. 【src/lib/queries/sender.ts#L695-L801】【docs/Backend_info/API_GUIDE (17).md#L147-L151】
