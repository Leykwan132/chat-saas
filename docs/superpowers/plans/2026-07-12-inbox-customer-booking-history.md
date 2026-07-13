# Inbox Customer Booking History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add customer-level booking history and manual booking creation to the inbox, with a clickable `Most recent` booking card above the prompt.

**Architecture:** Resolve the selected conversation to its customer and use the existing indexed customer calendar participant rows as the history source. Add focused Convex APIs for bounded history, creation options, availability, and authorized manual creation; keep history, create-dialog, row, and detail-dialog UI outside `ChatsPage.tsx`. Reuse the existing booking formatting, availability, participants, editing, completion, cancellation, and calendar detail primitives.

**Tech Stack:** React 19, TypeScript 6, Convex, Vitest with `convex-test`, shadcn Dialog/Calendar/Select/Button, Tailwind CSS, date-fns.

## Global Constraints

- Run every script and test with Node.js 22 selected in the same shell command.
- Read `convex/_generated/ai/guidelines.md` before changing Convex code.
- No code file may exceed 300 lines; split components and backend helpers by responsibility.
- Use index-backed, bounded Convex reads; the customer history limit is exactly 50.
- Include Booked, Completed, and Cancelled sessions; exclude Collecting, Confirming, and Editing sessions.
- `Most recent` means greatest scheduled `startAt`, regardless of status.
- Calendar Manage permission controls create/edit/complete/cancel mutations; Chats Read controls inbox history/detail visibility, matching the existing conversation booking card.
- Do not add dependencies or restore the inbox Message templates shortcut.
- Preserve unrelated dirty worktree changes and stage only files belonging to each task.

---

## File Structure

- Create `convex/appointmentBooking/customerBookings.ts`: authorized, bounded customer history query and response formatting.
- Create `convex/appointmentBooking/manualBooking.ts`: creation options, slot lookup, and transactional manual booking mutation.
- Create `convex/appointmentBookingCustomerHistory.test.ts`: history authorization, status, ordering, and limit coverage.
- Create `convex/appointmentBookingManualCreation.test.ts`: manual creation, participant linkage, and permission coverage.
- Modify `convex/schema.ts`: add `appointmentBookingSessions.by_calendarEventId` for direct event-to-session lookup.
- Modify `convex/appointmentBooking/access.ts`: expose conversation-scoped read/manage authorization helpers without duplicating auth logic.
- Modify `convex/appointmentBooking/calendarHelpers.ts`: accept both AI and manual booking callers through stable participant helpers.
- Create `src/components/inbox/customerBookingsModel.ts`: shared booking item types, status presentation, and most-recent selector.
- Create `src/components/inbox/InboxCustomerBookingRow.tsx`: one accessible history row.
- Create `src/components/inbox/InboxCustomerBookingsSection.tsx`: collapsible section, count, loading, empty state, and create action.
- Create `src/components/inbox/CreateCustomerBookingDialog.tsx`: manual booking form shell.
- Create `src/components/inbox/CreateCustomerBookingFields.tsx`: service-defined customer field inputs.
- Create `src/components/inbox/InboxCustomerBookingDetailsDialog.tsx`: shared details entry point for history and prompt card.
- Modify `src/components/inbox/InboxBookingDetailsCard.tsx`: clickable compact variant with `Most recent`, no compact action.
- Modify `src/components/booking/BookingDetailsPanel.tsx`: compact card button semantics and optional compact badge.
- Modify `src/pages/ChatsPage.tsx`: query customer history and compose the new focused components.
- Create `src/components/inbox/customerBookingsModel.test.ts`: ordering and status model tests.
- Create `src/components/inbox/InboxCustomerBookingsSection.test.tsx`: section behavior tests.
- Modify `src/components/inbox/InboxBookingCompactActions.test.ts`: replace the old Edit-button contract with clickable-card coverage.
- Create `src/pages/ChatsPageCustomerBookings.test.ts`: placement and page-wiring regression coverage.

### Task 1: Customer-Level Booking History API

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/appointmentBooking/access.ts`
- Create: `convex/appointmentBooking/customerBookings.ts`
- Create: `convex/appointmentBookingCustomerHistory.test.ts`

**Interfaces:**
- Produces: `api.appointmentBooking.customerBookings.listForConversation({ conversationId })`
- Produces: `CustomerBookingHistoryItem` with `bookingId`, `sessionId`, `status`, `service`, `collectedFields`, `startAt`, `endAt`, `date`, `timeRange`, `timeZone`, `teamMember`, `remarks`, and `bookingReference`.
- Produces: schema index `appointmentBookingSessions.by_calendarEventId`.

- [ ] **Step 1: Write the failing Convex history tests**

Create fixtures for two conversations belonging to one customer, a second customer's event, and sessions in every status. Assert the exact public result:

```ts
const history = await asMember.query(
  api.appointmentBooking.customerBookings.listForConversation,
  { conversationId: firstConversationId },
);

expect(history.map((item) => item.status)).toEqual([
  AppointmentBookingSessionStatus.Cancelled,
  AppointmentBookingSessionStatus.Completed,
  AppointmentBookingSessionStatus.Booked,
]);
expect(history.map((item) => item.startAt)).toEqual([3000, 2000, 1000]);
expect(history.every((item) => item.bookingReference === item.bookingId)).toBe(true);
```

Add separate tests proving another customer and another organization are excluded, Collecting/Confirming/Editing are excluded, a user without read permission receives `Forbidden`, and 55 matching rows return the latest 50.

- [ ] **Step 2: Run the history test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/appointmentBookingCustomerHistory.test.ts`

Expected: FAIL because `appointmentBooking/customerBookings` and `by_calendarEventId` do not exist.

- [ ] **Step 3: Add the event-to-session index and scoped authorization helper**

Add to `appointmentBookingSessions`:

```ts
.index("by_calendarEventId", ["calendarEventId"])
```

Expose a helper in `access.ts` that loads the conversation, verifies its organization, requires `CHATS_READ`, resolves its agent/team, and returns `{ conversation, customerId, team }`. Return `null` only when the conversation is not visible; throw `Forbidden` for missing permissions.

- [ ] **Step 4: Implement the bounded indexed history query**

Query `calendarEventParticipants.by_teamId_and_role_and_customerId_and_eventStartAt` with exact equality on team, `role: "customer"`, and customer, then `.order("desc").take(50)`. For each participant, load its event, its unique booking session through `by_calendarEventId`, its service, and assigned participant through `by_eventId`. Keep only Booked, Completed, and Cancelled sessions and format using the shared booking date/time utilities.

```ts
export const listForConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const scope = await resolveConversationBookingReadScope(ctx, args.conversationId);
    if (scope === null || scope.customerId === undefined) return [];
    const customerParticipants = await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_teamId_and_role_and_customerId_and_eventStartAt", (q) =>
        q.eq("teamId", scope.team._id)
          .eq("role", "customer")
          .eq("customerId", scope.customerId),
      )
      .order("desc")
      .take(50);
    return await formatCustomerBookingHistory(ctx, customerParticipants);
  },
});
```

- [ ] **Step 5: Run history tests and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/appointmentBookingCustomerHistory.test.ts`

Expected: all history tests PASS.

Commit only Task 1 files with message `Add customer booking history query`.

### Task 2: Authorized Manual Booking APIs

**Files:**
- Modify: `convex/appointmentBooking/access.ts`
- Modify: `convex/appointmentBooking/calendarHelpers.ts`
- Create: `convex/appointmentBooking/manualBooking.ts`
- Create: `convex/appointmentBookingManualCreation.test.ts`

**Interfaces:**
- Produces: `api.appointmentBooking.manualBooking.getCreateOptions({ conversationId })`.
- Produces: `api.appointmentBooking.manualBooking.listAvailableSlots({ conversationId, serviceId, collectedFields, rangeStartAt, rangeEndAt })`.
- Produces: `api.appointmentBooking.manualBooking.create({ conversationId, serviceId, collectedFields, startAt })` returning `{ eventId, sessionId }`.

- [ ] **Step 1: Write failing manual creation tests**

Cover Manage permission, active-service filtering, customer prefill, required fields, unavailable slots, event/session insertion, `bookingSource: "manual"`, customer and assigned participants, conversation linkage, and round-robin bookkeeping. Assert a second booking for the same customer succeeds even when an older Booked session exists.

```ts
const created = await manager.mutation(api.appointmentBooking.manualBooking.create, {
  conversationId,
  serviceId,
  collectedFields: { name: "Aisha", phone: "+60123456789" },
  startAt: availableStartAt,
});
const history = await manager.query(
  api.appointmentBooking.customerBookings.listForConversation,
  { conversationId },
);
expect(history[0]?.bookingId).toBe(created.eventId);
expect(history).toHaveLength(2);
```

- [ ] **Step 2: Run manual creation tests and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/appointmentBookingManualCreation.test.ts`

Expected: FAIL because the public manual booking APIs do not exist.

- [ ] **Step 3: Implement creation options and availability**

`getCreateOptions` requires Manage permission, returns active workflow-allowed services with their fields/time zone, and prefills `name`, `email`, and `phone` from the selected customer. `listAvailableSlots` validates required fields and delegates to `generateSlots` with an exact maximum of 20 slots for the requested range.

Return discriminated results:

```ts
type SlotResult =
  | { success: true; slots: BookingSlot[] }
  | { success: false; message: string; missingFields?: string[] };
```

- [ ] **Step 4: Implement transactional manual creation**

Recheck service ownership, active state, required fields, and the selected slot inside the mutation. Resolve the assigned user from the regenerated slot, create the calendar event and participants, then insert a new Booked session rather than reusing `getOrCreateSession`.

```ts
const sessionId = await ctx.db.insert("appointmentBookingSessions", {
  conversationId: conversation._id,
  agentId: agent._id,
  serviceId: service._id,
  status: AppointmentBookingSessionStatus.Booked,
  collectedFields,
  selectedSlot,
  calendarEventId: eventId,
  createdAt: now,
  updatedAt: now,
});
```

Use `insertCalendarParticipants`, set `bookingSource: "manual"`, patch conversation status to `booked`, log `event_booked` with the authenticated human actor, and update round-robin state when applicable.

- [ ] **Step 5: Run backend booking suites and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/appointmentBookingManualCreation.test.ts convex/appointmentBookingCustomerHistory.test.ts convex/appointmentBookingComplete.test.ts`

Expected: all listed tests PASS.

Commit Task 2 files with message `Add manual customer booking APIs`.

### Task 3: Booking History View Model and Rows

**Files:**
- Create: `src/components/inbox/customerBookingsModel.ts`
- Create: `src/components/inbox/customerBookingsModel.test.ts`
- Create: `src/components/inbox/InboxCustomerBookingRow.tsx`
- Create: `src/components/inbox/InboxCustomerBookingsSection.tsx`
- Create: `src/components/inbox/InboxCustomerBookingsSection.test.tsx`

**Interfaces:**
- Produces: `getMostRecentCustomerBooking(items)` returning the greatest `startAt` item or `null`.
- Produces: `InboxCustomerBookingsSection({ bookings, loading, open, onOpenChange, canManage, onCreate, onSelect })`.

- [ ] **Step 1: Write failing model and section tests**

Test that `getMostRecentCustomerBooking` chooses greatest `startAt` regardless of array order/status. Render the section with React DOM and assert header count, collapse behavior, all three status labels, row button names, empty copy, loading skeleton, and Create booking visibility only when `canManage` is true.

```ts
expect(getMostRecentCustomerBooking([
  booking({ startAt: 10, status: "booked" }),
  booking({ startAt: 30, status: "cancelled" }),
  booking({ startAt: 20, status: "completed" }),
])?.startAt).toBe(30);
```

- [ ] **Step 2: Run frontend model/section tests and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/customerBookingsModel.test.ts src/components/inbox/InboxCustomerBookingsSection.test.tsx`

Expected: FAIL because the model and components do not exist.

- [ ] **Step 3: Implement the model and accessible row**

Define a frontend type matching the Convex result. Map statuses to neutral/green/gray/red badge styles. Render each row as a native `button` with title, localized date/time, optional team member, status, and `aria-label={`View ${title} booking details`}`.

- [ ] **Step 4: Implement the collapsible section**

Follow the existing Customer details header pattern. Place a full-width Create booking button before rows, render `No bookings yet` only after loading resolves, and retain Create booking in the empty state. Keep the file below 300 lines by delegating rows and status formatting.

- [ ] **Step 5: Run UI tests and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/customerBookingsModel.test.ts src/components/inbox/InboxCustomerBookingsSection.test.tsx`

Expected: all listed tests PASS.

Commit Task 3 files with message `Add inbox customer booking history section`.

### Task 4: Create Customer Booking Dialog

**Files:**
- Create: `src/components/inbox/CreateCustomerBookingDialog.tsx`
- Create: `src/components/inbox/CreateCustomerBookingFields.tsx`
- Create: `src/components/inbox/CreateCustomerBookingDialog.test.tsx`
- Reuse: `src/components/calendar/CalendarDatePickerField.tsx`

**Interfaces:**
- Consumes: Task 2 manual booking APIs.
- Produces: `CreateCustomerBookingDialog({ open, onOpenChange, conversationId, onCreated })`.

- [ ] **Step 1: Write the failing dialog tests**

Assert customer prefill, service selection, shared Calendar date picker use, required dynamic fields, slot loading, selected slot, disabled submit without a slot, successful `onCreated(eventId)`, error preservation, and no-services copy `No active Services are configured.`.

- [ ] **Step 2: Run the dialog test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/CreateCustomerBookingDialog.test.tsx`

Expected: FAIL because the dialog does not exist.

- [ ] **Step 3: Implement service fields and form state**

Render supported service field types from existing `appointmentServiceFieldValidator` metadata. Initialize known keys from `getCreateOptions.customer`. Reset service-specific non-customer values when service changes, but preserve name/email/phone.

- [ ] **Step 4: Implement availability and creation flow**

Use `CalendarDatePickerField`, request slots for the selected local day, render slot buttons with assigned teammate labels, and call `create`. Keep the dialog open and entered values intact on error. On success, toast `Booking created`, call `onCreated(eventId)`, close, and reset only after the close completes.

- [ ] **Step 5: Run dialog tests and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/CreateCustomerBookingDialog.test.tsx src/components/calendar/CalendarEventDetailsDatePicker.test.ts`

Expected: all listed tests PASS.

Commit Task 4 files with message `Add inbox create booking dialog`.

### Task 5: Shared Details and Clickable Most Recent Card

**Files:**
- Create: `src/components/inbox/InboxCustomerBookingDetailsDialog.tsx`
- Modify: `src/components/inbox/InboxBookingDetailsCard.tsx`
- Modify: `src/components/booking/BookingDetailsPanel.tsx`
- Modify: `src/components/inbox/InboxBookingCompactActions.test.ts`
- Create: `src/components/inbox/InboxCustomerBookingDetailsDialog.test.tsx`

**Interfaces:**
- Consumes: a complete customer history item from Task 1.
- Produces: `InboxCustomerBookingDetailsDialog({ booking, open, onOpenChange, canManage, agentId })`.
- Produces: compact `InboxBookingDetailsCard` props `label="Most recent"` and `onOpenDetails` with no compact actions.

- [ ] **Step 1: Replace the compact Edit contract with failing interaction tests**

Assert compact source/rendering contains `Most recent`, contains no `onEditBooking` or `Edit booking`, exposes native button semantics, and invokes `onOpenDetails` for click and keyboard activation. Assert the detail dialog retains edit and Booked-only completion actions and displays the booking reference read-only.

- [ ] **Step 2: Run focused details tests and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/InboxBookingCompactActions.test.ts src/components/inbox/InboxCustomerBookingDetailsDialog.test.tsx`

Expected: FAIL against the current compact Edit action and missing shared dialog.

- [ ] **Step 3: Implement clickable compact presentation**

Render the compact panel through a native `button type="button"` or a button wrapper with `w-full text-left`, visible `focus-visible:ring-2`, and `aria-label="View most recent booking details"`. Keep the icon/title/schedule one-row layout, add the compact `Most recent` badge, and pass no `BookingDetailsActionsBar` to compact mode.

- [ ] **Step 4: Implement shared details dialog**

Compose the existing expanded `InboxBookingDetailsCard` content inside a shadcn Dialog. Gate completion to `status === "booked"`; keep Completed and Cancelled read-only except for currently valid existing edit/cancel behavior. On a missing booking result, close and toast `Booking is no longer available`.

- [ ] **Step 5: Run details tests and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/InboxBookingCompactActions.test.ts src/components/inbox/InboxCustomerBookingDetailsDialog.test.tsx src/components/calendar/CalendarBookingReferenceVisibility.test.ts`

Expected: all listed tests PASS.

Commit Task 5 files with message `Make recent inbox booking open shared details`.

### Task 6: Integrate Customer Bookings Into ChatsPage

**Files:**
- Modify: `src/pages/ChatsPage.tsx`
- Create: `src/pages/ChatsPageCustomerBookings.test.ts`
- Modify: `src/pages/ChatsPageHeaderActions.test.ts`

**Interfaces:**
- Consumes: Tasks 1–5 components and APIs.
- Produces: Bookings directly below Customer details and one prompt-area Most recent card.

- [ ] **Step 1: Write the failing page wiring test**

Slice or render the details-panel source and assert `InboxCustomerBookingsSection` occurs after the Customer details block and before Tags, the old expanded standalone `conversationBooking` details block is absent, the prompt area uses `mostRecentBooking`, and Create/detail dialog state is wired once.

- [ ] **Step 2: Run the page test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ChatsPageCustomerBookings.test.ts src/pages/ChatsPageHeaderActions.test.ts`

Expected: FAIL because the customer history section and dialog wiring are absent.

- [ ] **Step 3: Add query and focused page state**

Replace `getCurrentBookingForConversation` for prompt display with `customerBookings.listForConversation`. Derive `mostRecentBooking` through the pure model helper. Add only `bookingsOpen`, `createBookingOpen`, and `selectedBookingId` page state; derive selected booking from the reactive result.

- [ ] **Step 4: Compose the details and prompt surfaces**

Insert `InboxCustomerBookingsSection` immediately after Customer details. Render the compact card only for `mostRecentBooking`. Route both row and card selection into `InboxCustomerBookingDetailsDialog`. Route Create booking into `CreateCustomerBookingDialog`. Remove the old details-panel-only booking card and compact Edit callback.

- [ ] **Step 5: Run page and adjacent booking tests and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ChatsPageCustomerBookings.test.ts src/pages/ChatsPageHeaderActions.test.ts src/components/inbox/InboxBookingCompactActions.test.ts src/components/inbox/InboxCustomerBookingsSection.test.tsx`

Expected: all listed tests PASS.

Commit Task 6 files with message `Integrate customer bookings into inbox`.

### Task 7: Code Generation and Final Verification

**Files:**
- Modify generated output only through Convex code generation: `convex/_generated/api.d.ts`
- Update: `CONTINUITY.md`

**Interfaces:**
- Verifies all prior task interfaces together.

- [ ] **Step 1: Generate Convex API types**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen`

Expected: exit 0 and generated references for `customerBookings` and `manualBooking`.

- [ ] **Step 2: Run focused backend and frontend suites**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/appointmentBookingCustomerHistory.test.ts convex/appointmentBookingManualCreation.test.ts convex/appointmentBookingComplete.test.ts src/components/inbox/customerBookingsModel.test.ts src/components/inbox/InboxCustomerBookingsSection.test.tsx src/components/inbox/CreateCustomerBookingDialog.test.tsx src/components/inbox/InboxCustomerBookingDetailsDialog.test.tsx src/components/inbox/InboxBookingCompactActions.test.ts src/pages/ChatsPageCustomerBookings.test.ts src/pages/ChatsPageHeaderActions.test.ts`

Expected: all listed tests PASS with zero failures.

- [ ] **Step 3: Run type checking and targeted lint**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b --pretty false`

Expected: exit 0.

Run targeted ESLint over every newly created or modified non-generated TypeScript/TSX file in this plan.

Expected: exit 0. If legacy `ChatsPage.tsx` reports pre-existing findings, record the exact unchanged findings and prove all new focused files are clean.

- [ ] **Step 4: Check formatting, stale UI, and file lengths**

Run `git diff --check` over all plan files. Search the compact branch for `Edit booking` and verify it is absent. Run `wc -l` on every touched code file and split any file above 300 lines before proceeding.

Expected: no whitespace errors, no compact Edit action, and every code file at or below 300 lines.

- [ ] **Step 5: Run the repository suite and document unrelated failures**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run`

Expected: new booking-history suites pass. If the known unrelated entitlement, aggregate registration, stale credit expectation, or WhatsApp follow-up failures remain, report their exact fresh output without attributing them to this feature.

- [ ] **Step 6: Update continuity and commit verification state**

Record the implemented decision, tests, codegen, typecheck, lint, LOC, and full-suite result in `CONTINUITY.md`. Commit only feature files with message `Add inbox customer booking history`.
