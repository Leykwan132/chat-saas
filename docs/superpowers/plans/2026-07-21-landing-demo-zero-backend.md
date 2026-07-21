# Landing Demo Zero-Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every public landing workflow interaction client-local by preventing all shared workflow backend capabilities from mounting or querying in local mode.

**Architecture:** Strengthen the existing required `WorkflowCanvasDataMode` into a capability firewall. Local mode strips agent identity, renders guide content without the permission-aware child, explicitly skips audience/template/media queries, and preserves the existing authenticated dashboard paths.

**Tech Stack:** React 19, TypeScript 6, Convex React 1.36, React Router 7, Vitest 1.6, Bun, Node 22

## Global Constraints

- Run every script and test with Node 22 selected in the same shell command.
- Keep every code file at or below 300 lines.
- Add no comments unless a non-obvious workaround cannot be simplified.
- The public landing workflow must issue no Convex query, mutation, action, permission, team-access, organization, or auth request.
- Do not add a fallback data mode or infer mode from `agentId`.
- Do not change Convex functions, schema, authentication, or authorization.
- Keep authenticated dashboard workflow behavior unchanged.
- Keep current local graph, Reminder, Follow-up, guide, calculator, selector, and inspector interactions available.

---

### Task 1: Block agent and permission capabilities in local mode

**Files:**
- Modify: `src/components/workflow/workflowLocalDataMode.test.ts`
- Modify: `src/components/workflow/workflowAutomationState.tsx`
- Modify: `src/components/workflow/WorkflowFollowupGuides.tsx`
- Modify: `src/components/workflow/WorkflowFollowupAudienceField.tsx`

**Interfaces:**
- Consumes: required `WorkflowCanvasDataMode` from workflow automation context.
- Produces: local provider value always has `agentId: undefined`; authenticated provider value preserves `agentId`.
- Produces: `AuthenticatedWorkflowFollowupGuides` is the only guide component that calls `usePermissions`.
- Produces: Follow-up audience customer query runs only when `dataMode === 'authenticated'` and a route agent ID exists.

- [ ] **Step 1: Write failing zero-backend capability contracts**

Append to `workflowLocalDataMode.test.ts`:

```ts
test('local workflow state strips agent identity from descendants', () => {
  const stateSource = readWorkflowSource('./workflowAutomationState.tsx');

  expect(stateSource).toContain(
    "agentId: dataMode === 'authenticated' ? agentId : undefined,",
  );
});

test('local follow-up guides do not mount permission checks', () => {
  const guidesSource = readWorkflowSource('./WorkflowFollowupGuides.tsx');

  expect(guidesSource).toContain('function AuthenticatedWorkflowFollowupGuides(');
  expect(guidesSource).toContain('const { can } = usePermissions();');
  expect(guidesSource).toContain("if (dataMode === 'local') {");
  expect(guidesSource).toContain('canManage={false}');
  expect(guidesSource).toContain('<AuthenticatedWorkflowFollowupGuides');
});

test('local follow-up audience skips customer queries regardless of route', () => {
  const audienceSource = readWorkflowSource('./WorkflowFollowupAudienceField.tsx');

  expect(audienceSource).toContain("dataMode === 'authenticated' && agentId");
  expect(audienceSource).toContain("? { agentId: agentId as Id<'agents'> }");
  expect(audienceSource).toContain(": 'skip'");
});
```

- [ ] **Step 2: Run the contracts and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowLocalDataMode.test.ts
```

Expected: FAIL because local state still exposes a supplied agent ID, the guide node mounts `usePermissions` directly, and the audience query is gated only by the route agent ID.

- [ ] **Step 3: Strip local agent identity**

Change the provider value in `workflowAutomationState.tsx`:

```ts
    configs,
    dataMode,
    agentId: dataMode === 'authenticated' ? agentId : undefined,
```

- [ ] **Step 4: Separate local guide content from authenticated permissions**

Refactor `WorkflowFollowupGuides.tsx` so the existing visual content is rendered by:

```ts
function WorkflowFollowupGuidesContent({
  agentId,
  canManage,
}: {
  agentId?: string;
  canManage: boolean;
}) {
```

Move the existing walkthrough/calculator state and JSX into that component. Add the only permission-aware component:

```tsx
function AuthenticatedWorkflowFollowupGuides({ agentId }: { agentId?: string }) {
  const { can } = usePermissions();

  return (
    <WorkflowFollowupGuidesContent
      agentId={agentId}
      canManage={can(Permission.FOLLOWUPS_MANAGE)}
    />
  );
}
```

Make the exported React Flow node select the capability before mounting the authenticated child:

```tsx
export function WorkflowFollowupGuidesNode(
  _props: NodeProps<WorkflowFollowupGuidesFlowNode>,
) {
  const { agentId } = useParams();
  const { dataMode } = useWorkflowAutomationState();

  if (dataMode === 'local') {
    return <WorkflowFollowupGuidesContent canManage={false} />;
  }

  return <AuthenticatedWorkflowFollowupGuides agentId={agentId} />;
}
```

- [ ] **Step 5: Gate the audience query by data mode**

In `useWorkflowAudienceGroups`, read local mode and change its query arguments:

```ts
  const { agentId } = useParams();
  const { dataMode } = useWorkflowAutomationState();
  const candidates = useQuery(
    api.customers.listForAgentBroadcast,
    dataMode === 'authenticated' && agentId
      ? { agentId: agentId as Id<'agents'> }
      : 'skip',
  );
```

- [ ] **Step 6: Run the focused contracts and verify GREEN**

Run the Step 2 command again.

Expected: PASS; local mode exposes no agent identity, mounts no permission hook, and skips customer lookup even on a dashboard-shaped route.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/components/workflow/workflowLocalDataMode.test.ts src/components/workflow/workflowAutomationState.tsx src/components/workflow/WorkflowFollowupGuides.tsx src/components/workflow/WorkflowFollowupAudienceField.tsx
git commit -m "Block landing workflow auth capabilities"
```

---

### Task 2: Prevent local template media reads and verify the full boundary

**Files:**
- Modify: `src/components/workflow/workflowLocalDataMode.test.ts`
- Modify: `src/components/WhatsAppTemplatePreview.tsx`
- Modify: `src/components/workflow/WorkflowReminderMessageDialog.tsx`
- Modify: `src/components/workflow/WorkflowFollowupMessageDialog.tsx`
- Modify: `src/components/landing/landingAppPreviewData.test.ts`

**Interfaces:**
- Consumes: workflow dialog `dataMode` from automation context.
- Produces: an explicitly supplied `overrideHeaderMediaPreviewUrl`, including `null`, prevents `WhatsAppTemplatePreview` from querying a signed public URL.
- Produces: both workflow dialogs pass `null` in local mode and preserve `undefined` in authenticated mode.

- [ ] **Step 1: Write failing media and landing-boundary contracts**

Append to `workflowLocalDataMode.test.ts`:

```ts
test('local workflow template previews cannot request signed media URLs', () => {
  const previewSource = readFileSync(
    new URL('../WhatsAppTemplatePreview.tsx', import.meta.url),
    'utf8',
  );
  const reminderSource = readWorkflowSource('./WorkflowReminderMessageDialog.tsx');
  const followupSource = readWorkflowSource('./WorkflowFollowupMessageDialog.tsx');

  expect(previewSource).toContain(
    'overrideHeaderMediaPreviewUrl === undefined && headerR2Key',
  );
  expect(reminderSource).toContain(
    "overrideHeaderMediaPreviewUrl={dataMode === 'local' ? null : undefined}",
  );
  expect(followupSource).toContain(
    "overrideHeaderMediaPreviewUrl={dataMode === 'local' ? null : undefined}",
  );
});
```

Extend the existing landing workflow source test in `landingAppPreviewData.test.ts`:

```ts
  expect(workflowSource).not.toContain('agentId=');
  expect(workflowSource).not.toContain('useAction');
```

- [ ] **Step 2: Run the contracts and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowLocalDataMode.test.ts src/components/landing/landingAppPreviewData.test.ts
```

Expected: FAIL because the template preview still requests signed media whenever `r2Key` exists and workflow dialogs do not provide a local override.

- [ ] **Step 3: Make explicit media overrides suppress the query**

Change the signed-media query arguments in `WhatsAppTemplatePreview.tsx`:

```ts
  const publicMediaUrl = useQuery(
    api.media.attachments.getPublicUrl,
    overrideHeaderMediaPreviewUrl === undefined && headerR2Key
      ? { r2Key: headerR2Key }
      : 'skip',
  );
```

- [ ] **Step 4: Pass the local media override from both workflow dialogs**

Add to each `WhatsAppTemplatePreview` in `WorkflowReminderMessageDialog.tsx` and `WorkflowFollowupMessageDialog.tsx`:

```tsx
overrideHeaderMediaPreviewUrl={dataMode === 'local' ? null : undefined}
```

- [ ] **Step 5: Run focused and regression tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowLocalDataMode.test.ts src/components/workflow/WorkflowFollowupMessageDialog.test.ts src/components/workflow/WorkflowReminderMessageDialog.test.ts src/components/workflow/WorkflowCanvas.test.ts src/components/landing/landingAppPreviewData.test.ts src/components/landing/LandingAppPreviewWorkflow.test.ts src/pages/WorkflowPage.test.ts
```

Expected: PASS with zero-backend contracts and existing landing/dashboard workflow contracts intact.

- [ ] **Step 6: Run scoped quality checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/workflow/workflowLocalDataMode.test.ts src/components/workflow/workflowAutomationState.tsx src/components/workflow/WorkflowFollowupGuides.tsx src/components/workflow/WorkflowFollowupAudienceField.tsx src/components/WhatsAppTemplatePreview.tsx src/components/workflow/WorkflowReminderMessageDialog.tsx src/components/workflow/WorkflowFollowupMessageDialog.tsx src/components/landing/landingAppPreviewData.test.ts
```

Run:

```bash
git diff --check
```

Run:

```bash
wc -l src/components/workflow/workflowLocalDataMode.test.ts src/components/workflow/workflowAutomationState.tsx src/components/workflow/WorkflowFollowupGuides.tsx src/components/workflow/WorkflowFollowupAudienceField.tsx src/components/WhatsAppTemplatePreview.tsx src/components/workflow/WorkflowReminderMessageDialog.tsx src/components/workflow/WorkflowFollowupMessageDialog.tsx src/components/landing/landingAppPreviewData.test.ts
```

Expected: ESLint and diff checks pass, and every touched code file remains at or below 300 lines.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/components/workflow/workflowLocalDataMode.test.ts src/components/WhatsAppTemplatePreview.tsx src/components/workflow/WorkflowReminderMessageDialog.tsx src/components/workflow/WorkflowFollowupMessageDialog.tsx src/components/landing/landingAppPreviewData.test.ts CONTINUITY.md
git commit -m "Enforce zero-backend landing workflow"
```
