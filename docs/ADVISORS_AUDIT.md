# Advisors Audit

Comprehensive review of advisor-related functionality visible in this repository (Next.js frontend for Kobatela). Backend behavior is inferred from API contracts exposed to the UI; no backend source is present here.

## 1. Inventory of Advisor-Related Code

| File | Symbol / Endpoint | Type | Short description | Inbound usage | Outbound dependencies |
| --- | --- | --- | --- | --- | --- |
| `src/types/api.ts` | `UserRole` (`'sender' | 'admin' | 'both'`) | Enum/type | Available user roles; no advisor-specific role defined. | Imported by auth/user-related code. | Auth flows; backend role mapping. 【F:src/types/api.ts†L1-L11】 |
| `src/types/api.ts` | `AdvisorProfile` | Schema/type | Shape of advisor objects (user linkage, workload counts, contact info, activity flags, languages/specialties). | Used by sender/admin queries and UI components. | Backend `/me/advisor`, `/admin/advisors/*` responses. 【F:src/types/api.ts†L155-L168】 |
| `src/types/api.ts` | `AdminAdvisorSummary` | Schema/type | Aggregated workload metrics per advisor (active senders, open proofs, total cases). | `useAdminAdvisorsOverview` → `AdminAdvisorsPage`. | Backend `/admin/advisors/overview`. 【F:src/types/api.ts†L170-L176】 |
| `src/types/api.ts` | `AdminAdvisorListItem` | Schema/type | Directory row with advisor identity, activity, blocked flag, workloads, languages, specialties. | `useAdminAdvisorsList` → `AdminAdvisorsPage`. | Backend `/admin/advisors`. 【F:src/types/api.ts†L178-L190】 |
| `src/types/api.ts` | `AdvisorSenderItem` | Schema/type | Sender assignment rows (email, active flag, assignment timestamp). | `useAdminAdvisorSenders` → detail page. | Backend `/admin/advisors/{id}/senders`. 【F:src/types/api.ts†L192-L197】 |
| `src/types/api.ts` | `AiProofSetting` | Schema/type | Global toggle for “AI proof advisor” mode (bool, source, timestamp). | `useAiProofSetting` / `useUpdateAiProofSetting`. | Backend `/admin/settings/ai-proof`. 【F:src/types/api.ts†L199-L204】 |
| `src/lib/queries/sender.ts` | `useMyAdvisor` | Client hook | Fetches current sender’s advisor profile (demo fallback). | `MyAdvisorCard`, sender advisor page. | GET `/me/advisor`; `apiClient`; `demoAdvisorProfile`. 【F:src/lib/queries/sender.ts†L46-L58】 |
| `src/lib/queries/admin.ts` | `useAdminAdvisorsOverview` | Client hook | Retrieves admin-level advisor workload summary. | `AdminAdvisorsPage` overview table. | GET `/admin/advisors/overview`; `apiClient`. 【F:src/lib/queries/admin.ts†L49-L58】 |
| `src/lib/queries/admin.ts` | `useAdminAdvisorsList` | Client hook | Lists advisors with activity/blocked flags and workloads. | `AdminAdvisorsPage` directory. | GET `/admin/advisors`; `apiClient`. 【F:src/lib/queries/admin.ts†L61-L70】 |
| `src/lib/queries/admin.ts` | `useAdminAdvisorDetail` | Client hook | Fetches a single advisor profile by id. | `AdminAdvisorDetailPage`. | GET `/admin/advisors/{id}`. 【F:src/lib/queries/admin.ts†L143-L151】 |
| `src/lib/queries/admin.ts` | `useAdminAdvisorSenders` | Client hook | Fetches senders assigned to an advisor. | `AdminAdvisorDetailPage` sender table. | GET `/admin/advisors/{id}/senders`. 【F:src/lib/queries/admin.ts†L154-L165】 |
| `src/lib/queries/admin.ts` | `useAdminUpdateAdvisor` | Mutation hook | Updates advisor fields (activity/blocked/etc.); invalidates related queries. | Buttons in admin list + detail pages. | PATCH `/admin/advisors/{id}`; React Query cache. 【F:src/lib/queries/admin.ts†L167-L185】 |
| `src/lib/queries/admin.ts` | `useAdminAssignSender` | Mutation hook | Assigns a sender email to an advisor; refreshes assignments/overview. | Form in `AdminAdvisorDetailPage`. | POST `/admin/advisors/{id}/assign-sender`; cache invalidations. 【F:src/lib/queries/admin.ts†L187-L205】 |
| `src/lib/queries/admin.ts` | `useAiProofSetting` / `useUpdateAiProofSetting` | Client hooks | Read/write global AI proof advisor toggle. | Admin AI proof settings page. | GET/POST `/admin/settings/ai-proof`. 【F:src/lib/queries/admin.ts†L73-L99】 |
| `src/app/admin/advisors/page.tsx` | Admin advisors index | UI page | Shows workload overview table and advisor directory; toggles active/blocked; links to detail. | Accessed via admin navigation. | `useAdminAdvisorsOverview`, `useAdminAdvisorsList`, `useAdminUpdateAdvisor`. 【F:src/app/admin/advisors/page.tsx†L12-L137】 |
| `src/app/admin/advisors/[id]/page.tsx` | Admin advisor detail | UI page | Displays profile stats, toggles active/blocked, lists assigned senders, assigns new sender by email. | Routed from advisor directory. | `useAdminAdvisorDetail`, `useAdminAdvisorSenders`, `useAdminUpdateAdvisor`, `useAdminAssignSender`. 【F:src/app/admin/advisors/[id]/page.tsx†L18-L216】 |
| `src/app/sender/advisor/page.tsx` | Sender advisor page | UI page | Static explanation plus `MyAdvisorCard`. | Sender dashboard navigation. | `MyAdvisorCard`. 【F:src/app/sender/advisor/page.tsx†L5-L16】 |
| `src/components/sender/MyAdvisorCard.tsx` | `MyAdvisorCard` | UI component | Renders current advisor or empty state; shows workload counts, languages/specialties. | Used on sender advisor page. | `useMyAdvisor`; `AdvisorProfile` fields. 【F:src/components/sender/MyAdvisorCard.tsx†L6-L79】 |
| `src/lib/demoData.ts` | `demoAdvisorProfile` | Demo data | Sample advisor profile for demo mode. | `useMyAdvisor` demo branch; possibly other demo scenarios. | Type definitions from `AdvisorProfile`. 【F:src/lib/demoData.ts†L29-L41】 |
| `src/app/admin/settings/ai-proof/page.tsx` | Admin AI proof settings page | UI page | Toggles global AI proof advisor mode; messaging explains advisory nature. | Linked from admin navigation. | `useAiProofSetting`, `useUpdateAiProofSetting`. 【F:src/app/admin/settings/ai-proof/page.tsx†L5-L57】 |
| `src/components/layout/AdminShell.tsx` | `adminLinks` entry `/admin/advisors` | Navigation | Adds Advisors section (and AI proof) to admin sidebar. | Wraps admin routes. | `useAuthMe` for header; navigation only. 【F:src/components/layout/AdminShell.tsx†L9-L55】 |

_No other references to “advisor” (including variants) were found in this repository._

## 2. Data Model & Lifecycle

- **Data model observable from types**
  - Advisors are represented by `AdvisorProfile` with `id`, linked `user_id`, personal details, workload counters, subscription date, `is_active`, `blocked`, and optional `languages`/`specialties`. No direct relation fields for domains or capacity. 【F:src/types/api.ts†L155-L168】
  - Admin views use `AdminAdvisorSummary` (aggregated workload metrics) and `AdminAdvisorListItem` (directory entries with flags and workloads). 【F:src/types/api.ts†L170-L190】
  - `AdvisorSenderItem` models sender assignments with activity flag and timestamp. 【F:src/types/api.ts†L192-L197】
  - Roles: only `sender`, `admin`, `both`; no explicit advisor role, implying advisors are treated as admins or a separate concept not represented client-side. 【F:src/types/api.ts†L1-L11】
  - AI proof advisor toggle is modeled via `AiProofSetting`, distinct from human advisors. 【F:src/types/api.ts†L199-L204】

- **Lifecycle inferred from UI flows**
  - **Creation of advisor profiles**: No frontend forms or mutations exist to create advisors; profiles are assumed to come from backend provisioning or future admin tooling.
  - **Assignment to senders**: Sender view fetches `/me/advisor`; empty state displays “No advisor assigned yet,” implying backend may lazily assign or return null when unassigned. 【F:src/components/sender/MyAdvisorCard.tsx†L17-L23】
  - **Admin management**: Admin list/detail pages can toggle `is_active` and `blocked`, and assign senders to an advisor by email; creation/deletion is absent. 【F:src/app/admin/advisors/page.tsx†L18-L129】【F:src/app/admin/advisors/[id]/page.tsx†L56-L211】
  - **Re-assignment**: Admin detail page supports assigning additional senders; no explicit unassign or reassignment controls are present.
  - **Usage in proof review / AI**: AI proof advisor toggle controls automated risk analysis; human advisor data is not used in proof review UI beyond workload metrics. 【F:src/app/admin/settings/ai-proof/page.tsx†L18-L55】
  - **Escrow / mandates**: No escrow or payment component references advisors; impact on escrow lifecycle is unknown from this codebase.

## 3. API Surface (Advisor-Related)

| Method & Path | Defined via (frontend reference) | Purpose | Request payload | Response schema | Side effects / Notes |
| --- | --- | --- | --- | --- | --- |
| GET `/me/advisor` | `useMyAdvisor` (`src/lib/queries/sender.ts`) | Fetch current sender’s assigned advisor. | None. | `AdvisorProfile` or empty/null. 【F:src/lib/queries/sender.ts†L46-L58】 | Read-only; UI shows empty state when null. |
| GET `/admin/advisors/overview` | `useAdminAdvisorsOverview` (`src/lib/queries/admin.ts`) | Retrieve aggregated workload metrics per advisor. | None. | `AdminAdvisorSummary[]`. 【F:src/lib/queries/admin.ts†L49-L58】 | Read-only aggregation. |
| GET `/admin/advisors` | `useAdminAdvisorsList` (`src/lib/queries/admin.ts`) | List advisors with activity/blocked flags and workloads. | None. | `AdminAdvisorListItem[]`. 【F:src/lib/queries/admin.ts†L61-L70】 | Read-only listing. |
| GET `/admin/advisors/{id}` | `useAdminAdvisorDetail` (`src/lib/queries/admin.ts`) | Fetch single advisor profile. | None. | `AdvisorProfile`. 【F:src/lib/queries/admin.ts†L143-L151】 | Used for detail view and mutations. |
| GET `/admin/advisors/{id}/senders` | `useAdminAdvisorSenders` (`src/lib/queries/admin.ts`) | Fetch senders assigned to an advisor. | None. | `AdvisorSenderItem[]`. 【F:src/lib/queries/admin.ts†L154-L165】 | Read-only list; no pagination parameters. |
| PATCH `/admin/advisors/{id}` | `useAdminUpdateAdvisor` (`src/lib/queries/admin.ts`) | Update advisor fields (e.g., `is_active`, `blocked`, specialties, etc.). | Partial `AdvisorProfile`. | Updated advisor (type not enforced). 【F:src/lib/queries/admin.ts†L167-L185】 | Invalidates list/overview/detail caches. |
| POST `/admin/advisors/{id}/assign-sender` | `useAdminAssignSender` (`src/lib/queries/admin.ts`) | Assign sender to advisor by email. | `{ sender_email: string }`. | Not typed (assumed assignment record). 【F:src/lib/queries/admin.ts†L187-L205】 | Refreshes sender list and overview. No unassign endpoint. |
| GET `/admin/settings/ai-proof` | `useAiProofSetting` (`src/lib/queries/admin.ts`) | Fetch AI proof advisor toggle. | None. | `AiProofSetting`. 【F:src/lib/queries/admin.ts†L73-L82】 | Controls AI review mode, not human advisors. |
| POST `/admin/settings/ai-proof` | `useUpdateAiProofSetting` (`src/lib/queries/admin.ts`) | Update AI proof advisor toggle. | `{ bool_value: boolean }`. | Updated `AiProofSetting`. 【F:src/lib/queries/admin.ts†L85-L99】 | AI-only behavior. |

**Gaps for an admin UI:**
- Missing endpoints/hooks to create or delete advisor profiles.
- No endpoint to unassign or reassign senders explicitly; only additive assignment exists.
- No filters/pagination for advisor lists or sender lists; workload details per advisor are limited.
- No endpoint to retrieve advisor workloads (proof queues, open cases) beyond aggregate counts.

## 4. Authorization, Security & Invariants

- **Roles & scopes**: Only `sender`, `admin`, `both` roles are modeled; no advisor role. Admin navigation surfaces advisor management under admin-only shell, implying UI-level restriction but no dedicated scope. 【F:src/types/api.ts†L1-L11】【F:src/components/layout/AdminShell.tsx†L9-L55】
- **Sender access**: Senders can call `/me/advisor` via `useMyAdvisor`; no client-side scope guards beyond authentication. 【F:src/lib/queries/sender.ts†L46-L58】
- **Admin actions**: Toggling active/blocked and assigning senders are available from admin pages; the frontend assumes admin permissions but does not enforce role checks beyond navigation placement. 【F:src/app/admin/advisors/page.tsx†L18-L129】【F:src/app/admin/advisors/[id]/page.tsx†L56-L211】
- **Invariants**: UI assumes a single advisor per sender (card expects one object) and uses `is_active`/`blocked` flags for display; no frontend checks enforce uniqueness, activity before assignment, or domain/region matching.
- **AI advisor**: AI proof advisor toggle is admin-only and separate from human advisors; no escalation path or override logic is visible. 【F:src/app/admin/settings/ai-proof/page.tsx†L18-L55】
- **Audit/state machines**: No audit logging or state machine logic for advisors exists in this frontend; any invariants must be enforced by the backend.

## 5. Tests Coverage

- The repository contains no automated tests; advisor flows (assignment, inactivity handling, missing advisor cases, domain constraints, unassignment) are entirely **untested**.

## 6. Frontend Readiness (for “Advisor UI”)

- **Current capabilities**
  - Sender: Read-only retrieval and display of current advisor via `/me/advisor`; empty state when unassigned. 【F:src/components/sender/MyAdvisorCard.tsx†L6-L79】
  - Admin: Overview + directory with ability to toggle active/blocked and navigate to detail. 【F:src/app/admin/advisors/page.tsx†L12-L129】
  - Admin detail: View profile stats, assigned senders, assign additional senders by email, toggle activity/blocked status. No edit of names/contact or specialties beyond the generic PATCH hook. 【F:src/app/admin/advisors/[id]/page.tsx†L56-L211】
  - Admin setting: Toggle AI proof advisor (AI review mode), unrelated to human advisors. 【F:src/app/admin/settings/ai-proof/page.tsx†L18-L55】

- **Backend blockers / gaps for richer UI**
  - No create/update/delete endpoints for advisor profiles (names, specialties, contact info) beyond limited PATCH usage.
  - No unassign/reassign sender endpoints; workload redistribution cannot be triggered from UI.
  - No endpoints exposing advisor workloads (proof queues, escrows) for an “advisor workspace.”
  - Sender dashboard lacks messaging or interaction with advisors; only profile card exists.

## 7. Recommendations & Refactor Suggestions

- **Make the model explicit and consistent**
  - Introduce an `advisor` role or explicit advisor capability in `UserRole` and corresponding backend auth to separate advisors from admins. (Breaking: requires backend role/migration updates.) Files to touch once backend ready: `src/types/api.ts`, auth/UI guards.
  - Surface and enforce invariants server-side (one active advisor per sender, only active/unblocked advisors assignable, domain matching if applicable) and reflect them in frontend error handling. (Non-breaking if additive validation; breaking if schema changes.)
  - Extend `AdvisorProfile` to include capacity/skills/domain fields if assignment depends on them; ensure frontend displays constraints. (Breaking if schema changes.)

- **Extend API surface for admin tooling**
  - Add endpoints/hooks for creating/deleting advisors and updating profile fields (languages, specialties, contact info). Update or add hooks in `src/lib/queries/admin.ts` and corresponding admin pages. (Non-breaking additions; coordinate backend.)
  - Provide unassign/reassign endpoints for sender-advisor links and expose assignment history. Update detail page to support unassignment actions. (Non-breaking if additive.)
  - Add filtered/paginated advisor listings and per-advisor workload endpoints (proof queue, escrows). Update admin pages to consume new data. (Non-breaking additions.)

- **Frontend enhancements once backend supports changes**
  - Expand `src/app/admin/advisors` to include create/edit forms, search/filter controls, and workload visualizations; use new hooks for mutations/queries. (Non-breaking UI additions.)
  - Add sender-facing flows to request or change advisors and to message advisors; enforce state-aware rendering when advisor inactive/blocked. (Non-breaking if backed by new endpoints.)
  - Build an “advisor workspace” page (for advisors or admins impersonating advisors) to review assigned proofs/escrows; requires backend roles/endpoints. (Breaking for auth model if new role introduced.)

- **Security hardening**
  - Gate advisor management actions behind explicit admin/advisor scopes rather than implicit navigation; add client-side guards once roles are exposed. (Non-breaking client change assuming backend scopes.)
  - Ensure AI advisor toggle is clearly separated from human advisor permissions and cannot be toggled by senders. (Non-breaking clarification.)
