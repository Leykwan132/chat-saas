# Snapshot
- 2026-06-26T00:00Z [USER] Goal: implement persistent Agent Workflow Builder for `/dashboard/:agentId/workflow`.
- 2026-06-26T00:00Z [USER] Success: direct sidebar Workflow item under Agent Setup; React Flow canvas with hover plus and dropdown; Convex persistence; one workflow per agent.
- 2026-06-26T00:00Z [USER] V1 stores graph structure and node display details only; runtime execution is out of scope.
- 2026-06-26T00:00Z [CODE] Convex guidance requires validators, indexed bounded reads, schema in `convex/schema.ts`, and auth-derived ownership checks.
- 2026-06-26T18:44+08:00 [USER] Workflow refinement milestone compressed: action ordering/goals, booking condition defaults, condition label/detail split, front-layer condition pill with `ReceiptText`, Save spinner, and capped node cards.
- 2026-06-26T20:40+08:00 [USER] Goal: rework Agent Setup basic layout with large left System Prompt, right configuration panels, and a closable Test drawer instead of always-visible playground.
- 2026-06-26T20:50+08:00 [USER] Goal: Knowledge Base should remove the playground and show storage limit on the right.
- 2026-06-26T22:07+08:00 [USER] Agent Setup polish milestone compressed: flatter page sections, Configuration header, Test beside Publish, prompt/control styling, dropdown triggers, shorter copy, and selected option typography.
- 2026-06-26T22:12+08:00 [USER] Replace Google Sans/Google Sans Flex usage with Geist.
- 2026-06-26T22:14+08:00 [USER] Update the General template system prompt to a cleaner Cartesia voice-assistant style.
- 2026-06-26T22:27+08:00 [USER] Agent Setup Smart Escalate milestone compressed: sits under `Automatic`, separate human escalation options removed, selected options semibold, and switch/description use two rows.
- 2026-06-26T22:33+08:00 [USER] Message templates pages should share the dashboard's horizontal padding with the rest of the app.
- 2026-06-26T22:34+08:00 [USER] Supersede Test drawer request: Agent Setup `Test` should reveal an inline in-page component instead of a right-side sheet.
- 2026-06-26T22:44+08:00 [USER] Agent templates should use the provided Cartesia voice-agent structure, remove `**` emphasis markers, and avoid all-caps section titles.
- 2026-06-26T22:51+08:00 [USER] Refine inline Test placement: it should occupy only the right-side Agent Setup column, not the middle/full-width page area.
- 2026-06-26T22:54+08:00 [USER] Refine Test placement again: opening Test should introduce a new right-side column/window instead of consuming existing settings-column space.

# Decisions
- 2026-06-26T00:00Z [USER] D001 ACTIVE: Workflow V1 is a persistent skeleton, not an execution engine.
- 2026-06-26T17:23+08:00 [USER] D002 SUPERSEDED: New agents no longer need default Start -> End workflows.
- 2026-06-26T17:23+08:00 [USER] D005 ACTIVE: New/lazy workflows default to the start node only; users add `Close conversation` when they need a terminal action.
- 2026-06-26T00:00Z [USER] D003 ACTIVE: Use existing `agents:manage` permission for Workflow V1.
- 2026-06-26T00:00Z [USER] D004 ACTIVE: Sidebar item is direct and placed immediately below Agent Setup.
- 2026-06-26T18:44+08:00 [USER] D006 ACTIVE: New workflow plus items are `Qualify leads`, `Book appointment`, `Custom action`, and `Close conversation` in that order; legacy node kinds may remain readable for existing graphs.
- 2026-06-26T18:44+08:00 [USER] D007 ACTIVE: Workflow action nodes (`Qualify leads`, `Book appointment`, `Custom action`) use editable Name, required Goal, and optional incoming Condition; `Close conversation` stays terminal-only.
- 2026-06-26T18:47+08:00 [CODE] D008 ACTIVE: Default action goals live in `shared/workflows.ts` descriptions; booking goal mirrors Auto Booking flow rules from `convex/chat/threads.ts`, lead goal mirrors hot/warm/cold classifier intent from `convex/chat/inboxActions.ts`.
- 2026-06-26T20:40+08:00 [CODE] D009 SUPERSEDED: Agent Setup used `AgentPlaygroundPanel mode="drawer"` for Test; existing aside mode remains available for other pages.
- 2026-06-26T20:45+08:00 [CODE] D010 ACTIVE: Agent Setup uses one global `Publish` action for dirty basic, routing, and escalation changes; per-panel save/reset controls are removed.
- 2026-06-26T22:34+08:00 [CODE] D011 ACTIVE: Agent Setup uses `AgentPlaygroundPanel mode="inline"` for `Test` as a third right-side `AgentSetupPanels` grid column; drawer mode remains available but is no longer used by `InstructionsPage`.

# Done (recent)
- 2026-06-26T22:24+08:00 [CODE] Agent Setup trigger/dropdown refinement compressed: `Reply mode` select, matched menu widths, shorter copy, no `[default]`, semibold selections, and Smart Escalate under reply mode.
- 2026-06-26T22:14+08:00 [CODE] Typography/template milestone compressed: app sans uses Geist while title remains `Gilda Display`; General template prompt follows Cartesia voice-assistant behavior and Convex blank fallback mirrors it.
- 2026-06-26T22:31+08:00 [CODE] `ModelPicker` trigger now forces `dark:bg-input/50` states so dark-mode model fields match other Agent Setup controls.
- 2026-06-26T22:33+08:00 [CODE] Message templates list/create/detail wrappers now rely on `DashboardLayout` horizontal padding instead of adding inner `px-4 md:px-6`.
- 2026-06-26T22:54+08:00 [CODE] Agent Setup `Test` now changes the setup grid from two columns to three columns and slides the tester in as the new rightmost column.
- 2026-06-26T22:44+08:00 [CODE] `src/lib/utils.ts` templates now use lowercase natural-language section titles and no `**` emphasis; `convex/agents.ts` blank fallback mirrors the Cartesia voice style compactly.
- 2026-06-26T22:45+08:00 [CODE] Workflow condition edge/pill clicks now select the target node so its inspector opens and node highlight follows the condition.

# Working set
- 2026-06-26T17:29+08:00 [CODE] `convex/schema.ts`, `convex/agents.ts`, `convex/agentAccess.ts`, `convex/workflow*.ts`, `convex/workflow*.test.ts`, `convex/workflowReset.ts`.
- 2026-06-26T00:00Z [CODE] `shared/workflows.ts`, `src/pages/WorkflowPage.tsx`, `src/components/workflow/`, `src/main.tsx`, `src/components/app-sidebar.tsx`, `src/layouts/DashboardLayout.tsx`.
- 2026-06-26T20:40+08:00 [CODE] `src/pages/InstructionsPage.tsx`, `src/components/AgentPlaygroundPanel.tsx`, `src/components/agent-setup/`.
- 2026-06-26T20:50+08:00 [CODE] `src/pages/KnowledgeBasePage.tsx`, `src/components/knowledge-base/KnowledgeBaseNavigation.tsx`, `src/components/knowledge-base/KnowledgeBaseStoragePanel.tsx`.
- 2026-06-26T22:12+08:00 [CODE] `index.html`, `src/index.css`, `tailwind.config.cjs`, `DESIGN.md`.
- 2026-06-26T22:14+08:00 [CODE] `src/lib/utils.ts`, `convex/agents.ts`.
- 2026-06-26T22:20+08:00 [CODE] `src/components/agent-setup/AgentSetupRoutingPanel.tsx`, `src/components/agent-setup/AgentSetupPanels.tsx`, `src/pages/InstructionsPage.tsx`.
- 2026-06-26T22:31+08:00 [CODE] `src/components/ModelPicker.tsx`.
- 2026-06-26T22:33+08:00 [CODE] `src/pages/TemplatesPage.tsx`, `src/pages/CreateTemplatePage.tsx`, `src/pages/TemplateDetailPage.tsx`.

# Open questions
- 2026-06-26T00:00Z [USER] None for V1.

# Receipts
- 2026-06-26T21:51+08:00 [TOOL] `bunx tsc -b` passed under Node 22 after System Prompt background tweak; `git diff --check` passed.
- 2026-06-26T21:52+08:00 [TOOL] `bunx tsc -b` passed under Node 22 after removing Agent Setup model helper text; `git diff --check` passed.
- 2026-06-26T21:54+08:00 [TOOL] `bunx tsc -b` passed under Node 22 after aligning right-side Agent Setup sections; `git diff --check` passed.
- 2026-06-26T21:56+08:00 [TOOL] `bunx tsc -b` passed under Node 22 after Agent Setup option border/padding updates; `git diff --check` passed.
- 2026-06-26T21:58+08:00 [TOOL] `bunx tsc -b` passed under Node 22 after System Prompt auto-height update; `git diff --check` passed.
- 2026-06-26T22:01+08:00 [TOOL] `bunx tsc -b` passed under Node 22 after Template Library/select description polish; `git diff --check` passed.
- 2026-06-26T22:04+08:00 [TOOL] `git diff --check` returned clean after style option typography update; no TypeScript check run because this was a small class-only UI change.
- 2026-06-26T22:04+08:00 [TOOL] `bunx tsc -b` passed under Node 22 after Trigger dropdown conversion; `git diff --check` passed.
- 2026-06-26T22:05+08:00 [TOOL] `bunx tsc -b` passed under Node 22 after dropdown width alignment; `git diff --check` passed.
- 2026-06-26T22:07+08:00 [TOOL] `bunx tsc -b` passed under Node 22 after dropdown copy/font updates; `git diff --check` passed.
- 2026-06-26T22:12+08:00 [TOOL] `rg` found no remaining Google Sans references in `index.html`, `src`, `tailwind.config.cjs`, or `DESIGN.md`; `git diff --check` passed after Geist font swap. Full TypeScript check not run because this was a small static font-token/doc change.
- 2026-06-26T22:14+08:00 [TOOL] `rg` confirmed old General-template wording is gone; `wc -l` confirmed touched code files stay under 300 LOC; `git diff --check` passed. Full TypeScript check not run because this was a static string change.
- 2026-06-26T22:20+08:00 [TOOL] `bunx tsc -b` passed under Node 22 after moving Smart Escalate into Triggers; `git diff --check` passed.
- 2026-06-26T22:24+08:00 [TOOL] `rg` confirmed selected Agent Setup option labels now use `font-semibold`; `git diff --check` passed. Full TypeScript check not run because this was a class-only UI change.
- 2026-06-26T22:27+08:00 [TOOL] `git diff --check` passed after Smart Escalate two-row layout change; full TypeScript check not run because this was markup/classes only.
- 2026-06-26T22:31+08:00 [TOOL] `rg` confirmed `ModelPicker` dark bg overrides; `git diff --check` passed; `wc -l` showed `ModelPicker.tsx` at 295 LOC.
- 2026-06-26T22:33+08:00 [TOOL] `git diff --check` passed after removing extra page-level horizontal padding from message templates list/create/detail; full TypeScript check not run because this was a class-only UI change.
- 2026-06-26T22:34+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b` passed after inline Test change; `git diff --check` passed; `wc -l` showed touched code files under 300 LOC; dev server running at `http://127.0.0.1:5175/`.
- 2026-06-26T22:44+08:00 [TOOL] `rg` found no `**` or all-caps prompt headings in `src/lib/utils.ts` / `convex/agents.ts`; `wc -l` showed touched code files under 300 LOC; `git diff --check` passed. Full TypeScript check not run because this was a static string change.
- 2026-06-26T22:45+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b` passed after workflow condition click selection; `git diff --check` passed; `wc -l` showed touched code files at or under 300 LOC.
- 2026-06-26T22:51+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b` passed after moving inline Test into the right column; `git diff --check` passed; `wc -l` showed touched code files under 300 LOC.
- 2026-06-26T22:54+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b` passed after converting Test to a third sliding column; `git diff --check` passed; `wc -l` showed touched code files under 300 LOC.
