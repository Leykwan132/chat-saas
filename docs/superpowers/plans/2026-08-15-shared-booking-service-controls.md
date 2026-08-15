# Shared Booking Service Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use one switch-enabled booking-service component in both a Book appointment workflow node and its detail panel.

**Architecture:** Extend `WorkflowBookingNodeServices` with a layout-only `presentation` property so it owns querying services, rendering rows, tooltips, switches, optimistic state, and mutation failures in every location. Replace the read-only inspector wrapper with this shared component and remove its now-unused selection-only helper.

**Tech Stack:** React 19, TypeScript, Convex React queries and mutations, shadcn Switch and Tooltip, React DOM server rendering, Vitest, Tailwind CSS.

## Global Constraints

- Use Node v22 for all scripts: `source ~/.nvm/nvm.sh && nvm use 22`.
- Every active service renders the same immediate-save switch in both the node and inspector.
- Both locations retain dotted-underlined teammate count hover affordances and names in the tooltip.
- Inspector Apply does not send service IDs and cannot overwrite immediate switch changes.
- Keep source modules below 300 lines, do not add comments, and preserve the user-owned `pricing-knowledge-base-updated.md`.

---

### Task 1: Exercise shared booking-service controls in the inspector layout

**Files:**
- Create: `src/components/workflow/WorkflowBookingNodeServices.test.tsx`
- Modify: `src/components/workflow/WorkflowBookingNodeServices.tsx`
- Modify: `src/components/workflow/WorkflowInspectorForm.tsx`
- Modify: `src/components/workflow/WorkflowInspectorForm.test.ts`
- Delete: `src/components/workflow/WorkflowBookingInspectorServices.tsx`
- Modify: `src/components/workflow/workflowBookingNodeServicesModel.ts`
- Modify: `src/components/workflow/workflowBookingNodeServicesModel.test.ts`

**Interfaces:**
- Consumes: `WorkflowBookingNodeServices({ agentId, nodeId, allowedServiceIds, disabled, presentation? })` where `presentation` is `'node' | 'inspector'`.
- Produces: the same active-service rows, switches, teammate tooltip, immediate mutation, optimistic state, and failure behavior in both presentations.
- Integrates: `WorkflowInspectorForm` passes `node._id`, `node.allowedAppointmentServiceIds`, and `isSaving` to `WorkflowBookingNodeServices` for `bookAppointment` nodes with an `agentId`.

- [ ] **Step 1: Write a failing inspector-presentation component test**

Create `WorkflowBookingNodeServices.test.tsx`. Mock only `convex/react` query and mutation hooks, render the actual shared component with `renderToStaticMarkup`, and assert the user-visible outcome:

```tsx
test('renders all active services with booking switches in inspector presentation', () => {
  const markup = renderToStaticMarkup(
    <WorkflowBookingNodeServices
      agentId={'agent' as Id<'agents'>}
      nodeId={'node' as Id<'workflowNodes'>}
      allowedServiceIds={['service-a' as Id<'appointmentServices'>]}
      disabled={false}
      presentation="inspector"
    />,
  );

  expect(markup).toContain('Consultation');
  expect(markup).toContain('Follow-up');
  expect(markup).toContain('Remove Consultation for booking');
  expect(markup).toContain('Add Follow-up for booking');
  expect(markup).not.toContain('Inactive service');
});
```

The mocked query returns complete service rows: active `Consultation`, active `Follow-up`, and inactive `Inactive service`, each with their assigned teammates. The test fails before the `presentation` property exists.

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowBookingNodeServices.test.tsx
```

Expected: FAIL because `presentation` is not accepted by the shared component.

- [ ] **Step 3: Implement the single component boundary**

Add the optional property and default in `WorkflowBookingNodeServices`:

```ts
presentation?: 'node' | 'inspector';
```

Use it only for the outer spacing and row-size classes. Preserve the existing query, active-service filtering, switches, optimistic state, mutation, dotted tooltip, and canvas event suppression.

In `WorkflowInspectorForm`, replace `WorkflowBookingInspectorServices` with:

```tsx
<WorkflowBookingNodeServices
  agentId={agentId}
  nodeId={node._id}
  allowedServiceIds={node.allowedAppointmentServiceIds}
  disabled={isSaving}
  presentation="inspector"
/>
```

Delete `WorkflowBookingInspectorServices.tsx`. Remove `getSelectedBookingServices` and its obsolete selection-filter regression test because the inspector now displays the same active-service set as the node.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowBookingNodeServices.test.tsx src/components/workflow/WorkflowInspectorForm.test.ts src/components/workflow/workflowBookingNodeServicesModel.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run static validation**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit && git diff --check
```

Expected: exits 0.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/components/workflow/WorkflowBookingNodeServices.test.tsx src/components/workflow/WorkflowBookingNodeServices.tsx src/components/workflow/WorkflowInspectorForm.test.ts src/components/workflow/WorkflowInspectorForm.tsx src/components/workflow/workflowBookingNodeServicesModel.test.ts src/components/workflow/workflowBookingNodeServicesModel.ts CONTINUITY.md
git rm src/components/workflow/WorkflowBookingInspectorServices.tsx
git commit -m "feat: share booking service controls"
```

### Task 2: Verify the branch

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: the unified booking-service component from Task 1.
- Produces: an evidence-backed completion record with no production-release claim.

- [ ] **Step 1: Run the full suite**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run test
```

Expected: all application, Convex, and Docs tests pass.

- [ ] **Step 2: Record verification and commit it**

Add the command outcome, totals, and Node version to `CONTINUITY.md`, then run:

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-15-shared-booking-service-controls.md
git commit -m "docs: record shared booking controls verification"
```
