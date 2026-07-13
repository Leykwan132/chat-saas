# Workflow Reset Fit View Design

## Goal

After Reset restores the latest saved workflow draft, automatically fit the restored workflow to the visible canvas at the appropriate zoom.

## Design

WorkflowPage already maintains an `arrangeFocusRequest` counter that WorkflowCanvas passes to `useWorkflowCanvasView`. A changed request triggers the existing animated `fitView` path with view-specific padding after a short delay, allowing updated nodes and edges to render first.

Reset will continue restoring the saved draft, clearing applied-template metadata, and clearing selection. It will also increment the existing focus request counter. No fixed zoom percentage, new canvas API, backend change, or separate reset-specific viewport state is introduced.

## Failure Behavior

Reset remains a local synchronous operation. The fit request uses the existing cancellable timeout effect, so a later request or component unmount cancels the pending fit cleanly.

## Testing

The WorkflowPage source test will require Reset to restore the draft and increment the focus request. Existing canvas-view tests continue covering the request-driven `fitView` behavior and appropriate padding.
