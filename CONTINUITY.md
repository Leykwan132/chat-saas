# CONTINUITY.md

# Snapshot

- 2026-09-03 [CODE] Avatar settings now support manager-uploaded R2 cover images, and dashboard/public previews show a centered “Connecting...” overlay while a LiveAvatar session starts. Unshipped.
- 2026-09-03 [CODE] Gemini Live Avatar connector remains implemented on `codex/gemini-live-connector`: managers save a provider context, LITE tokens use server-only `HEYGEN_GEMINI_SECRET_ID`, and browser turns bypass KiloBot. Focused tests and the Node 22 build passed before this merge; sandbox verification awaits a configured local Convex deployment.
- 2026-09-03 [CODE] Avatar End now records `session.stopped` for both active sessions and canceled in-flight starts; event persistence strips request-only fields so Convex can finalize the session and release its capacity slot. Unshipped.
- 2026-09-03 [CODE] Avatar context editing now presents the prompt field as “Instructions” without the extra bordered outer container. Unshipped.
- 2026-09-03 [CODE] Avatar calls now place controls vertically on the right edge with no speaking/status or response-subtitle overlays. Unshipped.
- 2026-09-03 [CODE] Avatar controls now show only a centered-right End button during calls and bottom-center Start Chat before calls, with no speaking/listening status labels. Unshipped.
- 2026-09-03 [CODE] Avatar managers can choose one of the 30 supported Gemini Live voices; selected voices persist per Avatar configuration and are used for new LITE sessions. Opening text is composed into the saved provider system prompt instead of sent as a separate provider field. Unshipped.
- 2026-09-03 [CODE] Avatar settings now place the Voice selector below the Context and Opening text fields, use the shorter “Voice” heading, and render the selector text at a larger size. Unshipped.
- 2026-09-03 [CODE] Avatar settings now show only the single-line Voice, Instructions, and Opening text labels; the extra Voice and Context headings are removed. Unshipped.
- 2026-09-03 [CODE] Avatar Instructions and Opening text labels now match Voice typography, and the Voice dropdown sizes to its content. Unshipped.
- 2026-09-03 [CODE] Avatar context saves now include the provider-required `opening_text` field while retaining the opening message in the system prompt. Unshipped.
- 2026-09-03 [CODE] Avatar setup now groups catalog choices into Landscape-first and Portrait sections using preview aspect ratios, and portrait previews fit without cropping. Unshipped.
- 2026-09-03 [CODE] Configured Avatar overviews now expose a copyable public Live link and a new-tab Preview action below the video preview. Unshipped.
- 2026-09-03 [CODE] Avatar public links now resolve to the active localhost origin during local testing and the production host elsewhere. Unshipped.
- 2026-09-03 [CODE] Public Avatar embeds now fill the dynamic viewport on mobile and desktop, while the dashboard Live link sits above the website embed panel. Unshipped.
- 2026-09-03 [CODE] Supersedes the previous Live-link placement: the dashboard now shows it below the embed code with a text copy action and icon-only preview action. Unshipped.
- 2026-09-03 [CODE] Supersedes the previous Live-link controls: the URL now uses a muted code block with an in-block copy icon, and the external-link icon sits beside the heading. Unshipped.
- 2026-09-03 [CODE] Removed the explanatory sentence beneath the Avatar Context heading for a cleaner settings layout. Unshipped.
- 2026-09-01 [USER] Goal: test the white-label Partner Programme locally on `codex/white-label-partner-portal`.
- 2026-09-01 [TOOL] Now: merging current `origin/main` into the white-label branch; concurrent Overview-test and Workspace-page edits are being reconciled without removing partner access controls.
- 2026-08-31 [CODE] Now: `origin/main` adds WhatsApp username recipients and BSUID-change continuity; both remain unshipped.
- 2026-08-27 [CODE] Now: mobile inbox/workspace behaviour and Google Calendar What’s new copy are present on `origin/main`; those customer-facing changes remain unshipped.
- 2026-08-26 [CODE] Now: partner-customer provisioning, workspace access, retained credentials, deletion, role control, and permission-state work is committed locally as `734c0e9`; it remains unshipped.
- 2026-08-26 [CODE] Next: deploy the committed Convex changes only with explicit approval; Convex code generation requires explicit outbound-data approval.
- 2026-08-19 [ASSUMPTION] White-label work is unshipped; no release-changelog entry has been added.

# Decisions

- 2026-09-03 [USER] D778 ACTIVE: Avatar cover images are stored in R2 under agent-scoped keys and served through the configured media CDN URL.
- 2026-09-02 [USER] D757 ACTIVE: Gemini credentials are externally registered with LiveAvatar. The app reads only opaque `HEYGEN_GEMINI_SECRET_ID` server-side and never persists or exposes the Gemini API key.
- 2026-08-19 [USER] D734 ACTIVE: white-label state is isolated in dedicated partner tables; existing user, team, Stripe, and admin-session records change only through ID relationships.
- 2026-08-19 [USER] D735 ACTIVE: shared plan limits take effect immediately; only the new monthly allowance starts at the organization’s next credit cycle.
- 2026-08-19 [USER] D736 ACTIVE: partner-created workspaces use their organization wallet and manual grants; Stripe payment and top-up paths are blocked.
- 2026-08-19 [USER] D742 ACTIVE: Partner Programme has Overview, Customers, and Branding in a subtle vertical ghost navigation.
- 2026-08-19 [USER] D743–D760 ACTIVE: custom hostnames use the configured Cloudflare SaaS zone, CNAME-only subdomains, DCV delegation, explicit DNS confirmations, concise polling, and expandable completed setup steps.
- 2026-08-24 [USER] D763 ACTIVE: Customers has separate organization and customer tables; organization counts include pending and accepted invitations, active has a green dot, and suspension requires confirmation.
- 2026-08-24 [USER] D770 ACTIVE: partner-provisioned passwords are encrypted at rest, revealed only by an authorized row action, and marked historical after WorkOS emits `password_reset.succeeded`.
- 2026-08-25 [USER] D771 ACTIVE: a partner-created customer skips onboarding and may access only their assigned organization; personal and other workspace switching is server-blocked.
- 2026-08-25 [USER] D773 ACTIVE: partners can change active customer roles and WorkOS/local membership records update together.
- 2026-08-25 [USER] D774–D775 ACTIVE: members without agent-create access see an explanatory empty state; partner-managed workspaces hide Get Free Credits.
- 2026-08-25 [USER] D776 ACTIVE: partner-created customers authenticate only through their assigned connected partner hostname; native Kilobot sign-in rejects them while native users retain AuthKit.
- 2026-09-03 [USER] D777 ACTIVE: each partner customer remains restricted to one assigned workspace and cannot create additional workspaces.
- 2026-08-31 [USER] D756 ACTIVE: valid WhatsApp BSUID-change system events move the customer recipient ID and linked WhatsApp conversation address without creating an inbox, analytics, or AI event.

# Done (recent)

- 2026-09-02 [CODE] Added LiveAvatar Gemini connector session tokens, manager-editable provider context, and direct connector-owned Avatar conversations; unshipped.
- 2026-09-03 [CODE] Added R2-backed Avatar cover image upload, replacement, removal, and preview handoff plus a loading overlay during session startup; unshipped.
- 2026-09-03 [CODE] Added the Gemini Live voice catalog and manager voice selector, persisted the choice, and embedded Avatar opening text into the provider system prompt; unshipped.
- 2026-09-03 [CODE] Refined the Voice selector order, label, and typography for clearer Avatar settings.
- 2026-09-03 [CODE] Flattened the Avatar settings labels and removed the redundant Voice and Context headings.
- 2026-09-03 [CODE] Matched Avatar setting label sizes and made the Voice selector intrinsic-width.
- 2026-09-03 [CODE] Fixed LiveAvatar context saves by restoring the required provider opening-text field.
- 2026-09-03 [CODE] Added aspect-ratio-based Avatar orientation grouping and non-cropping portrait preview rendering.
- 2026-09-03 [CODE] Removed the redundant Avatar Context description text.
- 2026-09-03 [CODE] Hardened Avatar teardown so explicit End releases the backend session slot; unshipped.
- 2026-09-03 [CODE] Simplified the Avatar context editor presentation and renamed its prompt label to “Instructions”; unshipped.
- 2026-09-03 [CODE] Added right-edge call controls and centered AI response subtitles to the Avatar stage; unshipped.
- 2026-09-03 [CODE] Refined Avatar controls and subtitle weight for the requested call-stage layout; unshipped.
- 2026-09-03 [CODE] Moved the inactive Avatar Start Chat control to the bottom center of the video stage; unshipped.
- 2026-09-03 [CODE] Removed the idle “Listening” label while keeping the speaking indicator during Avatar calls; unshipped.
- 2026-09-03 [CODE] Lowered Avatar subtitles and softened their weight/stroke to prevent doubled-looking glyphs; unshipped.
- 2026-09-03 [CODE] Increased subtitle weight to extra-bold and changed the outline/shadow to neutral tones; unshipped.
- 2026-09-03 [CODE] Removed the “KiloBot is speaking” status pill from the Avatar stage; unshipped.
- 2026-09-03 [CODE] Removed response subtitles from the Avatar stage for a clean video presentation; unshipped.
- 2026-09-03 [CODE] Tightened the Live link heading and external-link icon spacing to match the compact reference layout; unshipped.
- 2026-09-03 [CODE] Avatar sessions now close after eight seconds of silence, reset the timeout during speech, and record `idle_timeout` when they end automatically; unshipped.
- 2026-09-03 [CODE] Avatar sessions now show “Chat closing in 3”, “2”, and “1” at the top during the final three idle seconds; unshipped.
- 2026-08-31 [CODE] Added WhatsApp username recipients and BSUID-change continuity; both customer-facing changes are unshipped.
- 2026-08-27 [CODE] Added responsive mobile inbox/workspace navigation, demo data, accessible customer details, and robust switcher search behaviour; unshipped.
- 2026-08-27 [CODE] Added Google Calendar Support to What’s new and removed the Model Support New badge; unshipped.
- 2026-08-26 [CODE] Prevented deleted Send Media nodes from crashing the Workflow editor; unshipped.
- 2026-08-26 [CODE] Completed partner provisioning, assigned-workspace-only access, credentials, deletion, role controls, and permissions work in local commit `734c0e9`; unshipped.
- 2026-09-03 [CODE] Added a regression guard confirming partner customers cannot create additional workspaces; unshipped.

# Working set

- 2026-09-03 [CODE] `convex/{avatar.ts,avatarContext.ts,avatarCore.ts,avatarProvider.ts,avatarSession.ts,avatarLifecycle.ts,schema.ts}`
- 2026-09-03 [CODE] `convex/{avatarCover.ts,avatarSessionCapacity.ts,media/r2.ts}` and `src/components/avatar/AvatarCoverImageEditor.tsx`
- 2026-09-03 [CODE] `shared/geminiLiveVoices.ts`
- 2026-09-03 [CODE] `src/{pages/AvatarPage.tsx,pages/AvatarCreatePage.tsx,components/avatar/{AvatarLiveLink.tsx,AvatarGeminiVoiceSelector.tsx,avatarOrientation.ts},lib/avatarEmbed.ts}`
- 2026-09-01 [CODE] `convex/whiteLabel/`
- 2026-09-01 [CODE] `convex/{schema.ts,authUtils.ts,teamHelpers.ts}`
- 2026-09-01 [CODE] `src/{pages/PartnerPage.tsx,pages/WorkspacePage.tsx,components/partner/}`
- 2026-09-01 [CODE] `src/lib/whiteLabelApi.ts`
- 2026-09-01 [CODE] `convex/{agentOverview.test.ts,agentOverviewTestHelpers.ts,avatarConversationIdentity.test.ts}`
- 2026-09-01 [CODE] `docs/superpowers/specs/2026-08-19-partner-custom-hostnames-design.md`
- 2026-09-01 [CODE] `docs/superpowers/specs/2026-08-24-partner-active-customer-accounts-design.md`

# Receipts

- 2026-09-02 [TOOL] Gemini Avatar focused suite passed 27 tests and Node v22 production build passed. `bunx convex codegen` was blocked because the worktree lacked `CONVEX_DEPLOYMENT`.
- 2026-08-31 [TOOL] WhatsApp username-recipient focused suite passed 19 tests, Node v22 TypeScript, changed-backend lint, and diff validation; unrelated full-suite failures remain.
- 2026-08-27 [TOOL] Mobile inbox/workspace focused tests, targeted lint, diff validation, and Node v22 production build passed.
- 2026-08-26 [TOOL] Before `734c0e9`, 15 focused partner/workspace regressions and Node v22 TypeScript passed.
- 2026-08-25 [TOOL] Partner-created customer workspace regression, related auth/workspace suites, Node v22 production build, targeted lint, and diff validation passed.
- 2026-08-25 [TOOL] A bounded partner-customer workspace migration ran successfully against the configured Convex development deployment and its temporary entrypoint was removed.
- 2026-09-03 [TOOL] Focused customer-workspace regression passed for the explicit no-additional-workspace guard.
- 2026-09-03 [TOOL] Node v22 production build passed after resolving the WorkOS sign-out overload in the partner-auth provider.
- 2026-09-03 [TOOL] Avatar connector regression suite passed 44 tests, targeted ESLint passed, dependencies restored from the lockfile, and the Node v22 production build passed.
- 2026-09-03 [TOOL] Avatar-focused suite passed 45 tests and the Node v22 production build passed after the context-editor presentation update.
- 2026-09-03 [TOOL] Avatar stage and connector changes passed 48 focused tests, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Avatar control/subtitle iteration passed 48 focused tests, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Bottom-center Start Chat update passed 67 Avatar-focused tests, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Listening-label removal passed 67 Avatar-focused tests, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Subtitle position and typography update passed 67 Avatar-focused tests, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Extra-bold neutral subtitle styling passed 67 Avatar-focused tests, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Speaking-status removal passed 67 Avatar-focused tests, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Subtitle-overlay removal passed 68 Avatar-focused tests, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Gemini voice and prompt changes passed 72 Avatar-focused tests, Convex TypeScript, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Voice selector layout and typography checks passed the focused Avatar tests, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Context-description removal passed the Avatar-focused suite, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Avatar settings label flattening passed 72 focused tests, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Avatar settings typography and intrinsic Voice-width checks passed 72 focused tests, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Provider opening-text fix passed 72 Avatar-focused tests, Convex TypeScript, targeted ESLint, diff validation, and the Node v22 production build; no deployment was configured locally.
- 2026-09-03 [TOOL] Avatar orientation grouping and portrait preview checks passed 73 focused tests, TypeScript, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Environment-aware Avatar link checks passed 84 focused tests, TypeScript, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Full-screen Avatar embed and Live-link placement checks passed 85 focused tests, TypeScript, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Screenshot-matched Live-link code block and icon controls passed 85 focused tests, TypeScript, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Live-link heading spacing refinement passed the focused Live-link and Avatar overview tests plus diff validation.
- 2026-09-03 [TOOL] Avatar idle-timeout coverage passed 87 focused tests, TypeScript, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Avatar idle-countdown coverage passed 89 focused tests, TypeScript, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] R2 cover-image and connecting-overlay coverage passed 94 focused Avatar tests, TypeScript, targeted ESLint, diff validation, and the Node v22 production build.
