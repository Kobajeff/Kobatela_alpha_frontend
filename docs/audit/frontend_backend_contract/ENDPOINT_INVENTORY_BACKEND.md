# Backend Endpoint Inventory (Docs-Based)

## Source selection (canonical docs)
- **API_GUIDE (17).md** is the newest API guide in `docs/Backend_info` (latest numbered file) and explicitly claims full endpoint inventory and field-level schema documentation. It is the primary contract source.【docs/Backend_info/API_GUIDE (17).md#L1-L30】【docs/Backend_info/API_GUIDE (17).md#L18-L30】
- **FRONTEND_API_GUIDE (18).md** is the newest frontend-focused contract summary and is used only for UI-relevant framing where it matches the API guide.【docs/Backend_info/FRONTEND_API_GUIDE (18).md#L1-L40】

## Backend code validation status
- Backend implementation code (`app/routers/**`, `app/schemas/**`) is **not present** in this repository, so endpoint existence and response models **cannot be validated against code** here. This inventory is therefore **docs-only** and any schema that is not explicitly spelled out in the docs is treated as a STOP condition in the contract matrix.【docs/Backend_info/API_GUIDE (17).md#L6-L14】

---

## Endpoint inventory (doc-backed)
> The complete backend endpoint inventory is documented in the API guide’s “Endpoint Inventory (FULL DETAIL)” section. The list below extracts all endpoints used by the current frontend plus other admin/support endpoints that appear in the UI surface. For full coverage, see the cited API guide sections.【docs/Backend_info/API_GUIDE (17).md#L22-L30】【docs/Backend_info/API_GUIDE (17).md#L102-L360】

### Auth
- **POST /auth/login** — Request `AuthLoginRequest`, response `AuthLoginResponse`, public access.【docs/Backend_info/API_GUIDE (17).md#L107-L111】【docs/Backend_info/API_GUIDE (17).md#L391-L395】
- **GET /auth/me** — Response `AuthMeResponse`, requires sender/provider/admin/advisor scope.【docs/Backend_info/API_GUIDE (17).md#L107-L111】【docs/Backend_info/API_GUIDE (17).md#L391-L395】

### User profiles & admin users
- **POST /users** — Request `UserCreate`, response `UserRead`, admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L113-L118】【docs/Backend_info/API_GUIDE (17).md#L397-L401】
- **GET /me/profile** — Response `UserProfileRead`, sender/provider/admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L125-L127】【docs/Backend_info/API_GUIDE (17).md#L401-L402】
- **PATCH /me/profile** — Request `UserProfileUpdate`, response `UserProfileRead`, sender/provider/admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L126-L127】【docs/Backend_info/API_GUIDE (17).md#L401-L402】
- **POST /admin/users** — Request `AdminUserCreate`, response `AdminUserCreateResponse`, admin scope.【docs/Backend_info/API_GUIDE (17).md#L119-L123】
- **GET /admin/users** — Response `PaginatedResponse[AdminUserListItem]`, admin scope.【docs/Backend_info/API_GUIDE (17).md#L119-L123】【docs/Backend_info/API_GUIDE (17).md#L440-L442】
- **GET /admin/users/{user_id}** — Response `AdminUserDetailRead`, admin scope.【docs/Backend_info/API_GUIDE (17).md#L119-L123】
- **GET /admin/users/{user_id}/api-keys** — Response `list[ApiKeyRead]`, admin scope.【docs/Backend_info/API_GUIDE (17).md#L121-L124】
- **POST /admin/users/{user_id}/api-keys** — Request `AdminUserApiKeyCreate`, response `AdminUserApiKeyCreateResponse`, admin scope.【docs/Backend_info/API_GUIDE (17).md#L121-L124】
- **DELETE /admin/users/{user_id}/api-keys/{api_key_id}** — 204, admin scope.【docs/Backend_info/API_GUIDE (17).md#L123-L124】

### Escrows & milestones
- **GET /escrows** — Query `mine/status/...`, response `PaginatedResponse[EscrowListItem]` or list, sender/provider/support scopes.【docs/Backend_info/API_GUIDE (17).md#L143-L147】【docs/Backend_info/API_GUIDE (17).md#L406-L406】
- **POST /escrows** — Request `EscrowCreate`, response `EscrowRead`, sender scope.【docs/Backend_info/API_GUIDE (17).md#L146-L147】【docs/Backend_info/API_GUIDE (17).md#L403-L405】
- **POST /escrows/{escrow_id}/deposit** — Request `EscrowDepositCreate`, response `EscrowRead`, sender scope, `Idempotency-Key` required.【docs/Backend_info/API_GUIDE (17).md#L147-L149】【docs/Backend_info/API_GUIDE (17).md#L407-L408】
- **POST /escrows/{escrow_id}/funding-session** — Response `FundingSessionRead`, sender/admin scope.【docs/Backend_info/API_GUIDE (17).md#L148-L149】【docs/Backend_info/API_GUIDE (17).md#L417-L419】
- **POST /escrows/{escrow_id}/mark-delivered** — Request `EscrowActionPayload`, response `EscrowRead`, sender scope.【docs/Backend_info/API_GUIDE (17).md#L149-L151】
- **POST /escrows/{escrow_id}/client-approve** — Request `EscrowActionPayload`, response `EscrowRead`, sender scope.【docs/Backend_info/API_GUIDE (17).md#L150-L152】
- **POST /escrows/{escrow_id}/client-reject** — Request `EscrowActionPayload`, response `EscrowRead`, sender scope.【docs/Backend_info/API_GUIDE (17).md#L151-L153】
- **POST /escrows/{escrow_id}/check-deadline** — Response `EscrowRead`, sender scope.【docs/Backend_info/API_GUIDE (17).md#L152-L154】
- **GET /escrows/{escrow_id}** — Response `EscrowRead`, sender/provider/support/admin scopes.【docs/Backend_info/API_GUIDE (17).md#L153-L155】
- **GET /escrows/{escrow_id}/summary** — Response `SenderEscrowSummary`, sender/provider scopes (schema fields not spelled out in docs).【docs/Backend_info/API_GUIDE (17).md#L155-L155】
- **GET /admin/escrows/{escrow_id}/summary** — Response `AdminEscrowSummaryRead`, admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L155-L156】
- **GET /escrows/{escrow_id}/milestones** — Response `list[MilestoneRead]`, sender/provider/admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L160-L162】
- **GET /escrows/milestones/{milestone_id}** — Response `MilestoneRead`, sender/provider/admin scopes.【docs/Backend_info/API_GUIDE (17).md#L162-L163】
- **POST /escrows/{escrow_id}/milestones** — Request `MilestoneCreate`, response `MilestoneRead`, admin/support/sender (sender restricted to draft).【docs/Backend_info/API_GUIDE (17).md#L160-L165】【docs/Backend_info/API_GUIDE (17).md#L408-L409】

### Proofs + uploads
- **POST /files/proofs** — multipart upload, response `ProofFileUploadResponse`, sender/provider/support/admin scopes.【docs/Backend_info/API_GUIDE (17).md#L170-L175】【docs/Backend_info/API_GUIDE (17).md#L411-L415】
- **POST /proofs** — Request `ProofCreate`, response `ProofRead`, sender/provider/support/admin scopes.【docs/Backend_info/API_GUIDE (17).md#L175-L178】【docs/Backend_info/API_GUIDE (17).md#L411-L414】
- **GET /proofs/{proof_id}** — Response `ProofDetailRead`, sender/provider/support/admin/advisor scopes.【docs/Backend_info/API_GUIDE (17).md#L176-L177】【docs/Backend_info/API_GUIDE (17).md#L411-L414】
- **POST /proofs/{proof_id}/decision** — Request `ProofDecision`, response `ProofRead`, sender/support/admin scopes.【docs/Backend_info/API_GUIDE (17).md#L177-L178】【docs/Backend_info/API_GUIDE (17).md#L411-L414】
- **POST /proofs/{proof_id}/request_advisor_review** — Response `ProofRead`, sender scope.【docs/Backend_info/API_GUIDE (17).md#L292-L292】

### Mandates + merchant suggestions
- **POST /mandates** — Request `UsageMandateCreate`, response `UsageMandateRead`, sender scope.【docs/Backend_info/API_GUIDE (17).md#L135-L140】【docs/Backend_info/API_GUIDE (17).md#L421-L423】
- **GET /mandates/{mandate_id}** — Response `UsageMandateRead`, sender/provider/support/admin scopes.【docs/Backend_info/API_GUIDE (17).md#L139-L140】
- **POST /merchant-suggestions** — Request `MerchantSuggestionCreate`, response `MerchantSuggestionRead`, sender scope.【docs/Backend_info/API_GUIDE (17).md#L232-L238】【docs/Backend_info/API_GUIDE (17).md#L425-L428】
- **GET /merchant-suggestions** — Response `list[MerchantSuggestionRead]`, sender scope.【docs/Backend_info/API_GUIDE (17).md#L234-L237】
- **GET /merchant-suggestions/{suggestion_id}** — Response `MerchantSuggestionRead`, sender scope.【docs/Backend_info/API_GUIDE (17).md#L236-L237】
- **GET /admin/merchant-suggestions** — Response `list[MerchantSuggestionRead]`, admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L238-L241】
- **POST /admin/merchant-suggestions/{suggestion_id}/approve** — Request `MerchantSuggestionAdminUpdate`, response `MerchantSuggestionRead`, admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L238-L240】
- **POST /admin/merchant-suggestions/{suggestion_id}/reject** — Request `MerchantSuggestionAdminUpdate`, response `MerchantSuggestionRead`, admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L239-L240】
- **POST /admin/merchant-suggestions/{suggestion_id}/promote** — Request `MerchantSuggestionPromote`, response `MerchantSuggestionRead`, admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L240-L241】

### Advisor (advisor + admin)
- **GET /me/advisor** — Response `AdvisorProfileRead`, sender scope.【docs/Backend_info/FRONTEND_API_GUIDE (18).md#L104-L110】
- **GET /advisor/me/profile** — Response `AdvisorProfileRead`, advisor scope.【docs/Backend_info/FRONTEND_API_GUIDE (18).md#L104-L111】
- **GET /advisor/me/proofs** — Response `list[AdvisorProofItem]`, advisor scope.【docs/Backend_info/FRONTEND_API_GUIDE (18).md#L104-L111】
- **POST /admin/advisors** — Request `AdvisorProfileCreate`, response `AdvisorProfileRead`, admin scope.【docs/Backend_info/API_GUIDE (17).md#L297-L302】【docs/Backend_info/API_GUIDE (17).md#L434-L436】
- **GET /admin/advisors** — Response `list[AdvisorProfileListItem]`, admin scope.【docs/Backend_info/API_GUIDE (17).md#L297-L302】
- **GET /admin/advisors/{advisor_id}** — Response `AdvisorProfileRead`, admin scope.【docs/Backend_info/API_GUIDE (17).md#L298-L300】
- **PATCH /admin/advisors/{advisor_id}** — Request `AdvisorProfileUpdate`, response `AdvisorProfileRead`, admin scope.【docs/Backend_info/API_GUIDE (17).md#L299-L301】
- **GET /admin/advisors/{advisor_id}/senders** — Response `list[AdvisorSenderItem]`, admin scope.【docs/Backend_info/API_GUIDE (17).md#L300-L302】
- **POST /admin/advisors/{advisor_id}/assign-sender** — Request `AdminAssignSenderRequest`, response `AdvisorProfileRead`, admin scope.【docs/Backend_info/API_GUIDE (17).md#L301-L302】
- **GET /admin/advisors/overview** — Response `list[AdvisorWorkloadSummary]`, admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L320-L321】【docs/Backend_info/API_GUIDE (17).md#L434-L436】

### Admin tools / support ops
- **GET /alerts** — Response `PaginatedResponse[AlertRead]`, admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L316-L320】【docs/Backend_info/API_GUIDE (17).md#L438-L441】
- **GET /admin/proofs/review-queue** — Response `PaginatedResponse[AdminProofReviewItem]`, admin/support scopes (field list not spelled out in docs).【docs/Backend_info/API_GUIDE (17).md#L319-L320】
- **GET /admin/fraud/score_comparison** — Response `FraudScoreComparisonResponse`, admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L255-L260】
- **GET /admin/risk-snapshots** — Response `PaginatedResponse[RiskFeatureSnapshotRead]`, admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L259-L262】
- **GET /admin/settings/ai-proof** — Response `dict`, admin scope.【docs/Backend_info/API_GUIDE (17).md#L320-L323】
- **POST /admin/settings/ai-proof** — Query param `enabled`, response `dict`, admin scope.【docs/Backend_info/API_GUIDE (17).md#L321-L323】

### Payments & transactions
- **POST /payments/execute/{payment_id}** — Response `PaymentRead`, admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L304-L308】【docs/Backend_info/API_GUIDE (17).md#L417-L419】
- **GET /admin/payments** — Response `PaginatedResponse[PaymentRead]`, admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L307-L308】【docs/Backend_info/API_GUIDE (17).md#L417-L419】
- **GET /transactions** — Response `PaginatedResponse[TransactionRead]`, admin scope. Docs describe items exposing only ids/status/amount/currency/timestamps.【docs/Backend_info/FRONTEND_API_GUIDE (18).md#L135-L139】

### Spend/usage
- **GET /admin/spend/allowed** — Response `PaginatedResponse[AllowedUsageRead]`, admin/support scopes.【docs/Backend_info/API_GUIDE (17).md#L352-L358】

### Pricing (reference + inflation)
- **POST /admin/pricing/reference/import-csv** — Upload CSV, response `PriceReferenceImportResponse`, pricing_admin/risk_admin scopes.【docs/Backend_info/API_GUIDE (17).md#L245-L249】
- **POST /admin/pricing/inflation/upload-csv** — Upload CSV, response `InflationCsvImportResponse`, pricing_admin/risk_admin scopes.【docs/Backend_info/API_GUIDE (17).md#L248-L252】
- **GET /admin/pricing/inflation** — Response `list[InflationAdjustmentResponse]`, pricing_admin/risk_admin scopes (query params documented as country_code/category/active_on).【docs/Backend_info/API_GUIDE (17).md#L248-L251】
- **POST /admin/pricing/inflation** — Request `InflationAdjustmentPayload`, response `InflationAdjustmentResponse`, pricing_admin/risk_admin scopes.【docs/Backend_info/API_GUIDE (17).md#L249-L252】
- **PUT /admin/pricing/inflation/{adjustment_id}** — Request `InflationAdjustmentPayload`, response `InflationAdjustmentResponse`, pricing_admin/risk_admin scopes.【docs/Backend_info/API_GUIDE (17).md#L251-L252】
- **DELETE /admin/pricing/inflation/{adjustment_id}** — Response `dict[str, str]`, pricing_admin/risk_admin scopes.【docs/Backend_info/API_GUIDE (17).md#L252-L253】

### External proof portal
- **POST /sender/external-proof-tokens** — Request `ExternalProofTokenRequest`, response `ExternalProofTokenResponse`, sender/support/admin scopes.【docs/Backend_info/API_GUIDE (17).md#L179-L182】【docs/Backend_info/API_GUIDE (17).md#L447-L452】
- **GET /sender/external-proof-tokens** — Response `ExternalProofTokenList`, sender/support/admin scopes.【docs/Backend_info/API_GUIDE (17).md#L179-L182】
- **GET /sender/external-proof-tokens/{token_id}** — Response `ExternalProofTokenRead`, sender/support/admin scopes.【docs/Backend_info/API_GUIDE (17).md#L180-L182】
- **POST /sender/external-proof-tokens/{token_id}/revoke** — Response `ExternalProofTokenRead`, sender/support/admin scopes.【docs/Backend_info/API_GUIDE (17).md#L181-L182】
- **POST /external/files/proofs** — multipart upload, public token auth, response `ExternalProofUploadResponse` (fields spelled out in schema docs).【docs/Backend_info/API_GUIDE (17).md#L185-L186】【docs/Backend_info/API_GUIDE (17).md#L447-L453】
- **POST /external/proofs/submit** — Request `ExternalProofSubmit`, response `ExternalProofSubmitResponse`, public token auth.【docs/Backend_info/API_GUIDE (17).md#L185-L187】【docs/Backend_info/API_GUIDE (17).md#L449-L452】
- **GET /external/escrows/summary** — Response `ExternalEscrowSummary`, public token auth.【docs/Backend_info/API_GUIDE (17).md#L186-L188】【docs/Backend_info/API_GUIDE (17).md#L451-L452】
- **GET /external/proofs/{proof_id}/status** — Response `ExternalProofStatusResponse`, public token auth.【docs/Backend_info/API_GUIDE (17).md#L188-L189】【docs/Backend_info/API_GUIDE (17).md#L452-L453】

### KCT public (GOV/ONG)
- **GET /kct_public/projects** — Response `list[GovProjectRead]`, sender/admin scope + GOV/ONG user required.【docs/Backend_info/API_GUIDE (17).md#L339-L348】
