# Frontend UI Pages Map

> Map of routes/pages/components with associated API calls, required role, response fields, and error handling.

## Layout Guards (Role Requirements)
- **Sender routes** require role `sender` or `both` (`src/app/sender/layout.tsx:21-38`).
- **Admin routes** require role `admin` or `both` (`src/app/admin/layout.tsx:21-38`).

---

## Routes

### `/` (Home / redirect)
- **File**: `src/app/page.tsx`
- **Role**: Any (redirect based on auth)
- **API calls**: `GET /auth/me` via `useAuthMe` (`src/app/page.tsx:11-34`, `src/lib/queries/sender.ts:94-108`).
- **Response fields used**: `user.role` (`src/app/page.tsx:23-31`).
- **Errors handled**: redirects to `/login` on error; no explicit codes handled.

### `/login`
- **File**: `src/app/login/page.tsx`
- **Role**: Public
- **API calls**: `POST /auth/login` (`src/lib/queries/sender.ts:49`).
- **Request payload**: `{ email }` (`src/app/login/page.tsx:16-25`).
- **Response fields used**: `user.role`, `token`/`access_token` stored (`src/lib/queries/sender.ts:52-56`, `src/app/login/page.tsx:16-25`).
- **Errors handled**: `extractErrorMessage` (expects `error.message` or `error.error.message`) (`src/app/login/page.tsx:19-28`, `src/lib/apiClient.ts:22-41`).

### `/sender/dashboard`
- **File**: `src/app/sender/dashboard/page.tsx`
- **Role**: Sender or Both
- **API calls**:
  - `GET /sender/dashboard` (`src/lib/queries/sender.ts:151`).
  - `GET /me/advisor` via `MyAdvisorCard` (`src/components/sender/MyAdvisorCard.tsx:78-90`).
- **Response fields used**:
  - `recent_escrows[].{id,status,amount,currency,created_at}` (`src/components/sender/SenderEscrowList.tsx:29-40`).
  - `pending_proofs[].{id,escrow_id,status,created_at}` (`src/app/sender/dashboard/page.tsx:73-81`).
  - `recent_payments[].{id,amount,currency,escrow_id,status,created_at}` (`src/app/sender/dashboard/page.tsx:94-102`).
  - Advisor fields for card display (`src/components/sender/MyAdvisorCard.tsx:13-59`).
- **Errors handled**: `extractErrorMessage` (`src/app/sender/dashboard/page.tsx:25-29`).

### `/sender/escrows`
- **File**: `src/app/sender/escrows/page.tsx`
- **Role**: Sender or Both
- **API calls**: `GET /escrows?mine=true&limit&offset&status?` (`src/lib/queries/sender.ts:173-176`).
- **Response fields used**: `id`, `status`, `amount`, `currency`, `created_at` (`src/components/sender/SenderEscrowList.tsx:29-40`).
- **Errors handled**: `extractErrorMessage` (`src/app/sender/escrows/page.tsx:41-45`).

### `/sender/escrows/[id]`
- **File**: `src/app/sender/escrows/[id]/page.tsx`
- **Role**: Sender or Both
- **API calls**:
  - `GET /escrows/{id}/summary` (`src/lib/queries/sender.ts:194`).
  - `POST /escrows/{id}/mark-delivered` (`src/lib/queries/sender.ts:224-225`).
  - `POST /escrows/{id}/client-approve` (`src/lib/queries/sender.ts:228-229`).
  - `POST /escrows/{id}/client-reject` (`src/lib/queries/sender.ts:232-233`).
  - `POST /escrows/{id}/check-deadline` (`src/lib/queries/sender.ts:236-237`).
  - `POST /files/proofs` (file upload) (`src/lib/apiClient.ts:77`).
  - `POST /proofs` (create proof) (`src/lib/queries/sender.ts:262`).
- **Response fields used**:
  - Summary: `escrow.{id,status,amount,currency,created_at}` (`src/components/sender/SenderEscrowDetails.tsx:43-71`).
  - Milestones: `id`, `name`, `status`, `due_date` (`src/components/sender/SenderEscrowDetails.tsx:80-93`).
  - Proofs: `id`, `description`, `status`, `created_at`, `attachment_url|file_url`, AI fields (`src/components/sender/SenderEscrowDetails.tsx:105-135`).
  - Payments: `id`, `amount`, `currency`, `status`, `created_at` (`src/components/sender/SenderEscrowDetails.tsx:150-162`).
- **Errors handled**: `extractErrorMessage` for fetch and actions (`src/app/sender/escrows/[id]/page.tsx:33-41`, `src/app/sender/escrows/[id]/page.tsx:64-68`).

### `/sender/advisor`
- **File**: `src/app/sender/advisor/page.tsx`
- **Role**: Sender or Both
- **API calls**: `GET /me/advisor` (`src/lib/queries/sender.ts:75`).
- **Response fields used**: Advisor profile fields (`src/components/sender/MyAdvisorCard.tsx:13-59`).
- **Errors handled**:
  - `isNoAdvisorAvailable` expects HTTP 503 with `code` or `error.code` (`src/lib/errors.ts:3-12`).
  - `extractErrorMessage` for other errors (`src/app/sender/advisor/page.tsx:22-26`).

### `/sender/profile`
- **File**: `src/app/sender/profile/page.tsx`
- **Role**: Sender or Both
- **API calls**: `GET /auth/me` (`src/lib/queries/sender.ts:106`).
- **Response fields used**: `email`, `username`, `role`, `payout_channel`, `created_at`, `is_active` (`src/app/sender/profile/page.tsx:32-66`).
- **Errors handled**: `extractErrorMessage` (`src/app/sender/profile/page.tsx:20-24`).

### `/admin/dashboard`
- **File**: `src/app/admin/dashboard/page.tsx`
- **Role**: Admin or Both
- **API calls**:
  - `GET /admin/dashboard` (`src/lib/queries/admin.ts:49`).
  - `POST /admin/users` via `AdminUserCreator` (`src/lib/services/admin.ts:7-9`).
- **Response fields used**:
  - Dashboard stats: `total_escrows`, `pending_proofs`, `approved_proofs`, `rejected_proofs`, `total_payments` (`src/app/admin/dashboard/page.tsx:32-37`).
  - Created user response: `user.email`, `user.role`, `token` (displayed) (`src/components/admin/AdminUserCreator.tsx:104-116`).
- **Errors handled**: `extractErrorMessage` (`src/app/admin/dashboard/page.tsx:18-22`, `src/components/admin/AdminUserCreator.tsx:19-21`).

### `/admin/senders`
- **File**: `src/app/admin/senders/page.tsx`
- **Role**: Admin or Both
- **API calls**: `GET /admin/senders` (`src/lib/queries/admin.ts:67-71`).
- **Response fields used**: `items[].{email,role,created_at,is_active}` (`src/app/admin/senders/page.tsx:63-78`).
- **Errors handled**: `extractErrorMessage` (`src/app/admin/senders/page.tsx:45`).

### `/admin/senders/[id]`
- **File**: `src/app/admin/senders/[id]/page.tsx`
- **Role**: Admin or Both
- **API calls**:
  - `GET /users/{id}` (`src/lib/queries/admin.ts:127`).
  - `GET /apikeys` (`src/lib/queries/admin.ts:89-90`).
  - `DELETE /apikeys/{id}` (`src/lib/queries/admin.ts:138`).
- **Response fields used**:
  - User: `email`, `username`, `role`, `is_active`, `payout_channel`, `created_at` (`src/app/admin/senders/[id]/page.tsx:83-109`).
  - API keys: `api_key_id`, `api_key_name`, `created_at` (`src/app/admin/senders/[id]/page.tsx:124-134`).
- **Errors handled**: `extractErrorMessage` (`src/app/admin/senders/[id]/page.tsx:57-59`, `src/app/admin/senders/[id]/page.tsx:47-48`).

### `/admin/advisors`
- **File**: `src/app/admin/advisors/page.tsx`
- **Role**: Admin or Both
- **API calls**:
  - `GET /admin/advisors/overview` (`src/lib/queries/admin.ts:182-183`).
  - `GET /admin/advisors` (`src/lib/queries/admin.ts:199-200`).
  - `POST /admin/advisors` (create) (`src/lib/queries/admin.ts:331`).
  - `PATCH /admin/advisors/{id}` (toggle active/blocked) (`src/lib/queries/admin.ts:307`).
- **Response fields used**:
  - Overview: `advisor_id`, `name`, `email`, `sender_managed`, `open_proofs`, `total_number_of_case_managed` (`src/components/admin/advisors/AdvisorOverviewCards.tsx:19-35`).
  - List: `id`, `display_name`, `first_name`, `last_name`, `email`, `country`, `languages`, `sender_managed`, `open_proofs`, `is_active`, `blocked` (`src/components/admin/advisors/AdvisorsTable.tsx:41-58`).
- **Errors handled**: `extractErrorMessage` (`src/app/admin/advisors/page.tsx:53-56`).

### `/admin/advisors/[id]`
- **File**: `src/app/admin/advisors/[id]/page.tsx`
- **Role**: Admin or Both
- **API calls**:
  - `GET /admin/advisors/{id}` (`src/lib/queries/admin.ts:282`).
  - `GET /admin/advisors/{id}/senders` (`src/lib/queries/admin.ts:293-294`).
  - `PATCH /admin/advisors/{id}` (`src/lib/queries/admin.ts:307`).
  - `POST /admin/advisors/{id}/assign-sender` (`src/lib/queries/admin.ts:349-351`).
- **Response fields used**:
  - Advisor profile: `first_name`, `last_name`, `email`, `languages`, `specialties`, `subscribe_date`, `sender_managed`, `total_number_of_case_managed`, `is_active`, `blocked` (`src/app/admin/advisors/[id]/page.tsx:80-152`).
  - Sender assignments: `sender_email`, `active`, `assigned_at` (`src/app/admin/advisors/[id]/page.tsx:173-183`).
- **Errors handled**: `extractErrorMessage` (`src/app/admin/advisors/[id]/page.tsx:44-48`).

### `/admin/proofs/review-queue`
- **File**: `src/app/admin/proofs/review-queue/page.tsx`
- **Role**: Admin or Both
- **API calls**:
  - `GET /admin/proofs/review-queue` (`src/lib/queries/admin.ts:171`).
  - `POST /admin/proofs/{id}/approve` (`src/lib/queries/admin.ts:266`).
  - `POST /admin/proofs/{id}/reject` (`src/lib/queries/admin.ts:374`).
- **Response fields used**: `id`, `escrow_id`, `milestone_name`, `sender_email`, `created_at`, `status`, AI fields (`src/components/admin/AdminProofReviewTable.tsx:47-58`).
- **Errors handled**: `extractErrorMessage` (`src/app/admin/proofs/review-queue/page.tsx:24-43`, `src/app/admin/proofs/review-queue/page.tsx:54-58`).

### `/admin/settings/ai-proof`
- **File**: `src/app/admin/settings/ai-proof/page.tsx`
- **Role**: Admin or Both
- **API calls**:
  - `GET /admin/settings/ai-proof` (`src/lib/queries/admin.ts:211-212`).
  - `POST /admin/settings/ai-proof` (`src/lib/queries/admin.ts:223-225`).
- **Response fields used**: `bool_value`, `source` (`src/app/admin/settings/ai-proof/page.tsx:12-40`).
- **Errors handled**: `extractErrorMessage` (`src/app/admin/settings/ai-proof/page.tsx:30`).

### `/admin/escrows/[id]`
- **File**: `src/app/admin/escrows/[id]/page.tsx`
- **Role**: Admin or Both
- **API calls**: `GET /admin/escrows/{id}/summary` (`src/lib/queries/admin.ts:248-249`).
- **Response fields used**:
  - Escrow: `id`, `status`, `amount`, `currency`, `created_at` (`src/app/admin/escrows/[id]/page.tsx:48-61`).
  - Advisor: `first_name`, `last_name`, `email` (`src/app/admin/escrows/[id]/page.tsx:64-75`).
  - Milestones: `id`, `name`, `status`, `due_date` (`src/app/admin/escrows/[id]/page.tsx:85-94`).
  - Proofs: `id`, `description`, `status`, `created_at`, `attachment_url|file_url`, AI fields (`src/app/admin/escrows/[id]/page.tsx:105-135`).
  - Payments: `id`, `amount`, `currency`, `status`, `created_at` (`src/app/admin/escrows/[id]/page.tsx:147-155`).
- **Errors handled**: `extractErrorMessage` (`src/app/admin/escrows/[id]/page.tsx:29-33`).

