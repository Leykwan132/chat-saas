# Workflow Template Preview Dialog Design

## Summary

Starter workflow templates open in a large modal dialog instead of replacing the live Message Handling canvas. The dialog owns a separate read-only React Flow canvas showing only the selected template. The persisted workflow remains visible but inactive behind the modal and never changes until the user confirms replacement.

This design supersedes only the full-canvas preview presentation in `2026-07-17-workflow-direct-node-persistence-design.md`. Direct template replacement, automation-draft isolation, and all other persistence decisions remain unchanged.

## Approaches Considered

### Large centered dialog

Use the existing shadcn Dialog with a dedicated header, preview canvas, and footer. Expand it to the viewport minus 32px horizontally and approximately `92vh` vertically. This cleanly separates the proposed template from the actual workflow while giving the graph enough width for readable node content. This is the selected approach.

### Full-screen dialog

A full-screen modal provides more canvas space but visually removes the current workflow and makes the interaction feel like navigation to another editor. The template graphs do not require that much space.

### Side-by-side sheet

A sheet could keep more of the current map visible, but the preview becomes too narrow for horizontal graphs and suggests comparison or editing rather than a replacement decision.

## Dialog Structure

The dialog uses a nearly edge-to-edge centered surface: `calc(100vw - 2rem)` wide and approximately `92vh` tall. Its component classes must explicitly override the installed Dialog's responsive `sm:max-w-md` constraint; otherwise desktop viewports collapse the preview to the default narrow modal width. It contains:

- a header with the template name and a concise read-only preview description;
- a flexible preview body containing a dedicated React Flow canvas;
- a footer with `Skip` as a borderless ghost/text action and `Replace Current` as the primary action.

The dialog has an accessible title. The preview canvas fits the complete template graph when it opens with minimal fit padding so node titles and descriptions remain readable. The existing backdrop and preview-canvas background treatments remain unchanged.

## Preview Isolation

Opening a template:

1. closes the template picker;
2. stores the selected template in client-only preview state;
3. leaves the live workflow graph and local canvas state unchanged;
4. opens the preview dialog; and
5. renders a separate graph derived from the selected template inside the dialog.

The preview canvas is read-only. Nodes cannot be selected, dragged, connected, deleted, configured, or used to open inspectors. It does not render workflow editing toolbars, template controls, automation controls, or Save/Discard actions.

The live `WorkflowCanvas` always receives the actual current graph. It no longer receives preview props, preview graph nodes, or preview-specific disabled states.

## Actions

`Replace Current` calls the existing direct message-graph replacement mutation. While pending, the primary action shows its loading spinner and both footer actions are disabled. Success closes the dialog, adopts the returned graph, fits the replacement on the live canvas, records template usage, and retains the existing success toast. Failure keeps the dialog open and leaves the current workflow unchanged.

`Skip` closes the dialog without a mutation. The dialog close button, Escape, and clicking outside the dialog use the same skip behavior. Dismissal is disabled while replacement is pending so the outcome cannot become visually ambiguous.

## Component Boundaries

- `WorkflowPage` owns the selected template preview and replacement request.
- `WorkflowCanvas` returns to rendering only the live workflow and its normal editing controls.
- A focused `WorkflowTemplatePreviewDialog` owns Dialog composition, the isolated React Flow provider, read-only preview canvas, and footer actions.
- The existing template-preview graph model continues deriving a client-only graph without automations or persisted IDs.
- The old in-canvas preview overlay and Escape hook are removed.

The dialog component remains below the workspace's 300-line limit by keeping graph conversion in the existing model and reusing workflow node and edge types.

## Error Handling

- Opening and dismissing preview never invokes a mutation.
- Replacement failures retain the selected template and open dialog.
- Replacement success is the only path that changes the live graph.
- Duplicate replacement submissions are blocked while pending.
- Dialog dismissal is blocked while replacement is pending.
- Unsaved Reminder and Follow-up drafts remain unchanged throughout preview and replacement.

## Testing

Frontend regression coverage verifies:

- selecting Preview keeps the live canvas bound to the current graph;
- the selected template graph is passed only to the dialog;
- the dialog has an accessible title, separate read-only canvas, and footer actions;
- the dialog overrides the installed responsive maximum width and uses the viewport minus 32px;
- fit-view padding is small enough to keep node content readable;
- Skip uses the ghost/text button variant with no outline;
- the preview canvas disables dragging, connecting, selection, and deletion;
- Skip, close, Escape, and outside dismissal do not mutate;
- replacement pending state disables dismissal and both actions;
- successful replacement closes the dialog and refreshes the live canvas;
- failed replacement keeps the dialog open;
- the old in-canvas preview overlay and preview-specific live-canvas behavior are removed.

The focused workflow suite, complete application suite, TypeScript/Vite build, targeted ESLint, `git diff --check`, and authored-module line checks must pass under Node v22.

## Acceptance Criteria

- Preview opens in a centered dialog spanning the viewport width minus 32px and approximately `92vh`.
- The actual workflow map remains unchanged behind the dialog.
- The template graph appears only inside the dialog.
- The dialog preview is fully read-only, automatically fits the graph with minimal padding, and keeps node content readable.
- Replace Current remains primary and persists directly.
- Skip is a borderless text action; it and normal dialog dismissal return to the current workflow without mutation.
- Replacement failures keep the preview available.
- Unsaved automation drafts remain intact.
