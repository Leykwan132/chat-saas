# Workflow Node Controls Design

## Goal

Make the full editable workflow canvas the direct place to configure each action’s primary behavior, while keeping compact and template-preview nodes unchanged.

## Workflow Header

- The Workflow toolbar shows this one-line description below its title: “Map how your agent responds, sends content, handles bookings, and routes conversations.”

## Direct Node Controls

- Standard-density editable nodes render a focused, node-specific control beneath their title and existing short description.
- The control saves independently and immediately. It stops canvas click and pointer propagation so editing does not select or drag the node.
- Compact nodes and template previews retain their current title-and-description presentation without direct controls.
- The inspector remains available for the node title and complete configuration, but its Apply action must not overwrite direct control changes.

## Action Controls

- **Send message** exposes its message text in an inline textarea. A short debounce saves changes through a focused node-content mutation and preserves the subscribed value after errors.
- **Send photo/video** and **Send files** expose the existing compact media grid and uploader directly in the node. Upload, delete, and status behavior remain the same as the existing media section.
- **Book appointment** retains its shared service-switch controls and immediate service-selection mutation.
- **Human escalation** shows an inline `When` condition based on its incoming edge. Its condition label and detail save immediately through a focused condition mutation, so the handoff reason is visible and editable at the point of escalation.
- **Close conversation** displays its fixed close outcome without introducing a non-existent setting.
- **Start** and **End** remain structural nodes without controls.

## Data Flow and Boundaries

- Flow-node data carries the current agent ID for all direct-control components, plus incoming condition data for its target node.
- Direct controls receive node ID, agent ID, current value, disabled state, and an immediate-save callback or dedicated mutation. They do not edit the workflow graph structure.
- The full canvas owns node-level direct controls. The inspector owns expanded configuration that does not appear in a focused node control.

## Error and Loading Behavior

- Direct controls use optimistic local state while their immediate save is pending, disable only their affected input or switches, restore subscribed state if saving fails, and show the existing error toast style.
- Media controls use their existing loading states and upload/delete error handling.

## Verification

- Add behavior tests for each direct node control: message editing, media rendering, booking switches, and human-escalation `When` condition data.
- Verify compact and template-preview nodes do not render direct controls.
- Verify workflow header description and flow data carry agent and incoming-condition context.
- Run focused tests, TypeScript validation, `git diff --check`, and the full suite with Node v22.
