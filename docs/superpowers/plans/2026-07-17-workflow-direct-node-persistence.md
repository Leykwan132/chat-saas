# Workflow Direct Node Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Message Handling persist node and graph actions directly, keep manual dragging transient, retain automation-only Save/Discard, and add a confirmed read-only starter-template preview.

**Architecture:** Split the current whole-workflow draft boundary into a persisted message graph plus a Reminder/Follow-up-only draft. Existing direct Convex graph mutations remain in use, while focused mutations handle atomic inspector Apply, confirmed template replacement, canonical layout persistence, and automation-only Save. React Flow owns temporary drag positions and a client-only template preview presentation.

**Tech Stack:** React 19, TypeScript 6, React Flow 12, Convex 1.36, Vitest 1.6, Tailwind CSS 4, Sonner, Bun, Node v22.

## Global Constraints

- Read `convex/_generated/ai/guidelines.md` before editing Convex code.
- Run every script and test through `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- No code file may exceed 300 lines; split modules before they cross the limit.
- Do not add fallback behavior that hides development failures.
- Do not add empty `catch` blocks.
- Keep code self-explanatory and avoid comments.
- Use exact Convex validators, authenticated agent access, and bounded database reads.
- Preserve existing media validation, quotas, deletion, and storage behavior.
- Preserve dirty Reminder/Follow-up drafts across direct Message Handling mutations.
- Manual drag positions never enter a mutation, draft equality check, or Save payload.
- Use TDD for every task: write the regression first, confirm the expected failure, implement minimally, and rerun.

---

### Task 1: Add the atomic node-inspector Apply mutation

**Files:**
- Create: `convex/workflowNodeConfig.ts`
- Create: `convex/workflowNodeConfig.test.ts`
- Modify: `convex/workflowAppointmentServices.ts`
- Modify: `convex/workflowAppointmentServices.test.ts`

**Interfaces:**
- Consumes: `assertManageableAgent`, `getWorkflowForAgent`, `getWorkflowGraph`, and the existing appointment-service ownership rules.
- Produces:

```ts
api.workflowNodeConfig.apply({
  agentId,
  nodeId,
  conditionEdgeId,
  title,
  description,
  conditionLabel,
  conditionDetail,
  allowedAppointmentServiceIds,
}): Promise<WorkflowGraph>
```

- Produces:

```ts
export async function normalizeAllowedAppointmentServiceIds(
  ctx: MutationCtx,
  agentId: Id<'agents'>,
  serviceIds: Id<'appointmentServices'>[],
): Promise<Id<'appointmentServices'>[]>
```

- [ ] **Step 1: Export and regression-test the existing service normalizer**

Add a focused assertion to `convex/workflowAppointmentServices.test.ts` proving duplicate IDs normalize once and archived or cross-agent IDs reject before a node patch. Rename and export the current private helper:

```ts
export async function normalizeAllowedAppointmentServiceIds(
  ctx: MutationCtx,
  agentId: Id<'agents'>,
  serviceIds: Id<'appointmentServices'>[],
) {
  if (serviceIds.length > MAX_BOOKING_SERVICES) {
    throw new Error('Too many services selected');
  }

  const seen = new Set<Id<'appointmentServices'>>();
  const normalized: Id<'appointmentServices'>[] = [];
  for (const serviceId of serviceIds) {
    if (seen.has(serviceId)) continue;
    const service = await ctx.db.get(serviceId);
    if (
      service === null ||
      service.agentId !== agentId ||
      service.archivedAt !== undefined
    ) {
      throw new Error('Service not found');
    }
    seen.add(serviceId);
    normalized.push(serviceId);
  }
  return normalized;
}
```

- [ ] **Step 2: Run the appointment-service test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowAppointmentServices.test.ts
```

Expected: FAIL because `normalizeAllowedAppointmentServiceIds` is not exported under the required name.

- [ ] **Step 3: Implement and verify the exported normalizer**

Update `updateAllowedServices` to call `normalizeAllowedAppointmentServiceIds`, then rerun the Task 1 test command. Expected: PASS.

- [ ] **Step 4: Write the failing atomic Apply tests**

Create `convex/workflowNodeConfig.test.ts` using `convex-test`. Cover one successful transaction and three rejection paths:

```ts
const updated = await authed.mutation(api.workflowNodeConfig.apply, {
  agentId,
  nodeId: bookingNode._id,
  conditionEdgeId: bookingEdge._id,
  title: 'Schedule a consultation',
  description: '',
  conditionLabel: 'Ready to book',
  conditionDetail: 'When the customer asks for an appointment',
  allowedAppointmentServiceIds: [serviceId, serviceId],
});

expect(updated.nodes.find((node) => node._id === bookingNode._id)).toMatchObject({
  title: 'Schedule a consultation',
  description: undefined,
  allowedAppointmentServiceIds: [serviceId],
});
expect(updated.edges.find((edge) => edge._id === bookingEdge._id)).toMatchObject({
  label: 'Ready to book',
  detail: 'When the customer asks for an appointment',
});
```

Also assert:

```ts
await expect(
  authed.mutation(api.workflowNodeConfig.apply, {
    agentId,
    nodeId: bookingNode._id,
    conditionEdgeId: otherWorkflowEdgeId,
    title: 'Invalid',
    conditionLabel: 'Invalid',
  }),
).rejects.toThrow('Workflow edge not found');
```

After every rejected call, reload the node and edge and assert neither changed.

- [ ] **Step 5: Run the Apply tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowNodeConfig.test.ts
```

Expected: FAIL because `api.workflowNodeConfig.apply` does not exist.

- [ ] **Step 6: Implement the Apply mutation**

Create `convex/workflowNodeConfig.ts` with exact validators:

```ts
export const apply = mutation({
  args: {
    agentId: v.id('agents'),
    nodeId: v.id('workflowNodes'),
    conditionEdgeId: v.optional(v.id('workflowEdges')),
    title: v.string(),
    description: v.optional(v.string()),
    conditionLabel: v.optional(v.string()),
    conditionDetail: v.optional(v.string()),
    allowedAppointmentServiceIds: v.optional(
      v.array(v.id('appointmentServices')),
    ),
  },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await getWorkflowForAgent(ctx, agent._id);
    if (workflow === null) throw new Error('Workflow not found');

    const node = await ctx.db.get(args.nodeId);
    if (node === null || node.workflowId !== workflow._id) {
      throw new Error('Workflow node not found');
    }

    const title = args.title.trim();
    if (!title) throw new Error('Node title is required');

    const edge = args.conditionEdgeId
      ? await ctx.db.get(args.conditionEdgeId)
      : null;
    if (
      args.conditionEdgeId &&
      (edge === null ||
        edge.workflowId !== workflow._id ||
        edge.targetNodeId !== node._id)
    ) {
      throw new Error('Workflow edge not found');
    }

    const serviceIds =
      args.allowedAppointmentServiceIds === undefined
        ? undefined
        : await normalizeAllowedAppointmentServiceIds(
            ctx,
            agent._id,
            args.allowedAppointmentServiceIds,
          );
    if (serviceIds !== undefined && node.kind !== 'bookAppointment') {
      throw new Error(
        'Services can only be configured on Book appointment actions',
      );
    }

    const now = Math.max(Date.now(), workflow.updatedAt + 1);
    await ctx.db.patch(node._id, {
      title,
      description: args.description?.trim() || undefined,
      allowedAppointmentServiceIds: serviceIds,
      updatedAt: now,
    });
    if (edge) {
      await ctx.db.patch(edge._id, {
        label: args.conditionLabel?.trim() || undefined,
        detail: args.conditionDetail?.trim() || undefined,
        updatedAt: now,
      });
    }
    await ctx.db.patch(workflow._id, { updatedAt: now });
    const savedWorkflow = await ctx.db.get(workflow._id);
    if (savedWorkflow === null) throw new Error('Workflow not found');
    return await getWorkflowGraph(ctx, savedWorkflow);
  },
});
```

- [ ] **Step 7: Verify Task 1 and commit**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowNodeConfig.test.ts convex/workflowAppointmentServices.test.ts
git diff --check
```

Expected: all tests PASS and `git diff --check` exits 0.

Commit:

```bash
git add convex/workflowNodeConfig.ts convex/workflowNodeConfig.test.ts convex/workflowAppointmentServices.ts convex/workflowAppointmentServices.test.ts
git commit -m "Add atomic workflow node configuration"
```

---

### Task 2: Split message-graph persistence from automation persistence

**Files:**
- Create: `convex/workflowMessageGraphSave.ts`
- Create: `convex/workflowMessageGraphSave.test.ts`
- Create: `convex/workflowAutomationSave.ts`
- Create: `convex/workflowAutomationSave.test.ts`
- Create: `convex/workflowGraphSaveValidators.ts`
- Delete: `convex/workflowDraftSave.ts`
- Delete: `convex/workflowDraftSave.test.ts`

**Interfaces:**
- Produces:

```ts
api.workflowMessageGraphSave.replace({
  agentId,
  baselineUpdatedAt,
  layoutOrientation,
  templateId,
  nodes,
  edges,
}): Promise<WorkflowGraph>
```

- Produces:

```ts
api.workflowAutomationSave.save({
  agentId,
  baselineUpdatedAt,
  automations,
}): Promise<WorkflowGraph>
```

- `workflowMessageGraphSave.replace` never writes Reminder or Follow-up fields.
- `workflowAutomationSave.save` never inserts, patches, or deletes nodes or edges.

- [ ] **Step 1: Write failing split-boundary tests**

Move the current whole-draft fixtures into two focused files.

In `convex/workflowMessageGraphSave.test.ts`, replace the graph and assert the original automations are byte-for-byte preserved:

```ts
const replaced = await authed.mutation(api.workflowMessageGraphSave.replace, {
  agentId,
  baselineUpdatedAt: initial.workflow.updatedAt,
  layoutOrientation: 'horizontal',
  templateId: 'real-estate',
  nodes: replacementNodes,
  edges: replacementEdges,
});

expect(replaced.automations).toEqual(initial.automations);
expect(replaced.nodes.map((node) => node.kind).sort()).toEqual([
  'sendFile',
  'start',
]);
```

Assert stale saves reject and template usage increments only after successful replacement.

In `convex/workflowAutomationSave.test.ts`, save changed automations and assert node IDs, edge IDs, titles, conditions, and layout remain exactly unchanged:

```ts
const saved = await authed.mutation(api.workflowAutomationSave.save, {
  agentId,
  baselineUpdatedAt: initial.workflow.updatedAt,
  automations,
});

expect(saved.nodes).toEqual(initial.nodes);
expect(saved.edges).toEqual(initial.edges);
expect(saved.workflow.layoutOrientation).toBe(
  initial.workflow.layoutOrientation,
);
expect(saved.automations.reminder.enabled).toBe(true);
```

- [ ] **Step 2: Run the split tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowMessageGraphSave.test.ts convex/workflowAutomationSave.test.ts
```

Expected: FAIL because both new APIs are missing.

- [ ] **Step 3: Extract exact graph validators**

Create `convex/workflowGraphSaveValidators.ts`:

```ts
export const workflowGraphNodeSaveValidator = v.object({
  clientId: v.string(),
  persistedNodeId: v.optional(v.id('workflowNodes')),
  kind: workflowNodeKindValidator,
  title: v.string(),
  description: v.optional(v.string()),
  notes: v.optional(v.string()),
  allowedAppointmentServiceIds: v.optional(
    v.array(v.id('appointmentServices')),
  ),
  positionX: v.number(),
  positionY: v.number(),
});

export const workflowGraphEdgeSaveValidator = v.object({
  sourceClientId: v.string(),
  targetClientId: v.string(),
  label: v.optional(v.string()),
  detail: v.optional(v.string()),
});
```

Export matching `Infer` types so both save modules share one contract.

- [ ] **Step 4: Implement message-graph replacement**

Move only the graph validation, node/edge replacement, removed-node media cleanup, layout patch, and template-usage recording from `workflowDraftSave.save` into `workflowMessageGraphSave.replace`.

The workflow patch must be limited to:

```ts
await ctx.db.patch(workflow._id, {
  layoutOrientation: args.layoutOrientation,
  updatedAt: now,
});
```

Do not call `prepareWorkflowAutomationSave` or `applyWorkflowAutomationSaveEffects`.

- [ ] **Step 5: Implement automation-only Save**

Create `convex/workflowAutomationSave.ts` with:

```ts
export const save = mutation({
  args: {
    agentId: v.id('agents'),
    baselineUpdatedAt: v.number(),
    automations: workflowAutomationConfigsValidator,
  },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await getWorkflowForAgent(ctx, agent._id);
    if (workflow === null) throw new Error('Workflow not found');
    if (workflow.updatedAt !== args.baselineUpdatedAt) {
      throw new Error(
        'This workflow changed elsewhere. Reset to load the latest version before saving.',
      );
    }

    const current = resolveWorkflowAutomationConfigs(workflow);
    const automations = prepareWorkflowAutomationSave(
      current,
      args.automations,
    );
    const now = Math.max(Date.now(), workflow.updatedAt + 1);
    await ctx.db.patch(workflow._id, {
      reminderAutomation: automations.reminder,
      followUpAutomation: automations.followUp,
      updatedAt: now,
    });
    await applyWorkflowAutomationSaveEffects(
      ctx,
      {
        ...workflow,
        reminderAutomation: automations.reminder,
        followUpAutomation: automations.followUp,
      },
      current,
      automations,
    );
    const savedWorkflow = await ctx.db.get(workflow._id);
    if (savedWorkflow === null) throw new Error('Workflow not found');
    return await getWorkflowGraph(ctx, savedWorkflow);
  },
});
```

- [ ] **Step 6: Remove the whole-graph Save boundary**

Delete `convex/workflowDraftSave.ts` and `convex/workflowDraftSave.test.ts`. Run:

```bash
rg -n "workflowDraftSave" convex src --glob '*.{ts,tsx}'
```

Expected at this checkpoint: generated API references and the frontend call remain; production Convex implementation references are gone.

- [ ] **Step 7: Verify Task 2 and commit**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowMessageGraphSave.test.ts convex/workflowAutomationSave.test.ts convex/workflowDraftValidation.test.ts
git diff --check
```

Expected: all tests PASS.

Commit:

```bash
git add convex/workflowMessageGraphSave.ts convex/workflowMessageGraphSave.test.ts convex/workflowAutomationSave.ts convex/workflowAutomationSave.test.ts convex/workflowGraphSaveValidators.ts convex/workflowDraftSave.ts convex/workflowDraftSave.test.ts
git commit -m "Split workflow graph and automation persistence"
```

---

### Task 3: Add deliberate canonical layout persistence

**Files:**
- Modify: `convex/workflowLayout.ts`
- Create: `convex/workflowLayout.test.ts`
- Create: `src/pages/workflowLayoutPersistence.ts`
- Create: `src/pages/workflowLayoutPersistence.test.ts`

**Interfaces:**
- Produces:

```ts
api.workflowLayout.apply({
  agentId,
  layoutOrientation,
  positions: Array<{
    nodeId: Id<'workflowNodes'>;
    positionX: number;
    positionY: number;
  }>,
}): Promise<WorkflowGraph>
```

- Produces:

```ts
export function toWorkflowLayoutApplyArgs(
  graph: WorkflowGraph,
  orientation: WorkflowLayoutOrientation,
): {
  layoutOrientation: WorkflowLayoutOrientation;
  positions: Array<{
    nodeId: Id<'workflowNodes'>;
    positionX: number;
    positionY: number;
  }>;
}
```

- [ ] **Step 1: Write failing backend layout tests**

Extend a new `convex/workflowLayout.test.ts` to assert one mutation updates all canonical positions and orientation, rejects cross-workflow IDs, and leaves automation configs unchanged:

```ts
const arranged = await authed.mutation(api.workflowLayout.apply, {
  agentId,
  layoutOrientation: 'vertical',
  positions: graph.nodes.map((node, index) => ({
    nodeId: node._id,
    positionX: index * 100,
    positionY: index * 200,
  })),
});

expect(arranged.workflow.layoutOrientation).toBe('vertical');
expect(arranged.automations).toEqual(graph.automations);
```

- [ ] **Step 2: Run the backend layout test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowLayout.test.ts
```

Expected: FAIL because `api.workflowLayout.apply` does not exist.

- [ ] **Step 3: Implement the atomic layout mutation**

Add a module-local finite-position guard and an `apply` mutation while retaining `updateOrientation` until final cleanup:

```ts
function requireFinitePosition(value: number, field: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${field} must be finite`);
  }
}

export const apply = mutation({
  args: {
    agentId: v.id('agents'),
    layoutOrientation: workflowLayoutOrientationValidator,
    positions: v.array(
      v.object({
        nodeId: v.id('workflowNodes'),
        positionX: v.number(),
        positionY: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await ensureWorkflowForAgent(ctx, agent);
    const nodes = await listWorkflowNodes(ctx, workflow._id);
    const nodeById = new Map(nodes.map((node) => [node._id, node]));
    if (
      args.positions.length !== nodes.length ||
      args.positions.some((item) => !nodeById.has(item.nodeId))
    ) {
      throw new Error('Workflow layout nodes do not match');
    }
    for (const position of args.positions) {
      requireFinitePosition(position.positionX, 'positionX');
      requireFinitePosition(position.positionY, 'positionY');
    }
    const now = Math.max(Date.now(), workflow.updatedAt + 1);
    for (const position of args.positions) {
      await ctx.db.patch(position.nodeId, {
        positionX: position.positionX,
        positionY: position.positionY,
        updatedAt: now,
      });
    }
    await ctx.db.patch(workflow._id, {
      layoutOrientation: args.layoutOrientation,
      updatedAt: now,
    });
    const savedWorkflow = await ctx.db.get(workflow._id);
    if (savedWorkflow === null) throw new Error('Workflow not found');
    return await getWorkflowGraph(ctx, savedWorkflow);
  },
});
```

- [ ] **Step 4: Write the failing frontend payload test**

Create `src/pages/workflowLayoutPersistence.test.ts`:

```ts
test('builds canonical persisted positions without manual canvas offsets', () => {
  const result = toWorkflowLayoutApplyArgs(graph, 'vertical');
  const expected = getWorkflowCleanupPositions(graph, 'vertical');
  expect(result.layoutOrientation).toBe('vertical');
  expect(result.positions).toEqual(
    expected.map(({ nodeId, position }) => ({
      nodeId,
      positionX: position.x,
      positionY: position.y,
    })),
  );
});
```

- [ ] **Step 5: Run the frontend payload test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/workflowLayoutPersistence.test.ts
```

Expected: FAIL because `toWorkflowLayoutApplyArgs` is missing.

- [ ] **Step 6: Implement the layout payload helper and verify**

Create the helper using only `getWorkflowCleanupPositions(graph, orientation)`. Do not accept React Flow local nodes.

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowLayout.test.ts src/pages/workflowLayoutPersistence.test.ts
git diff --check
```

Expected: PASS.

Commit:

```bash
git add convex/workflowLayout.ts convex/workflowLayout.test.ts src/pages/workflowLayoutPersistence.ts src/pages/workflowLayoutPersistence.test.ts
git commit -m "Persist workflow layout only through arrange actions"
```

---

### Task 4: Replace the whole-graph frontend draft with an automation-only draft

**Files:**
- Create: `src/pages/workflowAutomationDraftModel.ts`
- Create: `src/pages/workflowAutomationDraftModel.test.ts`
- Create: `src/pages/useWorkflowAutomationDraft.ts`
- Create: `src/pages/workflowAutomationPersistence.ts`
- Create: `src/pages/workflowAutomationPersistence.test.ts`
- Create: `src/pages/workflowTemplateReplacementPersistence.ts`
- Create: `src/pages/workflowTemplateReplacementPersistence.test.ts`
- Modify: `src/pages/WorkflowPage.tsx`
- Delete: `src/pages/useWorkflowDraft.ts`
- Delete: `src/pages/workflowDraftPersistence.ts`
- Delete: `src/pages/workflowDraftPersistence.test.ts`

**Interfaces:**
- Produces:

```ts
type WorkflowAutomationDraftState = {
  baseline: WorkflowAutomationConfigs;
  draft: WorkflowAutomationConfigs;
}
```

- Produces:

```ts
useWorkflowAutomationDraft(persisted: WorkflowAutomationConfigs): {
  automations: WorkflowAutomationConfigs;
  isDirty: boolean;
  update: (next: WorkflowAutomationConfigs) => void;
  reset: () => void;
  acceptSaved: (next: WorkflowAutomationConfigs) => void;
}
```

- Produces:

```ts
toWorkflowAutomationSavePayload(
  graph: WorkflowGraph,
  automations: WorkflowAutomationConfigs,
): {
  baselineUpdatedAt: number;
  automations: WorkflowAutomationConfigs;
}
```

- Produces:

```ts
toWorkflowTemplateReplacementPayload(
  graph: WorkflowGraph,
): {
  baselineUpdatedAt: number;
  layoutOrientation: WorkflowLayoutOrientation;
  nodes: WorkflowGraphNodeSave[];
  edges: WorkflowGraphEdgeSave[];
}
```

- [ ] **Step 1: Write failing pure automation-draft tests**

Create tests proving:

```ts
const initial = createWorkflowAutomationDraft(graph.automations);
const dirty = updateWorkflowAutomationDraft(initial, changedAutomations);
const rebased = syncPersistedWorkflowAutomations(
  dirty,
  serverGraphAfterDirectNodeAdd.automations,
);

expect(isWorkflowAutomationDraftDirty(rebased)).toBe(true);
expect(rebased.draft).toEqual(changedAutomations);
expect(rebased.baseline).toEqual(graph.automations);
```

Also prove clean state adopts newer persisted automations and reset restores the current baseline.

- [ ] **Step 2: Run the model test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/workflowAutomationDraftModel.test.ts
```

Expected: FAIL because the model does not exist.

- [ ] **Step 3: Implement the pure model and hook**

Implement clone/equality over `WorkflowAutomationConfigs` only. The hook wraps the model with React state and a `useEffect` that calls `syncPersistedWorkflowAutomations` when persisted configs change.

The dirty-state comparison must not inspect nodes, edges, layout, workflow timestamps, or manual positions.

- [ ] **Step 4: Write the automation payload regression**

Create `workflowAutomationPersistence.test.ts`:

```ts
expect(toWorkflowAutomationSavePayload(graph, changedAutomations)).toEqual({
  baselineUpdatedAt: graph.workflow.updatedAt,
  automations: changedAutomations,
});
```

Create `workflowTemplateReplacementPersistence.test.ts` to cover only confirmed template-replacement mapping:

```ts
const payload = toWorkflowTemplateReplacementPayload(previewGraph);

expect(payload).not.toHaveProperty('automations');
expect(payload.nodes.every((node) => node.persistedNodeId === undefined)).toBe(
  true,
);
```

Every template node is intentionally inserted as a new persisted node. The helper must not inspect draft-ID prefixes or preserve a `persistedNodeId`.

- [ ] **Step 5: Run persistence tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/workflowAutomationPersistence.test.ts src/pages/workflowTemplateReplacementPersistence.test.ts
```

Expected: FAIL because the new functions do not exist.

- [ ] **Step 6: Implement the persistence split**

Create both persistence helpers with the exact interfaces above. Delete the old whole-draft persistence helper and its test.

Delete `useWorkflowDraft.ts`.

- [ ] **Step 7: Wire automation-only Save/Discard in `WorkflowPage.tsx`**

Replace:

```ts
const workflowDraft = useWorkflowDraft(persistedGraph);
```

with:

```ts
const automationDraft = useWorkflowAutomationDraft(
  latestGraph.automations,
);
```

Call `api.workflowAutomationSave.save` with:

```ts
{
  agentId,
  ...toWorkflowAutomationSavePayload(
    latestGraph,
    automationDraft.automations,
  ),
}
```

Use `automationDraft.isDirty` for navigation blocking, before-unload behavior, and `WorkflowDraftActions`. Reset affects only automation settings. Direct graph adoption must update `latestGraph` without calling `automationDraft.acceptSaved`.

- [ ] **Step 8: Verify Task 4 and commit**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/workflowAutomationDraftModel.test.ts src/pages/workflowAutomationPersistence.test.ts src/pages/workflowTemplateReplacementPersistence.test.ts src/pages/WorkflowPage.test.ts
git diff --check
```

Expected: PASS.

Commit:

```bash
git add src/pages/workflowAutomationDraftModel.ts src/pages/workflowAutomationDraftModel.test.ts src/pages/useWorkflowAutomationDraft.ts src/pages/workflowAutomationPersistence.ts src/pages/workflowAutomationPersistence.test.ts src/pages/workflowTemplateReplacementPersistence.ts src/pages/workflowTemplateReplacementPersistence.test.ts src/pages/WorkflowPage.tsx src/pages/useWorkflowDraft.ts src/pages/workflowDraftPersistence.ts src/pages/workflowDraftPersistence.test.ts
git commit -m "Isolate workflow automation draft state"
```

---

### Task 5: Wire direct Message Handling actions and immediate media access

**Files:**
- Create: `src/pages/useWorkflowMessageActions.ts`
- Create: `src/pages/workflowMessageActions.test.ts`
- Modify: `src/pages/WorkflowPage.tsx`
- Modify: `src/pages/WorkflowPage.test.ts`
- Modify: `src/components/workflow/WorkflowInspector.tsx`
- Modify: `src/components/workflow/WorkflowInspectorForm.tsx`
- Modify: `src/components/workflow/WorkflowInspectorForm.test.ts`
- Modify: `src/components/workflow/workflowInspectorMediaActions.test.ts`
- Modify: `src/components/workflow/WorkflowAddNodeMenu.tsx`
- Modify: `src/components/workflow/WorkflowNode.tsx`
- Modify: `src/components/workflow/workflowFlowModel.ts`
- Modify: `src/components/workflow/workflowTypes.ts`

**Interfaces:**
- Produces:

```ts
useWorkflowMessageActions({
  agentId,
  graph,
  onGraph,
  onSelectNode,
}): {
  isGraphMutating: boolean;
  isApplyingNode: boolean;
  addNode: (sourceNodeId, kind) => Promise<void>;
  removeNode: (nodeId) => Promise<void>;
  connectNodes: (sourceNodeId, targetNodeId) => Promise<void>;
  removeEdge: (edgeId) => Promise<void>;
  applyNode: (
    nodeId,
    conditionEdgeId,
    values,
  ) => Promise<void>;
}
```

- [ ] **Step 1: Write failing direct-action contracts**

Update `WorkflowPage.test.ts` and create `workflowMessageActions.test.ts` to require:

```ts
expect(pageSource).toContain('useWorkflowMessageActions({');
expect(pageSource).not.toContain('onNodeMoved=');
expect(pageSource).not.toContain('workflowDraft.addNode');
expect(pageSource).not.toContain('workflowDraft.removeNode');
```

The action source must contain:

```ts
const nextGraph = await addNodeAfter({
  agentId,
  sourceNodeId,
  kind,
});
const addedNodeId = findNewWorkflowNodeId(
  graph,
  nextGraph,
  sourceNodeId,
  kind,
);
onGraph(nextGraph);
onSelectNode(addedNodeId);
```

Require one loading toast ID per Add mutation and replacement success/error through the same ID.

- [ ] **Step 2: Run direct-action tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/WorkflowPage.test.ts src/pages/workflowMessageActions.test.ts
```

Expected: FAIL because the page still uses local draft graph actions.

- [ ] **Step 3: Implement `useWorkflowMessageActions`**

Use:

```ts
const addNodeAfter = useMutation(api.workflows.addNodeAfter);
const removeNodeMutation = useMutation(api.workflows.removeNode);
const connectNodesMutation = useMutation(api.workflows.connectNodes);
const removeEdgeMutation = useMutation(api.workflows.removeEdge);
const applyNodeConfig = useMutation(api.workflowNodeConfig.apply);
```

Every handler:

- ignores duplicate submissions while its pending flag is true;
- adopts only a successful returned graph;
- preserves automation draft state by calling only `onGraph`;
- uses a single toast lifecycle; and
- keeps the inspector selected after Apply failure.

- [ ] **Step 4: Remove the draft media guard and check icon**

Update `WorkflowInspectorForm.tsx`:

```tsx
{hasMediaSection && agentId ? (
  <WorkflowSendMediaSection
    agentId={agentId}
    nodeId={node._id}
    nodeKind={isSendFileAction ? 'sendFile' : 'sendImage'}
  />
) : null}
```

Delete the `isDraftWorkflowNodeId` import, `isDraftNode`, and the “Save the workflow first” panel.

Change the Apply button content to:

```tsx
{isSaving ? (
  <Loader2 className="animate-spin" data-icon="inline-start" />
) : null}
Apply
```

Remove `Check` from the Lucide import.

- [ ] **Step 5: Make inspector Apply asynchronous**

Change `WorkflowInspector` and `WorkflowInspectorForm` save contracts to:

```ts
onSave: (values: WorkflowInspectorSaveValues) => Promise<void> | void;
```

The page passes `messageActions.applyNode` and `messageActions.isApplyingNode`. Close selection only after the awaited mutation succeeds.

- [ ] **Step 6: Disable duplicate Add actions**

Add `disabled: boolean` through the flow-node data and `WorkflowNode` into:

```tsx
<WorkflowAddNodeMenu disabled={isGraphMutating} onSelect={...} />
```

The trigger and menu items use the same disabled value. Do not introduce a fallback ID or optimistic draft node.

- [ ] **Step 7: Verify immediate media and direct action behavior**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/WorkflowPage.test.ts src/pages/workflowMessageActions.test.ts src/components/workflow/WorkflowInspectorForm.test.ts src/components/workflow/workflowInspectorMediaActions.test.ts src/pages/workflowPageNodeSelection.test.ts
git diff --check
```

Expected: PASS and no source occurrence of the save-first media message.

Commit:

```bash
git add src/pages/useWorkflowMessageActions.ts src/pages/workflowMessageActions.test.ts src/pages/WorkflowPage.tsx src/pages/WorkflowPage.test.ts src/components/workflow/WorkflowInspector.tsx src/components/workflow/WorkflowInspectorForm.tsx src/components/workflow/WorkflowInspectorForm.test.ts src/components/workflow/workflowInspectorMediaActions.test.ts src/components/workflow/WorkflowAddNodeMenu.tsx src/components/workflow/WorkflowNode.tsx src/components/workflow/workflowFlowModel.ts src/components/workflow/workflowTypes.ts
git commit -m "Persist workflow message actions directly"
```

---

### Task 6: Keep manual dragging transient and persist only Cleanup/Arrange

**Files:**
- Modify: `src/components/workflow/WorkflowCanvas.tsx`
- Modify: `src/components/workflow/WorkflowCanvas.test.ts`
- Modify: `src/components/workflow/useWorkflowCanvasView.ts`
- Modify: `src/components/landing/LandingAppPreviewWorkflow.tsx`
- Modify: `src/pages/useWorkflowMessageActions.ts`
- Modify: `src/pages/WorkflowPage.tsx`
- Modify: `src/pages/WorkflowPage.test.ts`

**Interfaces:**
- `WorkflowCanvas.onNodeMoved` becomes optional and is used only by the landing preview.
- Produces:

```ts
applyLayout(
  orientation: WorkflowLayoutOrientation,
): Promise<void>
```

- [ ] **Step 1: Write failing transient-drag tests**

Update `WorkflowCanvas.test.ts` to require an optional callback:

```ts
expect(source).toContain(
  'onNodeMoved?: (nodeId: Id<\\'workflowNodes\\'>',
);
expect(source).toContain('if (!onNodeMoved) return;');
```

Update `WorkflowPage.test.ts`:

```ts
expect(source).not.toContain('onNodeMoved={workflowDraft.moveNode}');
expect(source).toContain('onCleanup={() => void handleCleanup()}');
expect(source).toContain('onArrange={() => void handleArrange()}');
```

- [ ] **Step 2: Run drag/layout tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowCanvas.test.ts src/pages/WorkflowPage.test.ts
```

Expected: FAIL because production dragging still updates the workflow draft.

- [ ] **Step 3: Make drag persistence optional**

Change the canvas prop to optional and guard drag stop:

```ts
const handleNodeDragStop: OnNodeDrag<WorkflowFlowNode> = (_event, node) => {
  if (!onNodeMoved || !isPersistedWorkflowFlowNode(node)) return;
  onNodeMoved(node.data.nodeId, node.position);
};
```

Keep `applyNodeChanges` unchanged so local movement stays responsive. Preserve the callback in `LandingAppPreviewWorkflow`; omit it from `WorkflowPage`.

- [ ] **Step 4: Wire canonical Cleanup and Arrange**

In the page:

```ts
const handleCleanup = async () => {
  await messageActions.applyLayout(layoutOrientation);
  setArrangeFocusRequest((value) => value + 1);
};

const handleArrange = async () => {
  await messageActions.applyLayout(
    getNextWorkflowLayoutOrientation(layoutOrientation),
  );
  setArrangeFocusRequest((value) => value + 1);
};
```

Implement `applyLayout` in `useWorkflowMessageActions` with `toWorkflowLayoutApplyArgs(graph, orientation)` and `api.workflowLayout.apply`.

- [ ] **Step 5: Verify Task 6 and commit**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowCanvas.test.ts src/components/workflow/useWorkflowCanvasView.test.ts src/pages/WorkflowPage.test.ts src/pages/workflowLayoutPersistence.test.ts convex/workflowLayout.test.ts
git diff --check
```

Expected: PASS.

Commit:

```bash
git add src/components/workflow/WorkflowCanvas.tsx src/components/workflow/WorkflowCanvas.test.ts src/components/workflow/useWorkflowCanvasView.ts src/components/landing/LandingAppPreviewWorkflow.tsx src/pages/useWorkflowMessageActions.ts src/pages/WorkflowPage.tsx src/pages/WorkflowPage.test.ts
git commit -m "Keep workflow node dragging transient"
```

---

### Task 7: Add the read-only full-canvas starter-template preview

**Files:**
- Create: `src/components/workflow/WorkflowTemplatePreviewOverlay.tsx`
- Create: `src/components/workflow/WorkflowTemplatePreviewOverlay.test.ts`
- Create: `src/components/workflow/workflowTemplatePreviewModel.ts`
- Create: `src/components/workflow/workflowTemplatePreviewModel.test.ts`
- Modify: `src/components/workflow/WorkflowTemplateHoverCard.tsx`
- Modify: `src/components/workflow/WorkflowDraftToolbar.test.ts`
- Modify: `src/components/workflow/WorkflowToolbar.tsx`
- Modify: `src/components/workflow/WorkflowCanvas.tsx`
- Modify: `src/components/workflow/WorkflowCanvas.test.ts`
- Modify: `src/pages/useWorkflowMessageActions.ts`
- Modify: `src/pages/WorkflowPage.tsx`
- Modify: `src/pages/WorkflowPage.test.ts`

**Interfaces:**
- Produces:

```ts
type WorkflowTemplatePreview = {
  template: WorkflowTemplate;
  graph: WorkflowGraph;
}

createWorkflowTemplatePreview(
  currentGraph: WorkflowGraph,
  template: WorkflowTemplate,
): WorkflowTemplatePreview
```

- `WorkflowTemplateHoverCard` produces `onPreview(template)`.
- `WorkflowCanvas` consumes:

```ts
templatePreview?: {
  name: string;
  isReplacing: boolean;
  onReplace: () => void;
  onSkip: () => void;
}
```

- [ ] **Step 1: Write failing preview-model tests**

Create `workflowTemplatePreviewModel.test.ts`:

```ts
const preview = createWorkflowTemplatePreview(currentGraph, template);

expect(preview.template).toBe(template);
expect(preview.graph.workflow._id).toBe(currentGraph.workflow._id);
expect(preview.graph.nodes.map((node) => node.kind)).toEqual(
  template.graph.nodes.map((node) => node.kind),
);
expect(preview.graph.automations).toEqual(currentGraph.automations);
expect(currentGraph.nodes).toEqual(originalNodes);
```

- [ ] **Step 2: Run the model test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowTemplatePreviewModel.test.ts
```

Expected: FAIL because the preview model is missing.

- [ ] **Step 3: Implement the immutable preview model**

Use `replaceDraftWithTemplate(currentGraph, template)` only as an immutable presentation builder. Do not call a mutation or write applied-template state:

```ts
export function createWorkflowTemplatePreview(
  currentGraph: WorkflowGraph,
  template: WorkflowTemplate,
): WorkflowTemplatePreview {
  return {
    template,
    graph: replaceDraftWithTemplate(currentGraph, template),
  };
}
```

- [ ] **Step 4: Write failing template-card and overlay contracts**

Update `WorkflowDraftToolbar.test.ts`:

```ts
expect(templateSource).toContain('Preview');
expect(templateSource).not.toContain('Try now');
expect(templateSource).toContain('onPreview(template)');
expect(templateSource).toContain(
  'aria-label={`Preview ${template.name} template`}',
);
```

Create `WorkflowTemplatePreviewOverlay.test.ts` requiring:

```ts
expect(source).toContain('Previewing: {name}');
expect(source).toContain('Replace Current');
expect(source).toContain('Skip');
expect(source).toContain('variant="outline"');
expect(source).toContain('isReplacing');
```

- [ ] **Step 5: Run UI contract tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowDraftToolbar.test.ts src/components/workflow/WorkflowTemplatePreviewOverlay.test.ts
```

Expected: FAIL because cards still say Try now and the overlay is missing.

- [ ] **Step 6: Implement the picker and centered overlay**

Rename `onReplace` to `onPreview` in `WorkflowTemplateHoverCard`. Change the helper to:

```ts
const previewTemplate = (template: WorkflowTemplate) => {
  onPreview(template);
  setOpen(false);
};
```

Use `Preview` with an `Eye` icon in the card footer.

Create `WorkflowTemplatePreviewOverlay.tsx`:

```tsx
export function WorkflowTemplatePreviewOverlay({
  name,
  isReplacing,
  onReplace,
  onSkip,
}: WorkflowTemplatePreviewOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
      <div className="pointer-events-auto rounded-xl border border-border bg-background p-3 shadow-lg">
        <p className="mb-3 text-center text-sm font-medium">
          Previewing: {name}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            disabled={isReplacing}
            onClick={onReplace}
          >
            {isReplacing ? (
              <Loader2
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : null}
            Replace Current
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isReplacing}
            onClick={onSkip}
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Make the canvas visibly read-only during preview**

Add `templatePreview` to `WorkflowCanvas`. When it exists:

```tsx
<ReactFlow
  nodesDraggable={false}
  nodesConnectable={false}
  elementsSelectable={false}
  deleteKeyCode={null}
  className="bg-primary/[0.04] dark:bg-primary/[0.08]"
  ...
/>
```

Guard connect, delete, node click, edge click, Cleanup, Arrange, and template-picker entry. Render `WorkflowTemplatePreviewOverlay` outside React Flow but inside the relative canvas container.

Add an Escape listener that calls `onSkip` only while preview is active. Wrap view changes so leaving Message Handling first calls `onSkip`.

- [ ] **Step 8: Wire preview and confirmed replacement in the page**

Maintain:

```ts
const [templatePreview, setTemplatePreview] =
  useState<WorkflowTemplatePreview>();
```

On card activation:

```ts
setTemplatePreview(createWorkflowTemplatePreview(latestGraph, template));
setSelectedNodeId(undefined);
setArrangeFocusRequest((value) => value + 1);
```

Render `templatePreview.graph` through `workflowGraphToFlow` while previewing. `Skip` clears preview only.

Add `replaceTemplate` to `useWorkflowMessageActions`:

```ts
const nextGraph = await replaceMessageGraph({
  agentId,
  ...toWorkflowTemplateReplacementPayload(
    replaceDraftWithTemplate(graph, template),
  ),
  templateId: template.id,
});
onGraph(nextGraph);
```

Clear preview only after this succeeds. On failure, retain preview.

- [ ] **Step 9: Verify Task 7 and commit**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowTemplatePreviewModel.test.ts src/components/workflow/WorkflowTemplatePreviewOverlay.test.ts src/components/workflow/WorkflowDraftToolbar.test.ts src/components/workflow/WorkflowCanvas.test.ts src/pages/WorkflowPage.test.ts src/pages/workflowMessageActions.test.ts convex/workflowMessageGraphSave.test.ts
git diff --check
```

Expected: PASS.

Commit:

```bash
git add src/components/workflow/WorkflowTemplatePreviewOverlay.tsx src/components/workflow/WorkflowTemplatePreviewOverlay.test.ts src/components/workflow/workflowTemplatePreviewModel.ts src/components/workflow/workflowTemplatePreviewModel.test.ts src/components/workflow/WorkflowTemplateHoverCard.tsx src/components/workflow/WorkflowDraftToolbar.test.ts src/components/workflow/WorkflowToolbar.tsx src/components/workflow/WorkflowCanvas.tsx src/components/workflow/WorkflowCanvas.test.ts src/pages/useWorkflowMessageActions.ts src/pages/WorkflowPage.tsx src/pages/WorkflowPage.test.ts
git commit -m "Add confirmed workflow template preview"
```

---

### Task 8: Remove obsolete draft graph code and complete verification

**Files:**
- Delete when unreferenced: `src/components/workflow/workflowDraftModel.ts`
- Delete when unreferenced: `src/components/workflow/workflowDraftModel.test.ts`
- Delete when unreferenced: `src/pages/workflowTemplateDraftState.ts`
- Delete when unreferenced: `src/pages/workflowTemplateDraftState.test.ts`
- Modify: `convex/workflowLayout.ts`
- Modify: `CONTINUITY.md`
- Regenerate: `convex/_generated/api.d.ts`

**Interfaces:**
- No production reference to browser-only `draft-node:` or `draft-edge:` IDs remains in the authenticated workflow editor.
- `replaceDraftWithTemplate` becomes `createWorkflowGraphFromTemplate` for preview/replacement construction.
- Legacy landing preview helpers remain unchanged.

- [ ] **Step 1: Scan for obsolete draft graph references**

Run:

```bash
rg -n "useWorkflowDraft|workflowDraftSave|workflowTemplateDraftState|isDraftWorkflowNodeId|draft-node:|draft-edge:" src convex --glob '*.{ts,tsx}'
```

Expected: only template-construction helpers or tests explicitly slated for rename remain.

- [ ] **Step 2: Remove obsolete modules and rename remaining helpers**

Delete unreferenced draft-model and template-origin modules. Rename `replaceDraftWithTemplate` to `createWorkflowGraphFromTemplate`, because it now builds an immutable preview/replacement graph rather than mutating draft state; update imports and tests together.

Remove `workflowLayout.updateOrientation` if no production reference remains.

- [ ] **Step 3: Regenerate Convex API types**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && STRIPE_PRICE_STARTER_MONTHLY=mock_starter_monthly STRIPE_PRICE_STARTER_ANNUAL=mock_starter_annual STRIPE_PRICE_GROWTH_MONTHLY=mock_growth_monthly STRIPE_PRICE_GROWTH_ANNUAL=mock_growth_annual STRIPE_PRICE_BUSINESS_MONTHLY=mock_business_monthly STRIPE_PRICE_BUSINESS_ANNUAL=mock_business_annual STRIPE_PRICE_EXTRA_CREDITS_2000=mock_extra_2000 STRIPE_PRICE_EXTRA_CREDITS_5000=mock_extra_5000 STRIPE_PRICE_EXTRA_CREDITS_15000=mock_extra_15000 bunx convex codegen
```

Expected: generated API includes `workflowNodeConfig`, `workflowMessageGraphSave`, and `workflowAutomationSave`, and no longer includes `workflowDraftSave`.

- [ ] **Step 4: Run focused backend and frontend tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowNodeConfig.test.ts convex/workflowMessageGraphSave.test.ts convex/workflowAutomationSave.test.ts convex/workflowLayout.test.ts convex/workflowMedia.test.ts convex/workflowMediaAccess.test.ts convex/workflowMediaCleanup.test.ts src/pages/WorkflowPage.test.ts src/pages/workflowMessageActions.test.ts src/pages/workflowAutomationDraftModel.test.ts src/components/workflow
```

Expected: all focused tests PASS with zero failures.

- [ ] **Step 5: Run complete verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/workflowNodeConfig.ts convex/workflowMessageGraphSave.ts convex/workflowAutomationSave.ts convex/workflowLayout.ts src/pages/WorkflowPage.tsx src/pages/useWorkflowAutomationDraft.ts src/pages/useWorkflowMessageActions.ts src/components/workflow/WorkflowCanvas.tsx src/components/workflow/WorkflowTemplatePreviewOverlay.tsx src/components/workflow/WorkflowInspectorForm.tsx
git diff --check
```

Expected:

- complete Vitest suite PASS;
- TypeScript exits 0;
- production build exits 0, allowing only the existing chunk-size warning;
- targeted ESLint exits 0;
- `git diff --check` exits 0.

- [ ] **Step 6: Enforce modularity and behavior scans**

Run:

```bash
wc -l convex/workflowNodeConfig.ts convex/workflowMessageGraphSave.ts convex/workflowAutomationSave.ts convex/workflowLayout.ts src/pages/WorkflowPage.tsx src/pages/useWorkflowAutomationDraft.ts src/pages/useWorkflowMessageActions.ts src/components/workflow/WorkflowCanvas.tsx src/components/workflow/WorkflowTemplatePreviewOverlay.tsx src/components/workflow/WorkflowInspectorForm.tsx
rg -n "Save the workflow first|Try now|onNodeMoved=\\{workflow|workflowDraftSave|isDraftWorkflowNodeId" src convex --glob '*.{ts,tsx}'
```

Expected: every code file is at most 300 lines and the forbidden behavior scan returns no production matches.

- [ ] **Step 7: Update continuity and commit**

Record:

- direct Add/Apply/Delete/Connect/edge removal;
- immediate first-session media upload;
- transient manual drag behavior;
- deliberate Cleanup/Arrange persistence;
- automation-only Save/Discard;
- confirmed read-only template preview;
- exact verification receipts.

Commit:

```bash
git status --short
git add CONTINUITY.md convex/_generated/api.d.ts convex/workflowLayout.ts src/components/workflow/workflowDraftModel.ts src/components/workflow/workflowDraftModel.test.ts src/components/workflow/workflowTemplates.ts src/pages/workflowTemplateDraftState.ts src/pages/workflowTemplateDraftState.test.ts
git diff --cached --stat
git commit -m "Complete direct workflow message persistence"
```
