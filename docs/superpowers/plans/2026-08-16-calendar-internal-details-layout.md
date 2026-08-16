# Calendar Internal Details Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place event summaries beside internal staff details and ensure existing event times are shown when an event is edited.

**Architecture:** Keep time-value normalization at the shared `TimeSelectInput` boundary so every calendar editor receives an option value that its select can render. Keep the event-details composition in `CalendarEventDetailsBody`, using a conditional responsive grid so an absent summary does not reserve an empty desktop column.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, lucide-react.

## Global Constraints

- Preserve event data, permissions, actions, and visibility behavior.
- Preserve valid non-15-minute event times by adding their canonical value to the selector options.
- Keep code files under 300 lines and avoid unnecessary dependencies.
- Run commands with Node v22 using `source ~/.nvm/nvm.sh && nvm use 22`.

---

### Task 1: Normalize existing values in the shared time selector

**Files:**

- Create: `src/components/TimeSelectInput.test.tsx`
- Modify: `src/components/TimeSelectInput.tsx`

**Interfaces:**

- Consumes: `parseCalendarTimeLabel(value: string): { label: string } | null` and `CALENDAR_TIME_OPTIONS: string[]` from `src/lib/calendarTimeUtils.ts`.
- Produces: `TimeSelectInput` passes its `SearchableSelect` a canonical selected value and an option list that includes a valid non-standard time.

- [x] **Step 1: Write the failing selector regression test**

```tsx
test('shows a formatted existing time as the selected option', () => {
  const markup = renderToStaticMarkup(
    <TimeSelectInput value="9:00 AM" onChange={() => undefined} />,
  );

  expect(markup).toContain('>9:00am</span>');
  expect(markup).not.toContain('>Select time</span>');
});

test('shows a valid non-standard existing time as the selected option', () => {
  const markup = renderToStaticMarkup(
    <TimeSelectInput value="9:07 AM" onChange={() => undefined} />,
  );

  expect(markup).toContain('>9:07am</span>');
});
```

- [x] **Step 2: Run the new test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/TimeSelectInput.test.tsx`

Expected: FAIL because `TimeSelectInput` passes the raw `9:00 AM`-style value and has no normalized custom-option path.

- [x] **Step 3: Normalize the rendered selector value**

```tsx
const parsedValue = parseCalendarTimeLabel(value);
const normalizedValue = parsedValue?.label ?? value;
const options =
  parsedValue && !CALENDAR_TIME_OPTIONS.includes(normalizedValue)
    ? [{ value: normalizedValue, label: normalizedValue }, ...TIME_SELECT_OPTIONS]
    : TIME_SELECT_OPTIONS;
```

Pass `normalizedValue` and `options` to `SearchableSelect`; keep `onChange` unchanged so saved values remain compatible with `combineDateTimeInTimeZone`.

- [x] **Step 4: Run the selector test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/TimeSelectInput.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit the isolated selector correction**

```bash
git add src/components/TimeSelectInput.tsx src/components/TimeSelectInput.test.tsx
git commit -m "Prefill calendar edit times"
```

### Task 2: Arrange internal event details with neutral content surfaces

**Files:**

- Create: `src/components/calendar/CalendarEventDetailsBody.test.tsx`
- Modify: `src/components/calendar/CalendarEventDetailsBody.tsx`

**Interfaces:**

- Consumes: `AppointmentDetails` and the existing `EventDetailsBody` component.
- Produces: an `Internal details` responsive grid whose left content contains team details and notes; its optional right content contains the Summary.

- [x] **Step 1: Write the failing layout regression test**

```tsx
test('uses a responsive summary column with neutral note and summary content surfaces', () => {
  const markup = renderToStaticMarkup(<EventDetailsBody details={details} />);

  expect(markup).toContain('sm:grid-cols-2');
  expect(markup).toContain('items-start gap-4');
  expect(markup).toContain('rounded-lg bg-muted px-4 py-3');
  expect(markup.indexOf('Internal notes')).toBeLessThan(markup.indexOf('Summary'));
});
```

- [x] **Step 2: Run the layout test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarEventDetailsBody.test.tsx`

Expected: FAIL because the current Summary is below internal content and notes/summary text has no neutral content surface.

- [x] **Step 3: Implement the responsive internal-details composition**

```tsx
<div className={hasSummary ? 'grid grid-cols-1 gap-5 sm:grid-cols-2' : 'flex flex-col gap-5'}>
  <div className="flex flex-col gap-5">...</div>
  {hasSummary ? <SummaryBlock summary={details.description} /> : null}
</div>
```

Update the Notes and Summary blocks to use `items-start`, a top-offset icon, a label, and a `rounded-lg bg-muted px-4 py-3` content surface. Keep the mobile order as team details, notes, then Summary.

- [x] **Step 4: Run the layout test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarEventDetailsBody.test.tsx`

Expected: PASS.

- [x] **Step 5: Run focused verification and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/TimeSelectInput.test.tsx src/components/calendar/CalendarEventDetailsBody.test.tsx && git diff --check`

Expected: all focused tests PASS and no whitespace errors.

```bash
git add src/components/TimeSelectInput.tsx src/components/TimeSelectInput.test.tsx src/components/calendar/CalendarEventDetailsBody.tsx src/components/calendar/CalendarEventDetailsBody.test.tsx CONTINUITY.md docs/superpowers/plans/2026-08-16-calendar-internal-details-layout.md
git commit -m "Refine calendar event details"
```
