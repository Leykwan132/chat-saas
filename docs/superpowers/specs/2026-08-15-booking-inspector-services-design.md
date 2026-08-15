# Booking Inspector Services Design

## Goal

Let workflow builders confirm the services enabled for a Book appointment node from its detail panel, while preserving the workflow node as the only place where booking-service selection is edited.

## Inspector Experience

- The standard Book appointment detail panel includes a Services section beneath its editable node configuration.
- It lists only the active services currently enabled for that node.
- Each row shows the service name and its assigned-teammate count. Hovering the count lists the assigned teammates by name.
- Service descriptions and selection switches do not render in the inspector.
- When no active service is enabled, the section states that no services are selected.

## Editing Boundary

- The workflow node remains the single direct-editing surface: its switches save selection changes immediately.
- The inspector service list is read-only and does not contribute service IDs when Apply saves the node title or condition.
- The inspector reads the same authorized service query as the node, so its teammate names and counts remain consistent with the canvas.

## Data and Errors

- Existing service query behavior remains unchanged: only active, unarchived services are eligible, while legacy assignment records treat all current teammates as assigned.
- The inspector uses the current workflow-node service IDs, treating a missing list as every active service enabled to preserve legacy behavior.
- While the query is loading, the section uses a compact loading placeholder.

## Verification

- Add inspector coverage that Book appointment details render enabled service names and teammate availability, exclude unselected and inactive services, and retain no editable service switches.
- Run focused tests, TypeScript validation, `git diff --check`, and the full test suite using Node v22.
