# Workflow Docs Task Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace KiloBot's generic Workflow documentation with five complete task-based guides and move Broadcast content into its own correctly named section.

**Architecture:** The Docusaurus sidebar remains explicit and becomes the source of truth for the public information architecture. Three focused MDX guides replace the two generic Workflow guides, while the existing Reminder and Follow-up guides move into the Workflow category unchanged except for cross-links and navigation language. Existing recursive Node tests enforce the routes, labels, outcome previews, and Quick Start handoff; the shared MDX image renderer receives the approved caption-visibility adjustment.

**Tech Stack:** Docusaurus 3.10.2, MDX, TypeScript 6, React 19, CSS Modules, Node test runner, Bun 1.3.6, Node 22.

## Global Constraints

- Use Node v22 before every script or test command.
- Use Bun rather than npm inside `kilobot-docs`.
- Keep every code file under 300 lines.
- Do not add comments unless the code cannot be made self-explanatory.
- Keep all guide panels and instructional images borderless.
- Every instructional image remains left-aligned, expandable, and followed by a visible caption.
- Do not add generic Workflow sidebar destinations such as Overview or Actions and testing.
- Do not add a release changelog entry until production availability is confirmed.

---

### Task 1: Lock the task-based information architecture with failing tests

**Files:**
- Modify: `kilobot-docs/tests/help-center-structure.test.mjs`
- Modify: `kilobot-docs/tests/guide-information-architecture.test.mjs`
- Modify: `kilobot-docs/tests/simplified-onboarding.test.mjs`
- Modify: `kilobot-docs/tests/guide-outcomes.test.mjs`

**Interfaces:**
- Consumes: the explicit `helpCenterSidebar` structure from `kilobot-docs/sidebars.ts` and MDX source files under `kilobot-docs/docs`.
- Produces: executable contracts for the five Workflow guide IDs, the Broadcast group, the Quick Start Workflow link, and every new guide's outcome copy.

- [ ] **Step 1: Replace the required Workflow document paths**

In `help-center-structure.test.mjs`, replace the two generic paths with:

```js
'docs/automate/send-messages-and-assets.mdx',
'docs/automate/human-in-the-loop.mdx',
'docs/automate/automate-bookings.mdx',
'docs/automate/reminders.mdx',
'docs/automate/follow-ups.mdx',
```

Change the required top-level label from `Outreach` to `Broadcast`. Assert that `workflow-overview.mdx` and `build-and-test.mdx` no longer exist.

- [ ] **Step 2: Assert the exact sidebar grouping and order**

In `guide-information-architecture.test.mjs`, change the approved top-level order to:

```js
[
  'Getting started',
  'Agent',
  'Channels',
  'Bookings',
  'Workflows',
  'Broadcast',
  'Teams',
  'Releases',
  'Help and support',
]
```

Add a test that extracts the Workflows block and checks these IDs in order:

```js
[
  'automate/send-messages-and-assets',
  'automate/human-in-the-loop',
  'automate/automate-bookings',
  'automate/reminders',
  'automate/follow-ups',
]
```

Add a test that confirms the Broadcast block contains `engage/broadcast` before `engage/message-templates`.

- [ ] **Step 3: Replace the obsolete concise-label and Quick Start assertions**

In `simplified-onboarding.test.mjs`, make the only Next steps list item:

```js
'[Set up workflows](/automate/send-messages-and-assets) to send assets, involve your team, automate bookings, and follow up with customers.'
```

Assert that Deploy to channels and Automate bookings are absent from the Next steps section. Replace the old Overview/Build-and-test sidebar test with exact assertions for the five task labels:

```js
[
  'Send messages and assets',
  'Human in the loop',
  'Automate bookings',
  'Reminders',
  'Follow-ups',
]
```

- [ ] **Step 4: Define outcome-preview contracts for the three new guides**

Replace the old Workflow entries in `guide-outcomes.test.mjs` with:

```js
["automate/send-messages-and-assets.mdx", [
  "Send an exact message when a customer request matches",
  "Deliver approved photos, videos, and files",
  "Test matches and near-misses before saving",
]],
["automate/human-in-the-loop.mdx", [
  "Recognize when a teammate should take over",
  "Pause AI replies with a clear escalation condition",
  "Close a conversation only when it is complete",
]],
["automate/automate-bookings.mdx", [
  "Connect a booking request to an active service",
  "Keep service and availability setup in Bookings",
  "Test booking intent without matching unrelated questions",
]],
```

- [ ] **Step 5: Run the focused tests and verify the expected failure**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun test tests/help-center-structure.test.mjs tests/guide-information-architecture.test.mjs tests/simplified-onboarding.test.mjs tests/guide-outcomes.test.mjs
```

Expected: FAIL because the new files, sidebar labels, outcome copy, and Quick Start destination do not exist yet.

- [ ] **Step 6: Commit the failing contracts**

```bash
git add kilobot-docs/tests/help-center-structure.test.mjs kilobot-docs/tests/guide-information-architecture.test.mjs kilobot-docs/tests/simplified-onboarding.test.mjs kilobot-docs/tests/guide-outcomes.test.mjs
git commit -m "test(docs): define task-based workflow guides"
```

---

### Task 2: Build the five-guide Workflow section

**Files:**
- Create: `kilobot-docs/docs/automate/send-messages-and-assets.mdx`
- Create: `kilobot-docs/docs/automate/human-in-the-loop.mdx`
- Create: `kilobot-docs/docs/automate/automate-bookings.mdx`
- Modify: `kilobot-docs/docs/automate/reminders.mdx`
- Modify: `kilobot-docs/docs/automate/follow-ups.mdx`
- Delete: `kilobot-docs/docs/automate/workflow-overview.mdx`
- Delete: `kilobot-docs/docs/automate/build-and-test.mdx`
- Modify: `kilobot-docs/sidebars.ts`

**Interfaces:**
- Consumes: `DocOutcomes`, `DocExample`, `DocMediaPlaceholder`, `DocSuccess`, `DocCard`, and `DocVerified`.
- Produces: public routes `/automate/send-messages-and-assets`, `/automate/human-in-the-loop`, `/automate/automate-bookings`, `/automate/reminders`, and `/automate/follow-ups`.

- [ ] **Step 1: Create Send messages and assets**

Create an MDX guide with:

```mdx
---
title: Send messages and assets
description: Send approved text, photos, videos, and files when a customer request matches.
slug: /automate/send-messages-and-assets
---
```

Use the outcome copy from Task 1. Teach one Northstar Dental brochure branch with:

- A precise customer-intent condition
- Send message, Send Photo/Video, and Send Files choices
- One positive match, one paraphrase, and one near-miss
- Save and Discard changes
- An action-picker image production brief
- A 60–90 second build-and-test video production brief

- [ ] **Step 2: Create Human in the loop**

Create an MDX guide with:

```mdx
---
title: Human in the loop
description: Pause AI replies and involve a teammate when a conversation needs human judgment.
slug: /automate/human-in-the-loop
---
```

Use the outcome copy from Task 1. Cover customer-requested handoff, low-confidence or unsafe situations, a narrow escalation condition, teammate ownership, paused AI replies, and a separate section for closing clearly completed conversations. Include one inspector image production brief and one 45–75 second escalation verification video brief.

- [ ] **Step 3: Create Automate bookings**

Create an MDX guide with:

```mdx
---
title: Automate bookings
description: Start appointment booking when a customer's message shows clear booking intent.
slug: /automate/automate-bookings
---
```

Use the outcome copy from Task 1. Link to `/bookings/services`, `/bookings/availability`, and `/bookings/calendar`; explain that those pages own booking configuration. Demonstrate selecting an active Northstar Consultation service, defining booking intent, testing a direct request and a pricing-only near-miss, and verifying the confirmed appointment in Calendar. Include one configured-node image production brief and one 60–90 second booking verification video brief.

- [ ] **Step 4: Keep Reminders and Follow-ups complete under Workflows**

Retain their existing scope, timing, templates, activation, Summary, History, and verification material. Ensure both guides refer to **Workflows** as their location and link approved-message setup to `/engage/message-templates`.

- [ ] **Step 5: Replace the Workflow sidebar items**

Set the Workflows items to:

```ts
items: [
  {
    type: 'doc',
    id: 'automate/send-messages-and-assets',
    label: 'Send messages and assets',
  },
  {
    type: 'doc',
    id: 'automate/human-in-the-loop',
    label: 'Human in the loop',
  },
  {
    type: 'doc',
    id: 'automate/automate-bookings',
    label: 'Automate bookings',
  },
  'automate/reminders',
  'automate/follow-ups',
],
```

Delete the two obsolete generic MDX files.

- [ ] **Step 6: Run the focused tests and verify they pass**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun test tests/help-center-structure.test.mjs tests/guide-information-architecture.test.mjs tests/guide-outcomes.test.mjs
```

Expected: PASS for guide existence, outcome copy, and Workflow ordering; the Quick Start/Broadcast assertions may remain red until Task 3.

- [ ] **Step 7: Commit the Workflow guides**

```bash
git add kilobot-docs/docs/automate kilobot-docs/sidebars.ts
git commit -m "docs: add task-based workflow guides"
```

---

### Task 3: Create the Broadcast section and update every public handoff

**Files:**
- Modify: `kilobot-docs/sidebars.ts`
- Modify: `kilobot-docs/docs/start-here/quick-start.mdx`
- Modify: `kilobot-docs/docs/start-here/welcome.mdx`
- Modify: `kilobot-docs/docs/build-your-agent/agent-setup.mdx`
- Modify: `kilobot-docs/docs/build-your-agent/knowledge-base.mdx`
- Modify: `kilobot-docs/docs/engage/broadcast.mdx`
- Modify: `kilobot-docs/docs/engage/message-templates.mdx`
- Modify: `kilobot-docs/docs/engage/contacts.mdx`
- Modify: `kilobot-docs/docs/help/troubleshooting.mdx`

**Interfaces:**
- Consumes: the five public Workflow routes created in Task 2.
- Produces: a Broadcast sidebar group and public links with no references to the retired Workflow routes or Outreach navigation label.

- [ ] **Step 1: Replace Outreach with Broadcast**

Use this sidebar structure:

```ts
{
  type: 'category',
  label: 'Broadcast',
  collapsed: false,
  collapsible: false,
  items: [
    {
      type: 'doc',
      id: 'engage/broadcast',
      label: 'Create a broadcast',
    },
    {
      type: 'doc',
      id: 'engage/message-templates',
      label: 'Message templates',
    },
  ],
},
```

- [ ] **Step 2: Simplify Quick Start to one Workflow next step**

Replace the Next steps introduction and list with:

```mdx
Your agent is ready! Continue with the most useful automation:

- [Set up workflows](/automate/send-messages-and-assets) to send assets, involve your team, automate bookings, and follow up with customers.
```

Keep the existing `Your agent is ready!` line directly below the testing image and avoid duplicating it in the new introduction. Use `Continue with the most useful automation:` as the section introduction if the exclamation line already remains above the heading.

- [ ] **Step 3: Update all public Workflow links**

Replace `/automate/workflow-overview` links in Agent Setup and Knowledge Base with `/automate/send-messages-and-assets`. Change visible navigation language from Outreach to Broadcast in Welcome, Broadcast, Message Templates, Contacts, and Troubleshooting without changing product behavior.

- [ ] **Step 4: Confirm retired links and labels are absent**

Run:

```bash
rg -n "/automate/(workflow-overview|build-and-test)|Outreach" kilobot-docs/docs kilobot-docs/sidebars.ts
```

Expected: no matches in public docs or the sidebar. Matches inside `kilobot-docs/drafts` are outside the public docs input and may remain.

- [ ] **Step 5: Run all information-architecture tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun test tests/help-center-structure.test.mjs tests/guide-information-architecture.test.mjs tests/simplified-onboarding.test.mjs tests/guide-outcomes.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit the navigation and cross-links**

```bash
git add kilobot-docs/sidebars.ts kilobot-docs/docs
git commit -m "docs: organize workflows and broadcasts"
```

---

### Task 4: Make image captions clearly visible

**Files:**
- Modify: `kilobot-docs/src/theme/MDXComponents/Img/index.test.tsx`
- Modify: `kilobot-docs/src/theme/MDXComponents/Img/styles.module.css`

**Interfaces:**
- Consumes: alt-derived caption markup from `MDXImg`.
- Produces: captions directly below images with a 10px gap, 14px text, medium weight, and readable secondary foreground color.

- [ ] **Step 1: Add the failing caption-style contract**

Add a source-level test that reads `styles.module.css` and checks the `.caption` rule:

```tsx
const captionRule = styles.match(/\.caption \{[\s\S]*?\n\}/)?.[0] ?? '';

assert.match(captionRule, /margin-top:\s*0\.625rem/);
assert.match(captionRule, /font-size:\s*0\.875rem/);
assert.match(captionRule, /font-weight:\s*500/);
assert.match(captionRule, /color:\s*var\(--ifm-font-color-base\)/);
```

- [ ] **Step 2: Run the component test and verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --import tsx --test src/theme/MDXComponents/Img/index.test.tsx
```

Expected: FAIL because the caption is currently 13px, normal weight, and uses the secondary color.

- [ ] **Step 3: Apply the balanced caption treatment**

Set the caption rule to:

```css
.caption {
  display: block;
  margin-top: 0.625rem;
  color: var(--ifm-font-color-base);
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.45;
  text-align: left;
}
```

- [ ] **Step 4: Run the component test and verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --import tsx --test src/theme/MDXComponents/Img/index.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the caption adjustment**

```bash
git add kilobot-docs/src/theme/MDXComponents/Img/index.test.tsx kilobot-docs/src/theme/MDXComponents/Img/styles.module.css
git commit -m "style(docs): clarify image captions"
```

---

### Task 5: Verify the complete documentation change

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: all public docs and tests changed in Tasks 1–4.
- Produces: a verified, compaction-safe record of the unreleased documentation state.

- [ ] **Step 1: Run the complete docs test suite**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun test
```

Expected: all Node documentation tests pass.

- [ ] **Step 2: Run the React component tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --import tsx --test src/components/DocGuideComponents.test.tsx src/theme/MDXComponents/Img/index.test.tsx
```

Expected: all component tests pass.

- [ ] **Step 3: Run TypeScript and the production build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun run typecheck && bun run build
```

Expected: TypeScript succeeds and Docusaurus builds every public document with no broken-link errors.

- [ ] **Step 4: Check whitespace and repository scope**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only the planned documentation files are changed.

- [ ] **Step 5: Update the continuity ledger**

Add a dated `[CODE]` Snapshot entry stating that the task-based Workflow section, Broadcast section, public cross-links, and clearer image captions are implemented and locally verified but unreleased and unpushed. Do not modify `kilobot-docs/docs/releases/changelog.mdx`.

- [ ] **Step 6: Commit the verification record**

```bash
git add CONTINUITY.md
git commit -m "docs: record workflow guide verification"
```

