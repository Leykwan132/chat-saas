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
    "Understand what each Service setting controls",
    "Choose timing, booking fields, sales style, and assignment",
    "Prepare a Service for agent booking",
  ]],
  ["bookings/availability.mdx", [
    "Set weekly hours and the correct timezone",
    "Account for Service duration, buffers, and Calendar conflicts",
    "Keep bookable slots within teammate hours",
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
    "Add a Human escalation action",
    "Describe the condition that should trigger it",
    "See the escalated conversation ready for a teammate",
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
    "Activate reminders for eligible appointments",
  ]],
  ["automate/follow-ups.mdx", [
    "Choose which follow-up conversations to include",
    "Configure timing, attempts, and approved messages",
    "Stop later attempts when customers reply",
  ]],
  ["team/workspace-and-team.mdx", [
    "Invite a teammate to the correct workspace",
    "Assign the smallest suitable role",
    "Review, change, or remove team access",
  ]],
  ["team/roles-and-permissions.mdx", [
    "Understand Owner, Admin, and Member",
    "Know that only the Owner controls role access",
    "Give each teammate the access they need",
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
  assert.ok(source.includes('<div className="docs-image-compact">'));
  assert.ok(source.includes("![Select WhatsApp Business App](https://storage.kilobot.app/docs/docs-coexistence.png)"));
  assert.ok(source.includes("![WhatsApp connection request](https://storage.kilobot.app/docs/docs-connect-new.jpeg)"));
  assert.ok(
    source.indexOf("Coexistence lets you use the same WhatsApp Business number") <
      source.indexOf('<ol className="steps">'),
  );
  assert.ok(source.includes("Choose <strong>WhatsApp Business app</strong> for your business portfolio, then enter your phone number"));
  assert.ok(source.includes("WhatsApp sends a message asking you to connect"));
  assert.ok(source.includes("![Scan the QR code to connect WhatsApp](https://storage.kilobot.app/docs/docs-scan-qr.png)"));
  assert.ok(source.includes("![Add payment for the next connection step](https://storage.kilobot.app/docs/docs-payment.png)"));
  assert.ok(source.includes("## Add payment"));
  assert.ok(source.indexOf("## Add payment") < source.indexOf("## Disconnect"));
  assert.ok(source.includes('<ol className="steps" start={3}>'));
  assert.ok(source.includes('<ol className="steps" start={4}>'));
  assert.equal(source.includes('<ol className="steps" start={5}>'), false);
  assert.equal(source.includes("Grant the requested messaging access"), false);
  assert.equal(source.includes("When Meta offers <strong>coexistence</strong>"), false);
  assert.equal(source.includes("connect-msg.png"), false);
  assert.equal((source.match(/className="docs-image-compact"/g) ?? []).length, 4);
  assert.equal(source.includes("Complete Meta sign-in without closing the authorization window early"), false);
  assert.equal(source.includes("Select the intended business and WhatsApp account"), false);
  assert.ok(source.includes("Scan the QR code from the WhatsApp Business app on your phone"));
  assert.ok(
    source.indexOf("Scan the QR code from the WhatsApp Business app on your phone") <
      source.indexOf("![Scan the QR code to connect WhatsApp]"),
  );
  assert.ok(source.includes("share your own WhatsApp chats with KiloBot"));
  assert.equal(source.includes("connect-whatsapp.mp4"), false);
  assert.equal(source.includes('kind="video"'), false);
  assert.ok(source.includes("Add a payment method if Meta asks for one before continuing the connection"));
  assert.ok(source.includes("Complete the remaining prompts, then return to KiloBot to continue the initial history sync."));
  assert.ok(source.includes("continue the initial history sync"));
  assert.ok(source.includes("## Disconnect"));
  assert.ok(source.includes("clears its authorization"));
  assert.ok(source.includes("It does not delete the WhatsApp Business account"));
  assert.ok(source.includes('className="docs-inline-video docs-inline-video-compact"'));
  assert.equal(source.includes("Open <strong>Channels</strong> and select WhatsApp"), false);
  assert.equal(source.includes("Choose <strong>Disconnect</strong>"), false);
  assert.equal(source.includes("If the number uses coexistence"), false);
  assert.ok(source.includes('src="https://storage.kilobot.app/docs/sample-vid-demo.mp4"'));
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
    assert.ok(source.includes("- **When it opens:**"), relativePath);
    assert.ok(source.includes("- **While it is open:**"), relativePath);
    assert.ok(source.includes("- **After it closes:**"), relativePath);
  }
});

test("reminders and follow-ups keep pricing guidance concise", () => {
  for (const relativePath of [
    "automate/reminders.mdx",
    "automate/follow-ups.mdx",
  ]) {
    const source = readGuide(relativePath);

    assert.equal(source.includes("## Smart follow-up and reminder"), false, relativePath);
    assert.equal(source.includes("Conversation window | Message path | Pricing impact"), false, relativePath);
    assert.equal(source.includes("Avoids an unnecessary template charge"), false, relativePath);
  }

  assert.ok(readGuide("automate/reminders.mdx").includes("/automate/follow-ups"));
});

test("Broadcast explains the smart window alternative and pricing", () => {
  const source = readGuide("engage/broadcast.mdx");

  assert.ok(source.includes("## Smart sending and pricing"));
  assert.ok(source.includes("Broadcasts are for audience-level, business-initiated messages"));
  assert.ok(source.includes("Send a normal one-to-one message or workflow instead of a Broadcast"));
  assert.ok(source.includes("Avoids an unnecessary template charge"));
  assert.ok(source.includes("Send the approved WhatsApp Message Template through Broadcast"));
  assert.ok(source.includes("Meta's current template pricing applies"));
  assert.ok(source.includes("official WhatsApp pricing"));
  assert.ok(source.includes("Meta bills these message charges directly"));
  assert.ok(source.includes("valid payment method in your Meta Business account"));
  assert.ok(source.includes("KiloBot is not where you add that card or top up Meta message credit"));
});

test("Broadcast, Reminders, and Follow-ups explain Meta billing setup", () => {
  for (const [relativePath, featureName] of [
    ["engage/broadcast.mdx", "Broadcast"],
    ["automate/reminders.mdx", "Reminders"],
    ["automate/follow-ups.mdx", "Follow-ups"],
  ]) {
    const source = readGuide(relativePath);

    assert.ok(source.includes(":::important"), relativePath);
    assert.ok(source.includes(`before activating ${featureName}`), relativePath);
    assert.ok(source.includes("Meta bills these message charges directly"), relativePath);
    assert.ok(source.includes("KiloBot is not where you add that card or top up Meta message credit"), relativePath);
    assert.ok(source.includes("## Pricing"), relativePath);
    assert.ok(source.includes("official WhatsApp pricing"), relativePath);
    if (relativePath !== "automate/reminders.mdx") {
      assert.ok(source.includes("![Add a payment method in Meta](https://storage.kilobot.app/docs/docs-payment.png)"), relativePath);
    }
  }
});

test("Roles and permissions stays focused on three roles and owner control", () => {
  const source = readGuide("team/roles-and-permissions.mdx");

  assert.ok(source.includes("## Three roles"));
  assert.ok(source.includes("| **Owner** |"));
  assert.ok(source.includes("| **Admin** |"));
  assert.ok(source.includes("| **Member** |"));
  assert.ok(source.includes("Only the **Owner** can set what each role can see and manage"));
  assert.ok(source.includes("## Give access"));
  assert.ok(source.includes('kind="image"'));
  assert.ok(source.includes("role-permissions.png"));
  assert.equal(source.includes("## Start with responsibility"), false);
  assert.equal(source.includes('kind="video"'), false);
  assert.equal(source.includes("Northstar receptionist"), false);
});

test("Availability omits slot troubleshooting", () => {
  const source = readGuide("bookings/availability.mdx");

  assert.ok(source.includes("![Configure teammate Availability](https://storage.kilobot.app/docs/docs-availability.png)"));
  assert.equal(source.includes("## Understand slot evaluation"), false);
  assert.equal(source.includes("continuous valid interval that includes both"), false);
  assert.equal(source.includes("## Troubleshoot a missing slot"), false);
  assert.equal(source.includes("Diagnose a missing booking slot"), false);
});

test("Services and Availability explain auto-booking prerequisites", () => {
  const services = readGuide("bookings/services.mdx");
  const availability = readGuide("bookings/availability.mdx");

  assert.ok(services.includes('<span className="docs-required-tag">Required for auto booking</span>'));
  assert.ok(availability.includes('<span className="docs-required-tag">Required for auto booking</span>'));
  assert.ok(services.includes("## Service settings"));
  assert.ok(services.includes("| **Booking fields** |"));
  assert.equal(services.includes("Open **Services** and choose **Add a service**"), false);
  assert.ok(services.includes(":::important"));
  assert.ok(services.includes("which Service to book"));
  assert.ok(availability.includes(":::important"));
  assert.ok(availability.includes("eligible teammate with working hours and an open Calendar slot"));
});

test("Agent Setup and Knowledge Base explain source best practices", () => {
  const agentSetup = readGuide("build-your-agent/agent-setup.mdx");
  const knowledgeBase = readGuide("build-your-agent/knowledge-base.mdx");

  assert.ok(agentSetup.includes("## Best practice"));
  assert.ok(agentSetup.includes("Put durable business facts in the Knowledge Base"));
  assert.ok(agentSetup.indexOf("## Best practice") < agentSetup.indexOf("## Common problems"));
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
  assert.ok(knowledgeBase.includes("## Limits"));
  assert.ok(knowledgeBase.includes("| Plan | Knowledge Base limit | Supported sources |"));
  assert.ok(knowledgeBase.includes("| Free | 400 KB per agent | Web, Files, Text, Q&A |"));
  assert.ok(knowledgeBase.includes("| Starter | 5 MB per agent | Web, Files, Text, Q&A |"));
  assert.ok(knowledgeBase.includes("| Growth | 20 MB per agent | Web, Files, Text, Q&A |"));
  assert.ok(knowledgeBase.includes("| Business | 40 MB per agent | Web, Files, Text, Q&A |"));
  assert.ok(knowledgeBase.includes("| Enterprise | Custom per agent | Custom |"));
  assert.ok(knowledgeBase.indexOf("## Best practice") < knowledgeBase.indexOf("## Limits"));
  assert.ok(knowledgeBase.indexOf("## Limits") < knowledgeBase.indexOf("## Common problems"));
});

test("Agent Setup keeps model and trigger guidance focused", () => {
  const source = readGuide("build-your-agent/agent-setup.mdx");

  assert.ok(source.includes("## Three core concepts"));
  assert.ok(source.includes("| Concept | Use case | Example |"));
  assert.ok(source.includes("## Supported models"));
  assert.ok(source.includes("| Model | Recommended language | Advantage | Disadvantage |"));
  assert.ok(source.includes("Ilmu Mini V3.3"));
  assert.ok(source.includes("| Malay / Bahasa Melayu |"));
  assert.ok(source.includes("DeepSeek V4 Flash"));
  assert.ok(source.includes("| Chinese / Mandarin |"));
  assert.ok(source.includes("Google Gemini 3.1 Flash Lite"));
  assert.ok(source.includes("| English |"));
  assert.ok(source.includes("OpenAI GPT-OSS 120B"));
  assert.ok(source.includes("Xiaomi MiMo V2.5"));
  assert.ok(source.includes("Amazon Nova Micro"));
  assert.ok(source.includes("## Triggers"));
  assert.ok(source.includes("| Automatically |"));
  assert.ok(source.includes("| Manual |"));
  assert.ok(source.includes(":::tip"));
  assert.ok(source.includes("If you want to send an item reliably"));
  assert.equal(source.includes("## Choose model and style"), false);
  assert.equal(source.includes("## Control AI replies"), false);
  assert.equal(source.includes("## Publish"), false);
  assert.equal(source.includes("DocMediaPlaceholder"), false);
});

test("Send messages guide uses two setup steps", () => {
  const source = readGuide("automate/send-messages-and-assets.mdx");

  assert.ok(source.includes("## 1. Create the action"));
  assert.ok(source.includes("## 2. Describe the condition"));
  assert.ok(source.includes("Write a short Name that is easy to scan on the canvas"));
  assert.ok(source.indexOf("## 1. Create the action") < source.indexOf("## 2. Describe the condition"));
  assert.ok(source.includes("![Create the send message action](https://storage.kilobot.app/docs/docs-send-msg.png)"));
  assert.equal(source.slice(source.indexOf("## 2. Describe the condition")).includes("DocMediaPlaceholder"), false);
  assert.equal(source.includes("send-message-steps.png"), false);
  assert.equal(source.includes("className=\"steps\""), false);
});

test("Human in the loop shows the escalated Inbox state", () => {
  const source = readGuide("automate/human-in-the-loop.mdx");

  assert.ok(source.includes("## 1. Add human escalation"));
  assert.ok(source.includes("## 2. Describe the condition"));
  assert.ok(source.indexOf("## 1. Add human escalation") < source.indexOf("## 2. Describe the condition"));
  assert.equal(source.includes("className=\"steps\""), false);
  assert.equal(source.includes("## Close a completed conversation"), false);
  assert.ok(source.includes("What a teammate sees after escalation"));
  assert.ok(source.includes("![What a teammate sees after escalation](https://storage.kilobot.app/docs/docs-human.png)"));
  assert.equal(source.includes("human-escalation-inbox.png"), false);
  assert.equal(source.includes("DocMediaPlaceholder"), false);
  assert.equal(source.includes("verify-human-handoff.mp4"), false);
});

test("Automate bookings uses two essential workflow steps", () => {
  const source = readGuide("automate/automate-bookings.mdx");

  assert.ok(source.includes("## 1. Add the booking action"));
  assert.ok(source.includes("## 2. Describe the booking condition"));
  assert.ok(source.includes("From the Workflows page"));
  assert.ok(source.includes("Book appointment"));
  assert.ok(source.includes("![Configure the booking action](https://storage.kilobot.app/docs/docs-booking.png)"));
  assert.equal(source.includes("book-appointment-action.png"), false);
  assert.equal(source.slice(source.indexOf("## 2. Describe the booking condition")).includes("DocMediaPlaceholder"), false);
  assert.equal(source.includes("className=\"steps\""), false);
  assert.equal(source.includes("Workflows → Direct Message"), false);
  assert.equal(source.includes("Save the Workflow"), false);
  assert.equal(source.includes("verify-automated-booking.mp4"), false);
});

test("Reminders omits History monitoring and its video brief", () => {
  const source = readGuide("automate/reminders.mdx");

  assert.equal(source.includes("## Monitor History"), false);
  assert.equal(source.includes("Reminder History"), false);
  assert.equal(source.includes("Show appointment Reminders"), false);
  assert.equal(source.includes("reminders-verify.mp4"), false);
  assert.ok(source.includes("Activate reminders for eligible appointments"));
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
    if (relativePath !== "channels/website-widget.mdx") {
      assert.ok(source.includes(":::important"), relativePath);
      assert.ok(source.includes("Meta Business Suite"), relativePath);
      assert.equal(source.includes("DocMediaPlaceholder"), false, relativePath);
      assert.equal(source.includes("assetPath"), false, relativePath);
    }
  }
});

test("Quick Start uses the approved five-minute introduction", () => {
  assert.match(
    readGuide("start-here/quick-start.mdx"),
    /In about 5 minutes, you will create and test a working agent using Northstar Dental as the example\./,
  );
});
