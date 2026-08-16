# Create Service Assignment Card Height Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Create Service assignment cards use their content height instead of reserving empty lower space.

**Architecture:** Keep the shared `Field` and RadioGroup structure unchanged. Remove only the `min-h-32` layout utility from the assignment-card Field; grid stretch keeps sibling cards equal-height in their row.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, react-dom/server.

## Global Constraints

- Preserve assignment selection, radio controls, and the locked Team upgrade overlay.
- Preserve equal-height sibling cards in the desktop grid row.
- Remove the forced minimum height from assignment cards.
- Run commands with Node v22 using `source ~/.nvm/nvm.sh && nvm use 22`.

---

### Task 1: Remove forced assignment-card height

**Files:**

- Modify: `src/components/services/CreateServiceAssignmentCards.tsx`
- Modify: `src/components/services/CreateServiceAssignmentCards.test.tsx`

**Interfaces:**

- Consumes: the existing `CreateServiceAssignmentCards` props and shared Field/RadioGroup components.
- Produces: content-sized assignment cards with unchanged choice and upgrade behavior.

- [x] **Step 1: Add the failing rendered-card assertion**

```tsx
expect(markup).not.toContain('min-h-32');
```

Add it to the existing test that renders the selected personal card and locked Team card.

- [x] **Step 2: Run the assignment-card test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/services/CreateServiceAssignmentCards.test.tsx`

Expected: FAIL because the rendered Field contains `min-h-32`.

- [x] **Step 3: Remove the forced height utility**

```tsx
<Field orientation="horizontal" className="relative flex-col items-start gap-3">
```

Do not change the grid, radio control, upgrade overlay, or content order.

- [x] **Step 4: Run the assignment-card test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/services/CreateServiceAssignmentCards.test.tsx`

Expected: PASS.

- [x] **Step 5: Run focused verification and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/services/CreateServiceAssignmentCards.test.tsx && git diff --check`

Expected: focused test PASS and no whitespace errors.

```bash
git add src/components/services/CreateServiceAssignmentCards.tsx src/components/services/CreateServiceAssignmentCards.test.tsx CONTINUITY.md docs/superpowers/plans/2026-08-16-create-service-assignment-card-height.md
git commit -m "Tighten service assignment cards"
```
