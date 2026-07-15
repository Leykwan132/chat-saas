# Workflow Follow-up Single-message Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open one-attempt Follow-up message selection directly in the single-template picker without exposing Same-message versus Different-messages strategy choices.

**Architecture:** Keep the behavior inside `WorkflowFollowupMessageDialog` so all existing entry points remain consistent. Derive a single-attempt flow from the existing maximum-attempt summary, use that derivation for initial and reset state, preserve the first active Different-message template, and leave multi-attempt navigation unchanged.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui Dialog, Vitest, ESLint, Vite

## Global Constraints

- Use Node v22 for every script and test command.
- One attempt must open directly at the `configure` stage.
- One attempt must use the pending `same` strategy and hide both strategy cards and the Back action.
- Opening the dialog must apply the latest attempt count and saved configuration even when the component mounted earlier.
- Reducing a Different-messages configuration to one attempt must preserve attempt template zero as the pending single template.
- Confirm is the only action that persists the Same-message strategy and selected template.
- Multiple attempts must retain the current Same-message versus Different-messages flow.
- Keep every touched code file below 300 lines.
- Do not stage or modify unrelated dirty-worktree changes.

---

### Task 1: Make the Follow-up message dialog attempt-aware

**Files:**
- Modify: `src/components/workflow/WorkflowFollowupMessageDialog.test.ts`
- Modify: `src/components/workflow/WorkflowFollowupMessageDialog.tsx`

**Interfaces:**
- Consumes: `summary.maxAttemptsLabel`, `initialStage`, `followupMessageStrategy`, `followupSameTemplate`, and `followupAttemptTemplates`.
- Produces: dialog-local `singleAttempt`, `initialMessageStage`, `initialMessageStrategy`, and `initialSameTemplate` values used for initialization and reset.

- [x] **Step 1: Add failing one-attempt flow assertions**

Append this test to `WorkflowFollowupMessageDialog.test.ts`:

```ts
test('one attempt opens the single-message picker without strategy navigation', () => {
  expect(source).toContain('const singleAttempt = maxAttemptsCount === 1;');
  expect(source).toContain("const initialMessageStage = singleAttempt ? 'configure' : initialStage;");
  expect(source).toContain("const initialMessageStrategy = singleAttempt ? 'same' : followupMessageStrategy;");
  expect(source).toContain("singleAttempt && followupMessageStrategy === 'different'");
  expect(source).toContain('? followupAttemptTemplates[0]');
  expect(source).toContain('useState<MessageStage>(initialMessageStage)');
  expect(source).toContain('useState(initialMessageStrategy)');
  expect(source).toContain('useState(initialSameTemplate)');
  expect(source).toContain('setStage(initialMessageStage)');
  expect(source).toContain('setPendingMessageStrategy(initialMessageStrategy)');
  expect(source).toContain('setPendingSameTemplate(initialSameTemplate)');
  expect(source).toContain("singleAttempt ? 'justify-end sm:justify-end'");
  expect(source).toContain('{!singleAttempt && (');
});
```

- [x] **Step 2: Run the focused test and verify the new test fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowFollowupMessageDialog.test.ts
```

Expected: the new test fails because the dialog still initializes from `initialStage` and the saved strategy without checking the maximum attempts.

- [x] **Step 3: Derive one-attempt initial state before local state initialization**

In `WorkflowFollowupMessageDialog.tsx`, move the existing Follow-up summary and maximum-attempt calculation before the dialog-local state declarations, then add:

```tsx
const singleAttempt = maxAttemptsCount === 1;
const initialMessageStage = singleAttempt ? 'configure' : initialStage;
const initialMessageStrategy = singleAttempt ? 'same' : followupMessageStrategy;
const initialSameTemplate = singleAttempt && followupMessageStrategy === 'different'
  ? followupAttemptTemplates[0]
  : followupSameTemplate;
```

Initialize the affected state with:

```tsx
const [stage, setStage] = useState<MessageStage>(initialMessageStage);
const [pendingMessageStrategy, setPendingMessageStrategy] =
  useState(initialMessageStrategy);
const [pendingSameTemplate, setPendingSameTemplate] =
  useState(initialSameTemplate);
```

- [x] **Step 4: Reapply the derived flow when the dialog closes**

Update `resetPendingConfiguration` so its unconfirmed branch and stage reset are:

```tsx
if (!confirmedConfigurationRef.current) {
  setPendingMessageStrategy(initialMessageStrategy);
  setPendingSameTemplate(initialSameTemplate);
  setPendingAttemptTemplates([...followupAttemptTemplates]);
}
confirmedConfigurationRef.current = false;
setStage(initialMessageStage);
```

- [x] **Step 5: Use singular copy and remove one-attempt strategy navigation**

Set the configuration description with:

```tsx
const configureDescription = singleAttempt
  ? 'This message will be sent for the follow-up.'
  : pendingMessageStrategy === 'same'
    ? `This message will be sent for all ${maxAttemptsCount} follow-ups.`
    : 'Choose a message for each follow-up.';
```

Set the footer classes with:

```tsx
className={cn(
  'shrink-0 flex-row border-t border-border pt-5',
  singleAttempt ? 'justify-end sm:justify-end' : 'justify-between sm:justify-between',
)}
```

Wrap the existing Back button with:

```tsx
{!singleAttempt && (
  <Button
    type="button"
    variant="outline"
    onClick={() => setStage('strategy')}
    className="h-10 gap-2 px-4 font-bold transition-all active:scale-[0.98]"
  >
    <ChevronLeft className="size-4" />
    Back
  </Button>
)}
```

- [x] **Step 6: Run the focused test and verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowFollowupMessageDialog.test.ts
```

Expected: all tests in the focused file pass.

- [x] **Step 7: Run full verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/workflow/WorkflowFollowupMessageDialog.tsx src/components/workflow/WorkflowFollowupMessageDialog.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
wc -l src/components/workflow/WorkflowFollowupMessageDialog.tsx src/components/workflow/WorkflowFollowupMessageDialog.test.ts
```

Expected: ESLint exits without errors, the complete test suite passes, the production build succeeds, `git diff --check` emits no output, and both touched code files stay below 300 lines.

- [x] **Step 8: Commit only the scoped single-message flow**

```bash
git add src/components/workflow/WorkflowFollowupMessageDialog.tsx src/components/workflow/WorkflowFollowupMessageDialog.test.ts docs/superpowers/plans/2026-07-15-workflow-followup-single-message-flow.md CONTINUITY.md
git commit -m "Skip follow-up strategy for one attempt"
```
