## Frontend UX Implementation Audit (Mandate → Escrow → Milestones → Proofs → Payout)

### 1) Relevant repo map (mandate/escrow/proof/payment/auth)
- `src/lib/apiClient.ts` – Axios client with bearer token injection + 401 reset + `/files/proofs` upload helper. 【F:src/lib/apiClient.ts†L1-L108】
- `src/lib/auth.ts` – localStorage token helpers (no role parsing). 【F:src/lib/auth.ts†L1-L21】
- `src/lib/queries/sender.ts` – React Query hooks for auth, mandates, escrows (list/create/summary/polling), proof creation/polling, funding actions. 【F:src/lib/queries/sender.ts†L333-L393】【F:src/lib/queries/sender.ts†L403-L512】【F:src/lib/queries/sender.ts†L900-L1027】
- `src/lib/queries/admin.ts` – Admin hooks for proof review queue, milestone create, payment list/execute, advisor/admin utilities. 【F:src/lib/queries/admin.ts†L1-L120】
- `src/lib/queries/advisor.ts` – Advisor proof assignment list + profile polling. 【F:src/lib/queries/advisor.ts†L1-L51】
- `src/lib/pollingDoctrine.ts` – Polling profiles for funding, proof review, milestones, payouts. 【F:src/lib/pollingDoctrine.ts†L1-L118】
- `src/lib/queryKeys.ts` – Shared React Query keys (auth/escrows/milestones/proofs/payments). 【F:src/lib/queryKeys.ts†L1-L73】
- `src/types/api.ts` – Frontend contracts for mandates, escrows, proofs, milestones, payments (not aligned with backend fields). 【F:src/types/api.ts†L41-L120】
- `src/app/page.tsx` / `src/app/login/page.tsx` – Root redirect based on `useAuthMe`; login email-only mutation. 【F:src/app/page.tsx†L1-L58】【F:src/app/login/page.tsx†L1-L61】
- `src/app/sender/layout.tsx` – Sender route guard (sender/both only). 【F:src/app/sender/layout.tsx†L1-L48】
- `src/app/sender/mandates/page.tsx` – Mandate creation/cleanup UI with optional sender_id + merchant fields; prefill escrow draft CTA. 【F:src/app/sender/mandates/page.tsx†L21-L191】【F:src/app/sender/mandates/page.tsx†L427-L451】
- `src/app/sender/escrows/create/page.tsx` – Escrow create form (amount/currency/description only) + mandate prefill banner. 【F:src/app/sender/escrows/create/page.tsx†L15-L157】
- `src/app/sender/escrows/[id]/page.tsx` – Escrow detail/actions, funding session/deposit, proof polling, advisor review request, proof form slot. 【F:src/app/sender/escrows/[id]/page.tsx†L38-L142】【F:src/app/sender/escrows/[id]/page.tsx†L419-L512】
- `src/components/sender/SenderEscrowDetails.tsx` – Escrow summary display (milestones/proofs/payments) + action buttons. 【F:src/components/sender/SenderEscrowDetails.tsx†L1-L119】【F:src/components/sender/SenderEscrowDetails.tsx†L195-L308】
- `src/components/sender/ProofForm.tsx` – File picker + `/files/proofs` upload + `/proofs` submit with file_id/attachment_url only. 【F:src/components/sender/ProofForm.tsx†L20-L185】
- `src/components/sender/ProofAiStatus.tsx` – Renders AI score/explanation to end users. 【F:src/components/sender/ProofAiStatus.tsx†L16-L45】
- `src/app/admin/escrows/[id]/page.tsx` – Admin escrow summary, proof list with AI badges, milestone JSON create form, advisor review request. 【F:src/app/admin/escrows/[id]/page.tsx†L1-L146】【F:src/app/admin/escrows/[id]/page.tsx†L185-L335】
- `src/app/admin/proofs/review-queue/page.tsx` – Proof review queue with approve/reject actions. 【F:src/app/admin/proofs/review-queue/page.tsx†L1-L74】
- `src/app/admin/payments/[id]/page.tsx` – Payment detail polling + execute CTA. 【F:src/app/admin/payments/[id]/page.tsx†L1-L120】
- `src/app/advisor/queue/page.tsx` – Advisor assigned proofs list (polling). 【F:src/app/advisor/queue/page.tsx†L1-L52】
- `src/components/system/ConnectionBanner.tsx` – Network status banner using external store + local state. 【F:src/components/system/ConnectionBanner.tsx†L1-L52】

### 2) Implemented screens vs contract
| Screen (contract) | Contract requirement summary | Current frontend route/path | Status | Evidence | Gaps |
| --- | --- | --- | --- | --- | --- |
| Mandate Create | Sender-only form (beneficiary_id, total_amount, currency, expires_at, payout opts; sender derived) | `/sender/mandates` | Partial | Mandate form with optional sender_id, merchant mode, cleanup; no spoof prevention; escrow prefill CTA. 【F:src/app/sender/mandates/page.tsx†L21-L191】【F:src/app/sender/mandates/page.tsx†L427-L451】 | Sender_id exposed; no validation for payout_destination_type/expiry UTC; no mandate list/invalidation; no role/scope messaging per contract. |
| Escrow Create | Sender defines provider vs beneficiary, release_conditions JSON, deadline, domain | `/sender/escrows/create` | Missing critical fields | Form only captures amount/currency/description; posts `/escrows` with minimal payload. 【F:src/app/sender/escrows/create/page.tsx†L46-L107】【F:src/lib/queries/sender.ts†L361-L383】 | No provider/beneficiary toggle, release_conditions, deadline, domain, currency enum guard; sender spoof not handled client-side. |
| Escrow Detail/Summary | Show escrow + milestones/proofs/payments; poll summary; sender access control | `/sender/escrows/[id]` | Partial | Uses `useSenderEscrowSummary` polling & actions; renders proofs/milestones/payments. 【F:src/app/sender/escrows/[id]/page.tsx†L38-L142】【F:src/components/sender/SenderEscrowDetails.tsx†L1-L119】 | Summary shape lacks beneficiary/provider redaction logic; no sender/provider role separation; proof list uses attachment_url/file_url only. |
| Milestone Plan (admin/support) | Add milestones with schema fields; list milestones per escrow | `/admin/escrows/[id]` (JSON form) | Partial | Admin page lists milestones and posts raw JSON via `useCreateMilestone`. 【F:src/app/admin/escrows/[id]/page.tsx†L185-L283】 | No guided fields/validation (label/amount/sequence/proof_kind/validator); no sender-facing milestone list detail beyond name/status; no geofence/UI hints. |
| Proof Upload + Submit | 2-step upload (`/files/proofs`), type/milestone_idx, sha256, metadata; polling `/proofs/{id}` | Proof form embedded in `/sender/escrows/[id]` | Partial / misaligned | ProofForm uploads file then POST `/proofs` with file_id/attachment_url; optional milestone_id select. 【F:src/components/sender/ProofForm.tsx†L92-L185】 | No type/sha256/storage_url; milestone_idx vs id mismatch; uploader role not checked; polling uses list fallback not `/proofs/{id}`. |
| Proof Review | Validator approves/rejects with gating + notes | `/admin/proofs/review-queue`; sender detail buttons | Partial | Admin queue approve/reject; sender detail buttons call `/proofs/{id}/decision` via admin hook? (only admin queue implemented). 【F:src/app/admin/proofs/review-queue/page.tsx†L1-L59】 | Sender/provider decision UI absent; advisor block not enforced client-side; no AI note requirement messaging. |
| External Beneficiary Upload | Token-based external flow | None | Missing | No external token UI or uploader screens. | n/a |
| Payout Execution (ops) | Admin/support executes payments, polls status | `/admin/payments/[id]` | Partial | Execute CTA with polling via `/admin/payments` + `/payments/execute/{id}` mutation. 【F:src/app/admin/payments/[id]/page.tsx†L1-L120】 | No payout_blocked_reasons surfacing; no list view filters beyond ID. |
| Notifications/email surfaces | Show notification history or placeholders | None | Missing | No notification inbox or event hints. | n/a |
| Role separation (provider vs beneficiary) | Distinct uploader/validator rules, advisor read-only | Sender/admin/advisor layouts only | Missing coverage | Roles limited to sender/admin/advisor; provider/both not modeled beyond type string. 【F:src/app/sender/layout.tsx†L21-L48】【F:src/types/api.ts†L1-L84】 | No provider UX; no beneficiary redaction; advisor cannot approve enforced only server-side. |

### 3) Endpoint coverage matrix
| Backend endpoint | Frontend usage (hook/component) | Query key | Auth header strategy | Error handling | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| POST `/mandates` | `useCreateMandate` in mandates page | none (mutation) | Axios interceptor sets Bearer | `normalizeApiError` -> message only | Used incorrectly | Sender_id accepted from input; no spoof guard messaging. 【F:src/app/sender/mandates/page.tsx†L71-L160】【F:src/lib/apiClient.ts†L19-L46】 |
| POST `/escrows` | `useCreateEscrow` + create page | invalidate `escrows.list` | Bearer header | Error message bubbled | Used incorrectly | Payload only amount/currency/description; ignores provider/beneficiary/deadline/domain. 【F:src/lib/queries/sender.ts†L361-L383】【F:src/app/sender/escrows/create/page.tsx†L46-L107】 |
| GET `/escrows?mine=true` | `useSenderEscrows` list | `['escrows','list',filters]` | Bearer | No special 403 handling | Partial | Pagination without total; status filters match strings only. 【F:src/lib/queries/sender.ts†L333-L357】 |
| GET `/escrows/{id}/summary` | `useSenderEscrowSummary`, `useAdminEscrowSummary` (admin file) | `['escrows',id,'summary',viewer]` | Bearer | Stops polling on 403/404/410 | Partial | Summary type lacks participant masking; polling flags align with pollingDoctrine. 【F:src/lib/queries/sender.ts†L403-L512】 |
| GET `/escrows/{id}/milestones` | `useEscrowMilestones` (sender & admin) | `['milestones','byEscrow',id]` | Bearer | Retry stops on 403/404/410/409/422 | Partial | Displays name/status only; no amounts/validators/proof requirements. 【F:src/lib/queries/sender.ts†L532-L587】【F:src/components/sender/SenderEscrowDetails.tsx†L195-L214】 |
| POST `/escrows/{id}/deposit` | `useDepositEscrow` + sender detail | n/a | Bearer + `Idempotency-Key` header | Retries 500s; 409/422 trigger invalidation | Partial | No PSP session handoff; UI only for sender. 【F:src/lib/queries/sender.ts†L668-L714】【F:src/app/sender/escrows/[id]/page.tsx†L371-L388】 |
| POST `/files/proofs` | `uploadProofFile` in ProofForm | `['uploads','proof',sha256]` unused | Bearer | File size/type checked client-side only | Partial | Response expects file_id/file_url, not storage_url/sha256; no escrow binding. 【F:src/lib/apiClient.ts†L89-L107】【F:src/components/sender/ProofForm.tsx†L125-L160】 |
| POST `/proofs` | `useCreateProof` | sets `proofs.byId` | Bearer | Error surfaced | Used incorrectly | Payload lacks type/sha256/milestone_idx; uses attachment_url/file_id. 【F:src/lib/queries/sender.ts†L990-L1027】 |
| GET `/proofs` (poll) | `useProofReviewPolling` uses list fallback | `['proofs',proofId]` | Bearer | Stops on 404/403/410 | Partial | Polls list up to 100 mine proofs; no `/proofs/{id}` usage. 【F:src/lib/queries/sender.ts†L900-L988】 |
| POST `/proofs/{id}/decision` | Admin queue mutation (inside `useAdminProofDecision`) | n/a | Bearer | 403/404/405 mapped | Partial | Only admin queue uses; sender/provider decision UI absent. 【F:src/app/admin/proofs/review-queue/page.tsx†L1-L59】 |
| POST `/payments/execute/{id}` | `useExecutePayment` via admin payment detail | `['payments','admin',filters]` | Bearer | 403/409/422 messages | Partial | Uses list filter to find payment; no payout_blocked_reasons surfaced. 【F:src/app/admin/payments/[id]/page.tsx†L1-L120】 |
| External proof endpoints | None | — | — | — | Not used | No token issuance/upload/submit flows present. |

### 4) Role model correctness
- Identity is derived from `/auth/me` via `useAuthMe` storing `AuthUser` with `role` but no scope list enforcement; layouts only gate sender vs admin vs advisor. Providers/support not differentiated. 【F:src/lib/queries/sender.ts†L240-L307】【F:src/app/sender/layout.tsx†L21-L48】
- Auth token is a raw bearer stored in localStorage; no API key scope chooser. 【F:src/lib/auth.ts†L1-L21】【F:src/lib/apiClient.ts†L19-L46】
- Sender/provider separation is absent: escrow create has no provider/beneficiary selection; proof uploader role assumed sender. 【F:src/app/sender/escrows/create/page.tsx†L46-L107】【F:src/components/sender/ProofForm.tsx†L92-L185】
- Advisor read-only is partially enforced by route segmentation, but proof AI details are shown to senders/admins without masking; advisor-specific redaction not handled. 【F:src/components/sender/ProofAiStatus.tsx†L16-L45】

### 5) Proof lifecycle implementation
- Two-step upload is present but simplified: ProofForm calls `/files/proofs` then POST `/proofs` with `file_id`/`attachment_url`; no sha256/type/escrow namespace enforcement. 【F:src/components/sender/ProofForm.tsx†L125-L176】
- Provider uploads unsupported (no provider role UX; sender-only layout). 【F:src/app/sender/layout.tsx†L21-L48】
- External beneficiary token flow absent.
- Polling uses `useProofReviewPolling`, which fetches via `/proofs?mine=true` (limit 100) instead of `/proofs/{id}` and stops after 5 min or non-PENDING status; also invalidates escrow summary. 【F:src/lib/queries/sender.ts†L900-L988】
- Status rendering shows only proof status + AI badges; milestone PENDING_REVIEW gating not surfaced; advisor decision UI is admin-only.

### 6) Fraud/risk useful fields captured
- Merchant suggestion (name + country) captured in mandate create when payout type MERCHANT. 【F:src/app/sender/mandates/page.tsx†L122-L147】
- No invoice metadata, release_conditions, geofence, or proof requirements UI exists in create flows. Escrow create lacks beneficiary/provider geo/bank/id fields; milestone creation is raw JSON without guided fraud fields. 【F:src/app/sender/escrows/create/page.tsx†L46-L107】【F:src/app/admin/escrows/[id]/page.tsx†L185-L283】
- Proof AI status displays risk score/explanation but metadata ingestion (amount/currency) not captured in payload. 【F:src/components/sender/ProofAiStatus.tsx†L16-L45】【F:src/components/sender/ProofForm.tsx†L92-L176】

### 7) Provider wiring / infinite loop hazards
- `ConnectionBanner` uses `useSyncExternalStore(subscribe)` combined with local `online` state and calls `setOnline` inside the same effect as listeners; repeated online/offline events can bounce both states and force rerenders across the app shell. Recommend memoizing the snapshot-only render (avoid extra local state) to prevent double updates that previously triggered “maximum update depth” reports. 【F:src/components/system/ConnectionBanner.tsx†L6-L52】
- `useSenderEscrowSummary` sets per-profile timeouts in `useEffect` that toggle component state every interval; when summaries contain active flags this can keep React Query re-renders hot even if the page is backgrounded. Consider pausing polling on hidden tabs and consolidating timeout state. 【F:src/lib/queries/sender.ts†L403-L512】

### 8) Privacy / redaction issues
- AI score and explanation are rendered for sender/admin viewers in both sender and admin escrow detail components without role-based masking, contrary to backend redaction rules. 【F:src/components/sender/ProofAiStatus.tsx†L16-L45】【F:src/components/sender/SenderEscrowDetails.tsx†L243-L275】
- Attachment URLs (likely signed) are displayed directly for all roles with standard anchors; no warning or masking for advisors/providers/beneficiaries. 【F:src/components/sender/SenderEscrowDetails.tsx†L228-L244】
- Beneficiary PII is not fetched/rendered, but absence of provider/beneficiary separation means UI cannot enforce hiding beneficiary data from providers if added later.
