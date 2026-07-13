# Workflow Scope Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Default Reminder and Follow-up Apply to scopes to `futureOnly` for new and previously unset workflow configurations.

**Architecture:** Put the canonical default in `createInitialWorkflowAutomationConfigs`, which is shared by the frontend and Convex. Resolve stored configurations by spreading them over the initialized configuration so missing legacy scope fields normalize without database writes while explicit stored choices remain authoritative.

**Tech Stack:** TypeScript, Convex, Vitest

## Global Constraints

- Read `convex/_generated/ai/guidelines.md` before changing Convex code.
- Use Node v22 for every script and test command.
- Keep code files under 300 lines.
- Add no comments unless a non-obvious workaround cannot be expressed clearly in code.
- Do not rewrite stored workflow documents or change scheduling semantics.
- Preserve explicit `currentAndFuture` and `futureOnly` values.

---

### Task 1: Default and normalize both activation scopes

**Files:**
- Modify: `shared/workflowAutomations.ts`
- Modify: `convex/workflowAutomationConfig.ts`
- Modify: `convex/workflowAutomationConfig.test.ts`
- Modify: `convex/workflowDraftSave.test.ts`

**Interfaces:**
- Consumes: `createInitialWorkflowAutomationConfigs()` and `resolveWorkflowAutomationConfigs(workflow)`.
- Produces: the same public functions and config types, with resolved Reminder and Follow-up scopes defaulting to `futureOnly` when absent.

- [x] **Step 1: Add failing default and resolver tests**

Extend `convex/workflowAutomationConfig.test.ts` with a complete workflow-document factory and these behaviors:

```ts
import type { Doc, Id } from './_generated/dataModel';
import {
  getWorkflowAutomationSaveEffects,
  resolveWorkflowAutomationConfigs,
} from './workflowAutomationConfig';

function workflowWithAutomations(
  automations: Partial<Pick<Doc<'workflows'>, 'reminderAutomation' | 'followUpAutomation'>>,
): Doc<'workflows'> {
  return {
    _id: 'workflow' as Id<'workflows'>,
    _creationTime: 1,
    agentId: 'agent' as Id<'agents'>,
    orgId: '',
    userId: '',
    name: 'Workflow',
    createdAt: 1,
    updatedAt: 1,
    ...automations,
  };
}

test('defaults both activation scopes to future only', () => {
  const initial = createInitialWorkflowAutomationConfigs();

  expect(initial.reminder.activationScope).toBe('futureOnly');
  expect(initial.followUp.activationScope).toBe('futureOnly');
});

test('normalizes missing stored scopes to future only', () => {
  const stored = createInitialWorkflowAutomationConfigs();
  delete stored.reminder.activationScope;
  delete stored.followUp.activationScope;

  const resolved = resolveWorkflowAutomationConfigs(workflowWithAutomations({
    reminderAutomation: stored.reminder,
    followUpAutomation: stored.followUp,
  }));

  expect(resolved.reminder.activationScope).toBe('futureOnly');
  expect(resolved.followUp.activationScope).toBe('futureOnly');
});

test('preserves explicit stored activation scopes', () => {
  const stored = createInitialWorkflowAutomationConfigs();
  stored.reminder.activationScope = 'currentAndFuture';
  stored.followUp.activationScope = 'currentAndFuture';

  const resolved = resolveWorkflowAutomationConfigs(workflowWithAutomations({
    reminderAutomation: stored.reminder,
    followUpAutomation: stored.followUp,
  }));

  expect(resolved.reminder.activationScope).toBe('currentAndFuture');
  expect(resolved.followUp.activationScope).toBe('currentAndFuture');
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowAutomationConfig.test.ts
```

Expected: the new default and missing-scope normalization tests fail because scopes are currently undefined.

- [x] **Step 3: Implement the shared defaults and resolver normalization**

Add the same canonical default to both initialized configurations:

```ts
reminder: {
  enabled: false,
  activationScope: 'futureOnly',
  revision: 0,
```

```ts
followUp: {
  enabled: false,
  activationScope: 'futureOnly',
  revision: 0,
```

Resolve stored configurations over those initialized defaults:

```ts
return {
  reminder: { ...initial.reminder, ...stored.reminderAutomation },
  followUp: { ...initial.followUp, ...stored.followUpAutomation },
};
```

Update the initial workflow assertion in `convex/workflowDraftSave.test.ts`:

```ts
expect(initial.automations.reminder.activationScope).toBe('futureOnly');
expect(initial.automations.followUp.activationScope).toBe('futureOnly');
```

- [x] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowAutomationConfig.test.ts convex/workflowDraftSave.test.ts
```

Expected: both focused files pass.

- [x] **Step 5: Run quality checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint shared/workflowAutomations.ts convex/workflowAutomationConfig.ts convex/workflowAutomationConfig.test.ts convex/workflowDraftSave.test.ts
git diff --check
wc -l shared/workflowAutomations.ts convex/workflowAutomationConfig.ts convex/workflowAutomationConfig.test.ts convex/workflowDraftSave.test.ts
```

Expected: ESLint exits 0, `git diff --check` exits 0, and every touched code file remains under 300 lines.

- [x] **Step 6: Commit the implementation**

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-07-13-workflow-scope-default.md shared/workflowAutomations.ts convex/workflowAutomationConfig.ts convex/workflowAutomationConfig.test.ts convex/workflowDraftSave.test.ts
git commit -m "Default workflow scopes to future only"
```
