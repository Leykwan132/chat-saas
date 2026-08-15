# Calendar Source and Status Indicators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show only Google synchronization provenance and simplify the connected Google Calendar status indicator to one checkmark.

**Architecture:** `GoogleCalendarSourceBadge` remains the sole origin-to-UI boundary, returning content only for Google-synced events. `GoogleCalendarConnectionCard` owns the connected control and replaces its layered icon pair with one check inside a solid circular status surface.

**Tech Stack:** React, TypeScript, Tailwind CSS, react-icons, Vitest, react-dom/server.

## Global Constraints

- Preserve Google sync icons, tooltips, connection actions, and accessibility labels.
- Kilobot-origin and originless events render no source badge.
- A connected account has exactly one visible checkmark in a solid green circular surface.
- Run commands with Node v22 using `source ~/.nvm/nvm.sh && nvm use 22`.

---

### Task 1: Simplify shared Calendar provenance and connection status indicators

**Files:**

- Modify: `src/components/calendar/GoogleCalendarSourceBadge.tsx`
- Modify: `src/components/calendar/GoogleCalendarConnectionCard.tsx`
- Modify: `src/components/calendar/GoogleCalendarConnection.test.tsx`

**Interfaces:**

- Consumes: `origin?: 'google' | 'kilobot'` and the existing connected connection-card props.
- Produces: an empty render for local sources, an unchanged Google source icon, and one status-check SVG for connected accounts.

- [x] **Step 1: Update the failing rendering regressions**

```tsx
expect(renderToStaticMarkup(<GoogleCalendarSourceBadge origin="kilobot" />)).toBe('');

const connectedMarkup = renderConnectionCard({
  state: 'connected',
  connectedAccountEmail: 'owner@gmail.com',
});
expect(connectedMarkup).toContain('rounded-full bg-green-600');
expect(connectedMarkup.match(/<svg/g)).toHaveLength(1);
```

- [x] **Step 2: Run the Calendar indicator test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx`

Expected: FAIL because Kilobot has a text badge and the connected status renders two layered check SVGs.

- [x] **Step 3: Implement the minimal indicator updates**

```tsx
if (origin !== 'google') return null;
```

```tsx
<span className="grid size-5 shrink-0 place-items-center rounded-full bg-green-600" aria-label="Active">
  <HiCheck className="size-3 text-white" aria-hidden="true" />
</span>
```

Remove `HiCheckBadge` from the connection-card import and preserve the existing button behavior and accessible label.

- [x] **Step 4: Run the Calendar indicator test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx`

Expected: PASS.

- [x] **Step 5: Run focused verification and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx && git diff --check`

Expected: all focused tests PASS and no whitespace errors.

```bash
git add src/components/calendar/GoogleCalendarSourceBadge.tsx src/components/calendar/GoogleCalendarConnectionCard.tsx src/components/calendar/GoogleCalendarConnection.test.tsx CONTINUITY.md docs/superpowers/plans/2026-08-16-calendar-source-status-indicators.md
git commit -m "Simplify calendar status indicators"
```
