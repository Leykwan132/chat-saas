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

