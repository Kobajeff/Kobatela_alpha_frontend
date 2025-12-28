## Frontend UX Implementation Plan (Mandate → Escrow → Milestones → Proofs → Payout)

### Build order
- **P0 (unblock core flow)**: Auth/scopes alignment, mandate create contract, escrow create with provider/beneficiary + release conditions, escrow summary/polling fixes, proof upload/submit with contract fields + safe polling, privacy fixes.
- **P1 (advanced)**: Milestone plan UI with schema validation, proof review/decision UX per validator role, payout execution surface with gating reasons, role-based redaction for proofs/payments.
- **P2 (expansion)**: External beneficiary upload UI, notifications/inbox surface, advisor-specific UX polish, telemetry/logging hygiene.

### Tasks (grouped by priority)

#### P0
1) **Auth + role/scopes alignment**
   - **Objective**: Ensure UI derives scope/role from `/auth/me` and blocks spoofed roles.
   - **User story**: As a sender/provider/support/admin/advisor, I see only my allowed pages and actions; spoof attempts redirect to login with a clear message.
   - **Endpoints**: GET `/auth/me`.
   - **Data contracts**: `AuthUser` should include scopes; remove client-supplied sender_id.
   - **Files**: `src/lib/queries/sender.ts` (useAuthMe return shape), `src/app/page.tsx`, `src/app/sender/layout.tsx`, `src/app/admin/layout.tsx`, `src/app/advisor/layout.tsx`, `src/types/api.ts`.
   - **React Query**: `queryKeys.auth.me()`; invalidate on logout.
   - **Error copy**: “Session invalide ou portée insuffisante. Merci de vous reconnecter.”
   - **Acceptance**: Sender cannot access admin/advisor routes; provider (once added) routed correctly; spoofed sender_id fields removed from mandate/escrow payload.

2) **Mandate create contract compliance**
   - **Objective**: Align mandate form with backend fields and block sender_id input.
   - **User story**: As a sender, I create a mandate with beneficiary, total_amount, currency, expires_at, optional payout/merchant suggestion; sender_id is implicit.
   - **Endpoints**: POST `/mandates`.
   - **Data contracts**: beneficiary_id, total_amount (Decimal as string), currency uppercase, expires_at ISO, payout_destination_type, merchant_registry_id OR merchant_suggestion.
   - **Files**: `src/app/sender/mandates/page.tsx`, `src/types/api.ts`, `src/lib/queries/sender.ts`.
   - **Query invalidation**: Invalidate `['mandates']` (add key) and `['senderDashboard']`.
   - **Error copy**: Map 403 sender spoof to “Votre identité expéditeur est obligatoire.”
   - **Acceptance**: Form prevents sender_id entry; merchant registry vs suggestion mutually exclusive enforced; success navigates/refreshes mandates list or shows ID.

3) **Escrow create with provider/beneficiary & release conditions**
   - **Objective**: Replace minimal escrow form with contract fields and mandate prefill.
   - **User story**: As a sender, I choose provider_user_id or beneficiary profile, set amount_total, currency (USD/EUR), release_conditions JSON (with milestones array or flags), deadline_at, domain.
   - **Endpoints**: POST `/escrows`.
   - **Data contracts**: Mutual exclusivity provider vs beneficiary; deadline_at ISO; release_conditions object; domain enum; amount_total Decimal.
   - **Files**: `src/app/sender/escrows/create/page.tsx`, `src/lib/queries/sender.ts`, `src/types/api.ts`, `src/lib/prefill/escrowDraft.ts`.
   - **Query invalidation**: `queryKeys.escrows.listBase()`, `queryKeys.sender.dashboard()`.
   - **Error copy**: Surface INVALID_BENEFICIARY_CONTEXT, INVALID_PROVIDER_ROLE, PUBLIC_DOMAIN_FORBIDDEN.
   - **Acceptance**: Form blocks combined provider+beneficiary; submits normalized payload; success navigates to `/sender/escrows/{id}` and summary shows chosen participant.

4) **Escrow summary & polling hardening**
   - **Objective**: Align summary display/poll intervals with backend contract and prevent runaway timers.
   - **User story**: As a sender/admin, I see live escrow status, milestones, proofs, and payments with bounded polling that pauses on errors or tab hidden.
   - **Endpoints**: GET `/escrows/{id}/summary`, GET `/escrows/{id}/milestones`.
   - **Files**: `src/lib/queries/sender.ts` (useSenderEscrowSummary, useEscrowMilestones), `src/components/sender/SenderEscrowDetails.tsx`, `src/lib/pollingDoctrine.ts`.
   - **Query keys**: `['escrows',id,'summary',viewer]`, `['milestones','byEscrow',id]`.
   - **Acceptance**: Polling stops on terminal statuses or after maxDuration; milestone list shows amount/currency/status/validator; no repeated setState loops when summary fetch errors.

5) **Proof upload/submit contract**
   - **Objective**: Implement 2-step upload with storage_url/sha256 + type/milestone_idx metadata.
   - **User story**: As a sender/provider, I upload a jpeg/pdf, receive storage_url+sha256, then submit proof with type, milestone_idx, optional metadata; validation errors show inline.
   - **Endpoints**: POST `/files/proofs`, POST `/proofs`.
   - **Data contracts**: file mime/size caps, escrow binding when required, sha256, storage_key/url, type, milestone_idx, metadata.
   - **Files**: `src/components/sender/ProofForm.tsx`, `src/lib/apiClient.ts`, `src/lib/queries/sender.ts`, `src/types/api.ts`, add provider layout/screens when role added.
   - **Query invalidation**: `queryKeys.proofs.byId`, `invalidateProofBundle`, `invalidateEscrowSummary`.
   - **Error copy**: FILE_TOO_LARGE/UNSUPPORTED_FILE_TYPE/ROLE errors surfaced; conflict messaging when active proof exists.
   - **Acceptance**: Form blocks submission without sha256/type; uses backend response fields; progress + client precheck remain; proof list refreshes on success.

6) **Proof polling & AI privacy fix**
   - **Objective**: Poll `/proofs/{id}` directly, stop per contract, and hide AI scores from sender/provider.
   - **User story**: After submitting proof, I see pending status until approved/rejected; AI details hidden unless admin/support.
   - **Endpoints**: GET `/proofs/{id}` or `/proofs?` with id filter (role-based), GET `/escrows/{id}/summary` for invalidation.
   - **Files**: `src/lib/queries/sender.ts` (useProofReviewPolling), `src/components/sender/ProofAiStatus.tsx`, `src/components/sender/SenderEscrowDetails.tsx`, `src/app/admin/escrows/[id]/page.tsx`.
   - **Acceptance**: Poll interval 5s→15s, stops on non-PENDING; sender/provider views omit ai_score/ai_explanation; admin/support still see AI badges.

7) **Funding actions alignment**
   - **Objective**: Map funding session/deposit actions to correct payloads and handle PSP return.
   - **User story**: As sender, I can initiate `/escrows/{id}/funding-session` or `/deposit` with Idempotency-Key; UI shows blocked reasons and retries gracefully.
   - **Files**: `src/lib/queries/sender.ts` (useCreateFundingSession/useDepositEscrow), `src/app/sender/escrows/[id]/page.tsx`.
   - **Acceptance**: Funding errors map to 409/422 with refresh; timers cancel on terminal status; PSP return query param handled once.

#### P1
1) **Milestone plan editor (admin/support)**
   - **Objective**: Structured form for milestone fields (label, amount, currency, sequence_index, proof_kind, validator, proof_requirements, geofence).
   - **Endpoints**: POST `/escrows/{id}/milestones`, GET `/escrows/{id}/milestones`.
   - **Files**: `src/app/admin/escrows/[id]/page.tsx`, new component under `src/components/admin/`.
   - **Query invalidation**: Milestones list + escrow summary.
   - **Acceptance**: Client-side validation for required fields; success toast; renders validator + amounts in lists.

2) **Proof decision UX per validator**
   - **Objective**: Add proof review UI for sender (when validator=SENDER), support/admin, block advisor.
   - **Endpoints**: GET `/proofs?escrow_id=` / `/proofs/{id}`, POST `/proofs/{id}/decision`, POST `/proofs/{id}/request_advisor_review`.
   - **Files**: `src/components/sender/SenderEscrowDetails.tsx`, `src/app/admin/proofs/review-queue/page.tsx`, `src/lib/queries/admin.ts`, `src/lib/queries/sender.ts`.
   - **Acceptance**: Decision buttons show only when allowed; AI flagged proofs require note; invalidation triggers proofs/milestones/payments refresh.

3) **Payout ops surface**
   - **Objective**: Show payments list and detail with payout_blocked_reasons; execute payout with polling stops.
   - **Endpoints**: GET `/admin/payments`, POST `/payments/execute/{id}`.
   - **Files**: `src/app/admin/payments/[id]/page.tsx`, new list view under `/admin/payments`, `src/lib/queries/admin.ts`.
   - **Acceptance**: Blocked reasons displayed; execute button disabled when not PENDING; polling stops on SENT/SETTLED/ERROR.

4) **Redaction for attachments/PII**
   - **Objective**: Mask signed URLs and sensitive metadata for sender/provider/advisor views.
   - **Files**: `src/components/sender/SenderEscrowDetails.tsx`, `src/components/admin/…` (conditional rendering), `src/components/sender/ProofAiStatus.tsx`.
   - **Acceptance**: Sender/provider see download buttons without raw URLs (use signed fetch); advisor hides payout amounts; admin/support unchanged.

#### P2
1) **External beneficiary upload flow**
   - **Objective**: Token issuance UI + external upload/submit pages.
   - **Endpoints**: POST `/external/proofs/tokens`, `/external/files/proofs`, `/external/proofs/submit`.
   - **Files**: New routes under `src/app/external/proofs/...`, issuer controls under sender/admin.
   - **Acceptance**: Token screen collects escrow_id/milestone_idx/email; external page enforces namespace; issuer sees new proof via polling.

2) **Notifications/inbox**
   - **Objective**: Display recent events (proof submitted/approved/rejected, escrow/payout) using existing responses or lightweight polling.
   - **Endpoints**: Reuse proof/payment list responses; optional `/escrows/{id}/summary` events.
   - **Files**: `src/components/common/` new notification panel; integrate into dashboards.
   - **Acceptance**: Shows event type, timestamp, link to resource; refreshes on relevant mutations.

3) **Advisor UX polish**
   - **Objective**: Advisor queue with decision-less view, AI summaries, and sender contact hints.
   - **Endpoints**: GET `/advisor/me/proofs`, GET `/advisor/me/profile`.
   - **Files**: `src/app/advisor/queue/page.tsx`, `src/app/advisor/profile/page.tsx`.
   - **Acceptance**: Polling stops on terminal proofs; no approve/reject buttons; clear access messaging.

4) **Telemetry/logging hygiene**
   - **Objective**: Remove logging of signed URLs/PII; log only error codes/ids.
   - **Files**: `src/lib/apiClient.ts` (dev logging), components showing URLs.
   - **Acceptance**: No console logs with attachment URLs; network errors still tracked.

### Definition of done (nominal flow)
- Sender logs in, creates mandate without sender spoof fields, receives success + ID, mandates list invalidated.
- Sender creates escrow choosing provider or beneficiary (exclusive), with amount_total/currency/release_conditions/deadline; success navigates to detail.
- Escrow detail shows milestones (if any) with validator/amount/status; sender selects milestone, uploads file via `/files/proofs`, submits `/proofs` with type/sha256/milestone_idx.
- App polls proof until APPROVED/REJECTED with bounded intervals; UI shows next-step messaging (waiting review/approved/rejected).
- Funding actions (deposit/funding-session) trigger polling until FUNDED/terminal; payments appear and stop polling on SENT/SETTLED/ERROR.

### Risk register (top 10)
1) **Role mismatch/scope leaks** – Mitigation: enforce scope flags from `/auth/me`, block sender_id inputs. 【F:src/app/sender/layout.tsx†L21-L48】
2) **Escrow create contract drift** – Mitigation: update payload/types to match provider/beneficiary/deadline/release_conditions; add client validation. 【F:src/app/sender/escrows/create/page.tsx†L46-L107】
3) **Proof payload mismatch** – Mitigation: require type/sha256/milestone_idx; validate file types before upload; align types. 【F:src/components/sender/ProofForm.tsx†L92-L176】
4) **Polling storms** – Mitigation: pause polling on hidden tabs; honor maxDuration; consolidate timers in summary/proof polling. 【F:src/lib/queries/sender.ts†L403-L512】【F:src/lib/queries/sender.ts†L900-L988】
5) **AI/privacy leaks** – Mitigation: hide ai_score/ai_explanation for sender/provider/advisor; use download service instead of raw URLs. 【F:src/components/sender/ProofAiStatus.tsx†L16-L45】【F:src/components/sender/SenderEscrowDetails.tsx†L228-L244】
6) **Advisor decision blocking not surfaced** – Mitigation: conditionally hide decision buttons and show reason tooltips; check validator role. 【F:src/app/admin/proofs/review-queue/page.tsx†L1-L59】
7) **Milestone creation errors** – Mitigation: replace JSON textarea with validated fields and schema-aware error display. 【F:src/app/admin/escrows/[id]/page.tsx†L185-L283】
8) **Payout execution ambiguity** – Mitigation: surface payout_blocked_reasons and disable execute when not eligible; adjust polling intervals. 【F:src/app/admin/payments/[id]/page.tsx†L1-L120】
9) **External upload absence** – Mitigation: build token issuance + upload flow; ensure escrow namespace enforced. (No current code.)
10) **Network banner update depth** – Mitigation: simplify `ConnectionBanner` state to avoid double setState loops on online/offline. 【F:src/components/system/ConnectionBanner.tsx†L6-L52】
