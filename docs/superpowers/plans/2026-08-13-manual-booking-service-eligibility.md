# Manual Booking Service Eligibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Inbox and Calendar manual bookings select active services without requiring an AI Book appointment workflow node.

**Architecture:** Add a separate active-service helper for manual booking that filters only inactive and archived services. Keep the existing workflow-filtered helper for AI booking sessions, and switch only the two staff booking option queries to the manual helper.

**Tech Stack:** TypeScript, Convex queries, convex-test, Vitest.

## Global Constraints

- Use Node.js v22 for every test and verification command.
- Preserve workflow service selection for AI-initiated bookings.
- Manual booking returns only services owned by the agent that are active and unarchived.
- Do not add schema fields or client-side fallbacks.

---

### Task 1: Prove manual booking is independent of workflow setup

**Files:**
- Modify: `convex/manualBookingAvailability.test.ts`
- Modify: `convex/calendarManualBooking.test.ts`

**Interfaces:**
- Consumes: `api.appointmentBooking.manualBooking.getCreateOptions` and `api.appointmentBooking.calendarManualBooking.getCreateOptions`.
- Produces: regressions that fail while these queries use workflow-filtered services.

- [x] **Step 1: Write failing Inbox assertion**

```ts
expect(options.services.map((service) => service.serviceId)).toEqual([
  fixture.serviceId,
]);
```

- [x] **Step 2: Write failing Calendar assertion**

```ts
const options = await authed.query(
  api.appointmentBooking.calendarManualBooking.getCreateOptions,
  { agentId: fixture.agentId },
);
expect(options.map((service) => service.serviceId)).toEqual([fixture.serviceId]);
```

- [x] **Step 3: Run the focused tests and verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/manualBookingAvailability.test.ts convex/calendarManualBooking.test.ts`

Expected: both option-query assertions fail because no Book appointment workflow node exists.

### Task 2: Separate manual booking service eligibility from AI workflow eligibility

**Files:**
- Modify: `convex/appointmentBooking/access.ts`
- Modify: `convex/appointmentBooking/manualBooking.ts`
- Modify: `convex/appointmentBooking/calendarManualBooking.ts`

**Interfaces:**
- Produces: `listActiveManualBookingServicesForAgent(ctx, agentId)` returning active, unarchived services for an agent.
- Preserves: `listActiveBookingServicesForAgent(ctx, agentId)` as the workflow-filtered AI booking helper.

- [x] **Step 1: Add the manual helper**

```ts
export async function listActiveManualBookingServicesForAgent(ctx: DbCtx, agentId: Id<"agents">) {
  const agent = await ctx.db.get(agentId);
  if (agent === null) return [];
  return (await listServices(ctx, agentId)).filter((service) => service.isActive);
}
```

- [x] **Step 2: Use it in both staff option queries**

```ts
const services = await listActiveManualBookingServicesForAgent(ctx, agent._id);
```

- [x] **Step 3: Run the focused tests and verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/manualBookingAvailability.test.ts convex/calendarManualBooking.test.ts convex/workflowAppointmentServices.test.ts`

Expected: all tests pass; the workflow test confirms AI booking filtering remains intact.

### Task 3: Verify and record the implementation state

**Files:**
- Modify: `CONTINUITY.md`

- [x] **Step 1: Run static and whitespace verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit && git diff --check`

Expected: both commands exit successfully.

- [x] **Step 2: Update the continuity ledger**

Record the active branch, manual-versus-AI service eligibility decision, focused test results, and production availability as UNCONFIRMED.
