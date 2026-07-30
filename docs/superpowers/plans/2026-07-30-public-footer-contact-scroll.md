# Public Footer Contact Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public footer's Contact link immediately scroll the Contact page to the top, including when the user is already on `/contact`.

**Architecture:** Reuse the existing `scrollToPageTop` callback inside `SiteFooter` and attach it to the plain Contact link. Strengthen the focused source contract so all three footer links targeting the Contact page must use the shared callback.

**Tech Stack:** React 19, React Router, TypeScript, Vitest, Bun, Node.js 22

## Global Constraints

- Use Node.js 22 for every script and test command.
- Preserve the existing immediate `window.scrollTo({ top: 0, left: 0, behavior: 'auto' })` behavior.
- Do not change router-wide scrolling or Contact-page lifecycle behavior.
- Do not add dependencies.
- Do not add code comments.

---

### Task 1: Reset the Plain Contact Link to the Page Top

**Files:**
- Modify: `src/components/SiteFooter.test.ts`
- Modify: `src/components/SiteFooter.tsx`

**Interfaces:**
- Consumes: `scrollToPageTop(): void`, already defined inside `SiteFooter`
- Produces: All three footer `Link` elements whose destinations start with `/contact` invoke `scrollToPageTop` on click

- [x] **Step 1: Write the failing test**

Replace the first test in `src/components/SiteFooter.test.ts` with:

```ts
test('footer contact page links scroll the page to the top', () => {
  expect(siteFooterSource).toContain('const scrollToPageTop = () =>');
  expect(siteFooterSource).toContain("window.scrollTo({ top: 0, left: 0, behavior: 'auto' })");
  expect(siteFooterSource.match(/onClick={scrollToPageTop}/g)).toHaveLength(3);
  expect(siteFooterSource).toContain('to="/contact"');
  expect(siteFooterSource).toContain('to="/contact?intent=demo"');
  expect(siteFooterSource).toContain('to="/contact?intent=support"');
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/SiteFooter.test.ts
```

Expected: FAIL because the source contains only two `onClick={scrollToPageTop}` handlers.

- [x] **Step 3: Implement the minimal behavior**

Update the plain Contact link in `src/components/SiteFooter.tsx`:

```tsx
<Link
  to="/contact"
  onClick={scrollToPageTop}
  className="text-base text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
>
  Contact
</Link>
```

- [x] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/SiteFooter.test.ts
```

Expected: both focused tests pass with no warnings or errors.

- [x] **Step 5: Run the production build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && VITE_META_APP_ID=987654321 bun run build
```

Expected: the production build succeeds. The existing Vite chunk-size advisory is acceptable.

- [x] **Step 6: Check the final diff**

Run:

```bash
git diff --check
git diff -- src/components/SiteFooter.tsx src/components/SiteFooter.test.ts
```

Expected: no whitespace errors and only the approved Contact scroll behavior plus its focused contract are present.

- [x] **Step 7: Commit**

```bash
git add src/components/SiteFooter.tsx src/components/SiteFooter.test.ts docs/superpowers/plans/2026-07-30-public-footer-contact-scroll.md
git commit -m "Scroll footer contact link to page top"
```
