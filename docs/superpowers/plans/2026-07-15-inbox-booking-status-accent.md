# Inbox Booking Status Accent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Color Inbox booking rails by status and show the same color as a small indicator inside neutral status tags.

**Architecture:** Use the shared appointment booking status accent accessor for both Inbox accent rails and the small tag indicator. Keep the tag surface neutral with standard foreground text.

**Tech Stack:** TypeScript, React 19, Tailwind CSS, Vitest.

## Global Constraints

- Use Node.js v22 for every script, test, lint, or build command.
- Keep code files below 300 lines and avoid comments.
- Cancelled is red, Scheduled is amber/yellow, Completed is green, and No-show is orange.

---

### Task 1: Add status-aware booking rail colors

**Files:**
- Modify: `src/lib/appointmentBookingStatusPresentation.ts`
- Modify: `src/lib/appointmentBookingStatusPresentation.test.ts`
- Modify: `src/components/booking/BookingStatusTag.tsx`
- Modify: `src/components/booking/BookingDetailsPanel.tsx`
- Modify: `src/components/inbox/InboxBookingDetailsCard.tsx`
- Modify: `src/components/inbox/InboxCustomerBookingRow.tsx`

**Interfaces:**
- Consumes: `AppointmentBookingDisplayStatus`.
- Produces: `appointmentBookingStatusAccentColor(status): string`.

- [ ] **Step 1: Write the failing test**

Assert that booked maps to yellow `#eab308`, completed to green `#15803d`, cancelled to red `#dc2626`, and no-show to orange `#f97316`. Assert that the tag uses neutral background/foreground classes, contains a small indicator with the shared color, and does not apply that color to the pill background.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/appointmentBookingStatusPresentation.test.ts`

Expected: FAIL because the accent accessor does not exist.

- [ ] **Step 3: Implement the shared accent mapping**

Use `appointmentBookingStatusAccentColor` for a leading indicator span inside `BookingStatusTag`. Remove the colored inline pill background and use neutral background/foreground classes for both clickable and static tags.

- [ ] **Step 4: Run focused verification**

Run the status presentation and Inbox booking tests, targeted ESLint, the production build, and `git diff --check` under Node.js v22.
