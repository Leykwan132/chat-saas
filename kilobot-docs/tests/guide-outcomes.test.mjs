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
  const verifiedIndex = source.indexOf("<DocVerified date=");
  const prerequisitesIndex = source.indexOf("<DocPrerequisites");
  const firstSectionIndex = source.indexOf("\n## ");
  const nextContentIndex =
    prerequisitesIndex >= 0 ? prerequisitesIndex : firstSectionIndex;

  assert.equal(headingMatches.length, 1, relativePath);
  assert.deepEqual(outcomes, expectedOutcomes, relativePath);
  assert.ok(headingIndex > source.indexOf("\n# "), relativePath);
  if (verifiedIndex >= 0) {
    assert.ok(verifiedIndex < headingIndex, `${relativePath}: verification date`);
  }
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
