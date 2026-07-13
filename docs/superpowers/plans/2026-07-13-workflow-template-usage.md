# Workflow Template Usage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist backend-only workflow template adoption when a template-derived workflow is successfully saved and simplify the template picker.

**Architecture:** The workflow editor retains an optional template ID while its local draft is template-derived and passes it to the existing atomic Save mutation. That transaction upserts per-agent usage plus per-template totals. The picker remains frontend-only and exposes no usage counts.

**Tech Stack:** React 19, TypeScript 6, shadcn Card/HoverCard/Button, Convex, Vitest.

## Global Constraints

- Use Node v22 for every script and test command.
- Keep every new code file below 300 lines.
- Record usage only after a successful workflow Save.
- Do not expose usage through a public query or frontend display.
- Use exact action copy `Replace current`.

---

### Task 1: Compact template picker

**Files:**
- Modify: `src/components/workflow/WorkflowDraftToolbar.test.ts`
- Modify: `src/components/workflow/WorkflowTemplateHoverCard.tsx`

**Interfaces:**
- Consumes: `WORKFLOW_TEMPLATES` and `onReplace(template)`.
- Produces: a narrower three-card HoverCard with title, description, and footer action only.

- [ ] Change the focused source test to reject `Message enters`, reject the action-count expression, require `Replace current`, and require a width smaller than 54rem.
- [ ] Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowDraftToolbar.test.ts`; expect failure on the old cue, copy, and width.
- [ ] Remove `CardContent` and `ArrowRight`, change the footer copy to `Replace current`, and reduce the HoverCard width while retaining the three-column row.
- [ ] Re-run the focused test; expect pass.

### Task 2: Backend-only template usage records

**Files:**
- Create: `convex/workflowTemplateUsageSchema.ts`
- Create: `convex/workflowTemplateUsage.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/workflowDraftSave.ts`
- Modify: `convex/workflowDraftSave.test.ts`

**Interfaces:**
- Produces: `workflowTemplateIdValidator`, `WorkflowTemplateId`, and `recordWorkflowTemplateUsage(ctx, agentId, templateId, now)`.
- Consumes: optional `templateId` in `api.workflowDraftSave.save`.

- [ ] Extend the Convex integration test to Save with `templateId: 'real-estate'`, verify one per-agent row and totals `{ uniqueAgentCount: 1, saveCount: 1 }`, Save again with the returned baseline, and verify unique count remains 1 while save counts become 2.
- [ ] Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowDraftSave.test.ts`; expect a TypeScript/API validation failure because `templateId` and usage tables do not exist.
- [ ] Add two schema tables with unique indexes, implement transactional usage upserts, add the optional literal validator to workflow Save, and call the helper only after graph validation succeeds.
- [ ] Re-run the Convex integration test; expect pass.

### Task 3: Draft template-origin lifecycle

**Files:**
- Create: `src/pages/workflowTemplateDraftState.ts`
- Create: `src/pages/workflowTemplateDraftState.test.ts`
- Modify: `src/pages/WorkflowPage.tsx`

**Interfaces:**
- Produces: `setAppliedWorkflowTemplate`, `clearAppliedWorkflowTemplate`, and optional `WorkflowTemplateId` state behavior.
- Consumes: selected template ID in the workflow Save payload.

- [ ] Write a pure-state test proving template application stores the ID, applying another replaces it, Reset clears it, failed Save preserves it, and successful Save clears it.
- [ ] Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/workflowTemplateDraftState.test.ts`; expect missing-module failure.
- [ ] Implement the pure transition helper and use it from WorkflowPage so `templateId` is sent only while the current draft originated from a template.
- [ ] Re-run the focused state test; expect pass.

### Task 4: Generated API and verification

**Files:**
- Update generated bindings through Convex codegen.
- Update: `CONTINUITY.md`.

**Interfaces:**
- Verifies the complete frontend-to-Convex behavior.

- [ ] Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen`; expect successful bindings and schema validation.
- [ ] Run all workflow template, draft Save, and new usage tests; expect pass.
- [ ] Run targeted ESLint, full `bunx tsc -b`, `git diff --check`, and touched-file LOC checks; expect no errors and every new code file below 300 lines.
- [ ] Update the ledger with backend-only usage semantics and verification receipts.
