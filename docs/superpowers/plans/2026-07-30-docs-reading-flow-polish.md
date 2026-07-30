# Docs Reading Flow Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Quick Start card ending with compact inline links, give every admonition a borderless semantic treatment, and balance the desktop article between equal spacer tracks and a far-right page-outline rail.

**Architecture:** Keep Docusaurus content and generated admonition markup intact. Add one focused global CSS module for admonitions, express the desktop rail layout through the existing `DocRoot/Layout/Main` CSS module, and enforce each approved contract with Node-native source tests.

**Tech Stack:** Docusaurus 3, MDX, CSS Modules, global CSS, Bun, Node test runner.

## Global Constraints

- Use Node v22 for every script and test command.
- Use Bun for KiloBot Docs scripts.
- Keep Quick Start to the existing three required setup steps.
- Keep the three approved next-step destinations.
- Every admonition is borderless and uses a semantic tinted surface.
- The desktop article uses equal flexible spacer tracks before and after it.
- The desktop page outline occupies a dedicated far-right rail.
- Preserve the existing mobile outline and prevent horizontal overflow.
- Keep every code file below 300 lines.
- Do not update the public changelog or deploy because these docs are unreleased.

---

### Task 1: Compact the Quick Start ending

**Files:**
- Modify: `kilobot-docs/tests/simplified-onboarding.test.mjs`
- Modify: `kilobot-docs/docs/start-here/quick-start.mdx`

**Interfaces:**
- Consumes: Existing Docusaurus MDX internal-link syntax.
- Produces: One `Next steps` paragraph with three inline guide links.

- [ ] **Step 1: Replace the card assertions with a failing inline-link contract**

Update the first test in `kilobot-docs/tests/simplified-onboarding.test.mjs`:

```js
test('keeps Quick Start to three required steps and compact next steps', () => {
  const quickStart = read('docs/start-here/quick-start.mdx');
  const requiredHeadings = [...quickStart.matchAll(/^## ([1-9])\. (.+)$/gm)];
  const nextSteps =
    'Your agent is ready! Continue by [deploying it to channels](/channels/connect-channels), [setting up workflows](/automate/workflow-overview), or [setting up bookings](/bookings/services).';

  assert.deepEqual(
    requiredHeadings.map((match) => match[2].replace(/ ·.+$/, '')),
    ['Create your agent', 'Add knowledge', 'Test your agent'],
  );
  assert.ok(quickStart.includes('## Next steps'));
  assert.ok(quickStart.includes(nextSteps));
  assert.equal(quickStart.includes("import DocCard from"), false);
  assert.equal(quickStart.includes('<DocCard'), false);
  assert.equal(quickStart.includes('Connect the Website widget'), false);
  assert.equal(quickStart.includes('Confirm the conversation in Inbox'), false);
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/simplified-onboarding.test.mjs
```

Expected: FAIL because Quick Start still imports and renders three `DocCard` components.

- [ ] **Step 3: Replace the cards with the approved paragraph**

Remove:

```mdx
import DocCard from '@site/src/components/DocCard';
```

Replace the existing ending with:

```mdx
## Next steps

Your agent is ready! Continue by [deploying it to channels](/channels/connect-channels), [setting up workflows](/automate/workflow-overview), or [setting up bookings](/bookings/services).
```

- [ ] **Step 4: Run the contract and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/simplified-onboarding.test.mjs
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit the compact ending**

```bash
git add kilobot-docs/docs/start-here/quick-start.mdx kilobot-docs/tests/simplified-onboarding.test.mjs
git commit -m "docs: compact Quick Start next steps"
```

---

### Task 2: Add the borderless admonition system

**Files:**
- Create: `kilobot-docs/src/css/admonitions.css`
- Create: `kilobot-docs/tests/docs-visual-system.test.mjs`
- Modify: `kilobot-docs/src/css/custom.css`

**Interfaces:**
- Consumes: Docusaurus global classes `theme-admonition` and `theme-admonition-{type}`.
- Produces: Theme-aware Note/Info, Tip, Warning/Caution, and Danger surfaces without changing MDX.

- [ ] **Step 1: Write the failing admonition contract**

Create `kilobot-docs/tests/docs-visual-system.test.mjs`:

```js
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

test('styles every admonition as a borderless semantic surface', () => {
  const customCss = read('src/css/custom.css');
  const admonitionsCss = read('src/css/admonitions.css');

  assert.match(customCss, /^@import '\.\/admonitions\.css';/);
  assert.ok(admonitionsCss.includes('.theme-admonition {'));
  assert.ok(admonitionsCss.includes('border: 0;'));
  assert.ok(admonitionsCss.includes('box-shadow: none;'));
  assert.ok(admonitionsCss.includes('border-radius: 0.875rem;'));
  assert.ok(admonitionsCss.includes('padding: 1.5rem 2rem;'));
  assert.ok(admonitionsCss.includes('padding: 1.25rem;'));
  assert.ok(admonitionsCss.includes('10%'));
  assert.ok(admonitionsCss.includes('18%'));
  assert.ok(admonitionsCss.includes('.theme-admonition-note'));
  assert.ok(admonitionsCss.includes('.theme-admonition-info'));
  assert.ok(admonitionsCss.includes('.theme-admonition-tip'));
  assert.ok(admonitionsCss.includes('.theme-admonition-warning'));
  assert.ok(admonitionsCss.includes('.theme-admonition-caution'));
  assert.ok(admonitionsCss.includes('.theme-admonition-danger'));
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/docs-visual-system.test.mjs
```

Expected: FAIL with `ENOENT` because `src/css/admonitions.css` does not exist.

- [ ] **Step 3: Add the focused admonition stylesheet**

Create `kilobot-docs/src/css/admonitions.css`:

```css
.theme-admonition {
  --kilobot-admonition-accent: #0f766e;
  --kilobot-admonition-surface: color-mix(
    in srgb,
    var(--kilobot-admonition-accent) 10%,
    var(--ifm-background-color)
  );
  margin: 1.5rem 0;
  padding: 1.5rem 2rem;
  border: 0;
  border-radius: 0.875rem;
  background: var(--kilobot-admonition-surface);
  box-shadow: none;
  color: var(--ifm-font-color-base);
}

[data-theme='dark'] .theme-admonition {
  --kilobot-admonition-surface: color-mix(
    in srgb,
    var(--kilobot-admonition-accent) 18%,
    var(--ifm-background-color)
  );
}

.theme-admonition-note,
.theme-admonition-info {
  --kilobot-admonition-accent: #0f766e;
}

.theme-admonition-tip {
  --kilobot-admonition-accent: #15803d;
}

.theme-admonition-warning,
.theme-admonition-caution {
  --kilobot-admonition-accent: #b45309;
}

.theme-admonition-danger {
  --kilobot-admonition-accent: #b91c1c;
}

[data-theme='dark'] .theme-admonition-note,
[data-theme='dark'] .theme-admonition-info {
  --kilobot-admonition-accent: #5eead4;
}

[data-theme='dark'] .theme-admonition-tip {
  --kilobot-admonition-accent: #86efac;
}

[data-theme='dark'] .theme-admonition-warning,
[data-theme='dark'] .theme-admonition-caution {
  --kilobot-admonition-accent: #fbbf24;
}

[data-theme='dark'] .theme-admonition-danger {
  --kilobot-admonition-accent: #f87171;
}

.theme-admonition > div:first-child {
  margin-bottom: 1rem;
  color: var(--kilobot-admonition-accent);
  font-size: 1rem;
  font-weight: 650;
  text-transform: none;
}

.theme-admonition > div:first-child span {
  color: var(--kilobot-admonition-accent);
}

.theme-admonition > div:first-child svg {
  fill: currentColor;
}

.theme-admonition > div:last-child {
  color: var(--ifm-font-color-base);
}

@media (max-width: 767px) {
  .theme-admonition {
    padding: 1.25rem;
  }
}
```

- [ ] **Step 4: Import the stylesheet and remove the old bordered rule**

Add this as the first line of `kilobot-docs/src/css/custom.css`:

```css
@import './admonitions.css';
```

Remove:

```css
.alert {
  border-width: 1px;
  border-radius: 0.65rem;
  box-shadow: none;
}
```

- [ ] **Step 5: Run the contract and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/docs-visual-system.test.mjs
```

Expected: PASS, 1 test.

- [ ] **Step 6: Commit the admonition system**

```bash
git add kilobot-docs/src/css/admonitions.css kilobot-docs/src/css/custom.css kilobot-docs/tests/docs-visual-system.test.mjs
git commit -m "docs: style borderless semantic callouts"
```

---

### Task 3: Balance the desktop article and outline rails

**Files:**
- Modify: `kilobot-docs/tests/docs-visual-system.test.mjs`
- Modify: `kilobot-docs/tests/help-center-brand.test.mjs`
- Modify: `kilobot-docs/tests/simplified-onboarding.test.mjs`
- Modify: `kilobot-docs/src/theme/DocRoot/Layout/Main/styles.module.css`
- Modify: `kilobot-docs/src/css/toc.css`

**Interfaces:**
- Consumes: Existing `DocRoot/Layout/Main` row, first `.col`, and `.col--3` outline hooks.
- Produces: Three centered tracks without an outline and four tracks with a far-right outline.

- [ ] **Step 1: Add the failing balanced-layout contract**

Append to `kilobot-docs/tests/docs-visual-system.test.mjs`:

```js
test('balances the desktop article between equal spacers and a right rail', () => {
  const layoutCss = read('src/theme/DocRoot/Layout/Main/styles.module.css');
  const tocCss = read('src/css/toc.css');
  const balancedTracks = [
    'minmax(2.5rem, 1fr)',
    'minmax(0, 56rem)',
    'minmax(2.5rem, 1fr)',
    'clamp(14rem, 18vw, 19rem)',
  ];

  assert.ok(layoutCss.includes('@media (min-width: 997px)'));
  for (const track of balancedTracks) {
    assert.ok(layoutCss.includes(track));
  }
  assert.ok(layoutCss.includes(':has(> :global(.col--3))'));
  assert.ok(layoutCss.includes('grid-column: 2;'));
  assert.ok(layoutCss.includes('grid-column: 4;'));
  assert.ok(layoutCss.includes('--doc-content-pad-x: 0;'));
  assert.equal(tocCss.includes('padding-left: 2rem;'), false);
});
```

In `kilobot-docs/tests/help-center-brand.test.mjs`, replace:

```js
assert.ok(docMainStyles.includes('--doc-content-pad-x: 11rem'));
```

with:

```js
assert.ok(docMainStyles.includes('--doc-content-pad-x: 0'));
```

In `kilobot-docs/tests/simplified-onboarding.test.mjs`, replace the page-outline spacing test with:

```js
test('keeps the desktop outline sticky without a duplicated local spacer', () => {
  const tocCss = read('src/css/toc.css');
  const desktopRule = tocCss.match(
    /\.theme-doc-toc-desktop \{[\s\S]*?\n\}/,
  )?.[0];

  assert.ok(desktopRule);
  assert.equal(desktopRule.includes('padding-left: 2rem;'), false);
  assert.equal(tocCss.includes('@media (max-width: 996px)'), false);
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/docs-visual-system.test.mjs
```

Expected: FAIL because the layout still uses `11rem` container padding, a 75/25 Docusaurus row, and the local `2rem` outline spacer.

- [ ] **Step 3: Replace desktop padding with centered grid tracks**

Replace the desktop `.docContent` rule and add row placement in `kilobot-docs/src/theme/DocRoot/Layout/Main/styles.module.css`:

```css
@media (min-width: 997px) {
  .docContent {
    --doc-content-pad: 2.75rem;
    --doc-content-pad-x: 0;
  }

  .docContent > :global(.row) {
    display: grid;
    grid-template-columns:
      minmax(2.5rem, 1fr)
      minmax(0, 56rem)
      minmax(2.5rem, 1fr);
  }

  .docContent > :global(.row):has(> :global(.col--3)) {
    grid-template-columns:
      minmax(2.5rem, 1fr)
      minmax(0, 56rem)
      minmax(2.5rem, 1fr)
      clamp(14rem, 18vw, 19rem);
  }

  .docContent > :global(.row) > :global(.col):first-child {
    grid-column: 2;
    width: auto;
    max-width: none !important;
  }

  .docContent > :global(.row) > :global(.col--3) {
    grid-column: 4;
    width: auto;
    max-width: none;
  }

  .docMainContainer {
    flex-grow: 1;
    max-width: calc(100% - var(--doc-sidebar-width));
  }

  .docMainContainerEnhanced {
    max-width: calc(100% - var(--doc-sidebar-hidden-width));
  }

  .docItemWrapperEnhanced {
    max-width: calc(
      var(--ifm-container-width) + var(--doc-sidebar-width)
    ) !important;
  }
}
```

- [ ] **Step 4: Remove the obsolete outline spacer**

Remove `padding-left: 2rem;` from `.theme-doc-toc-desktop` in `kilobot-docs/src/css/toc.css`. The equal third grid track now supplies the article-to-outline spacing.

- [ ] **Step 5: Run the focused contracts and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/docs-visual-system.test.mjs tests/help-center-brand.test.mjs tests/simplified-onboarding.test.mjs
```

Expected: PASS, 16 tests.

- [ ] **Step 6: Run full automated verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun run test && bun test src/components/DocGuideComponents.test.tsx && bun run typecheck && bun run build && cd .. && git diff --check
```

Expected: all Node-native docs tests and both rendered component tests pass; TypeScript and Docusaurus production build exit 0; whitespace check is clean.

- [ ] **Step 7: Run the responsive visual review**

Serve `kilobot-docs/build` locally and inspect:

- `/engage/broadcast` at `1920×1080` in light and dark themes: the Warning callout has no border, uses an amber-tinted surface, and retains readable title/body contrast.
- `/start-here/quick-start` at `1920×1080`: the left and middle flexible tracks are equal, the article is centered, and the outline occupies the far-right rail.
- `/start-here/quick-start` at `390×844`: the desktop rail is absent, the mobile outline remains usable, and `scrollWidth` does not exceed `clientWidth`.

- [ ] **Step 8: Commit the balanced layout**

```bash
git add kilobot-docs/src/theme/DocRoot/Layout/Main/styles.module.css kilobot-docs/src/css/toc.css kilobot-docs/tests/docs-visual-system.test.mjs kilobot-docs/tests/help-center-brand.test.mjs kilobot-docs/tests/simplified-onboarding.test.mjs
git commit -m "docs: balance article and page outline rails"
```

---

## Final branch verification

- [ ] Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun run test && bun test src/components/DocGuideComponents.test.tsx && bun run typecheck && bun run build && cd .. && git diff --check && git status --short --branch
```

- [ ] Update `CONTINUITY.md` with the verified unreleased state and exact receipts.
- [ ] Do not update `kilobot-docs/docs/releases/changelog.mdx`.
