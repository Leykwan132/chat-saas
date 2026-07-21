# Landing Workflow Preview Density Design

Date: 2026-07-21
Status: Approved

## Goal

Make the landing-page application demo open on Workflow by default and make only its workflow nodes approximately 15% smaller, including the text and attached node controls. The authenticated product workflow must remain visually and behaviorally unchanged.

## Current State

`LandingAppPreview` initializes both its active sidebar key and active section to Overview. The landing workflow preview adapts mock data into the production `WorkflowCanvas`, and its persisted nodes use the shared `WorkflowNode` renderer. The renderer currently has one fixed density for card dimensions, padding, typography, icons, handles, and attached add/delete controls.

## Chosen Approach

Add an optional compact display density to the shared persisted workflow-node data and renderer. The landing preview will request the compact density when it adapts its mock graph to React Flow. Every other caller will omit the option and continue receiving the existing standard density.

This keeps workflow behavior in one renderer while creating an explicit preview-only styling seam. It avoids scaling the whole canvas, which would alter framing and zoom behavior, and avoids a separate landing renderer that would duplicate interaction logic.

## Default Landing State

`LandingAppPreview` will initialize both pieces of navigation state to Workflow:

- The Workflow sidebar item is selected on first render.
- The Workflow section is rendered on first display.
- Existing sidebar navigation remains interactive, so visitors can still open Overview and Agent Setup.

Keeping the navigation key and section ID aligned prevents the sidebar highlight from disagreeing with the displayed content.

## Compact Node Density

The compact density applies only to persisted workflow nodes inside `LandingAppPreviewWorkflow`.

The complete node presentation will be reduced by approximately 15%:

- minimum and maximum card widths
- minimum card height
- card padding, gaps, and corner radius
- title and description typography
- node icons and entry-icon container
- source and target handles
- attached add and delete controls, including their spacing from the card

The node title, description, selection treatment, hover treatment, connection behavior, dragging, add/remove actions, and inspector interaction remain unchanged.

The canvas toolbar, background, edges, inspector dialog, and the rest of the landing application shell keep their current size. Popover or dialog surfaces opened from a node remain readable at their existing size; the compact treatment concerns the node card and its directly attached controls.

## Production Isolation

The shared workflow-node data type will make density optional. Standard density remains the renderer default, so existing product callers do not need changes and cannot accidentally inherit the landing treatment.

Only the landing workflow adapter will set compact density. No global CSS selector, page-level transform, or production workflow layout constant will change.

## Data and Error Handling

This is a presentation-only change. It introduces no API calls, persistence, schema changes, fallback behavior, or new error states. Existing strict lookup failures for unknown landing sections remain unchanged.

## Testing

Implementation will follow a red-green cycle with focused regression tests that prove:

1. The landing demo initializes its active navigation key and active section to Workflow.
2. The landing workflow adapter explicitly requests compact node density.
3. The shared workflow renderer supports compact sizing while retaining standard density as the default.
4. Compact sizing includes the card, typography, icons, handles, and attached controls.
5. Existing landing workflow interactions and production workflow-node expectations still pass.

Focused Vitest coverage, relevant workflow regressions, scoped lint, `git diff --check`, and the project code-file line limit will be verified on Node 22.

## Out of Scope

- Changing production workflow node sizes
- Resizing the landing canvas toolbar, inspector, edges, or application shell
- Changing landing demo data or workflow behavior
- Changing mobile visibility or responsive breakpoints for the landing demo
