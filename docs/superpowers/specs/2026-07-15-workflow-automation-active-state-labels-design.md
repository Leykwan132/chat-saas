# Workflow Automation Active-state Labels Design

## Goal

Make the enabled state of the Workflow Reminder and Follow-up setup nodes immediately readable without relying on the switch position alone.

## Scope

- Add a visible state label immediately before the existing Switch in the Reminder setup header.
- Add the same state label immediately before the existing Switch in the Follow-up setup header.
- Do not change switch validation, activation, persistence, or error behavior.
- Do not change unrelated workflow nodes or switches elsewhere in the product.

## Presentation

Each setup header will group the state label and Switch in one right-aligned flex container. The label will reserve enough width for `Inactive` and align its text to the right so the Switch does not move when the state changes.

- Enabled: `Active` using the existing semantic success-green text treatment.
- Disabled: `Inactive` using neutral muted foreground text.
- The label uses compact text sized for the existing setup header.
- The Switch retains its existing green checked state.

## State and Accessibility

The visible label is derived directly from the same `automation.enabled` boolean passed to the Switch, so it updates immediately and cannot disagree with the control.

The existing Switch accessible name remains unchanged. The Switch's checked state already communicates its value to assistive technology, so the adjacent visual status text will not introduce a second interactive control.

## Testing

A focused source regression will verify that both Reminder and Follow-up setup nodes:

- render `Active` when `automation.enabled` is true;
- render `Inactive` when it is false;
- use success-green styling for Active;
- use muted-neutral styling for Inactive;
- keep the label immediately before the existing Switch.

Targeted lint, the focused test, the complete test suite, the production build, diff checks, and touched-code line counts will verify the finished change.
