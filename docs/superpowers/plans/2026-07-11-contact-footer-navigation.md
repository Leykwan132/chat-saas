# Contact Footer Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Soften the contact heading and scroll footer demo/support navigation to the top of the contact page.

**Architecture:** Keep the visual change in `ContactPage.tsx` and add one shared, footer-local click handler in `SiteFooter.tsx`. Source regression tests match the repository's existing lightweight component contract tests.

**Tech Stack:** React, React Router, TypeScript, Tailwind CSS, Vitest

## Global Constraints

- Node v22 is required for every script and test command.
- No new dependencies or Convex changes.
- Code files remain below 300 lines.

---

### Task 1: Add regression coverage

**Files:**
- Create: `src/components/SiteFooter.test.ts`
- Create: `src/pages/ContactPage.test.ts`
- Create: `src/pages/contactPageConfig.ts`
- Create: `src/pages/ContactFieldLabels.tsx`

**Interfaces:**
- Consumes: source contracts from `SiteFooter.tsx` and `ContactPage.tsx`
- Produces: regression assertions for footer top scrolling and medium heading weight

- [ ] **Step 1: Write failing source regression tests**

Add assertions requiring a shared `scrollToPageTop` click handler on both intent links and `font-medium` on the contact heading.

- [ ] **Step 2: Run tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/SiteFooter.test.ts src/pages/ContactPage.test.ts`

Expected: FAIL because the handler and medium heading weight are absent.

### Task 2: Implement the scoped UI behavior

**Files:**
- Modify: `src/components/SiteFooter.tsx`
- Modify: `src/pages/ContactPage.tsx`

**Interfaces:**
- Consumes: React Router `Link` click events and the browser `window.scrollTo` API
- Produces: immediate top scrolling for the two footer intent links

- [ ] **Step 1: Add the shared footer handler**

Define `scrollToPageTop` inside `SiteFooter` and pass it to both intent links through `onClick`.

- [ ] **Step 2: Reduce the heading weight**

Replace the contact heading's `font-semibold` class with `font-medium`.

Extract the contact-page configuration, types, and shared field classes into `contactPageConfig.ts` so the touched page stays below 300 lines.

Keep the required and optional field-label components in `ContactFieldLabels.tsx` so the page remains modular.

- [ ] **Step 3: Run focused tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/SiteFooter.test.ts src/pages/ContactPage.test.ts`

Expected: PASS.

- [ ] **Step 4: Run broader verification and inspect the diff**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/SiteHeader.test.ts src/components/SiteFooter.test.ts src/pages/ContactPage.test.ts src/pages/LandingPage.test.ts`

Expected: PASS with zero failures.

- [ ] **Step 5: Commit and push**

Commit the scoped files and push `main` to `origin`.
