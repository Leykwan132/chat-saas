# Google Ads Sign-up Conversion Design

**Date:** 2026-08-18

**Goal:** Measure every unauthenticated “Start for free” click with the supplied Google Ads conversion event while preserving the existing sign-up flow.

## Scope

The conversion applies to all existing “Start for free” entry points: the landing page hero and lower CTA, the shared desktop and mobile header, blog post pages, and legal document pages. Authenticated users continue to see dashboard actions and do not emit a sign-up conversion.

## Architecture

The app HTML will load and initialize the Google Ads global site tag for `AW-17745887902`. A small typed helper will own the conversion ID and event payload. Existing sign-up handlers will call the helper with their current WorkOS sign-up action as the event callback, allowing the conversion event to be dispatched before auth navigation starts.

The helper will not own PostHog events, menu state, or redirect state. Each caller retains those responsibilities, so the change remains localized to the existing sign-up boundaries and cannot create duplicate analytics events through button-level listeners.

## Data flow

1. An unauthenticated visitor clicks a “Start for free” CTA.
2. The owning handler sends the Google Ads `conversion` event to `AW-17745887902/e7XFCmGnOMcEJ6F841C`.
3. Google’s event callback invokes the existing WorkOS `signUp` action.
4. Existing PostHog capture, mobile menu closing, and return-to-dashboard state continue unchanged.

## Testing

Tests will cover the helper’s exact `send_to` payload and callback invocation. Static component tests will verify that each public sign-up handler uses the shared helper and that authenticated CTA branches remain dashboard links. The implementation will be validated with focused Vitest tests, the Node 22 production build, and `git diff --check`.

## Constraints

- Keep production code files below 300 lines.
- Do not add comments where names and structure can express intent.
- Use the supplied conversion ID and event name exactly.
- Do not change existing sign-in, dashboard, PostHog, or auth return behavior.
