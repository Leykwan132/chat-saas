# Human escalation and auto de-escalation

2026-11-15 [USER] Approved moving Human Escalation beneath Instructions, preserving existing escalation rules, and adding working auto de-escalation.

## Behavior

Existing escalation conditions, keyword detection and pre-handoff messages remain backed by the existing workflow nodes and edges. Hide these nodes and their incident edges on the canvas and remove Human Escalation from its add menu. Show all existing escalation configurations beneath Instructions; allow adding a configuration there, including for agents without one.

Auto de-escalation is an agent setting, off until explicitly configured. When on, users enter a positive whole number of minutes (up to 43,200, 30 days) and optional trigger phrases. The timer starts on a new escalation and resets on each successfully recorded human teammate reply, including media replies. Customer messages and AI messages never reset it or trigger keyword resolution. Match phrases case-insensitively in text teammate replies. Only replies sent after escalation qualify; failed or queued sends do not qualify. Trigger phrases are customer-visible reply content, not private commands.

When the timer expires or a phrase matches, clear escalation, set status Open and enable AI. Preserve agent and human assignments. AI waits for the next customer message; never replay old messages or send an unsolicited response. Manual resolve, closure, reassignment, a newer escalation, or disabling the feature prevents stale jobs from resuming AI. Changes apply to new escalations; human replies use current settings. Existing armed deadlines survive enabled-setting edits. Disabling and re-enabling invalidates old jobs. Both AI-agent and human-owner reassignment invalidate old jobs. Queued replies use successful-send time. Workflow template replacement preserves existing Instructions escalation rules and their conditions, reconnecting removed sources to the new entry node; templates do not create hidden escalation settings. Disabling is checked by pending timers.

## Approach

Keep workflow nodes as the existing escalation engine and move their UI only. Introduce a small agent-level auto-de-escalation configuration and isolated runtime module with durable scheduled timers. This preserves existing behavior and configurations without a data migration. Replacing the escalation engine with a new agent-only model would create unnecessary migration and prompt changes.

## Implementation choices

Use existing React/shadcn controls and Convex scheduler. No dependencies. New modules under 300 lines; keep integrations in existing large modules minimal rather than broad unrelated rewrites. Validate ownership, timer bounds and phrase limits. Cover timer reset/stale jobs, sender distinction, failed sends, isolation and UI visibility. Work remains unreleased until production availability is confirmed; record in CONTINUITY.md instead of release changelog.
