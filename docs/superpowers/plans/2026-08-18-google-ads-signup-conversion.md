# Google Ads Sign-up Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure every unauthenticated “Start for free” CTA with the supplied Google Ads conversion event before starting the existing WorkOS sign-up flow.

**Architecture:** Initialize the Google Ads global site tag in the app HTML and keep the conversion payload in one typed helper. Existing sign-up handlers remain responsible for their own PostHog events, menu state, and auth return state; they pass their current sign-up action to the helper as the conversion callback.

**Tech Stack:** Vite HTML entrypoint, React, TypeScript, Vitest, WorkOS AuthKit.

## Global Constraints

- Use Node v22 for all scripts and tests.
- Keep production code files below 300 lines.
- Do not add comments where names and structure can express intent.
- Use `AW-17745887902/e7XFCmGnOMcEJ6F841C` and the `conversion` event exactly.
- Do not change existing sign-in, dashboard, PostHog, or auth return behavior.

---

### Task 1: Add the Google Ads conversion helper

**Files:**
- Create: `src/lib/googleAdsConversion.ts`
- Test: `src/lib/googleAdsConversion.test.ts`

**Interfaces:**
- Produces `reportGoogleAdsConversion(onConversionReported: () => void): void`.
- The helper calls `window.gtag('event', 'conversion', { send_to, event_callback })`.

- [ ] **Step 1: Write the failing test**

```typescript
import { beforeEach, expect, test, vi } from 'vitest';
import { reportGoogleAdsConversion } from './googleAdsConversion';

beforeEach(() => {
  window.gtag = vi.fn();
});

test('reports the new user sign-up conversion and passes through the callback', () => {
  const onConversionReported = vi.fn();

  reportGoogleAdsConversion(onConversionReported);

  expect(window.gtag).toHaveBeenCalledWith('event', 'conversion', {
    send_to: 'AW-17745887902/e7XFCmGnOMcEJ6F841C',
    event_callback: onConversionReported,
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/googleAdsConversion.test.ts`

Expected: FAIL because `src/lib/googleAdsConversion.ts` does not exist and `window.gtag` is not typed.

- [ ] **Step 3: Write the minimal implementation**

```typescript
type GoogleTag = (
  command: 'event',
  eventName: 'conversion',
  parameters: {
    send_to: string;
    event_callback: () => void;
  },
) => void;

declare global {
  interface Window {
    gtag: GoogleTag;
  }
}

const SIGNUP_CONVERSION = 'AW-17745887902/e7XFCmGnOMcEJ6F841C';

export function reportGoogleAdsConversion(onConversionReported: () => void) {
  window.gtag('event', 'conversion', {
    send_to: SIGNUP_CONVERSION,
    event_callback: onConversionReported,
  });
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/googleAdsConversion.test.ts`

Expected: PASS with one test passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/googleAdsConversion.ts src/lib/googleAdsConversion.test.ts
git commit -m "Add Google Ads signup conversion helper"
```

### Task 2: Initialize Google Ads and wire every “Start for free” handler

**Files:**
- Modify: `index.html`
- Modify: `src/pages/LandingPage.tsx`
- Modify: `src/components/SiteHeader.tsx`
- Modify: `src/components/BlogPostLayout.tsx`
- Modify: `src/components/LegalDocumentLayout.tsx`
- Test: `src/pages/LandingPage.test.ts`
- Test: `src/components/SiteHeader.test.ts`

**Interfaces:**
- Consumes `reportGoogleAdsConversion` from `src/lib/googleAdsConversion.ts`.
- Existing handlers continue to call their current WorkOS `signUp` functions, but the call moves into the helper callback.

- [ ] **Step 1: Write failing coverage for the global tag and handlers**

Add assertions that:

```typescript
const landingSource = readFileSync(new URL('./LandingPage.tsx', import.meta.url), 'utf8');
const siteHeaderSource = readFileSync(new URL('../components/SiteHeader.tsx', import.meta.url), 'utf8');
const blogLayoutSource = readFileSync(new URL('../components/BlogPostLayout.tsx', import.meta.url), 'utf8');
const legalLayoutSource = readFileSync(new URL('../components/LegalDocumentLayout.tsx', import.meta.url), 'utf8');
const htmlSource = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

expect(htmlSource).toContain('https://www.googletagmanager.com/gtag/js?id=AW-17745887902');
expect(htmlSource).toContain("gtag('config', 'AW-17745887902')");
expect(landingSource).toContain("reportGoogleAdsConversion(() => {");
expect(siteHeaderSource).toContain("reportGoogleAdsConversion(() => {");
expect(blogLayoutSource).toContain("reportGoogleAdsConversion(() => {");
expect(legalLayoutSource).toContain("reportGoogleAdsConversion(() => {");
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/LandingPage.test.ts src/components/SiteHeader.test.ts`

Expected: FAIL because the global tag and shared-helper imports are not present.

- [ ] **Step 3: Add the Google Ads base tag**

In `index.html`, initialize `dataLayer` and `gtag` before the module entrypoint, then load:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-17745887902"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', 'AW-17745887902');
</script>
```

- [ ] **Step 4: Wire the landing sign-up handler**

Import `reportGoogleAdsConversion` in `src/pages/LandingPage.tsx` and preserve the existing PostHog capture while moving the WorkOS call into the conversion callback:

```typescript
const onSignUp = () => {
  posthog?.capture('signup_cta_clicked', { source: 'landing_page' });
  reportGoogleAdsConversion(() => {
    void signUp({ state: returnTo });
  });
};
```

- [ ] **Step 5: Wire the shared site header sign-up handler**

Import the helper in `src/components/SiteHeader.tsx` and keep the menu close outside the callback so desktop and mobile behavior is unchanged:

```typescript
const onSignUp = () => {
  reportGoogleAdsConversion(() => {
    void signUp(returnTo);
  });
  setIsOpen(false);
};
```

- [ ] **Step 6: Wire blog and legal layout sign-up handlers**

Import the helper in `src/components/BlogPostLayout.tsx` and `src/components/LegalDocumentLayout.tsx`, and wrap each existing `void signUp(returnTo)` call:

```typescript
const onSignUp = () => {
  reportGoogleAdsConversion(() => {
    void signUp(returnTo);
  });
};
```

- [ ] **Step 7: Run the focused tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/googleAdsConversion.test.ts src/pages/LandingPage.test.ts src/components/SiteHeader.test.ts`

Expected: PASS with all focused tests passing.

- [ ] **Step 8: Commit**

```bash
git add index.html src/pages/LandingPage.tsx src/components/SiteHeader.tsx src/components/BlogPostLayout.tsx src/components/LegalDocumentLayout.tsx src/pages/LandingPage.test.ts src/components/SiteHeader.test.ts
git commit -m "Track Google Ads signup conversions"
```

### Task 3: Verify the complete change and prepare review

**Files:**
- Modify: `CONTINUITY.md`
- Modify: `kilobot-docs/docs/releases/changelog.mdx` only if the customer-facing change is confirmed released

- [ ] **Step 1: Run the full test suite**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun test`

Expected: PASS with Vitest and documentation tests completing successfully.

- [ ] **Step 2: Run the production build**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun run build`

Expected: exit code 0 with TypeScript and Vite build succeeding.

- [ ] **Step 3: Check the diff and repository state**

Run: `git diff --check && git status --short && git diff --stat origin/main...HEAD`

Expected: no whitespace errors, only the design, helper, HTML, handler, test, and continuity files are included, and no unrelated changes are present.

- [ ] **Step 4: Record continuity and release status**

Update `CONTINUITY.md` with the branch, implementation state, validation receipts, and the fact that the public changelog entry remains deferred until production availability is confirmed. Do not add a release changelog entry for an unshipped PR.

- [ ] **Step 5: Commit continuity**

```bash
git add CONTINUITY.md
git commit -m "Document Google Ads conversion tracking state"
```

- [ ] **Step 6: Push and open a draft PR**

```bash
git push -u origin codex/google-ads-signup-conversion
gh pr create --draft --base main --head codex/google-ads-signup-conversion --title "Track Google Ads sign-up conversions" --body-file /private/tmp/google-ads-signup-conversion-pr.md
```

The PR body must summarize the Google Ads base tag, shared conversion helper, CTA coverage, preserved auth/PostHog behavior, and the exact validation commands.
