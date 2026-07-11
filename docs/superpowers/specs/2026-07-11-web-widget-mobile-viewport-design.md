# Website Widget Mobile Viewport Design

**Date:** 2026-07-11
**Status:** Approved for implementation

## Goal

Keep the public Website widget's native inputs and expanded chat fully inside the usable mobile screen as browser chrome and the on-screen keyboard change the visible viewport.

## Scope

This change applies to the public embedded widget in `public/widget/v1.js` for both `input_bar` and avatar layouts. It does not add React or shadcn to the embed, change the dashboard preview, alter messaging behavior, or change desktop dimensions.

## Input Behavior

- The embed continues to use native Shadow DOM `<input>` elements.
- Mobile inputs use a minimum `16px` font size so iOS does not zoom the host page when an input receives focus.
- Inputs retain the existing 48px composer height, send button, placeholder, keyboard submission, and focus behavior.
- Inputs expose an accessible label, `inputmode="text"`, and `enterkeyhint="send"`.
- The focused input remains above the visible keyboard and inside horizontal safe-area edges.

## Viewport Behavior

- When `window.visualViewport` is available, the widget observes its `resize` and `scroll` events.
- Measurements are coalesced through `requestAnimationFrame` and written to CSS custom properties on the widget wrapper.
- The properties represent the visual viewport's top, bottom, left, and right offsets within the layout viewport.
- Mobile wrapper, panel, and composer offsets combine those values with a 12px minimum edge and `env(safe-area-inset-*)`.
- The expanded panel stretches from the usable visual viewport top to the existing composer or launcher gap, so the message area shrinks when the keyboard opens and grows when it closes.
- The closed launcher and composer also remain within the usable visual viewport while mobile browser chrome moves.
- Orientation changes schedule the same viewport synchronization.
- Browsers without `VisualViewport` keep the existing fixed-position and `100dvh` fallback behavior.

## Runtime Constraints

The public widget remains a single dependency-free script. The viewport logic stays compact inside `public/widget/v1.js`, whose code length must remain at or below 300 lines. The `.wrap` element must remain free of transforms, filters, containment, or other fixed-position containing-block triggers.

## Failure and Edge Handling

- Negative or transient viewport offsets are clamped to zero.
- Repeated viewport events schedule at most one animation-frame update.
- A focus event schedules an additional measurement because mobile keyboards can begin opening immediately after focus.
- Safe-area values fall back to zero where unsupported.
- Existing desktop layout, scroll compaction, panel animation, message polling, and send behavior remain unchanged.

## Testing

Implementation follows test-first development.

Automated coverage must verify:

- VisualViewport resize and scroll listeners are registered;
- viewport updates are coalesced through `requestAnimationFrame`;
- top, bottom, left, and right offsets are clamped and written as CSS variables;
- orientation changes and input focus schedule synchronization;
- mobile CSS consumes viewport offsets and safe-area insets for the wrapper and panel;
- mobile input text is 16px;
- both native inputs include accessible mobile keyboard attributes;
- the existing `100dvh` fallback remains;
- `.wrap` remains free of containing-block triggers.

Browser verification must cover input-bar and right-avatar layouts at mobile portrait and landscape sizes, with the keyboard-equivalent visual viewport both expanded and reduced. The composer must stay visible and the panel must fit between its top edge and composer or launcher gap.
