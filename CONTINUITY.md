# Snapshot
- 2026-06-26T00:00Z [USER] Goal: implement persistent Agent Workflow Builder for `/dashboard/:agentId/workflow`.
- 2026-06-26T00:00Z [USER] Success: direct sidebar Workflow item under Agent Setup; React Flow canvas with hover plus and dropdown; Convex persistence; one workflow per agent.
- 2026-06-26T00:00Z [USER] V1 stores graph structure and node display details only; runtime execution is out of scope.
- 2026-06-26T00:00Z [CODE] Convex guidance requires validators, indexed bounded reads, schema in `convex/schema.ts`, and auth-derived ownership checks.
- 2026-06-26T18:44+08:00 [USER] Add `Custom action` above `Close conversation`; each action should have a goal.
- 2026-06-26T18:49+08:00 [USER] Refine the default `Qualify leads` goal to match the hot/warm/cold lead classifier criteria.
- 2026-06-26T19:01+08:00 [USER] `Book appointment` should default its incoming condition to proceed when the user is very sure about service interest.
- 2026-06-26T19:09+08:00 [USER] Workflow inspector should split Condition into `Condition Label` and `Condition Detail`, with large `Condition` and `Actions` section titles.
- 2026-06-26T19:11+08:00 [USER] Workflow canvas should display only the condition label, not condition detail.
- 2026-06-26T19:13+08:00 [USER] Condition label pill should render in front of the dotted/edge line.
- 2026-06-26T19:14+08:00 [USER] Condition label pill should use Lucide `ReceiptText` icon to indicate condition.
- 2026-06-26T19:58+08:00 [USER] Workflow setup Save button should show a spinning animation while saving.
- 2026-06-26T20:04+08:00 [USER] Workflow canvas nodes should have a maximum width; node titles should be slightly smaller and semibold.

# Decisions
- 2026-06-26T00:00Z [USER] D001 ACTIVE: Workflow V1 is a persistent skeleton, not an execution engine.
- 2026-06-26T17:23+08:00 [USER] D002 SUPERSEDED: New agents no longer need default Start -> End workflows.
- 2026-06-26T17:23+08:00 [USER] D005 ACTIVE: New/lazy workflows default to the start node only; users add `Close conversation` when they need a terminal action.
- 2026-06-26T00:00Z [USER] D003 ACTIVE: Use existing `agents:manage` permission for Workflow V1.
- 2026-06-26T00:00Z [USER] D004 ACTIVE: Sidebar item is direct and placed immediately below Agent Setup.
- 2026-06-26T18:44+08:00 [USER] D006 ACTIVE: New workflow plus items are `Qualify leads`, `Book appointment`, `Custom action`, and `Close conversation` in that order; legacy node kinds may remain readable for existing graphs.
- 2026-06-26T18:44+08:00 [USER] D007 ACTIVE: Workflow action nodes (`Qualify leads`, `Book appointment`, `Custom action`) use editable Name, required Goal, and optional incoming Condition; `Close conversation` stays terminal-only.
- 2026-06-26T18:47+08:00 [CODE] D008 ACTIVE: Default action goals live in `shared/workflows.ts` descriptions; booking goal mirrors Auto Booking flow rules from `convex/chat/threads.ts`, lead goal mirrors hot/warm/cold classifier intent from `convex/chat/inboxActions.ts`.

# Done (recent)
- 2026-06-26T18:49+08:00 [CODE] Workflow action defaults milestone compressed: addable actions reordered; default goals added for `Qualify leads` and `Book appointment`; `Qualify leads` goal reflects hot/warm/cold criteria.
- 2026-06-26T18:57+08:00 [CODE] Workflow inspector milestone compressed: Goal textarea enlarged; Action Name label; Condition moved above action fields; custom action condition suggestions added; action fields left-aligned.
- 2026-06-26T19:01+08:00 [CODE] `Book appointment` now applies a shared default incoming condition when created from the workflow plus menu.
- 2026-06-26T19:11+08:00 [CODE] Workflow edge conditions now persist short `label` and optional `detail`; canvas displays only the condition `label`.
- 2026-06-26T19:14+08:00 [CODE] Workflow condition label pill renders above the edge line and includes Lucide `ReceiptText`.
- 2026-06-26T19:58+08:00 [CODE] Workflow inspector Save button now swaps the save icon for a spinning `Loader2` while `isSaving`.
- 2026-06-26T20:04+08:00 [CODE] Workflow node cards and auto-layout width now cap at 360px; node titles render `text-base font-semibold` and truncate inside the capped card.

# Working set
- 2026-06-26T17:29+08:00 [CODE] `convex/schema.ts`, `convex/agents.ts`, `convex/agentAccess.ts`, `convex/workflow*.ts`, `convex/workflow*.test.ts`, `convex/workflowReset.ts`.
- 2026-06-26T00:00Z [CODE] `shared/workflows.ts`, `src/pages/WorkflowPage.tsx`, `src/components/workflow/`, `src/main.tsx`, `src/components/app-sidebar.tsx`, `src/layouts/DashboardLayout.tsx`.

# Open questions
- 2026-06-26T00:00Z [USER] None for V1.

# Receipts
- 2026-06-26T00:00Z [TOOL] Initial workflow milestone receipts compressed: ledger created; pre-existing dirty worktree noted; Convex codegen/build required newer Node and then passed with bundled runtime.
- 2026-06-26T09:18Z [TOOL] Intermediate workflow test/typecheck receipts compressed: focused workflow Vitest and app TypeScript passed under Node v22.22.0 through node/edge deletion, connection handles, plus trigger, edge z-index, and action-kind changes.
- 2026-06-26T17:29+08:00 [TOOL] `bunx convex codegen` succeeded; workflow actions/workflows tests passed 11 tests; `bunx tsc -b` passed under Node 22.
- 2026-06-26T18:49+08:00 [TOOL] Workflow default-goal milestone: focused Convex workflow tests passed 11 tests; `bunx tsc -b` passed under Node 22.
- 2026-06-26T19:01+08:00 [TOOL] Read Convex guidelines before changing workflow mutation/tests; focused Convex workflow tests passed 11 tests; `bunx tsc -b` passed under Node 22.
- 2026-06-26T19:09+08:00 [TOOL] Read Convex guidelines before edge schema/API change; sandboxed `bunx convex codegen` failed on Sentry DNS and escalated rerun was rejected for external export risk; focused workflow tests passed; `bunx tsc -b` passed under Node 22.
- 2026-06-26T19:11+08:00 [TOOL] `bunx vitest run src/components/workflow/workflowFlowModel.test.ts` passed 3 tests; `bunx tsc -b` passed under Node 22.
- 2026-06-26T19:13+08:00 [TOOL] `bunx tsc -b` passed under Node 22 after raising condition label layer.
- 2026-06-26T19:14+08:00 [TOOL] `bunx tsc -b` passed under Node 22 after adding `ReceiptText` to condition label pill.
- 2026-06-26T19:58+08:00 [TOOL] `bunx tsc -b` passed under Node 22 after adding Save spinner.
- 2026-06-26T20:04+08:00 [TOOL] `bunx vitest run src/components/workflow/workflowLayout.test.ts` passed 2 tests; `bunx tsc -b` passed under Node v22.22.0 after node width/title updates.
