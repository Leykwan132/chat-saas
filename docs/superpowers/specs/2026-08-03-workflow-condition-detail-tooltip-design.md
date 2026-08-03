# Workflow condition detail tooltip

## Goal

Let people read a workflow edge’s full configured condition when its visible condition label is truncated.

## Behavior

- The edge continues to show its short condition label in the existing compact pill.
- Hovering or keyboard-focusing that pill opens an accessible tooltip containing the full stored condition detail.
- The tooltip is absent when the edge has no condition detail.
- Clicking the pill still opens the target node inspector and does not require a separate interaction.

## Data flow

`workflowGraphToFlow` adds each edge’s stored detail to the flow-edge data. `WorkflowEdge` consumes that data through the existing shared tooltip primitive, without altering edge persistence or routing.

## Verification

Focused flow-model coverage verifies detail propagation, and edge rendering coverage verifies the tooltip is available for a labeled edge with detail while preserving the target-node selection action.
