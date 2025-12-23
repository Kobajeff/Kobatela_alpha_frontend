# Smoke Checklist — Block 15 “Payments execute”

Timebox: ~5 minutes. This is a lightweight manual smoke run (no Playwright/Cypress).

## Preconditions / Auth setup

### How auth works (dev)
- **Auth token storage**: `localStorage['kobatela_token']` (set/get/clear in `src/lib/auth.ts` L1-L19).
- **Role derivation**: `GET /auth/me` → `response.data.user.role` in `useAuthMe` (`src/lib/queries/sender.ts` L152-L166).
- **Login entry point**: `/login` calls `POST /auth/login` with `{ email }` and stores token (`src/app/login/page.tsx` L15-L65; `src/lib/queries/sender.ts` L91-L116).

### Obtain tokens
- **SUPPORT token** (preferred): use the existing backend login flow with a support user email on `/login`.
- **SENDER token**: use `/login` with a sender email, or inject manually.

### Manual token injection (if needed)
1. Open DevTools → Application → Local Storage.
2. Set key: `kobatela_token` to a valid JWT.
3. Refresh the page.

> Demo mode note: when `NEXT_PUBLIC_DEMO_MODE=true`, the role is taken from `localStorage['kobatela_demo_role']` (`src/lib/config.ts` L9-L27) and only supports `admin`/`sender`. There is no demo `support` role.

## Step 0 — Build sanity
- ✅ `npm run build` (completed in this run; no changes required).

## Step 1 — RBAC access smoke for `/admin/payments/[id]`

### A) SUPPORT access
1. With a **SUPPORT token** active, open: `/admin/payments/[id]` (use a real payment ID).
2. Expected:
   - Page renders (no redirect to login).
   - No “Access denied” message.
3. Guard location:
   - Admin layout checks role and allows `admin`, `both`, or `support` (`src/app/admin/layout.tsx` L28-L56).

### B) SENDER denial
1. With a **SENDER token** active, open the same `/admin/payments/[id]` URL.
2. Expected:
   - Redirect to `/sender/dashboard` (for `sender`) or to `/login` for other non-admin roles.
   - Must **not** show admin payment data.
3. Guard location:
   - Admin layout redirects `sender` to sender dashboard (`src/app/admin/layout.tsx` L28-L35).

## Step 2 — Execute action smoke (network + UI)
1. Open DevTools → Network, filter by `payments/execute`.
2. Click **Execute payout**.

Expected UI behavior:
- Button disables immediately and shows spinner while pending (`src/app/admin/payments/[id]/page.tsx` L92-L100, L213-L278).

Expected network behavior:
- **POST** `/payments/execute/{payment_id}` is fired once (`src/lib/queries/admin.ts` L297-L303).
- Repeated clicks do not create additional POSTs because the CTA is disabled (`src/app/admin/payments/[id]/page.tsx` L213-L270).

### 409 Already executed case
If API returns `409`:
- Message displayed: **“Paiement déjà exécuté.”** (`src/app/admin/payments/[id]/page.tsx` L160-L165).
- “Already executed” helper text appears: **“Exécution déjà effectuée.”** (`src/app/admin/payments/[id]/page.tsx` L280-L284).
- CTA remains disabled (uses `alreadyExecuted` in `executeDisabled`; `src/app/admin/payments/[id]/page.tsx` L213-L214).
- Refetch occurs once (no retry loop): `paymentQuery.refetch()` is called in `onError` (`src/app/admin/payments/[id]/page.tsx` L160-L174).

## Step 3 — Polling terminal states smoke

### Locate polling implementation
- Refetch interval is computed in the payment detail page with `makeRefetchInterval` and `pollingProfiles.payoutStatus` (`src/app/admin/payments/[id]/page.tsx` L44-L76).
- `pollingProfiles.payoutStatus` config (5s then 20s) lives in `src/lib/pollingDoctrine.ts` L102-L110.

### Terminal statuses (code-defined)
- `SETTLED`, `ERROR`, `REFUNDED` (`src/app/admin/payments/[id]/page.tsx` L20; `src/lib/pollingDoctrine.ts` L16).

### What to verify in DevTools
1. After Execute, observe repeated **GET** calls for admin payments list/detail (whatever the page uses for refresh).
2. When status becomes terminal, polling should stop (no more refetches).

## Known limitations
- This run is **manual** and depends on having valid SUPPORT/SENDER tokens and a payment ID in the backend.
- Demo mode does not support `support` role.
- Reaching a terminal status may require real backend processing; if it doesn’t complete quickly, note the limitation and stop after confirming polling starts.

---

## 5-minute checklist (quick run)
- [ ] SUPPORT token active → `/admin/payments/[id]` renders without redirect or denial.
- [ ] SENDER token active → redirect to `/sender/dashboard` or login; admin payment data not visible.
- [ ] Click Execute → button disables immediately and shows spinner.
- [ ] Single POST `/payments/execute/{payment_id}` fired.
- [ ] 409 already executed → message shown, CTA stays disabled, single refetch.
- [ ] Polling starts after execute and stops once status is terminal (`SETTLED`/`ERROR`/`REFUNDED`).

