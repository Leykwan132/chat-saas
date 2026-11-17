# Tag lookup and AI auto resume

2026-11-18 [USER] Requested a new branch, direct tag loading, and separate auto resume for ordinary business replies under Model & Style → AI Replies.

## Proposed behavior

2026-11-18 [CODE] Retain the existing local workflow Audience change to query the workspace tag catalog instead of loading customers. Verify workspace isolation and existing tag backfill availability before rollout. The screenshot's underlying production exception remains unconfirmed.

2026-11-18 [USER] Supersedes the shared-setting proposal: keep the existing escalation control under Human Escalation and introduce a separate Auto resume control under Model & Style → AI Replies for normal business replies. Preserve existing escalation settings.

2026-11-18 [ASSUMPTION] Each setting has its own enable switch, duration and optional keyword triggers. Successful human replies from Inbox and WhatsApp Business start or reset the applicable timer. Escalated chats exclusively use Human Escalation settings; ordinary chats exclusively use AI Replies settings. Entering escalation invalidates an ordinary-reply timer, so it cannot resume an escalated chat. AI-generated and automated messages do not reset either human inactivity timer. Resume enables AI for the next customer message; it does not send a message immediately.

2026-11-18 [ASSUMPTION] Preserve protections against stale scheduled jobs, configuration disable/re-enable, reassignment and closed conversations. Only clear escalation and record its resolution when an escalation actually exists.

## Approaches

2026-11-18 [USER] Separate normal-reply and escalation settings selected over a shared setting. [ASSUMPTION] Reuse internal scheduling logic with explicit timer scope and mutually exclusive applicability; avoid duplicating the runtime or allowing competing timers to enable AI.

## Status

2026-11-18 [USER] Separate-setting design approved. [CODE] Implemented locally on `codex/tag-lookup-and-ai-auto-resume`; existing unrelated edits preserved. [TOOL] Focused checks, application build, backend typecheck, formatting/lint and independent code review passed. Full suite: 2493 passed, one unrelated existing LandingAnnouncementPill test failure; documentation tests 63 passed separately. Not deployed.
