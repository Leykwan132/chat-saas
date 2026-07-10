# Website Widget Scroll Compaction Design

**Date:** 2026-07-11
**Status:** Approved for planning

## Goal

Reduce the visual space occupied by the public Website widget input while a visitor scrolls the host webpage, then smoothly restore the normal input after scrolling stops.

## Scope

This behavior applies only to the public widget's `input_bar` layout when its conversation is closed and its input is unfocused. The open conversation panel, focused input, left-avatar layout, right-avatar layout, and dashboard setup preview keep their current behavior.

No backend, persisted setting, embed API, or widget configuration changes are required.

## Interaction

- The normal input remains `280px × 48px` on desktop and `236px × 48px` on mobile.
- The first host-page scroll event changes the closed, unfocused input to a compact `132px × 40px` pill.
- The compact pill retains the input affordance and send control. Overflowing placeholder text is clipped rather than replaced with a different launcher.
- Each additional scroll event restarts a `180ms` scroll-stop timer.
- When no scroll event arrives for `180ms`, the input returns to its normal size.
- Size, padding, gap, shadow, and send-control changes ease over `220ms`.
- Focusing the input or opening the conversation immediately restores the full input, even if scrolling is still active.
- Scrolling while the conversation is open does not compact either the panel or its input.
- Visitors who prefer reduced motion receive the same states without an animated transition.

## Runtime Design

The public widget runtime keeps one `pageScrolling` boolean and one scroll-stop timer. A passive capture-phase listener on the host window observes document and nested host scroller events without reading layout or blocking scrolling.

On a qualifying scroll event, the runtime sets `pageScrolling`, renders the `page-scrolling` class on the widget wrapper, clears the previous timer, and schedules the stopped state. Repeated events only restart the timer. Opening or focusing the widget clears the compact state immediately.

CSS scopes the compact appearance to `.layout-input_bar.page-scrolling` while the widget is neither open nor focused. The animated properties belong to `.bar` and its send control. The fixed `.wrap` must not receive `transform`, `translate`, `filter`, containment, or another fixed-position containing-block trigger because the mobile panel must remain viewport-relative.

The render path must preserve the existing `ready`, theme, layout, and open classes while adding the scrolling state. No message, polling, placeholder, or send behavior changes.

## Failure and Edge Handling

- A scroll event during an open conversation is ignored for compaction.
- A compact input click restores the full input before interaction continues.
- Programmatic page scrolling follows the same compact-and-restore behavior as user scrolling.
- If scrolling stops while the widget opens, the later timer callback is harmless because the compact state has already been cleared.
- The handler performs no measurements and only renders when the state changes, avoiding work on every scroll frame.

## Testing

Implementation follows test-first development.

Automated coverage must verify:

- host scrolling enters the compact state;
- repeated scroll events restart the `180ms` timer;
- the state clears after the timer expires;
- open and focused widgets remain full size;
- only the `input_bar` layout receives compact styling;
- desktop and mobile compact dimensions are `132px × 40px`;
- reduced-motion styling removes the transition;
- `.wrap` remains free of fixed-position containing-block triggers.

Browser verification must exercise the embedded public widget on scrollable desktop and mobile host pages, confirm the transition in both directions, click the compact input, and confirm the open panel retains its existing viewport-relative dimensions.

## Expected Working Set

- `public/widget/v1.js`
- `src/components/channels/WebWidgetMobileLayout.test.ts` or a focused widget-scroll test
- `public/widget-launcher-check.html` for local browser verification if the existing fixture remains available
