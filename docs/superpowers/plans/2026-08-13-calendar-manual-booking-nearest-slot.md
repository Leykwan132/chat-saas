# Calendar Manual Booking Nearest Slot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prefill Calendar + New Booking with the earliest valid 30-minute slot, then revalidate it after customer selection.

**Architecture:** A Calendar mutation will select the first chronological slot for an authenticated agent and active service without customer context. The existing shared booking controller will receive that default immediately; when its customer prop changes, it will run the existing customer-aware availability check for the selected interval.

**Tech Stack:** React 19, TypeScript, Convex, Vitest, convex-test.

## Global Constraints

- Use Node v22 for all tests and scripts.
- Start at the next valid 30-minute boundary with no lead time.
- Chronological proximity overrides preferred service times.
- A customer-specific availability check must complete before Create booking is enabled.
- Preserve Inbox defaulting and manual schedule editing.
- Keep code files below 300 lines and do not add comments.

---

### Task 1: Return the earliest generic Calendar slot

**Files:**
- Modify: `convex/appointmentBooking/calendarManualBooking.ts`
- Test: `convex/calendarManualBooking.test.ts`

**Interfaces:**
- Consumes: `generateSlots(ctx, { service, teamId, rangeStartAt, rangeEndAt, limit, prioritizePreferredTimes: false })`.
- Produces: `api.appointmentBooking.calendarManualBooking.getNextAvailableSlot({ agentId, serviceId }): Promise<{ startAt: number; endAt: number } | null>`.

- [ ] **Step 1: Write the failing Calendar slot regression**

```ts
const beforeRequestAt = Date.now();
const slot = await authed.mutation(
  api.appointmentBooking.calendarManualBooking.getNextAvailableSlot,
  { agentId: fixture.agentId, serviceId: fixture.serviceId },
);

expect(slot).not.toBeNull();
expect(slot!.startAt).toBeGreaterThanOrEqual(beforeRequestAt);
expect(slot!.startAt - beforeRequestAt).toBeLessThan(31 * 60 * 1000);
expect(slot!.endAt - slot!.startAt).toBe(45 * 60 * 1000);
```

- [ ] **Step 2: Run the Calendar test and verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/calendarManualBooking.test.ts`

Expected: FAIL because `getNextAvailableSlot` is not registered.

- [ ] **Step 3: Implement the generic Calendar nearest-slot mutation**

```ts
export const getNextAvailableSlot = mutation({
  args: { agentId: v.id("agents"), serviceId: v.id("appointmentServices") },
  returns: v.union(v.object({ startAt: v.number(), endAt: v.number() }), v.null()),
  handler: async (ctx, args) => {
    const agent = await assertAppointmentBookingManage(ctx, args.agentId);
    const team = await resolveTeamForAgent(ctx, agent);
    const service = await loadService(ctx, args.serviceId);
    if (service.agentId !== agent._id || !service.isActive) throw new Error("Selected service is not available");
    const now = Date.now();
    const [slot] = await generateSlots(ctx, {
      service, teamId: team._id, rangeStartAt: now,
      rangeEndAt: now + 14 * 24 * 60 * 60 * 1000, limit: 1,
      prioritizePreferredTimes: false,
    });
    return slot ? { startAt: slot.startAt, endAt: slot.endAt } : null;
  },
});
```

- [ ] **Step 4: Run the Calendar test and verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/calendarManualBooking.test.ts`

Expected: PASS.

### Task 2: Prefill and revalidate in Calendar + New Booking

**Files:**
- Modify: `src/components/booking/useCreateBookingController.ts`
- Modify: `src/components/calendar/CalendarCreateBookingDialog.tsx`
- Test: `src/components/booking/CreateBookingDialog.test.ts`

**Interfaces:**
- Consumes: `loadNearestSlot(serviceId)` and existing `checkAvailability(input)` controller dependencies.
- Produces: a customer-change recheck for any prefilled ready selection and a Calendar nearest-slot loader.

- [ ] **Step 1: Write the failing wiring regression**

```ts
expect(calendarDialogSource).toContain('getNextAvailableSlot');
expect(calendarDialogSource).toContain('loadNearestSlot={(serviceId) =>');
expect(controllerSource).toContain('if (customer === previousCustomer) return;');
```

- [ ] **Step 2: Run the component test and verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/booking/CreateBookingDialog.test.ts`

Expected: FAIL because the Calendar loader and customer-change recheck are absent.

- [ ] **Step 3: Wire the mutation and recheck customer changes**

```ts
const loadNearestSlot = useMutation(api.appointmentBooking.calendarManualBooking.getNextAvailableSlot);

<CreateBookingDialog
  loadNearestSlot={(serviceId) => loadNearestSlot({ agentId, serviceId })}
  // existing properties
/>
```

Track the previous customer in the controller. When a new customer is selected and the current schedule is ready, call the existing availability checker with the current service, date, start, and end values. Keep an empty-customer transition idle.

- [ ] **Step 4: Run component tests and verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/booking/CreateBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts`

Expected: PASS.

### Task 3: Verify the Calendar default flow

**Files:**
- Modify: `CONTINUITY.md`

- [ ] **Step 1: Run focused booking verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/manualBookingAvailability.test.ts convex/calendarManualBooking.test.ts src/components/inbox/manualBookingScheduleModel.test.ts src/components/booking/CreateBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts && bunx tsc --noEmit && git diff --check`

Expected: PASS.

- [ ] **Step 2: Record the verified Calendar prefill extension**

```md
- 2026-08-13 [CODE] Calendar + New Booking now preselects a generic nearest slot and rechecks it after customer selection; production availability is UNCONFIRMED.
```
