# Workflow History Internal Cancellation Reason Design

## Goal

Keep cancelled Reminder and Follow-up History records visible without exposing the internal `Workpool job cancelled` reason to users.

## Scope

- Preserve the `cancelled` status badge and the history row.
- Suppress only the exact internal reason `Workpool job cancelled`.
- Preserve meaningful reasons such as `Appointment cancelled` and failure details.
- Apply the behavior to both reminder and follow-up history, including existing stored records.

## Design

The shared Convex history query will redact the internal reason while projecting each run into its user-facing response. The database record and worker diagnostics remain unchanged, but the browser never receives the internal phrase.

The shared React history dialog continues rendering operational reasons when the API provides one. It requires no automation-specific branching because both histories use the same query and dialog.

## Data Flow

1. Reminder or follow-up workers may persist a cancelled run with `reason: "Workpool job cancelled"`.
2. `workflowAutomationHistory.list` reads the run.
3. Its response projection returns no reason for that exact internal value.
4. The shared history dialog renders the cancelled badge without secondary reason text.
5. All other reasons pass through unchanged.

## Error Handling

Redaction uses an exact comparison. Unknown or future reasons remain visible so operational failures are not silently hidden by a broad cancellation rule.

## Testing

A Convex query regression test will cover both automation kinds and prove that:

- the Workpool cancellation reason is absent from the response;
- the cancelled status and row remain present;
- meaningful cancellation and failure reasons remain unchanged.

The focused history tests and repository diff checks will run under Node.js 22.
