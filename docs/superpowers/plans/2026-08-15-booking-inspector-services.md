# Booking Inspector Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the active services enabled for a Book appointment workflow node in its detail panel without adding a second editor.

**Architecture:** Add a small read-only inspector component that queries the existing authorized service endpoint and filters it using the node’s effective service selection. The component shares the existing selection and teammate-label model with the canvas node, while `WorkflowInspectorForm` decides when the summary is rendered and continues to omit service IDs from Apply payloads.

**Tech Stack:** React 19, TypeScript, Convex React queries, shadcn Tooltip, Vitest, Tailwind CSS.

## Global Constraints

- Use Node v22 for all scripts: `source ~/.nvm/nvm.sh && nvm use 22`.
- The canvas Book appointment node remains the only direct editing surface for service assignment.
- Inspector rows show active selected services only, with service name, dotted-underlined pointer teammate count, and teammate-name hover tooltip; descriptions and switches do not appear. The matching node teammate count uses the same hover affordance.
- A missing `allowedAppointmentServiceIds` list means every current active service is selected.
- Keep source modules below 300 lines and do not add comments.

---

### Task 1: Add the read-only Book appointment service summary

**Files:**
- Create: `src/components/workflow/WorkflowBookingInspectorServices.tsx`
- Modify: `src/components/workflow/WorkflowInspectorForm.tsx`
- Modify: `src/components/workflow/workflowBookingNodeServicesModel.ts`
- Modify: `src/components/workflow/workflowBookingNodeServicesModel.test.ts`

**Interfaces:**
- Consumes: `api.workflowAppointmentServices.listForAgent({ agentId })`, `getSelectedBookingServices(allowedServiceIds, services)`, and `bookingTeammateAvailabilityLabel(count)`.
- Produces: `WorkflowBookingInspectorServices({ agentId, allowedServiceIds })`, a read-only section for enabled active services.
- Produces: `getSelectedBookingServices(allowedServiceIds, services)`, which returns active services permitted by an explicit selection or a legacy missing selection.
- Integrates: `WorkflowInspectorForm` renders the component only when `node.kind === 'bookAppointment'` and `agentId` is present; `WorkflowInspectorSaveValues` remains unchanged.

- [x] **Step 1: Write the failing tests**

Add a behavior test in `workflowBookingNodeServicesModel.test.ts`:

```ts
test('returns only active services enabled for an inspector booking node', () => {
  const services = [
    { _id: 'service-a', isActive: true },
    { _id: 'service-b', isActive: false },
    { _id: 'service-c', isActive: true },
  ];

  expect(getSelectedBookingServices(['service-a', 'service-b'], services))
    .toEqual([{ _id: 'service-a', isActive: true }]);
  expect(getSelectedBookingServices(undefined, services))
    .toEqual([
      { _id: 'service-a', isActive: true },
      { _id: 'service-c', isActive: true },
    ]);
});
```

The regression fails if a future change includes an inactive or unselected service, or stops treating legacy nodes as selecting all active services.

- [x] **Step 2: Run the focused tests to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowBookingNodeServicesModel.test.ts
```

Expected: FAIL because `getSelectedBookingServices` does not exist.

- [x] **Step 3: Add the minimal read-only component and wire it into the inspector**

Add `getSelectedBookingServices` to `workflowBookingNodeServicesModel.ts`; it uses `getEffectiveBookingServiceIds` and returns only active selected rows. Create a query-backed `WorkflowBookingInspectorServices` component with this interface:

```ts
type WorkflowBookingInspectorServicesProps = {
  agentId: Id<'agents'>;
  allowedServiceIds?: Id<'appointmentServices'>[];
};
```

The component must query `listForAgent`, use `getSelectedBookingServices` to derive its rows, show a compact loading placeholder while the query is unresolved, and render the service name plus the existing teammate-count tooltip pattern. The count must use a dotted underline and pointer cursor to signal its hoverable teammate list. Render `No services selected.` when filtering leaves no rows. Do not import or render `Switch` and do not mutate workflow services.

In `WorkflowInspectorForm`, pass `node.allowedAppointmentServiceIds` only to the new child component and render it directly below the Book appointment action fields:

```tsx
{node.kind === 'bookAppointment' && agentId ? (
  <WorkflowBookingInspectorServices
    agentId={agentId}
    allowedServiceIds={node.allowedAppointmentServiceIds}
  />
) : null}
```

Do not add the IDs to `WorkflowInspectorSaveValues` or `handleApply`.

- [x] **Step 4: Run focused tests to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowBookingNodeServicesModel.test.ts
```

Expected: PASS.

- [x] **Step 5: Run static validation**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit && git diff --check
```

Expected: exits 0.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/components/workflow/WorkflowBookingInspectorServices.tsx src/components/workflow/WorkflowInspectorForm.tsx src/components/workflow/workflowBookingNodeServicesModel.ts src/components/workflow/workflowBookingNodeServicesModel.test.ts CONTINUITY.md
git commit -m "feat: show services in booking inspector"
```

### Task 2: Verify the branch

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: the completed inspector summary from Task 1.
- Produces: an evidence-backed completion record without customer release claims.

- [ ] **Step 1: Run the full suite**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run test
```

Expected: all application, Convex, and Docs tests pass.

- [ ] **Step 2: Record the verification receipt**

Add the command outcome, test totals, and Node version to `CONTINUITY.md`. Preserve the user-owned untracked `pricing-knowledge-base-updated.md`.

- [ ] **Step 3: Commit the verification record**

```bash
git add CONTINUITY.md
git commit -m "docs: record booking inspector verification"
```
