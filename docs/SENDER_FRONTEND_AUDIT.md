# Sender Frontend Audit

## Sender-facing pages

| Route | Component | Key hooks | Backend endpoints |
| --- | --- | --- | --- |
| `/sender/dashboard` | `src/app/sender/dashboard/page.tsx` | `useSenderDashboard` | `GET /sender/dashboard`【F:src/app/sender/dashboard/page.tsx†L15-L19】【F:src/lib/queries/sender.ts†L130-L153】 |
| `/sender/escrows` | `src/app/sender/escrows/page.tsx` | `useSenderEscrows` | `GET /escrows?mine=true&status?&limit&offset`【F:src/app/sender/escrows/page.tsx†L24-L33】【F:src/lib/queries/sender.ts†L157-L179】 |
| `/sender/escrows/[id]` | `src/app/sender/escrows/[id]/page.tsx` | `useSenderEscrowSummary`, `useMarkDelivered`, `useClientApprove`, `useClientReject`, `useCheckDeadline`, `useCreateProof` (via `ProofForm`) | `GET /escrows/{id}/summary`, `POST /escrows/{id}/mark-delivered`, `POST /escrows/{id}/client-approve`, `POST /escrows/{id}/client-reject`, `POST /escrows/{id}/check-deadline`, `POST /proofs` (via `ProofForm` submission)【F:src/app/sender/escrows/[id]/page.tsx†L17-L78】【F:src/lib/queries/sender.ts†L181-L200】【F:src/lib/queries/sender.ts†L200-L240】 |
| `/sender/advisor` | `src/app/sender/advisor/page.tsx` | `useMyAdvisor` | `GET /me/advisor`【F:src/app/sender/advisor/page.tsx†L1-L40】【F:src/lib/queries/sender.ts†L65-L91】 |
| `/sender/profile` | `src/app/sender/profile/page.tsx` | `useAuthMe` | `GET /auth/me`【F:src/app/sender/profile/page.tsx†L6-L33】【F:src/lib/queries/sender.ts†L94-L124】 |

Sender layout guard: `src/app/sender/layout.tsx` redirects non-sender roles to login or admin dashboard based on `useAuthMe` data.【F:src/app/sender/layout.tsx†L1-L36】 Sidebar links map to `/sender/dashboard`, `/sender/escrows`, `/sender/profile`.【F:src/components/layout/Sidebar.tsx†L8-L28】

## Admin-facing sender management pages

| Route | Component | Key hooks | Backend endpoints |
| --- | --- | --- | --- |
| `/admin/dashboard` | `src/app/admin/dashboard/page.tsx` | `useAdminDashboard`, `AdminUserCreator` (uses `adminCreateUser`) | `GET /admin/dashboard`, `POST /admin/users` (optionally issues API key)【F:src/app/admin/dashboard/page.tsx†L5-L42】【F:src/components/admin/AdminUserCreator.tsx†L7-L60】【F:src/lib/services/admin.ts†L1-L11】 |
| `/admin/senders` | `src/app/admin/senders/page.tsx` | `useAdminSenders` | `GET /admin/senders` (expected paginated response)【F:src/app/admin/senders/page.tsx†L7-L17】【F:src/lib/queries/admin.ts†L61-L75】 |
| `/admin/senders/[id]` | `src/app/admin/senders/[id]/page.tsx` | `useAdminSenderProfile`, `useAdminSendersList`, `useAdminBlockSender` | `GET /users/{id}`, `GET /apikeys?scope=sender&active=true`, `DELETE /apikeys/{id}`【F:src/app/admin/senders/[id]/page.tsx†L13-L74】【F:src/lib/queries/admin.ts†L78-L121】【F:src/lib/queries/admin.ts†L123-L144】 |
| `/admin/advisors` | `src/app/admin/advisors/page.tsx` | `useAdminAdvisorsOverview`, `useAdminAdvisorsList`, `useAdminCreateAdvisor`, `useAdminUpdateAdvisor` | `GET /admin/advisors/overview`, `GET /admin/advisors`, `POST /admin/advisors`, `PATCH /admin/advisors/{id}` (advisor management links senders to advisors implicitly)【F:src/app/admin/advisors/page.tsx†L4-L56】【F:src/lib/queries/admin.ts†L94-L144】 |

Admin layout guard uses `useAuthMe` and redirects senders to `/sender/dashboard`; non admin/both roles are sent to `/login`.【F:src/app/admin/layout.tsx†L11-L36】 Admin sidebar exposes `/admin/senders` entry.【F:src/components/layout/AdminShell.tsx†L10-L29】

## Why the admin dashboard shows zero senders

### Is `/admin/senders` being called?
- Yes. `useAdminSenders` fetches `GET /admin/senders` with limit/offset/search params and exposes the returned payload to `/admin/senders` page.【F:src/lib/queries/admin.ts†L61-L75】【F:src/app/admin/senders/page.tsx†L11-L17】

### Why do no rows appear?
- The page renders `items = data?.items ?? []` and shows "Aucun expéditeur trouvé" when `items` is empty.【F:src/app/admin/senders/page.tsx†L17-L49】 If the new backend endpoint returns a bare array (or another property like `results`) instead of `{ items, total, ... }`, `items` will be `undefined`, leaving `items.length === 0` and the table empty. No other filters are applied.
- There is no DEMO-mode fallback; even with `NEXT_PUBLIC_DEMO_MODE=true`, this hook still calls the live API, so demo environments without the endpoint will also render nothing.【F:src/lib/queries/admin.ts†L61-L75】

### Data handling/invalidation issues
- `AdminUserCreator` invalidates the query key `['admin-senders']`, which will refresh lists created with `useAdminSenders` because the query key is `['admin-senders', { limit, offset, q }]` (partial match).【F:src/components/admin/AdminUserCreator.tsx†L21-L39】【F:src/lib/queries/admin.ts†L64-L75】 So cache invalidation is aligned.
- However, `useAdminBlockSender` invalidates `['admin','senders']`, not `['admin-senders']`, so blocked keys may not refresh sender data without a manual refetch on detail pages.【F:src/lib/queries/admin.ts†L132-L144】 This does not explain empty lists but affects consistency.

## DEMO mode considerations
- Sender/admin auth hooks and dashboards have demo data fallbacks (`getDemoRole`, `demoAdminStats`, etc.), but `useAdminSenders` and `useAdminSendersList` have none, so in demo mode the admin senders page still queries the backend.【F:src/lib/queries/admin.ts†L40-L75】【F:src/lib/config.ts†L1-L20】 If the API base is unreachable or returns a non-paginated array, the UI will render as empty.

## Sender capabilities currently supported

### Sender role
- **Login** via `/auth/login` using `useLogin`; token stored then `authMe` refreshed.【F:src/lib/queries/sender.ts†L33-L63】
- **Dashboard overview** at `/sender/dashboard` via `useSenderDashboard` → `GET /sender/dashboard`; shows counts and recent items, includes advisor card fetch via `useMyAdvisor`.【F:src/app/sender/dashboard/page.tsx†L4-L44】【F:src/lib/queries/sender.ts†L130-L155】【F:src/app/sender/dashboard/page.tsx†L45-L91】
- **Escrow list** at `/sender/escrows` via `useSenderEscrows` → `GET /escrows?mine=true...`; filter by status and paginate client-side.【F:src/app/sender/escrows/page.tsx†L24-L72】【F:src/lib/queries/sender.ts†L157-L179】
- **Escrow detail & actions** at `/sender/escrows/[id]` via `useSenderEscrowSummary` and mutation hooks for delivered/approve/reject/check-deadline; includes `ProofForm` for uploading proofs (calls proof creation hook).【F:src/app/sender/escrows/[id]/page.tsx†L17-L94】【F:src/lib/queries/sender.ts†L181-L240】
- **Advisor information** at `/sender/advisor` via `useMyAdvisor` → `GET /me/advisor`.【F:src/app/sender/advisor/page.tsx†L1-L40】【F:src/lib/queries/sender.ts†L65-L91】
- **Profile viewing** at `/sender/profile` via `useAuthMe` → `GET /auth/me`. No edit capabilities exposed.【F:src/app/sender/profile/page.tsx†L6-L47】【F:src/lib/queries/sender.ts†L94-L124】

### Admin role (sender management scope)
- **Create users (sender/admin/both/advisor)** from `/admin/dashboard` via `AdminUserCreator` → `POST /admin/users` with optional API key issuance; invalidates `admin-senders` queries on sender/both creation.【F:src/app/admin/dashboard/page.tsx†L5-L42】【F:src/components/admin/AdminUserCreator.tsx†L21-L60】
- **List senders** at `/admin/senders` via `useAdminSenders` → `GET /admin/senders`; provides search box that repopulates `q` and triggers refetch. Rendering expects `data.items`.【F:src/app/admin/senders/page.tsx†L10-L52】【F:src/lib/queries/admin.ts†L61-L75】
- **Sender detail/API keys** at `/admin/senders/[id]` via `useAdminSenderProfile` (`GET /users/{id}`) and `useAdminSendersList` (`GET /apikeys?scope=sender&active=true`). Block API key via `useAdminBlockSender` (`DELETE /apikeys/{id}`) but invalidates `['admin','senders']` only.【F:src/app/admin/senders/[id]/page.tsx†L13-L86】【F:src/lib/queries/admin.ts†L78-L144】
- **Advisor management** at `/admin/advisors` to view workload and create/update advisors; indirectly related to senders through advisor assignments (sender data not surfaced here).【F:src/app/admin/advisors/page.tsx†L4-L56】

## Summary & Fixes

### Observed problems
- Admin sender list expects a paginated object with `items`, so an array response from the new `GET /admin/senders` endpoint renders as empty even when data exists.【F:src/app/admin/senders/page.tsx†L17-L52】【F:src/lib/queries/admin.ts†L61-L75】
- `useAdminSenders` has no demo fallback; in demo mode or disconnected environments the page silently returns empty/failed state instead of showing mock senders.【F:src/lib/queries/admin.ts†L61-L75】【F:src/lib/config.ts†L1-L20】
- Sender detail page uses `useAdminSendersList` hitting `/apikeys` rather than `/admin/senders/{id}` or an API-key endpoint aligned with the new admin senders API, so key visibility depends on a separate route and invalidation (`['admin','senders']`) that does not match the list queries (`['admin-senders', ...]`).【F:src/app/admin/senders/[id]/page.tsx†L13-L74】【F:src/lib/queries/admin.ts†L78-L144】

### Recommended fixes
- Update `useAdminSenders` + `/admin/senders` page to handle both array and paginated shapes (e.g., `const items = Array.isArray(data) ? data : data?.items ?? []`) and adjust typings accordingly; this will immediately surface existing backend senders.【F:src/app/admin/senders/page.tsx†L11-L52】【F:src/lib/queries/admin.ts†L61-L75】
- Add demo-mode branch in `useAdminSenders` (and optionally `useAdminSendersList`) returning fixture sender rows so `/admin/senders` works consistently in demo/staging without backend dependency.【F:src/lib/queries/admin.ts†L61-L120】【F:src/lib/config.ts†L1-L20】
- Align admin sender detail with new endpoints: create a `useAdminSenderKeys` hook targeting the admin sender API (if available) or change invalidation in `useAdminBlockSender` to `['admin-senders']` to refresh both list and detail after blocking keys.【F:src/lib/queries/admin.ts†L78-L144】
- Optional UX improvement: surface linked sender→advisor info on `/admin/senders` using the data returned by `/admin/senders` (if provided) to let admins see assignment without opening advisor page.
