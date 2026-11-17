# Message wait time

2026-11-18 [USER] Approved the scheduling/workpool approach after reviewing per-conversation timers and shared polling. Use five seconds initially; implement with delayed Workpool jobs and the existing AI workpool, without a periodic dispatcher.

## Customer-facing behavior

2026-11-18 [USER] Message grouping uses a system-managed five-second default. Do not expose wait-time customization or a settings API to clients. Supersedes the earlier proposed Message wait time control under AI Replies. The model's processing time follows the quiet wait.

2026-11-18 [ASSUMPTION] Save each incoming message immediately with its own identity, order and attachments. Keep one pending reply per conversation; a new eligible customer message restarts the five-second quiet window using server arrival time. Different conversations remain independent.

2026-11-18 [ASSUMPTION] After five quiet seconds, process all unanswered messages in the conversation together and generate one response. Preserve separate original messages in Inbox and the agent thread; do not create duplicate concatenated user messages.

2026-11-18 [ASSUMPTION] Supersedes cancel-and-replace scheduling on every message: persist a deadline, input revision, latest accepted inbound position, last successfully answered inbound position and processing claim per conversation. The first message schedules one durable callback. Further messages update the deadline/revision without replacing that callback. When it wakes, it reads the latest state: if the deadline moved, it schedules one replacement for the new deadline; otherwise it atomically claims work and clears the pending callback. Callback ownership uses a separate schedule generation/job identity, so changing input revision never leaves the sole callback unable to reschedule. Duplicate callbacks are harmless. Active-run completion schedules newer pending input if necessary.

2026-11-18 [ASSUMPTION] Claim an explicit cutoff and load every original pending message between the answered cursor and that cutoff in order, including prepared media, alongside prior conversation context. Do not rely on the model's default recent-history window to contain the entire pending group. Advance the answered cursor only after delivery succeeds; failed delivery retains pending input and an explicit retry state. Duplicate inbound events must not append another position or reset waiting.

2026-11-18 [ASSUMPTION] Text, images and voice notes belong to the same reply group. Media preparation may proceed independently, but a reply must await the group's required preparation. Existing media batching must signal the shared reply coordinator instead of enqueueing an additional reply. Explicit media failures remain visible and cannot be silently treated as ready.

## Processing and safety

2026-11-18 [ASSUMPTION] Allow at most one active AI run per conversation. Messages arriving during generation are saved and advance the conversation's input revision. Before dispatching a reply, check that revision. Suppress unsent obsolete output; process the expanded pending group after the active run finishes and the latest five-second quiet window has elapsed. A new message after delivery begins belongs to the next group; already delivered output cannot be recalled.

2026-11-18 [ASSUMPTION] Completed tool actions, especially bookings, retain stable source identifiers and idempotency protection across refreshed generations; discarding stale reply text does not undo actions or authorize repeating them. Do not claim cancellation of an already executing action.

2026-11-18 [ASSUMPTION] Recheck AI eligibility, agent/workspace/channel assignment, closure, human takeover and escalation before processing and sending. Explicit escalation keywords remain eligible for immediate handoff; waiting must not delay an urgent human handoff. Outgoing human messages invalidate pending AI work. System, historical-sync and duplicate webhook messages do not extend the quiet window.

2026-11-18 [ASSUMPTION] Use durable scheduler/workpool jobs and atomic revision/claim updates so retries or duplicate jobs cannot start multiple runs. No process-local sleep timers or global coordinator record. Per-conversation records isolate writes between conversations; same-conversation bursts still contend and require short transactions. Bound pending-group reads and page when necessary. Workpool concurrency bounds model/provider load; monitor backlog and load-test bursts before claiming throughput. Do not force processing before the quiet interval expires merely because more messages arrive.

## Scope and approaches

2026-11-18 [CODE] Current text webhook and web-widget paths enqueue separately. Media has a separate two-second quiet window/five-second cap. A shared conversation reply coordinator is the proposed implementation boundary, built on existing Convex scheduling/workpools; this replaces the immediate enqueue decisions without changing message persistence entrypoints.

2026-11-18 [ASSUMPTION] Apply to WhatsApp, Instagram, Messenger and website chat. Keep real-time avatar sessions and playground behavior immediate. Agent-specific rollout and configuration bounds remain implementation details to settle before activation; no production changes are implied.

2026-11-18 [ASSUMPTION] A fixed delay on every queued job would still produce multiple replies. A resettable quiet window plus a single active run addresses both burst grouping and overlapping generation; this is the recommended approach.

## Example and verification

2026-11-18 [ASSUMPTION] Messages arrive at 0s, 2s and 4s. AI generation starts at 9s and produces one response after model processing.

2026-11-18 [ASSUMPTION] Verify burst reset, duplicate delivery, simultaneous claims, cross-conversation isolation, mixed text/media readiness, new input during generation, input during delivery, human takeover, reassignment, disabled AI, closed chats, immediate keyword handoff, booking idempotency and persistent restart recovery.
