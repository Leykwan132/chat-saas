# Escalation reply choices

2026-11-15 [USER] Requested a choice between AI-written and manually written escalation messages. Also requested matching titles and field treatment across the Model & Style columns.

Use a single Custom escalation message (optional) switch. When on, send the configured text exactly. When off, AI generates a brief customer-facing handoff in the customer's language using the assigned agent's model/style. Preserve the custom text while switching off. Existing enabled manual messages remain custom/on; disabled or AI-mode settings use AI-written replies. The previous send-off/silent-escalation behavior and AI/manual buttons are explicitly superseded by the user's latest request.

Resolve current settings server-side for both keyword and model-triggered handoffs. Validate the source message and workflow ownership. For an unqualified model handoff, use the sole configured escalation rule; require a matching node ID if legacy configurations have multiple rules. Generate and deliver before pausing AI. Generation/delivery errors remain explicit and do not pause the conversation. Check availability again after generation. Use existing model resolution, usage tracking and model-priced credit deduction for AI-written messages; manual messages retain zero-credit behavior. No invented response times or assurances of human availability. Never expose escalation reasoning.

Add an optional workflow-node mode field. Reuse existing mutation and delivery APIs with optional arguments for compatibility. Keep modules under 300 lines. Local development only; no production deployment or changelog.

Align Model & Style and AI Replies columns: matching section title/description, followed by matching field labels and controls. Keep timing/audience settings in the second column. Existing saving behavior remains.
