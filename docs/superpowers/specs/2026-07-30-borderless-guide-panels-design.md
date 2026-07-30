# Borderless Guide Panels Design

## Goal

Make every informational panel in the KiloBot guide follow the same borderless visual language as React Docs callouts. Meaning should come from the panel's surface color, typography, and spacing rather than an outline or accent rule.

## Scope

The shared borderless treatment applies to:

- `DocPrerequisites` panels such as “Before you begin”
- `DocExample` panels
- `DocSuccess` panels such as “You’re done when”
- `DocMediaPlaceholder` image and video production briefs
- Existing Docusaurus Note, Info, Tip, Warning, Caution, and Danger admonitions

The Docusaurus admonitions are already borderless and remain unchanged.

Navigation cards, buttons, code blocks, the Quick Start banner, changelog controls, and other interactive or structural elements are outside this change. Their borders still communicate interaction or layout.

## Visual Treatment

All four shared guide-panel CSS modules remove their visible `border` and `border-left` declarations while retaining rounded corners and current outer spacing.

- Prerequisites use `var(--kilobot-muted)` so the panel remains distinguishable in light and dark themes.
- Examples retain `var(--kilobot-muted)`, lose the left accent rule, and use a fully rounded `0.75rem` shape.
- Success panels retain their semantic green surface and green heading without a green outline.
- Media placeholders retain their striped production-placeholder surface without the dashed outline.

Existing content hierarchy, titles, list spacing, accessible section semantics, and responsive behavior remain unchanged.

## Implementation Boundary

Only the four shared CSS modules change:

- `kilobot-docs/src/components/DocPrerequisites.module.css`
- `kilobot-docs/src/components/DocExample.module.css`
- `kilobot-docs/src/components/DocSuccess.module.css`
- `kilobot-docs/src/components/DocMediaPlaceholder.module.css`

The React components and individual MDX guide pages do not need per-page edits. This keeps the visual rule centralized and automatically covers every current and future use of these shared panels.

## Verification

Add a source contract that fails while any of the four informational panel roots contains a visible border or accent border. The contract also confirms each root retains a background and rounded corners.

Then verify:

- All docs tests and rendered guide-component tests pass.
- TypeScript and the Docusaurus production build pass under Node 22.
- Desktop light and dark themes show borderless prerequisites, examples, success panels, and media placeholders.
- A 390px viewport has no horizontal overflow and preserves readable panel padding.
- `git diff --check` passes.

## Release Status

This is an unreleased documentation presentation improvement. It belongs in `CONTINUITY.md` until a production availability date is confirmed and does not receive a public changelog entry yet.
