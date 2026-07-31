import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const docsDirectory = fileURLToPath(new URL("../docs/", import.meta.url));
const outcomeHeading = "### By the end, you will";
const outcomeImport =
  "import DocOutcomes from '@site/src/components/DocOutcomes';";
const outcomeContainerPattern =
  /<DocOutcomes>\n\n### By the end, you will\n\n(?:- .+(?:\n|$)){3,5}\n<\/DocOutcomes>/;

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
  ["build-your-agent/agent-setup.mdx", [
    "Decide where instructions, facts, and actions belong",
    "Write clear behavior, tone, boundaries, and escalation rules",
    "Review the agent behavior before using it",
  ]],
  ["build-your-agent/knowledge-base.mdx", [
    "Choose the right source type",
    "Add, replace, and remove trusted information",
    "Ground answers in approved facts",
  ]],
  ["channels/connect-channels.mdx", [
    "Choose the right channel for your customers",
    "Understand each connection status",
    "See a connected channel in Inbox",
  ]],
  ["channels/website-widget.mdx", [
    "Configure the Website widget",
    "Install it on your website",
    "See visitor messages in Inbox",
  ]],
  ["channels/whatsapp.mdx", [
    "Complete the Meta connection flow",
    "Confirm synchronization finishes successfully",
    "See incoming messages, teammate replies, and safe disconnection",
  ]],
  ["channels/instagram.mdx", [
    "Connect the correct professional Instagram account",
    "See a direct message reach Inbox",
    "Send a teammate reply from KiloBot",
  ]],
  ["channels/messenger.mdx", [
    "Connect the correct Facebook Page",
    "See a Page message reach Inbox",
    "Send a teammate reply from KiloBot",
  ]],
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
  ["automate/send-messages-and-assets.mdx", [
    "Send an exact message when a customer request matches",
    "Deliver approved photos, videos, and files",
    "Keep near-miss requests on their intended paths",
  ]],
  ["automate/human-in-the-loop.mdx", [
    "Recognize when a teammate should take over",
    "Pause AI replies with a clear escalation condition",
    "Close a conversation only when it is complete",
  ]],
  ["automate/automate-bookings.mdx", [
    "Connect a booking request to an active service",
    "Keep service and availability setup in Bookings",
    "Route clear booking intent without matching unrelated questions",
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
    "See scheduled and completed sends in History",
  ]],
  ["automate/follow-ups.mdx", [
    "Choose the follow-up audience and activation scope",
    "Configure timing, attempts, and approved messages",
    "Stop later attempts when customers reply",
  ]],
  ["team/workspace-and-team.mdx", [
    "Invite a teammate to the correct workspace",
    "Assign the smallest suitable role",
    "Review, change, or remove team access",
  ]],
  ["team/roles-and-permissions.mdx", [
    "Match permissions to a teammate’s responsibilities",
    "Assign the smallest suitable access",
    "Give teammates only the access they need",
  ]],
  ["team/lead-assignment.mdx", [
    "Choose a conversation assignment strategy",
    "Configure teammate eligibility and booking ownership",
    "See new work reach the intended teammate",
  ]],
  ["help/troubleshooting.mdx", [
    "Diagnose common agent, channel, booking, and Broadcast problems",
    "Check workspace, agent, permissions, and connection state",
    "Gather useful evidence when support is needed",
  ]],
  ["help/contact-support.mdx", [
    "Choose the right support route",
    "Include the details needed to investigate",
    "Remove sensitive customer data before sharing evidence",
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
  const importMatches = source.match(
    /import DocOutcomes from '@site\/src\/components\/DocOutcomes';/g,
  ) ?? [];
  const openingMatches = source.match(/<DocOutcomes>/g) ?? [];
  const closingMatches = source.match(/<\/DocOutcomes>/g) ?? [];
  const outcomes = parseOutcomes(source);
  const headingIndex = source.indexOf(outcomeHeading);
  const verifiedIndex = source.indexOf("<DocVerified date=");
  const firstSectionIndex = source.indexOf("\n## ");

  assert.equal(headingMatches.length, 1, relativePath);
  assert.equal(importMatches.length, 1, `${relativePath}: import`);
  assert.equal(openingMatches.length, 1, `${relativePath}: opening`);
  assert.equal(closingMatches.length, 1, `${relativePath}: closing`);
  assert.match(source, outcomeContainerPattern, `${relativePath}: wrapper`);
  assert.deepEqual(outcomes, expectedOutcomes, relativePath);
  assert.ok(headingIndex > source.indexOf("\n# "), relativePath);
  if (verifiedIndex >= 0) {
    assert.ok(verifiedIndex < headingIndex, `${relativePath}: verification date`);
  }
  assert.ok(firstSectionIndex > headingIndex, relativePath);
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
    const source = readGuide(relativePath);
    assert.doesNotMatch(source, /### By the end, you will/);
    assert.ok(!source.includes(outcomeImport));
    assert.doesNotMatch(source, /<\/?DocOutcomes>/);
  }
});

test("instructional guides offer page-specific next steps", () => {
  for (const relativePath of guides.keys()) {
    const source = readGuide(relativePath);
    const nextSteps = source.split("## Next steps")[1];

    assert.ok(nextSteps, `${relativePath}: next steps`);
    assert.ok((nextSteps.match(/^- \[/gm) ?? []).length >= 2, relativePath);
  }
  for (const relativePath of [
    "automate/send-messages-and-assets.mdx",
    "automate/follow-ups.mdx",
    "engage/inbox.mdx",
  ]) {
    const source = readGuide(relativePath);
    assert.equal(source.includes("Add human handoff"), false, relativePath);
    assert.ok(source.includes("Human escalation"), relativePath);
  }
});

test("public guides do not show success panels", () => {
  for (const relativePath of [...guides.keys(), ...excludedGuides]) {
    assert.equal(readGuide(relativePath).includes("DocSuccess"), false, relativePath);
  }
});

test("WhatsApp explains coexistence before connection and safe disconnection", () => {
  const source = readGuide("channels/whatsapp.mdx");

  assert.ok(source.includes("## Connect with Coexistence"));
  assert.ok(
    source.indexOf("Coexistence lets you use the same WhatsApp Business number") <
      source.indexOf('<ol className="steps">'),
  );
  assert.ok(source.includes("Choose <strong>WhatsApp Business app</strong>, then enter your phone number"));
  assert.ok(source.includes("Scan the QR code from the WhatsApp Business app on your phone"));
  assert.ok(source.includes("Add a payment method if Meta asks for one"));
  assert.ok(source.includes("continue the initial history sync"));
  assert.ok(source.includes("## Disconnect"));
  assert.ok(source.includes("clears its authorization"));
  assert.ok(source.includes("It does not delete the WhatsApp Business account"));
});

test("Meta channel guides explain the conversation window", () => {
  for (const relativePath of [
    "channels/whatsapp.mdx",
    "channels/instagram.mdx",
    "channels/messenger.mdx",
  ]) {
    const source = readGuide(relativePath);
    const windowIndex = source.indexOf("## Conversation window");

    assert.ok(windowIndex >= 0, relativePath);
    assert.ok(windowIndex > source.indexOf("</DocOutcomes>"), relativePath);
    assert.match(source.slice(windowIndex), /conversation window/i);
  }
});

test("Agent Setup and Knowledge Base explain source best practices", () => {
  const agentSetup = readGuide("build-your-agent/agent-setup.mdx");
  const knowledgeBase = readGuide("build-your-agent/knowledge-base.mdx");

  assert.ok(agentSetup.includes("## Best practice"));
  assert.ok(agentSetup.includes("Put durable business facts in the Knowledge Base"));
  assert.ok(knowledgeBase.includes("## Best practice"));
  assert.ok(knowledgeBase.includes("### Convert PDFs to text"));
  assert.ok(
    knowledgeBase.indexOf("## Best practice") < knowledgeBase.indexOf("## Common problems"),
  );
  assert.ok(knowledgeBase.includes("add that text as a source"));
  assert.ok(knowledgeBase.includes("not 100% accurate"));
  assert.ok(knowledgeBase.includes("The model answer has not updated"));
  assert.ok(knowledgeBase.includes("The answer is not fixed"));
  assert.ok(knowledgeBase.includes("subject to summarization by the model"));
});

test("Agent Setup keeps model and trigger guidance focused", () => {
  const source = readGuide("build-your-agent/agent-setup.mdx");

  assert.ok(source.includes("## Models"));
  assert.ok(source.includes("| Model | Advantage | Disadvantage |"));
  assert.ok(source.includes("Ilmu Mini V3.3"));
  assert.ok(source.includes("DeepSeek V4 Flash"));
  assert.ok(source.includes("OpenAI GPT-OSS 120B"));
  assert.ok(source.includes("## Triggers"));
  assert.ok(source.includes("| Automatically |"));
  assert.ok(source.includes("| After assignment |"));
  assert.ok(source.includes(":::tip"));
  assert.ok(source.includes("If you want to send an item reliably"));
  assert.equal(source.includes("## Choose model and style"), false);
  assert.equal(source.includes("## Control AI replies"), false);
  assert.equal(source.includes("## Publish"), false);
  assert.equal(source.includes("DocMediaPlaceholder"), false);
});

test("Workflow branch guidance stays under Build the branch", () => {
  const source = readGuide("automate/send-messages-and-assets.mdx");

  assert.equal(source.includes("## Describe when it should happen"), false);
  assert.ok(source.includes("## Build the branch"));
  assert.ok(source.includes("Write a short Name that is easy to scan on the canvas"));
  assert.ok(source.indexOf("Write a short Name") > source.indexOf("## Build the branch"));
});

test("guides show outcomes without standalone testing sections", () => {
  for (const relativePath of guides.keys()) {
    if (relativePath === "start-here/quick-start.mdx") continue;

    assert.doesNotMatch(
      readGuide(relativePath),
      /^## (?:Test|Verify)|^## Assign and test/m,
      relativePath,
    );
  }
});

test("other channel setup paths stay direct", () => {
  for (const relativePath of [
    "channels/instagram.mdx",
    "channels/messenger.mdx",
    "channels/website-widget.mdx",
  ]) {
    const source = readGuide(relativePath);
    assert.ok(source.includes("Setup is straightforward:"));
    assert.ok((source.match(/<li>/g) ?? []).length <= 3);
  }
});

test("Quick Start uses the approved five-minute introduction", () => {
  assert.match(
    readGuide("start-here/quick-start.mdx"),
    /In about 5 minutes, you will create and test a working agent using Northstar Dental as the example\./,
  );
});
