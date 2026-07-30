# Simplified Docs Onboarding Design

## Goal

Make Getting started feel short and focused. Quick Start should help a new user create and validate an agent without requiring channel deployment, bookings, or workflow setup.

## Quick Start

Quick Start contains three required steps:

1. Create the agent.
2. Add knowledge.
3. Test the agent.

The page removes channel installation, publishing, Inbox verification, and other advanced setup from the required sequence. Its completion criteria cover only a created agent with trusted knowledge that returns a grounded test answer.

## Next steps

After the three required steps, show exactly three optional choices:

1. **Deploy to channels (WhatsApp, IG, Messenger)** links to the Channels overview.
2. **Set up workflows** links to the Workflow overview.
3. **Set up bookings** links to Services.

These choices are visually separate from the required steps and are not numbered as part of Quick Start.

## Navigation labels

The Workflows sidebar uses concise child labels:

- **Overview**
- **Build and test**

The page titles may remain descriptive, but navigation should not repeat the parent category name.

## Right outline spacing

Increase the horizontal separation between the main article and the desktop page outline. The change applies only to the desktop outline column and does not reduce article width or alter the mobile collapsible outline.

## Verification

- Navigation tests confirm the concise Workflow labels.
- Quick Start tests confirm exactly three required sections and three next-step choices.
- Existing docs tests, TypeScript, and production build pass.
- Desktop visual review confirms the right outline has noticeably more left spacing.
- Mobile visual review confirms the Quick Start and next-step choices remain readable.
