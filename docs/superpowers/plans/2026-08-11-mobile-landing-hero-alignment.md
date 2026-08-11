# Mobile Landing Hero Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Left-align the complete landing hero content group on small screens and reduce its description to 16px while preserving the centered desktop layout.

**Architecture:** Change only responsive utility classes in `LandingHero`. Protect the mobile/desktop layout contract with the existing focused landing test.

**Tech Stack:** React, Tailwind CSS, Vitest, Bun, Node 22

## Global Constraints

- Keep the mobile headline at 32px.
- Use 16px description text with tighter leading below `sm`.
- Preserve centered alignment and existing typography at `sm` and above.
- Keep the equal-width mobile CTA row.

---

### Task 1: Responsive landing hero

**Files:**
- Modify: `src/components/landing/LandingHero.tsx`
- Test: `src/components/landing/LandingAnnouncementPill.test.ts`

**Interfaces:**
- Consumes: Existing Tailwind responsive breakpoints and `LandingHero` markup.
- Produces: A mobile-left, desktop-centered hero without component API changes.

- [ ] **Step 1: Write the failing test**

Add a focused assertion that rendered hero markup contains mobile `items-start` and `text-left`, desktop `sm:items-center` and `sm:text-center`, and description `text-base`, `leading-6`, `sm:text-lg`, and `sm:leading-relaxed` classes.

- [ ] **Step 2: Run the test to verify it fails**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/landing/LandingAnnouncementPill.test.ts` and confirm the responsive assertion fails against the centered mobile implementation.

- [ ] **Step 3: Implement the minimal responsive class change**

Update the hero content wrapper and description classes only. Do not change copy, routes, images, spacing, or desktop behavior.

- [ ] **Step 4: Verify the implementation**

Run the focused test, `bun run build`, `git diff --check`, and confirm `localhost:5178` serves the feature branch.

- [ ] **Step 5: Commit and push**

Commit the test, component, plan, and continuity update, then push `codex/web-widget-controls-polish`.
