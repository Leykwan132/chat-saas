# Snapshot
- 2026-06-26T00:00Z [USER] Goal: implement persistent Agent Workflow Builder for `/dashboard/:agentId/workflow`; V1 stores graph structure/display only and direct runtime execution was originally out of scope.
- 2026-06-26T00:00Z [CODE] Convex guidance requires validators, indexed bounded reads, schema in `convex/schema.ts`, and auth-derived ownership checks.
- 2026-06-27T22:45+08:00 [USER] Workflow UI milestone compressed: top-left mode switcher, non-draggable controls, roomy dialogs, edge condition pills, node add/delete/selection polish, and layout cleanup are established.
- 2026-06-28T12:18+08:00 [USER] Followups and Reminders workflow setup milestone compressed: Followups has setup/summary/guide behavior; Reminders are only for booked appointments and currently fixed to one reminder timing.
- 2026-06-29T13:12+08:00 [USER] Book appointment workflow action needs a Services section listing created Services with detail links and booking eligibility controls.
- 2026-06-29T14:40+08:00 [USER] Workflow plus menu includes Q&A, Qualify leads, Book appointment, Custom action, and Close conversation; Q&A answers from knowledge base.
- 2026-06-29T15:37+08:00 [USER] Model & Style UI keeps icons on field titles only, uses clearer option explanations, and closed select values stay side-by-side.
- 2026-06-29T16:06+08:00 [USER] Goal: clean-break Auto Booking into Services-backed appointment booking driven by direct-message workflow runtime context.
- 2026-06-29T16:06+08:00 [CODE] Services-backed appointment booking now uses `appointmentServices`, `appointmentBookingSessions`, workflow runtime context, and appointment booking modules.
- 2026-06-29T17:45+08:00 [CODE] WhatsApp AI replies normalize Markdown bold to WhatsApp single-asterisk bold before sending/persisting.
- 2026-06-29 [USER] Current goal: enrich AI-created booking calendar descriptions with customer details and customer interest so assigned agents know what to expect.
- 2026-06-29 [CODE] Now: AI booking create/update writes calendar descriptions with service interest, collected custom fields, customer contact/profile, channel, tags, lead temperature, and notes.
- 2026-06-29 [USER] Current goal: redesign clicked calendar event details with event title, `Confirm` tag, date/customer split, internal notes/description, customer details, and no default `Edit booking` action.
- 2026-06-29 [USER] Refinement: event detail should be larger/spacier, remove top-right cross and confirm label, use update/delete icons, avatar for team member, centered icon/data rows, and full edit via update.
- 2026-06-29 [USER] Refinement: update mode should keep the same event detail layout, turning display values into inputs and replacing Close with Save at the bottom.
- 2026-06-29 [USER] Current goal: continue polishing clicked calendar event details; the old description area should be named Summary for AI-generated customer background before the upcoming booked service.

# Decisions
- 2026-06-26T00:00Z [USER] D001 ACTIVE: Workflow V1 is a persistent skeleton; legacy action graph decisions before 2026-06-29 are compressed into Snapshot milestones.
- 2026-06-26T17:23+08:00 [USER] D005 ACTIVE: New/lazy workflows default to the start node only; users add `Close conversation` when they need a terminal action.
- 2026-06-26T00:00Z [USER] D003 ACTIVE: Use existing `agents:manage` permission for Workflow V1.
- 2026-06-26T20:45+08:00 [CODE] D010 ACTIVE: Agent Setup uses one global `Publish` action for dirty basic, routing, and escalation changes.
- 2026-06-26T22:34+08:00 [CODE] D011 ACTIVE: Agent Setup uses `AgentPlaygroundPanel mode="inline"` for `Test`.
- 2026-06-29T00:44+08:00 [CODE] D020 ACTIVE: Reminder timing rows use one combined Popover trigger showing `N unit`.
- 2026-06-29T00:49+08:00 [CODE] D021 ACTIVE: Reminders are fixed to one reminder and one selected timing.
- 2026-06-29T13:12+08:00 [CODE] D030 SUPERSEDED by D042: Book appointment workflow service selection used `allowedAutoBookingServiceIds`.
- 2026-06-29T13:34+08:00 [CODE] D031 ACTIVE: Shared workflow node setup uses a wide centered Dialog.
- 2026-06-29T14:40+08:00 [CODE] D033 ACTIVE: Workflow action menu order is `Q&A`, `Qualify leads`, `Book appointment`, `Custom action`, `Close conversation`.
- 2026-06-29T14:40+08:00 [CODE] D034 ACTIVE: Workflow action nodes use editable Name, required Goal, and optional incoming Condition; `Close conversation` stays terminal-only.
- 2026-06-29T14:48+08:00 [CODE] D035 ACTIVE: Q&A nodes default incoming edge condition to `Customer question`.
- 2026-06-29T14:57+08:00 [CODE] D038 ACTIVE: Persistent workflow node cards cap at 300px wide.
- 2026-06-29T15:02+08:00 [CODE] D040 ACTIVE: Workflow node dragging only updates position; explicit handles create connections.
- 2026-06-29T16:06+08:00 [CODE] D042 ACTIVE: Services-backed appointment booking uses `appointmentServices`, `appointmentBookingSessions`, `allowedAppointmentServiceIds`, and `appointmentServiceId`; legacy settings and `auto_booking` gates are removed.
- 2026-06-29T16:06+08:00 [CODE] D043 ACTIVE: Direct-message generation loads workflow nodes/edges and per-node allowed Services each turn; the model infers the active stage without persisted conversation stage.
- 2026-06-29T16:06+08:00 [CODE] D044 ACTIVE: `cancelBooking` cancels a confirmed appointment when no edit is active, but cancels only the edit session and preserves the event during an edit.
- 2026-06-29 [CODE] D045 ACTIVE: Knowledge-base results can semantically explain or map customer intent to listed Services, but only Services listed in workflow/booking runtime context are bookable.
- 2026-06-29 [CODE] D046 ACTIVE: Customer-facing WhatsApp AI replies must not use Markdown tables; use bullets instead, with a formatter backstop converting Markdown tables to bullet lists.
- 2026-06-29 [CODE] D047 ACTIVE: Availability schedule org membership checks apply only when accessing another user's schedule; a user can initialize/view their own schedule in a personal workspace.
- 2026-06-29 [CODE] D048 ACTIVE: Chat display treats WhatsApp single-asterisk emphasis as bold in inbox bubbles and playground Markdown.
- 2026-06-29 [CODE] D049 ACTIVE: AI-created appointment calendar descriptions are deterministic summaries of booked service, customer profile/contact, channel, lead metadata, and collected interest fields; no new AI summary is generated at booking time.

# Done (recent)
- 2026-06-29 [CODE] Booking prompt separates knowledge-base context from bookable Services, and WhatsApp reply formatting forbids Markdown tables while normalizing them to bullets.
- 2026-06-29 [CODE] Personal workspace users can initialize/view their own availability schedules without an organization.
- 2026-06-29 [CODE] Availability switches show loading toast while enabling/disabling and replace it with success/error.
- 2026-06-29 [CODE] Inbox and playground chat displays render `*text*` as bold to match WhatsApp.
- 2026-06-29 [CODE] AI-created booking calendar descriptions include customer details and interest/context fields for the assigned agent.
- 2026-06-29 [CODE] Clicked calendar event details are larger, use update/delete icons, hide default top close/status, show avatar team member, edit inline with bottom Save, and label AI booking context as Summary.
- 2026-06-29 [CODE] Calendar sidebar Services AI card below `Assigned to me` removed; `+ New Event` uses larger padding.

# Working set
- 2026-06-29 [CODE] `convex/calendarEvents.ts`, `convex/calendarEvents.test.ts`.
- 2026-06-29 [CODE] `src/components/inbox/InboxThreadMessages.tsx`, `src/components/TestChatWindow.tsx`, `src/lib/whatsappText.ts`, `src/lib/whatsappText.test.ts`.
- 2026-06-29 [CODE] `convex/leadRouting/schedules.ts`, `convex/leadRoutingSchedules.test.ts`.
- 2026-06-29 [CODE] `src/pages/SchedulePage.tsx`, `src/pages/ScheduleUserDetailPage.tsx`.
- 2026-06-29 [CODE] `convex/chat/workflowPrompt.ts`, `convex/chat/threads.ts`.
- 2026-06-29T16:36+08:00 [CODE] `convex/appointmentBooking/`, `convex/appointmentBookingSessionStatus.ts`, `convex/appointmentBookingFields.test.ts`, `convex/workflowAppointmentServices.ts`, `convex/workflowRuntimeContext.ts`.
- 2026-06-29T16:36+08:00 [CODE] `convex/chat/responseFormatting.ts`, `convex/chat/responseFormatting.test.ts`.
- 2026-06-29T16:06+08:00 [CODE] `src/pages/ServicesPage.tsx`, `src/pages/ServicePage.tsx`, `src/components/services/`, `src/lib/serviceForm.ts`, `src/lib/appointmentBookingSessionStatus.ts`.
- 2026-06-26T00:00Z [CODE] `shared/workflows.ts`, `src/pages/WorkflowPage.tsx`, `src/components/workflow/`.
- 2026-06-26T20:40+08:00 [CODE] `src/pages/InstructionsPage.tsx`, `src/components/AgentPlaygroundPanel.tsx`, `src/components/agent-setup/`.
- 2026-06-26T20:50+08:00 [CODE] `src/pages/KnowledgeBasePage.tsx`, `src/components/knowledge-base/`.
- 2026-06-29 [CODE] `src/pages/CalendarPage.tsx`, `src/components/calendar/CalendarEventDetailsDialog.tsx`, `src/components/calendar/CalendarEventDetailsBody.tsx`.

# Open questions
- 2026-06-29 [USER] UNCONFIRMED: Whether prompt-only guardrails are enough in production, or whether booking tools should also reject service IDs outside the current workflow-allowed set.

# Receipts
- 2026-06-29T15:02+08:00 [TOOL] `rg`, targeted `git diff --check`, `wc -l`, diff review, and `bunx tsc -b` passed after removing proximity auto-connect.
- 2026-06-29T15:11+08:00 [TOOL] `workflowLayout.test.ts`, `workflowEdgeRouting.test.ts`, `bunx tsc -b`, targeted `git diff --check`, and LOC checks passed after workflow cleanup adjustment.
- 2026-06-29T15:37+08:00 [TOOL] `git diff --check`, targeted `bunx eslint`, and LOC checks passed for Model & Style option polish; prior full TypeScript blocker was superseded by 2026-06-29T16:06+08:00.
- 2026-06-29T16:06+08:00 [TOOL] `bunx convex codegen`, `bunx tsc -b`, appointment/workflow vitests, auto-booking `rg`, `git diff --check`, and backend appointment LOC checks passed after Services refactor.
- 2026-06-29T16:18+08:00 [TOOL] `git diff --check`, targeted `bunx eslint`, and LOC checks passed after removing `Example:` from emoji helper lines.
- 2026-06-29T16:19+08:00 [TOOL] `git diff --check`, targeted `bunx eslint`, and LOC checks passed after selected-value layout adjustment.
- 2026-06-29T16:25+08:00 [TOOL] `git diff --check -- src/pages/KnowledgeBasePage.tsx` and LOC check passed; targeted eslint remains blocked by pre-existing `no-explicit-any` errors.
- 2026-06-29T16:36+08:00 [TOOL] `git diff --check -- convex/chat/threads.ts convex/chat/responseFormatting.ts`, targeted `rg`, and `wc -l` passed after single-asterisk chat guidance.
- 2026-06-29T17:45+08:00 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/chat/responseFormatting.test.ts && bunx tsc -b`, targeted `git diff --check`, and LOC checks passed after WhatsApp bold normalization.
- 2026-06-29 [TOOL] `git diff --check -- convex/chat/workflowPrompt.ts convex/chat/threads.ts`, `wc -l`, and targeted `rg` passed after booking/knowledge prompt boundary refinement. TypeScript skipped for prompt-only string changes.
- 2026-06-29 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/chat/responseFormatting.test.ts` passed after adding Markdown-table-to-bullets normalization.
- 2026-06-29 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/leadRoutingSchedules.test.ts`, targeted `git diff --check`, and LOC checks passed after personal availability auth fix; `convex/leadRouting/schedules.ts` remains pre-existing over 300 lines.
- 2026-06-29 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/pages/SchedulePage.tsx src/pages/ScheduleUserDetailPage.tsx`, targeted `git diff --check`, and LOC checks passed after availability switch loading toasts; touched pages remain pre-existing over 300 lines.
- 2026-06-29 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/whatsappText.test.ts`, `bunx eslint src/lib/whatsappText.ts src/lib/whatsappText.test.ts`, `bunx tsc -b`, targeted `git diff --check`, and LOC checks passed after WhatsApp bold display; full touched-component eslint is blocked by pre-existing hook/ts-ignore rules in `TestChatWindow.tsx` and `InboxThreadMessages.tsx`.
- 2026-06-29 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/calendarEvents.test.ts`, targeted `bunx eslint`, `git diff --check`, and LOC check passed after personal calendar customer selector fix; `convex/calendarEvents.ts` remains pre-existing over 300 lines.
- 2026-06-29 [TOOL] `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/appointmentBookingFields.test.ts`, targeted `bunx eslint`, `bunx tsc -b`, `git diff --check`, and LOC checks passed after enriching AI booking calendar descriptions.
- 2026-06-29 [TOOL] `bunx tsc -b`, targeted calendar detail `bunx eslint`, `git diff --check`, and new-file LOC checks passed; full targeted CalendarPage lint remains blocked by pre-existing React hook rule errors around timezone/search-param effects and `Date.now`; dev server started at `http://127.0.0.1:5178/`.
- 2026-06-29 [TOOL] `bunx tsc -b`, targeted calendar detail `bunx eslint`, and `git diff --check` passed after spacing/action/avatar refinement; `bunx eslint src/pages/CalendarPage.tsx` remains blocked by the same pre-existing React hook rule errors.
- 2026-06-29 [TOOL] `bunx tsc -b`, targeted calendar detail `bunx eslint`, `git diff --check`, and calendar detail LOC checks passed after inline edit-mode layout; `CalendarPage.tsx` still has pre-existing full-file lint blockers.
- 2026-06-29 [TOOL] `git diff --check -- src/pages/CalendarPage.tsx` passed after Calendar sidebar card/button adjustment; `source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/pages/CalendarPage.tsx` remains blocked by pre-existing React hook rule errors at 808, 818, and 960.
- 2026-06-29 [TOOL] `git diff --check`, Node 22 targeted `bunx eslint`, and LOC checks passed after renaming calendar event detail Description copy to Summary.
