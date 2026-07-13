# Workflow Automation Scope Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tall stacked Apply to options with a compact horizontal single-select control shared by Reminder and Follow-up.

**Architecture:** Keep `WorkflowAutomationScopeField` as the only scope-control component. Use the installed shadcn `ToggleGroup` in single mode with two equal columns, and derive one helper description from the controlled `value` outside the buttons.

**Tech Stack:** React, TypeScript, shadcn/ui ToggleGroup, Tailwind CSS, Vitest

## Global Constraints

- Node.js v22 is required for every script and test command.
- Keep `type="single"`; no default scope is introduced.
- Buttons contain labels only and share the available width equally.
- Only the selected option's existing description appears below the group.
- Preserve draft Save semantics, activation validation, pointer behavior, and keyboard behavior.
- Keep every modified code file below 300 lines.

---

### Task 1: Compact horizontal scope selector

**Files:**
- Modify: `src/components/workflow/WorkflowAutomationScope.test.ts`
- Modify: `src/components/workflow/WorkflowAutomationScopeField.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `WorkflowAutomationScopeFieldProps.value?: WorkflowAutomationActivationScope` and the existing label/description props.
- Produces: the unchanged `WorkflowAutomationScopeField` component contract and `onChange(scope)` callback, now rendered as a compact horizontal single-select group.

- [ ] **Step 1: Write the failing layout and description tests**

Read `WorkflowAutomationScopeField.tsx` in the test and assert that it uses `type="single"`, `spacing={0}`, `grid-cols-2`, compact item height, and a `selectedDescription` outside both `ToggleGroupItem` elements. Assert that the source no longer contains `orientation="vertical"`, `flex-col items-start`, or description spans inside either item.

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowAutomationScope.test.ts
```

Expected: FAIL because the shared component is still vertical and renders both descriptions inside the buttons.

- [ ] **Step 3: Implement the compact control**

In `WorkflowAutomationScopeField.tsx`:

```tsx
const selectedDescription = value === 'currentAndFuture'
  ? currentAndFutureDescription
  : value === 'futureOnly'
    ? futureOnlyDescription
    : undefined;

<ToggleGroup
  type="single"
  spacing={0}
  value={value ?? ''}
  onValueChange={(nextValue) => {
    if (nextValue === 'currentAndFuture' || nextValue === 'futureOnly') {
      onChange(nextValue);
    }
  }}
  className="nodrag nopan grid w-full grid-cols-2"
>
  <ToggleGroupItem value="currentAndFuture" className="h-9 w-full font-semibold">
    {currentAndFutureLabel}
  </ToggleGroupItem>
  <ToggleGroupItem value="futureOnly" className="h-9 w-full font-semibold">
    {futureOnlyLabel}
  </ToggleGroupItem>
</ToggleGroup>
{selectedDescription && (
  <FieldDescription>{selectedDescription}</FieldDescription>
)}
```

Keep the existing accessible label, invalid state, semantic selected colors, and destructive validation message.

- [ ] **Step 4: Run focused workflow tests to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowAutomationScope.test.ts src/components/workflow/WorkflowAutomationActivationNodes.test.ts src/components/workflow/workflowAutomationActivation.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Verify types, lint, whitespace, and LOC**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/workflow/WorkflowAutomationScopeField.tsx src/components/workflow/WorkflowAutomationScope.test.ts
git diff --check
wc -l src/components/workflow/WorkflowAutomationScopeField.tsx src/components/workflow/WorkflowAutomationScope.test.ts
```

Expected: commands pass and both code files remain below 300 lines.

- [ ] **Step 6: Record and commit the implementation**

Update `CONTINUITY.md` with the completed layout and verification receipt, then commit:

```bash
git add CONTINUITY.md src/components/workflow/WorkflowAutomationScopeField.tsx src/components/workflow/WorkflowAutomationScope.test.ts docs/superpowers/plans/2026-07-13-workflow-automation-scope-selector.md
git commit -m "Compact workflow scope selector"
```
