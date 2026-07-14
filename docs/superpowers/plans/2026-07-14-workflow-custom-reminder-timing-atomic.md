# Atomic Custom Reminder Timing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Commit custom reminder option metadata and its selected timing ID in one state transition.

**Architecture:** Add a pure shared transformation for a reminder automation config, then expose it through one context action and one provider update. The custom timing dialog uses only that atomic action, while preset selection remains unchanged.

**Tech Stack:** React 19, TypeScript, Vitest

## Global Constraints

- Use Node v22 for every script and test command.
- Keep every code file under 300 lines.
- Add no comments unless a non-obvious workaround cannot be expressed clearly in code.
- Do not reconstruct or silently repair previously corrupted configurations.
- Preserve existing custom timing IDs, labels, units, validation, and preset selection behavior.

---

### Task 1: Make custom reminder selection atomic

**Files:**
- Create: `src/components/workflow/workflowReminderCustomTiming.test.ts`
- Modify: `src/components/workflow/WorkflowReminderTimingRow.test.ts`
- Modify: `shared/workflowAutomations.ts`
- Modify: `src/components/workflow/workflowAutomationContext.ts`
- Modify: `src/components/workflow/workflowAutomationState.tsx`
- Modify: `src/components/workflow/WorkflowReminderTimingRow.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `WorkflowReminderAutomationConfig` and `WorkflowReminderCustomTiming`.
- Produces: `applyWorkflowReminderCustomTiming(reminder, option): WorkflowReminderAutomationConfig` and `setReminderCustomTimingOption(option): void`.

- [x] **Step 1: Add the failing pure transformation test**

Create `workflowReminderCustomTiming.test.ts` with:

```ts
import { expect, test } from 'vitest';
import * as workflowAutomations from '../../../shared/workflowAutomations';
import type {
  WorkflowReminderAutomationConfig,
  WorkflowReminderCustomTiming,
} from '../../../shared/workflowAutomations';

type ApplyCustomTiming = (
  reminder: WorkflowReminderAutomationConfig,
  option: WorkflowReminderCustomTiming,
) => WorkflowReminderAutomationConfig;

const applyCustomTiming = (
  workflowAutomations as typeof workflowAutomations & {
    applyWorkflowReminderCustomTiming?: ApplyCustomTiming;
  }
).applyWorkflowReminderCustomTiming;

test('commits a custom reminder option and selected ID atomically without duplicates', () => {
  expect(applyCustomTiming).toBeTypeOf('function');
  if (!applyCustomTiming) return;
  const reminder = workflowAutomations.createInitialWorkflowAutomationConfigs().reminder;
  const option: WorkflowReminderCustomTiming = {
    amount: 15,
    id: 'customReminderTiming:15:minutes',
    label: '15 minutes before',
    summaryLabel: '15 minutes before',
    unit: 'minutes',
  };

  const selected = applyCustomTiming(reminder, option);
  const selectedAgain = applyCustomTiming(selected, option);

  expect(selected.timingOptionIds).toEqual([option.id]);
  expect(selected.customTimingOptions).toEqual([option]);
  expect(selectedAgain.customTimingOptions).toEqual([option]);
});
```

Extend `WorkflowReminderTimingRow.test.ts` with:

```ts
test('commits custom timing through one atomic context action', () => {
  expect(source).toContain('setReminderCustomTimingOption(option);');
  expect(source).not.toContain('addReminderCustomTimingOption(option);');
  expect(source).not.toContain('onUpdateOptionId(option.id);');
});
```

- [x] **Step 2: Run focused tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowReminderCustomTiming.test.ts src/components/workflow/WorkflowReminderTimingRow.test.ts
```

Expected: the pure test fails because `applyWorkflowReminderCustomTiming` is undefined, and the row test fails because the old two-call sequence remains.

- [x] **Step 3: Add the pure atomic transformation**

Add to `shared/workflowAutomations.ts`:

```ts
export function applyWorkflowReminderCustomTiming(
  reminder: WorkflowReminderAutomationConfig,
  option: WorkflowReminderCustomTiming,
): WorkflowReminderAutomationConfig {
  const customTimingOptions = reminder.customTimingOptions.some(
    (current) => current.id === option.id,
  )
    ? reminder.customTimingOptions
    : [...reminder.customTimingOptions, option];
  return {
    ...reminder,
    customTimingOptions,
    timingOptionIds: [option.id],
  };
}
```

- [x] **Step 4: Replace the split context actions with one atomic action**

In `workflowAutomationContext.ts`, replace:

```ts
addReminderCustomTimingOption: (option: WorkflowReminderCustomTimingOption) => void;
```

with:

```ts
setReminderCustomTimingOption: (option: WorkflowReminderCustomTimingOption) => void;
```

In `workflowAutomationState.tsx`, import the helper and replace the old action with:

```ts
setReminderCustomTimingOption: (option) => {
  updateReminder(applyWorkflowReminderCustomTiming(configs.reminder, option));
},
```

- [x] **Step 5: Use only the atomic action for custom timing**

In `WorkflowReminderTimingRow.tsx`, destructure `setReminderCustomTimingOption` and replace the two custom timing calls with:

```ts
setReminderCustomTimingOption(option);
```

Keep `onUpdateOptionId(nextValue)` unchanged for preset selection.

- [x] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowReminderCustomTiming.test.ts src/components/workflow/WorkflowReminderTimingRow.test.ts src/components/workflow/WorkflowReminderNoticePlacement.test.ts src/components/workflow/WorkflowAutomationActivationNodes.test.ts
```

Expected: all focused tests pass.

- [x] **Step 7: Run quality checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint shared/workflowAutomations.ts src/components/workflow/workflowReminderCustomTiming.test.ts src/components/workflow/WorkflowReminderTimingRow.test.ts src/components/workflow/workflowAutomationContext.ts src/components/workflow/workflowAutomationState.tsx src/components/workflow/WorkflowReminderTimingRow.tsx
git diff --check
wc -l shared/workflowAutomations.ts src/components/workflow/workflowReminderCustomTiming.test.ts src/components/workflow/WorkflowReminderTimingRow.test.ts src/components/workflow/workflowAutomationContext.ts src/components/workflow/workflowAutomationState.tsx src/components/workflow/WorkflowReminderTimingRow.tsx
```

Expected: ESLint and `git diff --check` exit 0, and every touched code file remains under 300 lines.

- [x] **Step 8: Record and commit the verified fix**

Update `CONTINUITY.md` with the completed state and verification receipt, then run:

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-07-14-workflow-custom-reminder-timing-atomic.md shared/workflowAutomations.ts src/components/workflow/workflowReminderCustomTiming.test.ts src/components/workflow/WorkflowReminderTimingRow.test.ts src/components/workflow/workflowAutomationContext.ts src/components/workflow/workflowAutomationState.tsx src/components/workflow/WorkflowReminderTimingRow.tsx
git commit -m "Make custom reminder timing atomic"
```
