# Docs Balanced Reading Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase guide body and subtitle sizes to the approved balanced scale and center only the Quick Start testing screenshot at 70% desktop width.

**Architecture:** Keep article typography in the existing global Docs stylesheet. Wrap the one compact screenshot in a content-level sizing hook so the global MDX image renderer and every other image retain their current behavior.

**Tech Stack:** Docusaurus 3.10.2, MDX, CSS, Node.js 22, Bun 1.3.6

## Global Constraints

- Main Markdown body copy and its opening paragraph use 17px.
- H2 section subtitles use 22px.
- H3 subsection subtitles use 18px.
- H1, H4, image captions, navigation, page outline, pagination, cards, and interface chrome retain their current sizes.
- Only the screenshot below `Test your agent` is 70% article width and centered on desktop.
- The testing screenshot returns to 100% width on viewports below 768px.
- The screenshot caption follows the compact width.
- The existing click-to-expand lightbox remains unchanged.
- Use no new dependency.
- Keep code files below 300 lines and add no code comments.
- Use Node.js 22 in the same shell invocation for every script or test.

---

### Task 1: Balanced article typography and compact testing screenshot

**Files:**
- Modify: `kilobot-docs/tests/help-center-brand.test.mjs`
- Modify: `kilobot-docs/tests/simplified-onboarding.test.mjs`
- Modify: `kilobot-docs/src/css/custom.css`
- Modify: `kilobot-docs/docs/start-here/quick-start.mdx`

**Interfaces:**
- Consumes: the existing `.theme-doc-markdown` article scope and global `MDXComponents/Img` renderer.
- Produces: the `.docs-image-compact` content hook, which constrains its complete image-and-caption group without changing the lightbox.

- [ ] **Step 1: Write the failing typography contract**

Extend the branding test's article typography assertions:

```js
assert.match(
  customCss,
  /\.theme-doc-markdown\s*\{[^}]*font-size:\s*1\.0625rem;[^}]*line-height:\s*1\.7;/s,
);
assert.match(
  customCss,
  /\.theme-doc-markdown h2\s*\{[^}]*font-size:\s*1\.375rem;/s,
);
assert.match(
  customCss,
  /\.theme-doc-markdown h3\s*\{[^}]*font-size:\s*1\.125rem;/s,
);
assert.match(
  customCss,
  /\.theme-doc-markdown > p:first-of-type\s*\{[^}]*font-size:\s*1\.0625rem;/s,
);
```

- [ ] **Step 2: Write the failing compact-image contract**

Extend the Quick Start test:

```js
const testingImageStart = quickStart.indexOf('<div className="docs-image-compact">');
const testingImage = quickStart.indexOf(
  'https://storage.kilobot.app/docs/docs-testing.png',
);
const testingImageEnd = quickStart.indexOf('</div>', testingImageStart);

assert.ok(testingImageStart >= 0);
assert.ok(testingImageStart < testingImage);
assert.ok(testingImage < testingImageEnd);
```

Extend the branding CSS contract:

```js
assert.match(
  customCss,
  /\.docs-image-compact\s*\{[^}]*width:\s*70%;[^}]*margin-inline:\s*auto;/s,
);
assert.match(
  customCss,
  /@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*?\.docs-image-compact\s*\{[^}]*width:\s*100%;/s,
);
```

- [ ] **Step 3: Run the focused tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run test -- tests/help-center-brand.test.mjs tests/simplified-onboarding.test.mjs
```

Expected: FAIL because the article still uses 15px/18px/16px and the compact image hook does not exist.

- [ ] **Step 4: Implement the balanced scale**

Update the existing rules in `kilobot-docs/src/css/custom.css`:

```css
.theme-doc-markdown {
  font-size: 1.0625rem;
  line-height: 1.7;
}

.theme-doc-markdown h2 {
  margin-top: 2.5rem;
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.theme-doc-markdown h3 {
  margin-top: 1.75rem;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.theme-doc-markdown > p:first-of-type {
  color: var(--ifm-font-color-secondary);
  font-size: 1.0625rem;
}
```

- [ ] **Step 5: Add the compact image wrapper and responsive styling**

Wrap only the testing screenshot in `quick-start.mdx`:

```mdx
<div className="docs-image-compact">

![Test the agent with the opening-hours question](https://storage.kilobot.app/docs/docs-testing.png)

</div>
```

Add the content-level hook to `custom.css`:

```css
.docs-image-compact {
  width: 70%;
  margin-inline: auto;
}

@media (max-width: 767px) {
  .docs-image-compact {
    width: 100%;
  }
}
```

- [ ] **Step 6: Run the focused tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run test -- tests/help-center-brand.test.mjs tests/simplified-onboarding.test.mjs
```

Expected: both focused test files pass.

- [ ] **Step 7: Run complete Docs verification**

Run from `kilobot-docs`:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run test && bun test src/components/DocGuideComponents.test.tsx src/theme/MDXComponents/Img/index.test.tsx && bun run typecheck && bun run build && cd .. && git diff --check
```

Expected: all Docs tests, component tests, TypeScript, the production build, and whitespace checks pass.

- [ ] **Step 8: Record the verified change**

Update `CONTINUITY.md` with the approved scale, the scoped screenshot sizing, exact verification results, and unreleased status. Do not add a production changelog entry.

- [ ] **Step 9: Commit the implementation**

```bash
git add kilobot-docs/tests/help-center-brand.test.mjs kilobot-docs/tests/simplified-onboarding.test.mjs kilobot-docs/src/css/custom.css kilobot-docs/docs/start-here/quick-start.mdx CONTINUITY.md
git commit -m "style(docs): improve guide readability"
```
