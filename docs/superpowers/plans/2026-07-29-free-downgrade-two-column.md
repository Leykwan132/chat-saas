# Free Downgrade Two-Column Warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Free downgrade warning shorter and display its two impact sections side by side when space permits.

**Architecture:** Keep all content and rendering inside the existing `FreePlanDowngradeWarningDialog`. Change only responsive layout classes, dialog width, and warning copy; billing and Stripe behavior remain untouched.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn Dialog, Vitest, Testing Library

## Global Constraints

- Medium and larger screens display “What you’ll lose” and “What will be removed” as two columns.
- Narrow screens stack both sections.
- The warning says: `Free keeps only your Personal workspace. Everything in your other workspaces will be permanently deleted.`
- Existing impact rows, actions, scrolling, and billing behavior remain unchanged.
- Use 40px between columns, 16px between list rows, and 24px between the dialog's major sections.
- Use Node.js 22 for every test and build command.

---

### Task 1: Responsive downgrade-warning layout

**Files:**
- Modify: `src/components/billing/FreePlanDowngradeWarningDialog.tsx`
- Test: `src/components/billing/FreePlanDowngradeWarningDialog.test.tsx`

**Interfaces:**
- Consumes: `FreePlanDowngradeWarningContent` and its existing props.
- Produces: the same exported components and props with updated presentation.

- [x] **Step 1: Write the failing regression test**

Assert the rendered description is:

```text
Free keeps only your Personal workspace. Everything in your other workspaces will be permanently deleted.
```

Assert the dialog source contains a responsive two-column grid and no longer uses the narrow `sm:max-w-md` width.

- [x] **Step 2: Run the regression test and verify failure**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/billing/FreePlanDowngradeWarningDialog.test.tsx
```

Expected: failure because the old warning and single-column layout remain.

- [x] **Step 3: Implement the minimal presentation change**

Use a wider dialog:

```tsx
<DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
```

Use the approved description and responsive layout:

```tsx
<DialogDescription>
  Free keeps only your Personal workspace. Everything in your other
  workspaces will be permanently deleted.
</DialogDescription>

<div className="grid gap-6 md:grid-cols-2">
```

- [x] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/billing/FreePlanDowngradeWarningDialog.test.tsx src/components/billing/adjustPlanFlow.test.ts src/components/SubscriptionPlanPicker.test.tsx
```

Expected: all focused tests pass.

- [x] **Step 5: Run production verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: TypeScript and Vite production build pass.

### Task 2: Increase visual spacing

**Files:**
- Modify: `src/components/billing/FreePlanDowngradeWarningDialog.tsx`
- Test: `src/components/billing/FreePlanDowngradeWarningDialog.test.tsx`

**Interfaces:**
- Consumes: the responsive two-column warning from Task 1.
- Produces: the same components and behavior with roomier layout.

- [x] **Step 1: Write the failing spacing regression**

Assert the source uses `gap-y-6 md:gap-x-10` for the impact grid, `gap-4` for each section and list, and `gap-6` for the dialog content.

- [x] **Step 2: Run the regression and verify failure**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/billing/FreePlanDowngradeWarningDialog.test.tsx
```

Expected: failure because the layout still uses smaller gaps.

- [x] **Step 3: Apply the approved spacing**

Use:

```tsx
<DialogContent className="max-h-[calc(100svh-2rem)] gap-6 overflow-y-auto sm:max-w-2xl">
<div className="grid gap-y-6 md:grid-cols-2 md:gap-x-10">
<section className="flex flex-col gap-4">
<div className="flex flex-col gap-4">
```

- [x] **Step 4: Run focused tests and the production build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/billing/FreePlanDowngradeWarningDialog.test.tsx src/components/billing/adjustPlanFlow.test.ts src/components/SubscriptionPlanPicker.test.tsx && bun run build
```

Expected: 19 focused tests and the production build pass.

### Task 3: Increase container padding

**Files:**
- Modify: `src/components/billing/FreePlanDowngradeWarningDialog.tsx`
- Test: `src/components/billing/FreePlanDowngradeWarningDialog.test.tsx`

**Interfaces:**
- Consumes: the roomier two-column warning from Task 2.
- Produces: the same modal with 28px of scoped inner padding.

- [x] **Step 1: Write the failing padding regression**

Assert the downgrade dialog source contains `p-7` on its `DialogContent`.

- [x] **Step 2: Run the regression and verify failure**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/billing/FreePlanDowngradeWarningDialog.test.tsx
```

Expected: failure because the shared 24px padding is still inherited.

- [x] **Step 3: Apply scoped padding**

Add `p-7` to the existing `DialogContent` class list without modifying `src/components/ui/dialog.tsx`.

- [x] **Step 4: Run focused tests and the production build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/billing/FreePlanDowngradeWarningDialog.test.tsx src/components/billing/adjustPlanFlow.test.ts src/components/SubscriptionPlanPicker.test.tsx && bun run build
```

Expected: 19 focused tests and the production build pass.
