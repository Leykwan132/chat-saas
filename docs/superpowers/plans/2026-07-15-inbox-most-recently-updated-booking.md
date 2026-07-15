# Inbox Most Recently Updated Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the compact Inbox booking above the reply prompt select the booking with the greatest effective update timestamp.

**Architecture:** Project `updatedAt` from the customer-booking query as `Math.max(event.updatedAt, session.updatedAt)`. Add that required field to the shared frontend booking model and make its selector compare `updatedAt`, while leaving backend history ordering unchanged.

**Tech Stack:** Convex, TypeScript, React, Vitest

## Global Constraints

- Node v22 is required for every script and test command.
- The compact card alone changes selection semantics; expanded history remains scheduled-start ordered.
- Effective `updatedAt` is the maximum of the event and session timestamps.
- No fallback or schema migration is introduced.
- No code file may exceed 300 lines.

---

### Task 1: Effective update projection and selection

**Files:**
- Modify: `convex/appointmentBooking/customerBookings.ts`
- Modify: `convex/appointmentBookingCustomerHistory.test.ts`
- Modify: `src/components/inbox/customerBookingsModel.ts`
- Modify: `src/components/inbox/customerBookingsModel.test.ts`

**Interfaces:**
- Produces: required `CustomerBookingHistoryItem.updatedAt: number`
- Preserves: `getMostRecentCustomerBooking(bookings): CustomerBookingHistoryItem | null`

- [ ] **Step 1: Write the failing frontend selector test**

Make the fixture accept independent `startAt` and `updatedAt` values, then require an earlier booking with the greatest `updatedAt` to win.

- [ ] **Step 2: Write the failing backend projection assertion**

Give one event and session different update timestamps and assert the returned booking exposes their maximum while scheduled-start ordering remains unchanged.

- [ ] **Step 3: Run focused tests and verify the intended failures**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/customerBookingsModel.test.ts convex/appointmentBookingCustomerHistory.test.ts` and confirm failures identify missing `updatedAt` projection and start-time selection.

- [ ] **Step 4: Implement the minimum projection and selector change**

Add `updatedAt: Math.max(event.updatedAt, session.updatedAt)` to the query result, require `updatedAt` in `CustomerBookingHistoryItem`, and compare `booking.updatedAt > mostRecent.updatedAt` in the selector.

- [ ] **Step 5: Run focused verification**

Repeat the focused tests, run targeted ESLint, `git diff --check`, and touched-code line-count checks under Node v22. Update `CONTINUITY.md` with the durable selection decision and verification receipt.
