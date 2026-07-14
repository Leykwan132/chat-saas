# Create Booking Dialog Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Create booking dialog dimensions stable when a time menu opens, soften its backdrop, and clarify its secondary actions.

**Architecture:** Create booking owns a dedicated absolute portal host within the Radix dialog boundary, while the shared Base UI Combobox makes its positioned popup pointer-interactive. A semantic link color and reusable Button variant provide the requested blue service action without changing the neutral primary palette.

**Tech Stack:** React 19, TypeScript, Radix Dialog, Base UI Combobox, shadcn Button, Tailwind CSS v4, Vitest.

## Global Constraints

- Use Node v22 for every script and test command.
- Keep every code file below 300 lines.
- Keep the backdrop and portal behavior scoped to Create booking.
- Preserve booking values, availability checks, submission behavior, routing, and the shared default Dialog backdrop.
- Use semantic theme colors and existing Button variants instead of local light/dark color overrides.
- Do not add code comments.

---

### Task 1: Add the semantic blue link action

**Files:**
- Modify: `src/index.css:146-180,246-315`
- Modify: `src/components/ui/buttonVariants.ts:7-20`
- Modify: `src/components/inbox/CreateCustomerBookingDialog.tsx:169-176`
- Test: `src/components/inbox/CreateCustomerBookingDialog.test.ts`

**Interfaces:**
- Consumes: Tailwind v4 theme tokens and the existing `Button` `variant` property.
- Produces: `--color-link`, light/dark `--link` values, and `variant="linkAccent"` for reusable blue text actions.

- [x] **Step 1: Write the failing semantic-link test**

Extend the test sources and assertions:

```ts
const buttonVariantsSource = readFileSync(
  new URL('../ui/buttonVariants.ts', import.meta.url),
  'utf8',
);
const themeSource = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

expect(source).toContain('variant="linkAccent"');
expect(source).not.toContain('className="h-auto p-0 text-primary"');
expect(buttonVariantsSource).toContain('linkAccent: "text-link underline-offset-4 hover:text-link/80 hover:underline"');
expect(themeSource).toContain('--color-link: var(--link);');
expect(themeSource.match(/--link:/g)).toHaveLength(2);
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/CreateCustomerBookingDialog.test.ts
```

Expected: FAIL because `linkAccent` and the semantic link tokens do not exist.

- [x] **Step 3: Add the semantic token and Button variant**

Add the Tailwind token mapping inside `@theme inline`:

```css
--color-link: var(--link);
```

Add the light token inside `:root`:

```css
--link: oklch(0.546 0.245 262.881);
```

Add the dark token inside `.dark`:

```css
--link: oklch(0.707 0.165 254.624);
```

Add the reusable Button variant:

```ts
linkAccent: "text-link underline-offset-4 hover:text-link/80 hover:underline",
```

Use it in Create booking while retaining only layout classes:

```tsx
<Button asChild variant="linkAccent" size="sm" className="h-auto p-0">
  <Link to={`/dashboard/${agentId}/services/new`}>
    <Plus data-icon="inline-start" aria-hidden="true" />
    Create new service
  </Link>
</Button>
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/CreateCustomerBookingDialog.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit the semantic link action**

```bash
git add src/index.css src/components/ui/buttonVariants.ts src/components/inbox/CreateCustomerBookingDialog.tsx src/components/inbox/CreateCustomerBookingDialog.test.ts
git commit -m "Add semantic booking service link"
```

### Task 2: Stabilize the portal layout and polish the dialog actions

**Files:**
- Modify: `src/components/ui/combobox.tsx:89-123`
- Modify: `src/components/inbox/CreateCustomerBookingDialog.tsx:158-249`
- Test: `src/components/inbox/CreateCustomerBookingDialog.test.ts`

**Interfaces:**
- Consumes: `ComboboxContent.portalContainer`, `DialogContent.overlayClassName`, and the shared `Button` ghost variant.
- Produces: one `comboboxPortalContainerRef` host shared by Start and End time menus without participating in dialog grid layout.

- [x] **Step 1: Write the failing portal and dialog-style assertions**

Add the shared Combobox source and regression assertions:

```ts
const comboboxSource = readFileSync(
  new URL('../ui/combobox.tsx', import.meta.url),
  'utf8',
);

expect(source).toContain('overlayClassName="bg-black/10 supports-backdrop-filter:backdrop-blur-none"');
expect(source).toContain('<div ref={comboboxPortalContainerRef} className="pointer-events-none absolute inset-0" />');
expect(source).not.toContain('<DialogContent ref={comboboxPortalContainerRef}');
expect(source).toContain('<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>');
expect(comboboxSource).toContain('className="pointer-events-auto isolate z-50"');
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/CreateCustomerBookingDialog.test.ts
```

Expected: FAIL because the dialog content is still the portal target, the default overlay is still active, Cancel is outlined, and the Combobox positioner does not restore pointer events.

- [x] **Step 3: Add the non-layout portal host and scoped dialog treatments**

Make the shared Combobox positioner interactive inside a pointer-transparent host:

```tsx
<ComboboxPrimitive.Positioner
  side={side}
  sideOffset={sideOffset}
  align={align}
  alignOffset={alignOffset}
  anchor={anchor}
  className="pointer-events-auto isolate z-50"
>
```

Move the portal ref off `DialogContent`, apply the local backdrop, and mount the dedicated host first:

```tsx
<DialogContent
  className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
  overlayClassName="bg-black/10 supports-backdrop-filter:backdrop-blur-none"
>
  <div ref={comboboxPortalContainerRef} className="pointer-events-none absolute inset-0" />
  <DialogHeader><DialogTitle>Create booking</DialogTitle></DialogHeader>
```

Keep both time fields pointed at `comboboxPortalContainerRef`. Change only Cancel to the neutral ghost treatment:

```tsx
<DialogFooter>
  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
  <Button type="button" disabled={busy || !selectionAvailable} onClick={() => void handleCreate()}>Create booking</Button>
</DialogFooter>
```

- [x] **Step 4: Run focused booking tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/EditableTimeCombobox.test.ts src/components/inbox/ManualBookingScheduleField.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts
```

Expected: 3 test files pass with 4 tests.

- [x] **Step 5: Run final verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/ui/buttonVariants.ts src/components/ui/combobox.tsx src/components/EditableTimeCombobox.tsx src/components/inbox/ManualBookingScheduleField.tsx src/components/inbox/CreateCustomerBookingDialog.tsx src/components/EditableTimeCombobox.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts
```

Expected: exit 0 with no lint errors.

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vite build
```

Expected: exit 0; the existing large-chunk advisory may remain.

Run:

```bash
git diff --check
wc -l src/components/ui/buttonVariants.ts src/components/ui/combobox.tsx src/components/EditableTimeCombobox.tsx src/components/inbox/ManualBookingScheduleField.tsx src/components/inbox/CreateCustomerBookingDialog.tsx
```

Expected: `git diff --check` has no output and every code file is below 300 lines.

- [x] **Step 6: Commit the dialog portal and action polish**

```bash
git add src/components/ui/combobox.tsx src/components/inbox/CreateCustomerBookingDialog.tsx src/components/inbox/CreateCustomerBookingDialog.test.ts CONTINUITY.md
git commit -m "Polish Create booking dialog"
```
