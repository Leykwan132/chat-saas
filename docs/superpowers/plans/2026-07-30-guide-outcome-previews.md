# Guide Outcome Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an easy-to-understand outcome preview near the top of every KiloBot instructional guide.

**Architecture:** Use one plain Markdown `### By the end, you will` section in each of the 25 instructional MDX pages. Add one focused Node content-contract test that explicitly enumerates the included and excluded pages, validates placement and bullet shape, and locks Quick Start's approved introduction and outcomes.

**Tech Stack:** Docusaurus MDX, Node.js 22, Bun, `node:test`, `node:assert`

## Global Constraints

- Apply the preview to all 25 instructional guides.
- Exclude `start-here/welcome.mdx`, `start-here/launch-guide.mdx`, and `releases/changelog.mdx`.
- Use this order: title, verification date when present, one short introductory paragraph, outcome preview, prerequisites when present, first `##` section.
- Use the exact heading `### By the end, you will`.
- Use three to five plain Markdown bullets with no wrapper, border, background, icon, or decorative treatment.
- Every bullet starts with a clear action verb, describes one recognizable result, and uses 14 words or fewer.
- Quick Start uses the exact introduction: `In about 5 minutes, you will create and test a working agent using Northstar Dental as the example.`
- Do not introduce a shared React component or CSS change.
- Run every script and test with Node.js 22.
- Keep code files under 300 lines.
- Do not add this unreleased documentation improvement to the public changelog.

---

### Task 1: Add the outcome content contract and Getting Started previews

**Files:**
- Create: `kilobot-docs/tests/guide-outcomes.test.mjs`
- Modify: `kilobot-docs/docs/start-here/quick-start.mdx`
- Modify: `kilobot-docs/docs/start-here/workspaces-and-agents.mdx`

**Interfaces:**
- Consumes: MDX source files below `kilobot-docs/docs`
- Produces: `assertGuideOutcomes(relativePath, expectedOutcomes)` and the initial `guides` entries used by later tasks

- [ ] **Step 1: Write the failing content-contract test**

Create `kilobot-docs/tests/guide-outcomes.test.mjs` with:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const docsDirectory = fileURLToPath(new URL("../docs/", import.meta.url));
const outcomeHeading = "### By the end, you will";

const guides = new Map([
  ["start-here/quick-start.mdx", [
    "Create a working agent",
    "Add one trusted answer",
    "Test that the agent uses the approved answer",
  ]],
  ["start-here/workspaces-and-agents.mdx", [
    "Choose when to create a workspace, agent, or invitation",
    "Create and switch between agents",
    "Keep each agent’s settings and customer experience separate",
  ]],
]);

const excludedGuides = [
  "start-here/welcome.mdx",
  "start-here/launch-guide.mdx",
  "releases/changelog.mdx",
];

function readGuide(relativePath) {
  return readFileSync(`${docsDirectory}${relativePath}`, "utf8");
}

function parseOutcomes(source) {
  const section = source.match(
    /### By the end, you will\n\n((?:- .+(?:\n|$)){3,5})/,
  );
  return section?.[1].trim().split("\n").map((line) => line.slice(2));
}

function countWords(value) {
  return value.replace(/[`*_]/g, "").trim().split(/\s+/).length;
}

function assertGuideOutcomes(relativePath, expectedOutcomes) {
  const source = readGuide(relativePath);
  const headingMatches = source.match(/### By the end, you will/g) ?? [];
  const outcomes = parseOutcomes(source);
  const headingIndex = source.indexOf(outcomeHeading);
  const prerequisitesIndex = source.indexOf("<DocPrerequisites");
  const firstSectionIndex = source.indexOf("\n## ");
  const nextContentIndex =
    prerequisitesIndex >= 0 ? prerequisitesIndex : firstSectionIndex;

  assert.equal(headingMatches.length, 1, relativePath);
  assert.deepEqual(outcomes, expectedOutcomes, relativePath);
  assert.ok(headingIndex > source.indexOf("\n# "), relativePath);
  assert.ok(nextContentIndex > headingIndex, relativePath);
  assert.ok(outcomes.length >= 3 && outcomes.length <= 5, relativePath);

  for (const outcome of outcomes) {
    assert.match(outcome, /^[A-Z]/, `${relativePath}: ${outcome}`);
    assert.ok(countWords(outcome) <= 14, `${relativePath}: ${outcome}`);
  }
}

test("instructional guides preview their outcomes", () => {
  for (const [relativePath, expectedOutcomes] of guides) {
    assertGuideOutcomes(relativePath, expectedOutcomes);
  }
});

test("non-instructional pages do not show the outcome preview", () => {
  for (const relativePath of excludedGuides) {
    assert.doesNotMatch(readGuide(relativePath), /### By the end, you will/);
  }
});

test("Quick Start uses the approved five-minute introduction", () => {
  assert.match(
    readGuide("start-here/quick-start.mdx"),
    /In about 5 minutes, you will create and test a working agent using Northstar Dental as the example\./,
  );
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun test tests/guide-outcomes.test.mjs
```

Expected: FAIL because both Getting Started pages lack the approved preview and Quick Start lacks the approved introduction.

- [ ] **Step 3: Add the exact Getting Started copy**

Replace Quick Start's existing introduction with:

```md
In about 5 minutes, you will create and test a working agent using Northstar Dental as the example.

### By the end, you will

- Create a working agent
- Add one trusted answer
- Test that the agent uses the approved answer
```

Add this block after the introductory paragraph in `workspaces-and-agents.mdx`:

```md
### By the end, you will

- Choose when to create a workspace, agent, or invitation
- Create and switch between agents
- Keep each agent’s settings and customer experience separate
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun test tests/guide-outcomes.test.mjs
```

Expected: PASS with 3 tests.

- [ ] **Step 5: Commit the contract and Getting Started previews**

```bash
git add kilobot-docs/tests/guide-outcomes.test.mjs kilobot-docs/docs/start-here/quick-start.mdx kilobot-docs/docs/start-here/workspaces-and-agents.mdx
git commit -m "docs: preview getting started outcomes"
```

### Task 2: Add Agent and Channels previews

**Files:**
- Modify: `kilobot-docs/tests/guide-outcomes.test.mjs`
- Modify: `kilobot-docs/docs/build-your-agent/agent-setup.mdx`
- Modify: `kilobot-docs/docs/build-your-agent/knowledge-base.mdx`
- Modify: `kilobot-docs/docs/channels/connect-channels.mdx`
- Modify: `kilobot-docs/docs/channels/website-widget.mdx`
- Modify: `kilobot-docs/docs/channels/whatsapp.mdx`
- Modify: `kilobot-docs/docs/channels/instagram.mdx`
- Modify: `kilobot-docs/docs/channels/messenger.mdx`

**Interfaces:**
- Consumes: `guides` and `assertGuideOutcomes` from Task 1
- Produces: seven new exact entries in `guides` and seven matching MDX previews

- [ ] **Step 1: Add these exact failing `guides` entries**

```js
["build-your-agent/agent-setup.mdx", [
  "Decide where instructions, facts, and actions belong",
  "Write clear behavior, tone, boundaries, and escalation rules",
  "Test changes before publishing the agent",
]],
["build-your-agent/knowledge-base.mdx", [
  "Choose the right source type",
  "Add, replace, and remove trusted information",
  "Test that the agent answers from approved facts",
]],
["channels/connect-channels.mdx", [
  "Choose the right channel for your customers",
  "Understand each connection status",
  "Connect a channel and verify a real conversation",
]],
["channels/website-widget.mdx", [
  "Configure the Website widget",
  "Install it on your website",
  "Verify that visitor messages reach Inbox",
]],
["channels/whatsapp.mdx", [
  "Complete the Meta connection flow",
  "Confirm synchronization finishes successfully",
  "Verify incoming messages and teammate replies",
]],
["channels/instagram.mdx", [
  "Connect the correct professional Instagram account",
  "Verify a direct message reaches Inbox",
  "Send a teammate reply from KiloBot",
]],
["channels/messenger.mdx", [
  "Connect the correct Facebook Page",
  "Verify a Page message reaches Inbox",
  "Send a teammate reply from KiloBot",
]],
```

- [ ] **Step 2: Run the focused test and verify RED**

Run the Task 1 focused command. Expected: FAIL on the seven new guide entries.

- [ ] **Step 3: Add one exact preview after each page's introductory paragraph**

For each of the seven files, copy its three literal strings from the immediately preceding `guides` entry into plain Markdown bullets below `### By the end, you will`. Place the block after the introductory paragraph and before prerequisites or the first `##` section.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Task 1 focused command. Expected: PASS with 3 tests.

- [ ] **Step 5: Commit Agent and Channels**

```bash
git add kilobot-docs/tests/guide-outcomes.test.mjs kilobot-docs/docs/build-your-agent kilobot-docs/docs/channels
git commit -m "docs: preview agent and channel outcomes"
```

### Task 3: Add Conversations and Bookings previews

**Files:**
- Modify: `kilobot-docs/tests/guide-outcomes.test.mjs`
- Modify: `kilobot-docs/docs/engage/inbox.mdx`
- Modify: `kilobot-docs/docs/engage/contacts.mdx`
- Modify: `kilobot-docs/docs/bookings/services.mdx`
- Modify: `kilobot-docs/docs/bookings/availability.mdx`
- Modify: `kilobot-docs/docs/bookings/calendar.mdx`

**Interfaces:**
- Consumes: the Task 1 content contract
- Produces: five new exact entries in `guides` and five matching MDX previews

- [ ] **Step 1: Add these exact failing `guides` entries**

```js
["engage/inbox.mdx", [
  "Find conversations and understand the Inbox layout",
  "Manage AI and teammate ownership",
  "Reply, update customer context, and review completed actions",
]],
["engage/contacts.mdx", [
  "Confirm a customer’s identity and channel source",
  "Update tags, lead temperature, and customer details",
  "Review linked conversations and bookings",
]],
["bookings/services.mdx", [
  "Create a customer-facing Service",
  "Configure timing, booking fields, and assignment",
  "Test that customers can book an eligible teammate",
]],
["bookings/availability.mdx", [
  "Set weekly hours and the correct timezone",
  "Account for Service duration, buffers, and Calendar conflicts",
  "Diagnose why a booking slot is unavailable",
]],
["bookings/calendar.mdx", [
  "Create a customer booking manually",
  "Check availability and prevent scheduling conflicts",
  "Update appointment status and review booking history",
]],
```

- [ ] **Step 2: Run the focused test and verify RED**

Run the Task 1 focused command. Expected: FAIL on the five new guide entries.

- [ ] **Step 3: Add the five exact Markdown previews**

For each file in Step 1, insert `### By the end, you will` and its three exact strings as bullets after the introductory paragraph and before prerequisites or the first `##` section.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Task 1 focused command. Expected: PASS with 3 tests.

- [ ] **Step 5: Commit Conversations and Bookings**

```bash
git add kilobot-docs/tests/guide-outcomes.test.mjs kilobot-docs/docs/engage/inbox.mdx kilobot-docs/docs/engage/contacts.mdx kilobot-docs/docs/bookings
git commit -m "docs: preview conversation and booking outcomes"
```

### Task 4: Add Workflows and Outreach previews

**Files:**
- Modify: `kilobot-docs/tests/guide-outcomes.test.mjs`
- Modify: `kilobot-docs/docs/automate/workflow-overview.mdx`
- Modify: `kilobot-docs/docs/automate/build-and-test.mdx`
- Modify: `kilobot-docs/docs/engage/message-templates.mdx`
- Modify: `kilobot-docs/docs/engage/broadcast.mdx`
- Modify: `kilobot-docs/docs/automate/reminders.mdx`
- Modify: `kilobot-docs/docs/automate/follow-ups.mdx`

**Interfaces:**
- Consumes: the Task 1 content contract
- Produces: six new exact entries in `guides` and six matching MDX previews

- [ ] **Step 1: Add these exact failing `guides` entries**

```js
["automate/workflow-overview.mdx", [
  "Choose the correct Workflow view",
  "Understand how conditions trigger actions",
  "Decide when to use Reminders or Follow-ups",
]],
["automate/build-and-test.mdx", [
  "Write a precise customer-intent condition",
  "Choose safe actions for the matched request",
  "Test matches and near misses before publishing",
]],
["engage/message-templates.mdx", [
  "Create a complete WhatsApp Message Template",
  "Add examples and media where required",
  "Submit the template and confirm approval before use",
]],
["engage/broadcast.mdx", [
  "Choose an approved template and audience",
  "Review message variables, recipients, and estimated charges",
  "Send safely and inspect delivery history",
]],
["automate/reminders.mdx", [
  "Choose which appointments should receive reminders",
  "Configure approved messages and send timing",
  "Verify scheduled and completed sends in History",
]],
["automate/follow-ups.mdx", [
  "Choose the follow-up audience and activation scope",
  "Configure timing, attempts, and approved messages",
  "Verify replies stop later attempts",
]],
```

- [ ] **Step 2: Run the focused test and verify RED**

Run the Task 1 focused command. Expected: FAIL on the six new guide entries.

- [ ] **Step 3: Add the six exact Markdown previews**

For each file in Step 1, insert `### By the end, you will` and its three exact strings as bullets after the introductory paragraph and before prerequisites or the first `##` section.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Task 1 focused command. Expected: PASS with 3 tests.

- [ ] **Step 5: Commit Workflows and Outreach**

```bash
git add kilobot-docs/tests/guide-outcomes.test.mjs kilobot-docs/docs/automate kilobot-docs/docs/engage/message-templates.mdx kilobot-docs/docs/engage/broadcast.mdx
git commit -m "docs: preview workflow and outreach outcomes"
```

### Task 5: Add Teams and Help previews

**Files:**
- Modify: `kilobot-docs/tests/guide-outcomes.test.mjs`
- Modify: `kilobot-docs/docs/team/workspace-and-team.mdx`
- Modify: `kilobot-docs/docs/team/roles-and-permissions.mdx`
- Modify: `kilobot-docs/docs/team/lead-assignment.mdx`
- Modify: `kilobot-docs/docs/help/troubleshooting.mdx`
- Modify: `kilobot-docs/docs/help/contact-support.mdx`

**Interfaces:**
- Consumes: the Task 1 content contract
- Produces: the final five exact entries in `guides`, making its explicit inventory total 25

- [ ] **Step 1: Add these exact failing `guides` entries**

```js
["team/workspace-and-team.mdx", [
  "Invite a teammate to the correct workspace",
  "Assign the smallest suitable role",
  "Review, change, or remove team access",
]],
["team/roles-and-permissions.mdx", [
  "Match permissions to a teammate’s responsibilities",
  "Assign the smallest suitable access",
  "Test what the teammate can view and manage",
]],
["team/lead-assignment.mdx", [
  "Choose a conversation assignment strategy",
  "Configure teammate eligibility and booking ownership",
  "Verify new work reaches the intended teammate",
]],
["help/troubleshooting.mdx", [
  "Diagnose common agent, channel, booking, and Outreach problems",
  "Check workspace, agent, permissions, and connection state",
  "Gather useful evidence when support is needed",
]],
["help/contact-support.mdx", [
  "Choose the right support route",
  "Include the details needed to investigate",
  "Remove sensitive customer data before sharing evidence",
]],
```

- [ ] **Step 2: Run the focused test and verify RED**

Run the Task 1 focused command. Expected: FAIL on the five new guide entries.

- [ ] **Step 3: Add the five exact Markdown previews**

For each file in Step 1, insert `### By the end, you will` and its three exact strings as bullets after the introductory paragraph and before prerequisites or the first `##` section.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Task 1 focused command. Expected: PASS with 3 tests and all 25 instructional files covered.

- [ ] **Step 5: Commit Teams and Help**

```bash
git add kilobot-docs/tests/guide-outcomes.test.mjs kilobot-docs/docs/team kilobot-docs/docs/help
git commit -m "docs: preview team and support outcomes"
```

### Task 6: Verify the complete documentation experience

**Files:**
- Modify: `CONTINUITY.md`
- Verify only: `kilobot-docs/docs/releases/changelog.mdx`

**Interfaces:**
- Consumes: all 25 previews and the completed content contract
- Produces: a verified branch and a compaction-safe unreleased-work record

- [ ] **Step 1: Run the complete automated verification**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd kilobot-docs && bun run test && bun test src/components/DocGuideComponents.test.tsx && bun run typecheck && bun run build && cd .. && git diff --check
```

Expected: all docs tests, rendered component tests, typecheck, build, and whitespace checks pass.

- [ ] **Step 2: Verify the explicit inventory and exclusions**

```bash
rg -l '^### By the end, you will$' kilobot-docs/docs | sort
rg -n '^### By the end, you will$' kilobot-docs/docs/start-here/welcome.mdx kilobot-docs/docs/start-here/launch-guide.mdx kilobot-docs/docs/releases/changelog.mdx
```

Expected: the first command lists exactly 25 files; the second command has no matches.

- [ ] **Step 3: Visually inspect representative built pages**

Serve the built docs and inspect Quick Start plus one Agent, Channel, Booking, Workflow, Outreach, Team, and Help page. Confirm the preview appears below the introduction, the right-side outline remains balanced, light and dark themes are readable, and a 390px viewport has no horizontal overflow.

- [ ] **Step 4: Record the unreleased result**

Update `CONTINUITY.md` with the verified outcome-preview state and commands. Do not edit `kilobot-docs/docs/releases/changelog.mdx` because production availability is unconfirmed.

- [ ] **Step 5: Commit the verification record**

```bash
git add CONTINUITY.md
git commit -m "docs: record guide outcome verification"
```
