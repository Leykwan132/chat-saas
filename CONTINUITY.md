# Snapshot
- 2026-07-13 [USER] Goal is operational Workflow WhatsApp Reminders and Follow-up using separate Convex Workpools, durable runs, event hooks, reconciliation, cancellation, and history dialogs.
- 2026-07-13 [USER] Reminder and Follow-up cards require explicit Current & future or Future only scope; scope affects only the off-to-on reconciliation scan, never ongoing event eligibility.
- 2026-07-13 [USER] New bookings and eligible one-to-one WhatsApp outbounds schedule only while the corresponding saved automation is enabled; `activatedAt` is not an eligibility gate.
- 2026-07-13 [CODE] Reminder/follow-up configuration is draft-first, versioned, atomically saved with stale-version rejection, and independently enabled.
- 2026-07-13 [CODE] Current & future enqueues bounded reconciliation; Future only performs no scan; all new-event hooks use saved enabled state without activation timestamps.
- 2026-07-13 [CODE] Separate Workpools persist every Work ID; workers revalidate revision, subject eligibility, channel, audience, attempts, and run state before sending.
- 2026-07-13 [CODE] Deactivation invalidates by revision, cancels reconciliation, and drains pending jobs in bounded batches; reschedules cancel and replace reminder jobs.
- 2026-07-13 [CODE] Reminder/follow-up History dialogs use authenticated agent-isolated queries and 25-record pagination.
- 2026-07-13 [TOOL] Implementation is isolated at `/private/tmp/chat-saas-workflow-automations` on `codex/workflow-automations`; codegen, production build, focused tests, lint, and diff checks pass under Node 22.
- 2026-07-13 [TOOL] Full Vitest has 515/519 passing; the four failures match the pre-implementation baseline (`whatsappFollowUp`, `creditPeriodPool`, `agentUsage`, `agentTemplateKeys`).
- 2026-07-13 [CODE] Convex generated AI guidelines apply; Node v22 is mandatory; new workflow automation modules stay under 300 LOC.

# Decisions
- 2026-07-13 [USER] D289 ACTIVE: Reminder and Follow-up ongoing event hooks depend on saved enabled state and eligibility only; `activatedAt` is never compared, and Future only means no reconciliation scan.
- 2026-07-13 [USER] D288 ACTIVE: Reminder and Follow-up are independent draft-first configurations with required Current & future or Future only scope, separate Workpools, durable Work IDs/runs, bounded cancellation, and separate paginated history dialogs.
- 2026-07-13 [USER] D287 ACTIVE: The new support control appears beside dark mode only in authenticated dashboard and workspace headers, not public, blog, or legal headers.
- 2026-07-13 [USER] D286 ACTIVE: Direct email and regular-dialer phone details live immediately below the Contact our team card in the right contact-page column.
- 2026-07-13 [USER] D285 SUPERSEDED by D286: Direct email and phone details lived below the contact page's Enterprise/demo/support introduction.
- 2026-07-13 [USER] D284 SUPERSEDED by D285: The shared site footer used a compact stacked Support group beneath copyright with native `mailto:` and `tel:` actions.
- 2026-07-13 [USER] D283 ACTIVE: Discard changes keeps red text/icon but has no background in any state and shows a pointer while enabled; starter templates remove forced `sendText` actions and use the standard size-aware horizontal layout.
- 2026-07-13 [USER] D282 ACTIVE: Dirty workflow drafts use destructive red `Discard changes` with a trash icon; entire template cards apply instantly by pointer or keyboard and show a trailing `Try now` arrow cue; every template action uses a deliberate customer-intent condition label/detail.
- 2026-07-13 [USER] D281 ACTIVE: Reset restores the saved workflow and fits the restored graph to the screen at the appropriate zoom by reusing the existing animated canvas fit behavior.
- 2026-07-13 [USER] D280 ACTIVE: The workflow template HoverCard maximum width is reduced exactly 20%, from 42rem to 33.6rem, while retaining the three-card horizontal layout.
- 2026-07-13 [USER] D279 SUPERSEDED in card interaction/copy by D282: Workflow template adoption remains backend-only and is recorded on successful Save, not template click; the picker shows no usage data and keeps the narrower width.
- 2026-07-13 [USER] D278 SUPERSEDED by D279: Workflow template choices render as cards in a left-to-right orientation; the dirty-state Save action uses a dark primary treatment distinct from toolbar ghost actions.
- 2026-07-13 [USER] D277 SUPERSEDED in send-text behavior by D283: Workflow templates remain Q&A, Real Estate, and E-commerce Product; no template contains `answerQuestions`, all support files/booking/escalation, Real Estate includes property-viewing booking, and Real Estate/E-commerce include images.
- 2026-07-13 [USER] D276 ACTIVE: Workflow Reminders and Workflow Follow-up show success only when their switch actually turns on; blocked attempts and turning off remain toast-free.
- 2026-07-13 [USER] D275 ACTIVE: Reminder timing menus keep preset values plus one `Custom` action; saved custom duration appears only in the closed trigger.
- 2026-07-13 [USER] D274 ACTIVE: Follow-up message selection commits strategy and required templates only through Confirm; unconfirmed dismissal preserves prior configuration.
- 2026-07-13 [USER] D273 ACTIVE: Reminder-message selection is modal-local until explicit Confirm.
- 2026-07-13 [USER] D272 ACTIVE: Reminder/follow-up activation remains off without required messages and shows `You need to select a message first.`
- 2026-07-13 [USER] D271 ACTIVE: Appointment lifecycle includes Scheduled, Completed, Cancelled, and No-show.
- 2026-07-12 [USER] D243 ACTIVE: `updateLeadsStatus` is removed from workflow types, validators, catalog, prompts, tests, and landing mock.
- 2026-07-12 [USER] D242 ACTIVE: Advanced Analytics uses one fixed-schema request per conversation through a serial retrying Workpool on the required daily schedule.
- 2026-07-12 [USER] D241 ACTIVE: Free grants 50 credits on the next new/reset credit period; existing in-cycle balances stay unchanged.
- 2026-07-10 [USER] D235 ACTIVE: Workflow media matches are backend-authoritative and send configured assets/text without rewriting.
- 2026-07-10 [USER] D234 ACTIVE: Structured workflow planning is pinned to `deepseek/deepseek-v4-flash`.
- 2026-07-10 [USER] D232 ACTIVE: `ilmu-mini-v3.3` is the only Free model; all other enabled models require Starter+.

# Done (recent)
- 2026-07-13 [CODE] Implemented separate reminder/follow-up Workpools, durable runs/timers/operations, reconciliation, cancellation, and reusable WhatsApp sending.
- 2026-07-13 [CODE] Added booking/reschedule/status and WhatsApp inbound/outbound hooks with deduplication, one timer per conversation, source exclusions, and lead/tag eligibility.
- 2026-07-13 [CODE] Added exact Apply to card choices, activation guards, draft Save/Reset integration, stale-save protection, and separate History dialogs.
- 2026-07-13 [CODE] Refactored the existing standalone follow-up sender to reuse the shared WhatsApp template sender without changing its rule behavior.
- 2026-07-13 [CODE] Implemented workflow drafts/templates, transactional message selection, and editable appointment lifecycle controls.
- 2026-07-13 [CODE] Added authenticated header support and direct contact placement.
- 2026-07-12 [CODE] Combined daily Advanced Analytics and removed Qualify leads workflow behavior.

# Working set
- 2026-07-13 [USER] Workflow automation implementation: `src/components/workflow/*Automation*`, `src/pages/{useWorkflowDraft,workflowDraftPersistence}*`, `convex/workflow*Automation*`, booking/message hooks, schema/config, and focused tests.
- 2026-07-13 [CODE] Dashboard support HoverCard: `docs/superpowers/{specs,plans}/2026-07-13-dashboard-support-hover-card*`, `src/components/SupportHoverCard*`, `src/layouts/DashboardLayout.tsx`, `src/pages/WorkspacePage.tsx`.
- 2026-07-13 [CODE] Contact-page direct support: `src/components/contact/DirectContactDetails.tsx`, `src/pages/ContactPage*`, `src/components/SiteFooter*`.
- 2026-07-13 [CODE] Workflow drafts/templates: `src/pages/{WorkflowPage,useWorkflowDraft,workflowDraftPersistence}*`, `src/components/workflow/{WorkflowDraftActions,WorkflowTemplateHoverCard,workflowDraftModel,workflowTemplates,WorkflowToolbar,WorkflowCanvas,WorkflowInspectorForm}*`.
- 2026-07-13 [CODE] Atomic workflow Save/usage: `convex/{workflowDraftSave,workflowDraftValidation,workflowTemplateUsage,workflowTemplateUsageSchema}*`, `convex/schema.ts`, `convex/_generated/*`.
- 2026-07-13 [CODE] Workflow plan: `docs/superpowers/plans/2026-07-13-workflow-drafts-and-templates.md`.
- 2026-07-13 [CODE] Reset fit-view design/plan: `docs/superpowers/{specs,plans}/2026-07-13-workflow-reset-fit-view*.md`.
- 2026-07-13 [CODE] Discard/template interaction design/plan: `docs/superpowers/{specs,plans}/2026-07-13-workflow-discard-template-interactions*.md`.
- 2026-07-13 [CODE] Final discard/template refinement plan: `docs/superpowers/plans/2026-07-13-workflow-discard-template-refinement.md`.
- 2026-07-13 [CODE] Reminder/follow-up confirmation and activation: workflow automation setup/message modal components plus `convex/whatsappFollowUp*`.
- 2026-07-12 [CODE] Advanced Analytics: combined analytics workflow/Workpool modules and pricing copy.
- 2026-07-12 [CODE] Admin usage aggregates: `convex/{aggregates,triggers,adminUsageCost*}*`, `src/components/admin/*UsageCost*`.

# Open questions
- 2026-07-10 [USER] UNCONFIRMED: Production/development Convex deployments still need the actual `ILMU_API_KEY` before a live Ilmu request can succeed.
- 2026-07-03 [USER] UNCONFIRMED: Actual Stripe price IDs for extra-credit packages remain pending.

# Receipts
- 2026-07-13 [TOOL] Workflow automations passed Convex codegen with server TypeScript, `bun run build`, targeted ESLint, `git diff --check`, and 41 focused automation/UI tests under Node v22.22.0.
- 2026-07-13 [TOOL] Full Vitest ran 519 tests: 515 passed; the four failures exactly match the pre-implementation baseline and are outside workflow automation scope.
- 2026-07-13 [TOOL] Isolated branch `codex/workflow-automations` created; 24 focused workflow files and 45 tests passed under Node v22.22.0 before implementation.
- 2026-07-13 [TOOL] Dashboard support HoverCard completed a verified red-green cycle; 3 focused tests, targeted ESLint, `git diff --check`, and touched-code LOC checks passed on Node 22. Full Vitest ran 497 tests: 493 passed and 4 unrelated existing Convex tests failed (`whatsappFollowUp`, `creditPeriodPool`, `agentUsage`, `agentTemplateKeys`).
- 2026-07-13 [CODE] Dashboard support HoverCard design committed as `284e7a82` after placeholder, consistency, scope, ambiguity, and diff checks.
- 2026-07-13 [TOOL] Below-card contact placement completed a verified red-green cycle; 4 focused tests, targeted ESLint, `git diff --check`, placement checks, and LOC checks passed on Node 22.
- 2026-07-13 [TOOL] Contact placement completed a verified red-green cycle; 4 focused tests, targeted ESLint, `git diff --check`, exact-target checks, and LOC checks passed on Node 22.
- 2026-07-13 [TOOL] Footer contacts completed a verified red-green cycle; 2 focused tests, targeted ESLint, `git diff --check`, exact-target checks, and LOC checks passed on Node 22.
- 2026-07-13 [TOOL] Final discard/template refinement completed verified red-green cycles for transparent pointer styling, forced-message removal, and automatic spacing; 15 focused tests, targeted ESLint, full TypeScript build, `git diff --check`, and LOC checks passed on Node 22.
- 2026-07-13 [TOOL] Discard/template interactions completed three verified red-green cycles; 13 focused workflow tests, targeted ESLint, `git diff --check`, and touched-file LOC checks passed on Node 22.
- 2026-07-13 [TOOL] Reset fit-view completed a verified red-green cycle; 8 focused workflow tests, targeted ESLint, `git diff --check`, and touched-file LOC checks passed on Node 22.
- 2026-07-13 [TOOL] Exact 20% workflow template HoverCard width reduction passed the focused toolbar test, targeted ESLint, `git diff --check`, and LOC verification.
- 2026-07-13 [TOOL] Backend-only template usage and compact picker passed 15 focused tests, targeted ESLint, full TypeScript build, and Convex codegen/schema deployment.
- 2026-07-13 [TOOL] Template-card refinement passed 5 focused tests, targeted ESLint, full TypeScript build, `git diff --check`, and touched-file LOC checks.
- 2026-07-13 [TOOL] Workflow drafts/templates passed 17 focused tests across toolbar, inspector, draft model, template definitions, persistence mapping, atomic Convex Save, validation, and existing workflow behavior.
- 2026-07-13 [TOOL] Node 22 full `bunx tsc -b` and targeted ESLint passed for all workflow draft/template files.
- 2026-07-13 [TOOL] `bunx convex codegen` completed and generated the workflow draft Save API binding.
- 2026-07-13 [TOOL] Local app loaded without browser console warnings/errors; authenticated workflow visual interaction was unavailable in the signed-out local browser session.
- 2026-07-13 [TOOL] Focused atomic Save integration proved graph replacement plus stale-save rejection.
- 2026-07-13 [TOOL] All touched code files remain below 300 lines and `git diff --check` passed.
