# Workflow Template Card Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present workflow templates as left-to-right cards with footer replacement actions and make workflow Save visually primary.

**Architecture:** Keep the existing HoverCard and template data. Compose installed shadcn Card parts inside a responsive three-column row, keep template graphs horizontal, and use the Button default variant for the primary Save action.

**Tech Stack:** React 19, TypeScript 6, shadcn Card/Button/HoverCard, Tailwind CSS, Vitest.

## Global Constraints

- Use Node v22 for every script and test command.
- Keep every code file below 300 lines.
- Use semantic shadcn variants and existing components.
- Use exact footer copy `Replace current option`.

---

### Task 1: Template cards and primary Save

**Files:**
- Modify: `src/components/workflow/WorkflowDraftToolbar.test.ts`
- Modify: `src/components/workflow/WorkflowTemplateHoverCard.tsx`
- Modify: `src/components/workflow/WorkflowDraftActions.tsx`

**Interfaces:**
- Consumes: `WORKFLOW_TEMPLATES`, `onReplace(template)`, and existing dirty Save/Reset callbacks.
- Produces: a responsive horizontal Card row and semantic primary Save button.

- [ ] Update the focused source test to require Card composition, a three-column layout, exact `Replace current option` copy, horizontal template orientation, and a Save button without the ghost variant.
- [ ] Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowDraftToolbar.test.ts src/components/workflow/workflowTemplates.test.ts`; expect the toolbar test to fail on the new requirements.
- [ ] Replace the template list markup with installed Card parts, horizontal workflow cues, and footer buttons; switch Save to the default Button variant.
- [ ] Re-run the focused tests and expect all to pass.
- [ ] Run targeted ESLint, `bunx tsc -b`, `git diff --check`, and the touched-file LOC check.
