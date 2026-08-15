# Service Details Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open every service detail page on the Service details section and label its name field `Name`.

**Architecture:** The workflow already navigates to the service detail route, so the service editor alone determines the first pane. Its initial section state will select `details`; the existing field component will use concise copy. Static server rendering will assert the user-visible initial pane and name label.

**Tech Stack:** React, TypeScript, Vitest, React DOM server rendering.

## Global Constraints

- Keep workflow routing, booking-team assignments, service data, save behavior, section ordering, and icons unchanged.
- Run Node tooling with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Keep source files below the project 300-line code limit and add no comments.
- Do not stage unrelated `pricing-knowledge-base-updated.md`.

---

### Task 1: Default Service Details Pane

**Files:**
- Modify: `src/components/ServiceForm.tsx:36`
- Modify: `src/components/services/serviceFormShared.tsx:386`
- Modify: `src/components/ServiceForm.test.tsx:7-29`

**Interfaces:**
- Consumes: `ServiceFormSection` union containing `details`, `timing`, `assignment`, and `data`.
- Produces: `ServiceForm` static markup with the Service details navigation control selected and `ServiceDetailsFields` visible initially.

- [ ] **Step 1: Write the failing regression test**

Replace the initial-section assertions in `src/components/ServiceForm.test.tsx` with:

```tsx
  const selectedNavigationItem = markup.match(/<button[^>]*aria-pressed="true"[^>]*>[\s\S]*?<\/button>/)?.[0];

  expect(selectedNavigationItem).toContain('Service details');
  expect(markup).toContain('>Name</span>');
  expect(markup).not.toContain('Service teammates');
  expect(markup).not.toContain('Service name');
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ServiceForm.test.tsx`

Expected: FAIL because the selected navigation item is Booking team, the Service teammates fields render, and the label is Service name.

- [ ] **Step 3: Implement the minimal user-visible change**

In `src/components/ServiceForm.tsx`, change:

```tsx
const [activeSection, setActiveSection] = useState<ServiceFormSection>('assignment');
```

to:

```tsx
const [activeSection, setActiveSection] = useState<ServiceFormSection>('details');
```

In `src/components/services/serviceFormShared.tsx`, change:

```tsx
<span className="text-sm font-medium">Service name</span>
```

to:

```tsx
<span className="text-sm font-medium">Name</span>
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ServiceForm.test.tsx`

Expected: PASS with the default Service details pane and `Name` label rendered.

- [ ] **Step 5: Commit the implementation**

```bash
git add src/components/ServiceForm.tsx src/components/services/serviceFormShared.tsx src/components/ServiceForm.test.tsx
git commit -m "fix: open service details by default"
```

### Task 2: Verify and Record the Approved Navigation Behavior

**Files:**
- Modify: `CONTINUITY.md`
- Create: `docs/superpowers/plans/2026-08-14-service-details-default.md`

**Interfaces:**
- Consumes: Task 1's Service details default.
- Produces: A durable decision and verification receipt for the customer-visible service-detail landing state.

- [ ] **Step 1: Record the decision**

Add this active decision to `CONTINUITY.md`:

```md
- 2026-08-14 D027 ACTIVE [USER] Workflow service links open the service detail page on its Service details pane; its name field label is Name.
```

- [ ] **Step 2: Run validation**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ServiceForm.test.tsx && bunx tsc --noEmit && git diff --check`

Expected: all commands exit 0.

- [ ] **Step 3: Run the full regression suite**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun run test`

Expected: all application, Convex, and Docs tests pass.

- [ ] **Step 4: Commit the plan and ledger**

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-14-service-details-default.md
git commit -m "docs: record service details default"
```
