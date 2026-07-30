# Compact Tall Quick Start Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center the Source training and Test your agent screenshots at 40% desktop width while preserving each complete image and the existing full-width mobile treatment.

**Architecture:** Reuse the existing `.docs-image-compact` wrapper and global MDX image renderer. Change the wrapper width from 70% to 40% and add the same wrapper around the Source training screenshot; no image, caption, or lightbox code changes.

**Tech Stack:** Docusaurus 3.10.2, MDX, CSS, Node.js 22, Bun 1.3.6

## Global Constraints

- Source training and Test your agent screenshots use 40% article width on desktop.
- Both screenshots are centered.
- Both return to 100% width below 768px.
- Both preserve their complete aspect ratios without cropping.
- Both retain their captions and click-to-expand lightboxes.
- Agent signup, Knowledge Base Q&A, and every other guide image retain their current widths.
- Use no new dependency.
- Keep code files below 300 lines and add no code comments.
- Use Node.js 22 in the same shell invocation for every script or test.

---

### Task 1: Shared compact treatment for both tall screenshots

**Files:**
- Modify: `kilobot-docs/tests/help-center-brand.test.mjs`
- Modify: `kilobot-docs/tests/simplified-onboarding.test.mjs`
- Modify: `kilobot-docs/src/css/custom.css`
- Modify: `kilobot-docs/docs/start-here/quick-start.mdx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `.docs-image-compact` and the global `MDXComponents/Img` renderer.
- Produces: two independent compact wrapper instances using the same responsive CSS contract.

- [ ] **Step 1: Write the failing 40% CSS contract**

Change the compact-image assertion in `help-center-brand.test.mjs`:

```js
assert.match(
  css,
  /\.docs-image-compact\s*\{[^}]*width:\s*40%;[^}]*margin-inline:\s*auto;/s,
);
```

Keep the existing mobile `width: 100%` assertion unchanged.

- [ ] **Step 2: Write the failing two-image wrapper contract**

Replace the single testing-image wrapper assertions in `simplified-onboarding.test.mjs`:

```js
const compactImageUrls = [
  'https://storage.kilobot.app/docs/docs-training.jpeg',
  'https://storage.kilobot.app/docs/docs-testing.png',
];
const compactWrapper = '<div className="docs-image-compact">';
const compactWrappers = [...quickStart.matchAll(
  /<div className="docs-image-compact">[\s\S]*?<\/div>/g,
)].map((match) => match[0]);

assert.equal(compactWrappers.length, 2);
for (const compactImageUrl of compactImageUrls) {
  assert.equal(
    compactWrappers.some((wrapper) => wrapper.includes(compactImageUrl)),
    true,
    compactImageUrl,
  );
}
assert.equal(quickStart.match(new RegExp(compactWrapper, 'g'))?.length, 2);
```

- [ ] **Step 3: Run focused tests to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && node --test tests/help-center-brand.test.mjs tests/simplified-onboarding.test.mjs
```

Expected: FAIL because the CSS still uses 70% and only the testing screenshot has the compact wrapper.

- [ ] **Step 4: Implement the 40% shared treatment**

Change the existing CSS rule:

```css
.docs-image-compact {
  width: 40%;
  margin-inline: auto;
}
```

Keep the existing mobile rule:

```css
@media (max-width: 767px) {
  .docs-image-compact {
    width: 100%;
  }
}
```

Wrap the Source training screenshot in `quick-start.mdx`:

```mdx
<div className="docs-image-compact">

![Source training in the Knowledge Base](https://storage.kilobot.app/docs/docs-training.jpeg)

</div>
```

Keep the existing testing screenshot wrapper unchanged.

- [ ] **Step 5: Run focused tests to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && node --test tests/help-center-brand.test.mjs tests/simplified-onboarding.test.mjs
```

Expected: both focused test files pass.

- [ ] **Step 6: Run complete Docs verification**

Run from `kilobot-docs`:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run test && bun test src/components/DocGuideComponents.test.tsx src/theme/MDXComponents/Img/index.test.tsx && bun run typecheck && bun run build && cd .. && git diff --check
```

Expected: all Docs tests, component tests, TypeScript, the production build, and whitespace checks pass.

- [ ] **Step 7: Record the verified revision**

Update `CONTINUITY.md` so D509 and the current snapshot describe both screenshots at 40%, the no-crop behavior, exact verification results, and unreleased status. Do not add a production changelog entry.

- [ ] **Step 8: Commit the implementation**

```bash
git add kilobot-docs/tests/help-center-brand.test.mjs kilobot-docs/tests/simplified-onboarding.test.mjs kilobot-docs/src/css/custom.css kilobot-docs/docs/start-here/quick-start.mdx CONTINUITY.md
git commit -m "style(docs): compact tall quick start images"
```
