# Workflow Automation Scope Selector Design

## Goal

Use a basic, accessible RadioGroup for the Reminder and Follow-up Apply to choice between Current & future and Future only.

## Interaction

- Render the two choices as one vertical shadcn RadioGroup.
- Compose each option from a horizontal `Field`, `RadioGroupItem`, `FieldContent`, `FieldLabel`, and `FieldDescription`.
- Rely on RadioGroup semantics so selecting either choice deselects the other.
- Keep the selection required before an automation can be enabled.
- Preserve pointer and keyboard selection behavior and the existing draft-only Save semantics.
- Do not introduce a default selection.

## Layout and Copy

- Each radio option shows its short label with `text-xs font-medium`.
- Each option always shows its existing one-sentence description with `text-[11px] leading-relaxed`.
- Keep validation text below the RadioGroup.
- Apply the same shared component to Reminder and Follow-up without changing their existing copy.

## Visual States

- Use the installed RadioGroup's native checked and unchecked treatments in light and dark themes.
- Do not wrap choices in button or card surfaces.
- Invalid state continues to expose `aria-invalid` and the existing destructive validation message.

## Testing

- Verify the shared control is a vertical RadioGroup with two horizontal Field rows.
- Verify both descriptions are paired with their labelled radio controls.
- Verify the old ToggleGroup is no longer used.
- Run the focused workflow scope and activation tests, targeted ESLint, TypeScript build, and `git diff --check` under Node 22.
