# Task 5 Report: Google Calendar Push Notifications and Watch Lifecycle

## Implementation summary

Added the bodyless Google Calendar webhook receiver, channel-token generation and verification, durable notification acceptance, watch creation/stopping/replacement, paginated renewal and stale-sync recovery, and one daily maintenance delegate. Watch registration reserves a pending row before the Google watch request, stores only a SHA-256 verifier, activates only the provider-confirmed resource and expiration, and replaces channels with an overlap before retiring the old channel.

The webhook accepts only `sync`, `exists`, and `not_exists` notifications with a known unexpired pending/active channel, valid 32-byte base64url token, matching active resource and expiration, and safe integer message number. Its single mutation records diagnostics, marks the connection dirty, and schedules the accepted Task 3 sync worker transactionally. Duplicate and out-of-order messages return `204` without another dirty increment or schedule; invalid notifications return `404` without scheduling or calling Google.

## Files changed

- `convex/googleCalendar/channelToken.ts`
- `convex/googleCalendar/watchStore.ts`
- `convex/googleCalendar/watchMaintenance.ts`
- `convex/googleCalendar/watchActions.ts`
- `convex/googleCalendar/webhook.ts`
- `convex/googleCalendarWebhook.test.ts`
- `convex/http.ts`
- `convex/crons.ts`

## TDD evidence

Initial RED command:

`source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarWebhook.test.ts`

After the HTTP test environment was made valid, the RED run reported 7 expected failures and 7 passing invalid-request cases. Valid `sync`, `exists`, and `not_exists` requests and duplicate delivery returned `404` because the route did not exist; the three lifecycle tests failed because `googleCalendar/watchActions` did not exist.

Race-review RED command:

`source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarWebhook.test.ts -t "disconnect racing"`

The regression failed with `expected kind: superseded`, received `kind: active`, reproducing activation after a disconnect raced the provider response.

Final GREEN command:

`source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarWebhook.test.ts`

Result: 19/19 tests pass, including pending initial sync, bodyless delivery, invalid headers/channel metadata, duplicate and out-of-order replay, verifier-only persistence, overlapping renewal, expired/not-found stop tolerance, disconnect/response racing, daily delegation, and stale-sync scheduling.

## Verification

- Calendar foundations: 10 files, 84/84 tests pass.
- Convex TypeScript: `bunx tsc --noEmit -p convex/tsconfig.json` passes.
- Scoped ESLint passes for every touched code and test file.
- `git diff --check`, exact single Google Calendar route, and the 300-line file gate pass; the largest new file is 289 lines.
- Full repository run: 417 test files and 1,395 product tests pass. The command retains the established 10 unrelated Docs-runner failures: eight Node-style `.mjs` suites are collected as empty Vitest suites and two Docs TypeScript suites cannot resolve `@docusaurus/tsconfig`.

## Self-review

- Secret exposure: Web Crypto generates 32 random bytes, Google receives only their base64url encoding, Convex stores only the base64url SHA-256 digest, and no token or credential is logged.
- Replay and idempotency: message-number comparison occurs in the same mutation as the dirty increment and schedule, so concurrent duplicates cannot enqueue duplicate work; Task 3 continues to own sync leases and dirty coalescing.
- State transitions: pending registration precedes Google, activation atomically installs the new active pointer and moves the replaced channel to retiring, expired/not-found stops settle locally, and retryable stop failures leave the old channel retiring for later cleanup.
- Races: pending `sync` is accepted before provider-response persistence; pointer/state checks reject superseded activation; a disconnect racing the response causes the newly created Google channel to be stopped and retired.
- Provider safety: webhook handling never calls Google; watch and stop requests use the accepted origin-constrained Google client and user-scoped WorkOS credential adapter.
- Scale: renewal and stale recovery paginate connections in bounded batches and delegate per-connection external work through scheduled actions.

## Issues and concerns

- No live Google or Convex deployment call was made; registered actions and mutations were exercised through `convex-test` with complete WorkOS and Google HTTP boundary responses, and the accepted provider suite remains green.
- Production availability is unconfirmed, so no customer changelog entry was added. `CONTINUITY.md` was intentionally not edited for this delegated task.

Commit target: `Handle Google Calendar push notifications`.
