# Available Hours 24/7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `Available 24/7` weekly control that persists seven all-day shifts, resets to seven 9:00am–5:00pm shifts when disabled, removes the timezone card chrome, and preserves the existing AI booking availability contract.

**Architecture:** Keep `userShifts` as the only persisted availability source. Put full-week recognition and draft creation in `scheduleShiftDrafts.ts`, let `WeeklyAvailabilityEditor` derive its switch state from those drafts, and retain the existing Convex slot generator as the agent-facing authority. Split time-off helpers out of the already oversized `scheduleUtils.ts` while preserving its exports so every touched code file remains under 300 lines.

**Tech Stack:** React 19, TypeScript 6, shadcn UI primitives, Tailwind CSS, Convex, Vitest, convex-test, Bun, Node.js 22.

## Global Constraints

- Run every script and test under Node.js 22 by invoking `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- No code file may exceed 300 lines; split focused modules instead of compressing behavior.
- Do not add comments to code; use descriptive names and focused functions.
- Do not add dependencies or fallback behavior.
- Use `Available 24/7` as the exact switch label.
- Use `Set availability to 24 hours for all seven days.` as the exact supporting text.
- Enabling replaces the complete weekly draft with seven `0–1440` shifts.
- Disabling replaces the complete weekly draft with seven `540–1020` shifts and does not restore prior custom hours.
- Keep time off, calendar conflicts, schedule enabled state, service rules, and assignment rules authoritative.
- Read `convex/_generated/ai/guidelines.md` before changing or testing Convex code.

---

### Task 1: Lossless weekly schedule model

**Files:**
- Create: `src/lib/scheduleShiftDrafts.test.ts`
- Create: `src/lib/scheduleTimeOffUtils.ts`
- Modify: `src/lib/scheduleShiftDrafts.ts`
- Modify: `src/lib/scheduleUtils.ts`
- Modify: `src/pages/ScheduleUserAvailabilityPage.tsx`

**Interfaces:**
- Consumes: `SCHEDULE_DAYS`, `MINUTES_PER_DAY`, and `DEFAULT_SCHEDULE_SHIFTS` from `src/lib/scheduleUtils.ts`.
- Produces: `isFullWeekAllDay(shifts: ScheduleShift[]): boolean`.
- Produces: `createAllDayShiftDrafts(): ShiftDraft[]`.
- Produces: `createStandardShiftDrafts(): ShiftDraft[]`.
- Preserves: existing `scheduleUtils.ts` exports for time-off consumers through re-exports.

- [ ] **Step 1: Write the failing weekly-model tests**

Create `src/lib/scheduleShiftDrafts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  createAllDayShiftDrafts,
  createStandardShiftDrafts,
  getInitialShiftsFromDetail,
  isFullWeekAllDay,
} from './scheduleShiftDrafts';

describe('full-week availability drafts', () => {
  it('recognizes only one exact all-day shift for every weekday', () => {
    const allDay = createAllDayShiftDrafts();

    expect(isFullWeekAllDay(allDay)).toBe(true);
    expect(isFullWeekAllDay(allDay.slice(0, 6))).toBe(false);
    expect(isFullWeekAllDay([...allDay.slice(0, 6), allDay[0]!])).toBe(false);
    expect(isFullWeekAllDay(allDay.map((shift, index) =>
      index === 3 ? { ...shift, startMinutes: 540, endMinutes: 1020 } : shift,
    ))).toBe(false);
    expect(isFullWeekAllDay([...allDay, { ...allDay[0]!, key: 'duplicate' }])).toBe(false);
  });

  it('builds complete all-day and standard weekly drafts', () => {
    expect(createAllDayShiftDrafts()).toEqual(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        key: `shift-${dayOfWeek}-0-1440-${dayOfWeek}`,
        dayOfWeek,
        startMinutes: 0,
        endMinutes: 1440,
      })),
    );
    expect(createStandardShiftDrafts()).toEqual(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        key: `shift-${dayOfWeek}-540-1020-${dayOfWeek}`,
        dayOfWeek,
        startMinutes: 540,
        endMinutes: 1020,
      })),
    );
  });

  it('preserves persisted all-day shifts during editor initialization', () => {
    const allDay = createAllDayShiftDrafts().map(({ key: _key, ...shift }) => shift);

    expect(getInitialShiftsFromDetail({ shifts: allDay, schedule: {} })).toEqual(allDay);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/scheduleShiftDrafts.test.ts
```

Expected: FAIL because `createAllDayShiftDrafts`, `createStandardShiftDrafts`, and `isFullWeekAllDay` are not exported, and persisted all-day shifts are still normalized to 9:00am–5:00pm.

- [ ] **Step 3: Implement the full-week draft helpers and lossless initialization**

Replace `src/lib/scheduleShiftDrafts.ts` with:

```ts
import {
  DEFAULT_SCHEDULE_SHIFTS,
  MINUTES_PER_DAY,
  SCHEDULE_DAYS,
  type ScheduleShift,
} from '@/lib/scheduleUtils';

export type ShiftDraft = ScheduleShift & { key: string };

export function shiftsToDrafts(
  shifts: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>,
): ShiftDraft[] {
  return shifts.map((shift, index) => ({
    ...shift,
    key: `shift-${shift.dayOfWeek}-${shift.startMinutes}-${shift.endMinutes}-${index}`,
  }));
}

export function createAllDayShiftDrafts(): ShiftDraft[] {
  return shiftsToDrafts(SCHEDULE_DAYS.map(({ dayOfWeek }) => ({
    dayOfWeek,
    startMinutes: 0,
    endMinutes: MINUTES_PER_DAY,
  })));
}

export function createStandardShiftDrafts(): ShiftDraft[] {
  return shiftsToDrafts(DEFAULT_SCHEDULE_SHIFTS);
}

export function isFullWeekAllDay(shifts: ScheduleShift[]): boolean {
  if (shifts.length !== SCHEDULE_DAYS.length) return false;
  return SCHEDULE_DAYS.every(({ dayOfWeek }) => {
    const dayShifts = shifts.filter((shift) => shift.dayOfWeek === dayOfWeek);
    return dayShifts.length === 1
      && dayShifts[0]!.startMinutes === 0
      && dayShifts[0]!.endMinutes === MINUTES_PER_DAY;
  });
}

export function draftsToShifts(drafts: ShiftDraft[]) {
  return drafts.map(({ dayOfWeek, startMinutes, endMinutes }) => ({
    dayOfWeek,
    startMinutes,
    endMinutes,
  }));
}

function normalizeShifts(
  shifts: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>,
) {
  return [...shifts].sort(
    (a, b) =>
      a.dayOfWeek - b.dayOfWeek
      || a.startMinutes - b.startMinutes
      || a.endMinutes - b.endMinutes,
  );
}

export function getInitialShiftsFromDetail(detail: {
  shifts: ScheduleShift[];
  schedule: unknown | null;
}): ScheduleShift[] {
  if (detail.shifts.length > 0) return detail.shifts;
  if (detail.schedule === null) return DEFAULT_SCHEDULE_SHIFTS;
  return [];
}

export function areScheduleShiftsEqual(
  left: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>,
  right: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>,
) {
  const normalizedLeft = normalizeShifts(left);
  const normalizedRight = normalizeShifts(right);
  if (normalizedLeft.length !== normalizedRight.length) return false;
  return normalizedLeft.every(
    (shift, index) =>
      shift.dayOfWeek === normalizedRight[index]!.dayOfWeek
      && shift.startMinutes === normalizedRight[index]!.startMinutes
      && shift.endMinutes === normalizedRight[index]!.endMinutes,
  );
}
```

In `src/lib/scheduleUtils.ts`:

- Delete `normalizeScheduleShift` and `normalizeScheduleShifts`.
- Change `shiftsForDisplay` to return `shifts.length > 0 ? shifts : DEFAULT_SCHEDULE_SHIFTS` without normalization.
- Move `formatDateRangePreview`, `formatTimeOffRange`, `isCurrentlyOnTimeOff`, `startOfDay`, `endOfDay`, and `calendarDaysForTimeOff` to the new module below.
- Re-export them with this stable entrypoint:

```ts
export {
  calendarDaysForTimeOff,
  endOfDay,
  formatDateRangePreview,
  formatTimeOffRange,
  isCurrentlyOnTimeOff,
  startOfDay,
} from '@/lib/scheduleTimeOffUtils';
```

Create `src/lib/scheduleTimeOffUtils.ts`:

```ts
export function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function formatDateRangePreview(range: { from?: Date; to?: Date } | undefined) {
  if (!range?.from) return null;
  const end = range.to ?? range.from;
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  const formatDate = (date: Date) => date.toLocaleDateString(undefined, options);
  if (
    range.to === undefined
    || startOfDay(range.from).getTime() === startOfDay(end).getTime()
  ) {
    return formatDate(range.from);
  }
  return `${formatDate(range.from)} – ${formatDate(end)}`;
}

export function formatTimeOffRange(startAt: number, endAt: number) {
  const formatTimestamp = (timestamp: number) =>
    new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  return `${formatTimestamp(startAt)} – ${formatTimestamp(endAt)}`;
}

export function isCurrentlyOnTimeOff(
  timeOff: Array<{ startAt: number; endAt: number }>,
  now = Date.now(),
) {
  return timeOff.some((row) => now >= row.startAt && now <= row.endAt);
}

export function calendarDaysForTimeOff(
  timeOff: Array<{ startAt: number; endAt: number }>,
): Date[] {
  const seen = new Set<string>();
  const days: Date[] = [];

  for (const entry of timeOff) {
    const cursor = startOfDay(new Date(entry.startAt));
    const last = startOfDay(new Date(entry.endAt));

    while (cursor <= last) {
      const key = cursor.toISOString().slice(0, 10);
      if (!seen.has(key)) {
        seen.add(key);
        days.push(new Date(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return days;
}
```

In `src/pages/ScheduleUserAvailabilityPage.tsx`, remove the `normalizeScheduleShifts` import and use the persisted rows directly:

```ts
const savedShifts = detail?.shifts ?? [];
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/scheduleShiftDrafts.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Verify module boundaries and LOC**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/lib/scheduleShiftDrafts.ts src/lib/scheduleShiftDrafts.test.ts src/lib/scheduleUtils.ts src/lib/scheduleTimeOffUtils.ts src/pages/ScheduleUserAvailabilityPage.tsx && wc -l src/lib/scheduleShiftDrafts.ts src/lib/scheduleUtils.ts src/lib/scheduleTimeOffUtils.ts src/pages/ScheduleUserAvailabilityPage.tsx
```

Expected: ESLint exits 0 and every listed code file is 300 lines or fewer.

- [ ] **Step 6: Commit the schedule-model change**

```bash
git add src/lib/scheduleShiftDrafts.ts src/lib/scheduleShiftDrafts.test.ts src/lib/scheduleUtils.ts src/lib/scheduleTimeOffUtils.ts src/pages/ScheduleUserAvailabilityPage.tsx
git commit -m "Add lossless all-day schedule model"
```

### Task 2: Available 24/7 editor control

**Files:**
- Create: `src/components/WeeklyAvailabilityEditor.test.ts`
- Modify: `src/components/WeeklyAvailabilityEditor.tsx`
- Modify: `src/pages/ScheduleUserAvailabilityPage.tsx`

**Interfaces:**
- Consumes: `isFullWeekAllDay`, `createAllDayShiftDrafts`, and `createStandardShiftDrafts` from Task 1.
- Produces: a derived `Available 24/7` switch with no separate persisted boolean.
- Produces: disabled weekday switches and `24 hours` text while the complete week is all-day.

- [ ] **Step 1: Write the failing editor contract test**

Create `src/components/WeeklyAvailabilityEditor.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const editorSource = readFileSync(new URL('./WeeklyAvailabilityEditor.tsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../pages/ScheduleUserAvailabilityPage.tsx', import.meta.url), 'utf8');

describe('Available 24/7 editor', () => {
  it('renders the global control below all weekday rows', () => {
    expect(editorSource).toContain('Available 24/7');
    expect(editorSource).toContain('Set availability to 24 hours for all seven days.');
    expect(editorSource.indexOf('SCHEDULE_DAYS.map')).toBeLessThan(
      editorSource.indexOf('Available 24/7'),
    );
    expect(editorSource).toContain('createAllDayShiftDrafts()');
    expect(editorSource).toContain('createStandardShiftDrafts()');
  });

  it('prevents contradictory day edits while the week is all-day', () => {
    expect(editorSource).toContain('disabled={available24x7}');
    expect(editorSource).toContain("available24x7 ? (");
    expect(editorSource).toContain('24 hours');
  });

  it('keeps timezone controls without the old card wrapper', () => {
    expect(editorSource).toContain('<Label htmlFor="schedule-timezone"');
    expect(editorSource).toContain('<TimeZoneSelect');
    expect(editorSource).not.toContain('self-start rounded-xl border border-border bg-card p-6');
    expect(pageSource).not.toContain('self-start rounded-xl border border-border bg-card p-6');
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WeeklyAvailabilityEditor.test.ts
```

Expected: 3 tests FAIL because the global control, disabled all-day presentation, and unwrapped timezone layout do not exist.

- [ ] **Step 3: Implement the derived 24/7 editor state**

In `src/components/WeeklyAvailabilityEditor.tsx`, import the Task 1 helpers:

```ts
import {
  createAllDayShiftDrafts,
  createStandardShiftDrafts,
  isFullWeekAllDay,
  type ShiftDraft,
} from '@/lib/scheduleShiftDrafts';
```

Inside `WeeklyAvailabilityEditor`, derive and transition the complete week atomically:

```ts
const available24x7 = isFullWeekAllDay(shiftDrafts);

const setAvailable24x7 = (available: boolean) => {
  onShiftDraftsChange(
    available ? createAllDayShiftDrafts() : createStandardShiftDrafts(),
  );
};
```

Pass `disabled={available24x7}` to each weekday `Switch`. Replace the editable slot block with this exact branch:

```tsx
{available24x7 ? (
  <span className="py-1.5 text-sm font-medium text-foreground">24 hours</span>
) : isAvailable ? (
  <div className="flex min-w-0 flex-col gap-4">
    {dayDrafts.map((shift, index) => (
      <TimeSlotRow
        key={shift.key}
        shift={shift}
        timeOptions={timeOptions}
        onUpdate={(patch) => updateShift(shift.key, patch)}
        onRemove={() => removeShift(shift.key)}
        showRemove={hasMultipleSlots}
        showAdd={index === 0}
        onAdd={() => addShiftToDay(day.dayOfWeek)}
      />
    ))}
  </div>
) : null}
```

After the `SCHEDULE_DAYS.map` block and within the same divided card, add:

```tsx
<div className="flex items-center justify-between gap-4 pt-4">
  <div className="flex min-w-0 flex-col gap-1">
    <Label htmlFor="available-24x7" className="text-sm font-medium">
      Available 24/7
    </Label>
    <p className="text-xs text-muted-foreground">
      Set availability to 24 hours for all seven days.
    </p>
  </div>
  <Switch
    id="available-24x7"
    checked={available24x7}
    onCheckedChange={setAvailable24x7}
    aria-label="Available 24/7"
  />
</div>
```

Replace the timezone wrapper with:

```tsx
<div className="flex shrink-0 flex-col gap-2 self-start">
  <Label htmlFor="schedule-timezone" className="text-sm font-medium">
    Timezone
  </Label>
  <TimeZoneSelect
    value={timezone}
    options={SCHEDULE_TIMEZONE_OPTIONS}
    onChange={onTimezoneChange}
    triggerId="schedule-timezone"
    triggerClassName="w-fit border-input bg-background"
  />
</div>
```

In `ScheduleUserAvailabilitySkeleton`, add one final skeleton row for the 24/7 control below the seven day rows and replace the timezone skeleton wrapper with `className="flex shrink-0 flex-col gap-2 self-start"`.

- [ ] **Step 4: Run the editor and model tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/scheduleShiftDrafts.test.ts src/components/WeeklyAvailabilityEditor.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Verify UI lint and LOC**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/WeeklyAvailabilityEditor.tsx src/components/WeeklyAvailabilityEditor.test.ts src/pages/ScheduleUserAvailabilityPage.tsx && wc -l src/components/WeeklyAvailabilityEditor.tsx src/pages/ScheduleUserAvailabilityPage.tsx
```

Expected: ESLint exits 0 and both code files are 300 lines or fewer.

- [ ] **Step 6: Commit the editor change**

```bash
git add src/components/WeeklyAvailabilityEditor.tsx src/components/WeeklyAvailabilityEditor.test.ts src/pages/ScheduleUserAvailabilityPage.tsx
git commit -m "Add Available 24/7 weekly control"
```

### Task 3: Agent booking-path characterization

**Files:**
- Modify: `convex/calendarManualBooking.test.ts`

**Interfaces:**
- Consumes: the existing `api.appointmentBooking.calendarManualBooking.checkAvailability` mutation and the unchanged slot generator.
- Proves: a scheduled user with one `0–1440` shift is bookable at off-hours.
- Proves: calendar conflicts and time off still override the all-day shift.

- [ ] **Step 1: Read the Convex project guidance**

Run:

```bash
sed -n '1,260p' convex/_generated/ai/guidelines.md
```

Expected: the complete local Convex API, authorization, validator, query, mutation, and TypeScript rules are reviewed before touching the test.

- [ ] **Step 2: Convert the Calendar booking fixture into an all-day scheduled fixture**

In `convex/calendarManualBooking.test.ts`:

- Change the selected interval to 1:15am–2:00am UTC:

```ts
const startAt = Date.UTC(2026, 6, 16, 1, 15, 0);
const endAt = Date.UTC(2026, 6, 16, 2, 0, 0);
```

- Store the inserted schedule ID, use scheduled mode, and add the Thursday all-day shift:

```ts
const userScheduleId = await ctx.db.insert("userSchedules", {
  agentId,
  workosUserId,
  mode: "scheduled",
  manualStatus: "available",
  timezone: "UTC",
  enabled: true,
  createdAt: now,
  updatedAt: now,
});
await ctx.db.insert("userShifts", {
  userScheduleId,
  dayOfWeek: 4,
  startMinutes: 0,
  endMinutes: 1440,
});
```

- Return `userScheduleId` from the fixture.
- Update collected time and persisted-field expectations from `9:15am` to `1:15am`.

Use this fixture return value:

```ts
return { agentId, customerId, serviceId, teamId, userId, userScheduleId };
```

Use this submitted field value:

```ts
collectedFields: {
  date: "2026-07-16",
  time: "1:15am",
},
```

Use this persisted session expectation:

```ts
collectedFields: {
  date: "2026-07-16",
  time: "1:15am",
  name: "Calendar Customer",
  phone: "+60123456789",
  email: "customer@example.com",
},
```

- [ ] **Step 3: Add conflict and time-off assertions to the same booking path**

Immediately after the booking is created, recheck the selected interval:

```ts
await expect(authed.mutation(
  api.appointmentBooking.calendarManualBooking.checkAvailability,
  selection,
)).resolves.toEqual({
  available: false,
  message: "That slot is no longer available.",
});
```

Then insert time off for a different off-hours interval and verify it is unavailable:

```ts
const timeOffStartAt = Date.UTC(2026, 6, 16, 3, 0, 0);
const timeOffEndAt = Date.UTC(2026, 6, 16, 3, 45, 0);
await t.run(async (ctx) => {
  await ctx.db.insert("userTimeOff", {
    userScheduleId: fixture.userScheduleId,
    startAt: timeOffStartAt,
    endAt: timeOffEndAt,
  });
});
await expect(authed.mutation(
  api.appointmentBooking.calendarManualBooking.checkAvailability,
  {
    ...selection,
    startAt: timeOffStartAt,
    endAt: timeOffEndAt,
  },
)).resolves.toEqual({
  available: false,
  message: "That slot is no longer available.",
});
```

This is a characterization test of the existing backend contract, so it is expected to pass without production Convex changes. A failure means the approved no-schema-change design assumption is wrong; stop and diagnose before modifying the slot generator.

- [ ] **Step 4: Run the Convex characterization test**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/calendarManualBooking.test.ts
```

Expected: the customer-direct booking test PASSes at 1:15am, then proves both the created-event conflict and explicit time off return unavailable.

- [ ] **Step 5: Verify Convex test lint and LOC**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/calendarManualBooking.test.ts && wc -l convex/calendarManualBooking.test.ts
```

Expected: ESLint exits 0 and the test remains 300 lines or fewer.

- [ ] **Step 6: Commit the booking contract coverage**

```bash
git add convex/calendarManualBooking.test.ts
git commit -m "Test all-day booking availability"
```

### Task 4: Integrated verification and continuity handoff

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: all production and test changes from Tasks 1–3.
- Produces: one verified implementation state and a compaction-safe receipt.

- [ ] **Step 1: Run all focused tests together**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/scheduleShiftDrafts.test.ts src/components/WeeklyAvailabilityEditor.test.ts convex/calendarManualBooking.test.ts
```

Expected: all focused tests PASS with no warnings or unhandled errors.

- [ ] **Step 2: Run targeted lint**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/lib/scheduleShiftDrafts.ts src/lib/scheduleShiftDrafts.test.ts src/lib/scheduleUtils.ts src/lib/scheduleTimeOffUtils.ts src/components/WeeklyAvailabilityEditor.tsx src/components/WeeklyAvailabilityEditor.test.ts src/pages/ScheduleUserAvailabilityPage.tsx convex/calendarManualBooking.test.ts
```

Expected: ESLint exits 0.

- [ ] **Step 3: Run the production build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: TypeScript project build and Vite production build both exit 0.

- [ ] **Step 4: Verify whitespace and touched-file LOC**

Run:

```bash
git diff --check && wc -l src/lib/scheduleShiftDrafts.ts src/lib/scheduleUtils.ts src/lib/scheduleTimeOffUtils.ts src/components/WeeklyAvailabilityEditor.tsx src/pages/ScheduleUserAvailabilityPage.tsx convex/calendarManualBooking.test.ts
```

Expected: `git diff --check` exits 0 and every listed code file is 300 lines or fewer.

- [ ] **Step 5: Update the continuity ledger**

In `CONTINUITY.md`:

- Mark the Available Hours 24/7 implementation as done.
- Record that `0–1440` shifts remain the only persisted all-day contract.
- Record the focused test, lint, build, diff-check, and LOC outcomes with date and provenance tags.
- Keep Snapshot at 25 lines or fewer, Done at 7 bullets or fewer, Working set at 12 paths or fewer, and Receipts at 20 entries or fewer.

- [ ] **Step 6: Commit the verified handoff**

```bash
git add CONTINUITY.md
git commit -m "Document 24/7 availability verification"
```
