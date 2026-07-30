# KiloBot Guide Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public KiloBot help center around the approved customer journey, expand every P0/P1 guide requirement, and render detailed visible placeholders for all missing screenshots and videos.

**Architecture:** Keep Docusaurus and the existing route base, replace the sidebar information architecture explicitly, add four focused MDX presentation components, then rewrite guides in topic-sized batches. Preserve existing public routes where possible, archive hidden topics outside the Docusaurus docs input, and use content-contract tests plus the production build to prevent navigation, media, and internal-link regressions.

**Tech Stack:** Docusaurus 3.10.2, React 19, TypeScript 6, MDX 3, CSS Modules, Node test runner, Bun 1.3.6, Node 22

## Global Constraints

- Use Node 22 in the same shell invocation before every script or test.
- Use Bun for KiloBot Docs scripts and dependency commands.
- No code file may exceed 300 lines.
- Code must be self-explanatory and avoid comments.
- Customer-facing copy must use `KiloBot`.
- Document active-branch behavior without claiming it has shipped to production.
- Avatar, Quick Replies, Overview and Analytics, and Usage and billing must not enter the public docs build.
- Missing media must render as visible, accessible `Media needed` cards.
- Do not add a public changelog entry until production availability is confirmed.
- Preserve unrelated workspace changes, including `convex/plans.ts`.

---

### Task 1: Lock the Public Information Architecture

**Files:**
- Create: `kilobot-docs/tests/guide-information-architecture.test.mjs`
- Modify: `kilobot-docs/sidebars.ts`
- Move: `kilobot-docs/docs/engage/quick-replies.mdx` → `kilobot-docs/drafts/engage/quick-replies.mdx`
- Move: `kilobot-docs/docs/insights/overview-and-analytics.mdx` → `kilobot-docs/drafts/insights/overview-and-analytics.mdx`
- Move: `kilobot-docs/docs/insights/usage-and-billing.mdx` → `kilobot-docs/drafts/insights/usage-and-billing.mdx`
- Modify: `kilobot-docs/tests/help-center-structure.test.mjs`

**Interfaces:**
- Consumes: Docusaurus explicit sidebar document IDs.
- Produces: The exact approved sidebar order and a source-only archive for hidden topics.

- [ ] **Step 1: Write the failing information-architecture test**

Create a test that reads `sidebars.ts`, extracts category labels in source order, and checks hidden files are absent from `docs/`.

```js
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {test} from 'node:test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');

test('uses the approved public guide order', () => {
  const sidebar = read('sidebars.ts');
  const labels = [...sidebar.matchAll(/label: '([^']+)'/g)].map((match) => match[1]);
  assert.deepEqual(labels, [
    'Getting started',
    'Agent',
    'Channels',
    'Conversations',
    'Bookings',
    'Workflows',
    'Outreach',
    'Teams',
    'Releases',
    'Help and support',
  ]);
});

test('limits Getting started to Welcome and Quick Start', () => {
  const sidebar = read('sidebars.ts');
  const block = sidebar.match(/label: 'Getting started'[\s\S]*?items: \[([\s\S]*?)\]/)?.[1];
  assert.ok(block);
  assert.deepEqual([...block.matchAll(/'([^']+)'/g)].map((match) => match[1]), [
    'start-here/welcome',
    'start-here/quick-start',
  ]);
});

test('keeps hidden topics outside the public docs input', () => {
  for (const file of [
    'docs/engage/quick-replies.mdx',
    'docs/insights/overview-and-analytics.mdx',
    'docs/insights/usage-and-billing.mdx',
  ]) {
    assert.equal(existsSync(path.join(root, file)), false);
  }
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/guide-information-architecture.test.mjs
```

Expected: FAIL because the current sidebar still uses Core Concepts and Resources and hidden pages remain under `docs/`.

- [ ] **Step 3: Archive hidden pages**

Move the three existing MDX sources into matching folders under `kilobot-docs/drafts/`. Preserve their contents exactly so they can be restored later. Do not create an Avatar page.

- [ ] **Step 4: Replace the sidebar**

Use explicit non-collapsible category objects in this order. Do not introduce a helper because the source-contract tests intentionally read the configuration without evaluating TypeScript:

```ts
const sidebars: SidebarsConfig = {
  helpCenterSidebar: [
    {
      type: 'category',
      label: 'Getting started',
      collapsed: false,
      collapsible: false,
      items: ['start-here/welcome', 'start-here/quick-start'],
    },
    {
      type: 'category',
      label: 'Agent',
      collapsed: false,
      collapsible: false,
      items: [
        'build-your-agent/agent-setup',
        'build-your-agent/knowledge-base',
      ],
    },
    {
      type: 'category',
      label: 'Channels',
      collapsed: false,
      collapsible: false,
      items: [
        'channels/connect-channels',
        'channels/website-widget',
        'channels/whatsapp',
        'channels/instagram',
        'channels/messenger',
        {
          type: 'category',
          label: 'Conversations',
          collapsed: false,
          items: ['engage/inbox', 'engage/contacts'],
        },
      ],
    },
    {
      type: 'category',
      label: 'Bookings',
      collapsed: false,
      collapsible: false,
      items: [
        'bookings/services',
        'bookings/availability',
        'bookings/calendar',
      ],
    },
    {
      type: 'category',
      label: 'Workflows',
      collapsed: false,
      collapsible: false,
      items: ['automate/workflow-overview', 'automate/build-and-test'],
    },
    {
      type: 'category',
      label: 'Outreach',
      collapsed: false,
      collapsible: false,
      items: [
        'engage/message-templates',
        'engage/broadcast',
        'automate/reminders',
        'automate/follow-ups',
      ],
    },
    {
      type: 'category',
      label: 'Teams',
      collapsed: false,
      collapsible: false,
      items: [
        'start-here/workspaces-and-agents',
        'team/workspace-and-team',
        'team/roles-and-permissions',
        'team/lead-assignment',
      ],
    },
    {
      type: 'category',
      label: 'Releases',
      collapsed: false,
      collapsible: false,
      items: ['releases/changelog'],
    },
    {
      type: 'category',
      label: 'Help and support',
      collapsed: false,
      collapsible: false,
      items: ['help/troubleshooting', 'help/contact-support'],
    },
  ],
};
```

Keep nested Conversations visually subordinate and collapsible so it does not behave like a top-level group.

- [ ] **Step 5: Update legacy structure tests**

Remove assertions for Core Concepts and Resources. Retain brand, non-autogenerated sidebar, spacing, and non-collapsible top-level category checks.

- [ ] **Step 6: Run the information-architecture and legacy structure tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/guide-information-architecture.test.mjs tests/help-center-structure.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit the information architecture**

```bash
git add kilobot-docs/sidebars.ts kilobot-docs/docs kilobot-docs/drafts kilobot-docs/tests
git commit -m "docs: reorganize the KiloBot guide"
```

---

### Task 2: Add Reusable Guide Components

**Files:**
- Create: `kilobot-docs/src/components/DocPrerequisites.tsx`
- Create: `kilobot-docs/src/components/DocPrerequisites.module.css`
- Create: `kilobot-docs/src/components/DocSuccess.tsx`
- Create: `kilobot-docs/src/components/DocSuccess.module.css`
- Create: `kilobot-docs/src/components/DocExample.tsx`
- Create: `kilobot-docs/src/components/DocExample.module.css`
- Create: `kilobot-docs/src/components/DocMediaPlaceholder.tsx`
- Create: `kilobot-docs/src/components/DocMediaPlaceholder.module.css`
- Create: `kilobot-docs/src/components/DocVerified.tsx`
- Create: `kilobot-docs/src/components/DocVerified.module.css`
- Create: `kilobot-docs/tests/guide-components.test.mjs`
- Modify: `kilobot-docs/tests/help-center-brand.test.mjs`

**Interfaces:**
- Produces:
  - `DocPrerequisites({children})`
  - `DocSuccess({children})`
  - `DocExample({title, children})`
  - `DocMediaPlaceholder({kind, title, description, capture, callouts, duration, sensitive, assetPath})`
  - `DocVerified({date})`
- Consumers: All rewritten MDX guides.

- [ ] **Step 1: Write failing component source-contract tests**

```js
test('ships focused guide components', () => {
  for (const component of [
    'DocPrerequisites',
    'DocSuccess',
    'DocExample',
    'DocMediaPlaceholder',
    'DocVerified',
  ]) {
    assert.equal(existsSync(path.join(root, `src/components/${component}.tsx`)), true);
    assert.equal(existsSync(path.join(root, `src/components/${component}.module.css`)), true);
  }
});

test('requires complete media production briefs', () => {
  const source = read('src/components/DocMediaPlaceholder.tsx');
  for (const field of ['kind', 'title', 'description', 'capture', 'assetPath']) {
    assert.ok(source.includes(`${field}:`));
  }
  assert.ok(source.includes('Media needed'));
  assert.ok(source.includes('aria-label'));
});
```

- [ ] **Step 2: Run the component tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/guide-components.test.mjs
```

Expected: FAIL because the four components do not exist.

- [ ] **Step 3: Implement `DocPrerequisites`**

Render a compact semantic section with a `Before you begin` heading and caller-provided list content. Use a neutral bordered surface that works in light and dark themes.

```tsx
import type {ReactNode} from 'react';
import styles from './DocPrerequisites.module.css';

export default function DocPrerequisites({children}: {children: ReactNode}) {
  return (
    <section className={styles.root} aria-labelledby="doc-prerequisites-title">
      <h2 id="doc-prerequisites-title">Before you begin</h2>
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Implement `DocSuccess` and `DocExample`**

`DocSuccess` renders a success-toned surface with the fixed heading `You’re done when`. `DocExample` accepts a required `title` and renders a clearly separate example surface without relying on color alone.

- [ ] **Step 5: Implement `DocMediaPlaceholder`**

Use this prop contract:

```ts
type MediaKind = 'image' | 'video';

type DocMediaPlaceholderProps = {
  kind: MediaKind;
  title: string;
  description: string;
  capture: string[];
  assetPath: string;
  callouts?: string[];
  duration?: string;
  sensitive?: string[];
};
```

Render:

- `Media needed · Image` or `Media needed · Video`
- Title and description
- A `Capture` ordered list
- Optional `Callouts`, `Target duration`, and `Hide before recording`
- Final asset path in inline code

Give the section an accessible label containing the media kind and title. Do not render an `<img>` or `<video>` element until an asset exists.

- [ ] **Step 6: Implement `DocVerified`**

Accept a required ISO date string and render it as a semantic `<time>`:

```tsx
type DocVerifiedProps = {
  date: `${number}-${number}-${number}`;
};
```

The visible copy uses `Last verified: July 28, 2026`. UI-dependent guides import the component near the introduction so customers can judge whether labels and provider flows are current.

- [ ] **Step 7: Add responsive component styles**

Use dashed neutral borders for media, semantic success styling for completion, and theme tokens already defined in the docs. Keep each CSS module below 160 lines.

- [ ] **Step 8: Extend the code-length contract**

Add all new TSX and CSS module paths to the existing code-length test. Assert every file remains below 300 lines.

- [ ] **Step 9: Run component and brand tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/guide-components.test.mjs tests/help-center-brand.test.mjs
```

Expected: PASS.

- [ ] **Step 10: Commit the shared guide components**

```bash
git add kilobot-docs/src/components kilobot-docs/tests
git commit -m "docs: add reusable guide content blocks"
```

---

### Task 3: Replace Launch Guide with Welcome and Quick Start

**Files:**
- Modify: `kilobot-docs/docs/start-here/welcome.mdx`
- Create: `kilobot-docs/docs/start-here/quick-start.mdx`
- Modify: `kilobot-docs/docs/start-here/launch-guide.mdx`
- Modify: `kilobot-docs/src/components/DocQuickstartBanner.tsx`
- Modify: `kilobot-docs/tests/help-center-brand.test.mjs`
- Create: `kilobot-docs/tests/quick-start.test.mjs`

**Interfaces:**
- Consumes: All four shared guide components.
- Produces: Root Welcome, `/start-here/quick-start`, and a legacy Launch Guide redirect.

- [ ] **Step 1: Write failing Welcome and Quick Start tests**

Test that:

- Welcome links to only Quick Start and Browse the guide as primary paths.
- Welcome no longer imports the eight-tile grid.
- Quick Start uses Northstar Dental and contains all eight approved milestones.
- Quick Start contains estimated times, prerequisites, examples, success blocks, and media placeholders.
- The old Launch Guide file renders a redirect to `/start-here/quick-start`.

```js
test('keeps Welcome focused on two choices', () => {
  const welcome = read('docs/start-here/welcome.mdx');
  assert.ok(welcome.includes("title=\"Quick Start\""));
  assert.ok(welcome.includes("title=\"Browse the guide\""));
  assert.equal(welcome.includes('DocPathGrid'), false);
  assert.equal(welcome.includes('DocPathTile'), false);
});

test('uses one complete Quick Start scenario', () => {
  const quickStart = read('docs/start-here/quick-start.mdx');
  for (const expected of [
    'Northstar Dental',
    'Northstar Booking Assistant',
    'Create your agent',
    'Add one trusted answer',
    'Test the agent',
    'Publish the agent',
    'Connect the Website widget',
    'Confirm the conversation in Inbox',
    'DocSuccess',
    'DocMediaPlaceholder',
  ]) {
    assert.ok(quickStart.includes(expected), `Quick Start missing ${expected}`);
  }
});
```

- [ ] **Step 2: Run the Quick Start tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/quick-start.test.mjs tests/help-center-brand.test.mjs
```

Expected: FAIL against the current feature-grid Welcome and Launch Guide.

- [ ] **Step 3: Simplify Welcome**

Keep the KiloBot Docs heading and Quickstart banner. Replace the feature grid with two large path tiles:

- Quick Start — `Set up a working Website agent with one trusted answer and a real Inbox message.`
- Browse the guide — `Choose a topic from Agent, Channels, Bookings, Workflows, Outreach, or Teams.`

Explain that Website is the fastest path because it avoids external provider authorization and synchronization.

- [ ] **Step 4: Write Quick Start**

Use these exact example inputs:

- Agent name: `Northstar Booking Assistant`
- Knowledge Base question: `What are your opening hours?`
- Answer: `Northstar Dental is open Monday to Friday, 9:00 am to 6:00 pm, and Saturday, 9:00 am to 1:00 pm. It is closed on Sunday.`
- Known test: `Are you open on Saturday?`
- Paraphrase: `Can I visit this weekend?`
- Unknown test: `Do you offer emergency root canals?`

Require the unknown test to avoid inventing an unsupported answer.

Add:

- Image briefs for agent creation, Q&A source, Test Agent, Website configuration, and Inbox confirmation.
- A 2–3 minute complete-journey video brief at `/media/quick-start/website-launch.mp4`.
- One success block after agent testing and one final success block after Inbox verification.
- Optional next-step cards for Bookings, Workflows, Meta channels, Outreach, and Teams.

- [ ] **Step 5: Turn Launch Guide into a redirect**

Keep the old slug and use Docusaurus router redirect behavior:

```mdx
---
title: Launch Guide
slug: /start-here/launch-guide
pagination_next: null
pagination_prev: null
---

import {Redirect} from '@docusaurus/router';

<Redirect to="/start-here/quick-start" />
```

- [ ] **Step 6: Update the banner destination and copy**

Point the primary action to `/start-here/quick-start`. Preserve the existing KiloBot visual treatment while aligning the copy with the Website-first path.

- [ ] **Step 7: Run Quick Start and brand tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/quick-start.test.mjs tests/help-center-brand.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit Getting Started**

```bash
git add kilobot-docs/docs/start-here kilobot-docs/src/components/DocQuickstartBanner.tsx kilobot-docs/tests
git commit -m "docs: add the Website-first Quick Start"
```

---

### Task 4: Expand Agent Setup and Knowledge Base

**Files:**
- Modify: `kilobot-docs/docs/build-your-agent/agent-setup.mdx`
- Modify: `kilobot-docs/docs/build-your-agent/knowledge-base.mdx`
- Create: `kilobot-docs/tests/agent-guides.test.mjs`

**Interfaces:**
- Consumes: Shared guide components and the Northstar Dental scenario.
- Produces: Complete Agent section with two public guides.

- [ ] **Step 1: Write failing Agent guide contracts**

Assert Agent Setup contains:

- A complete system prompt.
- Weak and improved prompt examples.
- Prompt/Knowledge Base/Workflow decision guidance.
- Model and style explanations.
- Reply mode.
- Four-part test matrix.
- Publish behavior.
- Image placeholders.

Assert Knowledge Base contains:

- Web, Files, Text, and Q&A.
- Confirmed source and storage behavior found in product code.
- Q&A example.
- Processing state.
- Conflicting source guidance.
- Test matrix.
- Three image placeholders.
- No Usage and billing link.

- [ ] **Step 2: Run the Agent guide tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/agent-guides.test.mjs
```

Expected: FAIL because the current pages lack complete examples, success checks, and media briefs.

- [ ] **Step 3: Verify product labels and confirmed limits**

Inspect the current Agent Setup and Knowledge Base frontend sources before writing copy. Record only values enforced by current product code. If a file type, size, refresh behavior, or plan limit is not confirmed, omit the number and direct the reader to the in-product limit panel.

- [ ] **Step 4: Rewrite Agent Setup**

Use a complete Northstar system prompt with these labeled responsibilities:

- Identity and audience.
- Primary goals.
- Conversation behavior.
- Knowledge boundaries.
- Booking and escalation boundaries.
- Tone.

Add a weak one-line prompt and an improved structured prompt. Add a three-column Markdown table for Prompt, Knowledge Base, and Workflow ownership. Include exact Test Agent cases for known, paraphrased, missing, escalation, and Workflow intent.

Add image briefs for:

- Agent Setup prompt and style controls.
- Test Agent with the known and unknown messages.

- [ ] **Step 5: Rewrite Knowledge Base**

Keep all Knowledge Base content on one page. Add:

- A source-selection table.
- The Northstar Q&A.
- Processing and source-maintenance procedure.
- Duplicate and contradiction examples.
- A four-row testing table.
- Storage guidance.
- Success and common-problem blocks.

Add image briefs for:

- Source picker.
- Processing state.
- Storage limit panel.

- [ ] **Step 6: Run Agent guide tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/agent-guides.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit Agent guides**

```bash
git add kilobot-docs/docs/build-your-agent kilobot-docs/tests/agent-guides.test.mjs
git commit -m "docs: expand Agent and Knowledge Base guidance"
```

---

### Task 5: Build Dedicated Channel Guides

**Files:**
- Modify: `kilobot-docs/docs/channels/connect-channels.mdx`
- Create: `kilobot-docs/docs/channels/website-widget.mdx`
- Create: `kilobot-docs/docs/channels/whatsapp.mdx`
- Create: `kilobot-docs/docs/channels/instagram.mdx`
- Create: `kilobot-docs/docs/channels/messenger.mdx`
- Create: `kilobot-docs/tests/channel-guides.test.mjs`

**Interfaces:**
- Consumes: Current channel card and provider connection behavior from product source.
- Produces: One overview and four platform-specific guides.

- [ ] **Step 1: Write failing channel guide tests**

Assert:

- Overview says `Connect` and does not say `Connect another channel`.
- Overview includes Connected, Not connected, pending, synchronizing, and failed states where applicable.
- Each platform page imports prerequisites, success, and media components.
- Each platform page contains an image and video brief with an explicit asset path.
- Website includes private-window verification.
- Meta pages identify required administrator access.

- [ ] **Step 2: Run channel tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/channel-guides.test.mjs
```

Expected: FAIL because only the shared Channels page exists and contains stale connection copy.

- [ ] **Step 3: Verify current product states**

Inspect:

- `src/pages/ChannelsPage.tsx`
- `src/components/channels/AvailableChannelCard.tsx`
- Website widget configuration components
- WhatsApp, Instagram, and Messenger connection buttons and state helpers

Use exact visible labels. Do not expose tokens, internal attempt IDs, feature flags, or provider payloads.

- [ ] **Step 4: Rewrite Channels overview**

Explain:

- Supported platforms.
- Free plan permits one platform per agent; paid plans permit all supported platforms for every agent.
- Persistent channel cards and their Connect actions.
- Connection-state meanings.
- General verification procedure.
- What to check before reconnecting or disconnecting.

Add a platform-state image brief at `/media/channels/channel-cards.png`.

- [ ] **Step 5: Write Website widget guide**

Cover:

- Create Website channel.
- Configure name, appearance, and launcher.
- Copy and install the script.
- Publish the customer website.
- Test in a private window.
- Verify inbound and outbound messages.
- Common failures: snippet absent, duplicate installation, cached deployment, wrong agent, blocked script.

Add:

- Image brief: `/media/channels/website-settings.png`
- Video brief: `/media/channels/website-installation.mp4`, 45–60 seconds

- [ ] **Step 6: Write WhatsApp guide**

Cover administrator requirements, embedded signup, account selection, mobile coexistence, contact/history synchronization, pending states, connected verification, and reconnection cautions.

Add:

- Image brief: `/media/channels/whatsapp-states.png`
- Video brief: `/media/channels/connect-whatsapp.mp4`, 60–90 seconds

- [ ] **Step 7: Write Instagram and Messenger guides**

Instagram covers professional account requirements and authorization. Messenger covers Facebook Page requirements and authorization. Both include inbound/outbound verification and provider-access troubleshooting.

Use:

- `/media/channels/connect-instagram.mp4`
- `/media/channels/connect-messenger.mp4`
- Matching `.png` state paths

- [ ] **Step 8: Run channel tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/channel-guides.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit channel guides**

```bash
git add kilobot-docs/docs/channels kilobot-docs/tests/channel-guides.test.mjs
git commit -m "docs: add platform-specific channel guides"
```

---

### Task 6: Expand Inbox and Contacts

**Files:**
- Modify: `kilobot-docs/docs/engage/inbox.mdx`
- Modify: `kilobot-docs/docs/engage/contacts.mdx`
- Create: `kilobot-docs/tests/conversation-guides.test.mjs`

**Interfaces:**
- Consumes: Current Inbox filters, conversation controls, contact fields, Action History, and booking surface.
- Produces: Nested Conversations guides under Channels.

- [ ] **Step 1: Write failing conversation guide tests**

Test for:

- Inbox orientation, filters, handoff, resume, assignment, tags, attachments, delivery state, bookings, Action History, daily checklist, success block, image brief, and video brief.
- Contacts identity, lead-temperature definitions, downstream effects, duplicates, multiple channel identities, success block, and image briefs.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/conversation-guides.test.mjs
```

Expected: FAIL against the current overview-level pages.

- [ ] **Step 3: Verify visible Inbox and Contact behavior**

Inspect current filter labels, AI controls, conversation detail fields, contact detail fields, attachment states, and Action History labels. Treat plan-gated media understanding as available only where the product presents it.

- [ ] **Step 4: Rewrite Inbox**

Add:

- One annotated layout orientation.
- Filter-by-goal table.
- AI-to-human handoff and resume procedure.
- Reply, assignment, tags, lead temperature, attachments, delivery state, and booking context.
- Action History event categories.
- Daily opening and closing checklist.
- Success check.

Media:

- `/media/conversations/inbox-layout.png`
- `/media/conversations/human-handoff.mp4`, 45–60 seconds

- [ ] **Step 5: Rewrite Contacts**

Define:

- Hot: strong immediate intent.
- Warm: meaningful interest requiring progress.
- Cold: not currently progressing.

Explain channel identity, tags, assignment, Follow-up audience effects, duplicate limitations, and safe editing. Add:

- `/media/conversations/contact-details.png`
- `/media/conversations/lead-temperature.png`

- [ ] **Step 6: Run conversation tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/conversation-guides.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit conversation guides**

```bash
git add kilobot-docs/docs/engage/inbox.mdx kilobot-docs/docs/engage/contacts.mdx kilobot-docs/tests/conversation-guides.test.mjs
git commit -m "docs: expand Inbox and Contacts guidance"
```

---

### Task 7: Build the Connected Booking Journey

**Files:**
- Modify: `kilobot-docs/docs/bookings/services.mdx`
- Modify: `kilobot-docs/docs/bookings/availability.mdx`
- Modify: `kilobot-docs/docs/bookings/calendar.mdx`
- Create: `kilobot-docs/tests/booking-guides.test.mjs`

**Interfaces:**
- Consumes: Northstar Dental scenario, current booking controls, and shared guide components.
- Produces: A continuous Service → Availability → Calendar journey.

- [ ] **Step 1: Write failing booking contracts**

Assert:

- All three pages use `Northstar Consultation`.
- Services covers fields, activation, assignment comparison, edits, and media.
- Availability covers timezone, weekly hours, 24/7 reset behavior, buffer/conflict evaluation, missing-slot decision tree, and media.
- Calendar covers manual validation, custom interval, statuses, Reminder impact, and media.
- One shared booking-journey video asset path appears across the section.

- [ ] **Step 2: Run booking tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/booking-guides.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Verify booking behavior**

Inspect current Service fields, assignment strategies, Availability controls, manual booking dialog, conflict validation, and Calendar status labels. Use current labels and avoid unsupported deletion consequences.

- [ ] **Step 4: Rewrite Services**

Create the example:

- Service: Northstar Consultation
- Duration: 30 minutes
- Buffer: 15 minutes
- Required customer fields: name, phone, reason for visit

Add:

- Field guide.
- Conversation owner first, Balanced, Round robin, and Specific teammate table.
- Activation and Workflow connection.
- Confirmed edit/deactivation consequences.
- Success and troubleshooting.
- `/media/bookings/service-form.png`
- `/media/bookings/assignment-strategies.png`

- [ ] **Step 5: Rewrite Availability**

Explain weekly hours, timezone, Available 24/7 on/off behavior, duration, buffer, Calendar conflicts, and assignment eligibility.

Add a text decision tree beginning with Service active, teammate eligible, timezone/hours, buffer/duration, and Calendar conflict.

Media:

- `/media/bookings/weekly-availability.png`
- `/media/bookings/missing-slot-checks.png`

- [ ] **Step 6: Rewrite Calendar**

Explain navigation, manual booking, contact selection, Service selection, custom start/end interval, revalidation, Scheduled/Completed/Cancelled/No-show, editing, and Reminder implications.

Media:

- `/media/bookings/manual-booking.png`
- `/media/bookings/calendar-statuses.png`
- `/media/bookings/complete-booking-journey.mp4`, 60–90 seconds

- [ ] **Step 7: Run booking tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/booking-guides.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit booking guides**

```bash
git add kilobot-docs/docs/bookings kilobot-docs/tests/booking-guides.test.mjs
git commit -m "docs: document the complete booking journey"
```

---

### Task 8: Separate Workflow Concepts from Workflow Building

**Files:**
- Modify: `kilobot-docs/docs/automate/workflow-overview.mdx`
- Create: `kilobot-docs/docs/automate/build-and-test.mdx`
- Create: `kilobot-docs/tests/workflow-guides.test.mjs`

**Interfaces:**
- Consumes: Current Workflow canvas, node types, save/discard/arrange behavior, and Test Agent.
- Produces: One conceptual overview and one complete build/test guide.

- [ ] **Step 1: Write failing Workflow tests**

Assert:

- Overview distinguishes Message handling, Reminders, and Follow-ups.
- Overview links Reminders and Follow-ups to Outreach.
- Build page contains the Northstar brochure example.
- Build page contains weak/strong conditions, overlap, near-misses, all six action types, template/blank, arrange, discard, save, test, success, images, and video.

- [ ] **Step 2: Run Workflow tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/workflow-guides.test.mjs
```

Expected: FAIL because no build-and-test page exists.

- [ ] **Step 3: Rewrite Workflow overview**

Keep the conceptual model compact:

- Message handling reacts to the current inbound message.
- Reminders schedule around booked appointments.
- Follow-ups react to customer silence.

Explain nodes, connections, conditions, actions, drafts, and saved behavior. Link to the build guide and Outreach pages.

- [ ] **Step 4: Write Build and test a Workflow**

Use:

- Condition name: `Product brochure`
- Strong condition: customer asks for a brochure, treatment overview, or service information document.
- Near-miss: customer asks whether a specific treatment is medically suitable.
- Action: send the approved brochure file.

Add a weak condition example such as `When they ask about services` and explain why it overlaps.

Provide one concrete example for:

- Send message.
- Send Photo/Video.
- Send Files.
- Book appointment.
- Human escalation.
- Close conversation.

Media:

- `/media/workflows/graph-and-inspector.png`
- `/media/workflows/action-types.png`
- `/media/workflows/build-and-test.mp4`, 60–90 seconds

- [ ] **Step 5: Run Workflow tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/workflow-guides.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit Workflow guides**

```bash
git add kilobot-docs/docs/automate/workflow-overview.mdx kilobot-docs/docs/automate/build-and-test.mdx kilobot-docs/tests/workflow-guides.test.mjs
git commit -m "docs: add a complete Workflow building guide"
```

---

### Task 9: Expand Outreach Operations

**Files:**
- Modify: `kilobot-docs/docs/engage/message-templates.mdx`
- Modify: `kilobot-docs/docs/engage/broadcast.mdx`
- Modify: `kilobot-docs/docs/automate/reminders.mdx`
- Modify: `kilobot-docs/docs/automate/follow-ups.mdx`
- Create: `kilobot-docs/tests/outreach-guides.test.mjs`

**Interfaces:**
- Consumes: Current Meta template, Broadcast, Reminder, and Follow-up product behavior.
- Produces: Complete Outreach section without hidden Usage and billing links.

- [ ] **Step 1: Write failing Outreach tests**

Test:

- No Outreach page links `/insights/usage-and-billing`.
- Message Templates contains positional and named variable examples, lifecycle, category change, resubmission, policy, and media.
- Broadcast contains eligibility/exclusion, test audience, parameters, cost, scheduling, cancellation, recipients, failures, and media.
- Reminders and Follow-ups contain exact scope behavior, safe schedules, stop/cancel/skip/failure behavior, History fields, success, and media.

- [ ] **Step 2: Run Outreach tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/outreach-guides.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Verify Outreach behavior**

Inspect current template editor, status mapping, Broadcast audience and History, Reminder scope/history, and Follow-up timing/message logic. Document only externally meaningful behavior.

- [ ] **Step 4: Rewrite Message Templates**

Add one Northstar appointment-confirmation template with:

- Named customer and appointment variables.
- Example values.
- Optional header/footer/button explanation.
- Submitting, In review, Approved, and Failed.
- Category update and edit/resubmission expectations.
- Separate KiloBot credit and Meta provider-charge note.

Media:

- `/media/outreach/template-editor.png`
- `/media/outreach/template-preview.png`
- `/media/outreach/template-statuses.png`

- [ ] **Step 5: Rewrite Broadcast**

Create a controlled test audience using tagged internal contacts. Explain eligibility, exclusions, recipient count, parameter preview, cost estimate, scheduling, confirmation, cancellation, and recipient History.

Media:

- `/media/outreach/broadcast-audience.png`
- `/media/outreach/broadcast-cost.png`
- `/media/outreach/broadcast-history.png`
- `/media/outreach/template-to-test-broadcast.mp4`, 60–90 seconds

- [ ] **Step 6: Rewrite Reminders**

Define Current & future and Future only exactly. Add a safe two-reminder example and explain scheduled, sent, failed, cancelled, and skipped outcomes.

Media:

- `/media/outreach/reminder-scope.png`
- `/media/outreach/reminder-history.png`
- `/media/outreach/configure-reminders.mp4`, 45–60 seconds

- [ ] **Step 7: Rewrite Follow-ups**

Define scope, audience, Start after, attempts, interval, same/different templates, confirmation, activation, customer-reply stop behavior, and History.

Media:

- `/media/outreach/follow-up-timing.png`
- `/media/outreach/follow-up-history.png`
- `/media/outreach/configure-follow-ups.mp4`, 45–60 seconds

- [ ] **Step 8: Run Outreach tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/outreach-guides.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit Outreach guides**

```bash
git add kilobot-docs/docs/engage kilobot-docs/docs/automate/reminders.mdx kilobot-docs/docs/automate/follow-ups.mdx kilobot-docs/tests/outreach-guides.test.mjs
git commit -m "docs: expand Outreach guidance"
```

---

### Task 10: Expand Teams and Support

**Files:**
- Modify: `kilobot-docs/docs/start-here/workspaces-and-agents.mdx`
- Modify: `kilobot-docs/docs/team/workspace-and-team.mdx`
- Modify: `kilobot-docs/docs/team/roles-and-permissions.mdx`
- Modify: `kilobot-docs/docs/team/lead-assignment.mdx`
- Modify: `kilobot-docs/docs/help/troubleshooting.mdx`
- Modify: `kilobot-docs/docs/help/contact-support.mdx`
- Create: `kilobot-docs/tests/team-and-support-guides.test.mjs`

**Interfaces:**
- Consumes: Current membership, permissions, assignment, support, and troubleshooting behavior.
- Produces: Complete Teams and Help sections.

- [ ] **Step 1: Write failing Teams and Help tests**

Assert:

- Workspaces and agents contains the workspace/agent relationship and diagram brief.
- Workspace and team contains invitation and membership lifecycle.
- Roles contains a responsibility matrix and role-testing process.
- Lead Assignment compares manual, balanced, and round robin and explains Service interaction.
- Troubleshooting covers all ten approved symptom groups.
- Contact support contains the complete redacted bug-report checklist.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/team-and-support-guides.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Verify team and permission behavior**

Inspect workspace invitations, team role editor, navigation permission mapping, Lead Assignment controls, and Service assignment. Avoid documenting invitation expiry or custom-role availability unless current code confirms it.

- [ ] **Step 4: Rewrite Teams guides**

Add:

- Workspace → agents relationship and media brief.
- Invitation, acceptance, pending state, role change, and removal.
- Responsibility-to-role matrix.
- Role verification checklist.
- Manual, balanced, and round-robin comparison.
- Service assignment interaction.
- Reassignment review.

Media:

- `/media/teams/workspace-agent-model.png`
- `/media/teams/roles-matrix.png`
- `/media/teams/lead-assignment.png`

- [ ] **Step 5: Expand Troubleshooting**

Use symptom headings for:

1. Incorrect or incomplete answers.
2. Missing customer messages.
3. Missing AI replies.
4. Failed channel connection.
5. Missing booking slots.
6. Unavailable WhatsApp template.
7. Broadcast exclusion or failure.
8. Reminder or Follow-up outcome.
9. Missing page or action.
10. Unsaved changes.

Each path states expected state, ordered checks, and escalation boundary.

Add image briefs for:

- `/media/help/disconnected-channel.png`
- `/media/help/template-in-review.png`
- `/media/help/permission-restricted-action.png`
- `/media/help/unsaved-draft.png`

- [ ] **Step 6: Improve Contact support**

Keep bug form, WhatsApp, email, contact page, and security warning. Require workspace, agent, page, task, timestamp/timezone, reproduction, expected/actual, browser/device, and redacted media.

- [ ] **Step 7: Run Teams and Help tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/team-and-support-guides.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit Teams and Help**

```bash
git add kilobot-docs/docs/start-here/workspaces-and-agents.mdx kilobot-docs/docs/team kilobot-docs/docs/help kilobot-docs/tests/team-and-support-guides.test.mjs
git commit -m "docs: expand Teams and troubleshooting guidance"
```

---

### Task 11: Verify Links, Media Briefs, Rendering, and Release State

**Files:**
- Create: `kilobot-docs/tests/guide-content-contract.test.mjs`
- Modify: `kilobot-docs/tests/help-center-structure.test.mjs`
- Modify: `kilobot-docs/tests/help-center-brand.test.mjs`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: Every public MDX file and all guide components.
- Produces: Verified production build and compaction-safe implementation record.

- [ ] **Step 1: Write the cross-guide content contract**

Walk public `.mdx` files recursively and assert:

- No hidden routes or hidden topic names are linked from public guides.
- No public guide says `Connect another channel`.
- Every `DocMediaPlaceholder` use includes `kind`, `title`, `description`, `capture`, and `assetPath`.
- Every `assetPath` begins with `/media/`.
- Every page with `<ol className="steps">` imports and uses `DocSuccess`, except the redirect stub and changelog.
- Every UI-dependent guide imports and uses `DocVerified`.
- Public prose outside the historical changelog does not use `Kilobot` when referring to the product.

Implement the scanner with Node built-ins and keep the test below 300 lines.

- [ ] **Step 2: Run the contract to expose remaining gaps**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && node --test tests/guide-content-contract.test.mjs
```

Expected: FAIL if any rewritten page missed a required contract.

- [ ] **Step 3: Fix all contract failures**

Correct the source pages. Do not weaken assertions to permit missing requirements.

- [ ] **Step 4: Run every docs test**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun test
```

Expected: all documentation tests PASS.

- [ ] **Step 5: Run typecheck**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun run typecheck
```

Expected: PASS.

- [ ] **Step 6: Run the production build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun run build
```

Expected: PASS with no broken links or MDX errors.

- [ ] **Step 7: Inspect the rendered guide**

Serve the built site locally and check:

- Welcome in desktop light and dark themes.
- Quick Start.
- Nested Conversations sidebar.
- One image placeholder and one video placeholder.
- Mobile sidebar.
- Search results for Quick Start and hidden topics.

Expected:

- Hidden topics produce no search result.
- Placeholders remain readable and intentional.
- No top-level section is visually confused with nested Conversations.
- No horizontal overflow appears on mobile.

- [ ] **Step 8: Review file lengths and whitespace**

Run:

```bash
git diff --check
find kilobot-docs/src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) -print0 | xargs -0 wc -l
```

Expected: no whitespace errors and no code file over 300 lines.

- [ ] **Step 9: Update continuity without publishing a release**

Record:

- Public guide redesign implemented.
- Visible media placeholders remain until supplied assets replace them.
- Exact verification results.
- Not deployed and not added to the changelog.

Do not modify `kilobot-docs/docs/releases/changelog.mdx` without a confirmed production date.

- [ ] **Step 10: Commit final verification**

```bash
git add kilobot-docs/tests CONTINUITY.md
git commit -m "docs: verify the redesigned KiloBot guide"
```
