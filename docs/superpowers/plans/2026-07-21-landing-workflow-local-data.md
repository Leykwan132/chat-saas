# Landing Workflow Local Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the public landing workflow demo from issuing authenticated organization queries when visitors open Reminder or Follow-up.

**Architecture:** Add a required `authenticated | local` data-mode contract at the shared `WorkflowCanvas` boundary and propagate it through workflow automation state. The WhatsApp-template hook receives that mode explicitly, skips its organization-scoped Convex query in local mode, and preserves the existing authenticated query sequence for the dashboard.

**Tech Stack:** React 19, TypeScript 6, Convex React 1.36, Vitest 1.6, Bun, Node 22

## Global Constraints

- Run every script and test with Node 22 selected in the same shell command.
- Keep every code file at or below 300 lines.
- Add no comments unless a non-obvious workaround cannot be simplified.
- Do not add a default data mode or infer it from `agentId`.
- Do not change Convex functions or weaken backend authentication.
- Keep Reminder and Follow-up interactive in the public landing demo.
- Keep authenticated dashboard channel and approved-template loading unchanged.

---

### Task 1: Establish the explicit workflow data-mode boundary

**Files:**
- Create: `src/components/workflow/workflowLocalDataMode.test.ts`
- Modify: `src/components/workflow/workflowAutomationContext.ts`
- Modify: `src/components/workflow/workflowAutomationState.tsx`
- Modify: `src/components/workflow/WorkflowCanvas.tsx`
- Modify: `src/components/landing/LandingAppPreviewWorkflow.tsx`
- Modify: `src/pages/WorkflowPage.tsx`

**Interfaces:**
- Produces: `WorkflowCanvasDataMode = 'authenticated' | 'local'` from `workflowAutomationContext.ts`.
- Produces: required `dataMode: WorkflowCanvasDataMode` on `WorkflowCanvasProps`, `WorkflowAutomationStateProvider`, and `WorkflowAutomationStateContextValue`.
- Produces: landing entrypoint passes `dataMode="local"`; dashboard entrypoint passes `dataMode="authenticated"`.

- [ ] **Step 1: Write the failing propagation contract**

Create `workflowLocalDataMode.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const readWorkflowSource = (filename: string) => readFileSync(
  new URL(filename, import.meta.url),
  'utf8',
);

test('workflow canvas requires and propagates an explicit data mode', () => {
  const contextSource = readWorkflowSource('./workflowAutomationContext.ts');
  const stateSource = readWorkflowSource('./workflowAutomationState.tsx');
  const canvasSource = readWorkflowSource('./WorkflowCanvas.tsx');

  expect(contextSource).toContain(
    "export type WorkflowCanvasDataMode = 'authenticated' | 'local';",
  );
  expect(contextSource).toContain('dataMode: WorkflowCanvasDataMode;');
  expect(canvasSource).toContain('dataMode: WorkflowCanvasDataMode;');
  expect(canvasSource).toContain('dataMode={props.dataMode}');
  expect(stateSource).toContain('dataMode: WorkflowCanvasDataMode;');
  expect(stateSource).toContain('dataMode,');
  expect(stateSource).toContain('[agentId, configs, dataMode, onChange]');
});

test('landing uses local data while dashboard uses authenticated data', () => {
  const landingSource = readFileSync(
    new URL('../landing/LandingAppPreviewWorkflow.tsx', import.meta.url),
    'utf8',
  );
  const dashboardSource = readFileSync(
    new URL('../../pages/WorkflowPage.tsx', import.meta.url),
    'utf8',
  );

  expect(landingSource).toContain('dataMode="local"');
  expect(dashboardSource).toContain('dataMode="authenticated"');
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowLocalDataMode.test.ts
```

Expected: FAIL because the data-mode type, provider propagation, and explicit entrypoint values do not exist.

- [ ] **Step 3: Add and propagate the required data mode**

Add to `workflowAutomationContext.ts` and its context value:

```ts
export type WorkflowCanvasDataMode = 'authenticated' | 'local';

export type WorkflowAutomationStateContextValue = {
  configs: WorkflowAutomationConfigs;
  dataMode: WorkflowCanvasDataMode;
```

Add a required provider property in `workflowAutomationState.tsx`, include it in the context value, and include it in the memo dependency list:

```ts
  dataMode: WorkflowCanvasDataMode;
```

```ts
    configs,
    dataMode,
    agentId,
```

```ts
  }, [agentId, configs, dataMode, onChange]);
```

Add the same required property to `WorkflowCanvasProps` and pass it to the provider:

```ts
  dataMode: WorkflowCanvasDataMode;
```

```tsx
dataMode={props.dataMode}
```

Set each entrypoint explicitly:

```tsx
dataMode="local"
```

```tsx
dataMode="authenticated"
```

- [ ] **Step 4: Run the focused contract and verify GREEN**

Run the Step 2 command again.

Expected: PASS with an explicit, required mode from both entrypoints through automation context.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/components/workflow/workflowLocalDataMode.test.ts src/components/workflow/workflowAutomationContext.ts src/components/workflow/workflowAutomationState.tsx src/components/workflow/WorkflowCanvas.tsx src/components/landing/LandingAppPreviewWorkflow.tsx src/pages/WorkflowPage.tsx
git commit -m "Add workflow canvas data mode"
```

---

### Task 2: Skip authenticated template queries in local mode

**Files:**
- Modify: `src/components/workflow/workflowLocalDataMode.test.ts`
- Modify: `src/components/workflow/workflowWhatsappTemplates.ts`
- Modify: `src/components/workflow/WorkflowReminderMessageDialog.tsx`
- Modify: `src/components/workflow/WorkflowFollowupMessageDialog.tsx`

**Interfaces:**
- Consumes: required `WorkflowCanvasDataMode` and context `dataMode` from Task 1.
- Produces: `useWorkflowWhatsappTemplates(dataMode: WorkflowCanvasDataMode)`.
- Behavior: local mode passes `skip` to `channels:listForCurrentOrg`, returns no templates, reports zero channels, and is not loading; authenticated mode retains the current channel/template query sequence.

- [ ] **Step 1: Write the failing query-gating contract**

Append to `workflowLocalDataMode.test.ts`:

```ts
test('local workflow template consumers skip organization-scoped queries', () => {
  const templatesSource = readWorkflowSource('./workflowWhatsappTemplates.ts');
  const reminderSource = readWorkflowSource('./WorkflowReminderMessageDialog.tsx');
  const followupSource = readWorkflowSource('./WorkflowFollowupMessageDialog.tsx');

  expect(templatesSource).toContain(
    "dataMode === 'authenticated' ? {} : 'skip'",
  );
  expect(templatesSource).toContain(
    "dataMode === 'authenticated' && (",
  );
  expect(reminderSource).toContain('useWorkflowWhatsappTemplates(dataMode)');
  expect(followupSource).toContain('useWorkflowWhatsappTemplates(dataMode)');
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowLocalDataMode.test.ts
```

Expected: FAIL because the shared hook still takes no mode and always queries `channels:listForCurrentOrg`.

- [ ] **Step 3: Gate the template queries and connect both consumers**

Change the hook signature and channel query in `workflowWhatsappTemplates.ts`:

```ts
export function useWorkflowWhatsappTemplates(dataMode: WorkflowCanvasDataMode) {
  const channels = useQuery(
    api.channels.listForCurrentOrg,
    dataMode === 'authenticated' ? {} : 'skip',
  );
```

Make loading authenticated-only:

```ts
    templatesLoading:
      dataMode === 'authenticated' && (
        channels === undefined || (Boolean(channelId) && templatesQuery === undefined)
      ),
```

In both dialog components, read `dataMode` from `useWorkflowAutomationState()` and call:

```ts
useWorkflowWhatsappTemplates(dataMode)
```

- [ ] **Step 4: Run focused and regression tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowLocalDataMode.test.ts src/components/workflow/WorkflowCanvas.test.ts src/components/landing/landingAppPreviewData.test.ts src/components/landing/LandingAppPreviewWorkflow.test.ts src/pages/WorkflowPage.test.ts
```

Expected: PASS; the landing and dashboard data modes are explicit, local organization reads are skipped, and existing Workflow-first/compact-density contracts still pass.

- [ ] **Step 5: Run scoped quality checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/workflow/workflowLocalDataMode.test.ts src/components/workflow/workflowAutomationContext.ts src/components/workflow/workflowAutomationState.tsx src/components/workflow/WorkflowCanvas.tsx src/components/workflow/workflowWhatsappTemplates.ts src/components/workflow/WorkflowReminderMessageDialog.tsx src/components/workflow/WorkflowFollowupMessageDialog.tsx src/components/landing/LandingAppPreviewWorkflow.tsx src/pages/WorkflowPage.tsx
```

Run:

```bash
git diff --check
```

Run:

```bash
wc -l src/components/workflow/workflowLocalDataMode.test.ts src/components/workflow/workflowAutomationContext.ts src/components/workflow/workflowAutomationState.tsx src/components/workflow/WorkflowCanvas.tsx src/components/workflow/workflowWhatsappTemplates.ts src/components/workflow/WorkflowReminderMessageDialog.tsx src/components/workflow/WorkflowFollowupMessageDialog.tsx src/components/landing/LandingAppPreviewWorkflow.tsx src/pages/WorkflowPage.tsx
```

Expected: ESLint and diff checks pass, and every touched code file remains at or below 300 lines.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/components/workflow/workflowLocalDataMode.test.ts src/components/workflow/workflowWhatsappTemplates.ts src/components/workflow/WorkflowReminderMessageDialog.tsx src/components/workflow/WorkflowFollowupMessageDialog.tsx CONTINUITY.md
git commit -m "Keep landing workflow template data local"
```
