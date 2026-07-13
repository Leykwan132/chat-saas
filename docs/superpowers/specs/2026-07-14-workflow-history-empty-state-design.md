# Workflow History Empty State Design

## Goal

Make the Reminder and Follow-up History dialogs feel less rounded and give the empty state enough visual structure without changing populated history.

## Approved Design

- Reduce the History dialog content radius from `rounded-4xl` to `rounded-2xl`.
- Apply the radius override only to `WorkflowAutomationHistoryDialog` so other dialogs keep their existing treatment.
- Render the existing shadcn `Empty` component as a soft inset panel using a subtle border, semantic `bg-muted/60`, `rounded-xl`, and tighter vertical padding.
- Keep the current History icon, title, description, header, dialog width, scrolling behavior, close action, pagination, queries, and populated history rows unchanged.
- Apply the same styling to Reminder and Follow-up because they share the dialog component.

## Component Boundaries

`WorkflowAutomationHistoryDialog` remains the only production component changed. The shared `DialogContent` and `Empty` primitives stay unchanged so this refinement cannot affect unrelated screens.

## States

- Empty: show the neutral inset panel around the existing icon and copy.
- Populated: render the existing history records with no added neutral background.
- Load more: preserve the current button and pagination behavior.

## Verification

- Add focused source assertions for the dialog radius and empty-state panel classes.
- Verify populated record styling does not receive the empty-state background.
- Run the focused History dialog test, targeted ESLint, `git diff --check`, and touched-file line counts under Node 22.
