# Google Calendar Connect Early Access Design

## Goal

Show the Google Calendar connection control only when PostHog evaluates early access as enabled for the current user.

## PostHog flag

The active PostHog flag is `enable_google_calendar_connect` (ID `822558`). It has a 100% rollout rule for the person property `email` exactly equal to `leykwan132@gmail.com`.

## Client gate

Add the flag key and a `useEnableGoogleCalendarConnect` hook to `src/lib/posthogFeatureFlags.ts`. `CalendarPage` reads the hook and renders `GoogleCalendarConnectionCard` only when `isProductFeatureEnabled` returns true and the Google Calendar connection status is available.

An undefined or false flag state renders no connection control. This avoids exposing the connect, reconnect, or disconnect control before PostHog completes evaluation or to non-early-access users.

## Identity and scope

The existing PostHog identifier sends the authenticated WorkOS user email as the person `email` property, matching the dashboard rule. The Calendar page, booking actions, Google Calendar data sync, and all other controls remain unchanged.

## Verification

Extend the PostHog flag unit test with the new key. Extend the Calendar connection source-level test to verify `CalendarPage` consumes the new hook and gates the connection card with `isProductFeatureEnabled`. Run those focused tests under Node v22 and `git diff --check`.

## Release

The dashboard flag is active, but code availability is unconfirmed until this branch is deployed. Do not add a release-changelog entry.
