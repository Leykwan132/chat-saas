# Weekly Availability Unavailable Label Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a disabled weekday show “Unavailable” while preserving the existing availability editor layout.

**Architecture:** The weekly editor already maps missing shift drafts to an unavailable weekday. Add a small rendering branch in that existing row and cover it through server-rendered component markup. No schedule data, API, or persistence code changes.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, React server rendering.

## Global Constraints

- Use Node v22 before executing project commands.
- Keep the current weekday switch, day label, available time controls, and 24/7 behavior unchanged.
- Render exact copy `Unavailable` only for weekdays with no shift drafts outside 24/7 mode.
- Do not add comments or default fallbacks.

---

### Task 1: Render the unavailable weekday state

**Files:**
- Modify: `src/components/WeeklyAvailabilityEditor.test.ts`
- Modify: `src/components/WeeklyAvailabilityEditor.tsx`

**Interfaces:**
- Consumes: `WeeklyAvailabilityEditor` props: `shiftDrafts`, `onShiftDraftsChange`, `timezone`, `onTimezoneChange`, and `timeOptions`.
- Produces: server-rendered `Unavailable` labels for weekdays where `isAvailable` is false.

- [ ] **Step 1: Write the failing component behavior test**

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { WeeklyAvailabilityEditor } from './WeeklyAvailabilityEditor';
import { SCHEDULE_TIME_OPTIONS } from '@/lib/scheduleUtils';

it('shows unavailable labels for weekdays without time slots', () => {
  const markup = renderToStaticMarkup(
    <WeeklyAvailabilityEditor
      shiftDrafts={[{
        key: 'thursday-9-to-5',
        dayOfWeek: 4,
        startMinutes: 540,
        endMinutes: 1020,
      }]}
      onShiftDraftsChange={() => undefined}
      timezone="Asia/Kuala_Lumpur"
      onTimezoneChange={() => undefined}
      timeOptions={SCHEDULE_TIME_OPTIONS}
    />,
  );

  expect(markup.match(/>Unavailable<\\/span>/g)).toHaveLength(6);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WeeklyAvailabilityEditor.test.ts`

Expected: FAIL because the existing unavailable branch renders no label.

- [ ] **Step 3: Add the minimal unavailable-state rendering**

```tsx
) : isAvailable ? (
  <div className="flex min-w-0 flex-col gap-4">
    {/* existing time-slot mapping */}
  </div>
) : (
  <span className="py-1.5 text-sm text-muted-foreground">Unavailable</span>
)}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WeeklyAvailabilityEditor.test.ts`

Expected: PASS with the unavailable-state regression covered.

- [ ] **Step 5: Run final verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit && git diff --check`

Expected: both commands exit 0.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/components/WeeklyAvailabilityEditor.tsx src/components/WeeklyAvailabilityEditor.test.ts CONTINUITY.md docs/superpowers/plans/2026-08-13-weekly-availability-unavailable-label.md
git commit -m "Show unavailable availability days"
```
