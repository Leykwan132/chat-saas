# Calendar Floating New Booking Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the labeled New Booking action to the Calendar sidebar’s absolute bottom-right without obscuring sidebar content.

**Architecture:** `CalendarSidebar` becomes the relative positioning anchor. The existing Button moves from the scrollable content to a sibling after that content, positioned at the sidebar’s bottom-right. Extra scrollable-content bottom padding prevents the View filters from being covered.

**Tech Stack:** React, TypeScript, shadcn/ui Button, Lucide, Vitest, Bun, Node v22.

## Global Constraints

- Run every script with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Reuse the existing shadcn `Button` and Lucide `Plus` icon; do not add a dependency or custom button markup.
- Place the action in the bottom-right of the entire Calendar sidebar with `absolute bottom-4 right-4`.
- Preserve the labeled `New Booking` action, size, and `onCreateBooking` behavior.
- Keep the action hidden without Calendar-management permission.
- Reserve scroll-content space above the floating action.
- Do not add code comments.
- Production availability is UNCONFIRMED, so do not add a release-changelog entry.

---

### Task 1: Float New Booking above Calendar sidebar content

**Files:**
- Modify: `src/components/calendar/CalendarSidebar.test.tsx:22-31`
- Modify: `src/components/calendar/CalendarSidebar.tsx:97-143`

**Interfaces:**
- Consumes: `canManageCalendar: boolean` and `onCreateBooking(): void` from `CalendarSidebarProps`.
- Produces: a permission-gated Button rendered after the scrollable sidebar content at the sidebar’s absolute bottom-right.

- [x] **Step 1: Write the failing sidebar layout test**

Replace the current ordering assertion with assertions that require the View section before the action and require the positioning/reserved-space classes:

```ts
expect(markup.indexOf('>View<')).toBeLessThan(markup.indexOf('New Booking'));
expect(markup).toContain('relative');
expect(markup).toContain('pb-20');
expect(markup).toContain('absolute bottom-4 right-4');
```

- [x] **Step 2: Run the focused test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarSidebar.test.tsx
```

Expected: FAIL because New Booking is currently inside the scrollable content before View and has no bottom-right absolute positioning.

- [x] **Step 3: Move the existing Button**

Make the `<aside>` relative, add `pb-20` to the scrollable-content classes, and remove the inline booking Button. After the scrollable-content closing tag, add the existing permission-gated Button:

```tsx
{canManageCalendar ? (
  <Button
    type="button"
    size="lg"
    className="absolute bottom-4 right-4 h-11 gap-2 px-5 py-3"
    onClick={onCreateBooking}
  >
    <Plus data-icon="inline-start" />
    New Booking
  </Button>
) : null}
```

- [x] **Step 4: Run the focused test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/CalendarSidebar.test.tsx
```

Expected: PASS with every test in the file passing.

- [ ] **Step 5: Check formatting and commit**

Run:

```bash
git diff --check
```

Then commit:

```bash
git add src/components/calendar/CalendarSidebar.tsx src/components/calendar/CalendarSidebar.test.tsx CONTINUITY.md
git commit -m "Float Calendar New Booking action"
```
