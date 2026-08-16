# Calendar Google Event Indicators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a solid connected-account status marker and tooltip-enabled Google Calendar icons before every synced event title.

**Architecture:** Extract the Google Calendar brand asset into a small shared module. The connection card consumes the constant for its existing account icon, while the source component uses it to render a Google-origin event icon with a tooltip and keeps its Kilobot badge path. Existing calendar call sites only move that shared source component before each title.

**Tech Stack:** React, TypeScript, Radix Tooltip via the shadcn tooltip primitives, Lucide, Vitest.

## Global Constraints

- Use Node v22 for every test command.
- Show `Event synced with Google Calendar` exactly in the Google event icon tooltip.
- Retain Kilobot badges and omit indicators for unknown origins.
- Do not change Google Calendar access, synchronization, ownership, event fields, permissions, or booking behavior.
- Do not add a release changelog entry until production availability is confirmed.

---

### Task 1: Add tested shared Google event indicators

**Files:**
- Create: `src/components/calendar/googleCalendarBranding.ts`
- Modify: `src/components/calendar/GoogleCalendarConnectionCard.tsx:1-76`
- Modify: `src/components/calendar/GoogleCalendarSourceBadge.tsx:1-12`
- Modify: `src/components/calendar/GoogleCalendarConnection.test.tsx:5-150`

**Interfaces:**
- Produces: `GOOGLE_CALENDAR_ICON_SRC` from `googleCalendarBranding.ts`.
- Produces: `GoogleCalendarSourceBadge({ origin?: 'google' | 'kilobot' })`, which renders a tooltip-enabled Google icon, a Kilobot badge, or `null`.
- Consumes: `Tooltip`, `TooltipContent`, and `TooltipTrigger` from `@/components/ui/tooltip`.

- [x] **Step 1: Write failing rendering tests**

Update the existing connected-card assertions and source-badge test:

```tsx
expect(markup).toContain('fill-green-600');
expect(markup).toContain('text-green-600');
expect(markup).not.toContain('text-white');

const googleSourceMarkup = renderToStaticMarkup(
  <TooltipProvider>
    <GoogleCalendarSourceBadge origin="google" />
  </TooltipProvider>,
);
expect(googleSourceMarkup).toContain(GOOGLE_CALENDAR_ICON_SRC);
expect(googleSourceMarkup).toContain('aria-label="Event synced with Google Calendar"');
expect(readFileSync(new URL('./GoogleCalendarSourceBadge.tsx', import.meta.url), 'utf8')).toContain(
  'Event synced with Google Calendar',
);
expect(renderToStaticMarkup(<GoogleCalendarSourceBadge origin="kilobot" />)).toContain('Kilobot');
```

Extend the existing Google event-details test with:

```tsx
expect(markup.indexOf(GOOGLE_CALENDAR_ICON_SRC)).toBeLessThan(markup.indexOf('Dentist'));
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx
```

Expected: FAIL because the status marker uses `text-white` and Google-origin source badges render nothing.

- [x] **Step 3: Extract the brand asset and implement the presentation components**

Create `googleCalendarBranding.ts`:

```ts
export const GOOGLE_CALENDAR_ICON_SRC =
  'https://www.gstatic.com/images/branding/productlogos/calendar_2026_13/v2/png/calendar_2026_13_96dp.png';
```

Import the asset in the connection card, change the status class to `fill-green-600 text-green-600`, and preserve its existing `aria-label`.

Update `GoogleCalendarSourceBadge` so its Google branch is:

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <span className="shrink-0" aria-label="Event synced with Google Calendar">
      <img src={GOOGLE_CALENDAR_ICON_SRC} alt="" className="size-3.5" />
    </span>
  </TooltipTrigger>
  <TooltipContent side="top">Event synced with Google Calendar</TooltipContent>
</Tooltip>
```

Keep the existing Kilobot span unchanged and return `null` for unknown origins.

- [x] **Step 4: Run test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx
```

Expected: PASS with solid green status markup, an accessible Google event icon, exact tooltip copy, and preserved Kilobot badge behavior.

### Task 2: Place event indicators before every event title

**Files:**
- Modify: `src/pages/CalendarPage.tsx:410-415,594-600`
- Modify: `src/components/calendar/CalendarEventDetailsBody.tsx:216-221`
- Modify: `src/components/calendar/GoogleCalendarConnection.test.tsx:110-150`

**Interfaces:**
- Consumes: `GoogleCalendarSourceBadge` from Task 1.
- Produces: calendar grid, selected-day list, and event-details titles that begin with the source indicator when present.

- [x] **Step 1: Write failing call-site order tests**

Add source-order checks for the two `CalendarPage` title containers:

```tsx
const page = readFileSync(new URL('../../pages/CalendarPage.tsx', import.meta.url), 'utf8');
const eventTitleSource = '<span className="min-w-0 truncate">{event.title}</span>';
const sourceBadge = '<GoogleCalendarSourceBadge origin={event.externalOrigin} />';
expect(page.indexOf(sourceBadge)).toBeLessThan(page.indexOf(eventTitleSource));
expect(page.lastIndexOf(sourceBadge)).toBeLessThan(page.lastIndexOf(eventTitleSource));
```

Keep the event-details static markup assertion from Task 1, which proves the icon precedes `Dentist`.

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx
```

Expected: FAIL because each current source indicator follows the title.

- [x] **Step 3: Move each shared source component before its title**

In both `CalendarPage` event-title spans, render the source component immediately before `<span className="min-w-0 truncate">{event.title}</span>`. In `CalendarEventDetailsBody`, render it immediately before the `<h2>` title. Preserve each existing flex, truncation, and spacing class.

- [x] **Step 4: Run focused verification and formatting checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/calendar/GoogleCalendarConnection.test.tsx
git diff --check
```

Expected: PASS with all connection UI tests green and no diff errors.

- [x] **Step 5: Commit**

```bash
git add src/components/calendar/googleCalendarBranding.ts src/components/calendar/GoogleCalendarConnectionCard.tsx src/components/calendar/GoogleCalendarSourceBadge.tsx src/components/calendar/CalendarEventDetailsBody.tsx src/components/calendar/GoogleCalendarConnection.test.tsx src/pages/CalendarPage.tsx CONTINUITY.md docs/superpowers/plans/2026-08-15-calendar-google-event-indicators.md
git commit -m "Add Google calendar event indicators"
```
