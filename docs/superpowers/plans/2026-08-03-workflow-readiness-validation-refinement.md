# Workflow Readiness Validation Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make incomplete workflow requirements visible at Apply time, keep Human escalation ready, and align Book appointment controls consistently.

**Architecture:** Keep readiness truth in `workflowNodeReadiness.ts`, while the inspector owns attempted-submit UI state and passes section validity to reusable media/booking sections. The roster presentation remains a local layout concern.

**Tech Stack:** TypeScript, React, Convex, Vitest, Lucide, Tailwind CSS.

## Global Constraints

- Use Node v22 for every test and build command.
- Keep Convex functions schema-safe with explicit readiness behavior.
- Keep code files at or below 300 lines and avoid code comments.
- Do not deploy or run the readiness migration.

---

### Task 1: Preserve Human escalation readiness

**Files:**
- Modify: `convex/workflowNodeReadiness.ts:40-52`
- Modify: `convex/workflowNodeReadiness.test.ts:79-102`

**Interfaces:**
- Consumes: `getWorkflowNodeReadiness(node, facts)`.
- Produces: Human escalation readiness independent of `configuredConditionNodeIds`.

- [ ] **Step 1: Write the failing test**

```ts
test('keeps human escalation ready without a configured incoming condition', () => {
  expect(getWorkflowNodeReadiness(
    workflowNode('humanEscalation'),
    Object.assign(readinessFacts(), { configuredConditionNodeIds: new Set() }),
  )).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node node_modules/vitest/vitest.mjs run convex/workflowNodeReadiness.test.ts`

Expected: FAIL because an unconditioned Human escalation is currently not ready.

- [ ] **Step 3: Write minimal implementation**

```ts
if (node.kind === 'start' || node.kind === 'humanEscalation') return true;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node node_modules/vitest/vitest.mjs run convex/workflowNodeReadiness.test.ts`

Expected: PASS.

### Task 2: Add inspector requirement feedback

**Files:**
- Modify: `src/components/workflow/WorkflowInspectorForm.tsx:65-298`
- Modify: `src/components/workflow/WorkflowSendMediaSection.tsx:18-163`
- Modify: `src/components/workflow/WorkflowSendMediaTitle.tsx:9-20`
- Modify: `src/components/workflow/WorkflowInspectorForm.test.ts:1-42`
- Modify: `src/components/workflow/WorkflowSendMediaTitle.test.tsx:1-17`

**Interfaces:**
- Consumes: `WorkflowSendMediaSection` media-query readiness.
- Produces: an Apply attempt that displays inline messages and calls `onSave` only after all required sections are valid.

- [ ] **Step 1: Write the failing tests**

```ts
expect(source).toContain('attemptedApply');
expect(source).toContain('Please add at least one photo or video before applying.');
expect(imageMarkup).toContain(' required</span>');
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node node_modules/vitest/vitest.mjs run src/components/workflow/WorkflowInspectorForm.test.ts src/components/workflow/WorkflowSendMediaTitle.test.tsx`

Expected: FAIL because photos/videos do not render a required marker and Apply does not expose attempted-submit feedback.

- [ ] **Step 3: Write minimal implementation**

```ts
const [attemptedApply, setAttemptedApply] = useState(false);
const showMediaRequirement = attemptedApply && !hasReadyMedia;

if (!canApply) {
  setAttemptedApply(true);
  return;
}
```

Render each message directly after its invalid required field or section. Make both media titles use `WorkflowRequiredLabel`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node node_modules/vitest/vitest.mjs run src/components/workflow/WorkflowInspectorForm.test.ts src/components/workflow/WorkflowSendMediaTitle.test.tsx`

Expected: PASS.

### Task 3: Match appointment icons and split alignment

**Files:**
- Modify: `src/components/workflow/WorkflowInspectorForm.tsx:1-298`
- Modify: `src/components/workflow/WorkflowBookingAvailabilitySection.tsx:94-128`
- Modify: `src/components/workflow/WorkflowInspectorForm.test.ts:1-42`
- Modify: `src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx:160-170`

**Interfaces:**
- Consumes: sidebar icons `ShoppingCart` and `Clock3` from Lucide.
- Produces: icon-led Services and Availability headings, with vertically centered accepting-leads controls.

- [ ] **Step 1: Write the failing tests**

```ts
expect(source).toContain('ShoppingCart');
expect(source).toContain('Clock3');
expect(source).toContain('flex shrink-0 items-center gap-2');
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node node_modules/vitest/vitest.mjs run src/components/workflow/WorkflowInspectorForm.test.ts src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx`

Expected: FAIL because the headings have no icons and the control group is top-aligned.

- [ ] **Step 3: Write minimal implementation**

```tsx
<ShoppingCart className="size-4 text-muted-foreground" />
<Clock3 className="size-4 text-muted-foreground" />
```

Replace the roster control container's `items-start` with `items-center`; leave the teammate information container unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node node_modules/vitest/vitest.mjs run src/components/workflow/WorkflowInspectorForm.test.ts src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx`

Expected: PASS.

### Task 4: Verify the workflow working set

**Files:**
- Modify: `CONTINUITY.md`

- [ ] **Step 1: Run focused coverage**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node node_modules/vitest/vitest.mjs run convex/workflowNodeReadiness.test.ts src/components/workflow/WorkflowInspectorForm.test.ts src/components/workflow/WorkflowSendMediaTitle.test.tsx src/components/workflow/WorkflowBookingAvailabilitySection.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run production verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun run build && git diff --check`

Expected: production build and whitespace check PASS.

- [ ] **Step 3: Record the verified, unreleased result**

Add a concise dated `[CODE]` entry to `CONTINUITY.md`; do not add a changelog entry because the change is not released.
