# Custom Reminder Timing Serialization Design

## Goal

Prevent custom reminder timing selections from placing React UI metadata in persisted workflow automation state.

## Root Cause

`createWorkflowReminderTimingOption` returns a UI option containing a Lucide `Icon` component and `description` alongside the timing data. Structural TypeScript compatibility allows that richer object to be passed to `applyWorkflowReminderCustomTiming`, which currently stores the object unchanged. Convex then traverses the React component and rejects its reserved `$$typeof` field.

## Approved Design

- Keep the rich timing option returned by the UI factory so reminder menus can render icons and descriptions.
- Treat `applyWorkflowReminderCustomTiming` as the persistence boundary.
- Project every incoming option to `amount`, `id`, `label`, `summaryLabel`, and `unit` before storing it in `customTimingOptions`.
- Continue selecting the same option ID atomically and deduplicating stored custom timings by ID.
- Do not weaken Convex validation or add Save-time cleanup.

## Component Boundaries

- `workflowReminderOptions` remains responsible for presentation-ready timing options.
- `applyWorkflowReminderCustomTiming` converts a presentation-ready option to the strict shared data shape before it enters workflow state.
- Convex continues receiving and validating only the documented workflow timing fields.

## Data Flow

The custom timing dialog creates a rich UI option. The workflow state helper extracts its serializable timing fields, stores that projected value, and selects its ID in the same state transition. Workflow Save then sends plain data without React component metadata.

## Error Handling

The helper does not silently remove arbitrary fields from existing stored configurations or weaken backend validation. It prevents new UI-only metadata from entering state at the point where custom timings are selected.

## Verification

- Add a regression test that uses the actual UI timing-option factory.
- Assert the stored custom timing contains exactly the five supported data fields.
- Assert `Icon` and `description` are absent from persisted workflow state.
- Preserve the existing atomic selection and deduplication assertions.
- Run the focused custom timing tests, targeted ESLint, `git diff --check`, and touched-code line counts under Node 22.
