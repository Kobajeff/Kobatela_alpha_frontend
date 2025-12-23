# Frontend vs Backend Comparative Audit

## 1) Executive Summary
1. Workspace contains only the Next.js frontend (`/workspace/Kobatela_alpha_frontend`); no backend repository was detected in sibling directories, so backend inventory is sourced solely from the provided contract snapshot (see “Missing repo” section for rerun steps). 
2. The frontend currently implements sender and admin experiences across 15 routes, with core sender flows for escrow summaries, proof submission, and advisory lookup, plus admin dashboards, advisors, and sender management. 
3. API usage is centralized in `src/lib/queries/*` and `src/lib/adminApi.ts`, with axios configured for bearer auth and automatic session reset on 401. (F:src/lib/apiClient.ts:L1-L108)
4. Frontend expects pagination payloads to return `{ items, total, limit, offset }`, and normalizes either arrays or `items` fields depending on the endpoint response shape. (F:src/types/api.ts:L1-L9; F:src/lib/queries/queryUtils.ts:L1-L33)
5. Escrow summary polling is implemented for sender and admin views with tiered refetch intervals (funding, milestones, payout) and “Last updated” indicators on detail screens. (F:src/lib/pollingDoctrine.ts:L1-L138; F:src/lib/queries/sender.ts:L271-L425; F:src/lib/queries/admin.ts:L393-L549; F:src/components/sender/SenderEscrowDetails.tsx:L56-L201; F:src/app/admin/escrows/[id]/page.tsx:L25-L223)
6. Proof submission includes file upload to `/files/proofs`, create proof mutation, and proof status polling that invalidates escrow summaries when complete. (F:src/lib/apiClient.ts:L89-L108; F:src/lib/queries/sender.ts:L610-L647; F:src/lib/queries/sender.ts:L475-L608)
7. Several frontend calls are not present in the backend snapshot (e.g., `/proofs/{id}`, `/admin/users` read endpoints, `/admin/settings/ai-proof`, `/admin/advisors/{id}/senders`). These require contract reconciliation. (F:src/lib/queries/sender.ts:L510-L534; F:src/lib/adminApi.ts:L30-L109; F:src/lib/queries/admin.ts:L601-L621)
8. Conversely, multiple backend endpoints are unused by the frontend (mandates, merchant suggestions, pricing admin, advisor portal, escrow funding/creation, and payout execution). 
9. The retry policy does not align with the fintech-safe doctrine: many React Query hooks rely on defaults or retry without explicit exclusion of 401/403/409/422 or backoff control. (F:src/lib/queries/sender.ts:L147-L166; F:src/lib/queries/sender.ts:L336-L361; F:src/lib/queries/admin.ts:L458-L485)
10. Prioritized backlog focuses on reconciling missing contract endpoints, adding screens for escrow creation/funding, merchant suggestions, pricing admin, advisor portal, mandates, and payments execution, and tightening retry/error handling. 

## 2) Backend Inventory (from provided contract snapshot)
> **Note:** Backend repo not found in this workspace; inventory is based solely on the provided contract snapshot. See “Missing repo” for rerun instructions.

### 2.1 Endpoint Inventory (snapshot)
| Method | Path | Scope hint | Description |
| --- | --- | --- | --- |
| POST | /auth/login | None | Issue API key for allowed scope(s) |
| GET | /auth/me | sender/provider/admin scopes | Return user linked to API key |
| POST | /admin/users | admin scope | Admin creates user + optional API keys |
| POST | /mandates | sender | Create a smart mandate (usage mandate) |
| POST | /mandates/cleanup | sender | Expire mandates past their validity |
| GET | /escrows | sender/provider/support | List escrows (mine or paginated) |
| POST | /escrows | sender | Create escrow |
| POST | /escrows/{id}/deposit | sender | Idempotent funding |
| POST | /escrows/{id}/funding-session | sender/admin | Create PSP funding session |
| POST | /escrows/{id}/mark-delivered | sender | Mark delivered |
| POST | /escrows/{id}/client-approve | sender | Client approve |
| POST | /escrows/{id}/client-reject | sender | Client reject |
| POST | /escrows/{id}/check-deadline | sender | Check deadline |
| GET | /escrows/{id} | participant | Get escrow detail |
| GET | /escrows/{id}/summary | participant | Get escrow summary |
| POST | /escrows/{id}/milestones | sender | Create milestone |
| GET | /escrows/{id}/milestones | participant | List milestones |
| GET | /escrows/milestones/{milestone_id} | participant | Get milestone |
| POST | /files/proofs | participant | Upload proof file |
| POST | /proofs | participant | Submit proof |
| GET | /proofs | participant | List proofs (filterable) |
| POST | /proofs/{id}/decision | support/admin/sender | Make decision |
| POST | /proofs/{id}/request_advisor_review | sender/support | Request advisor review |
| POST | /merchant-suggestions | sender | Create merchant suggestion |
| GET | /merchant-suggestions | sender | List suggestions |
| GET | /merchant-suggestions/{id} | sender | Get suggestion |
| GET | /admin/merchant-suggestions | admin/support | Admin list suggestions |
| POST | /admin/merchant-suggestions/{id}/approve | admin/support | Approve suggestion |
| POST | /admin/merchant-suggestions/{id}/reject | admin/support | Reject suggestion |
| POST | /admin/merchant-suggestions/{id}/promote | admin/support | Promote suggestion |
| POST | /admin/pricing/reference/import-csv | pricing_admin scope | Import reference CSV |
| POST | /admin/pricing/inflation/upload-csv | pricing_admin scope | Upload inflation CSV |
| GET | /admin/pricing/inflation | pricing_admin scope | List inflation adjustments |
| POST | /admin/pricing/inflation | pricing_admin scope | Create inflation adjustment |
| PUT | /admin/pricing/inflation/{id} | pricing_admin scope | Update inflation adjustment |
| DELETE | /admin/pricing/inflation/{id} | pricing_admin scope | Delete inflation adjustment |
| GET | /me/advisor | sender | Get my advisor |
| GET | /advisor/me/profile | advisor | Advisor profile |
| GET | /advisor/me/proofs | advisor | Advisor proofs list |
| POST | /advisor/proofs/{id}/approve | advisor | Advisor approve |
| POST | /advisor/proofs/{id}/reject | advisor | Advisor reject |
| POST | /payments/execute/{payment_id} | admin/support | Manual execute payment |
| GET | /admin/payments | admin/support | List payments |
| POST | /admin/advisors | admin | Create advisor profile |
| GET | /admin/advisors | admin | List advisors |
| PATCH | /admin/advisors/{id} | admin | Update advisor |
| POST | /admin/advisors/{id}/assign-sender | admin | Assign sender |

### 2.2 Auth / Roles
* Frontend models roles as `sender`, `admin`, `both`, `advisor`, and `support` for user and RBAC decisions. (F:src/types/api.ts:L1-L19)
* Admin and sender layouts gate access based on `useAuthMe` role checks and redirect on unauthorized access. (F:src/app/admin/layout.tsx:L1-L55; F:src/app/sender/layout.tsx:L1-L55)

### 2.3 Error Envelope Contract (frontend expectations)
* Frontend normalization expects error payloads shaped as `{ error: { message, code, details } }`, `{ message, code, details }`, or `{ detail: string | array | { message } }`, with fallbacks for Axios error payloads. (F:src/lib/apiError.ts:L12-L125)
* Status-specific user messages are mapped for 404/410/409/422 and insufficient scope codes. (F:src/lib/errorMessages.ts:L1-L24)
* 401 responses trigger session reset and redirect to `/login`. (F:src/lib/apiClient.ts:L28-L45; F:src/lib/sessionReset.ts:L1-L16)

### 2.4 Pagination Contract (frontend expectations)
* Frontend expects paginated responses to include `items`, `total`, `limit`, and `offset`, but can also accept plain arrays in some list queries. (F:src/types/api.ts:L1-L9; F:src/lib/queries/queryUtils.ts:L1-L33)

### 2.5 Request/Response Shapes (frontend expectations)
* Auth user objects include `id`, `email`, `username`, `role`, and optional `payout_channel`/`created_at` fields; sender/admin RBAC relies on these fields for routing. (F:src/types/api.ts:L11-L24; F:src/app/page.tsx:L16-L39)
* Proof submissions expect `CreateProofPayload` fields such as `escrow_id`, `milestone_id`, `description`, `file_id`, and `attachment_url`. (F:src/types/api.ts:L48-L54)
* Escrow list items include `id`, `status`, `amount`, `currency`, `created_at`, `updated_at`, and optional metadata, which drive list/table displays. (F:src/types/api.ts:L26-L46)

### Missing repo
* Backend repository was not found in `/workspace`. To rerun this audit with backend evidence, clone or mount the backend repo alongside the frontend and rerun a backend OpenAPI extraction.
* Example rerun commands (from a workspace root with backend repo present):
  * `ls /workspace`
  * `cd /workspace/<backend-repo> && python -c "import json; from app.main import app; print(json.dumps(app.openapi(), indent=2))" > /tmp/openapi.json`

## 3) Frontend Inventory (authoritative)

### 3.1 Pages Inventory (Next.js routes)
| Route | Main UI components | Hooks/queries/mutations | API endpoints referenced |
| --- | --- | --- | --- |
| `/` | Redirect screen + ErrorAlert | `useAuthMe` | `GET /auth/me` | 
| `/login` | Login form | `useLogin` | `POST /auth/login` |
| `/sender/dashboard` | Dashboard cards, `MyAdvisorCard` | `useSenderDashboard` | `GET /escrows`, `GET /proofs`, `GET /escrows/{id}/summary` |
| `/sender/escrows` | `SenderEscrowList`, filters | `useSenderEscrows` | `GET /escrows` |
| `/sender/escrows/[id]` | `SenderEscrowDetails`, `ProofForm` | `useSenderEscrowSummary`, `useMarkDelivered`, `useClientApprove`, `useClientReject`, `useCheckDeadline`, `useProofReviewPolling` | `GET /escrows/{id}/summary`, `POST /escrows/{id}/mark-delivered`, `POST /escrows/{id}/client-approve`, `POST /escrows/{id}/client-reject`, `POST /escrows/{id}/check-deadline`, `GET /proofs/{id}`, `POST /proofs`, `POST /files/proofs` |
| `/sender/advisor` | Advisor profile card | `useMyAdvisor` | `GET /me/advisor` |
| `/sender/profile` | Profile details | `useAuthMe` | `GET /auth/me` |
| `/admin/dashboard` | Stats cards, `AdminUserCreator` | `useAdminDashboardStatsComputed` | `GET /escrows`, `GET /proofs`, `GET /admin/payments`, `POST /admin/users` |
| `/admin/senders` | Senders table | `useAdminSenders` | `GET /admin/users` |
| `/admin/senders/[id]` | Sender profile + API keys | `useAdminSenderProfile`, `useAdminUserApiKeys`, `useRevokeAdminUserApiKey` | `GET /admin/users/{id}`, `GET /admin/users/{id}/api-keys`, `DELETE /admin/users/{id}/api-keys/{id}` |
| `/admin/advisors` | Advisors overview, table, create form | `useAdminAdvisorsOverview`, `useAdminAdvisorsList`, `useAdminCreateAdvisor`, `useAdminUpdateAdvisor` | `GET /admin/advisors/overview`, `GET /admin/advisors`, `POST /admin/advisors`, `PATCH /admin/advisors/{id}` |
| `/admin/advisors/[id]` | Advisor detail + assigned senders | `useAdminAdvisorDetail`, `useAdminAdvisorSenders`, `useAdminAssignSender`, `useAdminUpdateAdvisor` | `GET /admin/advisors/{id}`, `GET /admin/advisors/{id}/senders`, `POST /admin/advisors/{id}/assign-sender`, `PATCH /admin/advisors/{id}` |
| `/admin/proofs/review-queue` | Proof review table | `useAdminProofReviewQueue`, `useAdminProofDecision` | `GET /proofs`, `POST /proofs/{id}/decision` |
| `/admin/escrows/[id]` | Escrow summary detail | `useAdminEscrowSummary` | `GET /escrows/{id}/summary` |
| `/admin/settings/ai-proof` | AI proof toggle | `useAiProofSetting`, `useUpdateAiProofSetting` | `GET /admin/settings/ai-proof`, `POST /admin/settings/ai-proof` |

**Page inventory sources:**
* `/` route uses `useAuthMe` and auth redirects. (F:src/app/page.tsx:L1-L55)
* `/login` uses `useLogin` and redirect by role. (F:src/app/login/page.tsx:L1-L69)
* Sender routes and escrow actions. (F:src/app/sender/dashboard/page.tsx:L1-L110; F:src/app/sender/escrows/page.tsx:L1-L100; F:src/app/sender/escrows/[id]/page.tsx:L1-L178; F:src/app/sender/advisor/page.tsx:L1-L48; F:src/app/sender/profile/page.tsx:L1-L72)
* Admin routes and actions. (F:src/app/admin/dashboard/page.tsx:L1-L74; F:src/app/admin/senders/page.tsx:L1-L89; F:src/app/admin/senders/[id]/page.tsx:L1-L175; F:src/app/admin/advisors/page.tsx:L1-L92; F:src/app/admin/advisors/[id]/page.tsx:L1-L217; F:src/app/admin/proofs/review-queue/page.tsx:L1-L109; F:src/app/admin/escrows/[id]/page.tsx:L1-L227; F:src/app/admin/settings/ai-proof/page.tsx:L1-L60)

### 3.2 API Calls Inventory (normalized)
| Method | Normalized path | Source (file) | Notes |
| --- | --- | --- | --- |
| POST | /auth/login | `useLogin` (sender queries) | Auth token issue. (F:src/lib/queries/sender.ts:L86-L114) |
| GET | /auth/me | `useAuthMe` (sender queries) | Auth user lookup. (F:src/lib/queries/sender.ts:L147-L166) |
| GET | /me/advisor | `useMyAdvisor` (sender queries) | Advisor for sender. (F:src/lib/queries/sender.ts:L118-L143) |
| GET | /escrows | Sender list + admin stats | Sender lists, admin counts. (F:src/lib/queries/sender.ts:L176-L259; F:src/lib/queries/admin.ts:L133-L143) |
| GET | /escrows/{id}/summary | Sender + admin summary | Polling + detail views. (F:src/lib/queries/sender.ts:L271-L361; F:src/lib/queries/admin.ts:L393-L485) |
| POST | /escrows/{id}/mark-delivered | Sender action | Mutation invalidates summaries. (F:src/lib/queries/sender.ts:L427-L455) |
| POST | /escrows/{id}/client-approve | Sender action | Mutation invalidates summaries. (F:src/lib/queries/sender.ts:L458-L459) |
| POST | /escrows/{id}/client-reject | Sender action | Mutation invalidates summaries. (F:src/lib/queries/sender.ts:L462-L463) |
| POST | /escrows/{id}/check-deadline | Sender action | Mutation invalidates summaries. (F:src/lib/queries/sender.ts:L466-L467) |
| GET | /proofs | Sender/admin proof lists | List + stats. (F:src/lib/queries/sender.ts:L54-L81; F:src/lib/queries/admin.ts:L102-L130; F:src/lib/queries/admin.ts:L304-L333) |
| GET | /proofs/{id} | Proof polling | Proof review polling. (F:src/lib/queries/sender.ts:L510-L535) |
| POST | /proofs | Proof submission | Create proof. (F:src/lib/queries/sender.ts:L610-L647) |
| POST | /proofs/{id}/decision | Admin decision | Approve/reject proofs. (F:src/lib/queries/admin.ts:L159-L165; F:src/lib/queries/admin.ts:L551-L598) |
| POST | /files/proofs | Proof file upload | File upload before proof creation. (F:src/lib/apiClient.ts:L89-L108) |
| GET | /admin/payments | Admin dashboard stats | Total payments. (F:src/lib/queries/admin.ts:L146-L155) |
| POST | /admin/users | Admin create user | Used by `AdminUserCreator`. (F:src/lib/adminApi.ts:L21-L27) |
| GET | /admin/users | Admin user list | Sender list page. (F:src/lib/adminApi.ts:L30-L42) |
| GET | /admin/users/{id} | Admin user detail | Sender profile. (F:src/lib/adminApi.ts:L45-L49) |
| GET | /admin/users/{id}/api-keys | Sender API keys | Keys list. (F:src/lib/adminApi.ts:L52-L64) |
| POST | /admin/users/{id}/api-keys | Issue API key | Key issuance. (F:src/lib/adminApi.ts:L67-L77) |
| DELETE | /admin/users/{id}/api-keys/{id} | Revoke API key | Key revocation. (F:src/lib/adminApi.ts:L80-L86) |
| GET | /admin/advisors/overview | Advisor overview | Admin advisors dashboard. (F:src/lib/adminApi.ts:L89-L93) |
| GET | /admin/advisors | Admin advisors list | Advisors list. (F:src/lib/queries/admin.ts:L346-L360) |
| GET | /admin/advisors/{id} | Advisor detail | Advisor detail page. (F:src/lib/queries/admin.ts:L601-L609) |
| GET | /admin/advisors/{id}/senders | Advisor senders | Advisor detail page. (F:src/lib/queries/admin.ts:L612-L621) |
| PATCH | /admin/advisors/{id} | Update advisor | Toggle active/blocked. (F:src/lib/queries/admin.ts:L625-L641) |
| POST | /admin/advisors | Create advisor profile | Create advisor. (F:src/lib/queries/admin.ts:L644-L664) |
| POST | /admin/advisors/{id}/assign-sender | Assign sender | Advisor detail page. (F:src/lib/queries/admin.ts:L667-L685) |
| GET | /admin/settings/ai-proof | AI proof setting | Admin settings. (F:src/lib/adminApi.ts:L96-L100) |
| POST | /admin/settings/ai-proof | Update AI proof | Admin settings. (F:src/lib/adminApi.ts:L103-L109) |

### 3.3 RBAC & Error UX
* Admin and sender layouts enforce role-based access and redirect unauthenticated users. (F:src/app/admin/layout.tsx:L1-L55; F:src/app/sender/layout.tsx:L1-L55)
* 401 errors trigger session reset via Axios interceptor. (F:src/lib/apiClient.ts:L28-L45; F:src/lib/sessionReset.ts:L1-L16)
* Forbidden actions show dedicated banners/messages when `INSUFFICIENT_SCOPE` is detected (e.g., proof review, escrow actions). (F:src/lib/hooks/useForbiddenAction.ts:L1-L31; F:src/app/admin/proofs/review-queue/page.tsx:L12-L103; F:src/components/sender/SenderEscrowDetails.tsx:L84-L87)
* 403/404/410 messaging exists on escrow detail pages, but other pages rely on generic error messages from the normalizer (potentially less explicit “access denied” for 403). (F:src/app/sender/escrows/[id]/page.tsx:L85-L99; F:src/app/admin/escrows/[id]/page.tsx:L45-L60; F:src/lib/errorMessages.ts:L1-L24)

### 3.4 Polling / Invalidation
* Escrow summary polling profiles are defined for funding, milestone progression, and payout status; both sender and admin summary hooks use these profiles. (F:src/lib/pollingDoctrine.ts:L62-L138; F:src/lib/queries/sender.ts:L271-L425; F:src/lib/queries/admin.ts:L393-L549)
* Proof review polling refetches `/proofs/{id}` until status resolves and invalidates summaries. (F:src/lib/queries/sender.ts:L475-L608)
* Mutations invalidate summaries and proof lists, but retry policies are not aligned to the fintech-safe doctrine. (F:src/lib/invalidation.ts:L66-L107; F:src/lib/queries/sender.ts:L147-L166; F:src/lib/queries/admin.ts:L458-L485)
* “Last updated” indicators and manual refresh are present on escrow detail pages when polling times out. (F:src/components/sender/SenderEscrowDetails.tsx:L88-L94; F:src/app/admin/escrows/[id]/page.tsx:L70-L90)

## 4) Comparative Analysis

### 4.1 Matched Endpoints (frontend calls that exist in snapshot)
| Method | Path | Frontend source |
| --- | --- | --- |
| POST | /auth/login | F:src/lib/queries/sender.ts:L86-L114 |
| GET | /auth/me | F:src/lib/queries/sender.ts:L147-L166 |
| POST | /admin/users | F:src/lib/adminApi.ts:L21-L27 |
| GET | /escrows | F:src/lib/queries/sender.ts:L176-L259; F:src/lib/queries/admin.ts:L133-L143 |
| GET | /escrows/{id}/summary | F:src/lib/queries/sender.ts:L271-L361; F:src/lib/queries/admin.ts:L393-L485 |
| POST | /escrows/{id}/mark-delivered | F:src/lib/queries/sender.ts:L427-L455 |
| POST | /escrows/{id}/client-approve | F:src/lib/queries/sender.ts:L458-L459 |
| POST | /escrows/{id}/client-reject | F:src/lib/queries/sender.ts:L462-L463 |
| POST | /escrows/{id}/check-deadline | F:src/lib/queries/sender.ts:L466-L467 |
| POST | /files/proofs | F:src/lib/apiClient.ts:L89-L108 |
| POST | /proofs | F:src/lib/queries/sender.ts:L610-L647 |
| GET | /proofs | F:src/lib/queries/sender.ts:L54-L81; F:src/lib/queries/admin.ts:L102-L130; F:src/lib/queries/admin.ts:L304-L333 |
| POST | /proofs/{id}/decision | F:src/lib/queries/admin.ts:L159-L165; F:src/lib/queries/admin.ts:L551-L598 |
| GET | /me/advisor | F:src/lib/queries/sender.ts:L118-L143 |
| GET | /admin/payments | F:src/lib/queries/admin.ts:L146-L155 |
| POST | /admin/advisors | F:src/lib/queries/admin.ts:L644-L664 |
| GET | /admin/advisors | F:src/lib/queries/admin.ts:L346-L360 |
| PATCH | /admin/advisors/{id} | F:src/lib/queries/admin.ts:L625-L641 |
| POST | /admin/advisors/{id}/assign-sender | F:src/lib/queries/admin.ts:L667-L685 |

### 4.2 Frontend Calls Not in Backend Snapshot (contract mismatch)
| Method | Path | Frontend source | Risk |
| --- | --- | --- | --- |
| GET | /proofs/{id} | F:src/lib/queries/sender.ts:L510-L535 | Proof polling depends on this endpoint; backend snapshot lacks it. |
| GET | /admin/users | F:src/lib/adminApi.ts:L30-L42 | Sender list depends on admin users list. |
| GET | /admin/users/{id} | F:src/lib/adminApi.ts:L45-L49 | Sender detail page requires user lookup. |
| GET | /admin/users/{id}/api-keys | F:src/lib/adminApi.ts:L52-L64 | API key list depends on missing contract entry. |
| POST | /admin/users/{id}/api-keys | F:src/lib/adminApi.ts:L67-L77 | API key issuance missing in snapshot. |
| DELETE | /admin/users/{id}/api-keys/{id} | F:src/lib/adminApi.ts:L80-L86 | API key revocation missing in snapshot. |
| GET | /admin/advisors/overview | F:src/lib/adminApi.ts:L89-L93 | Advisors overview missing in snapshot. |
| GET | /admin/advisors/{id} | F:src/lib/queries/admin.ts:L601-L609 | Advisor detail missing in snapshot. |
| GET | /admin/advisors/{id}/senders | F:src/lib/queries/admin.ts:L612-L621 | Advisor sender list missing in snapshot. |
| GET | /admin/settings/ai-proof | F:src/lib/adminApi.ts:L96-L100 | AI proof admin setting missing in snapshot. |
| POST | /admin/settings/ai-proof | F:src/lib/adminApi.ts:L103-L109 | AI proof admin setting missing in snapshot. |

### 4.3 Backend Endpoints Unused by Frontend (missing screens / workflows)
* Mandates: `POST /mandates`, `POST /mandates/cleanup`.
* Escrow creation/funding: `POST /escrows`, `POST /escrows/{id}/deposit`, `POST /escrows/{id}/funding-session`, `GET /escrows/{id}`.
* Milestones: `POST /escrows/{id}/milestones`, `GET /escrows/{id}/milestones`, `GET /escrows/milestones/{milestone_id}`.
* Proof workflows: `POST /proofs/{id}/request_advisor_review`.
* Merchant suggestions (sender + admin approval workflow).
* Pricing admin endpoints (reference import + inflation CRUD).
* Advisor portal endpoints (`/advisor/me/*`, `/advisor/proofs/*`).
* Payments execution (`POST /payments/execute/{payment_id}`).

### 4.4 Risky UX gaps (polling/refetch/retry/error handling)
| Area | Observation | Evidence |
| --- | --- | --- |
| Retry policy | Several queries rely on React Query defaults or custom retry logic without excluding 401/403/409/422 or enforcing 1→2→4s backoff; this diverges from the fintech-safe retry policy. | (F:src/lib/queries/sender.ts:L147-L166; F:src/lib/queries/sender.ts:L336-L361; F:src/lib/queries/admin.ts:L458-L485) |
| Proof polling on 409 | `useProofReviewPolling` explicitly refetches after a 409 conflict; doctrine says never retry 409/422/401/403. | (F:src/lib/queries/sender.ts:L581-L595) |
| 403/404 UX consistency | Some pages provide explicit access-denied/not-found messaging, but others rely on generic error normalization; 403 “access denied” is not consistently surfaced on every screen. | (F:src/app/sender/escrows/[id]/page.tsx:L85-L99; F:src/app/admin/escrows/[id]/page.tsx:L45-L60; F:src/lib/errorMessages.ts:L1-L24) |

### 4.5 Shape mismatches / risky assumptions
| Area | Observation | Evidence |
| --- | --- | --- |
| Pagination | Frontend expects `items/total/limit/offset`, but accepts array fallback; backend contract should confirm pagination for `/escrows`, `/proofs`, `/admin/payments`, `/admin/users`. | (F:src/types/api.ts:L1-L9; F:src/lib/queries/queryUtils.ts:L1-L33) |
| Proof list filters | Frontend sends `review_mode`, `advisor_id`, `unassigned_only`, and `status` query params; backend snapshot does not document filter semantics. | (F:src/lib/queries/admin.ts:L102-L131; F:src/lib/queries/admin.ts:L304-L333) |
| Escrow summary polling | Frontend polls `/escrows/{id}/summary` for funding/milestone/payout changes; backend needs to guarantee eventual consistency for summary data. | (F:src/lib/queries/sender.ts:L271-L425; F:src/lib/queries/admin.ts:L393-L549) |
| Proof detail polling | Frontend polls `/proofs/{id}` for status transitions, but this endpoint is missing in snapshot. | (F:src/lib/queries/sender.ts:L510-L535) |

## 5) Feature Coverage Matrix
| Domain | Backend endpoints (count) | Frontend used (count) | Gaps / Missing screens | Priority |
| --- | --- | --- | --- | --- |
| Auth | 2 | 2 | None in snapshot; admin user management uses extra endpoints not documented. | P1 |
| Escrows | 10 | 6 | Create escrow, deposit, funding session, escrow detail view. | P0 |
| Milestones | 3 | 0 | No milestone create/list/detail screens. | P1 |
| Proofs | 5 | 4 | Missing advisor review request; proof detail polling endpoint absent in snapshot. | P0 |
| Merchant Suggestions | 7 | 0 | No sender/admin suggestion workflow in UI. | P1 |
| Pricing Admin | 6 | 0 | No pricing admin screens for import/adjustments. | P2 |
| Advisor Portal | 4 | 0 | No advisor-specific UI or proof review screens. | P1 |
| Payments | 2 | 1 | Missing manual execute payment flow. | P1 |
| Mandates | 2 | 0 | No mandate creation/cleanup UI. | P2 |

## 6) Backlog (P0/P1/P2)

### P0 (Critical)
1) **Contract reconciliation for proof detail polling**
   * **Backend endpoints:** `GET /proofs/{id}` (missing in snapshot)
   * **Frontend pages:** `/sender/escrows/[id]`
   * **Required changes:**
     * Backend: confirm/support `GET /proofs/{id}` or update frontend to use `GET /proofs` filter (backend repo needed).
     * Frontend: `src/lib/queries/sender.ts` proof polling logic (F:src/lib/queries/sender.ts:L475-L608).
   * **Risks:** Proof status UI may never update; webhook lag could leave stale summaries.
   * **Tests:** backend `pytest -q`, frontend `npm run build`.

2) **Escrow creation + funding flows**
   * **Backend endpoints:** `POST /escrows`, `POST /escrows/{id}/deposit`, `POST /escrows/{id}/funding-session`
   * **Frontend pages:** New sender escrow creation + funding pages; potential addition to `/sender/escrows`.
   * **Required changes:**
     * Frontend: add new route(s) under `src/app/sender/escrows/create/page.tsx` and funding UI; add mutations in `src/lib/queries/sender.ts`.
   * **Risks:** Money movement; ensure idempotent retry and CTA disable.
   * **Tests:** backend `pytest -q`, frontend `npm run build`.

### P1 (MVP-completing)
1) **Merchant suggestion workflow UI**
   * **Backend endpoints:** `POST/GET /merchant-suggestions`, admin approvals endpoints.
   * **Frontend pages:** sender suggestion page; admin review screen.
   * **Required changes:** create pages under `src/app/sender/merchant-suggestions/*` and `src/app/admin/merchant-suggestions/*`; add hooks in `src/lib/queries/sender.ts` + `src/lib/queries/admin.ts`.
   * **Risks:** RBAC enforcement + 403 messaging.
   * **Tests:** backend `pytest -q`, frontend `npm run build`.

2) **Advisor portal (advisor role)**
   * **Backend endpoints:** `/advisor/me/profile`, `/advisor/me/proofs`, `/advisor/proofs/{id}/approve|reject`
   * **Frontend pages:** advisor dashboard and proof review pages.
   * **Required changes:** new `src/app/advisor/*` routes; add advisor query hooks.
   * **Risks:** ensure 401 reset vs 403 access denied messaging.
   * **Tests:** backend `pytest -q`, frontend `npm run build`.

3) **Payments execution UI**
   * **Backend endpoints:** `POST /payments/execute/{payment_id}`
   * **Frontend pages:** admin payments detail/action page.
   * **Required changes:** add `/admin/payments/[id]` page; mutation hook in `src/lib/queries/admin.ts`.
   * **Risks:** idempotency + double-submit protection.
   * **Tests:** backend `pytest -q`, frontend `npm run build`.

### P2 (Nice-to-have / Admin tooling)
1) **Pricing admin console**
   * **Backend endpoints:** `/admin/pricing/reference/import-csv`, `/admin/pricing/inflation*`
   * **Frontend pages:** new admin pricing settings.
   * **Required changes:** `src/app/admin/pricing/*` pages + admin query hooks.
   * **Risks:** file upload handling, access scope.
   * **Tests:** backend `pytest -q`, frontend `npm run build`.

2) **Mandate management UI**
   * **Backend endpoints:** `/mandates`, `/mandates/cleanup`
   * **Frontend pages:** sender mandates page.
   * **Required changes:** `src/app/sender/mandates/*` + sender query hooks.
   * **Risks:** ensure mutation refetch for eventual consistency.
   * **Tests:** backend `pytest -q`, frontend `npm run build`.

3) **Retry policy alignment**
   * **Backend endpoints:** all idempotent GETs and funding operations.
   * **Frontend pages/hooks:** `src/lib/queries/*.ts` retry policies.
   * **Required changes:** centralize React Query default retry/backoff to match 1→2→4s for idempotent ops, and disable retry on 401/403/409/422. (F:src/lib/queries/sender.ts:L147-L166; F:src/lib/queries/admin.ts:L458-L485)
   * **Risks:** inconsistent UX under flaky networks.
   * **Tests:** frontend `npm run build`.

## 7) Appendix

### Commands used
* `ls`
* `ls /workspace`
* `find .. -name AGENTS.md -print`
* `find src/app -name page.tsx -print`
* `rg "apiClient" -n src`
* `rg "apiClient\.(get|post|patch|put|delete)" -n src`
* `rg "fetch\(" -n src`
* `sed -n '...' <file>`
* `nl -ba <file>`

### OpenAPI dump notes
* Backend repo was not available in this workspace; OpenAPI extraction was not attempted.

### Raw lists (frontend endpoint calls)
* See **API Calls Inventory** table in section 3.2.
