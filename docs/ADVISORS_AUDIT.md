# Advisors Audit

Comprehensive review of advisor-related functionality visible in this repository (frontend for Kobatela). Backend references are inferred from API contracts exposed to the UI; no backend source is present in this repo.

## 1. Inventory of Advisor-Related Code

| File | Symbol / Endpoint | Type | Short description | Inbound usage | Outbound dependencies |
| --- | --- | --- | --- | --- | --- |
| `src/types/api.ts` | `AdvisorProfile` | Schema/type | Pydantic-equivalent shape for advisor profile objects, including user linkage, workload stats, languages, specialties, and activity flag. | Referenced by sender/admin queries and UI components. | Backend endpoint `/me/advisor`; `useAdminAdvisors*` hooks; demo data. |
| `src/types/api.ts` | `AdminAdvisorSummary` | Schema/type | Summary row used for admin overview (active senders, open proofs, total cases). | `useAdminAdvisorsOverview` hook → `AdminAdvisorsPage`. | Backend endpoint `/admin/advisors/overview`. |
| `src/types/api.ts` | `AdminAdvisorListItem` | Schema/type | Detailed advisor directory item (contact, activity flag, workloads). | `useAdminAdvisorsList` hook → `AdminAdvisorsPage`. | Backend endpoint `/admin/advisors`. |
| `src/lib/queries/sender.ts` | `useMyAdvisor` | Client hook/service | Fetches current sender’s advisor profile; demo fallback returns sample profile. | `MyAdvisorCard`, `SenderAdvisorPage`. | GET `/me/advisor`; `apiClient`; `demoAdvisorProfile`. |
| `src/lib/queries/admin.ts` | `useAdminAdvisorsOverview` | Client hook/service | Retrieves admin-level advisor workload summary. | `AdminAdvisorsPage` overview table. | GET `/admin/advisors/overview`; `apiClient`. |
| `src/lib/queries/admin.ts` | `useAdminAdvisorsList` | Client hook/service | Retrieves advisor directory for admin view. | `AdminAdvisorsPage` directory cards. | GET `/admin/advisors`; `apiClient`. |
| `src/lib/queries/admin.ts` | `useAiProofSetting` / `useUpdateAiProofSetting` | Client hook/service | Reads/toggles global “AI Proof Advisor” flag. | `Admin AI Proof Settings` page. | GET/POST `/admin/settings/ai-proof`; React Query cache. |
| `src/app/admin/advisors/page.tsx` | Admin advisors page | UI page | Presents advisor workload overview and directory. | Linked from `AdminShell`; accessed by admins. | `useAdminAdvisorsOverview`, `useAdminAdvisorsList`. |
| `src/app/sender/advisor/page.tsx` | Sender advisor page | UI page | Static explanation and renders advisor card for current sender. | Sender dashboard navigation (implicit). | `MyAdvisorCard`. |
| `src/components/sender/MyAdvisorCard.tsx` | `MyAdvisorCard` | UI component | Displays assigned advisor details or loading/empty state. | Used in sender advisor page; can be reused elsewhere. | `useMyAdvisor`; data fields from `AdvisorProfile`. |
| `src/lib/demoData.ts` | `demoAdvisorProfile` | Demo data | Sample advisor profile used when frontend runs in demo mode. | `useMyAdvisor` demo branch. | Type definitions from `AdvisorProfile`. |
| `src/app/admin/settings/ai-proof/page.tsx` | Admin AI proof settings page | UI page | Toggle for AI proof advisor (AI review mode) messaging. | Linked from `AdminShell`. | `useAiProofSetting`, `useUpdateAiProofSetting`. |
| `src/components/layout/AdminShell.tsx` | `adminLinks` entry `'/admin/advisors'` | Navigation | Adds Advisors and AI proof settings to admin nav. | Wraps admin pages. | Depends on `useAuthMe` for header; navigation only. |

_No other references to “advisor” or related terms were found in this repository._

## 2. Data Model & Lifecycle

- **Data model observable from types**
  - `AdvisorProfile` carries `id`, `user_id`, personal info, `sender_managed`, `total_number_of_case_managed`, `subscribe_date`, `is_active`, optional `languages` and `specialties`.【F:src/types/api.ts†L155-L167】
  - `AdminAdvisorSummary` aggregates per-advisor workload metrics (active senders, open proofs, total cases).【F:src/types/api.ts†L169-L175】
  - `AdminAdvisorListItem` mirrors profile data with activity flag and workload counts.【F:src/types/api.ts†L177-L188】
  - No explicit roles/scopes for advisors exist in the type system; `UserRole` currently allows only `sender`, `admin`, or `both`, implying advisors may be modeled as admins or a future distinct role not yet represented.【F:src/types/api.ts†L1-L11】

- **Lifecycle inferred from UI flows**
  - **Creation of advisor profiles**: Not implemented in UI; no hooks or pages exist to create/update advisor profiles. Profiles are expected to be supplied by backend endpoints `/admin/advisors` and `/admin/advisors/overview`, suggesting creation happens elsewhere (backend admin tooling or seed scripts).
  - **Assignment to senders**: Sender view fetches `/me/advisor`; logic for assignment (random, round-robin, domain-based) is not exposed in the frontend. Empty state shows “No advisor assigned yet,” implying backend may lazily assign or return null.【F:src/components/sender/MyAdvisorCard.tsx†L17-L23】
  - **Re-assignment / status**: UI only reads `is_active` and workload metrics; no controls exist to reassign or deactivate advisors.
  - **Usage in proof review / AI**: Admin settings include an “AI Proof Advisor” toggle controlling AI review mode; this is separate from human advisors and only toggles backend AI processing flag.【F:src/app/admin/settings/ai-proof/page.tsx†L18-L55】 No flows couple human advisors to proof review in UI beyond workload metrics.
  - **Escrow / mandates**: No advisor linkage surfaced in escrow or payment components; assignment effect on escrow is unclear.

## 3. API Surface (Advisor-Related)

| Method & Path | Router file (frontend reference) | Purpose | Request payload | Response schema | Side effects / Notes |
| --- | --- | --- | --- | --- | --- |
| GET `/me/advisor` | `src/lib/queries/sender.ts` via `useMyAdvisor` | Fetch current sender’s assigned advisor profile. | None. | `AdvisorProfile` or empty/null (implied by UI).【F:src/lib/queries/sender.ts†L46-L58】 | Read-only; UI shows empty state if none. |
| GET `/admin/advisors/overview` | `src/lib/queries/admin.ts` via `useAdminAdvisorsOverview` | Retrieve workload summary per advisor for admin dashboard. | None. | `AdminAdvisorSummary[]`.【F:src/lib/queries/admin.ts†L47-L56】 | Read-only aggregation. |
| GET `/admin/advisors` | `src/lib/queries/admin.ts` via `useAdminAdvisorsList` | List advisor directory with activity status and workload counters. | None. | `AdminAdvisorListItem[]`.【F:src/lib/queries/admin.ts†L59-L68】 | Read-only listing. |
| GET `/admin/settings/ai-proof` | `src/lib/queries/admin.ts` via `useAiProofSetting` | Fetch AI proof advisor toggle state. | None. | `AiProofSetting`.【F:src/lib/queries/admin.ts†L71-L80】 | AI review mode, not tied to human advisor assignment. |
| POST `/admin/settings/ai-proof` | `src/lib/queries/admin.ts` via `useUpdateAiProofSetting` | Enable/disable AI proof advisor globally. | `{ bool_value: boolean }`. | Updated `AiProofSetting`.【F:src/lib/queries/admin.ts†L83-L97】 | Changes backend AI review behavior; no human advisor effect. |

**Gaps for admin UI:**
- No endpoints/hook coverage for creating, updating, or deactivating advisor profiles.
- No endpoint to link/unlink advisors to specific senders or view per-advisor workloads beyond aggregate counts.
- No pagination/filters for advisor listing; only simple list/overview.

## 4. Authorization, Security & Invariants

- **Roles & scopes**: Frontend type `UserRole` lacks an advisor-specific role; UI navigations treat advisor management as an admin-only area (links are under AdminShell).【F:src/components/layout/AdminShell.tsx†L9-L47】
- **Sender-side access**: Senders can call `/me/advisor` via `useMyAdvisor`; no scope enforcement visible client-side beyond authentication.
- **Invariants**: UI assumes at most one advisor per sender (single object returned) and uses `is_active` flag and workload counts as read-only attributes. No checks enforce activity, domain matching, or uniqueness at frontend level. Comments or enforcement are absent.
- **AI advisor toggle**: Treated as an admin-only setting; impact limited to AI proof scoring, not human advisor workflows.【F:src/app/admin/settings/ai-proof/page.tsx†L18-L55】
- **Audit/state machines**: No audit or state machine code for advisors exists in this repo; any guarantees must come from backend (not visible).

## 5. Tests Coverage

- No test suites are present in this repository; consequently, advisor flows (assignment, inactivity handling, missing advisor cases, domain constraints) are **untested**.

## 6. Frontend Readiness (for “Advisor UI”)

- **What the frontend can do today**:
  - Sender: Read-only retrieval and display of the currently assigned advisor via `/me/advisor`; shows empty state otherwise.【F:src/components/sender/MyAdvisorCard.tsx†L17-L78】
  - Admin: Read-only overview and list of advisors; no creation or editing controls.【F:src/app/admin/advisors/page.tsx†L5-L71】
  - Admin: Toggle AI proof advisor setting (AI review mode), unrelated to human advisors.【F:src/app/admin/settings/ai-proof/page.tsx†L18-L55】

- **Paths to integrate an “Advisor UI”**:
  - Admin UI currently lacks create/update/delete or assignment actions; backend support and new endpoints are required before UI can manage advisors or workloads beyond viewing metrics.
  - Sender dashboard lacks navigation to workload, chat, or proof review with advisors; only a static profile card exists.

## 7. Recommendations & Refactor Suggestions

**Make the model explicit and consistent**
- Introduce an `advisor` role or explicit relation in API types once backend supports it; update `UserRole` and advisor payloads accordingly. (Breaking: requires backend change; coordinate with migration introducing advisor role.)
- Add explicit constraints in backend (not in this repo) to ensure one active advisor per sender and only active advisors are assignable; surface errors to frontend via standardized responses.

**Extend API surface for admin tooling**
- Non-breaking additions: add admin endpoints/hooks for listing with filters/pagination, creating/updating advisor profiles, toggling activity, and viewing assigned sender lists. Update frontend queries and pages to consume them.
- Breaking changes: if changing assignment logic or data shapes, version endpoints or provide migrations (e.g., Alembic) to add unique constraints or assignment tables.

**Frontend enhancements once backend is ready**
- Add forms/components in `src/app/admin/advisors` for create/edit/deactivate advisors and view assigned senders; reuse React Query hooks for mutations.
- Add sender-side surfaces to request reassignment or view advisor workload status; guard with clear empty/error states.
- Integrate advisor data into proof review UI so admins/advisors can collaborate; ensure scopes differentiate advisor vs. admin capabilities.

**Security hardening**
- Ensure advisor-only actions (once implemented) are gated by dedicated scopes/roles, not sender scope; add client-side guards and backend enforcement.
- Expose `is_active` semantics in UI (disable assignment controls when inactive) to prevent accidental routing to inactive advisors.

