# Booking Node Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each active booking service, its assigned teammate count and hover names, and an immediate-save switch inside standard Book appointment workflow nodes.

**Architecture:** Extend the authorized workflow-services query with assigned teammate presentation data, preserving the legacy all-current-teammates behavior. A dedicated `WorkflowBookingNodeServices` component will query that data, own transient switch state, and invoke the existing selection mutation. The flow adapter passes booking-node identity and selection data into standard canvas nodes, while the inspector stops editing service IDs to prevent stale Apply actions from overwriting direct changes.

**Tech Stack:** React, TypeScript, Convex, Radix Tooltip and Switch, Vitest, convex-test.

## Global Constraints

- Only active, unarchived services render in standard Book appointment nodes; do not render service descriptions.
- “Available teammates” means current teammates assigned to the service, not a date-specific calendar promise.
- A switch saves immediately, disables direct controls during its mutation, reports errors, and prevents canvas pointer/click propagation.
- Compact and preview nodes remain unchanged.
- Run Node tooling with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Read `convex/_generated/ai/guidelines.md` before editing Convex code; use bounded indexed queries and validated public functions.
- Keep source files below 300 lines, add no comments, and do not stage `pricing-knowledge-base-updated.md`.

---

### Task 1: Expose Assigned Teammates on Workflow Services

**Files:**
- Modify: `convex/workflowAppointmentServices.ts:89-112`
- Modify: `convex/workflowAppointmentServices.test.ts:26-93,105-153`

**Interfaces:**
- Consumes: `appointmentServices.assignedWorkosUserIds`, team memberships, and user profile fields.
- Produces: `api.workflowAppointmentServices.listForAgent` rows with `assignedTeammates: Array<{ workosUserId: string; name: string }>`.

- [ ] **Step 1: Write the failing query regression**

Add a test that creates a second current teammate, creates one legacy service without `assignedWorkosUserIds` and one explicitly assigned service, then asserts:

```ts
expect(rows.find((service) => service.name === 'Consultation')?.assignedTeammates)
  .toEqual(expect.arrayContaining([
    expect.objectContaining({ workosUserId: ownerWorkosUserId }),
    expect.objectContaining({ name: 'Taylor Walker' }),
  ]));
expect(rows.find((service) => service.name === 'Installation')?.assignedTeammates)
  .toEqual([{ workosUserId: 'taylor-workos-id', name: 'Taylor Walker' }]);
```

- [ ] **Step 2: Run the Convex regression and verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowAppointmentServices.test.ts`

Expected: FAIL because `listForAgent` does not return `assignedTeammates`.

- [ ] **Step 3: Add the bounded assigned-teammate projection**

In `listForAgent`, resolve the agent's team, read up to 100 team memberships with `by_teamId`, load their user records, build display names from first name, last name, then email, and return the current assigned users for every service. Use all current teammates when a service has no explicit assignment list.

- [ ] **Step 4: Run the Convex regression and verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowAppointmentServices.test.ts`

Expected: PASS with both explicit and legacy assignment names returned.

### Task 2: Add Direct Booking-Service Node Controls

**Files:**
- Create: `src/components/workflow/workflowBookingNodeServicesModel.ts`
- Create: `src/components/workflow/workflowBookingNodeServicesModel.test.ts`
- Create: `src/components/workflow/WorkflowBookingNodeServices.tsx`
- Modify: `src/components/workflow/workflowTypes.ts:10-24`
- Modify: `src/components/workflow/workflowFlowModel.ts:157-210`
- Modify: `src/components/workflow/workflowFlowModel.test.ts`
- Modify: `src/components/workflow/WorkflowNode.tsx:1-105`
- Modify: `src/pages/WorkflowPage.tsx:69-87`

**Interfaces:**
- Consumes: `listForAgent` rows with `_id`, `name`, `isActive`, and `assignedTeammates`; existing `updateAllowedServices({ agentId, nodeId, serviceIds })` mutation.
- Produces: `WorkflowNodeData.bookingAgentId`, `WorkflowNodeData.allowedAppointmentServiceIds`, and direct service rows for standard Book appointment nodes.

- [ ] **Step 1: Write the failing model and flow regressions**

Create a model test that exercises the real selection helpers:

```ts
expect(getEffectiveBookingServiceIds(undefined, services)).toEqual(['service-a', 'service-b']);
expect(getUpdatedBookingServiceIds(['service-a'], 'service-b', true))
  .toEqual(['service-a', 'service-b']);
expect(bookingTeammateAvailabilityLabel(1)).toBe('1 teammate available');
expect(bookingTeammateAvailabilityLabel(2)).toBe('2 teammates available');
```

Add a flow-model test with a `bookAppointment` document asserting that, when `bookingAgentId` is supplied, its flow data contains that agent ID and the document's allowed service IDs.

- [ ] **Step 2: Run the focused frontend regressions and verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowBookingNodeServicesModel.test.ts src/components/workflow/workflowFlowModel.test.ts`

Expected: FAIL because the helpers and booking-node flow data do not exist.

- [ ] **Step 3: Implement the model, node component, and flow wiring**

Create helpers with these signatures:

```ts
export function getEffectiveBookingServiceIds<T extends string>(
  allowedServiceIds: readonly T[] | undefined,
  services: readonly { _id: T }[],
): T[];

export function getUpdatedBookingServiceIds<T extends string>(
  serviceIds: readonly T[],
  serviceId: T,
  checked: boolean,
): T[];

export function bookingTeammateAvailabilityLabel(count: number): string;
```

Render `WorkflowBookingNodeServices` only for standard Book appointment nodes with an authenticated `bookingAgentId`. It uses the query and mutation, filters to active services, displays name plus the label from `bookingTeammateAvailabilityLabel`, renders assigned names in `TooltipContent`, and immediately calls `updateAllowedServices` on toggle. Pass the agent ID and allowed service IDs through `workflowGraphToFlow`, with `WorkflowPage` as the only production caller supplying the agent ID.

- [ ] **Step 4: Run the focused frontend regressions and verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowBookingNodeServicesModel.test.ts src/components/workflow/workflowFlowModel.test.ts src/components/workflow/WorkflowNode.test.ts`

Expected: PASS with direct booking-node model behavior and agent/selection flow data.

### Task 3: Remove Duplicate Inspector Editing and Verify Integration

**Files:**
- Modify: `src/components/workflow/WorkflowInspectorForm.tsx:1-117,200-259`
- Modify: `src/components/workflow/WorkflowInspectorForm.test.ts`
- Modify: `CONTINUITY.md`
- Create: `docs/superpowers/plans/2026-08-15-booking-node-services.md`

**Interfaces:**
- Consumes: direct booking-node service persistence from Task 2.
- Produces: inspector Apply payloads that leave booking-service selection undefined and a durable record of the approved behavior.

- [ ] **Step 1: Write the failing inspector regression**

Replace the booking-inspector expectation with assertions that `WorkflowInspectorForm` does not import or render `WorkflowBookingInspectorRequirements` and does not include `allowedAppointmentServiceIds` in its Apply payload.

- [ ] **Step 2: Run the inspector regression and verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowInspectorForm.test.ts`

Expected: FAIL because the inspector still owns the service selector and sends its local selection state.

- [ ] **Step 3: Remove the duplicate service configuration**

Remove booking-service local state, readiness checks, the `WorkflowBookingInspectorRequirements` import/render, and the book-appointment service ID field from the inspector Apply values. Keep all title, condition, media, and delete behavior unchanged.

- [ ] **Step 4: Run focused validation**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowAppointmentServices.test.ts src/components/workflow/workflowBookingNodeServicesModel.test.ts src/components/workflow/workflowFlowModel.test.ts src/components/workflow/WorkflowNode.test.ts src/components/workflow/WorkflowInspectorForm.test.ts && bunx tsc --noEmit && git diff --check`

Expected: all commands exit 0.

- [ ] **Step 5: Run the full regression suite**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun run test`

Expected: all application, Convex, and Docs tests pass.

- [ ] **Step 6: Record and commit the verified change**

Add this decision to `CONTINUITY.md`:

```md
- 2026-08-15 D028 ACTIVE [USER] Standard Book appointment nodes directly list active services, their assigned teammate count and hover names, and immediate-save booking switches; the inspector no longer duplicates that selection.
```

Commit with:

```bash
git add convex/workflowAppointmentServices.ts convex/workflowAppointmentServices.test.ts src/components/workflow/workflowBookingNodeServicesModel.ts src/components/workflow/workflowBookingNodeServicesModel.test.ts src/components/workflow/WorkflowBookingNodeServices.tsx src/components/workflow/workflowTypes.ts src/components/workflow/workflowFlowModel.ts src/components/workflow/workflowFlowModel.test.ts src/components/workflow/WorkflowNode.tsx src/components/workflow/WorkflowNode.test.ts src/components/workflow/WorkflowInspectorForm.tsx src/components/workflow/WorkflowInspectorForm.test.ts src/pages/WorkflowPage.tsx CONTINUITY.md docs/superpowers/plans/2026-08-15-booking-node-services.md
git commit -m "feat: manage booking services from workflow nodes"
```
