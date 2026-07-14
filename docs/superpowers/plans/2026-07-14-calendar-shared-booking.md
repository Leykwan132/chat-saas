# Calendar Shared Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Calendar `New Booking` use the shared Inbox booking experience with searchable all-customer selection while keeping generic event creation event-only.

**Architecture:** Keep separate Inbox and Calendar public commands, then share focused booking-domain helpers for interval validation, assignee resolution, and atomic booking persistence. Extract the current Inbox dialog into small shared booking modules, add a Calendar adapter with a searchable Base UI Combobox, and preserve the generic event sheet behind the existing context-menu action.

**Tech Stack:** React 19, TypeScript, React Router, Base UI/shadcn Combobox, Convex, Vitest, date-fns, Tailwind CSS v4.

## Global Constraints

- Use Node v22 for every script or test command.
- Keep every code file below 300 lines.
- Add no comments unless a non-obvious workaround cannot be expressed through structure or naming.
- Calendar bookings never create or mutate Inbox conversations.
- `calendarEvents.create` creates only a generic event and its event participants.
- Customer search is workspace-scoped, bounded, and backed by a normalized search projection.
- Start time content aligns `start`; End time content aligns `end`.
- Work directly on `main` as authorized by the user.

---

### Task 1: Customer Search Projection and Migration

**Files:**
- Create: `convex/customerSearch.ts`
- Create: `convex/customerSearchMigration.ts`
- Create: `convex/customerSearch.test.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/customers.ts`
- Modify: `convex/customerImportPool.ts`
- Modify: `convex/appointmentBooking/calendarHelpers.ts`
- Modify: `convex/calendarEvents.ts`

**Interfaces:**
- Produces: `customerSearchText({ name, email, phone, contactAddress }): string`.
- Produces: `api.calendarEvents.searchCustomerOptions({ query, limit })` returning bounded workspace customer options.
- Produces: `internal.customerSearchMigration.backfill({ paginationOpts })` for bounded backfill batches.

- [ ] **Step 1: Write failing search projection and authorization tests**

Add tests proving name, email, phone, and contact address are normalized into one projection and that authenticated search cannot return another workspace's customer.

```ts
expect(customerSearchText({
  name: "  Jessica Lee ",
  email: "JESSICA@EXAMPLE.COM",
  phone: "+60 12-345 6789",
  contactAddress: "wa:60123456789",
})).toBe("jessica lee jessica@example.com +60 12-345 6789 wa:60123456789");

const results = await authed.query(api.calendarEvents.searchCustomerOptions, {
  query: "jessica",
  limit: 25,
});
expect(results.map((row) => row._id)).toEqual([workspaceCustomerId]);
```

- [ ] **Step 2: Run the focused tests and verify red**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/customerSearch.test.ts
```

Expected: FAIL because the helper and public search query do not exist.

- [ ] **Step 3: Add the projection, search index, bounded query, and backfill**

Create the pure helper:

```ts
export function customerSearchText(customer: {
  name?: string;
  email?: string;
  phone?: string;
  contactAddress: string;
}) {
  return [customer.name, customer.email, customer.phone, customer.contactAddress]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value))
    .join(" ");
}
```

Widen the customer table with `searchText: v.optional(v.string())` and add:

```ts
.searchIndex("search_searchText", {
  searchField: "searchText",
  filterFields: ["orgId"],
})
```

Add a bounded query:

```ts
export const searchCustomerOptions = query({
  args: { query: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    const auth = await assertCalendarAccess(ctx, Permission.CALENDAR_READ);
    const orgId = resolveChannelOrgId(auth.orgId, auth.userId);
    const limit = Math.max(1, Math.min(50, Math.floor(args.limit)));
    const customers = await ctx.db
      .query("customers")
      .withSearchIndex("search_searchText", (q) =>
        q.search("searchText", args.query.trim()).eq("orgId", orgId),
      )
      .take(limit);
    return customers.map(toCustomerOption);
  },
});
```

Add a paginated internal mutation that patches only rows whose projection differs, then schedules the next cursor with `ctx.scheduler.runAfter(0, internal.customerSearchMigration.backfill, ...)`.

Update all production paths that create customers or change name, email, phone, or contact address to write the projection in the same transaction.

- [ ] **Step 4: Run focused tests and Convex code generation**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/customerSearch.test.ts convex/calendarEvents.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && STRIPE_PRICE_STARTER_MONTHLY=mock_starter_monthly STRIPE_PRICE_STARTER_ANNUAL=mock_starter_annual STRIPE_PRICE_GROWTH_MONTHLY=mock_growth_monthly STRIPE_PRICE_GROWTH_ANNUAL=mock_growth_annual STRIPE_PRICE_BUSINESS_MONTHLY=mock_business_monthly STRIPE_PRICE_BUSINESS_ANNUAL=mock_business_annual STRIPE_PRICE_EXTRA_CREDITS_2000=mock_extra_2000 STRIPE_PRICE_EXTRA_CREDITS_5000=mock_extra_5000 STRIPE_PRICE_EXTRA_CREDITS_15000=mock_extra_15000 bunx convex codegen
```

Expected: PASS and generated API types include the search and migration modules.

- [ ] **Step 5: Commit**

```bash
git add convex/customerSearch.ts convex/customerSearchMigration.ts convex/customerSearch.test.ts convex/schema.ts convex/customers.ts convex/customerImportPool.ts convex/appointmentBooking/calendarHelpers.ts convex/calendarEvents.ts convex/_generated
git commit -m "Add searchable customer projection"
```

### Task 2: Conversation-Optional Booking Domain

**Files:**
- Create: `convex/appointmentBooking/manualBookingCore.ts`
- Create: `convex/calendarManualBooking.test.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/appointmentBooking/availability.ts`
- Modify: `convex/appointmentBooking/fields.ts`
- Modify: `convex/appointmentBooking/manualBooking.ts`
- Modify: `convex/appointmentBooking/statusTransition.ts`

**Interfaces:**
- Produces: `resolveManualBookingSlot(ctx, { service, teamId, startAt, endAt, conversationOwnerWorkosUserId? })`.
- Produces: `createManualBookingRecords(ctx, { service, team, customer, conversation?, collectedFields, selectedSlot, bookingSource })`.
- Existing Inbox public API remains source-compatible.

- [ ] **Step 1: Write failing direct-customer lifecycle tests**

Test that a booking session can be found and transitioned by `calendarEventId` without a conversation, while the Inbox path still updates its real conversation.

```ts
expect(session).toMatchObject({
  customerId,
  conversationId: undefined,
  calendarEventId: eventId,
  status: AppointmentBookingSessionStatus.Booked,
});
await expect(authed.mutation(api.appointmentBooking.statusTransition.updateBookingStatus, {
  bookingId: eventId,
  status: AppointmentBookingSessionStatus.Completed,
})).resolves.toEqual({ success: true });
```

- [ ] **Step 2: Run the lifecycle test and verify red**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/calendarManualBooking.test.ts convex/manualBookingAvailability.test.ts
```

Expected: FAIL because `appointmentBookingSessions.conversationId` is required and no calendar booking command exists.

- [ ] **Step 3: Widen the lifecycle schema and extract shared helpers**

Change booking sessions to:

```ts
appointmentBookingSessions: defineTable({
  conversationId: v.optional(v.id("conversations")),
  customerId: v.optional(v.id("customers")),
  agentId: v.id("agents"),
  serviceId: v.optional(v.id("appointmentServices")),
  status: appointmentBookingSessionStatusValidator,
  collectedFields: v.record(v.string(), appointmentCollectedValueValidator),
  proposedSlots: v.optional(v.array(appointmentBookingSlotValidator)),
  selectedSlot: v.optional(appointmentBookingSlotValidator),
  calendarEventId: v.optional(v.id("calendarEvents")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

Replace the availability helper's conversation dependency with the exact optional owner identity it needs:

```ts
conversationOwnerWorkosUserId?: string;
```

Keep the existing roster fallback when no conversation owner is supplied. Extract atomic event, participant, session, round-robin, and optional conversation behavior into `manualBookingCore.ts`. The Calendar caller passes no conversation; the Inbox caller passes its real conversation and retains status/log/reminder behavior.

- [ ] **Step 4: Run lifecycle and Inbox regression tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/calendarManualBooking.test.ts convex/manualBookingAvailability.test.ts convex/appointmentBookingStatusTransition.test.ts convex/appointmentBookingComplete.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/appointmentBooking/manualBookingCore.ts convex/appointmentBooking/availability.ts convex/appointmentBooking/fields.ts convex/appointmentBooking/manualBooking.ts convex/appointmentBooking/statusTransition.ts convex/calendarManualBooking.test.ts
git commit -m "Generalize manual booking lifecycle"
```

### Task 3: Dedicated Calendar Booking Commands

**Files:**
- Create: `convex/appointmentBooking/calendarManualBooking.ts`
- Modify: `convex/calendarManualBooking.test.ts`
- Modify: `convex/calendarEvents.ts`
- Modify: `convex/calendarEvents.test.ts`

**Interfaces:**
- Produces: `api.appointmentBooking.calendarManualBooking.getCreateOptions({ agentId })`.
- Produces: `api.appointmentBooking.calendarManualBooking.checkAvailability({ agentId, customerId, serviceId, startAt, endAt })`.
- Produces: `api.appointmentBooking.calendarManualBooking.create({ agentId, customerId, serviceId, collectedFields, startAt, endAt })`.

- [ ] **Step 1: Add failing command-separation tests**

Prove the Calendar booking mutation writes an appointment event, participants, and a customer-scoped session without conversation writes. Prove `calendarEvents.create` creates no booking session and no `event_booked` conversation log.

```ts
expect(calendarBooking).toMatchObject({
  agentId,
  appointmentServiceId: serviceId,
  bookingSource: "manual",
});
expect(conversationAfter).toEqual(conversationBefore);
expect(genericSession).toBeNull();
expect(genericEventLogs).toEqual([]);
```

- [ ] **Step 2: Run command tests and verify red**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/calendarManualBooking.test.ts convex/calendarEvents.test.ts
```

Expected: FAIL because Calendar booking commands do not exist and generic event creation still logs `event_booked`.

- [ ] **Step 3: Implement explicit Calendar commands**

Use `assertAppointmentBookingManage(ctx, agentId)`, `resolveTeamForAgent`, and the shared core. Validate that the selected customer belongs to the authenticated workspace and that the service belongs to the route agent. Resolve `customer.lastConversationId` only to obtain optional `assignedUserId`; never patch or log that conversation.

Remove `getConversationIdByCustomerId` and `logConversationEvent(...event_booked...)` from `calendarEvents.create`. Retain event insertion and participant insertion.

- [ ] **Step 4: Run command tests and codegen**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/calendarManualBooking.test.ts convex/calendarEvents.test.ts convex/manualBookingAvailability.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && STRIPE_PRICE_STARTER_MONTHLY=mock_starter_monthly STRIPE_PRICE_STARTER_ANNUAL=mock_starter_annual STRIPE_PRICE_GROWTH_MONTHLY=mock_growth_monthly STRIPE_PRICE_GROWTH_ANNUAL=mock_growth_annual STRIPE_PRICE_BUSINESS_MONTHLY=mock_business_monthly STRIPE_PRICE_BUSINESS_ANNUAL=mock_business_annual STRIPE_PRICE_EXTRA_CREDITS_2000=mock_extra_2000 STRIPE_PRICE_EXTRA_CREDITS_5000=mock_extra_5000 STRIPE_PRICE_EXTRA_CREDITS_15000=mock_extra_15000 bunx convex codegen
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add convex/appointmentBooking/calendarManualBooking.ts convex/calendarManualBooking.test.ts convex/calendarEvents.ts convex/calendarEvents.test.ts convex/_generated
git commit -m "Add dedicated Calendar booking commands"
```

### Task 4: Shared Booking Dialog and Searchable Customer Combobox

**Files:**
- Create: `src/components/booking/CreateBookingDialog.tsx`
- Create: `src/components/booking/CreateBookingFields.tsx`
- Create: `src/components/booking/BookingCustomerCombobox.tsx`
- Create: `src/components/booking/useCreateBookingController.ts`
- Create: `src/components/booking/CreateBookingDialog.test.ts`
- Modify: `src/components/inbox/CreateCustomerBookingDialog.tsx`
- Modify: `src/components/inbox/CreateCustomerBookingDialog.test.ts`

**Interfaces:**
- Produces: `CreateBookingDialog` with `context: { kind: "inbox"; conversationId } | { kind: "calendar"; agentId; initialDate }`.
- Produces: `BookingCustomerCombobox` accepting bounded recent items, typed search results, selected customer, and `onChange`.
- Existing `CreateCustomerBookingDialog` remains a thin Inbox adapter.

- [ ] **Step 1: Write failing source-structure and behavior tests**

Assert the shared dialog owns Service, schedule, customer fields, availability, and submission; the Inbox adapter contains no duplicated booking controller; and the Calendar context renders the customer Combobox.

```ts
expect(sharedSource).toContain("kind: 'calendar'");
expect(sharedSource).toContain('BookingCustomerCombobox');
expect(sharedSource).toContain('ManualBookingScheduleField');
expect(inboxSource).toContain('<CreateBookingDialog');
expect(inboxSource).not.toContain('runAvailabilityCheck');
```

- [ ] **Step 2: Run UI tests and verify red**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/booking/CreateBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts
```

Expected: FAIL because shared modules do not exist.

- [ ] **Step 3: Extract the controller and shared fields**

Move state transitions and availability-key protection into `useCreateBookingController.ts`. Keep `CreateBookingDialog.tsx` below 300 lines by composing `CreateBookingFields.tsx` and `BookingCustomerCombobox.tsx`.

The Calendar adapter uses recent customer options when the query is empty and calls `searchCustomerOptions` for non-empty input. Selection seeds `name`, `email`, and `phone`, clears stale availability, and keeps service-defined fields editable.

Use the existing Base UI components:

```tsx
<Combobox items={customers} value={selectedCustomer} onValueChange={onChange}>
  <ComboboxInput placeholder="Search customers" />
  <ComboboxContent portalContainer={portalContainer} className="min-w-(--anchor-width) rounded-xl">
    <ComboboxEmpty>No customers found.</ComboboxEmpty>
    <ComboboxList>{(customer) => <ComboboxItem value={customer}>{customerLabel(customer)}</ComboboxItem>}</ComboboxList>
  </ComboboxContent>
</Combobox>
```

- [ ] **Step 4: Run shared dialog tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/booking/CreateBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/inbox/manualBookingScheduleModel.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/booking/CreateBookingDialog.tsx src/components/booking/CreateBookingFields.tsx src/components/booking/BookingCustomerCombobox.tsx src/components/booking/useCreateBookingController.ts src/components/booking/CreateBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.tsx src/components/inbox/CreateCustomerBookingDialog.test.ts
git commit -m "Share the Create booking dialog"
```

### Task 5: Calendar Integration and Time Alignment

**Files:**
- Create: `src/components/calendar/CalendarCreateBookingDialog.tsx`
- Create: `src/components/calendar/CalendarCreateBookingDialog.test.ts`
- Modify: `src/pages/CalendarPage.tsx`
- Modify: `src/components/EditableTimeCombobox.tsx`
- Modify: `src/components/EditableTimeCombobox.test.ts`
- Modify: `src/components/inbox/ManualBookingScheduleField.tsx`
- Modify: `src/components/inbox/ManualBookingScheduleField.test.ts`

**Interfaces:**
- Produces: Calendar sidebar `New Booking` action opening `CalendarCreateBookingDialog` with `initialDate`.
- Preserves: context-menu `Create event` opening the generic sheet.
- Produces: `EditableTimeCombobox.contentAlign?: "start" | "end"`.

- [ ] **Step 1: Write failing Calendar wiring and alignment tests**

```ts
expect(calendarSource).toContain('New Booking');
expect(calendarSource).toContain('CalendarCreateBookingDialog');
expect(calendarSource).toContain('openCreateEventSheet');
expect(calendarSource).toContain('Create event');
expect(scheduleSource).toContain('contentAlign="start"');
expect(scheduleSource).toContain('contentAlign="end"');
```

- [ ] **Step 2: Run focused tests and verify red**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarCreateBookingDialog.test.ts src/components/EditableTimeCombobox.test.ts src/components/inbox/ManualBookingScheduleField.test.ts
```

Expected: FAIL because Calendar is not wired and alignment is not configurable.

- [ ] **Step 3: Wire Calendar booking separately from generic events**

Rename the generic sheet opener to `openCreateEventSheet`. Add separate `createBookingOpen` state and selected-day initial date. The sidebar button opens the booking dialog; the day-cell context menu continues to call `openCreateEventSheet(day)`.

Pass alignment through the shared time Combobox:

```tsx
<ComboboxContent
  portalContainer={portalContainer}
  align={contentAlign}
  className="min-w-44 rounded-xl"
>
```

- [ ] **Step 4: Run focused UI tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarCreateBookingDialog.test.ts src/components/booking/CreateBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/EditableTimeCombobox.test.ts src/components/inbox/ManualBookingScheduleField.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/CalendarCreateBookingDialog.tsx src/components/calendar/CalendarCreateBookingDialog.test.ts src/pages/CalendarPage.tsx src/components/EditableTimeCombobox.tsx src/components/EditableTimeCombobox.test.ts src/components/inbox/ManualBookingScheduleField.tsx src/components/inbox/ManualBookingScheduleField.test.ts
git commit -m "Open shared bookings from Calendar"
```

### Task 6: Integrated Verification and Continuity

**Files:**
- Modify: `CONTINUITY.md`
- Modify only if verification exposes defects: files from Tasks 1–5.

**Interfaces:**
- Consumes all preceding task interfaces.
- Produces a verified `main` worktree with no code file above 300 lines among touched files.

- [ ] **Step 1: Run the complete focused suite**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/customerSearch.test.ts convex/calendarManualBooking.test.ts convex/calendarEvents.test.ts convex/manualBookingAvailability.test.ts convex/appointmentBookingStatusTransition.test.ts convex/appointmentBookingComplete.test.ts src/components/booking/CreateBookingDialog.test.ts src/components/calendar/CalendarCreateBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/EditableTimeCombobox.test.ts src/components/inbox/ManualBookingScheduleField.test.ts src/components/inbox/manualBookingScheduleModel.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run targeted lint**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/customerSearch.ts convex/customerSearchMigration.ts convex/appointmentBooking/manualBookingCore.ts convex/appointmentBooking/calendarManualBooking.ts convex/appointmentBooking/manualBooking.ts convex/appointmentBooking/availability.ts convex/calendarEvents.ts src/components/booking src/components/calendar/CalendarCreateBookingDialog.tsx src/components/inbox/CreateCustomerBookingDialog.tsx src/components/inbox/ManualBookingScheduleField.tsx src/components/EditableTimeCombobox.tsx src/pages/CalendarPage.tsx
```

Expected: no new errors.

- [ ] **Step 3: Run production build, diff, and LOC checks**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vite build
git diff --check
wc -l convex/customerSearch.ts convex/customerSearchMigration.ts convex/appointmentBooking/manualBookingCore.ts convex/appointmentBooking/calendarManualBooking.ts src/components/booking/*.tsx src/components/booking/*.ts src/components/calendar/CalendarCreateBookingDialog.tsx src/components/inbox/CreateCustomerBookingDialog.tsx src/components/EditableTimeCombobox.tsx
```

Expected: build succeeds, diff check is clean, and every listed code file is below 300 lines.

- [ ] **Step 4: Update continuity and commit final verification fixes**

Record the completed behavior, migrations, verification receipts, and working set in `CONTINUITY.md`, keeping all section caps.

```bash
git add CONTINUITY.md
git commit -m "Document shared Calendar booking verification"
```
