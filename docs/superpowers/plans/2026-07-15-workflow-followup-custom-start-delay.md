# Workflow Follow-up Custom Start Delay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Reminder-style Custom amount/unit option to Workflow Follow-up `Start after`, schedule it with exact integer minutes, and clarify the summary with `if the customer didn't reply`.

**Architecture:** A focused duration-options module owns parsing, formatting, and minute conversion. A dedicated Start-after field owns the Custom dialog, while one shared state transition atomically updates selection, canonical minutes, and custom metadata. Convex accepts legacy hour data during a bounded widen-migrate-narrow transition and schedules exclusively from the resolved canonical minutes value.

**Tech Stack:** React 19, TypeScript, shadcn/ui, Lucide, Convex, `@convex-dev/migrations`, Vitest, Bun, Node v22.

## Global Constraints

- Custom applies only to `Start after`; `Follow up every` remains unchanged.
- Amounts are positive whole numbers and units are minutes, hours, days, or weeks.
- Summary copy uses `if the customer didn't reply` instead of `after no reply`.
- No production code file may exceed 300 lines.
- Use no default fallback for invalid stored data; legacy-hour conversion is an explicit migration compatibility path.
- Run every script and test under Node v22.
- Preserve unrelated dirty-worktree changes.

---

### Task 1: Pure Start-after duration model and atomic configuration update

**Files:**
- Create: `src/components/workflow/workflowFollowupStartAfterOptions.tsx`
- Create: `src/components/workflow/workflowFollowupStartAfterOptions.test.ts`
- Modify: `shared/workflowAutomations.ts`
- Test: `src/components/workflow/workflowFollowupStartAfterOptions.test.ts`

**Interfaces:**
- Produces `WorkflowFollowupStartAfterUnit`, `workflowFollowupStartAfterUnitOptions`, `getWorkflowFollowupStartAfterParts`, `createWorkflowFollowupStartAfterOption`, and `toWorkflowFollowupStartAfterMinutes`.
- Produces `WorkflowFollowupCustomStartAfter` and `applyWorkflowFollowupStartAfter(config, option)` for atomic state updates.

- [ ] **Step 1: Write failing duration and atomic-update tests**

```ts
test('creates a singular custom day option with exact canonical minutes', () => {
  expect(createWorkflowFollowupStartAfterOption({ amount: 1, unit: 'days' })).toMatchObject({
    id: 'customFollowupStartAfter:1:days',
    label: '1 day',
    summaryLabel: '1 day',
    startAfterMinutes: 1440,
  });
});

test('atomically applies a custom start delay without UI-only fields', () => {
  const next = applyWorkflowFollowupStartAfter(config, option);
  expect(next.selections.startAfter).toBe(option.id);
  expect(next.startAfterMinutes).toBe(15);
  expect(next.customStartAfter).toEqual({
    amount: 15,
    id: option.id,
    label: '15 minutes',
    summaryLabel: '15 minutes',
    unit: 'minutes',
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowFollowupStartAfterOptions.test.ts`

Expected: FAIL because the new module and shared helper do not exist.

- [ ] **Step 3: Implement the pure option model**

```ts
export type WorkflowFollowupStartAfterUnit = 'minutes' | 'hours' | 'days' | 'weeks';

const unitMinutes: Record<WorkflowFollowupStartAfterUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
};

export function toWorkflowFollowupStartAfterMinutes(amount: number, unit: WorkflowFollowupStartAfterUnit) {
  return amount * unitMinutes[unit];
}

export function createWorkflowFollowupStartAfterOption({ amount, unit }: WorkflowFollowupStartAfterParts) {
  const label = formatWorkflowFollowupStartAfterLabel(amount, unit);
  return {
    amount,
    unit,
    id: `customFollowupStartAfter:${amount}:${unit}`,
    label,
    summaryLabel: label,
    startAfterMinutes: toWorkflowFollowupStartAfterMinutes(amount, unit),
    Icon: unit === 'minutes' ? Clock3 : CalendarClock,
  };
}
```

- [ ] **Step 4: Implement the serializable atomic helper and initial canonical value**

```ts
export function applyWorkflowFollowupStartAfter(
  followUp: WorkflowFollowUpAutomationConfig,
  option: WorkflowFollowupStartAfterSelection,
): WorkflowFollowUpAutomationConfig {
  const customStartAfter = option.id.startsWith('customFollowupStartAfter:')
    ? projectWorkflowFollowupCustomStartAfter(option)
    : undefined;
  return {
    ...followUp,
    selections: { ...followUp.selections, startAfter: option.id },
    startAfterMinutes: option.startAfterMinutes,
    customStartAfter,
  };
}
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowFollowupStartAfterOptions.test.ts`

Expected: PASS.

### Task 2: Dedicated Custom Start-after control and summary copy

**Files:**
- Create: `src/components/workflow/WorkflowFollowupStartAfterField.tsx`
- Create: `src/components/workflow/WorkflowFollowupCustomStartAfter.test.ts`
- Modify: `src/components/workflow/WorkflowFollowupScheduleFields.tsx`
- Modify: `src/components/workflow/workflowFollowupOptions.tsx`
- Modify: `src/components/workflow/workflowAutomationContext.ts`
- Modify: `src/components/workflow/workflowAutomationState.tsx`
- Modify: `src/components/workflow/workflowFollowupSummary.ts`
- Modify: `src/components/workflow/WorkflowFollowupSummaryNode.tsx`
- Test: `src/components/workflow/WorkflowFollowupCustomStartAfter.test.ts`

**Interfaces:**
- Consumes `createWorkflowFollowupStartAfterOption`, `getWorkflowFollowupStartAfterParts`, and `applyWorkflowFollowupStartAfter` from Task 1.
- Produces `WorkflowFollowupStartAfterField({ compact?: boolean })` and `useWorkflowFollowupStartAfterField()`.

- [ ] **Step 1: Write failing source-level UI and copy regressions**

```ts
test('offers one Custom Start after action with Reminder-style units', () => {
  expect(field).toContain("label: 'Custom'");
  expect(field).toContain('<DialogTitle>Custom start delay</DialogTitle>');
  expect(field).toContain('workflowFollowupStartAfterUnitOptions.map');
  expect(field).toContain('setFollowupStartAfterOption(option);');
});

test('explains the no-reply condition in the summary', () => {
  expect(summary).toContain("if the customer didn't reply");
  expect(summary).not.toContain('after no reply');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowFollowupCustomStartAfter.test.ts`

Expected: FAIL because the dedicated field and clearer copy do not exist.

- [ ] **Step 3: Add the atomic context action and dynamic selected option**

```ts
setFollowupStartAfterOption: (option) => {
  updateFollowUp(applyWorkflowFollowupStartAfter(configs.followUp, option));
},
```

`useWorkflowFollowupStartAfterField()` combines preset options with the one stored custom option for trigger/summary lookup, while the menu renders presets plus one `Custom` action.

- [ ] **Step 4: Build the dedicated field with the existing shadcn primitives**

```tsx
<CommandItem value={customStartAfterValue} onSelect={openCustomDialog}>
  <span>Custom</span>
</CommandItem>
<Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
  <DialogContent showCloseButton={false}>
    <DialogHeader><DialogTitle>Custom start delay</DialogTitle></DialogHeader>
    <Input type="number" min={1} step={1} inputMode="numeric" />
    <DropdownMenuRadioGroup value={customUnit} onValueChange={setCustomUnitValue}>
      {workflowFollowupStartAfterUnitOptions.map((unit) => (
        <DropdownMenuRadioItem key={unit.value} value={unit.value}>
          {unit.label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
    <DialogFooter>
      <Button type="button" variant="ghost" onClick={closeCustomDialog}>Cancel</Button>
      <Button type="button" onClick={saveCustomStartAfter}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 5: Replace only the Start-after generic selector and update labels**

```tsx
<WorkflowFollowupStartAfterField compact={compact} />
```

Preset labels become duration-only (`1 day`, `2 days`, and so on). The summary sentence becomes:

```tsx
<SummaryHighlight>{summary.startAfter.summaryLabel ?? summary.startAfter.label}</SummaryHighlight>{' '}
if the customer didn't reply
```

- [ ] **Step 6: Run focused Follow-up UI tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowFollowupCustomStartAfter.test.ts src/components/workflow/WorkflowFollowupSingleAttempt.test.ts src/components/workflow/WorkflowFollowupAudienceHighlight.test.ts`

Expected: PASS.

### Task 3: Convex compatibility, exact-minute runtime, and migration

**Files:**
- Create: `convex/workflowFollowUpStartAfterMigration.ts`
- Create: `convex/workflowFollowUpStartAfter.test.ts`
- Modify: `convex/workflowAutomationValidators.ts`
- Modify: `convex/workflowAutomationConfig.ts`
- Modify: `convex/workflowFollowUpRuntime.ts`
- Modify: `convex/workflowAutomationReconciliation.ts`
- Modify: existing fixtures containing `startAfterHours`
- Test: `convex/workflowFollowUpStartAfter.test.ts`

**Interfaces:**
- Consumes canonical `startAfterMinutes` from shared Follow-up configuration.
- Produces `resolveWorkflowFollowUpStartAfterMinutes(stored)` and `runBackfillWorkflowFollowUpStartAfterMinutes`.

- [ ] **Step 1: Write failing resolver, runtime, and migration tests**

```ts
test('resolves legacy whole hours to canonical minutes', () => {
  expect(resolveWorkflowFollowUpStartAfterMinutes({ startAfterHours: 24 })).toBe(1440);
});

test('prefers explicitly stored canonical minutes', () => {
  expect(resolveWorkflowFollowUpStartAfterMinutes({
    startAfterHours: 24,
    startAfterMinutes: 15,
  })).toBe(15);
});

test('rejects a stored follow-up delay with no valid duration', () => {
  expect(() => resolveWorkflowFollowUpStartAfterMinutes({})).toThrow(
    'Follow-up start delay is missing',
  );
});
```

- [ ] **Step 2: Run focused Convex tests and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowFollowUpStartAfter.test.ts convex/workflowFollowUpRuntime.test.ts`

Expected: FAIL because canonical-minute resolution and runtime use do not exist.

- [ ] **Step 3: Widen validation and resolve explicit legacy data**

```ts
startAfterMinutes: v.optional(v.number()),
startAfterHours: v.optional(v.number()),
customStartAfter: v.optional(workflowFollowupCustomStartAfterValidator),
```

```ts
export function resolveWorkflowFollowUpStartAfterMinutes(stored: {
  startAfterMinutes?: number;
  startAfterHours?: number;
}) {
  if (Number.isInteger(stored.startAfterMinutes) && stored.startAfterMinutes > 0) {
    return stored.startAfterMinutes;
  }
  if (Number.isInteger(stored.startAfterHours) && stored.startAfterHours > 0) {
    return stored.startAfterHours * 60;
  }
  throw new Error('Follow-up start delay is missing');
}
```

- [ ] **Step 4: Schedule and reconcile using exact minutes**

```ts
startAfterMs: config.startAfterMinutes * 60 * 1000,
```

```ts
if (message.createdAt + config.startAfterMinutes * 60 * 1000 <= now) continue;
```

- [ ] **Step 5: Add the bounded migration runner**

```ts
export const backfillWorkflowFollowUpStartAfterMinutes = migrations.define({
  table: 'workflows',
  migrateOne: async (_ctx, workflow) => {
    const followUp = workflow.followUpAutomation;
    if (!followUp || followUp.startAfterMinutes !== undefined) return;
    return {
      followUpAutomation: {
        ...followUp,
        startAfterMinutes: resolveWorkflowFollowUpStartAfterMinutes(followUp),
      },
    };
  },
});
```

- [ ] **Step 6: Update fixtures and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowFollowUpStartAfter.test.ts convex/workflowFollowUpRuntime.test.ts src/pages/workflowDraftPersistence.test.ts src/components/workflow/workflowDraftModel.test.ts`

Expected: PASS with fixtures using `startAfterMinutes: 1440` for new-format data and explicit legacy cases retaining `startAfterHours`.

### Task 4: Migration dry run and complete verification

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes all deliverables from Tasks 1–3.
- Produces verification receipts and migration status for handoff.

- [ ] **Step 1: Run generated API/code validation**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen`

Expected: exit 0.

- [ ] **Step 2: Run the migration dry run only**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex run workflowFollowUpStartAfterMigration:runBackfillWorkflowFollowUpStartAfterMinutes '{"dryRun":true}'`

Expected: migration reports eligible documents without writing them. Do not run the live backfill without separate explicit authorization.

- [ ] **Step 3: Run full automated verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run`

Expected: all tests pass.

- [ ] **Step 4: Run static and production verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint shared/workflowAutomations.ts src/components/workflow/workflowFollowupStartAfterOptions.tsx src/components/workflow/WorkflowFollowupStartAfterField.tsx src/components/workflow/WorkflowFollowupScheduleFields.tsx src/components/workflow/workflowFollowupOptions.tsx src/components/workflow/workflowAutomationContext.ts src/components/workflow/workflowAutomationState.tsx src/components/workflow/workflowFollowupSummary.ts src/components/workflow/WorkflowFollowupSummaryNode.tsx convex/workflowFollowUpStartAfterMigration.ts convex/workflowAutomationValidators.ts convex/workflowAutomationConfig.ts convex/workflowFollowUpRuntime.ts convex/workflowAutomationReconciliation.ts && bun run build && git diff --check`

Expected: exit 0; the existing Vite chunk-size advisory may remain.

- [ ] **Step 5: Enforce the modularity limit and update continuity**

Run: `wc -l shared/workflowAutomations.ts src/components/workflow/workflowFollowupStartAfterOptions.tsx src/components/workflow/WorkflowFollowupStartAfterField.tsx src/components/workflow/WorkflowFollowupScheduleFields.tsx src/components/workflow/workflowFollowupOptions.tsx src/components/workflow/workflowAutomationContext.ts src/components/workflow/workflowAutomationState.tsx src/components/workflow/workflowFollowupSummary.ts src/components/workflow/WorkflowFollowupSummaryNode.tsx convex/workflowFollowUpStartAfterMigration.ts convex/workflowAutomationValidators.ts convex/workflowAutomationConfig.ts convex/workflowFollowUpRuntime.ts convex/workflowAutomationReconciliation.ts`

Expected: every production code file is at most 300 lines. Record the verified results and leave the live migration unapplied pending authorization.
