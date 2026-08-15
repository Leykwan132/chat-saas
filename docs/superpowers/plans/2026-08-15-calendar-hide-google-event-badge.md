# Calendar Hide Google Event Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the Google provider badge from Google-origin calendar events while retaining Kilobot badges.

**Architecture:** The existing `GoogleCalendarSourceBadge` is the single event-presentation boundary used in calendar tiles, selected-day rows, and event details. Change only its Google-origin rendering; all existing call sites then inherit the behavior without provider or booking changes.

**Tech Stack:** React, TypeScript, Vitest, React server rendering.

## Global Constraints

- Use Node v22 for every test command.
- Keep Google Calendar connection controls, synchronization, event fields, and permissions unchanged.
- Keep the Kilobot event-source badge unchanged.
- Do not add a release changelog entry until production availability is confirmed.

---

### Task 1: Hide Google-origin event badges

**Files:**
- Modify: `src/components/calendar/GoogleCalendarConnection.test.tsx:114-150`
- Modify: `src/components/calendar/GoogleCalendarSourceBadge.tsx:1-12`

**Interfaces:**
- Consumes: `GoogleCalendarSourceBadge({ origin?: 'google' | 'kilobot' })`.
- Produces: `null` for `origin='google'` or no origin, and the existing Kilobot badge for `origin='kilobot'`.

- [x] **Step 1: Write the failing test**

Replace the source-badge expectation and the Google event-details assertion with the desired rendered behavior:

```tsx
it('hides Google source badges and retains Kilobot source badges', () => {
  expect(renderToStaticMarkup(<GoogleCalendarSourceBadge origin="google" />)).toBe('');
  expect(renderToStaticMarkup(<GoogleCalendarSourceBadge origin="kilobot" />)).toContain('Kilobot');
  expect(renderToStaticMarkup(<GoogleCalendarSourceBadge />)).toBe('');
});

expect(markup).not.toContain('Google');
expect(markup).toContain('aria-label="Update event"');
expect(markup).toContain('aria-label="Delete event"');
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx
```

Expected: FAIL because `GoogleCalendarSourceBadge` still renders the Google label.

- [x] **Step 3: Write minimal implementation**

Make the shared badge opt out of Google-origin rendering while preserving its existing Kilobot markup:

```tsx
if (origin !== 'kilobot') return null;

return (
  <span className="shrink-0 rounded bg-muted px-1 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
    Kilobot
  </span>
);
```

- [x] **Step 4: Run test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx
```

Expected: PASS with Google-origin event badges absent and Kilobot badges retained.

- [x] **Step 5: Check formatting and commit**

Run:

```bash
git diff --check
git add src/components/calendar/GoogleCalendarConnection.test.tsx src/components/calendar/GoogleCalendarSourceBadge.tsx CONTINUITY.md docs/superpowers/plans/2026-08-15-calendar-hide-google-event-badge.md
git commit -m "Hide Google calendar event badges"
```
