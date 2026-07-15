# Workflow Automation Thread and Action History Design

## Goal

Every successful workflow Reminder and Follow-up send must appear in the matching Inbox conversation and Action History. The Inbox item must contain the actual resolved customer-facing WhatsApp content, including resolved template parameters and any media header, rather than a template-name placeholder.

## Scope

- Applies to the workflow Reminder and Follow-up Workpool workers.
- Records only provider-confirmed successful sends.
- Does not create thread or Action History entries for skipped, failed, or cancelled runs.
- Preserves the existing Workflow History run and cost-accounting behavior.

## Send Result

`sendWorkflowWhatsappTemplate` will use the existing content-aware WhatsApp payload builder and return:

- the provider message ID;
- the resolved body text sent to the customer;
- the resolved image, video, or document header asset when present.

The provider request and the recorded Inbox item therefore use the same resolved payload. No second template rendering pass occurs after the send.

## Shared Success Recording

A focused shared workflow-automation recorder will handle the successful-send side effects for both automation kinds. It will:

1. ingest the resolved outbound into the existing conversation's agent-backed Inbox thread and channel message ledger;
2. retain the provider message ID and `workflowReminder` or `workflowFollowUp` source metadata;
3. update normal conversation preview and timestamp state through the established channel-ingestion path;
4. enqueue the corresponding Action History event;
5. leave the worker-specific run completion and follow-up scheduling responsibilities in their existing workers.

Reminder and Follow-up workers will call the same recorder so their persistence behavior cannot drift.

## Inbox Presentation

Workflow automation messages will remain right-aligned outbound messages and will render the normal WhatsApp-formatted text and attachments. They will use a dedicated, small presentation component that is visually quieter than the Broadcast card:

- a shared `border-primary/20 bg-primary/5` semantic tint in light and dark themes;
- a compact footer separated from the message body;
- a small `BellRing` plus `Reminder` label or `Clock3` plus `Follow-up` label in muted text;
- no template name in the message body;
- normal delivery state, timestamp, reactions, and attachment behavior remain available.

The distinction identifies the automation source without making the item look like an alert or replacing the content the customer received.

## Action History

The conversation log contract will support distinct `reminder_sent` and `followup_sent` actions.

- Reminder text: `Reminder sent: "<template name>"`.
- Follow-up text: `Follow-up sent: "<template name>" (attempt #<n>)`.
- Both use a system actor for workflow-generated sends.
- Metadata includes the workflow run ID and template name; Follow-up also includes the attempt number.

The existing Follow-up action remains compatible with legacy Follow-up sends.

## Error Handling

- Missing resolved content or an invalid media result fails the workflow send completion path visibly; it is not replaced with a template-name placeholder.
- A thread or Action History persistence failure must not be silently swallowed.
- Existing provider, run-status, cost-accounting, cancellation, and retry behavior remains authoritative.

## Testing

Tests will verify:

- the sender returns the exact resolved body and header asset used for the provider payload;
- successful Reminder and Follow-up completions ingest the resolved content with the correct source and provider ID;
- skipped, failed, and cancelled results do not create success records;
- Action History accepts and renders both actions with their metadata;
- Inbox mapping exposes the automation source;
- the dedicated thread item renders the correct label, content, and media path;
- ordinary outbound and Broadcast presentation remain unchanged.
