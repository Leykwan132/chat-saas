# Snapshot
- 2026-07-04 [USER] Goal: implement pasteable Website chat channel with Finn-style bottom input, setup dialog, Installation snippet, desktop/mobile preview, persisted visitor conversations, paid icon/branding controls, and real AI processing.
- 2026-07-04 [CODE] Now: Website channel backend, public widget script, default Website card, setup UI, preview UI, and regression coverage are implemented in the working tree.
- 2026-07-05 [USER] Current focus: fix screenshot-width Website widget expanded appearance and the awkward/uncentered corner icon.
- 2026-07-05 [CODE] Now: public widget keeps full-height mobile layout under 480px, uses a centered SVG close button, and pads/contains the fallback icon in avatar circles.
- 2026-07-04 [CODE] Convex rules in `convex/_generated/ai/guidelines.md` apply: validators on all functions, indexed bounded reads, schema changes in `convex/schema.ts`, auth-derived ownership checks for private surfaces.
- 2026-07-04 [USER] Node v22 is required before scripts/tests; use `source ~/.nvm/nvm.sh && nvm use 22 && ...`.
- 2026-07-04 [USER] Project rule: code files must stay under 300 LOC; keep feature code modular.

# Decisions
- 2026-07-04 [CODE] D101 ACTIVE: Web widget runtime accepts `{ publicKey, visitorId, content, pageUrl }`; backend resolves `publicKey -> webWidgetSettings` and uses stored `channelId`/`agentId`, validating only that settings exist and are enabled.
- 2026-07-04 [CODE] D102 ACTIVE: Web widget placeholder is optional persisted widget settings; public/dashboard config derives `What can {agentDisplayName} help with?` until the user saves custom placeholder text.
- 2026-07-04 [CODE] D103 ACTIVE: Web widget Powered by branding is enforced server-side for free plans; paid-plan widgets can persist `hidePoweredBy`, and dashboard free-plan attempts open Adjust Plan instead of saving.
- 2026-07-04 [CODE] D104 ACTIVE: Web widget layout/theme are fixed for now to the signature input-bar + light input defaults; dashboard/public config ignore stored layout/theme and the setup UI no longer exposes those pickers.
- 2026-07-04 [CODE] D105 ACTIVE: Website is a built-in/default channel in Channels; users open Setup Info to lazily ensure widget settings, Website is not offered in the add-channel dialog, and web channels do not consume external channel capacity.
- 2026-07-04 [CODE] D106 ACTIVE: Website setup preview is a live widget conversation: it stores `kilobot:widget-preview:{publicKey}:visitorId`, calls `api.webWidget.publicReceiveMessage`, subscribes to `api.webWidget.publicListMessages`, and never generates fake assistant replies.
- 2026-07-04 [CODE] D107 ACTIVE: Website widget conversation rendering follows the playground chat style: assistant text is Markdown-rendered, pending AI is shown as a shimmer assistant row, and status-pill thinking UI is avoided.
- 2026-07-04 [CODE] D108 ACTIVE: Website widget avatars use uploaded icon first and Kilobot `/icon.svg` fallback when no custom avatar exists; pasted widgets resolve the fallback icon from the widget script origin.
- 2026-07-04 [CODE] D109 ACTIVE: Website widget avatars live in the chat surfaces only; the prompt/input bar does not render an avatar.
- 2026-07-04 [CODE] D110 ACTIVE: Public pasted widget loading avatars use the lightweight CSS shine treatment.
- 2026-07-04 [CODE] D111 ACTIVE: Dashboard preview reset starts a fresh preview conversation by rotating `kilobot:widget-preview:{publicKey}:visitorId`; it does not delete old backend preview threads.
- 2026-07-04 [CODE] D112 ACTIVE: Dashboard preview loading avatars use TestChatWindow-style conic-ring geometry with explicit circular clipping/box sizing; Thinking text stays below the icon.

# Done (recent)
- 2026-07-04 [CODE] Preview/public widget use the signature input-bar behavior with motion spring input expansion, bottom fade/slide chat window, outside-click dismiss, and compact collapsed footprint.
- 2026-07-04 [CODE] Preview/public widget message rendering now uses cleaner playground-style user bubbles, assistant text, Kilobot fallback avatar in chat only, and shimmer pending AI.
- 2026-07-04 [CODE] Dashboard preview now sends real backend messages, loads persisted messages, shows send/loading/error/thinking states, and removed the fake preview reply model.
- 2026-07-04 [CODE] `api.webWidget.publicReceiveMessage` reuses the same ingest/enqueue helper as the HTTP widget message path.
- 2026-07-05 [CODE] Early adopter FAQ now has a dedicated “Will I get help going live?” item for six weeks of guidance.
- 2026-07-05 [CODE] Channels page TS7053 fix narrowed `PlatformOptionCard.service` to keys of `CHANNEL_SERVICE_META`.
- 2026-07-05 [CODE] Mobile/screenshot-width Website widget expanded state keeps a fixed input gap, avoids full-height mobile layout above 480px, and uses centered icon treatment; public script CSS has regression coverage.

# Working set
- 2026-07-04 [CODE] `convex/webWidget.ts`, `convex/webWidgetAdmin.ts`, `convex/webWidgetCore.ts`, `convex/webWidgetValidators.ts`, `convex/http.ts`, `convex/schema.ts`.
- 2026-07-04 [CODE] `convex/webWidget.test.ts`, `convex/webWidgetBranding.test.ts`, `convex/webWidgetDefaultChannel.test.ts`.
- 2026-07-04 [CODE] `public/widget/v1.js`.
- 2026-07-04 [CODE] `src/components/channels/*`, `src/pages/ChannelsPage.tsx`, `src/lib/channelServiceMeta.ts`, `src/lib/channelServiceMeta.test.ts`, `src/pages/ChatsPage.tsx`.
- 2026-07-04 [CODE] `shared/webWidgetLayouts.ts`, `shared/webWidgetThemes.ts`, `shared/channelColors.ts`, `shared/planCatalog.ts`.
- 2026-07-04 [CODE] `convex/chat/threads.ts`, `convex/chat/inbox.ts`, `convex/chat/channelSend.ts`.
- 2026-07-04 [CODE] `src/components/ai-elements/artifact.tsx`, `src/components/ai-elements/code-block.tsx`, `src/components/ui/aspect-ratio.tsx`, `src/registry/magicui/typing-animation.tsx`.
- 2026-07-04 [CODE] `src/pages/EarlyUserPage.tsx`, `src/components/early-adopter/*`, `src/content/earlyAdopterFaqs.ts`, `src/components/SiteHeader.tsx`.

# Open questions
- 2026-07-03 [USER] UNCONFIRMED: Actual Stripe price ID values for `STRIPE_PRICE_EXTRA_CREDITS_2000`, `STRIPE_PRICE_EXTRA_CREDITS_5000`, and `STRIPE_PRICE_EXTRA_CREDITS_15000` are still pending.
- 2026-06-29 [USER] UNCONFIRMED: Whether prompt-only workflow guardrails are enough in production, or whether booking tools should also reject service IDs outside the current workflow-allowed set.

# Receipts
- 2026-07-04 [TOOL] Node 22.22.0 targeted eslint passed for `convex/webWidget.ts`, `convex/webWidgetDefaultChannel.test.ts`, and Website preview/settings components.
- 2026-07-04 [TOOL] Node 22.22.0 `bunx vitest run convex/webWidgetDefaultChannel.test.ts convex/webWidget.test.ts convex/webWidgetBranding.test.ts` passed (9 tests).
- 2026-07-04 [TOOL] Node 22.22.0 `bunx tsc -b --pretty false` passed.
- 2026-07-04 [TOOL] `git diff --check` passed after ledger compression; touched code files remain below 300 LOC.
- 2026-07-04 [TOOL] Node 22.22.0 widget rendering update passed targeted eslint, `node --check public/widget/v1.js`, `bunx tsc -b --pretty false`, `git diff --check`, and line-count check.
- 2026-07-04 [TOOL] Node 22.22.0 fallback-avatar update passed targeted eslint, `node --check public/widget/v1.js`, `bunx tsc -b --pretty false`, `git diff --check`, source scan, and line-count check.
- 2026-07-04 [TOOL] Node 22.22.0 input-avatar removal passed targeted eslint, `node --check public/widget/v1.js`, `bunx tsc -b --pretty false`, source scan, `git diff --check`, and line-count check.
- 2026-07-04 [TOOL] Node 22.22.0 shine-border loading avatar update passed targeted eslint, `node --check public/widget/v1.js`, `bunx tsc -b --pretty false`, source scan, `git diff --check`, and line-count check.
- 2026-07-04 [TOOL] Node 22.22.0 mobile preview frame fix passed `bunx tsc --noEmit --pretty false` and `git diff --check`; affected file is 55 LOC.
- 2026-07-04 [TOOL] Node 22.22.0 preview reset/avatar/padding update passed targeted eslint, `bunx tsc --noEmit --pretty false`, `git diff --check`, source scan, and line-count check.
- 2026-07-04 [TOOL] Node 22.22.0 widget message spacing update passed targeted eslint, `node --check public/widget/v1.js`, `bunx tsc --noEmit --pretty false`, and `git diff --check`.
- 2026-07-04 [TOOL] Node 22.22.0 mobile loading layout update passed targeted eslint, `node --check public/widget/v1.js`, `bunx tsc --noEmit --pretty false`, `git diff --check`, and line-count check.
- 2026-07-04 [TOOL] Node 22.22.0 setup dialog spacing update passed targeted eslint, `bunx tsc --noEmit --pretty false`, `git diff --check`, and line-count check.
- 2026-07-04 [TOOL] Node 22.22.0 loading avatar alignment update passed targeted eslint, `node --check public/widget/v1.js`, `bunx tsc --noEmit --pretty false`, `git diff --check`, and line-count check.
- 2026-07-04 [TOOL] Node 22.22.0 early adopter copy/refactor passed targeted eslint, `bunx tsc --noEmit --pretty false`, `git diff --check`, old-copy scan, and line-count check.
- 2026-07-05 [TOOL] Node 22.22.0 early adopter go-live FAQ update passed targeted eslint, `bunx tsc --noEmit --pretty false`, `git diff --check`, and line-count check.
- 2026-07-05 [TOOL] Node 22.22.0 ChannelsPage TS7053 fix passed `bunx tsc --noEmit --pretty false`, `git diff --check`, and line-count check (`src/pages/ChannelsPage.tsx` remained 1116 LOC).
- 2026-07-05 [TOOL] Node 22.22.0 mobile widget spacing fix passed RED/GREEN `bunx vitest run src/components/channels/WebWidgetMobileLayout.test.ts`, targeted eslint, `node --check public/widget/v1.js`, `git diff --check`, line-count check, and browser measurement at 390x844.
- 2026-07-05 [TOOL] Node 22.22.0 screenshot-width/corner-icon widget fix passed RED/GREEN `bunx vitest run src/components/channels/WebWidgetMobileLayout.test.ts`, targeted eslint, `node --check public/widget/v1.js`, `git diff --check`, and line-count check; Playwright visual attempt was blocked by missing bundled Chromium and local Chrome headless failure.
- 2026-07-03 [TOOL] Compacted billing/pricing receipts: user-plan schema cleanup/migration, Stripe top-up packs with promo codes, CreditMeter/history UI, pricing FAQ/comparison/upgrade dialog polish, and landing AI Workflows image update all passed targeted lint/typecheck/vitest/codegen and `git diff --check`.
