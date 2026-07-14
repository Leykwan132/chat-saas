# Manual Booking Compact Time, Date, and Service Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use compact shared time labels with quarter-hour options, show a yearless manual-booking date, and link directly from the booking dialog to Create Service.

**Architecture:** Keep time normalization in `calendarTimeUtils`, expose date-label formatting through an optional `CalendarDatePickerField` property, and keep Service navigation local to the manual booking dialog. Preserve existing stored date/time semantics and booking availability behavior.

**Tech Stack:** React 19, React Router, TypeScript, date-fns, Tailwind CSS v4, shadcn components, Vitest, ESLint, Vite.

## Global Constraints

- Run every script and test under Node v22.
- Keep every code file below 300 lines.
- Do not add comments.
- Preserve permissive time parsing and custom minute input.
- Preserve stored dates as `yyyy-MM-dd`.
- Do not change Convex schemas, booking mutations, availability checks, or duration behavior.
- Do not change the default visible date format for existing non-manual consumers.

---

### Task 1: Compact shared times and quarter-hour options

**Files:**
- Create: `src/lib/calendarTimeUtils.test.ts`
- Create: `src/lib/serviceFormPreferredTimes.test.ts`
- Modify: `src/lib/calendarTimeUtils.ts`
- Modify: `src/lib/serviceForm.ts`
- Modify: `src/components/inbox/manualBookingScheduleModel.test.ts`

**Interfaces:**
- Consumes: existing `formatCalendarTimeOption`, `CALENDAR_TIME_OPTIONS`, `parseCalendarTimeLabel`, `minutesToCalendarTimeLabel`, and Service preferred-time helpers.
- Produces: the same interfaces with compact normalized labels and 96 quarter-hour options.

- [ ] **Step 1: Write failing shared-time tests**

Create `src/lib/calendarTimeUtils.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  CALENDAR_TIME_OPTIONS,
  calendarTimeLabelToMinutes,
  formatCalendarTimeOption,
  parseCalendarTimeLabel,
} from './calendarTimeUtils';

describe('calendar time labels', () => {
  it('uses compact lowercase meridiem labels', () => {
    expect(formatCalendarTimeOption(23 * 60 + 20)).toBe('11:20pm');
    expect(parseCalendarTimeLabel('11:20 PM')?.label).toBe('11:20pm');
    expect(parseCalendarTimeLabel('23:20')?.label).toBe('11:20pm');
  });

  it('provides every quarter-hour option', () => {
    expect(CALENDAR_TIME_OPTIONS).toHaveLength(96);
    expect(CALENDAR_TIME_OPTIONS[0]).toBe('12:00am');
    expect(CALENDAR_TIME_OPTIONS[95]).toBe('11:45pm');
    expect(CALENDAR_TIME_OPTIONS.map(calendarTimeLabelToMinutes)).toEqual(
      Array.from({ length: 96 }, (_, index) => index * 15),
    );
  });
});
```

Create `src/lib/serviceFormPreferredTimes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERRED_TIME,
  formatPreferredTimesLabel,
  preferredTimesToMinutes,
} from './serviceForm';

describe('service preferred time labels', () => {
  it('uses compact shared labels while accepting legacy input', () => {
    expect(DEFAULT_PREFERRED_TIME).toBe('10:00am');
    expect(formatPreferredTimesLabel([600, 615])).toBe('10:00am, 10:15am');
    expect(preferredTimesToMinutes(['10:00 AM', '10:15am'])).toEqual([600, 615]);
  });
});
```

Update the end-time assertion in `manualBookingScheduleModel.test.ts`:

```ts
expect(defaultManualBookingEndTime('11:41am', 60)).toBe('12:41pm');
```

- [ ] **Step 2: Run tests and verify red**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/calendarTimeUtils.test.ts src/lib/serviceFormPreferredTimes.test.ts src/components/inbox/manualBookingScheduleModel.test.ts
```

Expected: FAIL because formatting is spaced uppercase, options are half-hourly, and the default Service preferred time is legacy-formatted.

- [ ] **Step 3: Implement compact formatting and quarter-hour options**

Change `formatCalendarTimeOption` and `CALENDAR_TIME_OPTIONS` to:

```ts
export function formatCalendarTimeOption(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'pm' : 'am';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')}${period}`;
}

export const CALENDAR_TIME_OPTIONS = Array.from({ length: 96 }, (_, index) =>
  formatCalendarTimeOption(index * 15),
);
```

Change the Service default to:

```ts
export const DEFAULT_PREFERRED_TIME = '10:00am';
```

Do not change `parseCalendarTimeLabel`; its existing normalization remains permissive.

- [ ] **Step 4: Run tests and verify green**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/calendarTimeUtils.test.ts src/lib/serviceFormPreferredTimes.test.ts src/components/inbox/manualBookingScheduleModel.test.ts
```

Expected: 3 files and 8 tests pass.

### Task 2: Configurable date label with manual-booking format

**Files:**
- Create: `src/components/calendar/CalendarDatePickerField.test.ts`
- Modify: `src/components/calendar/CalendarDatePickerField.tsx`
- Modify: `src/components/inbox/ManualBookingScheduleField.test.ts`
- Modify: `src/components/inbox/ManualBookingScheduleField.tsx`

**Interfaces:**
- Consumes: existing `CalendarDatePickerField` props.
- Produces: optional `displayFormat?: string`, defaulting to `MMM d, yyyy`.

- [ ] **Step 1: Write failing date-format assertions**

Create `CalendarDatePickerField.test.ts` as a source regression:

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./CalendarDatePickerField.tsx', import.meta.url), 'utf8');

test('supports a local display format without changing stored dates', () => {
  expect(source).toContain("displayFormat = 'MMM d, yyyy'");
  expect(source).toContain('displayFormat?: string');
  expect(source).toContain('format(selected, displayFormat)');
  expect(source).toContain("onChange(format(date, 'yyyy-MM-dd'))");
});
```

Add to `ManualBookingScheduleField.test.ts`:

```ts
expect(source).toContain('displayFormat="EEEE, d MMMM"');
```

- [ ] **Step 2: Run tests and verify red**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarDatePickerField.test.ts src/components/inbox/ManualBookingScheduleField.test.ts
```

Expected: FAIL because `displayFormat` does not exist.

- [ ] **Step 3: Add and consume the display format property**

Add the property in `CalendarDatePickerField`:

```tsx
displayFormat = 'MMM d, yyyy',
```

Add `displayFormat?: string` to the inline props type and render:

```tsx
{format(selected, displayFormat)}
```

Use it in `ManualBookingScheduleField`:

```tsx
<CalendarDatePickerField
  value={date}
  onChange={onDateChange}
  showLabel={false}
  displayFormat="EEEE, d MMMM"
/>
```

- [ ] **Step 4: Run tests and verify green**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarDatePickerField.test.ts src/components/inbox/ManualBookingScheduleField.test.ts
```

Expected: 2 tests pass.

### Task 3: Create Service navigation from manual booking

**Files:**
- Modify: `src/components/inbox/CreateCustomerBookingDialog.test.ts`
- Modify: `src/components/inbox/CreateCustomerBookingDialog.tsx`

**Interfaces:**
- Consumes: React Router `Link` and `useParams`, existing Button and Lucide Plus.
- Produces: no new exported interface; adds direct navigation to the current agent's Create Service route.

- [ ] **Step 1: Write failing navigation assertions**

Add to `CreateCustomerBookingDialog.test.ts`:

```ts
expect(source).toContain("import { Link, useParams } from 'react-router'");
expect(source).toContain("import { Plus } from 'lucide-react'");
expect(source).toContain("throw new Error('Missing agent ID')");
expect(source).toContain('to={`/dashboard/${agentId}/services/new`}');
expect(source).toContain('Create new service');
```

- [ ] **Step 2: Run the test and verify red**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/CreateCustomerBookingDialog.test.ts
```

Expected: FAIL because the Service action and route parameter handling do not exist.

- [ ] **Step 3: Add the Service action**

Import `Link`, `useParams`, and `Plus`. Inside the component, require the route parameter:

```ts
const { agentId } = useParams();
if (!agentId) throw new Error('Missing agent ID');
```

Replace the Service label with:

```tsx
<div className="flex items-center justify-between gap-3">
  <Label>Service</Label>
  <Button asChild type="button" variant="outline" size="sm" className="h-8 gap-1.5">
    <Link to={`/dashboard/${agentId}/services/new`}>
      <Plus className="size-3.5" aria-hidden="true" />
      Create new service
    </Link>
  </Button>
</div>
```

- [ ] **Step 4: Run the test and verify green**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/CreateCustomerBookingDialog.test.ts
```

Expected: 1 test passes.

### Task 4: Full verification and main commit

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: completed Tasks 1 through 3.
- Produces: verified main-branch commit and continuity receipt.

- [ ] **Step 1: Run focused tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/calendarTimeUtils.test.ts src/lib/serviceFormPreferredTimes.test.ts src/components/calendar/CalendarDatePickerField.test.ts src/components/EditableTimeCombobox.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/inbox/ManualBookingScheduleField.test.ts src/components/inbox/manualBookingScheduleModel.test.ts
```

Expected: 7 files and 12 tests pass.

- [ ] **Step 2: Run static verification**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/lib/calendarTimeUtils.ts src/lib/calendarTimeUtils.test.ts src/lib/serviceForm.ts src/lib/serviceFormPreferredTimes.test.ts src/components/calendar/CalendarDatePickerField.tsx src/components/calendar/CalendarDatePickerField.test.ts src/components/inbox/ManualBookingScheduleField.tsx src/components/inbox/ManualBookingScheduleField.test.ts src/components/inbox/CreateCustomerBookingDialog.tsx src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/inbox/manualBookingScheduleModel.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
wc -l src/lib/calendarTimeUtils.ts src/lib/serviceForm.ts src/components/calendar/CalendarDatePickerField.tsx src/components/inbox/ManualBookingScheduleField.tsx src/components/inbox/CreateCustomerBookingDialog.tsx
```

Expected: ESLint and build exit 0, diff check prints nothing, and every code file is below 300 lines.

- [ ] **Step 3: Update continuity and commit**

Record the completed UI and verification receipt in `CONTINUITY.md`, then commit all touched implementation and test files with:

```bash
git add CONTINUITY.md src/lib/calendarTimeUtils.ts src/lib/calendarTimeUtils.test.ts src/lib/serviceForm.ts src/lib/serviceFormPreferredTimes.test.ts src/components/calendar/CalendarDatePickerField.tsx src/components/calendar/CalendarDatePickerField.test.ts src/components/inbox/ManualBookingScheduleField.tsx src/components/inbox/ManualBookingScheduleField.test.ts src/components/inbox/CreateCustomerBookingDialog.tsx src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/inbox/manualBookingScheduleModel.test.ts
git commit -m "Add compact manual booking controls"
```
