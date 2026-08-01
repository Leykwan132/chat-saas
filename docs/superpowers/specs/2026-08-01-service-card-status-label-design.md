# Service Card Status Label Design

## Goal

Make each service card’s enabled state understandable without relying on the switch position or color alone.

## Presentation

- Place a compact text label immediately before the existing switch in the bottom-right corner of each service card.
- Show `Active` when `service.isActive` is true.
- Show `Inactive` when `service.isActive` is false.
- Use neutral muted text for both states so the existing emerald checked switch remains the primary visual status cue.
- Keep the booking count, card dimensions, switch styling, and spacing compact.

## Interaction and Accessibility

- Keep the label and switch inside the existing click-isolated control area so selecting the switch does not navigate to service details.
- Preserve the existing switch action, disabled state, and accessible `Turn on` / `Turn off` label.
- The visible status label updates from the same `service.isActive` value as the switch.

## Scope

- Change only service cards on `src/pages/ServicesPage.tsx`.
- Do not add badges, new colors, backend fields, mutations, or status controls elsewhere.

## Verification

Render active and inactive service cards and verify their visible status text, switch checked state, and accessible action labels stay aligned.
