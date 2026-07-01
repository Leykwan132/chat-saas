# Snapshot
- 2026-06-26T00:00Z [USER] Goal: implement persistent Agent Workflow Builder for `/dashboard/:agentId/workflow`; V1 stores graph structure/display only and direct runtime execution was originally out of scope.
- 2026-06-26T00:00Z [CODE] Convex guidance requires validators, indexed bounded reads, schema in `convex/schema.ts`, and auth-derived ownership checks.
- 2026-06-27T22:45+08:00 [USER] Workflow UI milestone compressed: top-left mode switcher, non-draggable controls, roomy dialogs, edge condition pills, node add/delete/selection polish, and layout cleanup are established.
- 2026-06-28T12:18+08:00 [USER] Followups and Reminders workflow setup milestone compressed: Followups has setup/summary/guide behavior; Reminders are only for booked appointments and currently fixed to one reminder timing.
- 2026-06-29T14:40+08:00 [USER] Workflow plus menu includes Q&A, Qualify leads, Book appointment, Custom action, and Close conversation; Q&A answers from knowledge base.
- 2026-06-29T15:37+08:00 [USER] Model & Style UI keeps icons on field titles only, uses clearer option explanations, and closed select values stay side-by-side.
- 2026-06-29T16:06+08:00 [USER] Goal: clean-break Auto Booking into Services-backed appointment booking driven by direct-message workflow runtime context.
- 2026-06-29T16:06+08:00 [CODE] Services-backed appointment booking now uses `appointmentServices`, `appointmentBookingSessions`, workflow runtime context, and appointment booking modules.
- 2026-06-29T17:45+08:00 [CODE] WhatsApp AI replies normalize Markdown bold to WhatsApp single-asterisk bold before sending/persisting.
- 2026-06-29 [USER] Current goal: enrich AI-created booking calendar descriptions with customer details and customer interest so assigned agents know what to expect.
- 2026-06-29 [CODE] Now: AI booking create/update writes calendar descriptions with service interest, collected custom fields, customer contact/profile, channel, tags, lead temperature, and notes.
- 2026-06-29 [USER] Calendar event detail milestone compressed: larger clicked-event details, no confirm/top-right close, update/delete icons, team avatar, edit-in-place update mode, and Summary for AI-generated customer background before service.
- 2026-06-29 [USER] Current goal: remove Follow-ups from the sidebar, move Broadcast and Message Templates out of Outreach, and remove the Outreach group.
- 2026-06-29 [USER] Current goal: remove the Assignment sidebar submenu as well.
- 2026-06-29T22:18+08:00 [USER] Current goal: review Analytics Usage / Credit usage because chart appears to stop at June 28 instead of showing June 29.
- 2026-06-29T22:18+08:00 [CODE] Finding: Credit usage daily buckets are UTC date keys and the UI formats those keys via local timezone, so `2026-06-29` renders as June 28 in US timezones.
- 2026-06-29T22:42+08:00 [USER] Goal: implement the long-term timezone-aware fix using Calendar/team timezone data.
- 2026-06-29T22:42+08:00 [CODE] Credit usage daily chart buckets now use active/selected team timezone and render date keys as calendar dates, not UTC-midnight timestamps.
- 2026-06-29T23:26+08:00 [USER] Goal: AI-booked appointments should mark the conversation itself as booked so booked chats can be filtered in Inbox.
- 2026-06-29T23:26+08:00 [CODE] Conversation status now includes `booked`; AI create/update booking sets it, AI cancellation clears it to `open`, and Inbox Booked filter recognizes status or active booking session.
- 2026-06-30T01:12+08:00 [USER] Goal: migrate Knowledge Base Send Media into Workflow as a node-owned `Send Media` action with user-authored conditions.
- 2026-06-30T01:12+08:00 [CODE] Now: Workflow exposes `Send Media`; uploads are tied to `workflowNodeId`; runtime sends media only through matching Send Media nodes; visible KB Send Media surface is removed.
- 2026-07-01T14:25+08:00 [USER] Current goal: WhatsApp templates support `@` parameters, bold text, preview chips, a template library, named Meta payloads, and prepared media IDs for PDF/image/video headers.
- 2026-07-01T22:27+08:00 [CODE] Now: Create Template uses `@` dropdown params, named examples, exact MIME validation, Text/Image/Video/PDF headers with per-asset persisted selections, library presets, Meta upload-session handles, post-submit media-ID preparation, and Template Detail has no tabs with analytics below the title plus component/media header editing via Meta template update.

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
- 2026-06-30T01:12+08:00 [CODE] D050 ACTIVE: Send Media is Workflow-owned using existing `sendImage` node kind, `workflowSendMedia` media purpose, optional `workflowNodeId`, and node-scoped `sendMedia` runtime tool.
- 2026-06-30T16:42+08:00 [CODE] D051 ACTIVE: Workflow media actions are split as `sendImage` = Send Photo/Video and `sendFile` = Send Files; Messenger always sends assets via `message.attachments`; WhatsApp multi photo/video sends carousel cards in valid 2-10 card batches while files remain document/file attachments; media sends emit structured logs and now use `sendMedia` tool results directly instead of requiring `[MEDIA:clientId]` markers in customer text.
- 2026-07-01T14:25+08:00 [CODE] D052 ACTIVE: WhatsApp template header media uses separate Meta flows: approval gets `header_handle` via `/{app-id}/uploads`, while send readiness uploads exact-MIME R2 media to `/{phone-number-id}/media` in a workpool and stores `mediaId`; no MIME fallback.

# Done (recent)
- 2026-06-30T15:16+08:00 [CODE] Workflow photo/video thumbnails now show bottom-left photo/video badges, and video thumbnails open the same fullscreen preview dialog with controls.
- 2026-07-01T09:58+08:00 [CODE] Create Template top section is unframed, with Template name, WhatsApp type, and category stacked as full-width one-line fields; all Create Template dropdowns now match Agent Setup select styling, including the nested Buttons Type dropdown; Template name and Button Text inputs use matching 48px sizing/padding; submit keeps selected media visible and hides media upload progress; Quick Reply preview buttons render a reply icon; Buttons render above Footer; language remains implicit English.
- 2026-07-01T01:05+08:00 [CODE] Message Templates category/status filter dropdown buttons use 48px rounded select styling with trigger-width dropdown content and grouped items.
- 2026-07-01T02:01+08:00 [CODE] WhatsApp template submission now converts R2 header media to Meta header handles via `/{app-id}/uploads` plus `/upload:<session>` binary upload before calling `/message_templates`; upload IDs are normalized and returned `h` handles are required.
- 2026-07-01T16:32+08:00 [CODE] WhatsApp template builder now supports registry-backed `@` parameters, named Meta examples, WhatsApp `*bold*`, known-parameter-only inline variable tooltips, Follow-up/Reminder/Broadcast presets, prepared media IDs for PDF/JPEG/JPG/PNG/MP4 headers, and line-tab detail editing.
- 2026-07-01T22:27+08:00 [CODE] Template Detail removed visible metadata and tabs, places the three analytics cards below the template title and above the editable Header section, and reuses Create Template header, footer, and buttons sections with matching skeletons.
- 2026-07-02 [CODE] Sidebar `Bookings` now contains Calendar, Availability, and Services; Channels sits under `AI Agent` directly below Knowledge Base.

# Working set
- 2026-06-30T01:12+08:00 [CODE] `shared/workflows.ts`, `convex/workflowValidators.ts`, `convex/schema.ts`.
- 2026-06-30T01:12+08:00 [CODE] `convex/workflowMedia.ts`, `convex/workflowMediaInternal.ts`, `convex/workflowMediaShared.ts`, `convex/workflowMediaDeletion.ts`, `convex/workflowRuntimeContext.ts`.
- 2026-06-30T15:08+08:00 [CODE] `convex/chat/threads.ts`, `convex/chat/workflowPrompt.ts`, `convex/chat/inbox.ts`, `convex/chat/inboxActions.ts`, `convex/chat/inboxMessageMapping.ts`, `convex/chat/channelSend.ts`, `convex/chat/channelSend.test.ts`.
- 2026-06-30T15:16+08:00 [CODE] `src/components/workflow/WorkflowSendMediaSection.tsx`, `WorkflowMediaUploader.tsx`, `WorkflowMediaGrid.tsx`, `WorkflowImagePreview.tsx`, `WorkflowMediaKindBadge.tsx`, `WorkflowLegacyMediaImport.tsx`.
- 2026-06-30T01:12+08:00 [CODE] `src/pages/WorkflowPage.tsx`, `src/pages/KnowledgeBasePage.tsx`, `src/components/knowledge-base/KnowledgeBaseNavigation.tsx`.
- 2026-06-30T01:57+08:00 [CODE] `src/components/workflow/WorkflowInspector.tsx`.
- 2026-06-30T02:17+08:00 [CODE] `src/components/workflow/WorkflowNode.tsx`, `WorkflowAutomationNode.tsx`, `WorkflowAutomationStepNode.tsx`.
- 2026-06-30T01:12+08:00 [CODE] `convex/workflowMedia.test.ts`, `convex/workflowMediaCleanup.test.ts`, `convex/workflowActions.test.ts`, `src/components/workflow/workflowCatalog.test.tsx`.
- 2026-07-01T14:25+08:00 [CODE] `src/pages/CreateTemplatePage.tsx`, `src/components/WhatsAppTemplatePreview.tsx`, `src/components/templates/*`.
- 2026-07-01T14:25+08:00 [CODE] `convex/schema.ts`, `convex/whatsappTemplates.ts`, `convex/whatsappTemplatesAction.ts`, `convex/whatsappTemplateUpdate.ts`, `convex/whatsappTemplateMediaPool.ts`, `convex/whatsappTemplateSendPayload.ts`, `convex/whatsappBroadcast.ts`, `convex/broadcastPool.ts`, `convex/followUpPool.ts`, `convex/media/r2Client.ts`.
- 2026-07-01T14:25+08:00 [CODE] `shared/whatsappTemplateMedia.ts`, `shared/whatsappTemplateParameters.ts`, and their Vitest tests.
- 2026-07-02 [CODE] `src/components/app-sidebar-nav.ts`, `src/components/app-sidebar.tsx`.

# Open questions
- 2026-06-29 [USER] UNCONFIRMED: Whether prompt-only guardrails are enough in production, or whether booking tools should also reject service IDs outside the current workflow-allowed set.

# Receipts
- 2026-06-30T12:42+08:00 [TOOL] Node 22 `bunx eslint src/components/workflow/WorkflowSendMediaSection.tsx`, LOC check, and trailing-whitespace `rg` passed after adding the media uploaded count.
- 2026-06-30T12:25+08:00 [TOOL] Node 22 targeted eslint for Messenger/Instagram connect components, `bunx tsc -b`, targeted `git diff --check`, and LOC checks passed.
- 2026-06-30T13:12+08:00 [TOOL] Node 22 `bunx eslint convex/chat/inboxMessageMapping.ts`, targeted `git diff --check`, and LOC check for `convex/chat/inboxMessageMapping.ts` passed after inbox attachment rendering; broader lint remains blocked by pre-existing `no-explicit-any`/`no-useless-escape` in `convex/chat/inbox.ts` and `convex/chat/threads.ts`.
- 2026-06-30T12:59+08:00 [TOOL] Node 22 `bunx eslint src/pages/WorkflowPage.tsx convex/workflowRuntimeContext.ts convex/chat/workflowPrompt.ts`, `bunx tsc -b`, targeted `git diff --check`, and LOC checks passed after node-data naming update; `WorkflowInspector.tsx` lint remains blocked by pre-existing `react-hooks/set-state-in-effect`.
- 2026-06-30T15:08+08:00 [TOOL] Node 22 `bunx convex codegen`, `bunx vitest run convex/chat/channelSend.test.ts convex/workflowMedia.test.ts convex/workflowActions.test.ts src/components/workflow/workflowCatalog.test.tsx`, `bunx tsc -b`, clean-file targeted eslint, `git diff --check`, and LOC checks passed after Send Photo/Video + Send Files split; `WorkflowInspector.tsx` lint remains blocked by pre-existing `react-hooks/set-state-in-effect`.
- 2026-06-30T15:16+08:00 [TOOL] Node 22 targeted eslint for workflow media preview/grid/uploader/badge components, `bunx tsc -b`, targeted `git diff --check`, and LOC checks passed after video preview + photo/video badge polish.
- 2026-06-30T15:32+08:00 [TOOL] Node 22 `bunx vitest run convex/chat/channelSend.test.ts convex/workflowMedia.test.ts convex/workflowActions.test.ts src/components/workflow/workflowCatalog.test.tsx`, targeted `bunx eslint convex/chat/channelSend.ts convex/chat/channelSend.test.ts`, `bunx tsc -b`, and targeted `git diff --check` passed after hardening WhatsApp carousel card payloads.
- 2026-06-30T15:35+08:00 [TOOL] Node 22 `bunx vitest run convex/chat/channelSend.test.ts`, targeted `bunx eslint convex/chat/channelSend.ts convex/chat/channelSend.test.ts`, `bunx tsc -b`, and targeted `git diff --check` passed after making Messenger asset sends always use `message.attachments`.
- 2026-06-30T15:57+08:00 [TOOL] Node 22 `bunx vitest run convex/chat/channelSend.test.ts convex/workflowMedia.test.ts convex/workflowActions.test.ts src/components/workflow/workflowCatalog.test.tsx`, targeted `bunx eslint convex/chat/channelSend.ts convex/chat/channelSend.test.ts convex/chat/mediaSendLogs.ts`, `bunx tsc -b`, targeted `git diff --check`, and LOC checks passed after adding structured media-send logs.
- 2026-06-30T16:42+08:00 [TOOL] Node 22 `bunx vitest run convex/chat/mediaToolResults.test.ts convex/chat/channelSend.test.ts convex/workflowMedia.test.ts convex/workflowActions.test.ts src/components/workflow/workflowCatalog.test.tsx`, targeted clean-file eslint, `bunx tsc -b`, targeted `git diff --check`, and LOC checks passed after moving media resolution from text markers to structured `sendMedia` tool results; full `threads.ts` lint still has known `any`/unused-arg errors only.
- 2026-06-30T17:20+08:00 [TOOL] Node 22 `bunx vitest run convex/chat/mediaToolResults.test.ts convex/chat/channelSend.test.ts`, targeted `bunx eslint convex/chat/mediaToolResults.ts convex/chat/mediaToolResults.test.ts convex/chat/inbox.ts convex/chat/threads.ts`, `bunx tsc -b`, and targeted `git diff --check` passed after robustifying media tool-result extraction and structured diagnostics.
- 2026-06-30T23:31+08:00 [TOOL] Removed temporary `[media-tool-results]` and `[sendMediaTool]` diagnostics; `rg`, Node 22 targeted `bunx eslint convex/chat/inbox.ts convex/chat/threads.ts`, and targeted `git diff --check` passed.
- 2026-07-01T09:58+08:00 [TOOL] Node 22 targeted `bunx eslint src/pages/CreateTemplatePage.tsx src/components/templates/CreateTemplateBasicsSection.tsx src/components/templates/createTemplateFormTypes.ts`, `bunx tsc -b`, targeted `git diff --check`, and `rg` for upload-progress UI copy passed after hiding media upload progress on submit; Node 22 targeted `bunx eslint src/pages/CreateTemplatePage.tsx` and targeted `git diff --check` passed after adding the Quick Reply preview icon.
- 2026-07-01T01:05+08:00 [TOOL] Node 22 `bunx tsc -b` and targeted `git diff --check` passed after Message Templates filter styling; `bunx eslint src/pages/TemplatesPage.tsx` remains blocked by pre-existing `no-explicit-any` at 129/376/400 and `react-hooks/set-state-in-effect` at 139/164.
- 2026-07-01T02:01+08:00 [TOOL] Official Meta upload guide was checked via `https://developers.facebook.com/docs/graph-api/guides/upload`; Node 22 targeted `bunx eslint convex/whatsappTemplatesAction.ts`, `bunx tsc -b`, and targeted `git diff --check` passed after the template header upload-session fix.
- 2026-07-01T14:25+08:00 [TOOL] Node 22 `bunx convex codegen`, `bunx vitest run shared/whatsappTemplateMedia.test.ts shared/whatsappTemplateParameters.test.ts`, `bunx tsc -b`, targeted `bunx eslint`, `git diff --check`, and LOC checks passed after WhatsApp template parameters and prepared media IDs.
- 2026-07-01T16:20+08:00 [TOOL] Node 22 targeted `bunx eslint`, `bunx tsc -b`, targeted `git diff --check`, and LOC checks passed after replacing variable chip backgrounds with inline tooltip text and increasing preview note spacing.
- 2026-07-01T17:05+08:00 [TOOL] Node 22 `bunx convex codegen`, targeted `bunx eslint`, `bunx tsc -b`, targeted `git diff --check`, and LOC checks passed after Template Detail line tabs plus Meta component update action.
- 2026-07-01T22:29+08:00 [TOOL] Node 22 `bunx convex codegen`, targeted `bunx eslint`, `bunx tsc -b`, `bunx vitest run shared/whatsappTemplateMedia.test.ts shared/whatsappTemplateParameters.test.ts`, `git diff --check`, LOC check, and `rg` stale-reference checks passed after moving Template Detail analytics below the title and adding per-asset header media persistence/update support.
- 2026-07-02 [TOOL] Node 22.22.0 targeted `bunx eslint src/components/app-sidebar-nav.ts src/components/app-sidebar.tsx`, `git diff --check`, and LOC checks passed after the `Bookings` sidebar regrouping.
