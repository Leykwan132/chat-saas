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

