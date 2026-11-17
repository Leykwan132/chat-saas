# Agent snapshot implementation plan

2026-11-17 [USER] Add one read-only get_agent_snapshot tool for a current agent overview, including unread activity, escalations and channel counts. [ASSUMPTION] Include total connected-inbox conversations, unread conversations, unread messages, status/channel counts, unassigned chats, chats with bookings, last activity and five recent conversations. Count conversations separately from messages and use the same escalation definition as the Inbox.

## Approach

Reuse existing incrementally maintained Inbox counters rather than scanning conversation history on every request. Extend existing counter keys with unread-message buckets and chat status; initialize historical counters with the existing idempotent batched backfill and require an explicit readiness marker. No schema change. Read the five newest agent summaries through existing indexes and recheck live conversation/channel authorization. Keep existing tool inputs stable and add an agentId-only snapshot operation and strict bounded output. Read-only capability remains conversations:read.

## Work

- [x] Add failing protocol, contract, counts, and authorization tests.
- [x] Extend counter keys and backfill marker; implement agent snapshot module and dispatch.
- [x] Register tool and extend shared/Convex validators, transport cursor/audit handling.
- [x] Format scoped files; run relevant integration and inbox tests, transport typecheck and deployment dry runs; review implementation.
- [ ] Deploy development Convex, initialize counters, update private Worker integration modules preserving the website modules/configuration, and deploy MCP staging with --keep-vars. Verify live snapshot via authenticated connection where available.

## Release

Development/staging only. No production changelog entry until production availability is confirmed. Preserve unrelated workspace changes. Code modules under 300 lines; Node 22 for all scripts.

2026-11-17 [TOOL] Development backend deployed and counters backfilled; real Kilobot snapshot verified (3 web chats, 0 unread, 2 escalated, 1 booking). Activation is blocked on user approval: automatic review rejected inspecting deployed website Worker code and binding metadata as beyond explicit authorization. Private module and MCP staging packages are built but not deployed.
