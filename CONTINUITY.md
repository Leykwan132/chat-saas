# CONTINUITY.md

# Snapshot

- 2026-08-24 [USER] Goal: add Book a Service onboarding to agent creation: editable weekday 9–5 availability, optional self-only first service, and an optional ready appointment-booking workflow action; create a review PR.
- 2026-08-24 [CODE] Now: booking-agent onboarding is implemented and verified on `codex/booking-agent-onboarding`; preparing the review PR.
- 2026-08-24 [USER] Next: review the PR. Availability is always created; new invited workspace members receive independent Mon–Fri 9–5 schedules for existing agents and are not added automatically to creator-only onboarding services.
- 2026-08-21 [USER] Goal: ship an AI-powered Kilobot iframe widget that opens directly into an optional visitor form or chat, while preserving the Traditional widget and embed contract.
- 2026-08-21 [CODE] Now: `codex/iframe-widget-home` contains broad uncommitted widget work. The live iframe and dashboard preview share direct entry, a compact Geist chat, opt-in suggestions, reset confirmation, loading state, optional branding, and compact desktop/mobile frames.
- 2026-08-21 [CODE] Now: Visitor-form settings use one bordered collection container without helper copy. Standard Name, Email, and Phone fields remain selectable; custom-field edits stay local drafts until Confirm merges them into the form, then compact rows expose Edit, requirement, and delete controls. Answers are saved on the customer record.
- 2026-08-21 [CODE] Now: Appearance uses compact Name/avatar plus Remove Kilobot branding in the left desktop column, with Theme in the right column. A Save appearance action is shown only for a valid unsaved Name edit and hides after success.
- 2026-08-23 [TOOL] Now: PR #79 is open from `codex/iframe-widget-home` into `main` at commit `6380a4f`.
- 2026-08-23 [CODE] Next: review PR #79; the local-only `index.html` iframe snippet was removed from the shipping tree.
- 2026-08-21 [TOOL] Convex code generation cannot reach its external service from this environment; run `bunx convex codegen` or `bunx convex dev` locally when network access is available.

# Decisions

- 2026-08-24 [USER] D753 ACTIVE: Book a Service agent onboarding is Identity → Goal → editable availability (default Monday–Friday 9–5) → optional service. Create Agent atomically creates selected availability, an active service assigned only to the creator, and a ready Book appointment workflow node for that service only when Enable appointment booking is on; Skip for now creates the agent directly with availability alone. New workspace members receive independent default availability for every existing agent but do not inherit creator-only onboarding services.
- 2026-08-21 [USER] D740 ACTIVE: Reset retires the visitor’s prior AI thread; their next message creates a fresh conversation and AI context.
- 2026-08-21 [USER] D741 ACTIVE: Suggestions have an explicit enable switch that is off for new widgets; existing configured suggestions stay enabled. When disabled, their three dashboard inputs and helper copy are hidden. When enabled, three configured non-empty suggestions render as vertical content-sized pills only before the first visitor message and send immediately as that visitor message; Save suggestions appears only after edits.
- 2026-08-21 [USER] D742 ACTIVE: AI-powered widgets always use the fixed `Ask a question…` placeholder; legacy stored values are ignored.
- 2026-08-21 [USER] D743 ACTIVE: Appearance is one compact group with Name/avatar and a close-coupled Remove Kilobot branding switch in the desktop left column, Theme in the right column, and no generic branding helper text or separators. A custom avatar has its own adjacent trash action that removes it and returns the live widget and both closed/open preview states to the default icon.
- 2026-08-21 [USER] D745 ACTIVE: Appearance saves follow the same edit-driven pattern as suggestions and visitor form: Save appearance is visible only after a valid Name change and clears immediately after a successful save.
- 2026-08-21 [USER] D744 ACTIVE: Visitor-form configuration appears below Suggestions and exposes Name, Email, and Phone as full-width vertical rows. The standard-field switch controls Required versus Optional while the field remains visible in the form; a trash action removes it. New forms include Phone as visible Optional. Standard form copy is not configurable; Save form is shown only for pending valid edits and disappears immediately after a successful save; the title has a green, white-text Recommended badge.
- 2026-08-21 [USER] D746 ACTIVE: Visitor-form configuration groups only configured fields in one container, with Add field and Save form outside it, and allows removable custom fields. Standard and custom field switches are labelled Required or Optional to reflect their state; all visitor-form trash actions are red. New and edited custom fields stay as local drafts until Confirm merges a valid field into the form and collapses it into a compact row; Edit restores a draft. They are Short text or Dropdown, and dropdowns require at least two configured options. Required standard and custom labels show a red `*` in the live form and preview. Submitted answers are stored on the customer as custom fields, and no required-fields helper copy is shown. Live and preview dropdown fields use one minimal shadcn Select trigger/popover rather than the browser-native menu.
- 2026-08-23 [USER] D747 ACTIVE: The live visitor form and dashboard preview use Geist for their title and description, use a medium-weight title with a deliberate top inset, neutral light-theme input borders, place a fully rounded Continue button after the configured fields with a small gap, and scroll their form body for long field lists. Live and preview text inputs and dropdown triggers share a 12px horizontal inset.
- 2026-08-21 [USER] D748 ACTIVE: Custom visitor fields support Short text, Email, Phone number, Number, Website URL, and Dropdown. Email, number, and website inputs use native browser controls and backend validation; phone accepts international formats without a restrictive server pattern. Dropdowns use the shared shadcn Select with native required-form participation. The dashboard type picker pairs every option with a clear icon and uses a more legible text size.
- 2026-08-21 [USER] D749 ACTIVE: The chat thinking state is an unframed inline status: its label matches normal message text size, sits one pixel lower for optical centering, has a 10px gap from the dot grid, and uses a subtle reduced-motion-safe shimmer.
- 2026-08-21 [USER] D750 ACTIVE: While the widget chat is open, it refreshes its public message list every two seconds so human and AI replies sent from the inbox appear without a visitor refresh or another visitor message. The faster 750ms loop remains only while awaiting an AI reply.
- 2026-08-21 [USER] D751 ACTIVE: Visitor messages use a black, high-contrast bubble. AI and human replies use neutral bubbles with a sender label above: `AI Agent` for automated replies and only the team member name for human inbox replies when the member profile has a name. Every visitor, AI, and human message includes its local `hour:minute` timestamp below the bubble. Bubbles shrink to message width while retaining an 82–84% cap for long text. The dashboard preview follows the same visual treatment.
- 2026-08-21 [USER] D752 ACTIVE: A visitor profile completed with the same browser-stored widget visitor ID bypasses an enabled visitor form on every later widget open and enters chat directly. The widget handles either profile/config load order; resetting a chat does not erase the profile.
- 2026-08-20 [USER] D734 ACTIVE: Channel management is agent-scoped; a channel assigned to one agent must not appear on another agent’s Channels page.
- 2026-08-20 [USER] D735–D739 ACTIVE: Messenger setup shows safe progress/errors and its setup cards are currently hidden while Website/KiloBot remains visible.

# Done (recent)

- 2026-08-24 [CODE] Added Book a Service agent onboarding: an editable weekday 9–5 availability step, optional self-only service creation, and an opt-in ready Book appointment workflow node. Booking requires a post-availability customer message plus the agent’s recorded reaction before the selected slot can be created. Skipping service creation creates the agent with availability alone.
- 2026-08-21 [CODE] Completed the locally uncommitted AI-widget redesign: direct iframe UX, Message Scroller transcript, prompt composer, reset, branding, aligned live/preview presentation, an unframed shimmering thinking status, chat-open message refresh, and sender-aware bubbles with human attribution and timestamps.
- 2026-08-21 [CODE] Simplified human-reply attribution in the live widget to the replying team member’s name only; the workspace-team prefix is no longer rendered.
- 2026-08-21 [CODE] Simplified Visitor form to selected data fields with a green Recommended badge; compact standard/custom rows expose requirement state plus Edit/Delete actions, while new or edited custom fields remain local drafts until Confirm. Returning visitors with a saved profile now go straight to chat; live and preview forms are scrollable, Geist-based, neutral-bordered, and consistently spaced with rounded Continue controls. Live text and dropdown controls share a 12px horizontal inset.
- 2026-08-21 [CODE] Added vertical content-sized suggestions with opt-in visibility and immediate-send behavior, plus compact Name/avatar, branding, and theme settings with edit-driven saves.
- 2026-08-21 [CODE] Added Short text, Email, Phone number, Number, Website URL, and Dropdown custom fields across dashboard, preview, live iframe, shared configuration, and backend validation; dropdowns use a shared minimal shadcn Select with balanced trigger spacing.
- 2026-08-21 [CODE] Added icons for every custom-field type-picker option and slightly increased the picker and confirmed-row type text for readability; custom avatars now have a remove control and the reactive preview follows upload/removal.
- 2026-08-23 [CODE] Made the dashboard preview launcher use the configured avatar when closed; its open chat header already uses the same avatar. Preview field controls retain the shared 12px horizontal inset.

# Working set

- 2026-08-21 [CODE] `shared/webWidgetExperience.ts`
- 2026-08-21 [CODE] `convex/{webWidget.ts,webWidgetAdmin.ts,webWidgetPublic.ts,webWidgetValidators.ts,http.ts}`
- 2026-08-21 [CODE] `public/widget/ai.js`
- 2026-08-21 [CODE] `src/widget/{Widget.tsx,widgetEntryScreen.ts,WidgetVisitorForm.tsx,styles.css}`
- 2026-08-21 [CODE] `src/components/channels/WebWidgetAiSettingsControls.tsx`
- 2026-08-21 [CODE] `src/components/channels/WebWidgetAppearanceSection.tsx`
- 2026-08-21 [CODE] `src/components/channels/WebWidgetLeadFormSection.tsx`
- 2026-08-21 [CODE] `src/components/channels/WebWidgetPreview.tsx`
- 2026-08-21 [CODE] `src/components/channels/WebWidgetSettingsPanel.tsx`
- 2026-08-21 [CODE] `index.html`

# Receipts

- 2026-08-24 [TOOL] Booking onboarding: 31 focused backend/UI tests and targeted lint pass; production build completes with Node v22; all new or modularized source files are at or below 300 lines. Repository-wide lint remains blocked by 223 pre-existing errors in unrelated paths. The full `bun test` run is unsuitable here (1,362 pass, 174 fail, 116 loader errors) because Bun lacks Vitest `import.meta.glob` support and required Stripe environment values. Convex codegen requires an unconfigured `CONVEX_DEPLOYMENT`.
- 2026-08-21 [TOOL] Custom-field draft boundary: red merge test confirmed confirmation had no model boundary; focused tests (9), app TypeScript, targeted ESLint, and diff validation pass. All touched code files remain below 300 lines.
- 2026-08-21 [TOOL] Required markers: red render tests confirmed both live and preview forms omitted markers; 19 focused tests, app TypeScript, targeted ESLint, and diff validation pass.
- 2026-08-21 [TOOL] Visitor-form layout: red render tests confirmed absent scroll/font classes; 19 focused tests, app TypeScript, targeted ESLint, and diff validation pass.
- 2026-08-21 [TOOL] Visitor-form header spacing: red preview render test confirmed the prior padding and semibold title; 19 focused tests, app TypeScript, targeted ESLint, and diff validation pass.
- 2026-08-21 [TOOL] Light form-control borders: visitor-form render test, app TypeScript, targeted ESLint, and diff validation pass.
- 2026-08-21 [TOOL] Visitor-form top inset and Continue styling: red preview render test confirmed the compact top inset and rounded rectangle; 19 focused tests, app TypeScript, targeted ESLint, and diff validation pass.
- 2026-08-21 [TOOL] Live Continue radius: visitor-form render test, app TypeScript, targeted ESLint, and diff validation pass after correcting CSS precedence.
- 2026-08-21 [TOOL] Custom field types: red shared and rendered-form tests confirmed missing normalization and native input types; 21 focused tests, app TypeScript, targeted ESLint, and diff validation pass. Touched code files remain below 300 lines.
- 2026-08-21 [TOOL] Custom-field type-picker icons: 18 focused tests, app TypeScript, targeted ESLint, and diff validation pass; the row remains below 300 lines.
- 2026-08-21 [TOOL] Thinking-indicator refinement: 40 focused render tests, app TypeScript, targeted ESLint, and diff validation pass; its CSS remains below 300 lines.
- 2026-08-21 [TOOL] Thinking-indicator optical alignment: red CSS expectations confirmed the prior 6px gap; 40 focused render tests, app TypeScript, targeted ESLint, and diff validation pass.
- 2026-08-21 [TOOL] Inbox-to-widget reply refresh: red widget test confirmed no chat-open polling; 34 focused widget/Convex tests, app TypeScript, targeted ESLint, and diff validation pass. `Widget.tsx` remains below 300 lines.
- 2026-08-21 [TOOL] Sender-aware bubbles, human attribution, metadata order, timestamps, content-sized width, and returning-profile routing: red backend/live/preview tests confirmed absent sender metadata, member names, required top/bottom ordering, timestamps, content sizing, and returning-visitor routing; 68 focused tests, app TypeScript, targeted ESLint, and diff validation pass. All newly touched code files remain below 300 lines.
- 2026-08-21 [TOOL] Human-reply name-only attribution: red widget render test confirmed the prior separator remained; 68 focused tests, app TypeScript, targeted ESLint, the Widget line cap, and diff validation pass.
- 2026-08-21 [TOOL] Avatar removal: red avatar-uploader render test confirmed the clear action was absent; 76 focused tests, app TypeScript, targeted ESLint, code line caps, and diff validation pass.
- 2026-08-21 [TOOL] Shadcn visitor-form dropdowns: red rendered-form test confirmed the browser-native menu remained; 88 focused tests, app TypeScript, targeted ESLint, code line caps, and diff validation pass.
- 2026-08-23 [TOOL] Live visitor-form padding: red style test confirmed inputs retained their 11px horizontal inset; 72 focused tests, app TypeScript, targeted ESLint, code line caps, and diff validation pass.
- 2026-08-23 [TOOL] Avatar-aware closed preview launcher: red server-render test confirmed the configured avatar was absent; 34 focused settings/visitor-form tests, targeted ESLint, line-cap checks, and diff validation pass after the fix.
- 2026-08-23 [TOOL] The local iframe test in `index.html` is appended to the dashboard body. While a Radix modal is open, Radix disables body pointer events for modal focus isolation, so the high-z-index iframe remains visible but cannot receive clicks. Use the in-modal preview or a separate local host page for widget interaction tests.
- 2026-08-23 [TOOL] PR verification: 94 focused widget/settings/Convex tests and the Node v22 production build pass. The full suite initially included 21 obsolete inline-widget assertions, now replaced by iframe-host coverage; it also reports six unrelated Calendar and agent-overview failures in unchanged areas.
- 2026-08-23 [TOOL] PR #79 created: `https://github.com/Leykwan132/chat-saas/pull/79`.
