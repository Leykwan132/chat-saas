# Reminder Summary Notice Design

## Goal

Move the reminder eligibility notice from the Reminders setup card into the Summary card so the audience constraint appears beside the generated reminder summary.

## Design

- Remove the dashed notice callout from `WorkflowReminderSetupNode`.
- Render the same dashed notice callout directly below the descriptive paragraph in `WorkflowReminderSummaryNode` and before its separator.
- Keep the existing notice copy: `Reminders will only be sent to customers with booked appointments.`
- Replace the calendar-check icon with Lucide's `Info` icon to communicate a general notice rather than an appointment action.
- Preserve the existing callout spacing, border, background, typography, and semantic colors.

## Scope

This is a presentational change only. Reminder configuration, summary values, validation, persistence, and backend behavior remain unchanged.

## Verification

- Add or update a focused source-level component test that verifies the notice is absent from the setup node and present in the summary node with the `Info` icon.
- Run the focused test under Node 22.
- Run targeted lint, `git diff --check`, and touched-code line-count checks.
