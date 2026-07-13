# Snapshot
- 2026-07-13 [USER] Footer support contacts are approved beneath the copyright: `support@kilobot.app` opens email and `+60129499394 (Kwan)` opens the regular dialer.
- 2026-07-13 [CODE] Workflow editing is draft-first: graph changes, Cleanup, orientation, node edits, and template replacement remain local until the top-right Save is clicked.
- 2026-07-13 [CODE] Dirty workflow drafts show a background-free red Discard changes action with a trash icon and enabled pointer cursor plus a dark semantic-primary Save control; discarding restores the latest persisted graph without deleting it.
- 2026-07-13 [CODE] Discard changes also clears transient workflow selection/template state and requests the existing animated canvas fit so the restored saved graph fits the available screen.
- 2026-07-13 [CODE] Templates uses a 33.6rem maximum-width HoverCard beside Cleanup and presents Q&A, Real Estate, and E-commerce Product as fully clickable, keyboard-operable horizontal Cards with a trailing `Try now` arrow cue.
- 2026-07-13 [CODE] Every starter-template action edge has an intentional customer-routing condition label and detail specific to Q&A, property, or product intent; templates contain neither forced `sendText` nor redundant `answerQuestions` actions.
- 2026-07-13 [CODE] All templates include send file, booking, and escalation; Real Estate and E-commerce also include send image; property booking is explicitly a property viewing.
- 2026-07-13 [CODE] Applied starter templates use the standard automatic horizontal Cleanup layout with size-aware spacing, then fit the graph to the screen.
- 2026-07-13 [CODE] New template media nodes require the first workflow Save before images/files can be uploaded because uploads require persisted Convex node IDs.
- 2026-07-13 [CODE] Workflow Save uses one authenticated atomic Convex replacement mutation with stale-version protection, retained-node/media preservation, removed-node media cleanup, and service ownership checks.
- 2026-07-13 [CODE] Successful template-derived workflow Saves atomically update backend-only per-agent adoption and per-template unique-agent/save totals; template clicks, Discard changes, failed/stale Saves, and the frontend expose no usage data.
- 2026-07-13 [CODE] Leaving the workflow page with changes opens the shared unsaved-changes dialog; browser unload is also protected.
- 2026-07-13 [CODE] Workflow reminder and follow-up message selection is transactional: only Confirm commits the pending template/configuration; dismissal preserves the prior committed selection.
- 2026-07-13 [CODE] Workflow reminder and follow-up activation require configured messages and show success only after an actual off-to-on transition.
- 2026-07-13 [CODE] Editable booking lifecycle supports Scheduled, Completed, Cancelled, and No-show across inbox and calendar. Source commit: `e5ebd6f1`.
- 2026-07-12 [CODE] Combined Advanced Analytics uses one strict topics/sentiment/lead-temperature AI job per eligible conversation; workflow lead-status action is removed.
- 2026-07-12 [CODE] Admin token reporting uses permanent aggregate-backed usage totals; Free recurring allowance is 50 credits.
- 2026-07-11 [CODE] Public Website widget mobile viewport, keyboard, and input-lift work is integrated on `main`; design files live under `docs/superpowers/specs/2026-07-11-web-widget-mobile-*`.
- 2026-07-04 [CODE] Convex generated AI guidelines apply; Node v22 is mandatory; code files stay under 300 LOC.

# Decisions
- 2026-07-13 [USER] D284 ACTIVE: The shared site footer uses a compact stacked Support group beneath copyright with native `mailto:` and `tel:` actions; the phone action opens the regular dialer.
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
- 2026-07-13 [CODE] Implemented workflow drafts, atomic primary Save, transparent pointer-enabled Discard changes, unsaved-navigation protection, fully clickable automatically spaced starter-template cards without forced messages, explicit template conditions, backend-only saved-template adoption, and Apply-style inspector edits.
- 2026-07-13 [CODE] Added transactional Confirm behavior for reminder and follow-up message template selection.
- 2026-07-13 [CODE] Added reminder/follow-up activation guards and accurate activation success feedback.
- 2026-07-13 [CODE] Integrated editable booking lifecycle status controls.
- 2026-07-12 [CODE] Combined daily Advanced Analytics and removed Qualify leads workflow behavior.
- 2026-07-12 [CODE] Added aggregate-backed Admin token totals and reconciled the shared database.
- 2026-07-11 [CODE] Completed mobile Website widget viewport and input-lift work.

# Working set
- 2026-07-13 [CODE] Footer contacts: `src/components/SiteFooter.tsx`, `src/components/SiteFooter.test.ts`, `docs/superpowers/specs/2026-07-13-footer-support-contacts-design.md`.
- 2026-07-13 [CODE] Workflow drafts/templates: `src/pages/{WorkflowPage,useWorkflowDraft,workflowDraftPersistence}*`, `src/components/workflow/{WorkflowDraftActions,WorkflowTemplateHoverCard,workflowDraftModel,workflowTemplates,WorkflowToolbar,WorkflowCanvas,WorkflowInspectorForm}*`.
- 2026-07-13 [CODE] Atomic workflow Save/usage: `convex/{workflowDraftSave,workflowDraftValidation,workflowTemplateUsage,workflowTemplateUsageSchema}*`, `convex/schema.ts`, `convex/_generated/*`.
- 2026-07-13 [CODE] Workflow plan: `docs/superpowers/plans/2026-07-13-workflow-drafts-and-templates.md`.
- 2026-07-13 [CODE] Reset fit-view design/plan: `docs/superpowers/{specs,plans}/2026-07-13-workflow-reset-fit-view*.md`.
- 2026-07-13 [CODE] Discard/template interaction design/plan: `docs/superpowers/{specs,plans}/2026-07-13-workflow-discard-template-interactions*.md`.
- 2026-07-13 [CODE] Final discard/template refinement plan: `docs/superpowers/plans/2026-07-13-workflow-discard-template-refinement.md`.
- 2026-07-13 [CODE] Reminder/follow-up confirmation and activation: workflow automation setup/message modal components plus `convex/whatsappFollowUp*`.
- 2026-07-12 [CODE] Advanced Analytics: combined analytics workflow/Workpool modules and pricing copy.
- 2026-07-12 [CODE] Admin usage aggregates: `convex/{aggregates,triggers,adminUsageCost*}*`, `src/components/admin/*UsageCost*`.
- 2026-07-11 [CODE] Website widget: `public/widget/v1.js`, `src/components/channels/WebWidget*`, related specs/plans.

# Open questions
- 2026-07-10 [USER] UNCONFIRMED: Production/development Convex deployments still need the actual `ILMU_API_KEY` before a live Ilmu request can succeed.
- 2026-07-03 [USER] UNCONFIRMED: Actual Stripe price IDs for extra-credit packages remain pending.

# Receipts
- 2026-07-13 [CODE] Footer support contacts design: `docs/superpowers/specs/2026-07-13-footer-support-contacts-design.md`.
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
- 2026-07-13 [CODE] Workflow drafts/templates implementation plan: `docs/superpowers/plans/2026-07-13-workflow-drafts-and-templates.md`.
- 2026-07-13 [CODE] Reminder/follow-up transactional confirmation changes are present on `main` in commit `cdb641c6`.
- 2026-07-13 [CODE] Booking lifecycle integration source commit is `e5ebd6f1`.
- 2026-07-12 [CODE] Advanced Analytics design: `docs/superpowers/specs/2026-07-12-combined-advanced-analytics-design.md`.
