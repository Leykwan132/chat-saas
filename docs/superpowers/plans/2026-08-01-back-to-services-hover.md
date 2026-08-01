# Back to Services Hover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the tinted hover background from the service detail page’s “Back to Services” link while retaining a darker text and icon hover state.

**Architecture:** Keep the existing shadcn ghost button and override only its hover background at the call site. Protect the user-visible interaction with a focused rendered-component regression test.

**Tech Stack:** React, React Router, Tailwind CSS, Vitest, Testing Library

## Global Constraints

- Use Node.js v22 for every script and test command.
- Change only the service detail page’s “Back to Services” control.
- Preserve existing navigation, layout, focus behavior, and semantics.
- Keep code files under 300 lines and avoid comments.

---

### Task 1: Back to Services hover behavior

**Files:**
- Create: `src/pages/ServicePage.test.tsx`
- Modify: `src/pages/ServicePage.tsx:190`

**Interfaces:**
- Consumes: the rendered `ServicePage` route and existing `Button` styling API.
- Produces: a “Back to Services” link whose hover background is transparent and whose hover foreground is darker.

- [x] **Step 1: Write the failing test**

Render `ServicePage` with the route and application providers it requires, find the “Back to Services” link by accessible name, and assert that its class list includes `hover:bg-transparent`, `dark:hover:bg-transparent`, and `hover:text-foreground`.

- [x] **Step 2: Run the test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ServicePage.test.tsx`

Expected: FAIL because the link does not yet override the ghost variant’s hover background.

- [x] **Step 3: Write the minimal implementation**

Add `hover:bg-transparent dark:hover:bg-transparent` to the existing `Button` class list without changing its other properties.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ServicePage.test.tsx`

Expected: PASS.

- [x] **Step 5: Run the relevant page test group**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ServicePage.test.tsx src/pages/pageHeaderChrome.test.ts`

Expected: PASS.
