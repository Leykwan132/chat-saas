# Website Widget Mobile Input Lift Design

**Date:** 2026-07-11
**Status:** Approved for implementation

## Goal

Move the public Website widget's mobile `input_bar` composer 8px upward so the visible open-state gap beneath the chat panel decreases from about 20px to about 12px.

## Scope

The change applies only to the public embedded widget's mobile `input_bar` layout in portrait and coarse-pointer landscape mobile rules. The expanded panel keeps its existing viewport-relative position and size. Avatar layouts, desktop layout, dashboard preview, scroll compaction, safe-area handling, and keyboard behavior remain unchanged.

## Layout

Add a `--mobile-input-lift:8px` widget variable. The mobile `input_bar` wrapper bottom offset adds that value after the VisualViewport bottom offset and safe-area edge are calculated. The panel continues using its existing bottom formula, so only the composer moves upward.

The existing focused `translateY(-2px)` remains. With the 8px wrapper lift, the focused visual gap is expected to reduce by 8px without overlap.

## Testing

Implementation follows test-first development. Automated coverage must require the 8px variable and a mobile `input_bar` bottom override that consumes it, while confirming the avatar panel offset remains unchanged. Rendered verification must check the open input-bar layout at a mobile viewport and keyboard-reduced VisualViewport, confirming the composer is closer to but does not overlap the panel.
