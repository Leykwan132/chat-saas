# Manual Booking Nearest Slot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prefill Inbox Create booking with the first valid 30-minute slot at or after the current time.

**Architecture:** The Inbox backend will expose a mutation that resolves the selected service and returns the earliest valid interval using the existing availability engine. The shared controller will optionally request that interval and turn it into the service-local date/start/end form state, then retain its existing availability recheck and transactional create validation.

**Tech Stack:** React 19, TypeScript, Convex, Vitest, convex-test, spacetime.

## Global Constraints

- Use Node v22 for all tests and scripts.
- The default begins immediately at the first valid 30-minute boundary; no lead-time delay applies.
- Chronological proximity overrides service preferred-time ordering.
- Preserve manual time selection, existing availability rechecks, and transactional create validation.
- Do not change the Calendar New Booking flow because it has no customer selected when opened.
- Keep code files below 300 lines and do not add comments.

---

### Task 1: Resolve the earliest Inbox slot on the server

**Files:**
- Modify: `convex/appointmentBooking/availability.ts`
- Modify: `convex/appointmentBooking/manualBooking.ts`
- Test: `convex/manualBookingAvailability.test.ts`

**Interfaces:**
- Consumes: `generateSlots(ctx, { service, conversation, teamId, rangeStartAt, rangeEndAt, limit })`.
- Produces: `api.appointmentBooking.manualBooking.getNextAvailableSlot({ conversationId, serviceId }): Promise<{ startAt: number; endAt: number } | null>`.

- [ ] **Step 1: Write the failing server regression**

```ts
const beforeRequestAt = Date.now();
const slot = await authed.mutation(
  api.appointmentBooking.manualBooking.getNextAvailableSlot,
  { conversationId: fixture.conversationId, serviceId: fixture.serviceId },
);

expect(slot).not.toBeNull();
expect(slot!.startAt).toBeGreaterThanOrEqual(beforeRequestAt);
expect(slot!.startAt - beforeRequestAt).toBeLessThan(31 * 60 * 1000);
expect(slot!.endAt - slot!.startAt).toBe(30 * 60 * 1000);
```

Set the service `preferredTimeMinutes` to a time at least two hours after the request, so the test fails if preferred-time sorting is applied to the nearest-slot lookup.

- [ ] **Step 2: Run the focused server test and verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/manualBookingAvailability.test.ts`

Expected: FAIL because `getNextAvailableSlot` is not registered.

- [ ] **Step 3: Add chronological slot selection and the Inbox mutation**

```ts
export async function generateSlots(ctx, args: {
  service: Doc<"appointmentServices">;
  conversation?: Doc<"conversations">;
  teamId: Id<"teams">;
  rangeStartAt: number;
  rangeEndAt: number;
  limit: number;
  prioritizePreferredTimes?: boolean;
}) {
  const orderedSlots = args.prioritizePreferredTimes === false
    ? slots
    : sortSlotsWithPreferredTime(slots, args.service);
  return orderedSlots.slice(0, args.limit);
}

export const getNextAvailableSlot = mutation({
  args: { conversationId: v.id("conversations"), serviceId: v.id("appointmentServices") },
  returns: v.union(v.object({ startAt: v.number(), endAt: v.number() }), v.null()),
  handler: async (ctx, args) => {
    const { conversation, agent, team } = await loadManualBookingScope(ctx, args.conversationId);
    const service = await loadService(ctx, args.serviceId);
    if (service.agentId !== agent._id || !service.isActive) throw new Error("Selected service is not available");
    const now = Date.now();
    const [slot] = await generateSlots(ctx, {
      service, conversation, teamId: team._id, rangeStartAt: now,
      rangeEndAt: now + 14 * 24 * 60 * 60 * 1000, limit: 1,
      prioritizePreferredTimes: false,
    });
    return slot ? { startAt: slot.startAt, endAt: slot.endAt } : null;
  },
});
```

- [ ] **Step 4: Run the focused server test and verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/manualBookingAvailability.test.ts`

Expected: PASS; the returned interval starts at the first immediate 30-minute boundary and has the service duration.

- [ ] **Step 5: Commit the server change**

```bash
git add convex/appointmentBooking/availability.ts convex/appointmentBooking/manualBooking.ts convex/manualBookingAvailability.test.ts
git commit -m "Prefill the next valid manual booking slot"
```

### Task 2: Fill Inbox Create booking from the nearest slot

**Files:**
- Modify: `src/components/inbox/manualBookingScheduleModel.ts`
- Modify: `src/components/inbox/manualBookingScheduleModel.test.ts`
- Modify: `src/components/booking/bookingDialogTypes.ts`
- Modify: `src/components/booking/useCreateBookingController.ts`
- Modify: `src/components/booking/CreateBookingDialog.tsx`
- Modify: `src/components/inbox/CreateCustomerBookingDialog.tsx`

**Interfaces:**
- Consumes: `getNextAvailableSlot({ conversationId, serviceId })` from Task 1.
- Produces: `manualBookingScheduleFromSlot({ startAt, endAt }, timeZone): { date: string; startTime: string; endTime: string }` and an optional `loadNearestSlot(serviceId)` controller dependency.

- [ ] **Step 1: Write the failing schedule conversion regression**

```ts
expect(manualBookingScheduleFromSlot(
  { startAt: Date.UTC(2026, 6, 14, 1, 30), endAt: Date.UTC(2026, 6, 14, 2, 15) },
  "Asia/Kuala_Lumpur",
)).toEqual({ date: "2026-07-14", startTime: "9:30am", endTime: "10:15am" });
```

- [ ] **Step 2: Run the focused schedule-model test and verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/manualBookingScheduleModel.test.ts`

Expected: FAIL because `manualBookingScheduleFromSlot` is not exported.

- [ ] **Step 3: Add the pure conversion and optional controller loader**

```ts
export function manualBookingScheduleFromSlot(slot, timeZone) {
  return {
    date: dateKeyInTimeZone(slot.startAt, timeZone),
    startTime: formatTimestampInTimeZone(slot.startAt, timeZone, { hour: "numeric", minute: "2-digit", hour12: true }).replaceAll(" ", "").toLowerCase(),
    endTime: formatTimestampInTimeZone(slot.endAt, timeZone, { hour: "numeric", minute: "2-digit", hour12: true }).replaceAll(" ", "").toLowerCase(),
  };
}
```

Use an effect in `useCreateBookingController` that waits for a service and `loadNearestSlot`, rejects stale results with the existing request counter, fills date/start/end from the returned slot, and calls the existing `runAvailabilityCheck`. Pass the loader only from `CreateCustomerBookingDialog`; `CalendarCreateBookingDialog` remains unchanged.

- [ ] **Step 4: Run the focused model and booking tests and verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/manualBookingScheduleModel.test.ts src/components/booking/CreateBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts`

Expected: PASS; returned slot timestamps format correctly in the service time zone and the Inbox dialog wires its nearest-slot loader.

- [ ] **Step 5: Commit the client change**

```bash
git add src/components/inbox/manualBookingScheduleModel.ts src/components/inbox/manualBookingScheduleModel.test.ts src/components/booking/bookingDialogTypes.ts src/components/booking/useCreateBookingController.ts src/components/booking/CreateBookingDialog.tsx src/components/inbox/CreateCustomerBookingDialog.tsx
git commit -m "Prefill inbox booking times from availability"
```

### Task 3: Verify the completed booking flow

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: server mutation and Inbox controller defaulting from Tasks 1 and 2.
- Produces: verified implementation receipt with no customer-facing changelog entry until production availability is confirmed.

- [ ] **Step 1: Run the complete focused regression set**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/manualBookingAvailability.test.ts convex/calendarManualBooking.test.ts src/components/inbox/manualBookingScheduleModel.test.ts src/components/booking/CreateBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts`

Expected: PASS.

- [ ] **Step 2: Run TypeScript and diff validation**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit && git diff --check`

Expected: PASS.

- [ ] **Step 3: Record the verified state**

```md
- 2026-08-13 [TOOL] Focused manual-booking availability and UI regression tests passed under Node v22.
- 2026-08-13 [CODE] Inbox Create booking now preselects the next valid 30-minute slot; production availability is UNCONFIRMED.
```

- [ ] **Step 4: Commit the verification record**

```bash
git add CONTINUITY.md
git commit -m "Document manual booking slot prefill verification"
```
