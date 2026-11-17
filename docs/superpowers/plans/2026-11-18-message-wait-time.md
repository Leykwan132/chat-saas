# Message wait time implementation plan

**Goal:** Group consecutive customer input after five quiet seconds, using delayed Workpool work and one active AI run per conversation.

**Architecture:** Persist per-conversation coordination and ordered child input rows. One delayed mutation rechecks the current deadline and claims an AI run; more arrivals update the deadline without adding wake jobs. Existing media work prepares original agent messages and signals readiness. Generation reads an explicit pending range plus anchored history; revisions gate delivery and completion advances the answered cursor.

**Tech stack:** Convex, existing Workpool/Agent components, React/shadcn, Vitest/convex-test, Node22.

**Spec:** `docs/superpowers/specs/2026-11-18-message-wait-time-design.md`.

## Constraints

- Keep all new code modules under300 lines; no comments, silent fallback or empty catch.
- Preserve public/internal ingestion and AI-worker entrypoints; do not introduce external infrastructure or continuous polling.
- Node22 in every script/test shell. Preserve unrelated widget/changelog/reports/ledger edits.
- Existing agents use the selected product default5s when the optional persisted setting is absent;0s is an explicit immediate setting. No production deployment implied.
- Keep urgent keyword handoff immediate. Avatar/playground stay immediate. Customer-facing changes remain unreleased in the ledger.

## Review focus

- Simultaneous arrivals/duplicate wakes cannot create parallel conversation runs.
- New input during workpool queueing/generation invalidates unsent output; input after delivery begins belongs to next group.
- Media completion cannot enqueue a second independent reply or silently treat failed preparation as ready.
- Human replies, assignment changes, closure and disabling AI invalidate queued work.
- Failed or uncertain delivery must not silently acknowledge input or automatically repeat external sends/bookings.

## Task1: Durable reply coordination

- [x] Write failing tests using real Workpool registration for burst deadlines, duplicate inputs, old wake generations, independent chats, single active claim, completion/failure and takeover.
- [x] Add schema in `convex/inboundReplySchema.ts`: coordinator, ordered input references and run records, indexed by conversation/input/sequence.
- [x] Implement queue/deadline helpers in `convex/inboundReplyQueue.ts`, claim/completion/delivery operations in small separate modules; register delayed mutations with `inboxAiReplyPool.enqueueMutation` and action completion callbacks.
- [x] Run coordinator tests and inspect actual pending work counts and atomic state transitions.

## Task2: Grouped generation and readiness

- [x] Add failing tests for exact ordered pending range, mixed prepared media, context cutoffs and missing/revoked sources.
- [x] Add `convex/chat/inboundReplyInput.ts` to load original Agent messages explicitly and prior history anchored before the first group message; no duplicate prompt persistence.
- [x] Add optional run identifier to existing worker entrypoint, validate at start, use grouped context in both workflow planning and response generation, claim delivery before sending, and acknowledge only known delivery success. Workpool callback releases the active claim on all outcomes.
- [x] Route successful media completion into coordinator readiness; make preparation failures explicit.

## Task3: Ingestion and settings

- [x] Route WhatsApp/Instagram/Messenger/web-widget incoming work and WhatsApp edits through the coordinator; media arrivals enqueue a not-ready input immediately. Keep immediate keyword escalation.
- [x] Add trigger invalidation for human replies, closure, reassignment and AI disablement without reviving old work on re-enable.
- [x] Add agent-scoped Message wait time settings with routing authorization, explicit0–60 whole-second validation and default5s; add a separate UI control below AI audience.
- [x] Test settings isolation/authorization, UI placement and source callsites, preserving old immediate/avatar/test entrypoints.

## Task4: Verification and PR

- [x] Run focused tests, appropriate backend/app checks, scoped lint/format and full suite; report unrelated existing landing-widget failure separately.
- [x] Independent review of state races, media, booking/idempotency and delivery; fix findings with regression tests.
- [ ] Update the existing open PR if still open, excluding unrelated edits. Update continuity; no production changelog until production release is confirmed.
