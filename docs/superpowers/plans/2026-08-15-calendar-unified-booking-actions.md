# Calendar Unified Booking Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pin the Calendar header’s New Booking action to the far right and route the calendar-grid creation action through the same selected-date booking dialog.

**Architecture:** `CalendarDayHeader` expands to the header width so its existing `justify-between` layout reaches both edges. `CalendarDayGridCell` receives an `onCreateBooking` callback from `CalendarPage`; that callback selects the grid day and opens the same `CalendarCreateBookingDialog` used by the header and no-events actions.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui, Lucide, Vitest, Bun, Node v22.

## Global Constraints

- Run every script with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Keep all booking actions permission-gated through `canManageCalendar`.
- Grid `Create Booking` must call `handleSelectDate(nextDay)` before `setCreateBookingOpen(true)`.
- Keep `initialDate={format(selectedDate, 'yyyy-MM-dd')}` unchanged.
- Do not alter existing-event details, editing, deletion, generic event form code, or release changelog.

---

### Task 1: Extend the shared booking-action regression coverage

**Files:**
- Modify: `src/components/calendar/CalendarDayPanel.test.tsx:6-49`
- Modify: `src/components/booking/CreateBookingDialog.test.ts:69-79`

**Interfaces:**
- Consumes: the public `CalendarDayHeader` component and CalendarPage’s existing grid callback wiring.
- Produces: regression coverage for a full-width header and the renamed selected-day Create Booking grid action.

- [x] **Step 1: Write failing assertions**

In `CalendarDayPanel.test.tsx`, add this assertion inside the authorized-header test:

```tsx
expect(markup).toContain('w-full');
```

Replace the final test in `CreateBookingDialog.test.ts` with:

```ts
test('uses the booking dialog for Calendar creation actions', () => {
  expect(calendarSidebarSource).not.toContain('New Booking');
  expect(calendarPageSource).toContain('<CalendarCreateBookingDialog');
  expect(calendarPageSource).toContain('onCreateBooking={(nextDay) =>');
  expect(calendarPageSource).toContain('handleSelectDate(nextDay);');
  expect(calendarPageSource).toContain('setCreateBookingOpen(true);');
  expect(calendarPageSource).toContain('Create Booking');
  expect(calendarPageSource).not.toContain('Create event');
});
```

- [x] **Step 2: Run focused tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarDayPanel.test.tsx src/components/booking/CreateBookingDialog.test.ts
```

Expected: FAIL because the header is not full width and the grid action still says Create event and opens the generic event sheet.

- [x] **Step 3: Make the header fill its parent width**

In `CalendarDayHeader.tsx`, change the outer class from:

```tsx
className="flex min-w-0 items-center justify-between gap-4"
```

to:

```tsx
className="flex w-full min-w-0 items-center justify-between gap-4"
```

- [x] **Step 4: Run the header test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarDayPanel.test.tsx
```

Expected: PASS with the far-right header layout assertion passing.

### Task 2: Route the grid action through the booking dialog

**Files:**
- Modify: `src/pages/CalendarPage.tsx:426-555,1185-1205`
- Modify: `CONTINUITY.md`

**Interfaces:**
- `CalendarDayGridCell` replaces `onCreateEvent: (day: Date) => void` with `onCreateBooking: (day: Date) => void`.
- `CalendarPage` supplies `onCreateBooking={(nextDay) => { handleSelectDate(nextDay); setCreateBookingOpen(true); }}`.
- `CalendarCreateBookingDialog` remains the shared destination and reads the selected date through its existing `initialDate` prop.

- [x] **Step 1: Rename the grid callback and label**

In the `CalendarDayGridCell` props and context-menu item, use:

```tsx
onCreateBooking,
```

```tsx
onClick={() => onCreateBooking(day)}
```

```tsx
<Plus className="size-3.5" />
Create Booking
```

At the CalendarPage call site, replace the old callback with:

```tsx
onCreateBooking={(nextDay) => {
  handleSelectDate(nextDay);
  setCreateBookingOpen(true);
}}
```

- [x] **Step 2: Run focused tests to verify the unified path**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarDayPanel.test.tsx src/components/booking/CreateBookingDialog.test.ts src/components/calendar/CalendarSidebar.test.tsx
git diff --check
```

Expected: PASS with the header, shared-booking-path, and sidebar regressions passing.

- [x] **Step 3: Commit the implementation and verification ledger**

Update `CONTINUITY.md` with the result and focused test receipt, then commit:

```bash
git add src/components/calendar/CalendarDayHeader.tsx src/components/calendar/CalendarDayPanel.test.tsx src/components/booking/CreateBookingDialog.test.ts src/pages/CalendarPage.tsx CONTINUITY.md
git commit -m "Unify Calendar booking actions"
```
