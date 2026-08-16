# Unblurred Modal Backdrops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every application Dialog and Sheet backdrop use Create Booking's light, unblurred dimming treatment.

**Architecture:** The shared Dialog and Sheet overlay primitives remain the sole source of default backdrop styling. Dialogs that currently override backdrop opacity or blur will remove those visual overrides, while a layering-only override remains intact. Existing Radix portal, focus, animation, and close behavior are unchanged.

**Tech Stack:** React, Radix UI, shadcn/ui source components, Tailwind CSS, Vitest.

## Global Constraints

- Use `bg-black/10` with `supports-backdrop-filter:backdrop-blur-none` for dialog and sheet backdrops.
- Keep existing overlay animation, focus, portal, and z-index behavior unchanged.
- Do not alter content-level blur effects or non-modal overlays.
- Use Node 22 for test and build commands.

---

### Task 1: Characterize the shared overlay contract

**Files:**
- Modify: `src/components/ui/dialog.test.ts`
- Create: `src/components/ui/sheet.test.ts`

**Interfaces:**
- Consumes: `DialogOverlay` and `SheetOverlay` class contracts in `src/components/ui/dialog.tsx` and `src/components/ui/sheet.tsx`.
- Produces: regression checks that fail if either shared overlay reintroduces a darker or blurred backdrop.

- [x] **Step 1: Write the failing tests**

Add this test to `src/components/ui/dialog.test.ts`:

```ts
test('uses the shared light unblurred dialog backdrop', () => {
  expect(dialogSource).toContain('bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-none');
  expect(dialogSource).not.toContain('bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm');
});
```

Create `src/components/ui/sheet.test.ts` with:

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const sheetSource = readFileSync(new URL('./sheet.tsx', import.meta.url), 'utf8');

test('uses the shared light unblurred sheet backdrop', () => {
  expect(sheetSource).toContain('bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-none');
  expect(sheetSource).not.toContain('bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm');
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ui/dialog.test.ts src/components/ui/sheet.test.ts
```

Expected: both tests fail because each shared overlay still uses `bg-black/30` and `backdrop-blur-sm`.

### Task 2: Centralize the unblurred backdrop treatment

**Files:**
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/sheet.tsx`
- Modify: `src/components/booking/CreateBookingDialog.tsx`
- Modify: `src/components/services/CreateServiceDialog.tsx`
- Modify: `src/components/TestChatWindow.tsx`
- Modify: `src/components/booking/CreateBookingDialog.test.ts`
- Modify: `src/components/inbox/CreateCustomerBookingDialog.test.ts`
- Modify: `src/components/services/CreateServiceDialog.test.tsx`

**Interfaces:**
- Consumes: `DialogContent`'s optional `overlayClassName` prop and `SheetContent`'s shared `SheetOverlay`.
- Produces: all standard dialogs and sheets inherit `bg-black/10 supports-backdrop-filter:backdrop-blur-none`; specialized layering overrides may continue to pass z-index-only classes.

- [x] **Step 1: Implement the shared defaults**

In both `DialogOverlay` and `SheetOverlay`, replace:

```ts
'bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm'
```

with:

```ts
'bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-none'
```

Keep the remaining class names and component props unchanged.

- [x] **Step 2: Remove redundant visual overrides**

Remove `overlayClassName` from `CreateBookingDialog` and `CreateServiceDialog`. Remove the `bg-black/55 supports-backdrop-filter:backdrop-blur-md` override from the fullscreen `TestChatWindow` dialog. Do not remove `overlayClassName="z-[60]"` from `InboxBookingDetailsCard`, because it preserves deliberate stacking rather than changing backdrop appearance.

- [x] **Step 3: Update affected characterization tests**

Replace assertions that require component-level backdrop strings with assertions that the component does not contain an `overlayClassName` visual override. Preserve assertions for other behavior, including Create Service's `rounded-3xl` modal shape.

- [x] **Step 4: Run the focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ui/dialog.test.ts src/components/ui/sheet.test.ts src/components/booking/CreateBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/services/CreateServiceDialog.test.tsx
```

Expected: all focused tests pass.

- [x] **Step 5: Run the production build and inspect the diff**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build && git diff --check
```

Expected: build exits successfully and `git diff --check` prints no errors.

- [x] **Step 6: Commit**

```bash
git add src/components/ui/dialog.tsx src/components/ui/sheet.tsx src/components/ui/dialog.test.ts src/components/ui/sheet.test.ts src/components/booking/CreateBookingDialog.tsx src/components/services/CreateServiceDialog.tsx src/components/TestChatWindow.tsx src/components/booking/CreateBookingDialog.test.ts src/components/inbox/CreateCustomerBookingDialog.test.ts src/components/services/CreateServiceDialog.test.tsx docs/superpowers/plans/2026-08-15-unblurred-modal-backdrops.md CONTINUITY.md
git commit -m "Unify modal backdrops"
```

## Self-Review

- Spec coverage: Task 1 protects the shared dialog and sheet backdrop contract. Task 2 applies the approved light unblurred treatment, removes visual overrides, retains the required z-index-only override, and verifies both targeted tests and the build.
- Placeholder scan: no placeholders, deferred steps, or undefined interfaces remain.
- Type consistency: no public TypeScript interfaces change; `DialogContent` retains its existing optional `overlayClassName` prop for layering use cases.
