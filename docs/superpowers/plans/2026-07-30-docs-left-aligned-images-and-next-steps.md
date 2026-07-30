# Left-Aligned Documentation Images and Quick Start Next Steps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Left-align every documentation content image and caption, prevent captionless Markdown images, and replace Quick Start's closing sentence with three outcome-focused Next steps links.

**Architecture:** Keep the shared `MDXComponents/Img` renderer as the global presentation boundary, use one left-anchored compact wrapper for the two tall Quick Start screenshots, and enforce caption coverage by recursively scanning public Markdown files. Keep the Quick Start navigation as ordinary linked prose rather than introducing a new component.

**Tech Stack:** Docusaurus 3.10.2, React 19, MDX, CSS Modules, Node.js 22, Bun 1.3.6

## Global Constraints

- Every documentation content image and visible caption starts at the article's left edge.
- Quick Start's Source training and Test your agent screenshots remain 40% wide on desktop and 100% wide below 768px.
- Images preserve their complete aspect ratios without cropping.
- Existing click-to-expand behavior, dialog controls, captions, and borderless styling remain unchanged.
- Every public Markdown or MDX image has non-empty descriptive text.
- Decorative navbar, banner, icon, and lightbox assets remain outside the content-image contract.
- Quick Start Next steps appear in this order: Deploy to channels, Set up workflows, Automate bookings.
- Next steps use standard prose and links, with no new card or emphasized container.
- Use no new dependency.
- Keep code files below 300 lines and add no code comments.
- Invoke Node.js 22 in the same shell execution for every script or test.
- Do not add a public changelog entry until production availability is confirmed.

---

### Task 1: Global left-aligned content images and caption coverage

**Files:**
- Modify: `kilobot-docs/tests/help-center-brand.test.mjs`
- Modify: `kilobot-docs/tests/help-center-structure.test.mjs`
- Modify: `kilobot-docs/src/theme/MDXComponents/Img/styles.module.css`
- Modify: `kilobot-docs/src/css/custom.css`

**Interfaces:**
- Consumes: Markdown image syntax `![description](source)`, `.docs-image-compact`, and the shared `MDXComponents/Img` renderer.
- Produces: a global left-aligned content-image surface and a recursive content validation contract for non-empty image descriptions.

- [ ] **Step 1: Write the failing alignment contracts**

Update the compact-image assertion in `help-center-brand.test.mjs` and add shared-renderer assertions:

```js
test('left-aligns content images and captions at every supported width', () => {
  const css = read('src/css/custom.css');
  const imageCss = read('src/theme/MDXComponents/Img/styles.module.css');

  assert.match(
    css,
    /\.docs-image-compact\s*\{[^}]*width:\s*40%;[^}]*margin-left:\s*0;[^}]*margin-right:\s*auto;/s,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*?\.docs-image-compact\s*\{[^}]*width:\s*100%;/s,
  );
  assert.match(imageCss, /\.root\s*\{[^}]*text-align:\s*left;/s);
  assert.match(imageCss, /\.caption\s*\{[^}]*text-align:\s*left;/s);
});
```

This test catches accidental restoration of centered compact wrappers or centered captions.

- [ ] **Step 2: Add the recursive caption coverage guard**

Extend `help-center-structure.test.mjs` with a recursive file collector:

```js
import {existsSync, readFileSync, readdirSync} from 'node:fs';

function collectMarkdownFiles(directoryPath) {
  return readdirSync(directoryPath, {withFileTypes: true}).flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) return collectMarkdownFiles(entryPath);
    return /\.(?:md|mdx)$/.test(entry.name) ? [entryPath] : [];
  });
}
```

Add the content validation:

```js
test('gives every public documentation image a caption source', () => {
  const docsDirectory = path.join(root, 'docs');

  for (const markdownPath of collectMarkdownFiles(docsDirectory)) {
    const source = readFileSync(markdownPath, 'utf8');
    const relativePath = path.relative(root, markdownPath);

    for (const match of source.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
      assert.notEqual(match[1].trim(), '', `${relativePath}: ${match[2]}`);
    }
  }
});
```

This test catches any future public Markdown image authored without the descriptive text used by the shared caption renderer.

- [ ] **Step 3: Run the focused tests to verify RED**

Run from `kilobot-docs`:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && node --test tests/help-center-brand.test.mjs tests/help-center-structure.test.mjs
```

Expected: FAIL because the compact wrapper still uses `margin-inline: auto`, the renderer root has no explicit left alignment, and the caption remains centered. The caption coverage guard passes against the four existing images and protects future content.

- [ ] **Step 4: Implement the shared left alignment**

Change `src/css/custom.css`:

```css
.docs-image-compact {
  width: 40%;
  margin-left: 0;
  margin-right: auto;
}
```

Keep the existing mobile rule unchanged:

```css
@media (max-width: 767px) {
  .docs-image-compact {
    width: 100%;
  }
}
```

Change `src/theme/MDXComponents/Img/styles.module.css`:

```css
.root {
  display: block;
  margin: 1.5rem 0;
  text-align: left;
}
```

Change the existing caption declaration:

```css
.caption {
  display: block;
  margin-top: 0.5rem;
  color: var(--ifm-font-color-secondary);
  font-size: 0.8125rem;
  line-height: 1.4;
  text-align: left;
}
```

- [ ] **Step 5: Run focused verification for GREEN**

Run from `kilobot-docs`:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && node --test tests/help-center-brand.test.mjs tests/help-center-structure.test.mjs && bun test src/theme/MDXComponents/Img/index.test.tsx
```

Expected: all focused tests pass, including the existing rendered caption and lightbox tests.

- [ ] **Step 6: Commit Task 1**

```bash
git add kilobot-docs/tests/help-center-brand.test.mjs kilobot-docs/tests/help-center-structure.test.mjs kilobot-docs/src/theme/MDXComponents/Img/styles.module.css kilobot-docs/src/css/custom.css
git commit -m "style(docs): left-align guide images"
```

---

### Task 2: Outcome-focused Quick Start Next steps

**Files:**
- Modify: `kilobot-docs/tests/simplified-onboarding.test.mjs`
- Modify: `kilobot-docs/docs/start-here/quick-start.mdx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: the existing `## Next steps` section and the public Channels, Workflows, and Bookings guide routes.
- Produces: one introductory sentence and three ordered linked outcomes in standard Markdown list form.

- [ ] **Step 1: Write the failing Next steps contract**

Replace the old single-sentence fixture in `simplified-onboarding.test.mjs`:

```js
const nextStepItems = [
  '[Deploy to channels](/channels/connect-channels) to let customers chat with your agent on WhatsApp, Instagram, and Messenger.',
  '[Set up workflows](/automate/workflow-overview) to automate what happens during and after conversations.',
  '[Automate bookings](/bookings/services) to let customers book your services through your agent.',
];
```

Replace the old assertion with:

```js
assert.ok(
  quickStart.includes('Your agent is ready. Choose what you want to set up next:'),
);

let previousNextStepIndex = quickStart.indexOf('## Next steps');
for (const nextStepItem of nextStepItems) {
  const nextStepIndex = quickStart.indexOf(`- ${nextStepItem}`);
  assert.ok(nextStepIndex > previousNextStepIndex, nextStepItem);
  previousNextStepIndex = nextStepIndex;
}
```

Keep the existing no-`DocCard` assertions so the section remains plain prose.

- [ ] **Step 2: Run the focused test to verify RED**

Run from `kilobot-docs`:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && node --test tests/simplified-onboarding.test.mjs
```

Expected: FAIL because Quick Start still contains the single inline Next steps sentence.

- [ ] **Step 3: Implement the approved Next steps copy**

Replace the content below `## Next steps` in `quick-start.mdx`:

```md
Your agent is ready. Choose what you want to set up next:

- [Deploy to channels](/channels/connect-channels) to let customers chat with your agent on WhatsApp, Instagram, and Messenger.
- [Set up workflows](/automate/workflow-overview) to automate what happens during and after conversations.
- [Automate bookings](/bookings/services) to let customers book your services through your agent.
```

- [ ] **Step 4: Run the focused test to verify GREEN**

Run from `kilobot-docs`:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && node --test tests/simplified-onboarding.test.mjs
```

Expected: all focused onboarding tests pass.

- [ ] **Step 5: Run complete Docs verification**

Run from `kilobot-docs`:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run test && bun test src/components/DocGuideComponents.test.tsx src/theme/MDXComponents/Img/index.test.tsx && bun run typecheck && bun run build && cd .. && git diff --check
```

Expected: all Docs tests, component tests, TypeScript, the 225-document production build, and whitespace checks pass.

- [ ] **Step 6: Inspect the built Quick Start output**

Confirm `kilobot-docs/build/start-here/quick-start.html` contains:

- Four visible captions.
- Four accessible image-expansion controls.
- Two compact image wrappers.
- The three Next steps links in the approved order.

- [ ] **Step 7: Record the verified revision**

Update `CONTINUITY.md` so the current snapshot, D510/D511 status, Done, Working set, and Receipts record the implemented left alignment, caption coverage, Next steps list, exact verification results, and unreleased status.

- [ ] **Step 8: Commit Task 2**

```bash
git add kilobot-docs/tests/simplified-onboarding.test.mjs kilobot-docs/docs/start-here/quick-start.mdx CONTINUITY.md
git commit -m "docs: expand quick start next steps"
```
