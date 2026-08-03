# Workflow node readiness design

## Goal

Prevent incomplete workflow actions from appearing in AI context while making the missing configuration obvious in the workflow editor.

## Data model

Every `workflowNodes` record gains an `isReady` boolean. New nodes persist their initial readiness, and every supported edit that can affect a node's required configuration recalculates and persists the value in the same transaction. Legacy records without the field are unready until recalculated.

Readiness is derived by one server-side policy so the editor and AI runtime cannot disagree:

- `start`, `closeConversation`, and `humanEscalation` are ready without extra configuration.
- `sendText` is ready only after its message is non-empty and no longer the generated placeholder.
- `sendImage` and `sendFile` are ready only with at least one node-owned media upload in `ready` status.
- `bookAppointment` is ready only when it resolves to at least one active service and at least one teammate is accepting appointment leads.

The policy remains conservative: a node with unavailable or incomplete dependencies is unready.

## Persistence and updates

Node creation inserts the computed initial value. Node configuration, workflow graph replacement, and legacy migration paths recompute readiness as they write nodes. Media creation/completion, import, deletion, and failure paths refresh the owning media node. Service and lead-availability changes refresh affected booking nodes so the stored attribute tracks the prerequisites that the AI would actually use.

## Read paths

The editor graph continues returning every node and every edge so users can configure incomplete nodes. Each unready standard node displays a compact amber alert line above its card, using an accessible alert icon and the text `Action Required`. The public landing preview is unaffected.

The AI runtime loads only nodes with `isReady === true`. It also removes edges whose source or target is absent from that ready-node set. Therefore incomplete actions, their media, their booking services, and their conditions cannot enter prompts or be considered for execution.

## Tests

Focused tests cover readiness policy rules, mutation and media-driven transitions, runtime filtering of nodes and dangling edges, and flow-model/node-card rendering of the alert. Existing workflow tests continue to cover graph persistence and action planning.

## Non-goals

This does not block users from creating, editing, connecting, or viewing incomplete nodes. It does not alter the landing workflow demo or change non-workflow automation configuration.
