# Guide Outcome Container Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing `By the end, you will` preview the dominant top-of-page element by placing it in one shared borderless container across all 25 instructional guides.

**Architecture:** Add a focused `DocOutcomes` component that renders a semantic section and owns one CSS module. Keep the literal Markdown heading and bullets as children in every MDX file so Docusaurus continues to generate the right-side outline entry, while the existing guide contract explicitly verifies all included and excluded pages.

**Tech Stack:** React 19, TypeScript, Docusaurus MDX, CSS Modules, Node.js 22, Bun, `node:test`, server-rendered React tests

## Global Constraints

- Apply one shared outcome container to all 25 instructional guides.
- Exclude `start-here/welcome.mdx`, `start-here/launch-guide.mdx`, and `releases/changelog.mdx`.
- Do not change the approved outcome wording, Quick Start introduction, navigation, prerequisites, instructional steps, media briefs, or success criteria.
- Keep the literal `### By the end, you will` heading and Markdown list inside each MDX file.
- Render one semantic `<section>` with no icon, gradient, shadow, stripe, accent border, or status color.
- Use a neutral background, no border, a `16px` radius, `28px` desktop padding, and `20px` padding below `640px`.
- Use `24px` top spacing and `32px` bottom spacing.
- Keep `12px` between the heading and its list.
- Preserve the heading in the right-side page outline.
- At `390px`, keep the container within the article width with no horizontal overflow.
- Run every script and test with Node.js 22.
- Keep every code file below 300 lines.
- Do not add this unreleased documentation improvement to the public changelog.

---

### Task 1: Build the shared focused outcome container

**Files:**
- Create: `kilobot-docs/src/components/DocOutcomes.tsx`
- Create: `kilobot-docs/src/components/DocOutcomes.module.css`
- Modify: `kilobot-docs/src/components/DocGuideComponents.test.tsx`
- Modify: `kilobot-docs/tests/docs-visual-system.test.mjs`
- Modify: `kilobot-docs/src/css/custom.css`

**Interfaces:**
- Consumes: `ReactNode` children containing the literal MDX outcome heading and list
- Produces: `DocOutcomes({ children }: { children: ReactNode })` rendering `<section className={styles.root}>{children}</section>`

- [ ] **Step 1: Add the failing rendered-component test**

Import `DocOutcomes` in `DocGuideComponents.test.tsx`:

```tsx
import DocOutcomes from './DocOutcomes';
```

Add this test:

```tsx
test('renders guide outcomes as one semantic section', () => {
  const html = renderToStaticMarkup(
    <DocOutcomes>
      <h3>By the end, you will</h3>
      <ul>
        <li>Create a working agent</li>
        <li>Add one trusted answer</li>
        <li>Test the approved answer</li>
      </ul>
    </DocOutcomes>,
  );

  assert.match(html, /^<section class="[^"]+">/);
  assert.ok(html.includes('<h3>By the end, you will</h3>'));
  assert.ok(html.includes('<li>Create a working agent</li>'));
});
```

- [ ] **Step 2: Add the failing visual-system contract**

Add this test to `docs-visual-system.test.mjs`:

```js
test('makes guide outcomes the focused borderless surface', () => {
  const customCss = read('src/css/custom.css');
  const outcomesCss = read('src/components/DocOutcomes.module.css');
  const rootRule = outcomesCss.match(/\.root \{[\s\S]*?\n\}/)?.[0];

  assert.ok(rootRule);
  assert.doesNotMatch(rootRule, /^\s*border(?:-left)?:/m);
  assert.doesNotMatch(rootRule, /^\s*box-shadow:/m);
  assert.ok(rootRule.includes('margin: 1.5rem 0 2rem;'));
  assert.ok(rootRule.includes('padding: 1.75rem;'));
  assert.ok(rootRule.includes('border-radius: 1rem;'));
  assert.ok(rootRule.includes('background: var(--kilobot-outcomes);'));
  assert.ok(outcomesCss.includes('margin: 0 0 0.75rem !important;'));
  assert.ok(outcomesCss.includes('@media (max-width: 640px)'));
  assert.ok(outcomesCss.includes('padding: 1.25rem;'));
  assert.ok(customCss.includes('--kilobot-outcomes: #eeeeef;'));
  assert.ok(customCss.includes('--kilobot-outcomes: #333333;'));
});
```

- [ ] **Step 3: Run both focused tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun test src/components/DocGuideComponents.test.tsx && node --test tests/docs-visual-system.test.mjs
```

Expected: the component test fails because `DocOutcomes` does not exist, and the visual-system test fails because its CSS module and theme variable do not exist.

- [ ] **Step 4: Add the shared component**

Create `DocOutcomes.tsx`:

```tsx
import type { ReactNode } from 'react';
import styles from './DocOutcomes.module.css';

export default function DocOutcomes({ children }: { children: ReactNode }) {
  return <section className={styles.root}>{children}</section>;
}
```

- [ ] **Step 5: Add the exact focused styles**

Create `DocOutcomes.module.css`:

```css
.root {
  margin: 1.5rem 0 2rem;
  padding: 1.75rem;
  border-radius: 1rem;
  background: var(--kilobot-outcomes);
}

.root :global(h3) {
  margin: 0 0 0.75rem !important;
}

.root :global(ul) {
  margin: 0;
  padding-left: 1.25rem;
}

.root :global(li + li) {
  margin-top: 0.375rem;
}

@media (max-width: 640px) {
  .root {
    padding: 1.25rem;
  }
}
```

Add the light variable beside `--kilobot-muted` in `:root`:

```css
--kilobot-outcomes: #eeeeef;
```

Add the dark variable beside `--kilobot-muted` in `[data-theme='dark']`:

```css
--kilobot-outcomes: #333333;
```

- [ ] **Step 6: Run both focused tests and verify GREEN**

Run the Step 3 command.

Expected: the rendered component suite passes 3 tests and the visual-system suite passes 4 tests.

- [ ] **Step 7: Commit the reusable container**

```bash
git add kilobot-docs/src/components/DocOutcomes.tsx kilobot-docs/src/components/DocOutcomes.module.css kilobot-docs/src/components/DocGuideComponents.test.tsx kilobot-docs/tests/docs-visual-system.test.mjs kilobot-docs/src/css/custom.css
git commit -m "docs: add focused outcome container"
```

### Task 2: Wrap every instructional outcome preview

**Files:**
- Modify: `kilobot-docs/tests/guide-outcomes.test.mjs`
- Modify: `kilobot-docs/docs/start-here/quick-start.mdx`
- Modify: `kilobot-docs/docs/start-here/workspaces-and-agents.mdx`
- Modify: `kilobot-docs/docs/build-your-agent/agent-setup.mdx`
- Modify: `kilobot-docs/docs/build-your-agent/knowledge-base.mdx`
- Modify: `kilobot-docs/docs/channels/connect-channels.mdx`
- Modify: `kilobot-docs/docs/channels/website-widget.mdx`
- Modify: `kilobot-docs/docs/channels/whatsapp.mdx`
- Modify: `kilobot-docs/docs/channels/instagram.mdx`
- Modify: `kilobot-docs/docs/channels/messenger.mdx`
- Modify: `kilobot-docs/docs/engage/inbox.mdx`
- Modify: `kilobot-docs/docs/engage/contacts.mdx`
- Modify: `kilobot-docs/docs/bookings/services.mdx`
- Modify: `kilobot-docs/docs/bookings/availability.mdx`
- Modify: `kilobot-docs/docs/bookings/calendar.mdx`
- Modify: `kilobot-docs/docs/automate/workflow-overview.mdx`
- Modify: `kilobot-docs/docs/automate/build-and-test.mdx`
- Modify: `kilobot-docs/docs/engage/message-templates.mdx`
- Modify: `kilobot-docs/docs/engage/broadcast.mdx`
- Modify: `kilobot-docs/docs/automate/reminders.mdx`
- Modify: `kilobot-docs/docs/automate/follow-ups.mdx`
- Modify: `kilobot-docs/docs/team/workspace-and-team.mdx`
- Modify: `kilobot-docs/docs/team/roles-and-permissions.mdx`
- Modify: `kilobot-docs/docs/team/lead-assignment.mdx`
- Modify: `kilobot-docs/docs/help/troubleshooting.mdx`
- Modify: `kilobot-docs/docs/help/contact-support.mdx`

**Interfaces:**
- Consumes: the default `DocOutcomes` component from Task 1 and the existing `guides`/`excludedGuides` inventory
- Produces: exactly one import, opening tag, and closing tag in every included guide; no container reference in excluded pages

- [ ] **Step 1: Extend the guide contract for the container**

Add these constants near `outcomeHeading`:

```js
const outcomeImport =
  "import DocOutcomes from '@site/src/components/DocOutcomes';";
const outcomeContainerPattern =
  /<DocOutcomes>\n\n### By the end, you will\n\n(?:- .+(?:\n|$)){3,5}\n<\/DocOutcomes>/;
```

Add these assertions inside `assertGuideOutcomes` after `headingMatches`:

```js
const importMatches = source.match(
  /import DocOutcomes from '@site\/src\/components\/DocOutcomes';/g,
) ?? [];
const openingMatches = source.match(/<DocOutcomes>/g) ?? [];
const closingMatches = source.match(/<\/DocOutcomes>/g) ?? [];

assert.equal(importMatches.length, 1, `${relativePath}: import`);
assert.equal(openingMatches.length, 1, `${relativePath}: opening`);
assert.equal(closingMatches.length, 1, `${relativePath}: closing`);
assert.match(source, outcomeContainerPattern, `${relativePath}: wrapper`);
```

Extend the excluded-page test:

```js
assert.ok(!readGuide(relativePath).includes(outcomeImport));
assert.doesNotMatch(readGuide(relativePath), /<\/?DocOutcomes>/);
```

- [ ] **Step 2: Run the focused guide test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun test tests/guide-outcomes.test.mjs
```

Expected: FAIL on `start-here/quick-start.mdx: import` because the guides do not yet use `DocOutcomes`.

- [ ] **Step 3: Add the exact import to all 25 included guides**

Add this import once with the other `Doc*` imports in every file listed under Task 2:

```mdx
import DocOutcomes from '@site/src/components/DocOutcomes';
```

Do not add it to the three excluded pages.

- [ ] **Step 4: Wrap each existing heading and three bullets**

Change every included guide from:

```mdx
### By the end, you will

- Create a working agent
- Add one trusted answer
- Test that the agent uses the approved answer
```

to:

```mdx
<DocOutcomes>

### By the end, you will

- Create a working agent
- Add one trusted answer
- Test that the agent uses the approved answer

</DocOutcomes>
```

The example above is the exact Quick Start transformation. Apply the same opening and closing tags around the existing heading and three bullets in every other listed guide, keeping each file's approved outcome strings byte-for-byte unchanged.

- [ ] **Step 5: Run the focused guide test and verify GREEN**

Run the Step 2 command.

Expected: PASS with 3 tests, covering all 25 included guides and all three exclusions.

- [ ] **Step 6: Run the Docusaurus build to prove nested headings remain in the outline**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun run build
```

Expected: PASS with generated static files and no MDX parsing errors.

- [ ] **Step 7: Commit all guide wrappers**

```bash
git add kilobot-docs/tests/guide-outcomes.test.mjs kilobot-docs/docs
git commit -m "docs: focus every guide outcome preview"
```

### Task 3: Verify the complete responsive documentation experience

**Files:**
- Modify: `CONTINUITY.md`
- Verify only: `kilobot-docs/docs/releases/changelog.mdx`

**Interfaces:**
- Consumes: the shared component, 25 MDX wrappers, and all documentation contracts
- Produces: a verified branch and a compaction-safe unreleased-work record

- [ ] **Step 1: Run the complete automated verification**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun run test && bun test src/components/DocGuideComponents.test.tsx && bun run typecheck && bun run build && cd .. && git diff --check
```

Expected: all Node-native docs tests, 3 rendered component tests, TypeScript, the Docusaurus production build, and whitespace checks pass.

- [ ] **Step 2: Verify the explicit container inventory and exclusions**

```bash
test "$(rg -l '^<DocOutcomes>$' kilobot-docs/docs | wc -l | tr -d ' ')" = 25
test "$(rg -l "^import DocOutcomes from '@site/src/components/DocOutcomes';$" kilobot-docs/docs | wc -l | tr -d ' ')" = 25
! rg -n 'DocOutcomes' kilobot-docs/docs/start-here/welcome.mdx kilobot-docs/docs/start-here/launch-guide.mdx kilobot-docs/docs/releases/changelog.mdx
test "$(wc -l < kilobot-docs/src/components/DocOutcomes.tsx | tr -d ' ')" -le 300
test "$(wc -l < kilobot-docs/tests/guide-outcomes.test.mjs | tr -d ' ')" -le 300
```

Expected: exactly 25 wrappers and imports, no excluded-page references, and both code files remain below 300 lines.

- [ ] **Step 3: Visually inspect representative built pages**

Serve the built documentation through the installed static handler. Inspect Quick Start plus representative Agent, Channel, Booking, Workflow, Outreach, Team, and Help pages.

Confirm:

- The outcome container is the strongest visual element after the introduction.
- The right-side outline still includes `By the end, you will`.
- Light and dark themes use a neutral borderless surface.
- Desktop padding is `28px` and the radius is `16px`.
- At `390px`, padding is `20px`, the container stays within the article, and there is no horizontal overflow.

- [ ] **Step 4: Record the unreleased verified result**

Update `CONTINUITY.md` with the implemented design decision, test/build counts, exact browser checks, commit range, and unreleased status. Do not edit `kilobot-docs/docs/releases/changelog.mdx`.

- [ ] **Step 5: Commit the continuity record**

```bash
git add CONTINUITY.md
git commit -m "docs: record outcome container verification"
```
