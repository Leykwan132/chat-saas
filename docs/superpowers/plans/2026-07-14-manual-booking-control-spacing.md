# Manual Booking Control Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the manual Create booking form roomier, improve Service readability, and widen the time dropdown while preserving its current behavior.

**Architecture:** Keep styling local to `CreateCustomerBookingDialog`, `ManualBookingScheduleField`, and `EditableTimeCombobox`. Extend the existing source-regression tests before applying Tailwind class changes so shared Select and Combobox defaults remain untouched.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn Select, shadcn/Base UI Combobox, Vitest, ESLint, Vite.

## Global Constraints

- Run every script and test under Node v22.
- Keep every code file below 300 lines.
- Do not add comments.
- Keep Clock, Date, Start, separator, and End on one row.
- Keep the Service trigger 40px tall and full width.
- Keep both time controls at least 128px wide.
- Keep each time menu at least 176px wide with non-wrapping items.
- Do not change booking state, availability checks, duration defaults, or shared global Select defaults.

---

### Task 1: Roomier dialog and Service control

**Files:**
- Modify: `src/components/inbox/CreateCustomerBookingDialog.test.ts`
- Modify: `src/components/inbox/CreateCustomerBookingDialog.tsx`

**Interfaces:**
- Consumes: existing `Select`, `SelectTrigger`, `SelectContent`, and `SelectItem` APIs.
- Produces: local Tailwind overrides only; no new exported interface.

- [ ] **Step 1: Write the failing layout assertions**

Add these assertions to `uses shared schedule controls and automatic exact-slot availability`:

```ts
expect(source).toContain('sm:max-w-xl');
expect(source).toContain('<div className="grid gap-5">');
expect(source).toContain('<div className="grid gap-3">');
expect(source).toContain('className="h-10 w-full px-3 text-sm"');
expect(source).toContain('<SelectContent className="text-sm">');
expect(source).toContain('className="py-2.5 text-sm"');
```

- [ ] **Step 2: Run the focused test and verify red**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/CreateCustomerBookingDialog.test.ts
```

Expected: FAIL because the dialog still uses `sm:max-w-lg`, the form uses `gap-4`, and Service uses compact shared Select typography.

- [ ] **Step 3: Apply the local dialog and Service styling**

Change the dialog and form containers to:

```tsx
<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
...
<div className="grid gap-5">
  <div className="grid gap-3">
```

Change the Service Select composition to:

```tsx
<SelectTrigger className="h-10 w-full px-3 text-sm">
  <SelectValue placeholder="Select a service" />
</SelectTrigger>
<SelectContent className="text-sm">
  {options.services.map((item) => (
    <SelectItem className="py-2.5 text-sm" key={item.serviceId} value={item.serviceId}>
      {item.name}
    </SelectItem>
  ))}
</SelectContent>
```

Keep customer-field Select controls unchanged.

- [ ] **Step 4: Run the focused test and verify green**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/CreateCustomerBookingDialog.test.ts
```

Expected: 1 test passes.

### Task 2: Wider schedule controls and time menu

**Files:**
- Modify: `src/components/inbox/ManualBookingScheduleField.test.ts`
- Modify: `src/components/inbox/ManualBookingScheduleField.tsx`
- Modify: `src/components/EditableTimeCombobox.test.ts`
- Modify: `src/components/EditableTimeCombobox.tsx`

**Interfaces:**
- Consumes: existing `EditableTimeCombobox` props and shadcn Combobox composition.
- Produces: unchanged `EditableTimeCombobox` interface with a 128px minimum control width and 176px minimum popup width.

- [ ] **Step 1: Write failing schedule and menu assertions**

Replace the schedule grid assertion with:

```ts
expect(source).toContain('grid-cols-[auto_minmax(0,1.45fr)_minmax(8rem,0.9fr)_auto_minmax(8rem,0.9fr)]');
expect(source).toContain('items-center gap-3');
```

Add these assertions to `EditableTimeCombobox.test.ts`:

```ts
expect(source).toContain('min-w-32');
expect(source).toContain('min-w-44');
expect(source).toContain('whitespace-nowrap');
expect(source).toContain('px-3 py-2.5');
```

- [ ] **Step 2: Run both tests and verify red**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/ManualBookingScheduleField.test.ts src/components/EditableTimeCombobox.test.ts
```

Expected: FAIL because the row uses 8px gaps and zero minimum time widths, and the popup inherits the narrow anchor width.

- [ ] **Step 3: Apply the schedule spacing and menu width**

Change the Schedule wrapper and row to:

```tsx
<div className="grid gap-3">
  <Label>Schedule</Label>
  <div className="grid grid-cols-[auto_minmax(0,1.45fr)_minmax(8rem,0.9fr)_auto_minmax(8rem,0.9fr)] items-center gap-3">
```

Change the Combobox classes to:

```tsx
<ComboboxInput
  className="h-10 min-w-32 w-full rounded-md border-input bg-background"
  ...
/>
<ComboboxContent className="min-w-44 rounded-xl">
  <ComboboxEmpty>Enter a valid time</ComboboxEmpty>
  <ComboboxList className="max-h-60">
    {(option) => (
      <ComboboxItem
        key={option}
        value={option}
        className="whitespace-nowrap rounded-lg px-3 py-2.5 font-normal"
      >
        {option}
      </ComboboxItem>
    )}
  </ComboboxList>
</ComboboxContent>
```

- [ ] **Step 4: Run both tests and verify green**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/ManualBookingScheduleField.test.ts src/components/EditableTimeCombobox.test.ts
```

Expected: 2 tests pass.

### Task 3: Verify and commit the complete visual change

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: completed Tasks 1 and 2.
- Produces: verified main-branch commit and continuity receipt.

- [ ] **Step 1: Run focused booking tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/inbox/ManualBookingScheduleField.test.ts src/components/EditableTimeCombobox.test.ts src/components/inbox/manualBookingScheduleModel.test.ts
```

Expected: 4 files and 8 tests pass.

- [ ] **Step 2: Run static verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/inbox/CreateCustomerBookingDialog.tsx src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/inbox/ManualBookingScheduleField.tsx src/components/inbox/ManualBookingScheduleField.test.ts src/components/EditableTimeCombobox.tsx src/components/EditableTimeCombobox.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
wc -l src/components/inbox/CreateCustomerBookingDialog.tsx src/components/inbox/ManualBookingScheduleField.tsx src/components/EditableTimeCombobox.tsx
```

Expected: ESLint and build exit 0, diff check prints nothing, and every code file is below 300 lines.

- [ ] **Step 3: Update continuity and commit**

Record the completed styling and verification receipt in `CONTINUITY.md`, then run:

```bash
git add CONTINUITY.md src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.tsx src/components/inbox/ManualBookingScheduleField.test.ts src/components/inbox/ManualBookingScheduleField.tsx src/components/EditableTimeCombobox.test.ts src/components/EditableTimeCombobox.tsx
git commit -m "Refine manual booking control spacing"
```
