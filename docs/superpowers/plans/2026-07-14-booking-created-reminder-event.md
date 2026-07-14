# Shared Staff Booking and Booking Created Reminder Event Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route Calendar and Inbox staff bookings through one shared creation function, then route successful staff and AI bookings through one shared `Booking created` event that prepares reminder Workpool scheduling.

**Architecture:** Keep Calendar, Inbox, and AI entrypoints responsible for their distinct authorization, input resolution, and availability checks. Add `createStaffBooking` for shared staff persistence and optional Inbox bookkeeping, and add `handleBookingCreated` as the single post-create event that delegates to the existing reminder runtime.

**Tech Stack:** TypeScript, Convex mutations, `@convex-dev/workpool`, Vitest, `convex-test`.

## Global Constraints

- Use Node.js v22 for every test or script command.
- Keep every code file below 300 lines.
- Do not add code comments.
- Do not add a console-log assertion test.
- Do not add a generic event bus, event table, queue, schema field, or dependency.
- Calendar may reuse an eligible existing conversation for reminder delivery but must not create or mutate an Inbox conversation.
- Reminder eligibility, timing, deduplication, Workpool enqueue, retry, and sending behavior remain unchanged.
- Preserve unrelated changes in `convex/leadRouting/schedules.ts` and `convex/leadRoutingSchedules.test.ts`.

---

### Task 1: Define and lock the shared booking boundaries

**Files:**
- Create: `convex/bookingCreatedEvent.test.ts`
- Create: `convex/appointmentBooking/bookingEvents.ts`

**Interfaces:**
- Produces: `handleBookingCreated(ctx: MutationCtx, appointmentId: Id<'calendarEvents'>): Promise<number>`.
- Consumes: `scheduleWorkflowRemindersForAppointment(ctx, appointmentId)`.

- [ ] **Step 1: Write the failing shared-boundary contract test**

Create `convex/bookingCreatedEvent.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('the Booking created event delegates reminder preparation', () => {
  const events = source('./appointmentBooking/bookingEvents.ts');

  expect(events).toContain('scheduleWorkflowRemindersForAppointment(ctx, appointmentId)');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/bookingCreatedEvent.test.ts
```

Expected: FAIL because `bookingEvents.ts` does not exist.

- [ ] **Step 3: Implement the shared Booking created event**

Create `convex/appointmentBooking/bookingEvents.ts`:

```ts
import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { scheduleWorkflowRemindersForAppointment } from '../workflowReminderRuntime';

export async function handleBookingCreated(
  ctx: MutationCtx,
  appointmentId: Id<'calendarEvents'>,
) {
  console.log('booking_created', { appointmentId });
  return await scheduleWorkflowRemindersForAppointment(ctx, appointmentId);
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Step 2 command.

Expected: PASS.

- [ ] **Step 5: Commit the event boundary and contract**

```bash
git add convex/bookingCreatedEvent.test.ts convex/appointmentBooking/bookingEvents.ts
git commit -m "Add shared booking created event"
```

---

### Task 2: Share staff booking creation between Calendar and Inbox

**Files:**
- Create: `convex/appointmentBooking/staffBooking.ts`
- Modify: `convex/appointmentBooking/calendarManualBooking.ts`
- Modify: `convex/appointmentBooking/manualBooking.ts`
- Test: `convex/bookingCreatedEvent.test.ts`
- Test: `convex/calendarManualBooking.test.ts`
- Test: `convex/manualBookingAvailability.test.ts`

**Interfaces:**
- Consumes: `handleBookingCreated(ctx, eventId)` from Task 1.
- Produces: `createStaffBooking(ctx: MutationCtx, args: StaffBookingInput): Promise<ManualBookingRecordIds>`.
- Preserves: Calendar `recordInboxBooking: false`; Inbox `recordInboxBooking: true`.

- [ ] **Step 1: Extend the contract test for shared staff creation**

Add this test to `convex/bookingCreatedEvent.test.ts`:

```ts
test('Calendar and Inbox use the same staff booking function', () => {
  const calendar = source('./appointmentBooking/calendarManualBooking.ts');
  const inbox = source('./appointmentBooking/manualBooking.ts');
  const staff = source('./appointmentBooking/staffBooking.ts');

  expect(calendar).toContain('createStaffBooking(ctx,');
  expect(inbox).toContain('createStaffBooking(ctx,');
  expect(staff).toContain('handleBookingCreated(ctx, eventId)');
  expect(calendar).not.toContain('scheduleWorkflowRemindersForAppointment');
  expect(inbox).not.toContain('scheduleWorkflowRemindersForAppointment');
});
```

- [ ] **Step 2: Run the contract test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/bookingCreatedEvent.test.ts
```

Expected: FAIL because `staffBooking.ts` does not exist and both staff entrypoints still bypass `createStaffBooking`.

- [ ] **Step 3: Create the shared staff-booking service**

Create `convex/appointmentBooking/staffBooking.ts`:

```ts
import type { Doc } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { logConversationEvent } from '../conversationLogs';
import { handleBookingCreated } from './bookingEvents';
import { bookingDisplayName } from './fields';
import {
  createManualBookingRecords,
  type ManualBookingRecordIds,
} from './manualBookingCore';
import type { BookingSlot, CollectedFields } from './types';

type StaffBookingInput = {
  service: Doc<'appointmentServices'>;
  team: Doc<'teams'>;
  customer: Doc<'customers'>;
  conversation?: Doc<'conversations'>;
  assignedUser: Doc<'users'>;
  selectedSlot: BookingSlot;
  collectedFields: CollectedFields;
  remarks?: string;
  recordInboxBooking: boolean;
};

export async function createStaffBooking(
  ctx: MutationCtx,
  args: StaffBookingInput,
): Promise<ManualBookingRecordIds> {
  const { eventId, sessionId } = await createManualBookingRecords(ctx, {
    service: args.service,
    team: args.team,
    customer: args.customer,
    conversation: args.conversation,
    assignedUser: args.assignedUser,
    selectedSlot: args.selectedSlot,
    collectedFields: args.collectedFields,
    remarks: args.remarks,
    bookingSource: 'manual',
  });
  if (args.recordInboxBooking) {
    if (!args.conversation) {
      throw new Error('Inbox staff booking requires a conversation');
    }
    const attendeeName = bookingDisplayName(args.collectedFields);
    await ctx.db.patch(args.conversation._id, {
      status: 'booked',
      updatedAt: Date.now(),
    });
    await logConversationEvent(ctx, {
      conversationId: args.conversation._id,
      action: 'event_booked',
      metadata: {
        eventId,
        eventTitle: `${args.service.name} - ${attendeeName}`,
        startAt: args.selectedSlot.startAt,
      },
    });
  }
  await handleBookingCreated(ctx, eventId);
  return { eventId, sessionId };
}
```

- [ ] **Step 4: Migrate Calendar staff booking to `createStaffBooking`**

In `convex/appointmentBooking/calendarManualBooking.ts`, replace imports of `createManualBookingRecords` and `scheduleWorkflowRemindersForAppointment` with:

```ts
import { validateManualBookingInterval } from './manualBookingCore';
import { createStaffBooking } from './staffBooking';
```

Replace the final creation block with:

```ts
return await createStaffBooking(ctx, {
  service,
  team: scope.team,
  customer: scope.customer,
  conversation: scope.conversation,
  assignedUser,
  selectedSlot,
  collectedFields,
  remarks: args.remarks,
  recordInboxBooking: false,
});
```

This removes the Calendar-only `workflow_reminder_scheduling_after_booking_created` log and direct scheduler call.

- [ ] **Step 5: Migrate Inbox staff booking to `createStaffBooking`**

In `convex/appointmentBooking/manualBooking.ts`, remove imports of `logConversationEvent`, `bookingDisplayName`, `createManualBookingRecords`, and `scheduleWorkflowRemindersForAppointment`. Keep `validateManualBookingInterval` and add:

```ts
import { createStaffBooking } from './staffBooking';
```

Replace the creation, conversation patch, conversation log, and scheduler block with:

```ts
return await createStaffBooking(ctx, {
  service,
  team,
  customer,
  conversation,
  assignedUser,
  selectedSlot,
  collectedFields,
  remarks: args.remarks,
  recordInboxBooking: true,
});
```

- [ ] **Step 6: Run the staff-focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/bookingCreatedEvent.test.ts convex/calendarManualBooking.test.ts convex/manualBookingAvailability.test.ts
```

Expected: all three test files pass.

- [ ] **Step 7: Commit the shared staff creation path**

```bash
git add convex/bookingCreatedEvent.test.ts convex/appointmentBooking/staffBooking.ts convex/appointmentBooking/calendarManualBooking.ts convex/appointmentBooking/manualBooking.ts
git commit -m "Share staff booking creation"
```

---

### Task 3: Route AI booking through the shared event and verify end to end

**Files:**
- Modify: `convex/appointmentBooking/bookAppointment.ts`
- Modify: `CONTINUITY.md`
- Test: `convex/bookingCreatedEvent.test.ts`
- Test: `convex/appointmentBookingStatus.test.ts`
- Test: `convex/workflowReminderRuntime.test.ts`

**Interfaces:**
- Consumes: `handleBookingCreated(ctx, appointmentId)` from Task 1.
- Completes: Calendar staff, Inbox staff, and AI all trigger the same booking-created event.

- [ ] **Step 1: Extend the contract test for the AI event boundary**

Add this test to `convex/bookingCreatedEvent.test.ts`:

```ts
test('AI booking uses the shared Booking created event', () => {
  const ai = source('./appointmentBooking/bookAppointment.ts');

  expect(ai).toContain('handleBookingCreated(ctx, eventId)');
  expect(ai).not.toContain('scheduleWorkflowRemindersForAppointment');
});
```

- [ ] **Step 2: Run the contract test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/bookingCreatedEvent.test.ts
```

Expected: FAIL because the AI booking entrypoint still calls `scheduleWorkflowRemindersForAppointment` directly.

- [ ] **Step 3: Migrate the AI booking entrypoint**

In `convex/appointmentBooking/bookAppointment.ts`, replace:

```ts
import { scheduleWorkflowRemindersForAppointment } from '../workflowReminderRuntime';
```

with:

```ts
import { handleBookingCreated } from './bookingEvents';
```

Replace:

```ts
await scheduleWorkflowRemindersForAppointment(ctx, eventId);
```

with:

```ts
await handleBookingCreated(ctx, eventId);
```

- [ ] **Step 4: Run the complete focused test set and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/bookingCreatedEvent.test.ts convex/calendarManualBooking.test.ts convex/manualBookingAvailability.test.ts convex/appointmentBookingStatus.test.ts convex/workflowReminderRuntime.test.ts
```

Expected: all focused tests pass. The existing booking tests may print `booking_created`; no test asserts the console call.

- [ ] **Step 5: Run targeted lint**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/bookingCreatedEvent.test.ts convex/appointmentBooking/bookingEvents.ts convex/appointmentBooking/staffBooking.ts convex/appointmentBooking/calendarManualBooking.ts convex/appointmentBooking/manualBooking.ts convex/appointmentBooking/bookAppointment.ts
```

Expected: zero ESLint errors.

- [ ] **Step 6: Check modularity and patch integrity**

Run:

```bash
wc -l convex/appointmentBooking/bookingEvents.ts convex/appointmentBooking/staffBooking.ts convex/appointmentBooking/calendarManualBooking.ts convex/appointmentBooking/manualBooking.ts convex/appointmentBooking/bookAppointment.ts
git diff --check
```

Expected: every code file is below 300 lines and `git diff --check` exits successfully.

- [ ] **Step 7: Update continuity with verified final state**

Update `CONTINUITY.md` with:

- the completed shared `createStaffBooking` and `handleBookingCreated` architecture
- the focused test, lint, LOC, and diff-check receipts
- the final working set paths

- [ ] **Step 8: Commit the AI migration and verification record**

```bash
git add convex/appointmentBooking/bookAppointment.ts convex/bookingCreatedEvent.test.ts CONTINUITY.md
git commit -m "Route bookings through shared reminder event"
```
