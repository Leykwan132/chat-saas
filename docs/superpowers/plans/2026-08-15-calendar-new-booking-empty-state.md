# Calendar New Booking Header and Empty State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Right-align a dark New Booking action in the Calendar day header and make it available from the shared no-events empty state.

**Architecture:** `CalendarPage` remains the sole owner of `setCreateBookingOpen` and `selectedDate`. Its header uses a `justify-between` layout, and its no-events branch composes the existing `Empty` primitives with the same permission-gated dark Button. The existing dialog remains unchanged so all entry points use its selected-date `initialDate`.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui Button and Empty primitives, Lucide, Vitest, Bun, Node v22.

## Global Constraints

- Run every script with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Use `Button` with `variant="default"` and `size="sm"` for both dark New Booking actions.
- Render each action only when `canManageCalendar` is true.
- Keep `initialDate={format(selectedDate, 'yyyy-MM-dd')}` unchanged.
- Use `Empty`, `EmptyContent`, `EmptyDescription`, `EmptyHeader`, `EmptyMedia`, and `EmptyTitle` from the shared UI component.
- Do not add a dependency, alter booking-dialog behavior, add code comments, or add a release-changelog entry.

---

### Task 1: Align the day-header action and compose the no-events action

**Files:**
- Modify: `src/pages/CalendarPage.tsx:31-91,1208-1295`
- Modify: `src/pages/CalendarNewBookingAction.test.ts:1-14`

**Interfaces:**
- Consumes: `canManageCalendar`, `setCreateBookingOpen`, and `selectedDate` already owned by `CalendarPage`.
- Produces: two permission-gated dark New Booking actions that call `setCreateBookingOpen(true)` and continue to use `CalendarCreateBookingDialog` with the selected date.

- [ ] **Step 1: Write the failing source-level regression test**

Replace the existing test body in `src/pages/CalendarNewBookingAction.test.ts` with assertions for the header alignment, dark buttons, shared empty component, permission gate, and selected-date dialog:

```ts
expect(page).toContain('className="flex min-w-0 items-center justify-between gap-4"');
expect(page).toContain('variant="default"');
expect(page).toContain("from '@/components/ui/empty'");
expect(page).toContain('<EmptyTitle>No events</EmptyTitle>');
expect(page).toContain('<EmptyContent>');
expect(page).toContain('{canManageCalendar ? (');
expect(page).toContain('onClick={() => setCreateBookingOpen(true)}');
expect(page).toContain("initialDate={format(selectedDate, 'yyyy-MM-dd')}");
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/CalendarNewBookingAction.test.ts
```

Expected: FAIL because the header currently has a fixed gap, the button is outlined, and the no-events branch uses custom markup.

- [ ] **Step 3: Implement the compact dark actions**

In `CalendarPage.tsx`, add this shared UI import:

```ts
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
```

Replace the header wrapper and action with a right-aligned row:

```tsx
<div className="flex min-w-0 items-center justify-between gap-4">
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
    <Button type="button" variant="default" size="sm" onClick={() => setCreateBookingOpen(true)}>
      <Plus data-icon="inline-start" />
      New Booking
    </Button>
  ) : null}
</div>
```

Replace the no-events branch with the shared empty composition:

```tsx
<Empty className="h-full border-0 p-4">
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <CalendarIcon />
    </EmptyMedia>
    <EmptyTitle>No events</EmptyTitle>
    <EmptyDescription>Nothing scheduled for this day yet.</EmptyDescription>
  </EmptyHeader>
  {canManageCalendar ? (
    <EmptyContent>
      <Button type="button" variant="default" size="sm" onClick={() => setCreateBookingOpen(true)}>
        <Plus data-icon="inline-start" />
        New Booking
      </Button>
    </EmptyContent>
  ) : null}
</Empty>
```

- [ ] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/CalendarNewBookingAction.test.ts src/components/calendar/CalendarSidebar.test.tsx
git diff --check
```

Expected: PASS with all focused assertions, and no whitespace errors.

- [ ] **Step 5: Commit the implementation and verification ledger**

Update `CONTINUITY.md` with the result and focused test receipt, then commit:

```bash
git add src/pages/CalendarPage.tsx src/pages/CalendarNewBookingAction.test.ts CONTINUITY.md
git commit -m "Refine Calendar booking actions"
```
