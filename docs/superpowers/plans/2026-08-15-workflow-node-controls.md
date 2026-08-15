# Workflow Node Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users directly configure the primary behavior of every standard editable workflow node, including the `When` condition for Human escalation.

**Architecture:** Add two narrowly authorized immediate-save Convex mutations for node message content and an incoming edge’s condition detail. Pass agent and incoming-condition context through the full editable flow data, then use small node-control components selected by a `WorkflowNodeDirectControls` coordinator. Reuse the existing media and booking controls rather than duplicating their behavior.

**Tech Stack:** React 19, TypeScript, Convex mutations and subscriptions, Vitest with convex-test, shadcn Textarea, existing workflow media components, Tailwind CSS.

## Global Constraints

- Use Node v22 for all scripts: `source ~/.nvm/nvm.sh && nvm use 22`.
- Only standard full editable nodes render direct controls; compact and template-preview nodes remain unchanged.
- Direct controls save independently, stop canvas interaction propagation, retain optimistic drafts while pending, and restore subscribed state after failures.
- Send photo/video and file nodes reuse the existing media controls; Book appointment reuses its shared service switches.
- Human escalation shows a direct `When` control for its incoming condition detail.
- Inspector Apply does not overwrite direct node-control changes.
- Keep source modules below 300 lines, do not add comments, and preserve `pricing-knowledge-base-updated.md`.

---

### Task 1: Add authorized immediate canvas-control mutations and context

**Files:**
- Create: `convex/workflowNodeCanvasControls.ts`
- Create: `convex/workflowNodeCanvasControls.test.ts`
- Modify: `src/components/workflow/workflowTypes.ts`
- Modify: `src/components/workflow/workflowFlowModel.ts`
- Modify: `src/components/workflow/workflowFlowModel.test.ts`

**Interfaces:**
- Produces `api.workflowNodeCanvasControls.updateMessage({ agentId, nodeId, description })` for `sendText` nodes.
- Produces `api.workflowNodeCanvasControls.updateIncomingCondition({ agentId, nodeId, conditionDetail })` for the edge targeting a `humanEscalation` node.
- Produces `WorkflowNodeData.agentId?: Id<'agents'>` and `incomingCondition?: { edgeId: Id<'workflowEdges'>; detail?: string }` for standard flow nodes.

- [x] **Step 1: Write failing mutation and flow-data tests**

In `convex/workflowNodeCanvasControls.test.ts`, set up a manageable agent, workflow, `sendText` node, `humanEscalation` node, and incoming edge. Assert the user-visible persisted effects:

```ts
await authed.mutation(api.workflowNodeCanvasControls.updateMessage, {
  agentId,
  nodeId: sendTextNodeId,
  description: 'Share the booking link.',
});
expect(await getNode(sendTextNodeId)).toMatchObject({
  description: 'Share the booking link.',
  isReady: true,
});

await authed.mutation(api.workflowNodeCanvasControls.updateIncomingCondition, {
  agentId,
  nodeId: escalationNodeId,
  conditionDetail: 'When the customer asks for a person.',
});
expect(await getIncomingEdge(escalationNodeId)).toMatchObject({
  detail: 'When the customer asks for a person.',
});
```

Also assert each mutation rejects a node of the wrong kind. In `workflowFlowModel.test.ts`, assert a human-escalation node receives `agentId` and the incoming edge detail.

- [x] **Step 2: Run the focused tests to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowNodeCanvasControls.test.ts src/components/workflow/workflowFlowModel.test.ts
```

Expected: FAIL because the canvas-control API and incoming-condition data do not exist.

- [x] **Step 3: Add the minimal authorized backend and flow mappings**

In `workflowNodeCanvasControls.ts`, use `assertManageableAgent`, `getWorkflowForAgent`, and node/edge ownership checks. Both mutations trim their text, patch only their intended document, advance `workflow.updatedAt`, call `refreshWorkflowNodeReadinessForAgent`, and return `null`.

Map `agentId` to every persisted flow node. Build a target-node edge lookup from the workflow graph and map only human-escalation incoming edge ID/detail into `incomingCondition`.

- [x] **Step 4: Generate types and run the focused tests to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen && bunx vitest run convex/workflowNodeCanvasControls.test.ts src/components/workflow/workflowFlowModel.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit the data layer**

```bash
git add convex/workflowNodeCanvasControls.ts convex/workflowNodeCanvasControls.test.ts src/components/workflow/workflowTypes.ts src/components/workflow/workflowFlowModel.ts src/components/workflow/workflowFlowModel.test.ts convex/_generated
git commit -m "feat: add workflow canvas control data"
```

### Task 2: Render direct controls in standard workflow nodes

**Files:**
- Create: `src/components/workflow/WorkflowNodeDirectControls.tsx`
- Create: `src/components/workflow/WorkflowNodeMessageControl.tsx`
- Create: `src/components/workflow/WorkflowNodeConditionControl.tsx`
- Create: `src/components/workflow/WorkflowNodeDirectControls.test.tsx`
- Modify: `src/components/workflow/WorkflowSendMediaSection.tsx`
- Modify: `src/components/workflow/WorkflowNode.tsx`
- Modify: `src/components/workflow/WorkflowNode.test.ts`

**Interfaces:**
- `WorkflowNodeDirectControls({ agentId, nodeId, kind, description, incomingCondition, allowedServiceIds, disabled })` selects the focused control for a standard node.
- `WorkflowNodeMessageControl` calls `updateMessage` after a 500 ms debounce.
- `WorkflowNodeConditionControl` calls `updateIncomingCondition` after a 500 ms debounce and labels the field `When`.
- `WorkflowSendMediaSection` accepts `presentation?: 'inspector' | 'node'` and optional readiness callback/warning properties; node presentation keeps its existing query, grid, uploader, deletion, import, and error behavior while fitting the node card.

- [x] **Step 1: Write failing direct-control rendering tests**

Create `WorkflowNodeDirectControls.test.tsx` with Convex hook mocks and actual server rendering. Verify the behavior that users see:

```tsx
expect(render('sendText')).toContain('aria-label="Message to send"');
expect(render('sendImage')).toContain('Your Photos/Videos');
expect(render('sendFile')).toContain('Files to send');
expect(render('humanEscalation', 'When the customer asks for a person.'))
  .toContain('When the customer asks for a person.');
expect(render('closeConversation')).toContain('Closes the conversation.');
```

Assert `WorkflowNode` renders direct controls only when `data.density !== 'compact'` and an agent ID exists.

- [x] **Step 2: Run focused tests to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowNodeDirectControls.test.tsx src/components/workflow/WorkflowNode.test.ts
```

Expected: FAIL because direct-control components and their node integration do not exist.

- [x] **Step 3: Implement the focused direct controls**

Create `WorkflowNodeDirectControls` with `nodrag nopan` event suppression around every input and uploader. It renders:

```tsx
case 'sendText':
  return <WorkflowNodeMessageControl ... />;
case 'sendImage':
case 'sendFile':
  return <WorkflowSendMediaSection presentation="node" ... />;
case 'bookAppointment':
  return <WorkflowBookingNodeServices presentation="node" ... />;
case 'humanEscalation':
  return <WorkflowNodeConditionControl ... />;
case 'closeConversation':
  return <p>Closes the conversation.</p>;
default:
  return null;
```

The message and condition controls initialize from subscribed props, keep an immediate local draft, save after 500 ms without an empty catch, and on mutation error restore the latest prop value plus an error toast. Do not render controls for start or end.

Use `presentation="node"` in `WorkflowSendMediaSection` to remove inspector-only readiness warnings and reduce surrounding spacing, without changing upload or delete semantics.

In `WorkflowNode`, add `hasDirectControls` for standard nodes with `data.agentId`; expand card width only when controls exist and render `WorkflowNodeDirectControls` beneath the description. Remove booking-only card-size branches in favor of this unified control block.

- [x] **Step 4: Run focused tests to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowNodeDirectControls.test.tsx src/components/workflow/WorkflowNode.test.ts src/components/workflow/WorkflowSendMediaSection.test.ts src/components/workflow/WorkflowBookingNodeServices.test.tsx
```

Expected: PASS.

- [x] **Step 5: Run static validation and commit**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit && git diff --check
```

Then commit:

```bash
git add src/components/workflow/WorkflowNodeDirectControls.tsx src/components/workflow/WorkflowNodeMessageControl.tsx src/components/workflow/WorkflowNodeConditionControl.tsx src/components/workflow/WorkflowNodeDirectControls.test.tsx src/components/workflow/WorkflowSendMediaSection.tsx src/components/workflow/WorkflowNode.tsx src/components/workflow/WorkflowNode.test.ts
git commit -m "feat: add direct workflow node controls"
```

### Task 3: Add the workflow introduction and verify the branch

**Files:**
- Modify: `src/components/workflow/WorkflowToolbar.tsx`
- Modify: `src/components/workflow/WorkflowToolbar.test.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Produces the exact description: `Map how your agent responds, sends content, handles bookings, and routes conversations.`

- [x] **Step 1: Write the failing toolbar test**

Add this behavior assertion to `WorkflowToolbar.test.ts`:

```ts
expect(markup).toContain(
  'Map how your agent responds, sends content, handles bookings, and routes conversations.',
);
```

- [x] **Step 2: Run the focused test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowToolbar.test.ts
```

Expected: FAIL because the workflow introduction does not render.

- [x] **Step 3: Add the workflow introduction, verify, and commit**

Render the sentence directly below the Workflow heading as muted supporting copy. Then run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowToolbar.test.ts && bunx tsc --noEmit && git diff --check
```

Commit:

```bash
git add src/components/workflow/WorkflowToolbar.tsx src/components/workflow/WorkflowToolbar.test.ts
git commit -m "feat: describe workflow canvas"
```

- [x] **Step 4: Run the full suite and record verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run test
```

Record the Node version and passing totals in `CONTINUITY.md`, then commit:

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-15-workflow-node-controls.md
git commit -m "docs: record workflow node controls verification"
```
