# Snapshot
- 2026-06-26T00:00Z [USER] Goal: implement persistent Agent Workflow Builder for `/dashboard/:agentId/workflow`.
- 2026-06-26T00:00Z [USER] Success: direct sidebar Workflow item under Agent Setup; React Flow canvas with hover plus and dropdown; Convex persistence; one workflow per agent.
- 2026-06-26T00:00Z [USER] V1 stores graph structure and node display details only; runtime execution is out of scope.
- 2026-06-26T00:00Z [CODE] Convex guidance requires validators, indexed bounded reads, schema in `convex/schema.ts`, and auth-derived ownership checks.
- 2026-06-26T18:44+08:00 [USER] Workflow refinement milestone compressed: action ordering/goals, booking condition defaults, condition label/detail split, front-layer condition pill with `ReceiptText`, Save spinner, and capped node cards.
- 2026-06-26T22:54+08:00 [USER] Agent Setup/Knowledge Base/templates UI milestone compressed: setup layout, Test column, Smart Escalate, prompt/template text, page padding, and Geist font updates.
- 2026-06-26T23:27+08:00 [USER] Workflow canvas should show Followups left of Message enters and Reminders left of Followups; first node has a switch and plus; requested background color refers to XYFlow `Background`, not node fill.
- 2026-06-27T03:17+08:00 [USER] SUPERSEDED: Workflow Reminders/Followups trigger builder should use progressive Who -> When -> How/message template -> estimated cost menus.
- 2026-06-27T12:36+08:00 [USER] Workflow Reminders/Followups default-node polish milestone compressed: visible animated React Flow edges, more spacing, Agent Setup-style controls, and clearer two-row cards.
- 2026-06-27T13:00+08:00 [USER] Workflow Reminders/Followups option picker milestone compressed: use centered dialog option cards and no visible radio buttons because selected styling is enough.
- 2026-06-27T22:45+08:00 [USER] Workflow controls milestone compressed: top-left 3-tab switcher for Message handling/Reminders/Followups, instant tab switching, separate flat stacked switcher, non-draggable tools above, red Reset icon+text, and condition pill text `If: {{label}}`.
- 2026-06-28 [USER] SUPERSEDES prior Followups node detail: Followups should have one visible `When to follow up` schedule node; a separate summary node should sit beside the Followups group to show a top view of the current system.
- 2026-06-28 [USER] Followups `Message content` should match Create Follow-up: stage 1 chooses same vs different messages; immediately after strategy selection, stage 2 lets users choose one template or different templates per follow-up and shows WhatsApp preview.
- 2026-06-28 [USER] Followups Summary should sit outside/right of the group, top-aligned beside Followups, update immediately, use solid display-only styling without visible canvas dots, title only `Summary`, no icon/footer controls, and no workflow node shadows.
- 2026-06-28 [USER] Followups workflow polish milestone: schedule dialog should label max count as attempts, give `Start after` more width and roomier spacing, and the Workflow left side should bring in the two Follow-ups page guide cards with matching appearance/functions.
- 2026-06-28T01:33+08:00 [USER] Followups `Select audiences` should match the old create-follow-up multiselect and show selected audience chips in the dropdown trigger.
- 2026-06-28T01:45+08:00 [USER] SUPERSEDES Summary right-side placement: Followups Summary should move left of the Followups workflow; guide book cards should live in the same canvas-style space below Summary.
- 2026-06-28T02:13+08:00 [USER] SUPERSEDES prior Followups mini-flow/backdrop: Follow-up should be one main white setup container; audience/schedule/message are setup sub-items; no colored follow-up backdrop.
- 2026-06-28T10:54+08:00 [USER] Followups Summary/Follow-up should swap places; Audience and Schedule controls should be embedded directly in the Follow-up container instead of click-to-select rows.
- 2026-06-28T12:18+08:00 [USER] Reminders should use the newer Followups setup language but focus only on count, timing, and message; reminders are sent only for booked appointments; no Reminders guides for now.
- 2026-06-28T12:33+08:00 [USER] Reminders card must not sit under the Workflow switcher; Message section needs more room; if reminder count is more than 1, `When to remind` must allow multiple selected timings.
- 2026-06-28T12:54+08:00 [USER] Reminders `When to remind` needs custom time entry; Message row overflow is from fixed card height, not automation canvas padding.
- 2026-06-29T01:57+08:00 [USER] Reminder timing final polish milestone compressed: one selected timing, no search, suggested-first menu, compact custom dialog, and rounded Confirm.
- 2026-06-29T13:12+08:00 [USER] Book appointment action should add a Services section that lists created Auto Booking services with detail links and toggles for AI booking eligibility.
- 2026-06-29T13:34+08:00 [USER] Workflow setup surfaces should use roomy dialogs instead of sheet/drawer layout, with enough spacing.

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
- 2026-06-28T10:54+08:00 [CODE] D012 ACTIVE: Workflow Followups tab renders a single draggable white `Follow-up` setup node on the left; Summary and Guides are supporting right-side nodes.
- 2026-06-28T12:18+08:00 [CODE] D013 ACTIVE: Workflow Reminders tab renders a draggable `Reminders` setup node plus display-only Summary; no guide node; scope is fixed to booked appointments.
- 2026-06-28T12:33+08:00 [CODE] D014 SUPERSEDED: Reminder timing was count-constrained with 2+ reminders selecting up to that many timing options.
- 2026-06-28T12:54+08:00 [CODE] D015 SUPERSEDED: Reminder timing previously used a custom `N minutes/hours/days before appointment` composer.
- 2026-06-28T22:40+08:00 [CODE] D016 SUPERSEDED: Reminder timing briefly used inline rows with one per-row timing `Select`.
- 2026-06-28T22:59+08:00 [CODE] D017 SUPERSEDED: Reminder timing rows briefly used separate amount and unit `Select` controls.
- 2026-06-28T23:02+08:00 [CODE] D018 SUPERSEDED: Reminder timing rows used a numeric amount input plus a controlled Radix Select unit dropdown.
- 2026-06-28T23:42+08:00 [CODE] D019 SUPERSEDED: Reminder timing rows briefly used separate amount input and unit Popover/Command controls.
- 2026-06-29T00:44+08:00 [CODE] D020 ACTIVE: Reminder timing rows use one combined Popover trigger showing `N unit`; the popover edits numeric amount and unit Select side by side, shows `before` outside the trigger, and keeps Followups-style dismissal.
- 2026-06-29T00:49+08:00 [CODE] D021 ACTIVE: Reminders are fixed to one reminder and one selected timing; the count picker, add button, and delete affordance are hidden for now.
- 2026-06-29T00:54+08:00 [CODE] D022 SUPERSEDED: Reminder timing used the shared `SearchableSelect` dropdown pattern from calendar time selection with `Suggested time` mapped to the one-day-before default.
- 2026-06-29T00:59+08:00 [CODE] D023 SUPERSEDED: Reminder timing dropdown initially showed four fixed options plus one final custom option; `3 hours before appointment` was the suggested default and custom opened a compact rounded amount/unit dialog.
- 2026-06-29T01:26+08:00 [CODE] D024 ACTIVE: Reminders setup node uses content-height sizing; no fixed minimum card height or flex filler.
- 2026-06-29T01:32+08:00 [CODE] D025 ACTIVE: Reminder timing dropdown labels omit `appointment`, sort by duration ascending, keep `Custom` untagged, and render the `Suggested` badge as dark green with white text beside `3 hours before`.
- 2026-06-29T01:39+08:00 [CODE] D026 ACTIVE: Custom reminder time dialog uses equal-width amount/unit controls; unit select trigger fills its half and explicitly closes on selection, Escape, or outside pointer.
- 2026-06-29T01:42+08:00 [CODE] D027 ACTIVE: Shared `SearchableSelect` supports hiding search; reminder timing menu sets `showSearch={false}` and has no reminder search placeholder.
- 2026-06-29T01:54+08:00 [CODE] D028 ACTIVE: Reminder timing menu pins the suggested option first while keeping other options duration-sorted; closed trigger hides the Suggested badge; custom dialog uses smaller amount input, non-modal unit dropdown, ghost Cancel, and `Confirm`.
- 2026-06-29T01:57+08:00 [CODE] D029 ACTIVE: Custom reminder dialog `Confirm` button is fully rounded.
- 2026-06-29T13:12+08:00 [CODE] D030 ACTIVE: Book appointment workflow service selection stores `allowedAutoBookingServiceIds`; unset means all current active services are allowed, saved arrays mean only selected services, and runtime booking service lists use the union across configured Book appointment nodes.
- 2026-06-29T13:34+08:00 [CODE] D031 ACTIVE: Shared workflow node setup uses a wide centered Dialog with scrollable body and footer save action instead of the right-side drawer.

# Done (recent)
- 2026-06-29T01:32+08:00 [CODE] Reminder timing dropdown now uses auto list height for the reminder select, duration-ascending option order, no `appointment` suffix in labels, untagged `Custom`, and a dark green Suggested badge beside `3 hours before`.
- 2026-06-29T01:39+08:00 [CODE] Custom reminder dialog now uses equal-width amount/unit fields and a full-width controlled unit select that closes on selection, Escape, or outside pointer.
- 2026-06-29T01:42+08:00 [CODE] Reminder timing menu now hides the search field while other `SearchableSelect` uses keep search by default.
- 2026-06-29T01:54+08:00 [CODE] Reminder timing menu now puts Suggested first, hides the Suggested badge in the closed trigger, gives rows more padding, and custom dialog uses smaller amount input, ghost Cancel, Confirm, more spacing, and non-modal unit menu.
- 2026-06-29T01:57+08:00 [CODE] Custom reminder dialog `Confirm` button now uses `rounded-full`.
- 2026-06-29T13:12+08:00 [CODE] Book appointment inspector now has a Services section; service selections persist on workflow nodes and filter Auto Booking services exposed to the AI runtime.
- 2026-06-29T13:34+08:00 [CODE] WorkflowInspector changed from animated side drawer to wide dialog; Condition and Actions use responsive roomy columns.

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
- 2026-06-29T01:32+08:00 [CODE] `src/components/ui/searchable-select.tsx`.
- 2026-06-29T01:54+08:00 [CODE] `src/components/workflow/WorkflowReminderTimingRow.tsx`.
- 2026-06-29T13:12+08:00 [CODE] `convex/workflowBookingServices.ts`, `convex/workflowBookingServices.test.ts`, `convex/schema.ts`, `convex/autoBooking.ts`, `src/components/workflow/WorkflowBookingServicesSection.tsx`, `src/components/workflow/WorkflowInspector.tsx`, `src/pages/WorkflowPage.tsx`.

# Open questions
- 2026-06-26T00:00Z [USER] None for V1.

# Receipts
- 2026-06-28T22:40+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b`, targeted `git diff --check`, LOC checks, and `curl -I http://127.0.0.1:5178/` passed after row-based Reminders timing controls.
- 2026-06-28T22:59+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b`, targeted `git diff --check`, LOC checks, and `curl -I http://127.0.0.1:5178/` passed after splitting Reminder timing rows into amount and unit selects.
- 2026-06-28T23:02+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b`, targeted `git diff --check`, `wc -l`, and `curl -I http://127.0.0.1:5178/` passed after changing Reminder amount to numeric input and tightening unit dropdown dismissal.
- 2026-06-28T23:42+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b`, targeted `git diff --check`, `wc -l`, and `curl -I http://127.0.0.1:5178/` passed after Reminders timing row sizing/dismissal polish.
- 2026-06-29T00:29+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b`, targeted `git diff --check`, `wc -l`, and `curl -I http://127.0.0.1:5178/` passed after compacting Reminders timing controls.
- 2026-06-29T00:31+08:00 [TOOL] Targeted `git diff --check`, `wc -l`, and `curl -I http://127.0.0.1:5178/` passed after making the Reminders timing delete button red.
- 2026-06-29T00:35+08:00 [TOOL] Targeted `git diff --check`, `wc -l`, and `curl -I http://127.0.0.1:5178/` passed after matching Reminders timing field padding to Number of reminders.
- 2026-06-29T00:41+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b`, targeted `git diff --check`, `wc -l`, and `curl -I http://127.0.0.1:5178/` passed after combining Reminder amount/unit into one dropdown trigger.
- 2026-06-29T00:44+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b`, targeted `git diff --check`, `wc -l`, and `curl -I http://127.0.0.1:5178/` passed after placing Reminder amount input and unit Select side by side inside the timing popover.
- 2026-06-29T00:49+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b`, targeted `git diff --check`, `wc -l`, and `curl -I http://127.0.0.1:5178/` passed after limiting Reminders to one reminder timing.
- 2026-06-29T00:54+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b`, targeted `git diff --check`, `wc -l`, and `curl -I http://127.0.0.1:5178/` passed after switching Reminder timing to the calendar-style searchable dropdown.
- 2026-06-29T00:59+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b`, targeted `git diff --check`, `wc -l`, and `curl -I http://127.0.0.1:5178/` passed after limiting Reminder timing to five choices and adding the custom timing dialog.
- 2026-06-29T01:26+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b`, targeted `git diff --check`, `wc -l`, and `curl -I http://127.0.0.1:5178/` passed after making the Reminders setup card content-height.
- 2026-06-29T01:32+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx --bun shadcn@latest docs badge popover dialog select button input` returned docs URLs; targeted `git diff --check`, trailing-whitespace scan, `wc -l`, and `curl -I http://127.0.0.1:5178/` passed after reminder dropdown label/order/badge/height polish. TypeScript skipped for narrow UI-only change per environment rule.
- 2026-06-29T01:39+08:00 [TOOL] Trailing-whitespace scan, `wc -l src/components/workflow/WorkflowReminderTimingRow.tsx`, and `curl -I http://127.0.0.1:5178/` passed after custom reminder dialog equal-width/unit-dismiss polish. TypeScript skipped for narrow UI-only change per environment rule.
- 2026-06-29T01:42+08:00 [TOOL] `rg` confirmed `Search reminder times...` removed; trailing-whitespace scan, `git diff --check -- src/components/ui/searchable-select.tsx`, `wc -l`, and `curl -I http://127.0.0.1:5178/` passed after hiding search in reminder timing menu. TypeScript skipped for narrow UI-only change per environment rule.
- 2026-06-29T01:54+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx --bun shadcn@latest docs select dialog button input badge popover` returned docs URLs after sandbox escalation; trailing-whitespace scan, `git diff --check -- src/components/ui/searchable-select.tsx`, `wc -l`, and `curl -I http://127.0.0.1:5178/` passed after reminder dropdown/dialog polish. TypeScript skipped for narrow UI-only change per environment rule.
- 2026-06-29T01:57+08:00 [TOOL] `rg` confirmed `Confirm` button class is `h-9 rounded-full`; trailing-whitespace scan, `wc -l src/components/workflow/WorkflowReminderTimingRow.tsx`, and `curl -I http://127.0.0.1:5178/` passed. TypeScript skipped for narrow UI-only change per environment rule.
- 2026-06-29T13:12+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen`, `bunx vitest run convex/workflowBookingServices.test.ts`, `bunx tsc -b`, `git diff --check`, and LOC checks passed after Book appointment Services selection.
- 2026-06-29T13:34+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx --bun shadcn@latest docs dialog button textarea input separator`, `bunx tsc -b`, `git diff --check -- src/components/workflow/WorkflowInspector.tsx`, and LOC check passed after switching WorkflowInspector to Dialog.
