# Workflow Summary History Button Design

## Goal

Move the Reminder and Follow-up History actions from their setup-card headers into the corresponding Summary headers and make them clearly recognizable as clickable buttons.

## Design

- Remove `WorkflowAutomationHistoryDialog` from both setup-card headers, leaving each switch aligned with its setup title.
- Replace each Summary title-only header with a horizontal header row that aligns the Summary title on the left and History on the right.
- Read `agentId` from the existing workflow automation state in each Summary component.
- Render the existing `WorkflowAutomationHistoryDialog` only when `agentId` exists, preserving current access and query behavior.
- Keep the History trigger's existing `outline` variant, `sm` size, History icon, and text label. The outline variant already supplies a semantic background and hover state, giving the button light contrast against the muted Summary card.
- Preserve `nodrag nopan` and event propagation guards so the button remains usable inside the workflow canvas.

## Scope

This is a presentation and component-ownership change only. The dialog content, pagination, Convex query, history records, setup switches, and automation behavior remain unchanged.

## Verification

- Update focused source-level tests to prove History is absent from both setup components and present in both Summary components with the correct automation kind.
- Verify each Summary header uses a horizontal title/action row and the shared History trigger remains an outlined small button.
- Run focused tests under Node 22, targeted lint, `git diff --check`, and touched-code line-count checks.
