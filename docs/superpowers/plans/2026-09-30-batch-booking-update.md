# Batch Booking Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reschedule one to ten named bookings through a single confirmed array-based agent tool without cancelling or recreating appointments.

**Architecture:** A durable update batch captures each target event's original and replacement intervals. Preparation validates every target before remote writes; execution updates Google in request order and restores earlier writes when a later one fails. Finalization updates existing records in place.

**Tech Stack:** Convex mutations/actions, `@convex-dev/agent`, Zod, Google Calendar write layer, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-batch-booking-update-design.md`

## Global Constraints

- Use Node 22 for every command.
- Use object-form Convex functions with argument and return validators.
- Use indexed, bounded reads; code files remain below 300 lines with no explanatory comments.
- The tool accepts one to ten distinct `{ bookingId, startTimeIso }` items and `confirmed: true`.
- Preserve each event duration and never cancel or recreate an appointment.

## Review Focus

- Two targets swapping times must not conflict with their old intervals.
- Duplicate IDs must fail before any local or Google update.
- A target from another conversation/customer must fail without revealing or changing it.
- A Google write failure must restore prior remote updates and leave local rows unchanged.
- Completed bookings remain eligible; cancelled and imported-only events are rejected.

---

### Task 1: Batch update contracts and parsing

**Files:**

- Create: `convex/googleCalendar/batchBookingUpdateTypes.ts`
- Create: `convex/googleCalendar/batchBookingUpdateInput.ts`
- Test: `convex/googleCalendar/batchBookingUpdateInput.test.ts`

**Interfaces:** Produces `parseBatchBookingUpdates(inputs, timeZone)`, returning either ordered `{ bookingId, startAt }` entries or a tool-safe failure. Defines the bounded update, prepared-write, and result types used below.

- [ ] **Step 1: Write failing parser tests**

Cover one valid item, two ordered items, malformed ISO input, duplicate IDs, and an eleventh item.

- [ ] **Step 2: Run the test and verify RED**

Run `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/googleCalendar/batchBookingUpdateInput.test.ts`. Expect a missing-module failure.

- [ ] **Step 3: Implement parser and contracts**

Use the existing availability ISO parser, require one to ten unique IDs, and preserve request order.

- [ ] **Step 4: Run the test and verify GREEN**

Run the Task 1 command; expect all parser tests to pass.

- [ ] **Step 5: Commit**

Stage only the Task 1 files and commit `Add batch booking update contracts`.

### Task 2: All-target local preparation and finalization

**Files:**

- Create: `convex/googleCalendar/batchBookingUpdatePrepare.ts`
- Create: `convex/googleCalendar/batchBookingUpdateFinalize.ts`
- Modify: `convex/schema.ts`
- Test: `convex/googleCalendar/batchBookingUpdatePrepare.test.ts`

**Interfaces:** Consumes Task 1 entries. Produces `prepareBatchUpdate({ conversationId, updates, refreshed })` and `finalizeBatchUpdate({ batchId })` internal mutations. Persists `appointmentBookingUpdateBatches` with original and requested intervals, target IDs, status, and recovery metadata.

- [ ] **Step 1: Write failing preparation tests**

Assert two valid targets create a complete duration-preserving plan. Assert an other-customer, cancelled, or unavailable target creates no batch and changes no event. Include a two-target swap.

- [ ] **Step 2: Run the test and verify RED**

Run `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/googleCalendar/batchBookingUpdatePrepare.test.ts`. Expect a missing-module failure.

- [ ] **Step 3: Implement schema and preparation**

Add an optional-safe durable batch table. Guard ownership using current customer rules. Use `resolveAvailableInterval` with all target IDs excluded from availability and reject the full request before writing a batch when any target fails.

- [ ] **Step 4: Implement in-place finalization**

Patch existing events and matching sessions, replace participants, refresh availability intervals, reminders, notifications, and `event_updated` history. Never insert a new event or session.

- [ ] **Step 5: Run the tests and verify GREEN**

Run the Task 2 command; expect all preparation tests to pass.

- [ ] **Step 6: Commit**

Stage only the Task 2 files and commit `Prepare batch booking updates`.

### Task 3: Google update execution and recovery

**Files:**

- Create: `convex/googleCalendar/batchBookingUpdateSync.ts`
- Test: `convex/googleCalendar/batchBookingUpdateSync.test.ts`

**Interfaces:** Consumes Task 2 prepared batches. Produces `runBatchBookingUpdate(args, dependencies)` with an ordered per-booking result.

- [ ] **Step 1: Write failing sync tests**

Assert local success, Google success, a second Google failure restoring the first remote event, and a restoration failure recording recoverable state.

- [ ] **Step 2: Run the test and verify RED**

Run `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/googleCalendar/batchBookingUpdateSync.test.ts`. Expect a missing-module failure.

- [ ] **Step 3: Implement ordered writes and restoration**

Refresh each distinct connection once, reprepare all entries, update remote events in request order, and finalize only after all writes succeed. On failure, restore earlier remote events to their captured originals and persist recovery IDs if restoration fails.

- [ ] **Step 4: Run the test and verify GREEN**

Run the Task 3 command; expect all sync tests to pass.

- [ ] **Step 5: Commit**

Stage only the Task 3 files and commit `Sync batch booking updates`.

### Task 4: Agent tool, confirmation, and prompt integration

**Files:**

- Modify: `convex/googleCalendar/agentTools.ts`
- Modify: `convex/chat/threads.ts`
- Modify: `convex/chat/workflowPromptBooking.test.ts`
- Test: `convex/googleCalendar/agentTools.test.ts`

**Interfaces:** Consumes `runBatchBookingUpdate` from Task 3. Produces `updateBookings({ bookings, confirmed })` for agent turns.

- [ ] **Step 1: Write failing tool and prompt tests**

Assert one and two-item calls parse to the runner, `confirmed: false` is rejected, tool help contains both approved examples, and the prompt requires listing bookings before a batch update.

- [ ] **Step 2: Run the tests and verify RED**

Run `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/googleCalendar/agentTools.test.ts convex/chat/workflowPromptBooking.test.ts`. Expect `updateBookings` to be absent.

- [ ] **Step 3: Register the array-based tool**

Replace the date/time update tool with `updateBookings`, preserve the old detail-edit path, and send date/time updates directly to Task 3 without an active edit-session dependency.

- [ ] **Step 4: Update prompt and combined confirmation**

Include the approved one-item and multi-item examples, fetch-first rule, concise combined success message, and no cancel/rebook fallback.

- [ ] **Step 5: Run the tests and verify GREEN**

Run the Task 4 command; expect all agent tool and prompt tests to pass.

- [ ] **Step 6: Commit**

Stage only the Task 4 files and commit `Add batch booking update tool`.

### Task 5: Verification and release record

**Files:**

- Modify: `CONTINUITY.md`
- Modify: `kilobot-docs/docs/releases/changelog.mdx` only after production availability is confirmed.

**Interfaces:** Verifies Tasks 1–4 and records the unshipped outcome.

- [ ] **Step 1: Run code generation and focused suites**

Run `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx convex codegen && bunx vitest run convex/googleCalendar/batchBookingUpdateInput.test.ts convex/googleCalendar/batchBookingUpdatePrepare.test.ts convex/googleCalendar/batchBookingUpdateSync.test.ts convex/googleCalendar/agentTools.test.ts convex/chat/workflowPromptBooking.test.ts`. Expect PASS.

- [ ] **Step 2: Run the full supported Vitest suite**

Use the repository's Stripe test identifiers and `--exclude '.worktrees/**'`. Expect no new failures.

- [ ] **Step 3: Update ledger and commit**

Record the new tool contract, verification receipts, and unshipped status. Do not add a changelog entry until production availability is confirmed.

## Self-Review

- Spec coverage: Tasks 1–4 cover array input, one-to-ten cap, ownership, duration preservation, multi-target availability, Google recovery, in-place finalization, prompt examples, and no cancellation. Task 5 verifies and records the outcome.
- Type consistency: Task 1 feeds Task 2, Task 2 feeds Task 3, and Task 3 feeds Task 4.
- Review focus: duplicate IDs are Task 1; cross-customer, completed/cancelled, and swaps are Task 2; recovery is Task 3.
- Proportion: the plan defines interfaces and verifiable behavior without prescribing implementation bodies.
