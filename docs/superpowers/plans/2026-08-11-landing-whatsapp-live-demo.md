# Landing WhatsApp Live Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the root Traditional widget embed and make the landing hero's `Try Live Demo` action open WhatsApp with the approved prefilled message.

**Architecture:** Keep the change static and local to the two existing entry points. `index.html` stops loading the standalone widget, while `LandingHero` emits one direct external `wa.me` anchor; no backend, router, or shared abstraction changes are needed.

**Tech Stack:** React 19, React Router, TypeScript, Vite, Vitest, React DOM server rendering, Bun, Node.js 22

## Global Constraints

- Change only the landing hero `Book a demo` CTA; keep the lower landing CTA, footer link, and contact form unchanged.
- Use WhatsApp number `601167389886`.
- Prefill exactly `Hey, I want to learn more about Kilobot.`.
- Open WhatsApp in a new tab with `rel="noopener noreferrer"`.
- Preserve the hero CTA's current outline styling and responsive dimensions.
- Remove only the standalone Kilobot widget embed from `index.html`; preserve the Meta SDK and Vite entry scripts.
- Use Node.js 22 for every script and test command.
- Do not add a changelog entry until production availability is confirmed.

---

### Task 1: Remove the embed and add the WhatsApp live-demo CTA

**Files:**
- Modify: `src/components/landing/LandingAnnouncementPill.test.ts`
- Modify: `index.html`
- Modify: `src/components/landing/LandingHero.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `LandingHero({ hasSession: boolean, onSignUp: () => void })`
- Produces: rendered external anchor `href="https://wa.me/601167389886?text=Hey%2C%20I%20want%20to%20learn%20more%20about%20Kilobot."`

- [x] **Step 1: Write the failing regressions**

Add a root-embed regression beside the existing homepage metadata tests:

```ts
test('root page does not embed a customer website widget', () => {
  const indexSource = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');

  expect(indexSource).not.toContain('data-kilobot-widget');
  expect(indexSource).not.toContain('pub_db21708de03541e6bfc50e6a25d9dc52');
});
```

Update the hero action regression to locate the WhatsApp anchor and assert the approved behavior:

```ts
const liveDemoAction = markup.match(
  /<a class="([^"]*)" href="([^"]*)" target="_blank" rel="noopener noreferrer">Try Live Demo<\/a>/,
);

expect(liveDemoAction?.[1].split(' ')).toEqual(
  expect.arrayContaining(['h-11', 'w-[240px]', 'flex-none', 'px-6', 'sm:w-auto']),
);
expect(liveDemoAction?.[2]).toBe(
  'https://wa.me/601167389886?text=Hey%2C%20I%20want%20to%20learn%20more%20about%20Kilobot.',
);
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/landing/LandingAnnouncementPill.test.ts
```

Expected: FAIL because `index.html` still contains `data-kilobot-widget` and the hero still renders the internal `/contact?intent=demo` link with `Book a demo`.

- [x] **Step 3: Remove the root widget embed**

Delete only this block from `index.html`:

```html
<script
  async
  src="https://kilobot.app/widget/v1.js"
  data-kilobot-widget="pub_db21708de03541e6bfc50e6a25d9dc52"
  data-kilobot-mode="traditional"
></script>
```

- [x] **Step 4: Replace the hero action with the external WhatsApp anchor**

Replace only the secondary hero `Link` in `LandingHero.tsx`:

```tsx
<a
  className="inline-flex h-11 w-[240px] flex-none items-center justify-center rounded-full border border-zinc-200 bg-transparent px-6 text-sm font-semibold text-zinc-950 transition-all hover:bg-zinc-50 sm:w-auto dark:border-white/20 dark:text-white dark:hover:bg-white/5"
  href="https://wa.me/601167389886?text=Hey%2C%20I%20want%20to%20learn%20more%20about%20Kilobot."
  target="_blank"
  rel="noopener noreferrer"
>
  Try Live Demo
</a>
```

- [x] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/landing/LandingAnnouncementPill.test.ts
```

Expected: all tests in the file PASS with no warnings.

- [x] **Step 6: Run proportional verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/landing/LandingHero.tsx src/components/landing/LandingAnnouncementPill.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
```

Expected: scoped ESLint, production build, and whitespace validation PASS.

- [x] **Step 7: Record local completion and start the review server**

Update `CONTINUITY.md` with the exact test/build results and mark production availability `UNCONFIRMED`. Do not update `kilobot-docs/docs/releases/changelog.mdx`.

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run dev --host 127.0.0.1 --port 5179
```

Expected: Vite serves the homepage at `http://127.0.0.1:5179/`; an HTTP request returns 200 and the served landing module contains `Try Live Demo` plus the encoded WhatsApp URL.

- [x] **Step 8: Commit the implementation after user review**

```bash
git add index.html src/components/landing/LandingHero.tsx src/components/landing/LandingAnnouncementPill.test.ts CONTINUITY.md docs/superpowers/plans/2026-08-11-landing-whatsapp-live-demo.md
git commit -m "Add WhatsApp live demo hero action"
```

---

### Task 2: Add the WhatsApp brand icon to the live-demo action

**Files:**
- Modify: `src/components/landing/LandingAnnouncementPill.test.ts`
- Modify: `src/components/landing/LandingHero.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: the external live-demo anchor produced by Task 1
- Produces: one decorative `SiWhatsapp` icon before `Try Live Demo`

- [x] **Step 1: Write the failing rendered-markup regression**

Capture the live-demo anchor contents and require the approved spacing and icon:

```ts
const liveDemoAction = markup.match(
  /<a class="([^"]*)" href="([^"]*)" target="_blank" rel="noopener noreferrer">(.*?)<\/a>/,
);

expect(liveDemoAction?.[1].split(' ')).toEqual(
  expect.arrayContaining([
    'h-11',
    'w-[240px]',
    'flex-none',
    'gap-2',
    'px-6',
    'sm:w-auto',
  ]),
);
expect(liveDemoAction?.[3]).toContain('<svg');
expect(liveDemoAction?.[3]).toContain('aria-hidden="true"');
expect(liveDemoAction?.[3]).toContain('class="size-4 shrink-0 text-[#25D366]"');
expect(liveDemoAction?.[3]).toMatch(/<\/svg>Try Live Demo$/);
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/landing/LandingAnnouncementPill.test.ts
```

Expected: FAIL because the action lacks `gap-2` and its content contains no WhatsApp SVG.

- [x] **Step 3: Add the WhatsApp icon**

Import the installed brand icon:

```tsx
import { SiWhatsapp } from 'react-icons/si';
```

Add `gap-2` to the existing anchor classes and render the decorative icon before its label:

```tsx
<SiWhatsapp aria-hidden className="size-4 shrink-0 text-[#25D366]" />
Try Live Demo
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/landing/LandingAnnouncementPill.test.ts
```

Expected: all six tests PASS.

- [x] **Step 5: Run proportional verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/landing/LandingHero.tsx src/components/landing/LandingAnnouncementPill.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
```

Expected: scoped ESLint, production build, and whitespace validation PASS. Existing local environment and bundle-size build warnings may remain.

- [x] **Step 6: Record and commit the verified follow-up**

Update `CONTINUITY.md` with the RED/GREEN and verification receipts. Production availability remains `UNCONFIRMED`, so do not update `kilobot-docs/docs/releases/changelog.mdx`.

```bash
git add src/components/landing/LandingHero.tsx src/components/landing/LandingAnnouncementPill.test.ts CONTINUITY.md docs/superpowers/plans/2026-08-11-landing-whatsapp-live-demo.md
git commit -m "Add WhatsApp icon to live demo action"
```

---

### Task 3: Restore the text-only live-demo action

**Files:**
- Modify: `src/components/landing/LandingAnnouncementPill.test.ts`
- Modify: `src/components/landing/LandingHero.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: the WhatsApp live-demo anchor from Task 1
- Produces: the same anchor with text-only `Try Live Demo` content

- [x] **Step 1: Write the failing text-only regression**

Keep the rendered anchor capture, remove the icon expectations, and require no icon-only gap or SVG:

```ts
expect(liveDemoAction?.[1].split(' ')).not.toContain('gap-2');
expect(liveDemoAction?.[3]).toBe('Try Live Demo');
expect(liveDemoAction?.[3]).not.toContain('<svg');
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/landing/LandingAnnouncementPill.test.ts
```

Expected: FAIL because the action still contains `gap-2` and the WhatsApp SVG.

- [x] **Step 3: Remove the icon treatment**

Remove `SiWhatsapp` from the imports, remove `gap-2` from the live-demo anchor, and delete the icon element. Keep all other anchor attributes and classes unchanged.

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/landing/LandingAnnouncementPill.test.ts
```

Expected: all six tests PASS.

- [x] **Step 5: Verify, record, commit, and publish**

Run scoped ESLint, the Node 22 production build, and `git diff --check`. Update `CONTINUITY.md`, commit the verified files, apply the commit to the primary feature branch, push with tracking, and create a draft PR to `main` through the GitHub plugin.
