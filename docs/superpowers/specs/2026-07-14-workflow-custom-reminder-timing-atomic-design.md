# Atomic Custom Reminder Timing Design

## Goal

Prevent new custom reminder selections from storing a timing ID without its matching option metadata.

## Root Cause

Saving a custom timing currently calls `addReminderCustomTimingOption(option)` and then `onUpdateOptionId(option.id)`. Both updates are derived from the same render-time `configs` snapshot. The second update can overwrite the first, leaving `timingOptionIds` with `customReminderTiming:15:minutes` while `customTimingOptions` does not contain that option. Summary rendering then throws because the selected ID cannot be resolved.

## Approved Design

- Replace the separate custom-option insertion action with one `setReminderCustomTimingOption` context action.
- In one `onChange` call, add the option when it is not already stored and set `timingOptionIds` to that option’s ID.
- Keep preset timing selection on the existing `setReminderTimingOptionIds` path.
- Have the custom timing dialog call only the atomic custom action before closing.
- Preserve option IDs, labels, units, validation, dialog behavior, and reminder summary behavior.
- Do not reconstruct, silently repair, or otherwise recover previously corrupted configurations.

## Component Boundaries

- A small pure helper owns the reminder-config transformation and can be tested without React.
- `WorkflowAutomationStateProvider` exposes the atomic context action and performs one `onChange` call.
- `WorkflowReminderTimingRow` invokes the atomic action for custom values and continues using its callback for presets.

## Data Flow

The dialog validates the amount, builds a `WorkflowReminderCustomTiming`, and passes it to the context action. The helper returns a reminder config containing both the deduplicated option metadata and `[option.id]` as the selected timing. The provider emits the resulting automation configuration once.

## Error Handling

Invalid non-positive or non-integer amounts continue to be rejected in the dialog. Existing configurations missing custom metadata remain strict and may still fail, matching the prevention-only scope.

## Verification

- Add a pure regression test using `customReminderTiming:15:minutes` that asserts the metadata and selected ID are committed together.
- Assert repeated selection does not duplicate the stored custom option.
- Update the focused timing-row test to require the atomic context action and reject the old two-call sequence.
- Run the focused reminder timing and summary tests, targeted ESLint, `git diff --check`, and touched-code line counts under Node 22.
