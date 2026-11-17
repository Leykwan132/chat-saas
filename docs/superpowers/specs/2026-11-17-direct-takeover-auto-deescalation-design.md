# Auto de-escalation after direct human takeover

A successful human reply in a paused conversation should start the assigned agent's configured inactivity timer even when no escalation is recorded. This includes WhatsApp Business app message echoes. Each subsequent successful human reply resets the deadline; expiry re-enables AI without sending a message.

## Approach

Extend the existing timer with an optional direct-takeover marker. Keep escalation identity checks for existing escalation timers, and require direct-takeover timers to still belong to the same paused, un-escalated conversation and assignments. Reuse the scheduler, setting activation checks, revision checks, and keyword handling. This avoids creating artificial escalation records or maintaining a second scheduler.

Closing, reassigning, manually resuming, or creating a new escalation invalidates a direct-takeover timer. Disabled settings do not create timers. Enabling settings does not scan or backfill old chats. Resume logs AI enablement; escalation resolution is logged only when an escalation existed.

## Verification

Regression tests reproduce missing timers before the fix, then verify expiry, reset, disabled settings, and invalidation through real database triggers. Existing escalation and configuration suites must continue to pass. Production deployment is outside this PR.
