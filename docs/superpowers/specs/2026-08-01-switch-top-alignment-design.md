# Switch Top Alignment Design

## Goal

Align the availability and service-card switch controls with the top content line of their cards.

## Scope

- Change the workflow Book appointment availability-row control wrapper from centered to top alignment.
- Change the Services card status-and-switch wrapper from centered to top alignment.
- Preserve switch size, labels, state, permissions, keyboard behavior, card navigation isolation, and all other spacing.

## Verification

- Extend existing source/render contracts to require top-aligned control wrappers in both components.
- Run the two focused component/page tests and scoped lint under Node v22.
