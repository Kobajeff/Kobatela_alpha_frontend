## Executive summary

- Backend contract makes `/admin/proofs/review-queue` the canonical admin queue endpoint, with a deprecated string alias `review_mode=review_queue` on `/proofs`; boolean `review_mode` values are not part of the contract. 【docs/Backend_info/API_GUIDE (11).md†L272-L289】【docs/Backend_info/API_GUIDE (11).md†L696-L696】
- Admin dashboard counts call `/proofs` with `review_mode=true`, which serializes the boolean to the string `"true"` and triggers backend 400 validation errors, matching the observed logs. 【src/lib/queries/admin.ts†L123-L146】【src/lib/queries/queryUtils.ts†L3-L10】
- Other admin proof UI surfaces already use the canonical `/admin/proofs/review-queue` endpoint, so the breakage is isolated to the dashboard count probes. 【src/lib/queries/admin.ts†L552-L581】
- Auth/token wiring attaches the bearer token when present; there is no evidence that missing auth headers cause the 400s. 【src/lib/apiClient.ts†L19-L30】

## Evidence

### A) Backend contract (docs/backend_info)
- Canonical admin review queue: `GET /admin/proofs/review-queue` with filters; deprecated alias `GET /proofs?review_mode=review_queue` emits a deprecation header. 【docs/Backend_info/API_GUIDE (11).md†L272-L289】
- Deprecation table reiterates the alias (`/proofs?review_mode=review_queue`) slated for removal in favor of `/admin/proofs/review-queue`. 【docs/Backend_info/API_GUIDE (11).md†L690-L696】
- Proof list endpoint accepts `review_mode` among query params but no boolean semantics are described. 【docs/Backend_info/FRONTEND_API_GUIDE (12).md†L74-L82】
- Admin runbook lists `review_mode` as a filter for `/admin/proofs/review-queue`, implying string/enum usage alongside other filters. 【docs/Backend_info/ADMIN_RUNBOOK (9).md†L110-L114】

### B) Frontend network call sources
- Query builder casts all param values to strings; booleans become `"true"`/`"false"`. 【src/lib/queries/queryUtils.ts†L3-L10】
- Admin dashboard count helper fetches `/proofs` with `review_mode: true` plus `status`, producing `/proofs?review_mode=true&status=...`; fallback for 422 retries with `review_mode=true` only. 【src/lib/queries/admin.ts†L123-L150】
- Dashboard stats hook invokes the above helper for PENDING/APPROVED/REJECTED counts, so three failing calls occur on load. 【src/lib/queries/admin.ts†L266-L287】
- Admin proof review table uses the documented `/admin/proofs/review-queue` with limit/offset/advisor filters, showing the codebase already has the correct endpoint elsewhere. 【src/lib/queries/admin.ts†L552-L581】

### C) Auth/guard inspection
- Axios interceptor attaches `Authorization: Bearer <token>` when a token exists and logs in development. 【src/lib/apiClient.ts†L19-L30】
- RequireScope tracks `hasToken`, resets session on missing/401, and gates rendering states, but it does not alter the query parameters used for proofs. 【src/components/system/RequireScope.tsx†L75-L123】
- Auth `useAuthMe` only runs when a token is present, while other queries (including dashboard stats) are not token-gated and rely on the interceptor to add auth if available. 【src/lib/queries/sender.ts†L205-L251】

### D) Contract vs frontend assumptions
| Surface | Contract expects | Frontend sends/uses | Notes |
| --- | --- | --- | --- |
| Proof listing for review queue | Deprecated alias `GET /proofs?review_mode=review_queue` (string value), admin/support only. 【docs/Backend_info/API_GUIDE (11).md†L272-L289】 | `/proofs?review_mode=true&status=...` for dashboard counts. 【src/lib/queries/admin.ts†L123-L146】 | Type mismatch: boolean → `"true"` not recognized by backend validator. |
| Canonical admin queue | `GET /admin/proofs/review-queue` with filters (`advisor_id`, `unassigned_only`, `review_mode`, `status`, etc.). 【docs/Backend_info/API_GUIDE (11).md†L272-L289】【docs/Backend_info/ADMIN_RUNBOOK (9).md†L110-L114】 | Used correctly in `useAdminProofReviewQueue`. 【src/lib/queries/admin.ts†L552-L581】 | Other admin surfaces already follow contract. |
| `review_mode` parameter type | Implicit string/enum (example value `review_queue`; alias noted as deprecated). 【docs/Backend_info/API_GUIDE (11).md†L272-L289】 | Declared as boolean-capable `QueryParams` and passed `true`. 【src/lib/queries/queryUtils.ts†L3-L10】【src/lib/queries/admin.ts†L123-L146】 | Serialization coerces boolean to `"true"`, causing 400. |

## Hypotheses
- **H1 (boolean vs enum `review_mode`)**: **Validated.** Backend documents string value `review_queue`; frontend sends boolean `true`, leading to 400s. 【docs/Backend_info/API_GUIDE (11).md†L272-L289】【src/lib/queries/admin.ts†L123-L146】
- **H2 (should use `/admin/proofs/review-queue`)**: **Validated for dashboard counts.** Counts still hit `/proofs` alias instead of the canonical admin endpoint, while the table uses the correct path. 【src/lib/queries/admin.ts†L123-L146】【src/lib/queries/admin.ts†L552-L581】
- **H3 (auth guard/token issue)**: **Invalidated.** Auth token is attached when present and guards reset on missing token; errors observed are 400 validation, not 401/403. 【src/lib/apiClient.ts†L19-L30】【src/components/system/RequireScope.tsx†L75-L123】
- **H4 (contract drift)**: **Validated.** Contract marks `/proofs?review_mode=review_queue` as deprecated and string-based; frontend assumes boolean is acceptable. 【docs/Backend_info/API_GUIDE (11).md†L272-L289】【docs/Backend_info/API_GUIDE (11).md†L690-L696】
- **H5 (query builder coercion)**: **Validated.** `buildQueryString` stringifies booleans, turning `true` into `"true"` in the query string. 【src/lib/queries/queryUtils.ts†L3-L10】

## Conclusion
Most likely root cause: The admin dashboard’s proof count probes call `/proofs` with `review_mode=true`, which the backend does not accept—contracted/legacy value is the string `review_queue`, and the alias itself is deprecated in favor of `/admin/proofs/review-queue`. The boolean-to-string coercion (`true` → `"true"`) therefore triggers backend validation errors (400), preventing dashboard load and yielding the “Unsupported review_mode filter” UI message.

## Actionable next steps
- **Frontend:** Change the dashboard count queries to use the canonical `/admin/proofs/review-queue` (or, at minimum, send `review_mode=review_queue` as a string) when counting by status, aligning parameter types with the contract and avoiding deprecated surfaces.
- **Backend (optional):** If short-term compatibility is desired, consider tolerating boolean `review_mode=true` as a backward-compatibility alias or returning a clearer error message, but the contract already discourages extending the deprecated alias.
