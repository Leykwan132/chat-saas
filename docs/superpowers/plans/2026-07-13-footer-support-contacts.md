# Footer Support Contacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add immediately accessible email and phone support links beneath the shared site footer copyright.

**Architecture:** Extend the existing left-side brand block in `SiteFooter` with one compact support navigation group. Use native `mailto:` and `tel:` anchors so the browser delegates to the visitor's configured email application and regular phone dialer without new state, dependencies, or backend work.

**Tech Stack:** React 19, TypeScript 6, Tailwind CSS 4, Vitest 1.6

## Global Constraints

- Run every script and test with Node v22 selected in the same shell execution.
- Keep every code file below 300 lines.
- Add no comments, dependencies, icons, backend data, form handling, or analytics.
- Display `support@kilobot.app` and link it to `mailto:support@kilobot.app`.
- Display `+60129499394 (Kwan)` and link it to `tel:+60129499394` so supported devices open the regular dialer.
- Preserve the existing footer layout, light/dark palette, and native keyboard focus visibility.

---

### Task 1: Add the footer support contact group

**Files:**
- Modify: `src/components/SiteFooter.test.ts:6-12`
- Modify: `src/components/SiteFooter.tsx:32-43`

**Interfaces:**
- Consumes: the existing `SiteFooter({ className }: SiteFooterProps)` component and its left-side brand block.
- Produces: two native anchors with exact targets `mailto:support@kilobot.app` and `tel:+60129499394`.

- [x] **Step 1: Write the failing contact-link test**

Append this focused test to `src/components/SiteFooter.test.ts`:

```ts
test('footer exposes direct email and phone support links', () => {
  expect(siteFooterSource).toContain('href="mailto:support@kilobot.app"');
  expect(siteFooterSource).toContain('support@kilobot.app');
  expect(siteFooterSource).toContain('href="tel:+60129499394"');
  expect(siteFooterSource).toContain('+60129499394 (Kwan)');
});
```

- [x] **Step 2: Run the focused test and confirm the new assertion fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/SiteFooter.test.ts
```

Expected: Vitest reports one passing existing test and one failing new test because `href="mailto:support@kilobot.app"` is absent.

- [x] **Step 3: Add the compact stacked support group**

Insert this block immediately after the copyright `span` in `src/components/SiteFooter.tsx`:

```tsx
<div className="mt-2 flex flex-col items-start gap-2">
  <span className="font-title text-sm font-semibold text-zinc-900 dark:text-zinc-100">
    Support
  </span>
  <nav aria-label="Support contacts" className="flex flex-col items-start gap-1.5">
    <a
      href="mailto:support@kilobot.app"
      className="text-sm text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
    >
      support@kilobot.app
    </a>
    <a
      href="tel:+60129499394"
      className="text-sm text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
    >
      +60129499394 (Kwan)
    </a>
  </nav>
</div>
```

- [x] **Step 4: Run the focused test and confirm both tests pass**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/SiteFooter.test.ts
```

Expected: Vitest reports both tests passing.

- [x] **Step 5: Run targeted static verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/SiteFooter.tsx src/components/SiteFooter.test.ts
git diff --check
wc -l src/components/SiteFooter.tsx src/components/SiteFooter.test.ts
```

Expected: ESLint and `git diff --check` exit successfully; both code files report fewer than 300 lines.

- [x] **Step 6: Commit the implementation**

```bash
git add src/components/SiteFooter.tsx src/components/SiteFooter.test.ts CONTINUITY.md docs/superpowers/plans/2026-07-13-footer-support-contacts.md
git commit -m "Add footer support contacts"
```
