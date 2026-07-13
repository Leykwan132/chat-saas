# Compact Inbox Booking Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show only Edit booking on the compact booking card above the inbox prompt input while retaining Mark as completed in expanded details.

**Architecture:** Keep the existing expanded action object and completion workflow unchanged. Narrow only `compactActions` so it supplies the edit callback and edit-disabled state.

**Tech Stack:** React, TypeScript, Vitest

## Global Constraints

- Node.js 22 is required for scripts and tests.
- Code files must remain under 300 lines.
- Compact booking actions contain only Edit booking.
- Expanded booking details retain Mark as completed and Edit booking.

---

### Task 1: Narrow Compact Booking Actions

**Files:**
- Create: `src/components/inbox/InboxBookingCompactActions.test.ts`
- Modify: `src/components/inbox/InboxBookingDetailsCard.tsx:109-116`

**Interfaces:**
- Consumes: `BookingDetailsPanelActions` and the existing `variant === 'compact'` branch.
- Produces: `compactActions` containing only `onEditBooking` and `disableEditBooking`.

- [ ] **Step 1: Write the failing source regression**

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./InboxBookingDetailsCard.tsx', import.meta.url), 'utf8');
const compactBranch = source.slice(source.indexOf("if (variant === 'compact')"), source.indexOf('const extraFieldRows'));
const expandedActions = source.slice(source.indexOf('const actions:'), source.indexOf("if (variant === 'compact')"));

test('compact booking card exposes only edit while expanded details retain completion', () => {
  expect(compactBranch).toContain('onEditBooking: handleEditBooking');
  expect(compactBranch).not.toContain('onMarkCompleted');
  expect(expandedActions).toContain('onMarkCompleted');
});
```

- [ ] **Step 2: Run the regression and confirm RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/InboxBookingCompactActions.test.ts`

Expected: FAIL because the compact branch still contains `onMarkCompleted`.

- [ ] **Step 3: Remove completion from `compactActions`**

Change the compact object to:

```ts
const compactActions: BookingDetailsPanelActions | undefined = canManage
  ? {
      onEditBooking: handleEditBooking,
      disableEditBooking: !agentId,
    }
  : undefined;
```

Do not modify the expanded `actions` object or completion dialog.

- [ ] **Step 4: Verify GREEN and quality gates**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/InboxBookingCompactActions.test.ts convex/appointmentBookingComplete.test.ts && bunx eslint src/components/inbox/InboxBookingDetailsCard.tsx src/components/inbox/InboxBookingCompactActions.test.ts && bunx tsc -b --pretty false && git diff --check`

Expected: all commands exit 0.
