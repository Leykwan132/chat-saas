# Manual Booking Schedule Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual booking slot-search flow with Calendar date/time controls and automatic single-slot availability feedback.

**Architecture:** A pure frontend model derives the selected instant and collected schedule fields. Convex exposes one exact-slot check and shares its slot resolver with final creation; the dialog runs event-driven checks and ignores stale responses.

**Tech Stack:** TypeScript, React, Convex, Vitest, shadcn/ui, date-fns

## Global Constraints

- Run every script and test under Node v22.
- Keep every code file below 300 lines.
- Use `CalendarDatePickerField` and `TimeSelectInput` rather than native date/time inputs.
- Keep Convex authentication, service ownership, required-field validation, assignment, schedule, time-off, and conflict checks strict.
- Do not add a hard override for unavailable slots.
- Add no code comments.

---

### Task 1: Manual Booking Schedule Model

**Files:**
- Create: `src/components/inbox/manualBookingScheduleModel.ts`
- Create: `src/components/inbox/manualBookingScheduleModel.test.ts`

**Interfaces:**
- Produces: `manualBookingCustomerFields(fields)` excluding `date` and `time`
- Produces: `buildManualBookingCollectedFields(fields, date, time)` with derived schedule values
- Produces: `getManualBookingSelection(serviceId, date, time, timeZone)` returning `{ key, startAt } | null`

- [x] **Step 1: Write failing pure tests**

```ts
expect(manualBookingCustomerFields([
  { key: 'date', label: 'Booking Date', type: 'date' },
  { key: 'time', label: 'Booking Time', type: 'time' },
  { key: 'name', label: 'Customer Name', type: 'text' },
])).toEqual([{ key: 'name', label: 'Customer Name', type: 'text' }]);

expect(buildManualBookingCollectedFields({ name: 'Kwan' }, '2026-07-14', '2:00 PM')).toEqual({
  name: 'Kwan',
  date: '2026-07-14',
  time: '2:00 PM',
});

expect(getManualBookingSelection('service-1', '2026-07-14', '2:00 PM', 'Asia/Kuala_Lumpur')).toEqual({
  key: 'service-1|2026-07-14|2:00 PM|Asia/Kuala_Lumpur',
  startAt: 1784008800000,
});
expect(getManualBookingSelection('service-1', '2026-07-14', '', 'Asia/Kuala_Lumpur')).toBeNull();
```

- [x] **Step 2: Run the tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/manualBookingScheduleModel.test.ts
```

Expected: FAIL because the model module does not exist.

- [x] **Step 3: Implement the pure model**

Use `combineDateTimeInTimeZone` for `startAt`, case-insensitive schedule-key filtering, and a stable selection key containing service, date, time, and time zone.

- [x] **Step 4: Run the pure tests and verify GREEN**

Run the same Vitest command. Expected: all model tests pass.

---

### Task 2: Exact-Slot Convex Availability

**Files:**
- Create: `convex/manualBookingAvailability.test.ts`
- Modify: `convex/appointmentBooking/manualBooking.ts`
- Regenerate: `convex/_generated/api.d.ts`

**Interfaces:**
- Produces: `api.appointmentBooking.manualBooking.checkAvailability({ conversationId, serviceId, startAt })`
- Returns: `{ available: true } | { available: false, message: string }`
- Produces: shared private `resolveManualBookingSlot` used by both preview checking and `create`

- [x] **Step 1: Write the failing Convex test**

Build an authenticated fixture with one active service, one available manual schedule, and a conversation assigned to the agent. Assert the exact slot is available, then insert an overlapping confirmed event and assigned participant and assert:

```ts
expect(await authed.mutation(api.appointmentBooking.manualBooking.checkAvailability, {
  conversationId,
  serviceId,
  startAt,
})).toEqual({ available: true });

expect(await authed.mutation(api.appointmentBooking.manualBooking.checkAvailability, {
  conversationId,
  serviceId,
  startAt,
})).toEqual({ available: false, message: 'That slot is no longer available.' });

await expect(authed.mutation(api.appointmentBooking.manualBooking.create, {
  conversationId,
  serviceId,
  collectedFields: { date: '2026-07-14', time: '2:00 PM' },
  startAt,
})).rejects.toThrow('That slot is no longer available.');
```

- [x] **Step 2: Run the Convex test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/manualBookingAvailability.test.ts
```

Expected: FAIL because `checkAvailability` does not exist.

- [x] **Step 3: Implement the exact-slot resolver and mutation**

Replace `listAvailableSlots` with `checkAvailability`. Validate the conversation/service scope, resolve exactly one service-duration slot through `generateSlots`, and return the strict union. Change `create` to call the same resolver before inserting records.

- [x] **Step 4: Regenerate the Convex API and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/manualBookingAvailability.test.ts
```

Expected: code generation and all availability tests pass.

---

### Task 3: Calendar Controls and Inline Availability UI

**Files:**
- Create: `src/components/inbox/CreateCustomerBookingDialog.test.ts`
- Modify: `src/components/inbox/CreateCustomerBookingDialog.tsx`
- Modify: `src/components/calendar/CalendarDatePickerField.tsx`

**Interfaces:**
- Consumes: Task 1 model functions
- Consumes: `api.appointmentBooking.manualBooking.checkAvailability`
- Extends: `CalendarDatePickerField` with optional `label?: string`, defaulting to `Date`

- [x] **Step 1: Write the failing UI regression test**

Read the dialog source and assert it contains `CalendarDatePickerField`, `TimeSelectInput`, `label="Booking Date"`, `label="Booking Time"`, the three availability messages/states, and a full-width Service trigger. Assert it does not contain `Find available times`, `listAvailableSlots`, slot-grid state, `type="date"`, or `type="time"`.

- [x] **Step 2: Run the UI test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/CreateCustomerBookingDialog.test.ts
```

Expected: FAIL because the current dialog still contains the slot-search flow.

- [x] **Step 3: Implement shared labels and dialog interaction**

Add `label = 'Date'` to `CalendarDatePickerField`. In the dialog:

- render only `manualBookingCustomerFields(service.fields)`;
- render `CalendarDatePickerField` and `TimeSelectInput`;
- style `SelectTrigger` with `h-10 w-full`;
- replace slot state with `idle | checking | available | conflict`;
- use a request counter ref to ignore stale responses;
- call the check only from Service/Date/Time handlers when the selection is complete;
- render availability feedback directly beneath Booking Time;
- create with derived schedule fields and disable submission until the current selection is available.

- [x] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/inbox/manualBookingScheduleModel.test.ts src/components/calendar/CalendarEventDetailsDatePicker.test.ts src/pages/ChatsPageCustomerBookings.test.ts convex/manualBookingAvailability.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/inbox/CreateCustomerBookingDialog.tsx src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/inbox/manualBookingScheduleModel.ts src/components/inbox/manualBookingScheduleModel.test.ts src/components/calendar/CalendarDatePickerField.tsx convex/appointmentBooking/manualBooking.ts convex/manualBookingAvailability.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && git diff --check
source ~/.nvm/nvm.sh && nvm use 22 && wc -l src/components/inbox/CreateCustomerBookingDialog.tsx src/components/inbox/manualBookingScheduleModel.ts src/components/calendar/CalendarDatePickerField.tsx convex/appointmentBooking/manualBooking.ts
```

Expected: focused tests, targeted ESLint, and diff checks pass; every touched code file remains below 300 lines.

- [x] **Step 5: Update continuity and commit**

```bash
git add CONTINUITY.md convex/appointmentBooking/manualBooking.ts convex/manualBookingAvailability.test.ts convex/_generated/api.d.ts src/components/inbox/CreateCustomerBookingDialog.tsx src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/inbox/manualBookingScheduleModel.ts src/components/inbox/manualBookingScheduleModel.test.ts src/components/calendar/CalendarDatePickerField.tsx docs/superpowers/plans/2026-07-14-manual-booking-schedule-availability.md
git commit -m "Streamline manual booking availability"
```

---

### Task 4: Availability Status Icons

**Files:**
- Modify: `src/components/inbox/CreateCustomerBookingDialog.test.ts`
- Modify: `src/components/inbox/CreateCustomerBookingDialog.tsx`

**Interfaces:**
- Consumes: existing `available` and `conflict` inline availability branches
- Produces: Lucide `Check` for available status and Lucide `X` for unavailable or failed status

- [x] **Step 1: Extend the source regression test**

Require `Check` and `X` imports and require each icon immediately before its matching status text.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/CreateCustomerBookingDialog.test.ts
```

Expected: FAIL because the availability messages do not render icons.

- [x] **Step 3: Render the status icons**

Import `Check` and `X` from `lucide-react`. Render each icon with `aria-hidden="true"` inside an inline flex status message with the existing semantic text color.

- [x] **Step 4: Verify and commit**

Run the focused test, targeted ESLint, `git diff --check`, and the touched-file line-count check under Node v22, then commit the change on `main`.
