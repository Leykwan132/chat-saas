# Snapshot
- 2026-07-04 [USER] Goal: implement pasteable Website chat channel with Finn-style bottom input, setup dialog, Installation snippet, desktop/mobile preview, persisted visitor conversations, paid icon/branding controls, and real AI processing.
- 2026-07-04 [CODE] Now: Website channel backend, public widget script, default Website card, setup UI, preview UI, and regression coverage are implemented in the working tree.
- 2026-07-05 [USER] Current focus: implement a workspace setup checklist with Convex state, first-visit intro dialog, sidebar triggers, five inferred steps, and mark-all-complete hiding.
- 2026-07-05 [CODE] Now: setup checklist backend, frontend components, workspace/agent sidebar wiring, navigation helper, and regression coverage are implemented in the working tree.
- 2026-07-06 [CODE] Now: first-visit intro actions share the same `h-11` control height; `Skip` is text-style with transparent hover while `Show Guide` remains the filled CTA.
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
- 2026-07-05 [CODE] Workspace setup checklist now stores per-user/workspace intro/completion state, infers five setup steps server-side, renders a floating inline HoverCard checklist, and routes workspace/agent-page step clicks per plan.
- 2026-07-05 [CODE] Workspace setup checklist visual polish landed: trigger uses a floating bottom-right vertical card with a rainbow border and no hover-lift motion, twice-raised equal-size three-rocket artwork height, one-line title/description, simple row labels, `BadgeCheck` completed markers, per-step centered twice-raised equal-size three-icon HoverCard artwork, and a bottom “Mark all as completed” button without progress text/bar.
- 2026-07-05 [CODE] Workspace setup checklist trigger now expands in-place into the checklist panel and collapses back to the Launch Guide card on outside click; row HoverCards still provide step guidance.
- 2026-07-05 [CODE] Workspace setup checklist step navigation now explicitly dismisses the short loading toast; root cause was Sonner loading toasts ignoring `duration`.
- 2026-07-05 [CODE] Workspace setup checklist user-facing label is “Launch Guide” on the floating trigger/panel; first-visit intro says “Welcome to Kilobot”, uses equal left/right columns with a 46.25rem dialog width, matching 27.25rem left/right heights, `welcome-1.png` clipped to the dialog radius, icon-led one-line feature rows, no close X, and a roomier “Show Guide” CTA.
- 2026-07-05 [CODE] Workspace setup checklist remains visible even when inferred progress reaches 5/5; only the manual “Mark all as completed” action hides it and shows “Tutorial has been completed”.
- 2026-07-06 [CODE] Workspace setup checklist first-visit intro actions now use matching `h-11` sizing, and `Skip` reads as a text action instead of a separate pill.

# Working set
- 2026-07-05 [CODE] `convex/workspaceSetupChecklist.ts`, `convex/workspaceSetupChecklist.test.ts`, `convex/schema.ts`, `convex/_generated/api.d.ts`.
- 2026-07-05 [CODE] `src/components/setup-checklist/*`.
- 2026-07-05 [CODE] `src/components/workspace/AgentsSidebar.tsx`, `src/components/workspace/AgentCards.tsx`, `src/pages/WorkspacePage.tsx`, `src/components/app-sidebar.tsx`.

# Open questions
- 2026-07-03 [USER] UNCONFIRMED: Actual Stripe price ID values for `STRIPE_PRICE_EXTRA_CREDITS_2000`, `STRIPE_PRICE_EXTRA_CREDITS_5000`, and `STRIPE_PRICE_EXTRA_CREDITS_15000` are still pending.
- 2026-06-29 [USER] UNCONFIRMED: Whether prompt-only workflow guardrails are enough in production, or whether booking tools should also reject service IDs outside the current workflow-allowed set.

# Receipts
- 2026-07-05 [TOOL] Node 22.22.0 screenshot-width/corner-icon widget fix passed RED/GREEN `bunx vitest run src/components/channels/WebWidgetMobileLayout.test.ts`, targeted eslint, `node --check public/widget/v1.js`, `git diff --check`, and line-count check; Playwright visual attempt was blocked by missing bundled Chromium and local Chrome headless failure.
- 2026-07-03 [TOOL] Compacted billing/pricing receipts: user-plan schema cleanup/migration, Stripe top-up packs with promo codes, CreditMeter/history UI, pricing FAQ/comparison/upgrade dialog polish, and landing AI Workflows image update all passed targeted lint/typecheck/vitest/codegen and `git diff --check`.
- 2026-07-05 [TOOL] Vite dev server started at `http://127.0.0.1:5178/`; `curl -I http://127.0.0.1:5178/workspace` returned HTTP 200.
- 2026-07-05 [TOOL] Compacted setup checklist implementation receipts: backend/codegen, intro dialog, inline panel, navigation, toast, rename, and manual-hide iterations passed targeted vitest/eslint/tsc, `git diff --check`, and LOC checks.
- 2026-07-05 [TOOL] Node 22.22.0 setup checklist auto-hide-at-5/5 change passed RED/GREEN `bunx vitest run convex/workspaceSetupChecklist.test.ts src/components/setup-checklist/workspaceSetupChecklistNavigation.test.ts src/components/setup-checklist/workspaceSetupChecklistToasts.test.ts`, targeted eslint, `bunx tsc --noEmit --pretty false`, `git diff --check`, and LOC check.
- 2026-07-06 [TOOL] Node 22.22.0 shadcn button docs command succeeded with writable `/private/tmp` temp/cache paths; docs confirm `variant` and `size` are the Button API.
- 2026-07-06 [TOOL] Node 22.22.0 first-visit intro action sizing update passed `bunx eslint src/components/setup-checklist/WorkspaceSetupChecklistIntroDialog.tsx`, `git diff --check`, and LOC check (114 lines).
