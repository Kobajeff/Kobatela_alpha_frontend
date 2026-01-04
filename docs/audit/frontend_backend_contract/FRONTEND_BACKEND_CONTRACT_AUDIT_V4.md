# Frontend ↔ Backend Contract Audit V4

## Executive summary
- **PASS**: 54
- **FAIL**: 0
- **STOP**: 8

These counts are derived from the contract matrix covering every frontend API call observed in the codebase.【docs/audit/frontend_backend_contract/CONTRACT_MATRIX.md#L1-L200】

## Key blockers (top 10)
1. **Inflation adjustments list pagination mismatch**: Frontend expects paginated results with `limit/offset`, but docs define list response with `country_code/category/active_on` filters. **STOP**. 【src/lib/queries/pricingAdmin.ts#L38-L53】【docs/Backend_info/API_GUIDE (18).md#L248-L251】
2. **Transactions response field mismatch**: Admin UI displays `sender_id`/`receiver_id`, but docs say transaction items expose only ids/status/amount/currency/timestamps. **STOP**. 【src/app/admin/transactions/page.tsx#L140-L151】【docs/Backend_info/FRONTEND_API_GUIDE (19).md#L135-L139】
3. **Admin escrow summary fields not explicit**: UI reads multiple summary fields, but docs only provide a high-level description. **STOP**. 【src/app/admin/escrows/[id]/page.tsx#L311-L348】【docs/Backend_info/API_GUIDE (18).md#L155-L156】
4. **Admin user/advisor/spend/beneficiary schemas incomplete or role-mismatched**: Multiple admin endpoints lack explicit field lists, while UI relies on many fields; additionally, admin layout allows support role access though endpoints are admin-only. **STOP** until schemas/role gating are reconciled. 【src/app/admin/layout.tsx#L3-L15】【src/lib/adminApi.ts#L22-L94】【src/lib/queries/admin.ts#L850-L1214】【docs/Backend_info/API_GUIDE (18).md#L119-L123】【docs/Backend_info/API_GUIDE (18).md#L297-L302】【docs/Backend_info/API_GUIDE (18).md#L352-L358】

## Risks
### Security / Role enforcement
- **Support role access to admin-only endpoints**: Admin layout admits support role broadly, but several endpoints are admin-only in the API guide (admin users, admin advisors). This produces a role mismatch and potential unauthorized UI access. 【src/app/admin/layout.tsx#L3-L15】【docs/Backend_info/API_GUIDE (18).md#L119-L123】【docs/Backend_info/API_GUIDE (18).md#L297-L302】

### Operability
- **Admin escrow summary UI depends on undocumented fields**, blocking reliable admin operations. 【src/app/admin/escrows/[id]/page.tsx#L311-L348】【docs/Backend_info/API_GUIDE (18).md#L155-L156】

### Correctness / Data integrity
- **Transactions UI expects sender/receiver IDs** that the docs explicitly omit. This could lead to missing data in production. 【src/app/admin/transactions/page.tsx#L140-L151】【docs/Backend_info/FRONTEND_API_GUIDE (19).md#L135-L139】

## High-level conclusions
- The frontend is broadly aligned with documented endpoints, but **15 STOP conditions** remain due to missing field-level schemas or request/response mismatches in docs. The admin surface is the primary risk area (proof review queue, escrow summary, settings, users/advisors).【docs/audit/frontend_backend_contract/CONTRACT_MATRIX.md#L1-L200】
- The sender escrow lifecycle payloads and admin proof review queue are now aligned to backend export schemas for Block 1 endpoints. 【src/lib/queries/sender.ts#L695-L806】【src/components/admin/AdminProofReviewTable.tsx#L29-L80】【docs/Backend_info/CONTRACT_SCHEMAS.generated.json#L1-L34】
