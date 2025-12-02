# Demo Mode Inventory

## Code paths

| File path | Symbol / pattern | Kind | Demo behavior | Used by | Notes / Potential future action |
| --- | --- | --- | --- | --- | --- |
| src/lib/config.ts | `NEXT_PUBLIC_DEMO_MODE`, `isDemoMode` | env/config helper | Reads env flag to decide demo mode. | All demo branches via `isDemoMode()` | Candidate central flag for consolidation. |
| src/lib/config.ts | `DEMO_ROLE_KEY`, `getDemoRole`, `setDemoRole`, `DemoRole` | helper/storage | Persist and read demo role (sender/admin) from `localStorage`. | Header toggle, `useAuthMe` fallback | Ensure only active in demo; consider default role handling. |
| src/lib/demoData.ts | `demoSenderUser`, `demoAdminUser` | mock-data | Mock auth users returned in demo mode. | `getDemoUserByRole`, `useAuthMe` demo branch | Could expand with richer metadata if needed. |
| src/lib/demoData.ts | `demoAdvisorProfile` | mock-data | Static advisor profile used instead of `/me/advisor`. | `useMyAdvisor` demo branch | Mentioned in advisor audit doc; review freshness. |
| src/lib/demoData.ts | `demoEscrows` | mock-data | Sample escrow list shared across sender/admin demo views. | `useSenderDashboard`, `useSenderEscrows`, `getDemoEscrowSummary` | Might add more states for realistic pagination. |
| src/lib/demoData.ts | `demoProofs` | mock-data | Sample proofs for dashboard and queue. | `useSenderDashboard`, `demoAdminProofQueue`, `getDemoEscrowSummary` | Expand with rejected proof example. |
| src/lib/demoData.ts | `demoPayments` | mock-data | Sample payments for sender dashboard summaries. | `useSenderDashboard`, `getDemoEscrowSummary` | Align currencies/amounts with escrows. |
| src/lib/demoData.ts | `demoSenderDashboard` | mock-data | Empty placeholder dashboard summary. | Not referenced currently | Legacy; clarify purpose or remove. |
| src/lib/demoData.ts | `demoAdminStats` | mock-data | Aggregated counts for admin dashboard. | `useAdminDashboard` demo branch | Recompute on proof changes if demo actions added. |
| src/lib/demoData.ts | `demoAdminProofQueue` | mock-data | Pending proofs mapped for admin review queue. | `useAdminProofReviewQueue` demo branch | Should stay synced with `demoProofs`. |
| src/lib/demoData.ts | `getDemoUserByRole` | helper | Returns demo user matching stored role. | `useAuthMe` demo branch | Keep roles aligned with header toggle. |
| src/lib/demoData.ts | `getDemoEscrowSummary` | helper | Builds summary for an escrow using mock data. | `useSenderEscrowSummary`, `useAdminEscrowSummary` | Shared logic; candidate for central demo data source. |
| src/lib/queries/sender.ts | `useMyAdvisor` | hook-branch | Returns `demoAdvisorProfile` when demo mode; otherwise `/me/advisor`. | Sender advisor page/cards | Clear demo latency simulated via timeout. |
| src/lib/queries/sender.ts | `useAuthMe` | hook-branch | In demo, returns role-based mock user after timeout instead of `/auth/me`. | Header user info, auth guard | Ensure token clearing doesn’t affect demo path. |
| src/lib/queries/sender.ts | `useSenderDashboard` | hook-branch | In demo, synthesizes dashboard sections from mock arrays instead of `/sender/dashboard`. | Sender dashboard page | Demo data currently small; could enrich. |
| src/lib/queries/sender.ts | `useSenderEscrows` | hook-branch | Demo branch slices `demoEscrows` with status filter and pagination; no API call. | Sender escrow list page | Pagination simulated in-memory; consider edge cases. |
| src/lib/queries/sender.ts | `useSenderEscrowSummary` | hook-branch | Uses `getDemoEscrowSummary` with timeout instead of `/escrows/{id}/summary`. | Sender escrow detail | Shares data with admin summary demo. |
| src/lib/queries/sender.ts | `useEscrowAction` (and `useMarkDelivered` / `useClientApprove` / `useClientReject` / `useCheckDeadline`) | hook-branch | Demo path resolves after timeout without API side effects. | Sender escrow actions | No state mutation; might need optimistic updates for realism. |
| src/lib/queries/sender.ts | `useCreateProof` | hook-branch | Demo branch fabricates proof object locally instead of POSTing; still invalidates queries. | ProofForm submissions | Generated data not persisted; consider syncing with demo arrays. |
| src/components/sender/ProofForm.tsx | `isDemoMode` upload path | UI toggle | In demo, simulates upload progress and returns fake file metadata before `useCreateProof`. | Proof submission form | Purely UI-level mock; warns to keep consistent with backend contract. |
| src/lib/queries/admin.ts | `useAdminDashboard` | hook-branch | Returns `demoAdminStats` after timeout instead of `/admin/dashboard`. | Admin dashboard | Stats static; may diverge from actions. |
| src/lib/queries/admin.ts | `useAdminProofReviewQueue` | hook-branch | Returns `demoAdminProofQueue` instead of `/admin/proofs/review-queue`. | Admin proof review list | Demo items derived from `demoProofs`. |
| src/lib/queries/admin.ts | `useAdminEscrowSummary` | hook-branch | Uses `getDemoEscrowSummary` on demo flag rather than admin endpoint. | Admin escrow detail | Shares mock data with sender view. |
| src/lib/queries/admin.ts | `useAdminApproveProof` / `useAdminRejectProof` | hook-branch | Demo branches resolve after timeout without calling backend. | Admin proof approval/rejection actions | No mutation of demo data; could add local updates. |
| src/components/layout/Header.tsx | Demo role switch (`isDemoMode`, `getDemoRole`, `setDemoRole`) | UI toggle | When demo mode, shows buttons to switch demo sender/admin; invalidates `authMe` and navigates. | Global layout header | Central UX for demo role; ensure hidden in production. |
| src/components/layout/DemoBanner.tsx | `isDemoMode` gate | UI toggle | Renders top banner warning when demo mode active. | Site layout where included | Simple visibility flag; ensure included on pages. |
| README.md | “Demo mode” section with `NEXT_PUBLIC_DEMO_MODE` | docs | Explains enabling demo mode and location of sample data. | Developer setup reference | Keep synced with actual behaviors. |
| docs/FRONTEND_API_USAGE.md | Demo mode notes | docs | States that demo mode returns static data and allows header role switching. | Developer onboarding | Update if demo wiring changes. |
| docs/ADVISORS_AUDIT.md | Mentions `demoAdvisorProfile` usage | docs | Documents advisor-related demo data and hook fallback. | Audit/reference | Keep aligned with demoData definitions. |

## Demo strategy summary

- **UI-only mocks**: Upload simulation in `src/components/sender/ProofForm.tsx` and role-switch/header/banner UI that simply toggles stored demo role without backend state. Most sender/admin mutation hooks resolve after timeouts without changing data (approval/rejection, escrow actions), effectively UI stubs.
- **Frontend bypasses backend with hard-coded data**: Query hooks like `useMyAdvisor`, `useAuthMe`, `useSenderDashboard`, `useSenderEscrows`, `useSenderEscrowSummary`, `useAdminDashboard`, `useAdminProofReviewQueue`, `useAdminEscrowSummary` return data from `src/lib/demoData.ts` or fabricated objects when `NEXT_PUBLIC_DEMO_MODE=true`.
- **Real API with fake DB**: None; the frontend does not point to a dedicated API demo environment today.
- **Other / legacy demo hacks**: `demoSenderDashboard` currently unused placeholder; in-memory actions in sender/admin hooks do not persist changes, so demo flows may not reflect interactions.

Overall, demo behavior is controlled by the single `isDemoMode()` flag sourced from `NEXT_PUBLIC_DEMO_MODE`, but branching is scattered across multiple hooks and components. When the flag is false, demo code paths are gated and do not execute, so production flows should bypass mock data; risk lies mainly in unused demo placeholders and lack of state updates in demo branches.
