# Custom Reminder Timing Serialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent React presentation metadata from entering persisted custom reminder timing state and causing Convex's reserved `$$typeof` field error.

**Architecture:** Keep the reminder timing factory presentation-ready, including its Lucide icon and description. Make the shared atomic state helper a strict projection boundary that stores only the five fields declared by `WorkflowReminderCustomTiming`.

**Tech Stack:** TypeScript, React, Vitest, Convex-compatible plain data

## Global Constraints

- Run every script and test under Node v22.
- Keep every code file below 300 lines.
- Add no default fallback or weakened Convex validation.
- Keep UI timing options rich enough to render their existing icon and description.
- Preserve atomic option selection and deduplication by timing ID.
- Add no code comments.

---

### Task 1: Project Custom Timing to Persisted Data

**Files:**
- Modify: `src/components/workflow/workflowReminderCustomTiming.test.ts`
- Modify: `shared/workflowAutomations.ts`

**Interfaces:**
- Consumes: `createWorkflowReminderTimingOption({ amount, unit }): WorkflowReminderTimingOption`
- Produces: `applyWorkflowReminderCustomTiming(reminder, option): WorkflowReminderAutomationConfig`, with `customTimingOptions` containing only `WorkflowReminderCustomTiming` fields

- [x] **Step 1: Write the failing regression test**

Import the real UI factory and replace the plain test fixture with the presentation-ready option. Assert the persisted value is a plain timing object and does not retain UI fields.

```ts
import { createWorkflowReminderTimingOption } from './workflowReminderOptions';

const option = createWorkflowReminderTimingOption({ amount: 15, unit: 'minutes' });
const storedOption: WorkflowReminderCustomTiming = {
  amount: 15,
  id: 'customReminderTiming:15:minutes',
  label: '15 minutes before',
  summaryLabel: '15 minutes before',
  unit: 'minutes',
};

const selected = applyCustomTiming(reminder, option);
const selectedAgain = applyCustomTiming(selected, option);

expect(selected.timingOptionIds).toEqual([option.id]);
expect(selected.customTimingOptions).toEqual([storedOption]);
expect(selected.customTimingOptions[0]).not.toHaveProperty('Icon');
expect(selected.customTimingOptions[0]).not.toHaveProperty('description');
expect(selectedAgain.customTimingOptions).toEqual([storedOption]);
```

- [x] **Step 2: Run the focused test and confirm the leak**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowReminderCustomTiming.test.ts
```

Expected: FAIL because the stored object still contains `Icon` and `description`.

- [x] **Step 3: Add the strict projection at the shared state boundary**

Create the persisted value before deduplication and store that value instead of the incoming rich UI option.

```ts
const storedOption: WorkflowReminderCustomTiming = {
  amount: option.amount,
  id: option.id,
  label: option.label,
  summaryLabel: option.summaryLabel,
  unit: option.unit,
};
const customTimingOptions = reminder.customTimingOptions.some(
  (current) => current.id === storedOption.id,
)
  ? reminder.customTimingOptions
  : [...reminder.customTimingOptions, storedOption];
```

Keep `timingOptionIds: [option.id]` unchanged so selection remains atomic.

- [x] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowReminderCustomTiming.test.ts src/components/workflow/WorkflowReminderTimingRow.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint shared/workflowAutomations.ts src/components/workflow/workflowReminderCustomTiming.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && git diff --check
source ~/.nvm/nvm.sh && nvm use 22 && wc -l shared/workflowAutomations.ts src/components/workflow/workflowReminderCustomTiming.test.ts
```

Expected: all focused tests and ESLint pass, `git diff --check` reports no output, and both code files remain below 300 lines.

- [x] **Step 5: Commit the verified fix**

```bash
git add shared/workflowAutomations.ts src/components/workflow/workflowReminderCustomTiming.test.ts CONTINUITY.md
git commit -m "Keep custom reminder timing serializable"
```
