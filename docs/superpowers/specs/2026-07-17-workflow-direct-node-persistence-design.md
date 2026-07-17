# Workflow Direct Node Persistence Design

## Summary

Message Handling becomes a direct-persistence editor. Adding a node creates the real Convex node and edge immediately, then opens the node inspector with the persisted node ID. Media nodes can upload images, videos, and files during that first inspector session. Applying node settings persists them immediately, so users never need a second toolbar Save for message-handling changes.

Manual dragging remains temporary canvas state. It does not write node positions, mark the workflow dirty, or expose Save/Discard actions. Cleanup and Arrange remain the deliberate controls for persisting an organized layout.

Reminder and Follow-up configuration remain draft-based. Direct message-graph actions must preserve any unsaved automation settings and must never save them implicitly.

Starter templates use a read-only canvas preview before replacement. Previewing never mutates the current workflow. The user explicitly chooses `Replace Current` to persist the template or `Skip` to return unchanged.

This design supersedes the draft-only Message Handling behavior in `2026-07-13-workflow-discard-template-interactions-design.md`. Its visual styling decisions remain active where they still apply.

## Goals

- Create a persisted workflow node and incoming edge from one Add Node selection.
- Open the new node inspector as soon as the creation mutation succeeds.
- Allow media upload during the first inspector session.
- Make Apply the complete save boundary for node and incoming-condition configuration.
- Remove the leading check icon from Apply while retaining its loading spinner.
- Keep manual node dragging transient and outside dirty-state calculation.
- Persist positions only through Cleanup or Arrange.
- Preview starter templates on the canvas before replacing the current message graph.
- Make template preview visually distinct and read-only, with centered `Replace Current` and `Skip` actions.
- Preserve unsaved Reminder and Follow-up configuration across every direct Message Handling mutation.
- Keep backend authorization, node limits, terminal-node restrictions, media validation, and workflow concurrency protection.

## Non-goals

- Auto-saving manual drag positions.
- Staging media against browser-only draft node IDs.
- Saving Reminder or Follow-up settings when a message node changes.
- Changing media type, size, quota, deletion, or storage rules.
- Changing landing-page workflow-preview persistence.
- Adding a new confirmation dialog for routine node operations.
- Using a modal or side-by-side panel for starter-template preview.
- Removing Save/Discard from Reminder and Follow-up automation drafts.

## Persistence Boundary

The editor has four independent state categories:

1. **Persisted message graph:** workflow nodes, edges, node configuration, incoming edge conditions, selected appointment services, applied starter templates, layout orientation, and canonical Cleanup/Arrange positions.
2. **Draft automation configuration:** Reminder and Follow-up settings remain local until their existing Save action is used.
3. **Transient canvas state:** positions created by manual dragging exist only inside the current React Flow canvas session.
4. **Transient template preview:** a selected starter template replaces only the canvas presentation until the user confirms or skips it.

Message graph mutations return the latest persisted graph. The editor adopts the returned nodes, edges, and layout immediately while retaining the current automation draft unchanged.

The automation Save boundary always combines the latest persisted message graph with the local automation draft. A direct message-graph mutation therefore advances the workflow timestamp without discarding or silently committing automation edits.

## Add Node Flow

1. The user opens an existing persisted node's Add Node menu and chooses a kind.
2. The editor disables duplicate creation for that source while the request is pending and invokes the authenticated `workflows.addNodeAfter` mutation.
3. Convex validates ownership, the source node, terminal-node restrictions, and graph limits, then inserts the node and its incoming edge in one transaction.
4. The mutation returns the latest persisted graph.
5. The editor identifies the new child from the before/after graphs, adopts the returned message graph, and selects the new persisted node ID.
6. `WorkflowInspector` opens for that node. Send Photo/Video and Send Files nodes render the normal media uploader immediately.
7. A failed mutation leaves the graph and selection unchanged and shows one error toast.

There is no browser-only node, draft-node placeholder, global workflow Save, or reopen step in this flow.

## Node Inspector Apply

Apply uses one authenticated Convex mutation that atomically updates:

- node title;
- node description or message content;
- incoming edge condition label and detail when present; and
- allowed appointment service IDs for Book Appointment nodes.

The mutation validates all fields before writing and returns the latest persisted graph. The dialog remains open and shows the existing loading spinner while the mutation is pending. On success, the editor adopts the graph and closes the dialog. On failure, the dialog remains open with the user's values intact and shows one error toast.

The Apply button contains only the `Apply` label while idle. The leading check icon is removed. The loading spinner remains visible during persistence.

## Template Preview

Each starter-template card replaces the existing `Try now` cue with `Preview`. The whole card remains pointer- and keyboard-activatable. Selecting it closes the template picker and enters a client-only preview state.

Preview state:

- renders the selected template graph across the existing Message Handling canvas;
- fits the complete template into view;
- uses a low-opacity semantic primary tint over the canvas background, including a stronger dark-mode tint;
- shows a visible `Previewing: [Template name]` label;
- disables adding, deleting, connecting, dragging, edge selection, node inspectors, media upload, Cleanup, Arrange, and other graph-editing controls;
- preserves the current persisted graph, canvas state, and automation draft unchanged; and
- exposes only the centered preview decision panel for template actions.

The centered decision panel uses the normal background surface and contains:

- `Replace Current` as the primary button; and
- `Skip` as the secondary outline button.

`Replace Current` invokes the direct message-graph replacement mutation. While pending, both actions are disabled and the primary action shows a loading spinner. On success, the editor adopts the returned persisted graph, exits preview, fits the replacement graph into view, records template usage, and shows one success toast. On failure, the editor remains in preview, the existing workflow stays unchanged, and one error toast appears.

`Skip` exits preview and restores the exact current workflow without a mutation. Escape performs the same action. Leaving the Message Handling view also skips the preview. No Save/Discard state is created by entering or leaving preview.

## Other Message Graph Actions

Message Handling must not mix direct and draft-only graph operations. The following actions persist immediately and adopt the returned graph:

- deleting a node;
- connecting two nodes;
- deleting an edge;
- confirming `Replace Current` from a starter-template preview; and
- Cleanup or Arrange.

Starter-template application replaces only the persisted message graph and records template usage. It does not write Reminder or Follow-up settings.

Cleanup persists canonical positions using the current stored orientation. Arrange persists canonical positions using the next orientation. Both are explicit layout actions. Manual positions are not input to either operation.

## Manual Dragging

React Flow continues updating its local node collection during drag so movement is responsive. The drag-stop handler does not call a page callback, draft mutation, or Convex mutation.

Manual movement:

- survives while the current canvas instance remains mounted;
- does not change the persisted graph;
- does not mark automation configuration dirty;
- does not reveal or enable Save/Discard;
- does not affect Cleanup or Arrange calculations; and
- resets to persisted positions when the graph/canvas is reloaded.

## Automation Draft Isolation

The current whole-graph draft hook is narrowed so automation state is the only draft owned by the workflow page. It tracks:

- the latest persisted automation baseline;
- the current Reminder and Follow-up draft;
- whether those configurations differ; and
- template-selection state used inside the automation editors.

When a direct message mutation returns a newer graph, the hook refreshes the persisted graph reference while preserving a dirty automation draft. If the automation draft is clean, it adopts the returned automation configuration as well.

Saving automations uses the latest persisted nodes, edges, layout, and workflow timestamp. It changes only automation fields and their lifecycle effects. It never recreates or removes message nodes as a side effect.

## Backend Boundaries

Existing direct mutations remain the foundation for add, connect, edge removal, and node removal. Two focused transactional boundaries are required:

- a node-inspector Apply mutation for node, condition, and appointment-service updates;
- a message-graph replacement mutation for starter templates and canonical layout operations without touching automation fields.

Every public Convex function:

- uses exact validators;
- derives authorization from authenticated agent access;
- verifies every referenced node, edge, and service belongs to the agent's workflow;
- enforces existing graph limits and terminal-node rules; and
- returns the latest graph after a successful transaction.

Media APIs remain unchanged because newly created media nodes now have real `workflowNodes` IDs before the uploader renders.

## Error and Concurrency Behavior

- Direct action controls are disabled while their own mutation is pending.
- Duplicate Add, Apply, delete, connect, template, Cleanup, and Arrange submissions are ignored while pending.
- Failed direct mutations do not update the local persisted graph.
- The inspector stays open after an Apply failure.
- If the workflow changes concurrently, the latest server graph wins for Message Handling while the local automation draft remains intact.
- Automation Save uses the latest persisted workflow timestamp and reports the existing concurrency error if another write wins between the latest graph adoption and the mutation.
- Media upload failures continue using the existing per-file failure and cleanup behavior.

## UI Behavior

- Add Node shows existing menu feedback plus a single creation loading/success/error toast lifecycle.
- The inspector opens only after Convex returns the real node.
- Media sections never show “Save the workflow first, then reopen this node.”
- Apply has no idle check icon.
- Template cards say `Preview` instead of `Try now`.
- Template preview is visibly tinted, read-only, and identified by template name.
- The centered preview panel contains primary `Replace Current` and secondary `Skip` actions.
- Message Handling does not show Save/Discard for direct graph changes.
- Reminder and Follow-up continue showing Save/Discard only when their automation draft is dirty.
- Manual dragging never changes toolbar actions.

## Testing

Frontend regression coverage verifies:

- Add Node calls the direct mutation, adopts its graph, and selects the new persisted child.
- A newly added media node renders `WorkflowSendMediaSection` without a draft-node guard.
- Apply calls one persistence boundary and closes only after success.
- Apply retains values and remains open on failure.
- Apply has no check icon and retains its loading spinner.
- drag stop does not call a persistence or draft callback.
- dragging does not create dirty state.
- Cleanup and Arrange call their deliberate persisted-layout boundary.
- template card activation enters preview without mutating the workflow.
- preview renders the template graph with its distinct canvas treatment and centered actions.
- preview blocks every graph-editing interaction.
- Skip, Escape, and leaving Message Handling restore the current workflow without a mutation.
- Replace Current persists only the message graph and exits preview after success.
- replacement failure keeps preview active and leaves the current workflow unchanged.
- direct graph results preserve a dirty automation draft.
- Message Handling direct changes do not show Save/Discard.

Convex coverage verifies:

- Add Node returns a real child and edge.
- Apply updates node, edge condition, and appointment services atomically.
- Apply rejects cross-workflow nodes, edges, and services without partial writes.
- Cleanup and Arrange persist only canonical layout fields.
- template replacement occurs only after confirmation and preserves automation configuration.
- direct message mutations preserve media associations and existing authorization.

The focused workflow suite, Convex TypeScript, frontend TypeScript/build, targeted ESLint, `git diff --check`, and the complete test suite must pass under Node v22. Touched code files must remain at or below 300 lines.

## Acceptance Criteria

- One Add Node selection creates the persisted node and opens its inspector.
- The first inspector session can upload valid images, videos, or files.
- Apply is the only save action needed for node configuration.
- Apply has no check icon.
- Manual dragging never saves, never marks dirty, and resets on reload.
- Cleanup and Arrange are the only controls that persist layout positions.
- Template cards say `Preview` and never replace the workflow on initial click.
- Preview is full-canvas, read-only, visibly distinct, and names the selected template.
- Preview presents centered `Replace Current` and `Skip` buttons.
- Replace Current directly persists the template; Skip, Escape, and view changes restore the existing graph unchanged.
- Save/Discard remain available only for dirty Reminder and Follow-up automation configuration.
- Direct Message Handling operations never save or discard pending Reminder or Follow-up edits.
- No “save first and reopen” media instruction remains.
