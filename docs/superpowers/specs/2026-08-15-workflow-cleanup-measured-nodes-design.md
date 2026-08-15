# Workflow Cleanup Measured Nodes Design

## Goal

Keep Cleanup layouts free of node and control-rail collisions after full editable workflow nodes gained inline controls.

## Root Cause

Cleanup currently supplies Dagre with fixed heuristic node dimensions based only on title and description. It does not receive the actual React Flow dimensions after inline message, media, service, and condition controls render. Dagre therefore places expanded nodes using the old compact-card footprint.

## Approach

- The workflow canvas reads the measured dimensions of the currently rendered persisted nodes when Cleanup is requested.
- Cleanup passes those dimensions through the page action into the existing layout calculation; only position results continue to be persisted.
- The layout calculator uses a measured width and height when both are finite positive values. Its current deterministic node-size model remains the fallback for unmeasured nodes, template graphs, and initial render.
- The existing control rail remains part of the static fallback only. Measured dimensions already include it, so Cleanup must not add it a second time.
- Edge routing continues to use the deterministic fallback geometry. This change fixes layout placement without altering edge behavior or workflow data schemas.

## Scope

- Standard editable canvas nodes use their real rendered dimensions when Cleanup runs.
- Compact/template views retain existing fallback layouts and do not require rendered dimensions.
- Horizontal and vertical Cleanup preserve their current orientation; the fix adds appropriate spacing rather than changing the layout style.
- No database migration or backend API change is required because only final positions are stored.

## Verification

- Add a layout regression test showing that measured expanded nodes on the same rank do not overlap.
- Add an action/persistence test that carries valid measured dimensions into Cleanup while ignoring invalid measurements.
- Verify existing fallback layout tests, TypeScript, `git diff --check`, and the full Node v22 test suite.
