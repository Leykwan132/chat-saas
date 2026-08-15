# Availability Card Metadata Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place roster-card metadata above the teammate name and add a clock beside each availability summary.

**Architecture:** `UserScheduleCard` owns the roster-card presentation. Reorder its existing metadata and identity blocks, then wrap each already-generated availability line with Lucide’s `Clock` icon. The existing page-level server-rendering test verifies the visual order and icon presence.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Vitest, React server rendering.

## Global Constraints

- Use Node v22 before executing project commands.
- Preserve the existing card data, link, availability formatter, status behavior, and Accepting leads control.
- Display role, optional Away, and lead-count badges above the teammate identity.
- Render a muted `Clock` icon beside every availability line, including `No available hours`.
- Do not add comments or default fallbacks.

---

### Task 1: Reorder card metadata and mark availability with clocks

**Files:**
- Modify: `src/pages/SchedulePage.test.tsx`
- Modify: `src/pages/UserScheduleCard.tsx`

**Interfaces:**
- Consumes: the existing `UserScheduleCard` props and `availabilityLines: string[]`.
- Produces: visible badges before the name and a `Clock` icon alongside each rendered availability line.

- [ ] **Step 1: Write the failing page behavior assertions**

```tsx
expect(markup.indexOf('>Admin</span>')).toBeLessThan(
  markup.indexOf('>Ley Kwan Choo (You)</span>'),
);
expect(markup.match(/lucide-clock/g)).toHaveLength(2);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/SchedulePage.test.tsx`

Expected: FAIL because the existing markup puts Admin after the name and has no clock icons.

- [ ] **Step 3: Add the minimal layout markup**

```tsx
import { Clock } from 'lucide-react';

<div className="flex flex-wrap items-center gap-1.5">
  <Badge variant="outline" className="text-[11px]">
    {isAdmin ? 'Admin' : 'Member'}
  </Badge>
  {isTimeOff && <Badge variant="outline">Away</Badge>}
  <Badge variant="secondary" className="text-[11px]">
    {assignedLeadCount === 1 ? '1 lead' : `${assignedLeadCount} leads`}
  </Badge>
</div>

<div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
  <Clock className="size-3 shrink-0" aria-hidden />
  <span>{line}</span>
</div>
```

Move the existing badge group before the name/status row; keep the email below the identity row.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/SchedulePage.test.tsx`

Expected: PASS with badges preceding the name and clocks matching each visible availability line.

- [ ] **Step 5: Run final verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit && git diff --check`

Expected: both commands exit 0.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/pages/UserScheduleCard.tsx src/pages/SchedulePage.test.tsx docs/superpowers/plans/2026-08-14-availability-card-metadata-layout.md CONTINUITY.md
git commit -m "Refine availability card metadata layout"
```
