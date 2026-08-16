# Weekly Availability Time Combobox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace weekly availability time selects with editable, data-compatible comboboxes and refine their visual hierarchy.

**Architecture:** Add a focused `ScheduleTimeCombobox` component that maps the editor’s minutes-from-midnight values to readable labels and normalizes typed clock times back to minute values. Keep `WeeklyAvailabilityEditor` responsible for slot ordering and start/end constraints, then replace only its time controls and typography classes.

**Tech Stack:** React, TypeScript, Base UI Combobox, Tailwind CSS, Vitest.

## Global Constraints

- Keep the persisted schedule model as minutes from midnight.
- Preserve the existing 15-minute preset options, multiple-slot controls, 24/7 behaviour, timezone controls, and save flow.
- Accept valid 12-hour and 24-hour typed clock values and do not commit invalid input.
- Keep code files under 300 lines and add no dependencies.
- Run commands with Node v22 using `source ~/.nvm/nvm.sh && nvm use 22`.

---

### Task 1: Add the reusable schedule-time combobox

**Files:**

- Create: `src/components/ScheduleTimeCombobox.tsx`
- Create: `src/components/ScheduleTimeCombobox.test.tsx`

**Interfaces:**

- Consumes: `calendarTimeLabelToMinutes(value: string): number | null` from `src/lib/calendarTimeUtils.ts` and `formatMinutesCalLabel(minutes: number): string` from `src/lib/scheduleUtils.ts`.
- Produces: `ScheduleTimeCombobox({ value, options, maxValue, ariaLabel, onChange })`, where `onChange` receives a valid minutes-from-midnight value.

- [x] **Step 1: Write failing combobox behaviour tests**

```tsx
test('commits a valid typed custom time as minutes from midnight', () => {
  const onChange = vi.fn();
  const { getByLabelText } = render(<ScheduleTimeCombobox {...props} onChange={onChange} />);

  fireEvent.change(getByLabelText('Monday start time'), { target: { value: '9:07pm' } });
  fireEvent.keyDown(getByLabelText('Monday start time'), { key: 'Enter' });

  expect(onChange).toHaveBeenCalledWith(21 * 60 + 7);
});

test('does not commit an invalid typed time', () => {
  const onChange = vi.fn();
  const { getByLabelText } = render(<ScheduleTimeCombobox {...props} onChange={onChange} />);

  fireEvent.change(getByLabelText('Monday start time'), { target: { value: '25:00' } });
  fireEvent.blur(getByLabelText('Monday start time'));

  expect(onChange).not.toHaveBeenCalled();
});
```

- [x] **Step 2: Run the new test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ScheduleTimeCombobox.test.tsx`

Expected: FAIL because `ScheduleTimeCombobox` does not exist.

- [x] **Step 3: Implement compatible editable time selection**

```tsx
const normalizedMinutes = calendarTimeLabelToMinutes(inputValue);

const commitTypedValue = () => {
  if (normalizedMinutes === null || normalizedMinutes > maxValue) return;
  onChange(normalizedMinutes);
  setInputValue(formatMinutesCalLabel(normalizedMinutes));
};
```

Use the shared `Combobox`, `ComboboxInput`, `ComboboxContent`, `ComboboxList`, and `ComboboxItem` primitives. Pass structured time options so duplicate display labels retain unique minute values. Commit a valid entry on Enter or blur and update the input immediately when an option is selected.

- [x] **Step 4: Run the combobox tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ScheduleTimeCombobox.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit the reusable component**

```bash
git add src/components/ScheduleTimeCombobox.tsx src/components/ScheduleTimeCombobox.test.tsx
git commit -m "Add schedule time combobox"
```

### Task 2: Integrate the combobox into weekly availability

**Files:**

- Modify: `src/components/WeeklyAvailabilityEditor.tsx:1-280`
- Modify: `src/components/WeeklyAvailabilityEditor.test.tsx:1-100`

**Interfaces:**

- Consumes: `ScheduleTimeCombobox` from `src/components/ScheduleTimeCombobox.tsx`.
- Produces: weekly availability rows with editable start/end time controls, standard-size day labels, larger time text, and shared normal-size switches.

- [x] **Step 1: Write the failing editor integration test**

```tsx
it('uses editable time comboboxes with standard day labels and larger time text', () => {
  const markup = renderToStaticMarkup(createElement(WeeklyAvailabilityEditor, availableMondayProps));

  expect(markup).toContain('aria-label="Monday start time"');
  expect(markup).toContain('aria-label="Monday end time"');
  expect(markup).toContain('text-base');
  expect(markup).not.toContain('text-lg font-medium');
});
```

- [x] **Step 2: Run the editor test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WeeklyAvailabilityEditor.test.tsx`

Expected: FAIL because the editor still renders Select triggers and `text-lg` day labels.

- [x] **Step 3: Replace Select controls and tune hierarchy**

```tsx
<ScheduleTimeCombobox
  value={shift.startMinutes}
  options={timeOptions.filter((option) => Number(option.value) < MINUTES_PER_DAY)}
  maxValue={MINUTES_PER_DAY - 1}
  ariaLabel={`${dayLabel} start time`}
  onChange={(startMinutes) => updateStartTime(startMinutes)}
/>
```

Use the matching end-time option list with `maxValue={MINUTES_PER_DAY}`. Retain the existing correction when a newly selected start would be at or after the end. Change day labels to `text-base font-medium`, and give the combobox input `text-base`; do not apply size classes to either shared Switch.

- [x] **Step 4: Run focused regression tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ScheduleTimeCombobox.test.tsx src/components/WeeklyAvailabilityEditor.test.tsx && git diff --check`

Expected: PASS with no whitespace errors.

- [x] **Step 5: Update continuity and commit integration**

Add the approved time-combobox and hierarchy decision to `CONTINUITY.md` with a 2026-08-16 `[USER]` provenance tag.

```bash
git add src/components/WeeklyAvailabilityEditor.tsx src/components/WeeklyAvailabilityEditor.test.tsx CONTINUITY.md docs/superpowers/plans/2026-08-16-weekly-availability-time-combobox.md
git commit -m "Refine weekly availability controls"
```
