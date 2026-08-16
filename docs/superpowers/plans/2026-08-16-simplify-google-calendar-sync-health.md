# Simplify Google Calendar Sync Health Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep connected Google Calendar availability healthy after any successful sync, and retain daily watch renewal without a stale-sync sweep.

**Architecture:** Connection health will depend on connection state, absence of a recorded error, and at least one successful synchronization, rather than sync age. The daily maintenance action will schedule only Watch channel renewal; webhook notifications remain the routine synchronization trigger.

**Tech Stack:** Convex actions, mutations, queries, Vitest, TypeScript.

## Global Constraints

- Preserve Google Calendar connection errors, reauthorization, and never-successfully-synced connections as unhealthy.
- Keep the existing daily cron and watch renewal flow.
- Remove only stale-sync sweep behavior; do not change page-open refresh behavior.
- Use Node.js v22 for tests and verification.

---

### Task 1: Remove time-based availability health expiry

**Files:**
- Modify: `convex/googleCalendar/availability.ts`
- Modify: `convex/appointmentBooking/availabilityRoster.ts`
- Modify: `convex/googleCalendar/constants.ts`
- Test: `convex/googleCalendarProjection.test.ts`
- Test: `convex/googleCalendarProjectionReview.test.ts`

**Interfaces:**
- Produces: `loadGoogleCalendarHealthByUser(ctx, userIds)` returning a user-id health map without a time argument.

- [x] **Step 1: Write the failing test**

Change the projection test so a connection last synchronized 24 hours ago remains available, while a connection with `lastErrorKind: "retryable"` is unavailable.

- [x] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarProjection.test.ts`

Expected: the old-sync availability assertion fails because health expires after 60 seconds.

- [x] **Step 3: Write minimal implementation**

Remove `AVAILABILITY_FRESHNESS_MS`; health returns false only for non-connected state, a recorded error, or no successful synchronization.

- [x] **Step 4: Run focused tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarProjection.test.ts convex/googleCalendarProjectionReview.test.ts`

Expected: PASS.

### Task 2: Keep daily watch renewal and remove stale sweep

**Files:**
- Modify: `convex/googleCalendar/watchActions.ts`
- Modify: `convex/googleCalendar/watchMaintenance.ts`
- Test: `convex/googleCalendarWebhook.test.ts`

**Interfaces:**
- Produces: `runDailyGoogleCalendarMaintenance` that schedules only `renewExpiringGoogleCalendarWatches`.

- [x] **Step 1: Write the failing test**

Change the daily-maintenance assertion to expect exactly `googleCalendar/watchActions:renewExpiringGoogleCalendarWatches` and remove the stale-sweep behavior test.

- [x] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarWebhook.test.ts`

Expected: the scheduled function list contains the obsolete stale-sweep action.

- [x] **Step 3: Write minimal implementation**

Remove stale-sweep action references and the mutation that dirties old connections; leave renewal paging and the daily cron entry intact.

- [x] **Step 4: Run focused tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/googleCalendarWebhook.test.ts`

Expected: PASS.

### Task 3: Verify and record the operational decision

**Files:**
- Modify: `CONTINUITY.md`

- [x] **Step 1: Run verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit -p convex/tsconfig.json && bunx tsc --noEmit && bunx convex dev --once`

Expected: TypeScript checks and Convex deployment succeed.

- [x] **Step 2: Record the decision**

Add the approved health and maintenance policy to `CONTINUITY.md` with date and provenance.

- [x] **Step 3: Commit**

Stage only this task's files and commit with `Simplify Google Calendar sync health`.
