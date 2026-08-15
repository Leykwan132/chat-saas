# Service Card Description Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep each service description directly below its title while preserving the fixed card footer.

**Architecture:** `ServiceCard` owns the card's internal vertical layout. Removing the title's flexible growth keeps the text block content-sized while the existing `mt-auto` footer stays pinned to the bottom of the fixed card.

**Tech Stack:** React, Tailwind CSS, Vitest.

## Global Constraints

- Do not change the service card's fixed size, padding, description spacing, or footer behavior.
- Use Node 22 for verification.

---

### Task 1: Align the service text block

**Files:**
- Modify: `src/components/services/ServiceCards.tsx:47`
- Modify: `src/pages/ServicesPage.test.tsx`

**Interfaces:**
- Consumes: `ServiceCard` props `service`, `canManage`, `detailHref`, and `onToggleActive`.
- Produces: a content-sized title that precedes the optional description without affecting the existing footer controls.

- [x] **Step 1: Write the failing regression check**

Add this assertion to the `service cards show status text aligned with their switches` test:

```ts
expect(serviceCardsSource).not.toContain('flex-1 truncate text-sm font-medium text-foreground');
```

- [x] **Step 2: Run the test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ServicesPage.test.tsx
```

Expected: the new assertion fails because the title currently expands with `flex-1`.

- [x] **Step 3: Apply the minimal layout change**

Replace:

```tsx
<h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
```

with:

```tsx
<h3 className="min-w-0 truncate text-sm font-medium text-foreground">
```

- [x] **Step 4: Run the focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ServicesPage.test.tsx && git diff --check
```

Expected: the focused test passes and `git diff --check` prints no errors.

- [x] **Step 5: Commit**

```bash
git add src/components/services/ServiceCards.tsx src/pages/ServicesPage.test.tsx docs/superpowers/plans/2026-08-16-service-card-description-alignment.md CONTINUITY.md
git commit -m "Align service card descriptions"
```

## Self-Review

- Spec coverage: the single task removes title expansion and preserves the card footer and all other card sizing.
- Placeholder scan: no placeholder steps or undefined interfaces remain.
- Type consistency: no TypeScript interfaces change.
