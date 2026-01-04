# Frontend API Usage Inventory (Actual Calls)

## Global API client configuration
- **Base URL**: `NEXT_PUBLIC_API_BASE_URL` fallback to `http://localhost:8000`.【src/lib/apiClient.ts#L10-L15】
- **Auth header**: injects `Authorization: Bearer <token>` for API calls when a token exists.【src/lib/apiClient.ts#L19-L24】
- **External proof token auth**: external client adds token-based headers for `/external/*` endpoints.【src/lib/api/externalClient.ts#L17-L20】

---

## Auth & identity
- **POST /auth/login**
  - **Used in**: `useLogin` mutation (login form).【src/lib/queries/sender.ts#L110-L138】
  - **Request fields**: `{ email }` only (no explicit scope in frontend).【src/lib/queries/sender.ts#L113-L127】
  - **Response fields used**: `token` or `access_token` persisted into auth storage.【src/lib/queries/sender.ts#L129-L133】
- **GET /auth/me**
  - **Used in**: `useAuthMe` to hydrate current user identity.【src/lib/queries/sender.ts#L200-L208】
  - **Response fields used**: `user` object passed to `normalizeAuthUser` which reads `id`/`user_id`, `role`, `scopes`, `api_scopes`, `scope`, `permissions`.【src/lib/queries/sender.ts#L200-L208】【src/lib/authIdentity.ts#L31-L55】

## Profiles
- **GET /me/profile**
  - **Used in**: `useUserProfile` for sender profile UI.【src/lib/queries/sender.ts#L232-L242】
  - **Response fields used**: passed into profile pages (e.g., shows user role and profile details).【src/app/sender/profile/page.tsx#L134-L152】
- **PATCH /me/profile**
  - **Used in**: `useUpdateUserProfile` mutation.【src/lib/queries/sender.ts#L247-L258】
  - **Request fields**: `UserProfileUpdatePayload` passed through from form state (keys not enumerated in code).【src/lib/queries/sender.ts#L247-L252】

## Sender dashboard & escrows
- **GET /sender/dashboard**
  - **Used in**: `useSenderDashboard` query.【src/lib/queries/sender.ts#L263-L295】
  - **Query params**: `limit`, optional `include_actions=true`.【src/lib/queries/sender.ts#L286-L294】
  - **Response fields used**: `recent_escrows`, `pending_proofs`, `recent_payments` for counts and lists (proof fields `id`, `escrow_id`, `status`, `created_at`; payment fields `id`, `escrow_id`, `amount`, `currency`, `status`, `created_at`).【src/app/sender/dashboard/page.tsx#L17-L105】
- **GET /escrows?mine=true**
  - **Used in**: `useSenderEscrows` (sender list view).【src/lib/queries/sender.ts#L300-L323】
  - **Query params**: `mine=true`, `limit`, `offset`, optional `status` filter.【src/lib/queries/sender.ts#L320-L322】
  - **Response fields used**: `id`, `status`, `amount_total`, `currency`, `created_at` rendered in list rows.【src/components/sender/SenderEscrowList.tsx#L29-L40】
- **POST /escrows**
  - **Used in**: `useCreateEscrow` mutation (create escrow flow).【src/lib/queries/sender.ts#L328-L350】
  - **Request fields**: `EscrowCreatePayload` is passed through (keys defined by form components, not enumerated in this file).【src/lib/queries/sender.ts#L330-L349】
  - **Response fields used**: `id`, `status`, `amount_total`, `currency`, `created_at` used in demo fallback and data refresh logic.【src/lib/queries/sender.ts#L332-L343】
- **GET /escrows/{escrow_id}/summary**
  - **Used in**: `useSenderEscrowSummary` query (sender escrow detail).【src/lib/queries/sender.ts#L419-L499】
  - **Response fields used**: `summary.escrow.id/status/amount_total/currency/deadline_at`, `summary.milestones[*]` fields (`id`, `label`, `sequence_index`, `status`), `summary.proofs[*]` fields (`id`, `status`, `created_at`, `storage_url`), `summary.payments[*]` fields (`id`, `amount`, `status`, `created_at`) plus `summary.escrow.currency` for display.【src/components/sender/SenderEscrowDetails.tsx#L100-L227】【src/components/sender/SenderEscrowDetails.tsx#L240-L340】
- **GET /escrows/{escrow_id}/milestones**
  - **Used in**: `useEscrowMilestones` query (milestone list/polling).【src/lib/queries/sender.ts#L576-L590】
- **GET /escrows/milestones/{milestone_id}**
  - **Used in**: `useMilestoneDetail` query (milestone detail).【src/lib/queries/sender.ts#L593-L610】
- **POST /escrows/{escrow_id}/milestones**
  - **Used in**: `useCreateEscrowMilestones` (sender milestone creation) and admin create milestone flow.【src/lib/queries/sender.ts#L361-L381】【src/lib/queries/admin.ts#L1073-L1081】
  - **Request fields (sender)**: `label`, `amount`, `currency`, `sequence_index`, `proof_kind`, `proof_requirements` explicitly set in payload.【src/lib/queries/sender.ts#L368-L380】

## Escrow lifecycle actions (sender)
- **POST /escrows/{escrow_id}/mark-delivered** — `useMarkDelivered` action hook (empty payload).【src/lib/queries/sender.ts#L722-L724】
- **POST /escrows/{escrow_id}/client-approve** — `useClientApprove` action hook (empty payload).【src/lib/queries/sender.ts#L726-L728】
- **POST /escrows/{escrow_id}/client-reject** — `useClientReject` action hook (empty payload).【src/lib/queries/sender.ts#L730-L732】
- **POST /escrows/{escrow_id}/check-deadline** — `useCheckDeadline` action hook.【src/lib/queries/sender.ts#L734-L735】
- **POST /escrows/{escrow_id}/funding-session** — `useCreateFundingSession` mutation (PSP session).【src/lib/queries/sender.ts#L740-L753】
- **POST /escrows/{escrow_id}/deposit** — `useDepositEscrow` mutation with `{ amount }` body and `Idempotency-Key` header.【src/lib/queries/sender.ts#L783-L806】

## Proof uploads & lifecycle
- **POST /files/proofs**
  - **Used in**: `uploadProofFile` (multipart file upload, optional `escrow_id`).【src/lib/apiClient.ts#L99-L121】
- **POST /proofs**
  - **Used in**: `useCreateProof` mutation (sender proof submission).【src/lib/queries/sender.ts#L1012-L1038】
  - **Request fields**: `escrow_id`, `milestone_idx`, `type`, plus uploaded `storage_key`, `storage_url`, `sha256`, and optional `metadata.note`.【src/components/sender/ProofForm.tsx#L134-L193】
  - **Response fields used**: `id` or `proof_id` to update polling and navigation.【src/components/sender/ProofForm.tsx#L194-L197】
- **GET /proofs/{proof_id}**
  - **Used in**: `useProofReviewPolling` to track proof status during review.【src/lib/queries/sender.ts#L843-L846】
- **POST /proofs/{proof_id}/request_advisor_review**
  - **Used in**: `useRequestAdvisorReview` mutation (sender action).【src/lib/queries/sender.ts#L1061-L1072】

## Mandates + merchant suggestions
- **POST /mandates** — `useCreateMandate` mutation (sender create).【src/lib/queries/sender.ts#L81-L86】
- **GET /mandates/{mandate_id}** — `useMandate` query (detail).【src/lib/queries/sender.ts#L399-L405】
- **POST /merchant-suggestions** — `useCreateMerchantSuggestion` mutation (sender create).【src/lib/queries/sender.ts#L94-L101】
- **GET /merchant-suggestions** — `useMerchantSuggestionsList` query (sender list).【src/lib/queries/sender.ts#L56-L64】
- **GET /merchant-suggestions/{suggestion_id}** — `useMerchantSuggestion` query (sender detail).【src/lib/queries/sender.ts#L69-L76】

## Advisor (advisor UI)
- **GET /advisor/me/proofs** — `useAdvisorAssignedProofs` (advisor queue).【src/lib/queries/advisor.ts#L11-L23】
- **GET /advisor/me/profile** — `useAdvisorProfile` (advisor identity).【src/lib/queries/advisor.ts#L44-L52】

## External proof portal
- **POST /sender/external-proof-tokens** — issue external token (sender).【src/lib/queries/externalProofTokens.ts#L15-L21】
- **GET /sender/external-proof-tokens** — list external tokens (sender).【src/lib/queries/externalProofTokens.ts#L32-L53】
- **GET /sender/external-proof-tokens/{token_id}** — token detail (sender).【src/lib/queries/externalProofTokens.ts#L59-L66】
- **POST /sender/external-proof-tokens/{token_id}/revoke** — revoke token (sender).【src/lib/queries/externalProofTokens.ts#L71-L79】
- **POST /external/files/proofs** — external proof upload (token-based).【src/lib/api/externalClient.ts#L23-L46】
- **POST /external/proofs/submit** — external proof submission (token-based).【src/lib/api/externalClient.ts#L49-L58】
- **GET /external/escrows/summary** — external escrow summary (token-based).【src/lib/api/externalClient.ts#L61-L70】
- **GET /external/proofs/{proof_id}/status** — external proof status (token-based).【src/lib/api/externalClient.ts#L73-L81】
- **Response fields used (external summary/status)**: `escrow_id`, `status`, `amount_total`, `currency`, `milestones[*].milestone_idx/label/status/last_proof_status` for summary display, and `status`/`terminal` for status polling.【src/app/external/escrow/page.tsx#L114-L140】【src/lib/queries/external.ts#L71-L88】

## Admin/support operations
- **GET /alerts** — `useAdminAlerts` (admin/support).【src/lib/queries/admin.ts#L300-L306】
- **GET /admin/risk-snapshots** — `useAdminRiskSnapshots` (admin/support).【src/lib/queries/admin.ts#L320-L337】
- **GET /admin/fraud/score_comparison** — `useAdminFraudScoreComparison` (admin/support).【src/lib/queries/admin.ts#L123-L138】
- **GET /admin/proofs/review-queue** — `useAdminProofReviewQueue` (admin/support). UI maps fields such as `proof_id`, `escrow_id`, `milestone_id`, `status`, `type`, `created_at`, AI fields, and advisor summary when present.【src/lib/queries/admin.ts#L153-L182】【src/lib/queries/admin.ts#L808-L837】
- **GET /admin/advisors/overview** — admin advisors workload overview.【src/lib/adminApi.ts#L97-L101】
- **GET /admin/settings/ai-proof** — admin settings read (`key`, `value`, `effective`).【src/lib/adminApi.ts#L104-L108】
- **POST /admin/settings/ai-proof** — admin settings update with `enabled` query param (no body).【src/lib/adminApi.ts#L111-L117】
- **GET /admin/users** — list admin users (admin).【src/lib/adminApi.ts#L38-L50】
- **GET /admin/users/{user_id}** — admin user detail (admin).【src/lib/adminApi.ts#L53-L56】
- **POST /admin/users** — admin user creation (admin).【src/lib/adminApi.ts#L22-L27】
- **POST /users** — user creation (admin/support).【src/lib/adminApi.ts#L31-L35】
- **GET /admin/users/{user_id}/api-keys** — list API keys (admin).【src/lib/adminApi.ts#L60-L71】
- **POST /admin/users/{user_id}/api-keys** — issue API key (admin).【src/lib/adminApi.ts#L75-L84】
- **DELETE /admin/users/{user_id}/api-keys/{api_key_id}** — revoke API key (admin).【src/lib/adminApi.ts#L88-L94】
- **GET /admin/escrows/{escrow_id}/summary** — admin escrow summary view.【src/lib/queries/admin.ts#L976-L995】
- **POST /proofs/{proof_id}/decision** — admin proof approve/reject action.【src/lib/queries/admin.ts#L481-L485】
- **GET /admin/payments** — admin payment list (pagination).【src/lib/queries/admin.ts#L464-L470】
- **POST /payments/execute/{payment_id}** — execute payout action (admin/support).【src/lib/queries/admin.ts#L615-L620】
- **GET /admin/merchant-suggestions** — list suggestions (admin/support).【src/lib/queries/admin.ts#L473-L478】
- **POST /admin/merchant-suggestions/{suggestion_id}/approve|reject|promote** — admin actions.【src/lib/queries/admin.ts#L634-L681】
- **GET /beneficiaries/{beneficiary_id}** — admin/support beneficiary lookup.【src/lib/queries/admin.ts#L94-L99】
- **GET /transactions** — admin transactions list (admin only).【src/lib/queries/admin.ts#L352-L367】
- **GET /admin/spend/allowed** — admin/support spend allowlist list.【src/lib/queries/admin.ts#L381-L396】
- **Admin advisor CRUD**: `/admin/advisors`, `/admin/advisors/{id}`, `/admin/advisors/{id}/senders`, `/admin/advisors/{id}/assign-sender` via admin queries.【src/lib/queries/admin.ts#L850-L865】【src/lib/queries/admin.ts#L1147-L1214】

## Pricing admin
- **POST /admin/pricing/reference/import-csv** — upload reference CSV.【src/lib/queries/pricingAdmin.ts#L20-L26】
- **POST /admin/pricing/inflation/upload-csv** — upload inflation CSV.【src/lib/queries/pricingAdmin.ts#L29-L35】
- **GET /admin/pricing/inflation** — list inflation adjustments (frontend expects paginated).【src/lib/queries/pricingAdmin.ts#L38-L53】
- **POST /admin/pricing/inflation** — create inflation adjustment.【src/lib/queries/pricingAdmin.ts#L56-L58】
- **PUT /admin/pricing/inflation/{id}** — update inflation adjustment.【src/lib/queries/pricingAdmin.ts#L61-L69】
- **DELETE /admin/pricing/inflation/{id}** — delete inflation adjustment.【src/lib/queries/pricingAdmin.ts#L72-L73】

## KCT public (GOV/ONG)
- **GET /kct_public/projects** — list public projects with filters (admin/sender + GOV/ONG).【src/lib/queries/kctPublic.ts#L14-L34】

## Role gating / UI access control
- Admin routes are protected by `RequireScope` requiring `ADMIN` or `SUPPORT` scopes and roles `admin`, `support`, or `both`.【src/app/admin/layout.tsx#L3-L15】【src/components/system/RequireScope.tsx#L68-L116】
- Advisor routes are protected by `RequireScope` requiring `ADVISOR` scope and advisor/admin/support roles.【src/app/advisor/layout.tsx#L7-L15】
