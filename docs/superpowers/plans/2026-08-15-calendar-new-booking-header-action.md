# Calendar New Booking Header Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render New Booking directly after the right Calendar panel’s selected-day label, opening the booking dialog for that selected date.

**Architecture:** Remove the booking action and its layout state from `CalendarSidebar`. `CalendarPage` owns the permission-gated Button beside the selected-day header, with a 15px flex gap. The existing dialog continues to derive `initialDate` from `selectedDate`.

**Tech Stack:** React, TypeScript, shadcn/ui Button, Lucide, Vitest, Bun, Node v22.

## Global Constraints

- Run every script with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Reuse the existing shadcn `Button` and Lucide `Plus` icon; do not add a dependency or custom button markup.
- Use a 15px gap between the selected-day group and New Booking.
- Render the action only when `canManageCalendar` is true.
- Retain `initialDate={format(selectedDate, 'yyyy-MM-dd')}`.
- Remove the prior sidebar floating action and its reserved scroll space.
- Do not add code comments or a release-changelog entry.

---

### Task 1: Move New Booking into the selected-day header

**Files:**
- Modify: `src/components/calendar/CalendarSidebar.tsx:1-150`
- Modify: `src/components/calendar/CalendarSidebar.test.tsx:1-38`
- Create: `src/pages/CalendarNewBookingAction.test.ts`
- Modify: `src/pages/CalendarPage.tsx:1098-1113,1208-1231`

**Interfaces:**
- Consumes: `canManageCalendar`, `selectedDate`, `selectedDayKey`, `todayKey`, and `setCreateBookingOpen` in `CalendarPage`.
- Produces: a right-panel header Button calling `setCreateBookingOpen(true)`; `CalendarCreateBookingDialog` receives the formatted selected date.

- [ ] **Step 1: Write the failing tests**

Remove sidebar-specific New Booking expectations and props from `CalendarSidebar.test.tsx`. Create `CalendarNewBookingAction.test.ts` with source-level assertions:

```ts
const page = readFileSync(new URL('./CalendarPage.tsx', import.meta.url), 'utf8');

expect(page).toContain('className="flex min-w-0 items-center gap-[15px]"');
expect(page).toContain('onClick={() => setCreateBookingOpen(true)}');
expect(page).toContain("initialDate={format(selectedDate, 'yyyy-MM-dd')}");
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarSidebar.test.tsx src/pages/CalendarNewBookingAction.test.ts
```

Expected: FAIL because the current button remains in `CalendarSidebar` and the right header lacks the 15px action group.

- [ ] **Step 3: Move the existing Button and clean sidebar props**

Remove `Button`/`Plus` imports, `canManageCalendar`/`onCreateBooking` props, sidebar `relative` class, bottom padding, and floating Button from `CalendarSidebar`. Remove the corresponding prop call site in `CalendarPage`.

Wrap the selected-day label in this right-header group and append the permission-gated compact Button:

```tsx
<div className="flex min-w-0 items-center gap-[15px]">
  <div className="flex min-w-0 items-center gap-2">
    {selectedDayKey === todayKey ? (
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-sm font-semibold text-red-500">Today</h2>
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
          {format(selectedDate, 'd')}
        </span>
      </div>
    ) : (
      <h2 className="truncate text-sm font-semibold text-foreground">
        {format(selectedDate, 'EEEE, MMM d')}
      </h2>
    )}
  </div>
  {canManageCalendar ? (
    <Button type="button" variant="outline" size="sm" onClick={() => setCreateBookingOpen(true)}>
      <Plus data-icon="inline-start" />
      New Booking
    </Button>
  ) : null}
</div>
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarSidebar.test.tsx src/pages/CalendarNewBookingAction.test.ts
```

Expected: PASS with every focused test passing.

- [ ] **Step 5: Check formatting and commit**

Run:

```bash
git diff --check
```

Then commit:

```bash
git add src/components/calendar/CalendarSidebar.tsx src/components/calendar/CalendarSidebar.test.tsx src/pages/CalendarPage.tsx src/pages/CalendarNewBookingAction.test.ts CONTINUITY.md
git commit -m "Place Calendar New Booking in day header"
```
