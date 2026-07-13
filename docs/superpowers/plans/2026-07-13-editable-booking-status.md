# Editable Booking Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the latest appointment booking status, open the full editor from that status, and persist Scheduled, Completed, Cancelled, or No-show with dark-green Completed presentation.

**Architecture:** Extend the shared appointment-session status contract with `no_show`, add one authoritative Convex transition mutation that synchronizes the session and calendar event, and centralize frontend status presentation. Split the oversized edit dialog into focused modules before adding the appointment-only shadcn Select so every touched code file stays under 300 lines.

**Tech Stack:** React 19, TypeScript 6, Convex, convex-test, Vitest, shadcn Select, Tailwind CSS, Bun, Node.js 22.

## Global Constraints

- Read `convex/_generated/ai/guidelines.md` before changing Convex code.
- Run every script or test through `source ~/.nvm/nvm.sh && nvm use 22` in the same shell execution.
- Follow strict RED/GREEN TDD: observe each new test fail for the intended missing behavior before implementation.
- No code file may exceed 300 lines; split by responsibility instead of compressing code.
- Do not add fallback statuses, empty catches, or comments; failures must remain visible.
- Preserve unrelated changes in the dirty worktree and stage only files intentionally included in each checkpoint.
- Use the existing shadcn Select from `src/components/ui/select.tsx`; add no dependency.

---

### Task 1: Shared booking status contract and presentation

**Files:**
- Create: `src/lib/appointmentBookingStatusPresentation.ts`
- Create: `src/lib/appointmentBookingStatusPresentation.test.ts`
- Modify: `src/lib/appointmentBookingSessionStatus.ts`
- Modify: `convex/appointmentBookingSessionStatus.ts`
- Modify: `convex/schema.ts`
- Modify: `src/components/inbox/customerBookingsModel.ts`

**Interfaces:**
- Produces: `AppointmentBookingDisplayStatus = 'booked' | 'completed' | 'cancelled' | 'no_show'`.
- Produces: `APPOINTMENT_BOOKING_STATUS_OPTIONS`, `appointmentBookingStatusLabel(status)`, and `appointmentBookingStatusClass(status)`.
- Produces: `AppointmentBookingSessionStatus.NoShow` and validator/schema support for `no_show`.

- [ ] **Step 1: Write the failing presentation test**

```ts
import { describe, expect, test } from 'vitest';
import {
  APPOINTMENT_BOOKING_STATUS_OPTIONS,
  appointmentBookingStatusClass,
  appointmentBookingStatusLabel,
} from './appointmentBookingStatusPresentation';

describe('appointment booking status presentation', () => {
  test('exposes the four approved lifecycle statuses', () => {
    expect(APPOINTMENT_BOOKING_STATUS_OPTIONS.map(({ value }) => value)).toEqual([
      'booked',
      'completed',
      'cancelled',
      'no_show',
    ]);
    expect(appointmentBookingStatusLabel('no_show')).toBe('No-show');
  });

  test('uses dark green for completed', () => {
    expect(appointmentBookingStatusClass('completed')).toContain('bg-green-800');
    expect(appointmentBookingStatusClass('completed')).toContain('text-white');
    expect(appointmentBookingStatusClass('completed')).not.toContain('zinc');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/appointmentBookingStatusPresentation.test.ts`

Expected: FAIL because `appointmentBookingStatusPresentation.ts` does not exist.

- [ ] **Step 3: Implement the shared contract and presentation**

```ts
export const APPOINTMENT_BOOKING_STATUS_OPTIONS = [
  { value: 'booked', label: 'Scheduled', className: 'bg-emerald-700 text-white' },
  { value: 'completed', label: 'Completed', className: 'bg-green-800 text-white' },
  { value: 'cancelled', label: 'Cancelled', className: 'bg-red-700 text-white' },
  { value: 'no_show', label: 'No-show', className: 'bg-amber-700 text-white' },
] as const;

export type AppointmentBookingDisplayStatus =
  (typeof APPOINTMENT_BOOKING_STATUS_OPTIONS)[number]['value'];

const PRESENTATION_BY_STATUS = Object.fromEntries(
  APPOINTMENT_BOOKING_STATUS_OPTIONS.map((option) => [option.value, option]),
) as Record<AppointmentBookingDisplayStatus, (typeof APPOINTMENT_BOOKING_STATUS_OPTIONS)[number]>;

export const appointmentBookingStatusLabel = (status: AppointmentBookingDisplayStatus) =>
  PRESENTATION_BY_STATUS[status].label;

export const appointmentBookingStatusClass = (status: AppointmentBookingDisplayStatus) =>
  PRESENTATION_BY_STATUS[status].className;
```

Add `NoShow: 'no_show'` to both session-status constants, both label/count collections, the Convex validator, and the customer-history status type. Keep internal `collecting`, `confirming`, and `editing` values unchanged.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/appointmentBookingStatusPresentation.test.ts src/components/inbox/customerBookingsModel.test.ts`

Expected: PASS.

- [ ] **Step 5: Checkpoint the contract**

Run: `git diff --check -- src/lib/appointmentBookingStatusPresentation.ts src/lib/appointmentBookingStatusPresentation.test.ts src/lib/appointmentBookingSessionStatus.ts convex/appointmentBookingSessionStatus.ts convex/schema.ts src/components/inbox/customerBookingsModel.ts`

Expected: no output. Stage only these paths if the user requests a commit.

---

### Task 2: Atomic backend status transition and history support

**Files:**
- Create: `convex/appointmentBooking/statusTransition.ts`
- Create: `convex/appointmentBookingStatusTransition.test.ts`
- Modify: `convex/appointmentBooking/customerBookings.ts`
- Modify: `convex/appointmentBookingCustomerHistory.test.ts`
- Modify: `convex/appointmentBooking/completion.ts`

**Interfaces:**
- Consumes: `AppointmentBookingSessionStatus.NoShow` from Task 1.
- Produces: `api.appointmentBooking.statusTransition.updateBookingStatus({ bookingId, status })`.
- Produces: `updateAppointmentBookingStatus(ctx, { bookingId, status, teamId })` reused by completion.

- [ ] **Step 1: Write failing transition tests**

Create a fixture matching `convex/appointmentBookingComplete.test.ts`, then assert:

```ts
await authed.mutation(api.appointmentBooking.statusTransition.updateBookingStatus, {
  bookingId: fixture.eventId,
  status: 'no_show',
});
expect((await t.run((ctx) => ctx.db.get(fixture.sessionId)))?.status).toBe('no_show');
expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.status).toBe('confirmed');

await authed.mutation(api.appointmentBooking.statusTransition.updateBookingStatus, {
  bookingId: fixture.eventId,
  status: 'cancelled',
});
expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.status).toBe('cancelled');

await authed.mutation(api.appointmentBooking.statusTransition.updateBookingStatus, {
  bookingId: fixture.eventId,
  status: 'booked',
});
expect((await t.run((ctx) => ctx.db.get(fixture.eventId)))?.status).toBe('confirmed');
```

Add a mismatched-team test that expects `Booking not found` and verifies neither row changed.

- [ ] **Step 2: Run the backend test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/appointmentBookingStatusTransition.test.ts`

Expected: FAIL because the status-transition API does not exist.

- [ ] **Step 3: Implement one authoritative transition**

```ts
export const editableBookingStatusValidator = v.union(
  v.literal(AppointmentBookingSessionStatus.Booked),
  v.literal(AppointmentBookingSessionStatus.Completed),
  v.literal(AppointmentBookingSessionStatus.Cancelled),
  v.literal(AppointmentBookingSessionStatus.NoShow),
);

const calendarStatusForBookingStatus = (
  status: EditableBookingStatus,
): 'confirmed' | 'cancelled' =>
  status === AppointmentBookingSessionStatus.Cancelled ? 'cancelled' : 'confirmed';
```

The mutation must authenticate, require `Permission.CALENDAR_MANAGE`, load the team-owned event, use `by_calendarEventId(...).unique()` for the session, then patch the session and event in the same Convex mutation with one `now`. Rework `markBookingCompleted` to call the shared helper after retaining its booked-only guard.

- [ ] **Step 4: Extend history to No-show**

Add `AppointmentBookingSessionStatus.NoShow` to `HISTORY_STATUSES`. Extend the existing history fixture to four rows and assert newest-first status output includes `no_show`.

- [ ] **Step 5: Run backend tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/appointmentBookingStatusTransition.test.ts convex/appointmentBookingComplete.test.ts convex/appointmentBookingCustomerHistory.test.ts`

Expected: PASS.

- [ ] **Step 6: Checkpoint backend work**

Run: `git diff --check -- convex/appointmentBooking/statusTransition.ts convex/appointmentBookingStatusTransition.test.ts convex/appointmentBooking/customerBookings.ts convex/appointmentBookingCustomerHistory.test.ts convex/appointmentBooking/completion.ts`

Expected: no output. Stage only these paths if the user requests a commit.

---

### Task 3: Modularize Edit Booking and add the appointment-only Status Select

**Files:**
- Create: `src/components/calendar/editBookingModel.ts`
- Create: `src/components/calendar/EditBookingForm.tsx`
- Create: `src/components/calendar/EditBookingFormSkeleton.tsx`
- Create: `src/components/calendar/EditBookingStatusField.tsx`
- Create: `src/components/calendar/EditBookingStatusField.test.ts`
- Modify: `src/components/calendar/EditBookingDialog.tsx`

**Interfaces:**
- Consumes: `AppointmentBookingDisplayStatus` and `APPOINTMENT_BOOKING_STATUS_OPTIONS` from Task 1.
- Consumes: `api.appointmentBooking.statusTransition.updateBookingStatus` from Task 2.
- Produces: `EditBookingStatusField({ value, onValueChange, disabled })`.
- Produces: `EventFormState.status?: AppointmentBookingDisplayStatus` initialized only for appointment bookings.

- [ ] **Step 1: Write the failing structural/status-field test**

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const fieldSource = readFileSync(new URL('./EditBookingStatusField.tsx', import.meta.url), 'utf8');
const dialogSource = readFileSync(new URL('./EditBookingDialog.tsx', import.meta.url), 'utf8');

test('appointment booking editor uses the shared four-state Select', () => {
  expect(fieldSource).toContain("from '@/components/ui/select'");
  expect(fieldSource).toContain('APPOINTMENT_BOOKING_STATUS_OPTIONS.map');
  expect(fieldSource).toContain('Status');
  expect(dialogSource).toContain('updateBookingStatus');
});

test('edit dialog remains a modular entrypoint', () => {
  expect(dialogSource.split('\n').length).toBeLessThanOrEqual(300);
});
```

- [ ] **Step 2: Run the UI test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/EditBookingStatusField.test.ts`

Expected: FAIL because the field does not exist and the dialog is 855 lines.

- [ ] **Step 3: Extract existing responsibilities without changing behavior**

Move pure types/parsers/date composition into `editBookingModel.ts`, loading placeholders into `EditBookingFormSkeleton.tsx`, and form markup into `EditBookingForm.tsx`. Keep `EditBookingDialog.tsx` responsible only for queries, mutations, dialog state, save/delete orchestration, and passing props. Verify each new or touched code file is at most 300 lines with `wc -l`.

- [ ] **Step 4: Add the shadcn Select**

```tsx
export function EditBookingStatusField({ value, onValueChange, disabled }: Props) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="dialog-booking-status">Status</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id="dialog-booking-status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {APPOINTMENT_BOOKING_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

Return the appointment session status from `getAppointmentDetails`, initialize it in form state, render the field only when `isEditingAppointmentBooking`, and call `updateBookingStatus` after the calendar edit succeeds only when the value changed. Do not show the field for ordinary events.

- [ ] **Step 5: Run UI tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/EditBookingStatusField.test.ts src/components/calendar/CalendarBookingReferenceVisibility.test.ts src/components/calendar/CalendarEventDetailsDatePicker.test.ts`

Expected: PASS.

- [ ] **Step 6: Verify modular file sizes**

Run: `wc -l src/components/calendar/EditBookingDialog.tsx src/components/calendar/editBookingModel.ts src/components/calendar/EditBookingForm.tsx src/components/calendar/EditBookingFormSkeleton.tsx src/components/calendar/EditBookingStatusField.tsx`

Expected: every number is 300 or lower.

---

### Task 4: Latest-booking status interaction and consistent history tags

**Files:**
- Create: `src/components/booking/BookingStatusTag.tsx`
- Create: `src/components/inbox/InboxBookingStatusInteraction.test.ts`
- Modify: `src/components/booking/BookingDetailsPanel.tsx`
- Modify: `src/components/inbox/InboxBookingDetailsCard.tsx`
- Modify: `src/components/inbox/InboxCustomerBookingRow.tsx`
- Modify: `src/pages/ChatsPage.tsx`

**Interfaces:**
- Consumes: shared label/class functions from Task 1.
- Produces: `BookingStatusTag({ status, onClick?, contextLabel? })` with display-only and interactive modes.
- Produces: compact `InboxBookingDetailsCard` status click that calls its existing `handleEditBooking`.

- [ ] **Step 1: Write the failing interaction test**

```ts
test('latest booking status opens the full editor for managers', () => {
  expect(cardSource).toContain('BookingStatusTag');
  expect(cardSource).toContain('onClick={canManage ? handleEditBooking : undefined}');
  expect(cardSource).toContain("contextLabel=\"Most recent\"");
  expect(chatsSource).toContain('can(Permission.CALENDAR_MANAGE)');
  expect(chatsSource).not.toContain("mostRecentBooking.status === 'booked'");
});

test('history and compact cards share status presentation', () => {
  expect(rowSource).toContain('BookingStatusTag');
  expect(rowSource).not.toContain('STATUS_TAG_CLASSES');
  expect(tagSource).toContain('appointmentBookingStatusClass');
});
```

- [ ] **Step 2: Run the interaction test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/InboxBookingStatusInteraction.test.ts`

Expected: FAIL because the compact card has no status tag and management is booked-only.

- [ ] **Step 3: Implement shared status tags and click behavior**

Render `Most recent` and the status in the compact panel header. Use a real `button` only when `onClick` exists; otherwise use a `span`. Stop propagation in the status button so it opens Edit rather than details. Replace row-local status maps with `BookingStatusTag` and make `canManage` depend only on Calendar Manage permission, not current status.

- [ ] **Step 4: Run focused inbox tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/InboxBookingStatusInteraction.test.ts src/components/inbox/InboxBookingCompactActions.test.ts src/components/inbox/customerBookingsModel.test.ts src/pages/ChatsPageCustomerBookings.test.ts`

Expected: PASS.

- [ ] **Step 5: Checkpoint UI work**

Run: `git diff --check -- src/components/booking/BookingStatusTag.tsx src/components/inbox/InboxBookingStatusInteraction.test.ts src/components/booking/BookingDetailsPanel.tsx src/components/inbox/InboxBookingDetailsCard.tsx src/components/inbox/InboxCustomerBookingRow.tsx src/pages/ChatsPage.tsx`

Expected: no output. Stage only these paths if the user requests a commit.

---

### Task 5: Generated API, regression verification, and continuity

**Files:**
- Modify generated output: `convex/_generated/api.d.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Confirms all earlier task interfaces compile and execute together.

- [ ] **Step 1: Regenerate Convex API types**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen`

Expected: successful code generation with `appointmentBooking/statusTransition` present in `convex/_generated/api.d.ts`.

- [ ] **Step 2: Run the complete focused regression set**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/appointmentBookingStatusPresentation.test.ts src/components/calendar/EditBookingStatusField.test.ts src/components/inbox/InboxBookingStatusInteraction.test.ts src/components/inbox/InboxBookingCompactActions.test.ts src/components/inbox/customerBookingsModel.test.ts src/pages/ChatsPageCustomerBookings.test.ts convex/appointmentBookingStatusTransition.test.ts convex/appointmentBookingComplete.test.ts convex/appointmentBookingCustomerHistory.test.ts`

Expected: PASS with no failed tests.

- [ ] **Step 3: Run proportionate static verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/lib/appointmentBookingStatusPresentation.ts src/lib/appointmentBookingStatusPresentation.test.ts src/components/calendar/editBookingModel.ts src/components/calendar/EditBookingForm.tsx src/components/calendar/EditBookingFormSkeleton.tsx src/components/calendar/EditBookingStatusField.tsx src/components/calendar/EditBookingStatusField.test.ts src/components/booking/BookingStatusTag.tsx src/components/inbox/InboxBookingStatusInteraction.test.ts convex/appointmentBooking/statusTransition.ts convex/appointmentBookingStatusTransition.test.ts`

Expected: PASS with no errors.

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b --pretty false`

Expected: PASS. This is justified because the plan changes shared schema, generated API types, and a large editor boundary.

- [ ] **Step 4: Verify formatting and line limits**

Run: `git diff --check`

Expected: no output.

Run: `wc -l src/components/calendar/EditBookingDialog.tsx src/components/calendar/editBookingModel.ts src/components/calendar/EditBookingForm.tsx src/components/calendar/EditBookingFormSkeleton.tsx src/components/calendar/EditBookingStatusField.tsx src/components/booking/BookingStatusTag.tsx convex/appointmentBooking/statusTransition.ts`

Expected: every number is 300 or lower.

- [ ] **Step 5: Update continuity with evidence**

Record the completed state, final file set, exact focused-test count, TypeScript/lint results, and any unrelated full-suite failures with timestamped `[CODE]` or `[TOOL]` provenance. Keep Snapshot, Done, Working set, and Receipts within their configured caps.

- [ ] **Step 6: Final review**

Inspect `git diff --stat`, `git diff --name-only`, and the focused diffs. Confirm no unrelated files were altered, no fallback behavior was added, all user-facing status labels match the approved copy, and Completed resolves to `bg-green-800 text-white`.
