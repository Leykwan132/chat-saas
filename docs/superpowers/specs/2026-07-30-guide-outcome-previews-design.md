# Guide Outcome Previews Design

## Goal

Give readers a clear preview of what they will accomplish before they begin each KiloBot guide. The structure follows the opening of [React Quick Start](https://react.dev/learn): a short introduction followed by a simple heading and bullet list before the first instructional section.

## Scope

Add the outcome preview to all 25 instructional MDX guides.

Exclude:

- `start-here/welcome.mdx`, because it is the documentation landing page
- `start-here/launch-guide.mdx`, because it only redirects
- `releases/changelog.mdx`, because it is release history rather than a guide

## Page Structure

Every instructional guide uses this order:

1. Page title
2. Verification date when present
3. One short introductory paragraph
4. `### By the end, you will`
5. Three to five outcome bullets
6. Prerequisites when present
7. The first instructional section

The outcome preview is plain Markdown. It has no component wrapper, border, background, icon, or decorative treatment.

Quick Start replaces its current process-led introduction with:

> In about 5 minutes, you will create and test a working agent using Northstar Dental as the example.

## Writing Rules

Each outcome bullet:

- Starts with a clear action verb
- Describes one result the reader can recognize
- Uses 14 words or fewer
- Avoids internal implementation terms
- Uses a product label only when it helps locate a screen
- Avoids combining separate outcomes with “and” when two bullets are clearer

Preferred verbs include Create, Add, Test, Choose, Connect, Configure, Verify, Review, Assign, Diagnose, and Report.

## Exact Outcomes

### Getting started

#### Quick Start

- Create a working agent
- Add one trusted answer
- Test that the agent uses the approved answer

#### Workspaces and agents

- Choose when to create a workspace, agent, or invitation
- Create and switch between agents
- Keep each agent’s settings and customer experience separate

### Agent

#### Agent Setup

- Decide where instructions, facts, and actions belong
- Write clear behavior, tone, boundaries, and escalation rules
- Test changes before publishing the agent

#### Knowledge Base

- Choose the right source type
- Add, replace, and remove trusted information
- Test that the agent answers from approved facts

### Channels

#### Channels overview

- Choose the right channel for your customers
- Understand each connection status
- Connect a channel and verify a real conversation

#### Website widget

- Configure the Website widget
- Install it on your website
- Verify that visitor messages reach Inbox

#### WhatsApp

- Complete the Meta connection flow
- Confirm synchronization finishes successfully
- Verify incoming messages and teammate replies

#### Instagram

- Connect the correct professional Instagram account
- Verify a direct message reaches Inbox
- Send a teammate reply from KiloBot

#### Messenger

- Connect the correct Facebook Page
- Verify a Page message reaches Inbox
- Send a teammate reply from KiloBot

### Conversations

#### Inbox

- Find conversations and understand the Inbox layout
- Manage AI and teammate ownership
- Reply, update customer context, and review completed actions

#### Contacts

- Confirm a customer’s identity and channel source
- Update tags, lead temperature, and customer details
- Review linked conversations and bookings

### Bookings

#### Services

- Create a customer-facing Service
- Configure timing, booking fields, and assignment
- Test that customers can book an eligible teammate

#### Availability

- Set weekly hours and the correct timezone
- Account for Service duration, buffers, and Calendar conflicts
- Diagnose why a booking slot is unavailable

#### Calendar

- Create a customer booking manually
- Check availability and prevent scheduling conflicts
- Update appointment status and review booking history

### Workflows

#### Workflow overview

- Choose the correct Workflow view
- Understand how conditions trigger actions
- Decide when to use Reminders or Follow-ups

#### Build and test a Workflow

- Write a precise customer-intent condition
- Choose safe actions for the matched request
- Test matches and near misses before publishing

### Outreach

#### Message Templates

- Create a complete WhatsApp Message Template
- Add examples and media where required
- Submit the template and confirm approval before use

#### Broadcast

- Choose an approved template and audience
- Review message variables, recipients, and estimated charges
- Send safely and inspect delivery history

#### Reminders

- Choose which appointments should receive reminders
- Configure approved messages and send timing
- Verify scheduled and completed sends in History

#### Follow-ups

- Choose the follow-up audience and activation scope
- Configure timing, attempts, and approved messages
- Verify replies stop later attempts

### Teams

#### Workspace and team

- Invite a teammate to the correct workspace
- Assign the smallest suitable role
- Review, change, or remove team access

#### Roles and permissions

- Match permissions to a teammate’s responsibilities
- Assign the smallest suitable access
- Test what the teammate can view and manage

#### Lead Assignment

- Choose a conversation assignment strategy
- Configure teammate eligibility and booking ownership
- Verify new work reaches the intended teammate

### Help and support

#### Troubleshooting

- Diagnose common agent, channel, booking, and Outreach problems
- Check workspace, agent, permissions, and connection state
- Gather useful evidence when support is needed

#### Contact support

- Choose the right support route
- Include the details needed to investigate
- Remove sensitive customer data before sharing evidence

## Implementation Boundary

Only the 25 instructional MDX files and their content contract change. No shared React component or CSS module is introduced.

The right-side page outline may include “By the end, you will” because the preview uses a real Markdown heading, matching the document hierarchy.

## Verification

Add a docs content contract that:

- Enumerates the 25 expected guide files explicitly
- Confirms each file contains exactly one `### By the end, you will`
- Confirms the heading appears after the introduction and before prerequisites or the first `##` section
- Confirms each outcome section contains three to five Markdown bullets
- Confirms excluded pages do not contain the outcome heading
- Confirms Quick Start contains the approved five-minute introduction and exact three outcomes

Then verify:

- All docs tests pass under Node 22
- Rendered guide-component tests pass
- TypeScript passes
- The Docusaurus production build succeeds
- Quick Start and representative Agent, Channel, Booking, Workflow, Outreach, Team, and Help pages show the preview near the top
- Desktop light and dark themes remain readable
- A 390px viewport has no horizontal overflow
- `git diff --check` passes

## Release Status

This is an unreleased documentation content improvement. Record it in `CONTINUITY.md`; do not add it to the public changelog until production availability is confirmed.
