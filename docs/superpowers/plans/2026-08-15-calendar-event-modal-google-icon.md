# Calendar Event Modal Google Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a larger, vertically centered Google Calendar icon in event-details modal headings while retaining compact calendar-list icons.

**Architecture:** Add a narrow `size` variant to `GoogleCalendarSourceBadge`. The default keeps the compact image class, while the event-details header requests the heading variant and vertically centers its title row.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest.

## Global Constraints

- Use Node v22 for every test command.
- Keep Google tooltip copy, icon asset, Kilobot badge, source ordering, and list icon size unchanged.
- Do not change synchronization, event data, permissions, or booking behavior.
- Do not add a release changelog entry until production availability is confirmed.

---

### Task 1: Add a modal heading icon variant

**Files:**
- Modify: `src/components/calendar/GoogleCalendarSourceBadge.tsx:4-25`
- Modify: `src/components/calendar/CalendarEventDetailsBody.tsx:216-221`
- Modify: `src/components/calendar/GoogleCalendarConnection.test.tsx:114-170`

**Interfaces:**
- Produces: `GoogleCalendarSourceBadge({ origin?, size?: 'compact' | 'heading' })`.
- Consumes: the `heading` variant in `CalendarEventDetailsBody`.
- Preserves: compact `size-3.5` Google icons in `CalendarPage` and the existing Kilobot behavior.

- [ ] **Step 1: Write failing modal variant tests**

```tsx
const headingMarkup = renderToStaticMarkup(
  <TooltipProvider>
    <GoogleCalendarSourceBadge origin="google" size="heading" />
  </TooltipProvider>,
);
expect(headingMarkup).toContain('class="size-5"');

const detailsSource = readFileSync(new URL('./CalendarEventDetailsBody.tsx', import.meta.url), 'utf8');
expect(detailsSource).toContain('<GoogleCalendarSourceBadge origin={details.externalOrigin} size="heading" />');
expect(detailsSource).toContain('items-center gap-2');
```

- [ ] **Step 2: Run test to verify it fails**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx`.

Expected: FAIL because the source component has no heading variant and the modal still uses `items-start`.

- [ ] **Step 3: Add the minimal variant and modal layout change**

```tsx
export function GoogleCalendarSourceBadge({ origin, size = 'compact' }: {
  origin?: 'google' | 'kilobot';
  size?: 'compact' | 'heading';
}) {
  const iconClassName = size === 'heading' ? 'size-5' : 'size-3.5';
```

Use `iconClassName` on the Google image. In `CalendarEventDetailsBody`, request `size="heading"` and replace `items-start` with `items-center` on its title row.

- [ ] **Step 4: Run focused verification and formatting checks**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx`, then `git diff --check`.

Expected: PASS, with a `size-5` modal icon, compact list icons, and no diff errors.

- [ ] **Step 5: Commit**

Run `git add src/components/calendar/GoogleCalendarSourceBadge.tsx src/components/calendar/CalendarEventDetailsBody.tsx src/components/calendar/GoogleCalendarConnection.test.tsx CONTINUITY.md docs/superpowers/plans/2026-08-15-calendar-event-modal-google-icon.md && git commit -m "Enlarge modal Google calendar icon"`.
