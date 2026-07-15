# Workflow Automation Active-state Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a color-coded `Active` or `Inactive` label immediately before the Reminder and Follow-up setup switches.

**Architecture:** Keep the label local to each existing setup header and derive its copy and color from the same `automation.enabled` boolean already passed to the Switch. Group the label and Switch in a non-interactive flex container so activation, validation, persistence, and accessibility behavior remain unchanged.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui Switch, Vitest, ESLint, Vite

## Global Constraints

- Use Node v22 for every script and test command.
- Render the state label immediately before the existing Switch in both setup headers.
- Render `Active` with `text-emerald-600` and `Inactive` with `text-muted-foreground`.
- Give the label a fixed `w-14` right-aligned slot so the control does not shift.
- Preserve the existing Switch props and activation validation behavior.
- Do not change `WorkflowAutomationNode` or switches outside these two setup nodes.
- Keep every touched code file below 300 lines.

---

### Task 1: Add state labels to both workflow setup switches

**Files:**
- Modify: `src/components/workflow/WorkflowAutomationActivationNodes.test.ts`
- Modify: `src/components/workflow/WorkflowReminderSetupNode.tsx`
- Modify: `src/components/workflow/WorkflowFollowupSetupNode.tsx`

**Interfaces:**
- Consumes: `automation.enabled: boolean` in each setup node.
- Produces: a non-interactive label whose copy and class derive from `automation.enabled` immediately before the existing Switch.

- [x] **Step 1: Add the failing shared source regression**

Append this test to `WorkflowAutomationActivationNodes.test.ts`:

```ts
test.each([
  './WorkflowReminderSetupNode.tsx',
  './WorkflowFollowupSetupNode.tsx',
])('%s shows a color-coded state label before its switch', (filename) => {
  const source = readSource(filename);
  const statusLabelIndex = source.indexOf("automation.enabled ? 'Active' : 'Inactive'");
  const switchIndex = source.indexOf('<Switch', statusLabelIndex);

  expect(source).toContain("automation.enabled ? 'text-emerald-600' : 'text-muted-foreground'");
  expect(source).toContain("'w-14 text-right text-xs font-medium'");
  expect(source).toContain('aria-hidden="true"');
  expect(statusLabelIndex).toBeGreaterThan(-1);
  expect(switchIndex).toBeGreaterThan(statusLabelIndex);
});
```

- [x] **Step 2: Run the focused test and verify the new cases fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowAutomationActivationNodes.test.ts
```

Expected: the two new parameterized cases fail because neither setup header renders the state label yet.

- [x] **Step 3: Add the Reminder state label immediately before its Switch**

Replace the standalone Switch in `WorkflowReminderSetupNode.tsx` with:

```tsx
<div className="flex shrink-0 items-center gap-2">
  <span
    aria-hidden="true"
    className={cn(
      'w-14 text-right text-xs font-medium',
      automation.enabled ? 'text-emerald-600' : 'text-muted-foreground',
    )}
  >
    {automation.enabled ? 'Active' : 'Inactive'}
  </span>
  <Switch
    checked={automation.enabled}
    onCheckedChange={handleEnabledChange}
    aria-label={`${data.title} enabled`}
    className="nodrag nopan shrink-0 data-[state=checked]:bg-emerald-600"
    onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => event.stopPropagation()}
  />
</div>
```

- [x] **Step 4: Add the identical Follow-up state label immediately before its Switch**

Replace the standalone Switch in `WorkflowFollowupSetupNode.tsx` with:

```tsx
<div className="flex shrink-0 items-center gap-2">
  <span
    aria-hidden="true"
    className={cn(
      'w-14 text-right text-xs font-medium',
      automation.enabled ? 'text-emerald-600' : 'text-muted-foreground',
    )}
  >
    {automation.enabled ? 'Active' : 'Inactive'}
  </span>
  <Switch
    checked={automation.enabled}
    onCheckedChange={handleEnabledChange}
    aria-label={`${data.title} enabled`}
    className="nodrag nopan shrink-0 data-[state=checked]:bg-emerald-600"
    onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => event.stopPropagation()}
  />
</div>
```

- [x] **Step 5: Run the focused test and verify all cases pass**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowAutomationActivationNodes.test.ts
```

Expected: all cases in the focused file pass.

- [x] **Step 6: Run full verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/workflow/WorkflowReminderSetupNode.tsx src/components/workflow/WorkflowFollowupSetupNode.tsx src/components/workflow/WorkflowAutomationActivationNodes.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
wc -l src/components/workflow/WorkflowReminderSetupNode.tsx src/components/workflow/WorkflowFollowupSetupNode.tsx src/components/workflow/WorkflowAutomationActivationNodes.test.ts
```

Expected: ESLint exits without errors, the complete test suite passes, the production build succeeds, `git diff --check` emits no output, and all touched code files remain below 300 lines.

- [x] **Step 7: Commit only the scoped label implementation**

```bash
git add src/components/workflow/WorkflowReminderSetupNode.tsx src/components/workflow/WorkflowFollowupSetupNode.tsx src/components/workflow/WorkflowAutomationActivationNodes.test.ts docs/superpowers/plans/2026-07-15-workflow-automation-active-state-labels.md CONTINUITY.md
git commit -m "Label workflow automation switch states"
```
