# Google Calendar Connect Early Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the Google Calendar connection control only when the active PostHog early-access flag evaluates true.

**Architecture:** Extend the existing PostHog feature-flag module with the dashboard key `enable_google_calendar_connect` and an accompanying hook. `CalendarPage` converts that hook’s tri-state evaluation with `isProductFeatureEnabled`, rendering `GoogleCalendarConnectionCard` only for enabled users with an available connection status.

**Tech Stack:** React, TypeScript, PostHog React SDK, Vitest, Bun, Node v22.

## Global Constraints

- The active PostHog flag is `enable_google_calendar_connect` (ID `822558`) with the approved exact-email rollout.
- Run every script with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Treat undefined and false PostHog states as disabled; do not render the connection card before evaluation completes.
- Do not alter the Calendar page, booking controls, Google sync behavior, dashboard flag targeting, or release changelog.

---

### Task 1: Add the PostHog flag contract and Calendar gate

**Files:**
- Modify: `src/lib/posthogFeatureFlags.ts:3-34`
- Modify: `src/lib/posthogFeatureFlags.test.ts:7-22`
- Modify: `src/pages/CalendarPage.tsx:73-91,699-715,1117-1133`
- Modify: `src/components/calendar/GoogleCalendarConnection.test.tsx:73-90`

**Interfaces:**
- `POSTHOG_FEATURE_FLAGS.enableGoogleCalendarConnect` equals `enable_google_calendar_connect`.
- `useEnableGoogleCalendarConnect(): ProductFeatureFlagState` calls `useFeatureFlagEnabled` with that key.
- `CalendarPage` uses `isProductFeatureEnabled(useEnableGoogleCalendarConnect())` to decide whether to render `GoogleCalendarConnectionCard`.

- [x] **Step 1: Write failing flag and Calendar gate assertions**

Add the new expected key to the `POSTHOG_FEATURE_FLAGS` object assertion:

```ts
enableGoogleCalendarConnect: 'enable_google_calendar_connect',
```

In the `connects through a custom authorize URL` test in `GoogleCalendarConnection.test.tsx`, add these source assertions after reading `page`:

```ts
expect(page).toContain('useEnableGoogleCalendarConnect');
expect(page).toContain('isProductFeatureEnabled(googleCalendarConnectState)');
expect(page).toContain('googleCalendarConnectEnabled && googleCalendar.status');
```

- [x] **Step 2: Run focused tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/posthogFeatureFlags.test.ts src/components/calendar/GoogleCalendarConnection.test.tsx
```

Expected: FAIL because the new key, hook, and Calendar gate do not exist.

- [x] **Step 3: Add the flag hook and render gate**

In `posthogFeatureFlags.ts`, add the key and hook:

```ts
enableGoogleCalendarConnect: 'enable_google_calendar_connect',
```

```ts
export function useEnableGoogleCalendarConnect(): ProductFeatureFlagState {
  return useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.enableGoogleCalendarConnect);
}
```

In `CalendarPage.tsx`, import `isProductFeatureEnabled` and `useEnableGoogleCalendarConnect`. After permission hooks, add:

```ts
const googleCalendarConnectState = useEnableGoogleCalendarConnect();
const googleCalendarConnectEnabled = isProductFeatureEnabled(googleCalendarConnectState);
```

Change the existing connection-card condition to:

```tsx
{googleCalendarConnectEnabled && googleCalendar.status ? (
  <GoogleCalendarConnectionCard
    {...googleCalendar.status}
    pending={googleCalendar.pending}
    onConnect={() => void googleCalendar.connectGoogleCalendar()}
    onReconnect={() => void googleCalendar.connectGoogleCalendar()}
    onDisconnect={() => googleCalendar.setDisconnectOpen(true)}
  />
) : null}
```

- [x] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/posthogFeatureFlags.test.ts src/components/calendar/GoogleCalendarConnection.test.tsx
git diff --check
```

Expected: PASS with the PostHog flag contract and Calendar gate assertions passing.

- [x] **Step 5: Commit the client gate and verification ledger**

Update `CONTINUITY.md` with the focused verification receipt, then commit:

```bash
git add src/lib/posthogFeatureFlags.ts src/lib/posthogFeatureFlags.test.ts src/pages/CalendarPage.tsx src/components/calendar/GoogleCalendarConnection.test.tsx CONTINUITY.md
git commit -m "Gate Google Calendar connect with PostHog"
```
