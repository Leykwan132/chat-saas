# Calendar Today Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep an always-visible Today button beside the Calendar month label that selects and displays the current day.

**Architecture:** `CalendarPage` already owns the selected date and visible month, and `handleSelectDate` synchronizes both. Add the existing shadcn Button next to the formatted month label and call that handler with the current date. Extend the existing Calendar header source-level regression test to protect the placement and click binding.

**Tech Stack:** React, TypeScript, date-fns, shadcn/ui Button, Vitest, Bun, Node v22.

## Global Constraints

- Run every script with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Reuse the existing shadcn `Button`; do not add a dependency or custom button markup.
- Keep the right-side Google Calendar, timezone, and month navigation controls unchanged.
- Keep the Today button visible even when the selected date is already today.
- Do not add code comments.
- Production availability is UNCONFIRMED, so do not add a release-changelog entry.

---

### Task 1: Restore the Calendar Today control

**Files:**
- Modify: `src/components/calendar/GoogleCalendarConnection.test.tsx:169-175`
- Modify: `src/pages/CalendarPage.tsx:1114-1122`

**Interfaces:**
- Consumes: `handleSelectDate(date: Date | undefined)` in `CalendarPage`.
- Produces: a header `Button` whose click handler calls `handleSelectDate(new Date())`.

- [x] **Step 1: Write the failing source-level regression test**

Replace the assertion that forbids Today with assertions that require the month label before the button and require the existing selection handler:

```ts
expect(header.indexOf("{format(visibleMonth, 'MMMM yyyy')}")).toBeLessThan(header.indexOf("<Button"));
expect(header).toContain("Today");
expect(header).toContain('onClick={() => handleSelectDate(new Date())}');
```

- [x] **Step 2: Run the focused test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx
```

Expected: FAIL because the current header does not render `>Today</Button>` or bind it to `handleSelectDate(new Date())`.

- [x] **Step 3: Add the minimal header control**

Replace the month-label wrapper with a horizontal group containing the existing heading and this existing shadcn Button:

```tsx
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => handleSelectDate(new Date())}
>
  Today
</Button>
```

Keep this group on the left side of the header and leave the right-side controls untouched.

- [x] **Step 4: Run the focused test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx
```

Expected: PASS with all tests in the file passing.

- [ ] **Step 5: Check formatting and commit**

Run:

```bash
git diff --check
```

Then commit:

```bash
git add src/pages/CalendarPage.tsx src/components/calendar/GoogleCalendarConnection.test.tsx CONTINUITY.md
git commit -m "Restore Calendar Today button"
```
