# Kobatela Frontend – API Usage Guide

This document explains how the Next.js frontend talks to the FastAPI backend (documented in `kobatela_alpha/docs/API_GUIDE.md`).
It focuses on which endpoints are called, via which hooks/helpers, and where they are rendered in the UI.

## 1. Context & architecture
- **Stack**: Next.js App Router, TypeScript, Axios for HTTP (`src/lib/apiClient.ts`), TanStack Query for data fetching (`src/app/providers.tsx`).
- **Structure**: Sender and Admin sections use protected layouts (`src/app/sender/layout.tsx`, `src/app/admin/layout.tsx`) that load the authenticated user via React Query before rendering children.
- **Demo mode**: When `NEXT_PUBLIC_DEMO_MODE=true`, hooks return static demo data from `src/lib/demoData.ts` instead of calling the backend; role switching is available in the header.

## 2. Frontend authentication
- **Login (`POST /auth/login`)**: The `useLogin` mutation in `src/lib/queries/sender.ts` sends `{ email }` and expects `{ user, token | access_token }`. On success it stores `token ?? access_token` in `localStorage` via `setAuthToken` and invalidates the `authMe` query. Used by `src/app/login/page.tsx` to redirect to `/admin/dashboard` or `/sender/dashboard` based on `user.role`.
- **Auth context (`GET /auth/me`)**: `useAuthMe` in `src/lib/queries/sender.ts` fetches `/auth/me` (or demo data) and returns `response.data.user`. It retries once on errors, clears the token on 401/403/404, and is consumed by both admin and sender layouts to gate routes and perform role-based redirects.
- **Headers**: `src/lib/apiClient.ts` attaches `Authorization: Bearer <token>` via an Axios interceptor using the `kobatela_token` from `localStorage` (`src/lib/auth.ts`).
- **Logout**: The `Header` component (`src/components/layout/Header.tsx`) clears the token, wipes the React Query cache, and redirects to `/login`. A `useLogout` mutation is also exported from `src/lib/queries/sender.ts` for the same behavior.

## 3. “Sender” flow
### /login
- **Hook**: `useLogin()` → `POST /auth/login`.
- **Behavior**: Stores token, redirects by `user.role`. Errors use `extractErrorMessage`.

### /sender/dashboard
- **Hook**: `useSenderDashboard()` → `GET /sender/dashboard` (demo data when enabled).
- **Data rendered**: `recentEscrows`, `pendingProofs`, `recentPayments` displayed in summary cards and lists.
- **States**: Loading shows a centered spinner; errors render a red message (`extractErrorMessage`).

### /sender/escrows
- **Hook**: `useSenderEscrows({ status?, limit, offset })` → `GET /escrows?mine=true&status&limit&offset`.
- **Data rendered**: Paginated list of escrows with status filter.
- **States**: Loading spinner; error alert via `extractErrorMessage`.

### /sender/escrows/[id]
- **Hook**: `useSenderEscrowSummary(id)` → `GET /escrows/{id}/summary` for escrow, milestones, proofs, payments.
- **Actions**: Mutations wrapping `POST /escrows/{id}/{mark-delivered|client-approve|client-reject|check-deadline}` with toast feedback; they invalidate the escrow summary cache.
- **Proof creation**: `ProofForm` uploads files to `POST /files/proofs` (multipart) then submits `POST /proofs` via `useCreateProof`; query invalidations refresh dashboard and escrow detail.

### /sender/advisor
- **Hook**: `useMyAdvisor()` → `GET /me/advisor` to fetch the assigned advisor profile.
- **States**: Loading text, empty state if no advisor, otherwise renders profile details.

## 4. “Admin” flow
### /admin/dashboard
- **Hook**: `useAdminDashboard()` → `GET /admin/dashboard` for aggregated stats.
- **Create test user**: `AdminUserCreator` uses `adminCreateUser` (`POST /admin/users`) with payload `{ email, role, issue_api_key }` and shows returned `user` and optional `token`.

### /admin/proofs/review-queue
- **Hook**: `useAdminProofReviewQueue()` → `GET /admin/proofs/review-queue`.
- **Actions**: `useAdminApproveProof()` → `POST /admin/proofs/{id}/approve`; `useAdminRejectProof()` → `POST /admin/proofs/{id}/reject`. Both invalidate the review queue and surface errors via toasts.

### /admin/escrows/[id]
- **Hook**: `useAdminEscrowSummary(id)` → `GET /admin/escrows/{id}/summary` for escrow, milestones, proofs, and payments.
- **Display**: Proof rows include AI status via `ProofAiStatus` component.

### /admin/advisors
- **Overview**: `useAdminAdvisorsOverview()` → `GET /admin/advisors/overview` (workload metrics per advisor).
- **Directory**: `useAdminAdvisorsList()` → `GET /admin/advisors` for table rows.
- **Mutations**: `useAdminUpdateAdvisor()` → `PATCH /admin/advisors/{id}` to toggle `is_active` or `blocked`; invalidates advisor-related queries.

### /admin/advisors/[id]
- **Profile**: `useAdminAdvisorDetail(id)` → `GET /admin/advisors/{id}`.
- **Assigned senders**: `useAdminAdvisorSenders(id)` → `GET /admin/advisors/{id}/senders`.
- **Assign sender**: `useAdminAssignSender()` → `POST /admin/advisors/{id}/assign-sender` with `{ sender_email }`; also uses `useAdminUpdateAdvisor()` for block/activate toggles.

### /admin/settings/ai-proof
- **Read**: `useAiProofSetting()` → `GET /admin/settings/ai-proof` to retrieve `bool_value` (and `source`).
- **Update**: `useUpdateAiProofSetting()` → `POST /admin/settings/ai-proof` with `{ bool_value }`, invalidating the setting query on success.

## 5. Proof & AI management
- Proof submission (sender) uses `/files/proofs` for uploads and `/proofs` for creation; AI-related fields (risk level, flags, explanation) are rendered in sender/admin escrow detail components and the admin proof review table.
- Admins can toggle the AI proof advisor globally via `/admin/settings/ai-proof`.

## 6. Escrow management & usage mandates
- Sender-side escrow actions (`mark-delivered`, `client-approve`, `client-reject`, `check-deadline`) are encapsulated in dedicated hooks and invalidated caches to keep detail views fresh.
- Admins view escrow summaries via `/admin/escrows/{id}/summary` for oversight across milestones, proofs, and payments.

## 7. Error management & React Query states
- `extractErrorMessage` in `src/lib/apiClient.ts` surfaces backend `error.message` when available, falling back to `"Une erreur est survenue"`.
- Unauthorized detection (`isUnauthorizedError`) treats 401/403/404 as auth failures; `useAuthMe` clears the token and query cache in that case.
- Layouts redirect unauthorized users to `/login`, and pages commonly show a loading spinner or a red error box.
- React Query is configured globally in `src/app/providers.tsx` with default caching; queries often use `invalidateQueries` after mutations to refresh affected data.

## 8. Frontend environment variables
- `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`): base URL for Axios client (`src/lib/apiClient.ts`).
- `NEXT_PUBLIC_DEMO_MODE` (`false` by default): when `true`, hooks return mock data and the header allows switching between demo sender/admin roles (`src/lib/config.ts`).

Example `.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_DEMO_MODE=false
```

## 9. Mapping hooks/helpers to backend endpoints
| Hook / helper | Backend endpoint(s) | Pages / components |
| --- | --- | --- |
| `useLogin` | `POST /auth/login` | `/login` |
| `useAuthMe` | `GET /auth/me` | `src/app/sender/layout.tsx`, `src/app/admin/layout.tsx`, header |
| `useMyAdvisor` | `GET /me/advisor` | `/sender/dashboard`, `/sender/advisor` |
| `useSenderDashboard` | `GET /sender/dashboard` | `/sender/dashboard` |
| `useSenderEscrows` | `GET /escrows?mine=true&status&limit&offset` | `/sender/escrows` |
| `useSenderEscrowSummary` | `GET /escrows/{id}/summary` | `/sender/escrows/[id]` |
| `useMarkDelivered`, `useClientApprove`, `useClientReject`, `useCheckDeadline` | `POST /escrows/{id}/{action}` | `/sender/escrows/[id]` |
| `uploadProofFile` + `useCreateProof` | `POST /files/proofs`, `POST /proofs` | ProofForm on `/sender/escrows/[id]` |
| `useAdminDashboard` | `GET /admin/dashboard` | `/admin/dashboard` |
| `adminCreateUser` | `POST /admin/users` | `AdminUserCreator` on `/admin/dashboard` |
| `useAdminProofReviewQueue` | `GET /admin/proofs/review-queue` | `/admin/proofs/review-queue` |
| `useAdminApproveProof`, `useAdminRejectProof` | `POST /admin/proofs/{id}/approve`, `POST /admin/proofs/{id}/reject` | Proof review actions |
| `useAdminEscrowSummary` | `GET /admin/escrows/{id}/summary` | `/admin/escrows/[id]` |
| `useAdminAdvisorsOverview`, `useAdminAdvisorsList` | `GET /admin/advisors/overview`, `GET /admin/advisors` | `/admin/advisors` |
| `useAdminAdvisorDetail`, `useAdminAdvisorSenders` | `GET /admin/advisors/{id}`, `GET /admin/advisors/{id}/senders` | `/admin/advisors/[id]` |
| `useAdminUpdateAdvisor` | `PATCH /admin/advisors/{id}` | `/admin/advisors`, `/admin/advisors/[id]` |
| `useAdminAssignSender` | `POST /admin/advisors/{id}/assign-sender` | `/admin/advisors/[id]` |
| `useAiProofSetting`, `useUpdateAiProofSetting` | `GET /admin/settings/ai-proof`, `POST /admin/settings/ai-proof` | `/admin/settings/ai-proof` |
| `useLogout` / header logout | Clears token + cache (no endpoint call) | Header in layouts |

## 10. Local end-to-end test scenarios
1. **Start backend**: Run the FastAPI app (see backend `docs/API_GUIDE.md`) on `http://127.0.0.1:8000` and bootstrap demo users with `python -m scripts.bootstrap_admin_and_sender`.
2. **Configure frontend**: Create `.env.local` as shown above and run `npm install && npm run dev`.
3. **Sender flow**: Open `http://localhost:3000/login`, log in with the sender email created by the bootstrap script (e.g., `sender+concierge@kobatela.dev`). Verify `/sender/dashboard` stats, list filtering on `/sender/escrows`, and escrow actions/proof upload on `/sender/escrows/{id}`.
4. **Admin flow**: Log in with the admin email (e.g., `admin+console@kobatela.dev`). Check `/admin/dashboard` stats and create a test user; review proofs on `/admin/proofs/review-queue`; view an escrow at `/admin/escrows/{id}`.
5. **Advisor management**: Visit `/admin/advisors` for workload tables; open `/admin/advisors/{id}` to toggle status or assign senders; test the AI proof toggle at `/admin/settings/ai-proof`.
6. **Demo mode smoke test**: Set `NEXT_PUBLIC_DEMO_MODE=true` to browse the same pages without a backend, using the header switches to simulate sender/admin roles.
