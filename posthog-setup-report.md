# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into the Kilobot SaaS application. `posthog-js` and `@posthog/react` (already installed) were initialized in `src/main.tsx` with a `PostHogProvider` wrapping the router. A `PostHogIdentifier` component identifies users via WorkOS `user.id` on every session load. Eleven business-critical events were instrumented across 13 files, covering the full lifecycle from landing page CTA → checkout, onboarding (agent and team creation), channel setup, knowledge base population, team growth, and plan-limit churn signals.

LLM analytics were added in a second pass. A `convex/posthog.ts` fetch-based helper sends `$ai_generation` events directly to the PostHog HTTP API from within Convex's Cloudflare Workers runtime (where Node.js OpenTelemetry SDKs cannot run). Four AI call sites were instrumented: the main agent chat reply `usageHandler`, lead temperature classification, thread summary generation, and conversation sentiment analysis.

| Event | Description | File |
|---|---|---|
| `signup_cta_clicked` | User clicked the primary 'Start for free' CTA on the landing page | `src/pages/LandingPage.tsx` |
| `contact_request_submitted` | User submitted the contact form (enterprise, demo, or support) | `src/pages/ContactPage.tsx` |
| `plan_selected` | User clicked to select a pricing plan (free or paid) | `src/pages/PricingPage.tsx` |
| `checkout_initiated` | User was redirected to Stripe checkout after selecting a paid plan | `src/pages/PricingPage.tsx` |
| `agent_created` | User successfully created a new AI agent | `src/pages/CreateAgentPage.tsx` |
| `team_created` | User successfully created a new team workspace | `src/pages/CreateTeamPage.tsx` |
| `team_invitation_accepted` | User accepted an invitation to join a team | `src/pages/InvitationsPage.tsx` |
| `early_adopter_application_submitted` | User submitted an early adopter program application | `src/components/early-adopter/EarlyAdopterApplicationForm.tsx` |
| `channel_connected` | User connected a messaging channel (Instagram, Messenger, WhatsApp) | `src/pages/ChannelsPage.tsx`, `src/components/ConnectWhatsAppButton.tsx` |
| `upgrade_modal_opened` | Upgrade modal was triggered (plan limit hit) | `src/components/UpgradeModal.tsx` |
| `knowledge_base_item_added` | User added a knowledge base item (URL, file, or text) | `src/components/knowledge-base/WebSection.tsx`, `TextSection.tsx`, `FileSection.tsx` |

## LLM analytics — `$ai_generation` instrumentation

`$ai_generation` events are captured server-side in Convex via `convex/posthog.ts`. Each event requires the `POSTHOG_PROJECT_TOKEN` environment variable to be set in the **Convex dashboard** (Settings → Environment Variables). `POSTHOG_HOST` defaults to `https://us.i.posthog.com`.

| Span name | Description | File |
|---|---|---|
| `inbox_ai_reply` | Every streamed agent chat response (all token counts from `usageHandler`) | `convex/chat/threads.ts` |
| `lead_temperature_classification` | Lead scoring LLM call (hot/warm/cold) | `convex/chat/inboxActions.ts` |
| `thread_summary_generation` | Conversation summary LLM call | `convex/chat/inboxActions.ts` |
| `sentiment_analysis` | Customer sentiment detection LLM call | `convex/analyticsSentiment.ts` |

Each event captures `$ai_model`, `$ai_provider`, `$ai_input_tokens`, `$ai_output_tokens`, and `$ai_latency` (where available). The `$ai_trace_id` maps to `threadId` or `conversationId` so all generations for a conversation appear as a trace in PostHog AI Observability.

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/500079/dashboard/1805466)
- [Signup-to-Checkout Conversion Funnel](https://us.posthog.com/project/500079/insights/nZt7o3sv)
- [Agent & Team Creation Over Time](https://us.posthog.com/project/500079/insights/XnEw6KvJ)
- [Channel Connections](https://us.posthog.com/project/500079/insights/MNwhj2Xg)
- [Upgrade Modal Opens — Churn Signal](https://us.posthog.com/project/500079/insights/ejP1enhT)
- [Contact Requests & Early Adopter Applications](https://us.posthog.com/project/500079/insights/wbYRvB86)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` to `.env.example` and any onboarding/bootstrap scripts so collaborators know what to set.
- [ ] Set `POSTHOG_PROJECT_TOKEN` (and optionally `POSTHOG_HOST`) in the **Convex dashboard** under Settings → Environment Variables so the server-side `$ai_generation` captures reach PostHog.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or Vite's upload step) into CI so production stack traces de-minify in PostHog error tracking.
- [ ] Confirm the returning-visitor path also calls `identify` — the `PostHogIdentifier` component in `src/main.tsx` identifies on every session load via `useEffect([user])`, which handles this for authenticated users; verify it fires correctly after a page refresh with an active WorkOS session.
- [ ] Trigger the LLM call paths you instrumented (send a chat message in the playground, generate a thread summary) and confirm `$ai_generation` events appear in [PostHog AI Observability](https://us.posthog.com/ai-observability/generations).

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
