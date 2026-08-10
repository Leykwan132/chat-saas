# Landing Hero SEO Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align Kilobot's landing hero and homepage metadata around an AI chatbot for customer support and sales with a five-minute, no-complex-setup promise.

**Architecture:** The existing `LandingHero` stays the single visible H1. Static `index.html` metadata provides matching title and social-preview copy. A source-contract test prevents these public statements from drifting apart.

**Tech Stack:** React, TypeScript, Vite, Vitest.

## Global Constraints

- Use Node v22 for every test and build command.
- Keep the hero's existing layout, CTAs, preview image, and routes unchanged.
- Keep the page title, meta description, Open Graph, and Twitter metadata aligned with the visible hero.
- Do not add a release-changelog entry before production availability is confirmed.

---

### Task 1: Cover the approved landing copy

**Files:**
- Modify: `src/components/landing/LandingAnnouncementPill.test.ts`
- Modify: `src/components/landing/LandingHero.tsx`
- Modify: `index.html`

**Interfaces:**
- Consumes: source text from `LandingHero.tsx` and `index.html`.
- Produces: regression coverage for the approved public hero and homepage metadata.

- [x] **Step 1: Write the failing test**

```ts
expect(heroSource).toContain('AI Chatbot for Customer Support and Sales');
expect(heroSource).toContain(
  'No complex setup—get started in just 5 minutes.',
);
expect(indexSource).toContain('Kilobot | AI Chatbot for Customer Support & Sales');
```

- [x] **Step 2: Run the test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/landing/LandingAnnouncementPill.test.ts`

Expected: the new copy assertions fail because the old sales-agent copy remains.

- [x] **Step 3: Write the minimal implementation**

```tsx
<h1>AI Chatbot for Customer Support and Sales</h1>
<p>No complex setup—get started in just 5 minutes.</p>
```

```html
<title>Kilobot | AI Chatbot for Customer Support &amp; Sales</title>
```

Set all description-bearing metadata tags to the approved meta description, and the Open Graph and Twitter titles to the approved page title.

- [x] **Step 4: Run the test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/landing/LandingAnnouncementPill.test.ts`

Expected: the focused suite passes.

- [x] **Step 5: Verify the production build**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun run build`

Expected: TypeScript compilation and Vite build exit successfully.

- [x] **Step 6: Commit**

```bash
git add index.html src/components/landing/LandingHero.tsx src/components/landing/LandingAnnouncementPill.test.ts docs/superpowers/specs/2026-08-10-landing-hero-seo-copy-design.md docs/superpowers/plans/2026-08-10-landing-hero-seo-copy.md CONTINUITY.md
git commit -m "Improve landing hero SEO copy"
```
