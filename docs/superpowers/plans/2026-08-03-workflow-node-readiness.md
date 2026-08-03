# Workflow Node Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist whether each workflow action is configured for execution, alert users about incomplete nodes, and remove incomplete nodes from every AI workflow context.

**Architecture:** A focused Convex helper computes readiness from the node plus its current media, service, and routing prerequisites. All writers refresh the persisted `isReady` value, while a migration backfills legacy nodes. The editor continues to load the full graph, but runtime context filters both unready nodes and edges connected to them.

**Tech Stack:** Convex schema/functions and migrations component, TypeScript, React, React Flow, Lucide, Vitest, convex-test.

## Global Constraints

- Use Node v22 for every test, typecheck, and build command.
- Keep all production code files under 300 lines and avoid code comments.
- Use `isReady` as the single persisted node-readiness field.
- Treat absent legacy `isReady` as unready until the migration completes.
- The authenticated editor loads all nodes; only AI runtime context filters to ready nodes.
- Do not deploy or run the data migration without user authorization.
- Every non-entry workflow node requires a non-empty incoming condition detail; Condition Name remains optional.
- Render `Action Required` below incomplete standard nodes, left-aligned, and never render it for `Message enters`.

---

### Task 1: Define and backfill workflow-node readiness

**Files:**
- Create: `convex/workflowNodeReadiness.ts`
- Create: `convex/workflowNodeReadiness.test.ts`
- Create: `convex/workflowNodeReadinessMigration.ts`
- Modify: `convex/schema.ts:428-440`
- Modify: `convex/workflowCore.ts:25-96`
- Modify: `convex/workflows.ts:77-122`

**Interfaces:**
- Produces `getWorkflowNodeReadiness(node, facts): boolean`, where `facts` contains `readyMediaNodeIds`, `activeAppointmentServiceIds`, and `hasAcceptingLeadMember`.
- Produces `getWorkflowNodeReadinessFactsForAgent(ctx, agentId)` for both mutations and migration batches, plus `refreshWorkflowNodeReadinessForAgent(ctx, agentId): Promise<void>` for mutation writers.
- Produces `runBackfillWorkflowNodeReadiness`, the migrations-component runner for legacy nodes.

- [ ] **Step 1: Write failing readiness-policy tests**

```ts
test('requires a configured message before a Send message node is ready', () => {
  expect(getWorkflowNodeReadiness(sendTextNode('Write the exact message the AI should send when this workflow condition matches.'), emptyFacts)).toBe(false);
  expect(getWorkflowNodeReadiness(sendTextNode('Thanks for contacting us. We open at 9am.'), emptyFacts)).toBe(true);
});

test('requires a ready asset before a media node is ready', () => {
  expect(getWorkflowNodeReadiness(sendImageNode, emptyFacts)).toBe(false);
  expect(getWorkflowNodeReadiness(sendImageNode, factsWithReadyMedia(sendImageNode._id))).toBe(true);
});

test('requires active services and an accepting teammate before a booking node is ready', () => {
  expect(getWorkflowNodeReadiness(bookAppointmentNode, factsWithActiveService)).toBe(false);
  expect(getWorkflowNodeReadiness(bookAppointmentNode, factsWithBookableServiceAndTeammate)).toBe(true);
});
```

- [ ] **Step 2: Run the policy test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowNodeReadiness.test.ts`

Expected: FAIL because the readiness module does not exist.

- [ ] **Step 3: Add the optional schema field, focused readiness module, and migration**

```ts
export type WorkflowNodeReadinessFacts = {
  readyMediaNodeIds: Set<Id<'workflowNodes'>>;
  activeAppointmentServiceIds: Set<Id<'appointmentServices'>>;
  hasAcceptingLeadMember: boolean;
};

export function getWorkflowNodeReadiness(
  node: Doc<'workflowNodes'>,
  facts: WorkflowNodeReadinessFacts,
) {
  if (node.kind === 'sendText') return hasConfiguredMessage(node);
  if (node.kind === 'sendImage' || node.kind === 'sendFile') {
    return facts.readyMediaNodeIds.has(node._id);
  }
  if (node.kind === 'bookAppointment') {
    return facts.hasAcceptingLeadMember && hasActiveAllowedService(node, facts);
  }
  return true;
}
```

Add `isReady: v.optional(v.boolean())` to `workflowNodes`. Build readiness facts with bounded indexed queries, patch only nodes whose stored value differs, and let the migration call `getWorkflowNodeReadinessFactsForAgent` plus the same policy through `migrateOne` before returning the patch.

- [ ] **Step 4: Run policy and migration tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowNodeReadiness.test.ts`

Expected: PASS; the policy catches missing message/media/booking prerequisites and migration patches legacy nodes.

- [ ] **Step 5: Commit the readiness contract**

```bash
git add convex/schema.ts convex/workflowCore.ts convex/workflows.ts convex/workflowNodeReadiness.ts convex/workflowNodeReadiness.test.ts convex/workflowNodeReadinessMigration.ts
git commit -m "Add workflow node readiness state"
```

### Task 2: Refresh readiness whenever prerequisites change

**Files:**
- Modify: `convex/workflowNodeConfig.ts:9-84`
- Modify: `convex/workflowDraftSave.ts:28-158`
- Modify: `convex/workflowMessageGraphSave.ts:25-131`
- Modify: `convex/workflowAppointmentServices.ts:111-150`
- Modify: `convex/workflowMediaInternal.ts:35-220`
- Modify: `convex/workflowMediaDeletion.ts`
- Modify: `convex/appointmentBooking/services.ts:90-170`
- Modify: `convex/leadRouting/schedules.ts:210-330`
- Test: `convex/workflowNodeConfig.test.ts`
- Test: `convex/workflowAppointmentServices.test.ts`
- Test: `convex/workflowMedia.test.ts`

**Interfaces:**
- Consumes `refreshWorkflowNodeReadinessForAgent(ctx, agentId)` from Task 1.
- Produces transactionally current `workflowNodes.isReady` after any relevant mutation succeeds.

- [ ] **Step 1: Write failing writer-transition tests**

```ts
test('applying a configured Send message marks its node ready', async () => {
  await authed.mutation(api.workflowNodeConfig.apply, configuredSendTextArgs);
  expect(await readNode(t, sendTextNodeId)).toMatchObject({ isReady: true });
});

test('finishing the first media upload marks its node ready and deleting its last asset clears readiness', async () => {
  await finishWorkflowMediaUpload(t, imageNodeId);
  expect(await readNode(t, imageNodeId)).toMatchObject({ isReady: true });
  await deleteWorkflowMedia(t, imageNodeId);
  expect(await readNode(t, imageNodeId)).toMatchObject({ isReady: false });
});

test('disabling the final active booking service clears booking-node readiness', async () => {
  await disableOnlyBookingService(t, agentId);
  expect(await readNode(t, bookingNodeId)).toMatchObject({ isReady: false });
});
```

- [ ] **Step 2: Run the transition tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowNodeConfig.test.ts convex/workflowAppointmentServices.test.ts convex/workflowMedia.test.ts`

Expected: FAIL because writers do not yet refresh `isReady`.

- [ ] **Step 3: Refresh only after successful prerequisite writes**

```ts
await ctx.db.patch(node._id, nodePatch);
await refreshWorkflowNodeReadinessForAgent(ctx, agent._id);

await ctx.db.patch(service._id, servicePatch);
await refreshWorkflowNodeReadinessForAgent(ctx, service.agentId);
```

Call the helper after node configuration, direct graph replacement, template replacement, service-selection edits, media upload finalization/import/deletion/failure, appointment-service mutations, and schedule enablement changes. Preserve existing authorization and do not refresh after rejected or no-op writes.

- [ ] **Step 4: Run the transition tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowNodeConfig.test.ts convex/workflowAppointmentServices.test.ts convex/workflowMedia.test.ts`

Expected: PASS; all tested writer paths persist the expected ready or unready state.

- [ ] **Step 5: Commit writer integration**

```bash
git add convex/workflowNodeConfig.ts convex/workflowDraftSave.ts convex/workflowMessageGraphSave.ts convex/workflowAppointmentServices.ts convex/workflowMediaInternal.ts convex/workflowMediaDeletion.ts convex/appointmentBooking/services.ts convex/leadRouting/schedules.ts convex/workflowNodeConfig.test.ts convex/workflowAppointmentServices.test.ts convex/workflowMedia.test.ts
git commit -m "Refresh workflow readiness with configuration"
```

### Task 3: Restrict AI workflow context to ready graph elements

**Files:**
- Modify: `convex/workflowRuntimeContext.ts:1-121`
- Test: `convex/workflowRuntimeContext.test.ts`
- Test: `convex/chat/workflowActionPlanner.test.ts`

**Interfaces:**
- Consumes persisted `Doc<'workflowNodes'>['isReady']`.
- Produces `WorkflowRuntimeContextForPrompt` containing only nodes with `isReady === true` and edges whose endpoints both remain.

- [ ] **Step 1: Write a failing runtime-filter test**

```ts
test('omits unready nodes and their dangling edges from runtime workflow context', async () => {
  const context = await t.query(internal.workflowRuntimeContext.loadForAgent, { agentId });
  expect(context?.nodes.map((node) => node.nodeId)).toEqual([readyNodeId]);
  expect(context?.edges).toEqual([]);
});
```

- [ ] **Step 2: Run the runtime-filter test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowRuntimeContext.test.ts`

Expected: FAIL because the runtime currently maps every node and edge.

- [ ] **Step 3: Filter the graph before building runtime details**

```ts
const readyNodes = nodes.filter((node) => node.isReady === true);
const readyNodeIds = new Set(readyNodes.map((node) => node._id));
const readyEdges = edges.filter((edge) =>
  readyNodeIds.has(edge.sourceNodeId) && readyNodeIds.has(edge.targetNodeId),
);
```

Build node conditions from `readyEdges`, never the original edge collection. Keep current bounded media and service loading, but execute it only for the surviving ready nodes.

- [ ] **Step 4: Run context and planner tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowRuntimeContext.test.ts convex/chat/workflowActionPlanner.test.ts`

Expected: PASS; no AI prompt or planner input can reference an unready node.

- [ ] **Step 5: Commit the runtime boundary**

```bash
git add convex/workflowRuntimeContext.ts convex/workflowRuntimeContext.test.ts convex/chat/workflowActionPlanner.test.ts
git commit -m "Filter unready workflow nodes from AI context"
```

### Task 4: Surface incomplete nodes in the authenticated editor

**Files:**
- Modify: `src/components/workflow/workflowTypes.ts:19-30`
- Modify: `src/components/workflow/workflowFlowModel.ts:171-196`
- Modify: `src/components/workflow/WorkflowNode.tsx:1-114`
- Test: `src/components/workflow/workflowFlowModel.test.ts`
- Test: `src/components/workflow/WorkflowNode.test.ts`

**Interfaces:**
- Consumes `Doc<'workflowNodes'>['isReady']` from the unfiltered editor graph.
- Produces `WorkflowNodeData.isReady` and an accessible `Action Required` alert only for unready standard nodes.

- [ ] **Step 1: Write failing flow and node-card tests**

```ts
test('carries persisted readiness into the standard workflow flow node', () => {
  expect(nodes[0]?.data.isReady).toBe(false);
});

test('renders an Action Required alert below an unready action node', () => {
  render(<WorkflowNode {...propsFor({ isReady: false })} />);
  expect(screen.getByText('Action Required')).toBeVisible();
  expect(screen.getByRole('img', { name: 'Action required' })).toBeVisible();
});
```

- [ ] **Step 2: Run the UI tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowFlowModel.test.ts src/components/workflow/WorkflowNode.test.ts`

Expected: FAIL because readiness is absent from flow data and no alert renders.

- [ ] **Step 3: Add the compact accessible alert below the card**

```tsx
{data.isReady || data.kind === 'start' ? null : (
  <div className="absolute left-0 top-full mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
    <TriangleAlert aria-label="Action required" role="img" className="size-3.5" />
    <span>Action Required</span>
  </div>
)}
```

Pass `isReady: node.isReady === true` through the flow model. Keep the alert out of compact landing preview data by preserving its explicit ready fixtures.

- [ ] **Step 4: Run the UI tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowFlowModel.test.ts src/components/workflow/WorkflowNode.test.ts`

Expected: PASS; standard editor nodes retain their full graph while incomplete ones visibly request action.

- [ ] **Step 5: Commit the editor indicator**

```bash
git add src/components/workflow/workflowTypes.ts src/components/workflow/workflowFlowModel.ts src/components/workflow/WorkflowNode.tsx src/components/workflow/workflowFlowModel.test.ts src/components/workflow/WorkflowNode.test.ts
git commit -m "Show workflow node action requirements"
```

### Task 5: Verify the integrated feature and prepare migration handoff

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes all readiness writes, runtime filtering, migration runner, and editor alert from Tasks 1-4.
- Produces fresh evidence for local feature quality and an explicit, non-executed migration handoff.

- [ ] **Step 1: Run the combined focused suite**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowNodeReadiness.test.ts convex/workflowNodeConfig.test.ts convex/workflowAppointmentServices.test.ts convex/workflowMedia.test.ts convex/workflowRuntimeContext.test.ts convex/chat/workflowActionPlanner.test.ts src/components/workflow/workflowFlowModel.test.ts src/components/workflow/WorkflowNode.test.ts`

Expected: PASS with no readiness regression failures.

- [ ] **Step 2: Run static checks and build**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit && bun run build && git diff --check`

Expected: TypeScript and production build exit 0; whitespace check produces no output.

- [ ] **Step 3: Record migration instructions without executing them**

```bash
npx convex run workflowNodeReadinessMigration:runBackfillWorkflowNodeReadiness '{"dryRun":true}'
npx convex run workflowNodeReadinessMigration:runBackfillWorkflowNodeReadiness
npx convex run --component migrations lib:getStatus --watch
```

Do not run these commands unless the user explicitly authorizes data migration for the intended Convex deployment.

- [ ] **Step 4: Update continuity and commit verified work**

```bash
git add CONTINUITY.md convex src docs/superpowers/plans/2026-08-03-workflow-node-readiness.md
git commit -m "Add workflow node readiness"
```

### Task 6: Refine required-field guidance and condition readiness

**Files:**
- Create: `src/components/workflow/WorkflowRequiredLabel.tsx`
- Create: `src/components/workflow/WorkflowRequiredLabel.test.tsx`
- Create: `src/components/workflow/WorkflowSendMediaTitle.tsx`
- Create: `src/components/workflow/WorkflowSendMediaTitle.test.tsx`
- Modify: `src/components/workflow/WorkflowNode.tsx`
- Modify: `src/components/workflow/WorkflowNode.test.ts`
- Modify: `src/components/workflow/WorkflowInspectorForm.tsx`
- Modify: `src/components/workflow/workflowInspectorBehavior.ts`
- Modify: `src/components/workflow/workflowInspectorMediaActions.test.ts`
- Modify: `src/components/workflow/WorkflowSendMediaSection.tsx`
- Modify: `convex/workflowNodeReadiness.ts`
- Modify: `convex/workflowNodeReadiness.test.ts`
- Modify: `convex/workflowNodeConfig.ts`
- Modify: `convex/workflowNodeConfig.test.ts`
- Modify: `convex/workflowDraftValidation.ts`
- Modify: `convex/workflowDraftValidation.test.ts`
- Modify: `convex/workflows.ts`

**Interfaces:**
- Produces `WorkflowRequiredLabel`, which renders visible label text, a decorative red asterisk, and screen-reader `required` text.
- Produces `conditionDetailBlocksApply(conditionEnabled: boolean, conditionDetail: string): boolean` for inspector Apply gating.
- Extends `WorkflowNodeReadinessFacts` with `configuredConditionNodeIds: Set<Id<'workflowNodes'>>` derived from non-empty incoming edge details.
- Preserves `getWorkflowNodeReadiness(node, facts): boolean` while requiring every non-`start` node to appear in `configuredConditionNodeIds`.

- [ ] **Step 1: Write failing behavior tests**

Add tests proving that the shared required label renders `Services`, a red decorative `*`, and screen-reader `required`; condition-detail gating blocks only a displayed blank detail; a non-entry node without configured condition detail is unready; `workflowNodeConfig.apply` rejects clearing an existing edge detail; and draft validation rejects a blank edge detail.

- [ ] **Step 2: Run the tests to verify the missing behavior fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowRequiredLabel.test.tsx src/components/workflow/WorkflowSendMediaTitle.test.tsx src/components/workflow/workflowInspectorMediaActions.test.ts convex/workflowNodeReadiness.test.ts convex/workflowNodeConfig.test.ts convex/workflowDraftValidation.test.ts`

Expected: FAIL because the required-label component, Apply gate, condition readiness fact, and backend validation do not exist.

- [ ] **Step 3: Implement the minimal required-field and readiness behavior**

Render the shared label for Book appointment Services/Availability, Send file Files to send, and Condition Detail. Add condition gating to `saveDisabled`; reject blank detail before any mutation patch; reject blank draft edge details; load bounded workflow edges into readiness facts; require a configured condition for non-entry nodes; and refresh readiness after `addNodeAfter` inserts its edge.

Move the alert after the card with `absolute left-0 top-full mt-1.5`, retain the amber styling, and gate it with `data.kind !== 'start'` so legacy or stale readiness can never show an alert above or below `Message enters`. Absolute placement keeps card handles and direct controls anchored to the card rather than the status line.

- [ ] **Step 4: Run focused tests and build**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowNodeReadiness.test.ts convex/workflowNodeConfig.test.ts convex/workflowDraftValidation.test.ts convex/workflowAppointmentServices.test.ts convex/workflowMedia.test.ts convex/workflowRuntimeContext.test.ts convex/chat/workflowActionPlanner.test.ts src/components/workflow/WorkflowRequiredLabel.test.tsx src/components/workflow/WorkflowSendMediaTitle.test.tsx src/components/workflow/workflowInspectorMediaActions.test.ts src/components/workflow/WorkflowInspectorForm.test.ts src/components/workflow/workflowFlowModel.test.ts src/components/workflow/WorkflowNode.test.ts`

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/workflow/WorkflowRequiredLabel.tsx src/components/workflow/WorkflowRequiredLabel.test.tsx src/components/workflow/WorkflowSendMediaTitle.tsx src/components/workflow/WorkflowSendMediaTitle.test.tsx src/components/workflow/WorkflowNode.tsx src/components/workflow/WorkflowInspectorForm.tsx src/components/workflow/workflowInspectorBehavior.ts src/components/workflow/WorkflowSendMediaSection.tsx convex/workflowNodeReadiness.ts convex/workflowNodeConfig.ts convex/workflowDraftValidation.ts convex/workflows.ts && bun run build && git diff --check`

Expected: focused tests, scoped lint, production build, and whitespace check pass.

- [ ] **Step 5: Commit the refinement**

```bash
git add docs/superpowers/specs/2026-08-03-workflow-node-readiness-design.md docs/superpowers/plans/2026-08-03-workflow-node-readiness.md src/components/workflow/WorkflowRequiredLabel.tsx src/components/workflow/WorkflowRequiredLabel.test.tsx src/components/workflow/WorkflowSendMediaTitle.tsx src/components/workflow/WorkflowSendMediaTitle.test.tsx src/components/workflow/WorkflowNode.tsx src/components/workflow/WorkflowNode.test.ts src/components/workflow/WorkflowInspectorForm.tsx src/components/workflow/workflowInspectorBehavior.ts src/components/workflow/workflowInspectorMediaActions.test.ts src/components/workflow/WorkflowSendMediaSection.tsx convex/workflowNodeReadiness.ts convex/workflowNodeReadiness.test.ts convex/workflowNodeConfig.ts convex/workflowNodeConfig.test.ts convex/workflowDraftValidation.ts convex/workflowDraftValidation.test.ts convex/workflowDraftSave.test.ts convex/workflowMessageGraphSave.test.ts convex/workflowMedia.test.ts convex/workflows.ts CONTINUITY.md
git commit -m "Refine workflow action requirements"
```
