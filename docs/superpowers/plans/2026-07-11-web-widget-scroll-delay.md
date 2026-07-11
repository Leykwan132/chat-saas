# Website Widget Scroll Delay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the public Website widget compact until 600ms after the final host-page scroll event so brief scroll pauses do not repeatedly restore and compact it.

**Architecture:** Preserve the existing passive capture scroll listener, `pageScrolling` state, and timer-based debounce. Change only the debounce contract from 180ms to 600ms; all dimensions, transitions, layout guards, and open/focus behavior remain unchanged.

**Tech Stack:** Vanilla JavaScript widget runtime, Vitest contract tests, Node.js 22.

## Global Constraints

- Use Node.js 22 for every script and test command.
- Keep every code file at or below 300 lines.
- Do not add fallbacks, empty catch blocks, comments, dependencies, or backend/configuration changes.
- Preserve the 132px × 40px compact size and 220ms easing.
- Preserve full-size behavior for open or focused widgets and non-input-bar layouts.
- Keep `.wrap` free of fixed-position containing-block triggers.

---

### Task 1: Extend the scroll-stop debounce

**Files:**
- Modify: `src/components/channels/WebWidgetMobileLayout.test.ts`
- Modify: `public/widget/v1.js`
- Modify: `docs/superpowers/specs/2026-07-11-web-widget-scroll-compaction-design.md`

**Interfaces:**
- Consumes: `handlePageScroll()` and the existing `state.pageScrollTimer` debounce.
- Produces: A 600ms scroll-stop delay with the existing compact-state lifecycle unchanged.

- [x] **Step 1: Change the timing contract test**

Update the scroll compaction assertion to require `}, 600)` instead of `}, 180)`.

- [x] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WebWidgetMobileLayout.test.ts`

Expected: FAIL because `public/widget/v1.js` still contains the 180ms timer.

- [x] **Step 3: Implement the minimal runtime change**

Change the final argument of the `handlePageScroll()` timeout from `180` to `600`.

- [x] **Step 4: Run focused verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WebWidgetMobileLayout.test.ts`

Expected: all tests pass.

- [x] **Step 5: Verify quality constraints**

Run targeted ESLint for the test, confirm `public/widget/v1.js` remains at or below 300 lines, run `git diff --check`, and inspect the focused diff.
