# Calendar New Booking Header and Empty State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Right-align a dark New Booking action in the Calendar day header and make it available from the shared no-events empty state.

**Architecture:** Extract the selected-day header and no-events presentation into two small Calendar components with explicit props. `CalendarPage` continues to own the selected date, permission, and dialog state, passing one `onCreateBooking` callback into both components. Component tests server-render the components with permission variations to verify the visible user experience.

**Tech Stack:** React, TypeScript, date-fns, Tailwind CSS, shadcn/ui Button and Empty primitives, Lucide, Vitest, Bun, Node v22.

## Global Constraints

- Run every script with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Use `Button` with `variant="default"` and `size="sm"` for both dark New Booking actions.
- Render each action only when `canManageCalendar` is true.
- Keep `initialDate={format(selectedDate, 'yyyy-MM-dd')}` unchanged in `CalendarPage`.
- Use the shared `Empty` primitives for the no-events state.
- Do not add a dependency, alter booking-dialog behavior, add code comments, or add a release-changelog entry.

---

### Task 1: Create testable selected-day presentation components

**Files:**
- Create: `src/components/calendar/CalendarDayHeader.tsx`
- Create: `src/components/calendar/CalendarDayEmptyState.tsx`
- Create: `src/components/calendar/CalendarDayPanel.test.tsx`

**Interfaces:**
- `CalendarDayHeader` consumes `selectedDate: Date`, `isToday: boolean`, `canManageCalendar: boolean`, and `onCreateBooking: () => void`.
- `CalendarDayEmptyState` consumes `canManageCalendar: boolean` and `onCreateBooking: () => void`.
- Both components produce a compact dark New Booking Button only for authorized users.

- [x] **Step 1: Write failing rendered-component tests**

Create `CalendarDayPanel.test.tsx` using `renderToStaticMarkup`, then add these tests:

```tsx
it('renders the selected day left of a dark booking action', () => {
  const markup = renderToStaticMarkup(
    <CalendarDayHeader
      canManageCalendar
      isToday
      selectedDate={new Date(2026, 7, 15)}
      onCreateBooking={() => undefined}
    />,
  );

  expect(markup).toContain('justify-between');
  expect(markup).toContain('Today');
  expect(markup).toContain('>15<');
  expect(markup).toContain('New Booking');
  expect(markup).toContain('bg-primary');
});

it('hides booking actions without calendar permission', () => {
  const header = renderToStaticMarkup(
    <CalendarDayHeader
      canManageCalendar={false}
      isToday={false}
      selectedDate={new Date(2026, 7, 16)}
      onCreateBooking={() => undefined}
    />,
  );
  const emptyState = renderToStaticMarkup(
    <CalendarDayEmptyState canManageCalendar={false} onCreateBooking={() => undefined} />,
  );

  expect(header).not.toContain('New Booking');
  expect(emptyState).not.toContain('New Booking');
});

it('renders a dark booking action in the no-events empty state', () => {
  const markup = renderToStaticMarkup(
    <CalendarDayEmptyState canManageCalendar onCreateBooking={() => undefined} />,
  );

  expect(markup).toContain('Nothing scheduled for this day yet.');
  expect(markup).toContain('New Booking');
  expect(markup).toContain('bg-primary');
});
```

- [x] **Step 2: Run the focused test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarDayPanel.test.tsx
```

Expected: FAIL because neither presentation component exists.

- [x] **Step 3: Implement the two presentation components**

Create `CalendarDayHeader.tsx` with this component:

```tsx
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CalendarDayHeaderProps = {
  selectedDate: Date;
  isToday: boolean;
  canManageCalendar: boolean;
  onCreateBooking: () => void;
};

export function CalendarDayHeader({
  selectedDate,
  isToday,
  canManageCalendar,
  onCreateBooking,
}: CalendarDayHeaderProps) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2">
        {isToday ? (
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
        <Button type="button" variant="default" size="sm" onClick={onCreateBooking}>
          <Plus data-icon="inline-start" />
          New Booking
        </Button>
      ) : null}
    </div>
  );
}
```

Create `CalendarDayEmptyState.tsx` with this component:

```tsx
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type CalendarDayEmptyStateProps = {
  canManageCalendar: boolean;
  onCreateBooking: () => void;
};

export function CalendarDayEmptyState({
  canManageCalendar,
  onCreateBooking,
}: CalendarDayEmptyStateProps) {
  return (
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
          <Button type="button" variant="default" size="sm" onClick={onCreateBooking}>
            <Plus data-icon="inline-start" />
            New Booking
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
```

- [x] **Step 4: Run the component tests to verify they pass**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarDayPanel.test.tsx
```

Expected: PASS with all authorized and unauthorized rendered-state assertions passing.

- [x] **Step 5: Commit the presentation components**

```bash
git add src/components/calendar/CalendarDayHeader.tsx src/components/calendar/CalendarDayEmptyState.tsx src/components/calendar/CalendarDayPanel.test.tsx
git commit -m "Add Calendar day booking actions"
```

### Task 2: Wire the components into CalendarPage

**Files:**
- Modify: `src/pages/CalendarPage.tsx:80-90,1208-1295`
- Delete: `src/pages/CalendarNewBookingAction.test.ts`
- Modify: `CONTINUITY.md`

**Interfaces:**
- `CalendarPage` passes `selectedDate`, `selectedDayKey === todayKey`, `canManageCalendar`, and `() => setCreateBookingOpen(true)` into `CalendarDayHeader`.
- `CalendarPage` passes `canManageCalendar` and the same callback into `CalendarDayEmptyState`.
- `CalendarCreateBookingDialog` retains `initialDate={format(selectedDate, 'yyyy-MM-dd')}`.

- [x] **Step 1: Replace the inline header and no-events branches**

Add these imports to `CalendarPage.tsx`:

```ts
import { CalendarDayEmptyState } from '@/components/calendar/CalendarDayEmptyState';
import { CalendarDayHeader } from '@/components/calendar/CalendarDayHeader';
```

Replace the right-panel header child with:

```tsx
<CalendarDayHeader
  selectedDate={selectedDate}
  isToday={selectedDayKey === todayKey}
  canManageCalendar={canManageCalendar}
  onCreateBooking={() => setCreateBookingOpen(true)}
/>
```

Replace the no-events branch with:

```tsx
<CalendarDayEmptyState
  canManageCalendar={canManageCalendar}
  onCreateBooking={() => setCreateBookingOpen(true)}
/>
```

Keep this dialog prop unchanged:

```tsx
initialDate={format(selectedDate, 'yyyy-MM-dd')}
```

- [x] **Step 2: Remove the obsolete source-level test**

Delete `src/pages/CalendarNewBookingAction.test.ts`; its rendered-component coverage has moved to `CalendarDayPanel.test.tsx`.

- [x] **Step 3: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarDayPanel.test.tsx src/components/calendar/CalendarSidebar.test.tsx
git diff --check
```

Expected: PASS with all component and sidebar tests passing, and no whitespace errors.

- [x] **Step 4: Commit the integration and verification ledger**

Update `CONTINUITY.md` with the result and focused test receipt, then commit:

```bash
git add src/pages/CalendarPage.tsx CONTINUITY.md
git add -u src/pages/CalendarNewBookingAction.test.ts
git commit -m "Refine Calendar booking actions"
```
