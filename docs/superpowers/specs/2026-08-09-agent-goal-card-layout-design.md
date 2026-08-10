# Agent Goal Card Layout Design

## Context

The goal choices currently inherit the standard toggle control’s very rounded corners and compact eight-pixel group gap. This makes the cards feel crowded and the selected light fill does not create a clear enough active state.

## Approved layout

The Support and Book a Service goal cards remain a two-column desktop grid and stack on narrow screens.

The card group uses a 16px gap. Each card uses 20px padding, a 16px (`rounded-2xl`) corner radius, and a 160px minimum height. Icon, title, and description have a 16px vertical gap.

## Selection state

Unselected cards retain their neutral outline and transparent background.

The selected card keeps its existing muted background and adds a foreground-colored border with a subtle foreground ring. Keyboard focus styling remains provided by the shared toggle primitive.

## Boundaries and verification

The change is limited to `CreateAgentGoalStep` and its static-markup test. It does not alter goal values, labels, descriptions, creation behavior, responsive column count, or shared toggle primitives.

Focused coverage asserts the spacing, reduced card radius, and selected-state border/ring classes render in the goal step.
