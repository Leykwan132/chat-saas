# Workflow Docs Task Structure Design

Date: 2026-07-30

## Goal

Replace the generic Workflow documentation with a small set of task-based guides that collectively cover every Workflow capability available to KiloBot users.

## Navigation

The **Workflows** category contains these guides in this order:

1. **Send messages and assets**
2. **Human in the loop**
3. **Automate bookings**
4. **Reminders**
5. **Follow-ups**

The existing **Overview** and **Build and test** navigation items are removed. Reminders and Follow-ups move from Outreach to Workflows because they are first-class Workflow views in the product.

The existing Outreach category becomes **Broadcast** and contains:

1. **Create a broadcast**
2. **Message templates**

## Guide Responsibilities

### Send messages and assets

Explain how to define a precise customer-intent condition and send:

- An exact text message
- A photo or video
- A file or document

The guide demonstrates testing a positive match, a paraphrase, and a near-miss. It also explains saving and discarding draft changes where those actions are needed.

### Human in the loop

Explain when to pause AI replies and hand a conversation to a teammate. Include:

- Customer-requested human support
- Low-confidence or unsafe situations
- A clear escalation condition
- Verification that AI replies pause after escalation
- Closing a clearly completed conversation as the alternative terminal action

### Automate bookings

Explain how a Workflow starts appointment booking when a customer expresses booking intent. The guide:

- Selects an active service
- Uses a precise booking condition
- Tests a booking request and a near-miss
- Links to Services, Availability, and Calendar under Bookings for prerequisite configuration

It does not repeat the full Bookings setup guides.

### Reminders

Retain the existing guide and keep these required topics:

- Future-only versus current-and-future activation scope
- Reminder count and timing
- Approved WhatsApp Message Template selection
- Activation and Summary review
- History statuses and controlled verification

### Follow-ups

Retain the existing guide and keep these required topics:

- Eligible audience
- Future-only versus current-and-future activation scope
- Initial no-reply delay
- Attempt count and repeat interval
- Same versus different approved messages
- Activation, reply cancellation, History, and controlled verification

## Shared Guidance

Conditions, testing, draft safety, and verification are supporting concepts rather than sidebar destinations. Each task guide explains them in context:

1. When the action should happen
2. How to configure it
3. How to test matches and near-misses
4. How to save or activate it
5. How to verify the outcome

Workflow guides link to Message Templates when approved WhatsApp messages are required. Message Templates remains under Broadcast rather than being duplicated under Workflows.

## Media

Every instructional image uses the shared borderless, left-aligned, expandable renderer and has a visible caption directly below it. Existing missing image and video assets remain explicit production placeholders with precise capture instructions.

## Quick Start

The Quick Start ending keeps one Workflow next-step link. Its wording is:

> Set up workflows to send assets, involve your team, automate bookings, and follow up with customers.

The link opens **Send messages and assets**, the first Workflow guide.

## Validation

- Sidebar tests confirm the new Workflow and Broadcast labels and ordering.
- Recursive guide tests confirm every public guide retains a clear outcome preview.
- Link validation confirms removed Workflow routes are not used by the sidebar or Quick Start.
- Docs component tests, TypeScript, and the production build pass on Node 22.

