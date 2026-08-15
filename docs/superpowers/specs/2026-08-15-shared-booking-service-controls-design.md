# Shared Booking Service Controls Design

## Goal

Let workflow builders manage a Book appointment node’s services from either the canvas node or its detail panel, with identical service controls and immediate persistence.

## Shared Experience

- Both locations render the same `WorkflowBookingNodeServices` component.
- Every active service appears with its current on/off switch, service name, dotted-underlined teammate count, and teammate-name hover tooltip.
- The detail panel uses the component’s inspector presentation variant only to fit its surrounding layout; its rows and interactions remain the same as the canvas node.
- Compact and preview workflow nodes remain unchanged.

## Data and Saving

- The shared component continues to read the authorized booking-services query and save each switch immediately through the existing workflow-service mutation.
- A mutation applies an optimistic switch state, disables service switches during the save, restores subscribed state on failure, and displays the existing error toast.
- The detail panel supplies the same agent ID, workflow-node ID, allowed service IDs, and save-disabled state as the canvas node.
- Applying the inspector’s title or condition form does not include service IDs, so it cannot overwrite an immediate switch change.

## Component Boundary

- Remove the read-only `WorkflowBookingInspectorServices` component.
- Add a presentational variant to `WorkflowBookingNodeServices` for the canvas node and inspector container only; do not fork service query, switch, tooltip, or mutation behavior.

## Verification

- Extend workflow component coverage to confirm the inspector renders the shared switch-enabled component and that no read-only inspector component remains.
- Preserve behavior coverage for selection filtering, legacy all-active selection, and teammate count labels.
- Run focused tests, TypeScript validation, `git diff --check`, and the full suite with Node v22.
