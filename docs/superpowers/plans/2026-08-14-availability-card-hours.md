# Availability Card Hours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each teammate’s compact available-time summary directly on the availability roster card.

**Architecture:** The roster query already includes every schedule’s shifts. Pass those shifts to the existing card component, format them with `describeWeeklyAvailabilityLines`, and render the resulting one or two lines below its badges. A page-level server-rendering test verifies the visible outcome with a Monday-to-Friday schedule.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind CSS, Convex React, Vitest, React server rendering.

## Global Constraints

- Use Node v22 before executing project commands.
- Keep the existing card contact details, status badge, time-off state, card link, and Accepting leads toggle unchanged.
- Reuse `describeWeeklyAvailabilityLines`; do not add backend queries or a second schedule formatter.
- Show `No available hours` for a card with no saved shifts.
- Do not add comments or default fallbacks.

---

### Task 1: Display compact schedule hours on roster cards

**Files:**
- Create: `src/pages/SchedulePage.test.tsx`
- Modify: `src/pages/SchedulePage.tsx:15, 229-245, 357-466`

**Interfaces:**
- Consumes: `RosterEntry.shifts: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>`.
- Consumes: `describeWeeklyAvailabilityLines(shifts: ScheduleShift[]): string[]`.
- Produces: a visible, muted schedule summary beneath each card’s role and lead badges.

- [ ] **Step 1: Write the failing page behavior test**

```tsx
test('shows saved weekly hours on each availability card', () => {
  const roster = [{
    schedule: {
      _id: 'schedule-ley',
      workosUserId: 'user-ley',
      enabled: true,
    },
    shifts: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startMinutes: 540,
      endMinutes: 1020,
    })),
    timeOff: [],
  }];

  vi.mocked(useQuery)
    .mockReturnValueOnce(roster)
    .mockReturnValueOnce([ley])
    .mockReturnValueOnce(ley)
    .mockReturnValueOnce({ 'user-ley': 1 });

  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/dashboard/agent-1/availability']}>
      <Routes>
        <Route path="/dashboard/:agentId/availability" element={<SchedulePage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(markup).toContain('Mon - Fri, 9:00 AM - 5:00 PM');
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/SchedulePage.test.tsx`

Expected: FAIL because `UserScheduleCard` currently receives no shifts and renders no schedule summary.

- [ ] **Step 3: Add the card schedule summary**

```tsx
import {
  describeWeeklyAvailabilityLines,
  isCurrentlyOnTimeOff,
  memberLabel,
} from '@/lib/scheduleUtils';

const availabilityLines = describeWeeklyAvailabilityLines(shifts);

{availabilityLines.map((line) => (
  <p key={line} className="mt-2 text-xs text-muted-foreground">
    {line}
  </p>
))}
```

Pass `existing?.shifts ?? []` as the new `shifts` prop from the roster mapping, and declare it in `UserScheduleCard`’s props.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/SchedulePage.test.tsx`

Expected: PASS with the weekly hours visible on the rendered card.

- [ ] **Step 5: Run final verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit && git diff --check`

Expected: both commands exit 0.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/pages/SchedulePage.tsx src/pages/SchedulePage.test.tsx docs/superpowers/plans/2026-08-14-availability-card-hours.md CONTINUITY.md
git commit -m "Show availability hours on roster cards"
```
