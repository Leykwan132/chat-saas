# Simplified Docs Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Quick Start to agent creation, knowledge, and testing; present deployment, workflows, and bookings as optional next steps; shorten Workflow navigation labels; and add space before the desktop page outline.

**Architecture:** Keep the existing Docusaurus information architecture and reusable `DocCard` presentation. Enforce the simplified onboarding contract with one focused Node-native source test, use explicit Docusaurus doc sidebar items for short labels, and scope the spacing change to the desktop table of contents.

**Tech Stack:** Docusaurus 3, MDX, TypeScript, CSS modules/global theme CSS, Bun, Node test runner.

## Global Constraints

- Use Node v22 for every script and test command.
- Use Bun for KiloBot Docs scripts.
- Quick Start has exactly three required steps: Create agent, Add knowledge, and Test agent.
- Quick Start has exactly three optional next steps with the approved labels and destinations.
- Workflow child navigation labels are `Overview` and `Build and test`.
- Right-outline spacing applies only to the desktop outline.
- Keep every code file below 300 lines.
- Do not update the public changelog because the docs changes are unreleased.

---

### Task 1: Simplify Quick Start

**Files:**
- Create: `kilobot-docs/tests/simplified-onboarding.test.mjs`
- Modify: `kilobot-docs/docs/start-here/quick-start.mdx`

**Interfaces:**
- Consumes: Existing `DocCard`, `DocExample`, `DocMediaPlaceholder`, `DocPrerequisites`, `DocSuccess`, and `DocVerified` MDX components.
- Produces: A three-step Quick Start and three optional route cards used by the public guide.

- [ ] **Step 1: Write the failing Quick Start contract**

Create `kilobot-docs/tests/simplified-onboarding.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

test('keeps Quick Start to three required steps and three optional next steps', () => {
  const quickStart = read('docs/start-here/quick-start.mdx');
  const requiredHeadings = [...quickStart.matchAll(/^## ([1-9])\\. (.+)$/gm)];
  const nextStepCards = [...quickStart.matchAll(/<DocCard /g)];

  assert.deepEqual(
    requiredHeadings.map((match) => match[2].replace(/ ·.+$/, '')),
    ['Create your agent', 'Add knowledge', 'Test your agent'],
  );
  assert.equal(nextStepCards.length, 3);
  assert.ok(quickStart.includes('title="Deploy to channels (WhatsApp, IG, Messenger)"'));
  assert.ok(quickStart.includes('to="/channels/connect-channels"'));
  assert.ok(quickStart.includes('title="Set up workflows"'));
  assert.ok(quickStart.includes('to="/automate/workflow-overview"'));
  assert.ok(quickStart.includes('title="Set up bookings"'));
  assert.ok(quickStart.includes('to="/bookings/services"'));
  assert.equal(quickStart.includes('Connect the Website widget'), false);
  assert.equal(quickStart.includes('Confirm the conversation in Inbox'), false);
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/simplified-onboarding.test.mjs
```

Expected: FAIL because Quick Start still has eight numbered sections and five next-step cards.

- [ ] **Step 3: Replace the long Quick Start with the approved journey**

Edit `kilobot-docs/docs/start-here/quick-start.mdx` so it:

- Describes a 5-minute agent setup.
- Requires only a KiloBot account, workspace, and agent-creation permission.
- Keeps the Northstar agent-creation example and image brief.
- Keeps one Northstar opening-hours Q&A example and image brief under `## 2. Add knowledge`.
- Uses `## 3. Test your agent` with one known question and one unsupported question.
- Removes Publish, Website installation, visitor verification, Inbox confirmation, and the complete Website video brief.
- Ends with:

```mdx
## Choose what to do next

<DocCard
  to="/channels/connect-channels"
  title="Deploy to channels (WhatsApp, IG, Messenger)"
  description="Connect the platforms where customers will talk to your agent"
/>
<DocCard
  to="/automate/workflow-overview"
  title="Set up workflows"
  description="Route customer requests into reliable actions"
/>
<DocCard
  to="/bookings/services"
  title="Set up bookings"
  description="Define what customers can book and when"
/>
```

- [ ] **Step 4: Run the contract and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/simplified-onboarding.test.mjs
```

Expected: PASS, 1 test.

- [ ] **Step 5: Commit the Quick Start**

```bash
git add kilobot-docs/docs/start-here/quick-start.mdx kilobot-docs/tests/simplified-onboarding.test.mjs
git commit -m "docs: simplify KiloBot Quick Start"
```

---

### Task 2: Shorten Workflow navigation

**Files:**
- Modify: `kilobot-docs/tests/simplified-onboarding.test.mjs`
- Modify: `kilobot-docs/sidebars.ts`

**Interfaces:**
- Consumes: Docusaurus sidebar doc-item shape `{type: 'doc', id: string, label: string}`.
- Produces: Two concise child labels beneath the existing `Workflows` category.

- [ ] **Step 1: Add the failing sidebar-label contract**

Append:

```js
test('uses concise Workflow child labels', () => {
  const sidebar = read('sidebars.ts');
  const workflows = sidebar.match(
    /label: 'Workflows'[\\s\\S]*?label: 'Outreach'/,
  )?.[0];

  assert.ok(workflows);
  assert.ok(workflows.includes("id: 'automate/workflow-overview'"));
  assert.ok(workflows.includes("label: 'Overview'"));
  assert.ok(workflows.includes("id: 'automate/build-and-test'"));
  assert.ok(workflows.includes("label: 'Build and test'"));
  assert.equal(workflows.includes('Workflow overview'), false);
  assert.equal(workflows.includes('Build and test a Workflow'), false);
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/simplified-onboarding.test.mjs
```

Expected: FAIL because Workflows still uses bare document IDs and generated page titles.

- [ ] **Step 3: Use explicit concise doc items**

Replace the Workflows `items` with:

```ts
items: [
  {
    type: 'doc',
    id: 'automate/workflow-overview',
    label: 'Overview',
  },
  {
    type: 'doc',
    id: 'automate/build-and-test',
    label: 'Build and test',
  },
],
```

- [ ] **Step 4: Run the contract and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/simplified-onboarding.test.mjs
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit the navigation labels**

```bash
git add kilobot-docs/sidebars.ts kilobot-docs/tests/simplified-onboarding.test.mjs
git commit -m "docs: shorten Workflow navigation labels"
```

---

### Task 3: Space the desktop page outline

**Files:**
- Modify: `kilobot-docs/tests/simplified-onboarding.test.mjs`
- Modify: `kilobot-docs/src/css/toc.css`

**Interfaces:**
- Consumes: Existing `.theme-doc-toc-desktop` Docusaurus desktop outline selector.
- Produces: Desktop-only left padding between article content and the page outline.

- [ ] **Step 1: Add the failing spacing contract**

Append:

```js
test('adds desktop-only separation before the page outline', () => {
  const tocCss = read('src/css/toc.css');
  const desktopRule = tocCss.match(
    /\\.theme-doc-toc-desktop \\{[\\s\\S]*?\\n\\}/,
  )?.[0];

  assert.ok(desktopRule);
  assert.match(desktopRule, /padding-left: 2rem;/);
  assert.equal(tocCss.includes('@media (max-width: 996px)'), false);
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/simplified-onboarding.test.mjs
```

Expected: FAIL because the desktop outline has no left padding.

- [ ] **Step 3: Add scoped desktop spacing**

Add `padding-left: 2rem;` to the existing `.theme-doc-toc-desktop` rule in `kilobot-docs/src/css/toc.css`. Do not modify `.tocCollapsible` or add a mobile rule.

- [ ] **Step 4: Run focused and full verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/simplified-onboarding.test.mjs && bun run test && bun test src/components/DocGuideComponents.test.tsx && bun run typecheck && bun run build
```

Expected: All focused tests, all docs tests, TypeScript, and the Docusaurus production build pass.

- [ ] **Step 5: Review desktop and mobile rendering**

Serve the production build with Docusaurus. Confirm:

- Quick Start shows three numbered sections.
- The three next-step cards appear after the success block.
- Workflows shows `Overview` and `Build and test`.
- The desktop outline has a clear gap from the article.
- Mobile has no new horizontal padding or overflow.

- [ ] **Step 6: Commit spacing and final verification**

```bash
git add CONTINUITY.md kilobot-docs/src/css/toc.css kilobot-docs/tests/simplified-onboarding.test.mjs
git commit -m "docs: refine onboarding navigation layout"
```
