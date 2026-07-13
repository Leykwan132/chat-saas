# Workflow Automation Scope Selector Design

## Goal

Make the Reminder and Follow-up Apply to controls compact while preserving an explicit, accessible single choice between Current & future and Future only.

## Interaction

- Render the two choices as one horizontal, two-column shadcn ToggleGroup.
- Keep `type="single"` so selecting either choice deselects the other.
- Keep the selection required before an automation can be enabled.
- Preserve pointer and keyboard selection behavior and the existing draft-only Save semantics.
- Do not introduce a default selection.

## Layout and Copy

- Each button contains only its short label: Current & future or Future only.
- Both buttons share the available width equally, use a compact fixed height, and render labels with `text-xs font-medium`.
- Show only the selected choice's existing one-sentence description below the group using `text-[11px] leading-relaxed`.
- Before a choice is selected, show no scope description.
- Keep validation text below the selected description.
- Apply the same shared component to Reminder and Follow-up without changing their existing copy.

## Visual States

- Unselected choices use the existing outline treatment with modest `rounded-md` outer corners and a straight center divider.
- The selected choice uses the ToggleGroup pressed state and remains visually distinct in light and dark themes.
- Invalid state continues to expose `aria-invalid` and the existing destructive validation message.

## Testing

- Verify the shared control is horizontal and uses two equal columns.
- Verify descriptions are outside the buttons and selected through the current value.
- Verify it remains a single-select ToggleGroup.
- Run the focused workflow scope and activation tests, targeted ESLint, TypeScript build, and `git diff --check` under Node 22.
