# KiloBot Guide Redesign

**Date:** 2026-07-28

**Status:** Approved design

## Purpose

Transform the KiloBot help center from a concise product map into a practical customer guide that helps a new user complete real work confidently.

The redesigned guide must:

- Implement every approved P0 and P1 content improvement.
- Document current product behavior and the new behavior already implemented in the active branch.
- Use visible media placeholders until final screenshots and videos are supplied.
- Keep the help center concise enough to scan while adding examples, prerequisites, success checks, and troubleshooting.
- Preserve stable public routes where that does not conflict with the new structure.

## Audience

The guide serves three customer groups:

- Workspace owners setting up KiloBot for the first time.
- Agent builders configuring knowledge, behavior, bookings, channels, and automation.
- Daily operators managing customer conversations and appointments.

The Welcome page prioritizes the first group while allowing experienced users to browse by topic.

## Information Architecture

The public sidebar uses this exact order.

### Getting started

- Welcome
- Quick Start

### Agent

- Agent Setup
- Knowledge Base

### Channels

- Channels overview
- Website widget
- WhatsApp
- Instagram
- Messenger
- Conversations
  - Inbox
  - Contacts

### Bookings

- Services
- Availability
- Calendar

### Workflows

- Workflow overview
- Build and test a Workflow

### Outreach

- Message Templates
- Broadcast
- Reminders
- Follow-ups

### Teams

- Workspaces and agents
- Workspace and team
- Roles and permissions
- Lead Assignment

### Releases

- Changelog

### Help and support

- Troubleshooting
- Contact support

## Hidden Content

The following topics are excluded from the public guide for this release:

- Avatar
- Quick Replies
- Overview and Analytics
- Usage and billing

Existing Quick Replies, Overview and Analytics, and Usage and billing source is preserved outside the Docusaurus docs input so it can be restored later. These pages must not appear in the sidebar, Welcome page, search index, sitemap, or pagination.

The release changelog may continue to mention already-published product changes. Hiding a guide topic must not rewrite historical release notes.

## Welcome Page

The Welcome page gives the user two choices only:

1. **Quick Start** — the fastest path to a working customer-facing agent.
2. **Browse the guide** — continue into the topic-based sidebar and guide index.

The page must not repeat a large grid of product features. It should explain in one short paragraph that Quick Start uses the Website channel because it avoids external provider authorization and synchronization.

## Quick Start

The existing Launch Guide becomes Quick Start while preserving a redirect from `/start-here/launch-guide`.

Quick Start uses one fictional example throughout:

- Business: Northstar Dental
- Agent: Northstar Booking Assistant
- Goal: Answer opening-hours questions and receive a real Website message.

The required journey is:

1. Create the agent.
2. Add one Knowledge Base Q&A entry for opening hours.
3. Review the starter system prompt.
4. Test one known question, one paraphrase, and one unknown question.
5. Publish the agent.
6. Create and install the Website widget.
7. Send a message from a private browser window.
8. Confirm the message appears in Inbox and send a teammate reply.

Bookings, Workflows, Meta channels, Outreach, and Teams appear as optional next steps, not Quick Start requirements.

Each Quick Start milestone includes:

- An estimated completion time.
- Exact product navigation.
- Exact example input.
- A visible image or video placeholder where media is required.
- A success check.
- A focused recovery link when the expected result does not appear.

## Standard Guide Pattern

Procedural pages use the following pattern where applicable:

1. Outcome-focused introduction.
2. Prerequisites.
3. Exact numbered procedure.
4. Concrete example.
5. Media or visible media placeholder.
6. “You’re done when” success check.
7. Common problems.
8. Related next step.

Conceptual or support pages may omit irrelevant sections, but must retain concrete examples and clear next actions.

### Prerequisites

Prerequisites state only confirmed requirements:

- Required workspace or agent context.
- Required permission.
- Required channel or provider account.
- Required earlier KiloBot configuration.
- Plan or feature availability when confirmed.
- External review or synchronization dependency.

Unreleased features implemented in the active branch may be documented. They must be described as the intended current experience without claiming a production release date.

### Exact instructions

Instructions use visible product labels and navigation paths. Phrases such as “choose the create action” or “configure the available option” are not acceptable when the UI has a stable label.

Every save-like action explains what happens next:

- Save updates configuration.
- Publish makes an agent draft active.
- Submit sends a WhatsApp template to Meta for review.
- Connect begins provider authorization or activates a channel.
- Confirm persists a selection made inside a dialog.
- Activate starts scheduling eligible automation.

### Success checks

Every multi-step procedure ends with an observable result. Success checks use the heading `You’re done when`.

Examples include:

- A channel card shows Connected.
- A test Website message appears in the correct agent’s Inbox.
- A Knowledge Base source shows a completed processing state.
- A Workflow branch matches the intended test and rejects a near-miss.
- A booking appears in Calendar with the correct customer, Service, assignee, and time.

### Examples

Examples use Northstar Dental where a shared scenario improves continuity. Other examples may be used when the dental scenario would feel forced.

Required examples include:

- A complete system prompt.
- A Knowledge Base Q&A source.
- Weak and strong Workflow conditions.
- Each Workflow action type.
- A Service with duration, buffer, booking fields, and assignment.
- A WhatsApp template with variables and example values.
- A test Broadcast audience.
- Reminder and Follow-up schedules.
- Hot, Warm, and Cold lead definitions.
- Role and Lead Assignment decisions.

## Media Placeholders

Missing media is represented by a shared visible component rather than plain prose or an empty image.

### Component behavior

The component supports `image` and `video` kinds and displays:

- Media type.
- Descriptive title.
- Exact screen or journey to capture.
- Required UI state.
- Suggested crop or sequence.
- Numbered callouts for images.
- Target duration for videos.
- Sensitive information to hide.
- Intended final asset path.

The placeholder must:

- Look intentionally unfinished without appearing broken.
- Remain readable in light and dark themes.
- Be accessible to screen readers.
- Use a dashed neutral border and a clear `Media needed` label.
- Never load a missing asset or render a broken media control.

### Replacement workflow

Each placeholder declares the final asset path. Replacing a placeholder requires:

1. Add the supplied media at the declared path.
2. Replace the placeholder with the final image or video component.
3. Preserve its descriptive caption and accessibility text.
4. Verify the page in light and dark themes.

### Image standards

- Use a consistent desktop viewport and demo workspace.
- Crop to the relevant task instead of showing an unreadable full screen.
- Use one to four numbered callouts.
- Provide outcome-focused alt text and a caption.
- Hide customer names, phone numbers, tokens, IDs, provider business details, and unrelated browser content.

### Video standards

- Keep most videos between 45 and 90 seconds.
- Allow two to three minutes only for the complete Quick Start.
- Show the completed outcome in the first five seconds.
- Include captions.
- Do not rely on narration to convey required information.
- Keep written steps below the video.
- Supply a poster image and a last-verified date.
- Do not use animated GIFs for procedural guidance.

## Page Requirements

### Agent Setup

Add:

- A complete Northstar Dental system prompt.
- Weak and improved prompt examples.
- Prompt versus Knowledge Base versus Workflow guidance.
- Model and style control explanations.
- Reply-mode prerequisites and consequences.
- A repeatable testing checklist.
- Publish behavior and success checks.
- Agent Setup and Test Agent media placeholders.

### Knowledge Base

Keep one Knowledge Base guide under Agent.

Add:

- Supported source types and confirmed limits.
- Source selection guidance.
- Text and Q&A examples.
- Processing states.
- Source refresh, replacement, and deletion behavior.
- Duplicate and conflicting-source guidance.
- Storage guidance without linking to the hidden Usage guide.
- A test matrix for known, paraphrased, missing, and conflicting questions.
- Source picker, processing state, and storage media placeholders.

### Channels

The overview explains supported channels, plan limits, provider dependencies, connection states, and verification.

The current channel-card experience uses persistent platform cards with a `Connect` action. It must not instruct users to choose `Connect another channel`.

Dedicated pages cover:

- Website widget creation, appearance, snippet installation, private-window verification, and installation mistakes.
- WhatsApp administrator requirements, embedded signup, mobile coexistence, synchronization, connection states, testing, and reconnection consequences.
- Instagram professional-account requirements, provider authorization, connection verification, and common provider blockers.
- Messenger Facebook Page requirements, provider authorization, connection verification, and common provider blockers.

Each channel page includes an image placeholder and a platform-specific connection video placeholder.

### Inbox

Add:

- Annotated layout orientation.
- Filter explanations.
- AI-to-human handoff and AI-resume procedure.
- Assignment, tags, lead temperature, attachments, delivery state, and booking context.
- Action History event explanations.
- A daily operator checklist.
- A handoff video placeholder.

### Contacts

Add:

- Channel identity explanation.
- Hot, Warm, and Cold examples.
- How tags, assignment, and lead temperature affect Follow-ups and reporting.
- Duplicate-contact and multiple-channel-identity limitations.
- Contact detail and lead-temperature image placeholders.

### Bookings

Use one connected Northstar Dental consultation example across Services, Availability, Calendar, and the Book appointment Workflow action.

Add:

- Field-level Service guidance.
- Assignment-strategy comparison.
- Effects of Service activation and later edits.
- Duration, buffer, timezone, Availability, assignment, and conflict resolution.
- A missing-slot decision tree.
- Manual booking validation and status effects.
- A complete booking-journey video placeholder.
- Focused image placeholders on all three pages.

### Workflows

Keep Workflows as its own top-level section after Bookings.

The overview explains Message handling, Reminders, and Follow-ups while directing outreach-specific configuration to Outreach.

The build-and-test page includes:

- A complete Northstar brochure-request example.
- Weak and strong condition examples.
- Condition overlap and near-miss guidance.
- Examples for Send message, Send Photo/Video, Send Files, Book appointment, Human escalation, and Close conversation.
- Template versus blank-start guidance.
- Save, discard, arrange, and testing behavior.
- A Workflow creation video placeholder.
- Graph and inspector image placeholders.

### Outreach

Message Templates adds:

- Supported content structure.
- Positional and named variable examples.
- Status lifecycle.
- Category changes and resubmission.
- Cost and policy boundaries.
- Editor, preview, and status media placeholders.

Broadcast adds:

- Eligibility and exclusion guidance.
- A controlled test-audience procedure.
- Preview, parameters, cost, scheduling, cancellation, recipient status, and delivery-failure guidance.
- Audience, cost, confirmation, and History media placeholders.
- A template-to-test-Broadcast video placeholder.

Reminders and Follow-ups add:

- Exact activation-scope behavior.
- Safe schedule examples.
- Scheduling, cancellation, skip, failure, and stop conditions.
- History field and status explanations.
- Configuration and History image placeholders.
- Separate short video placeholders.

Where the hidden Usage and billing guide was previously linked, the relevant page explains that KiloBot credits and Meta provider charges are separate in a concise note.

### Teams

Workspaces and agents moves into Teams.

Add:

- Workspace-to-agent diagram placeholder.
- Invitation and membership lifecycle.
- Responsibility-to-role matrix.
- Permission testing.
- Manual, balanced, and round-robin Lead Assignment comparison.
- Service assignment interaction.
- Reassignment and review guidance.
- Roles and Lead Assignment media placeholders.

### Troubleshooting

Expand symptom-based troubleshooting for:

- Incorrect or incomplete answers.
- Missing messages.
- Missing AI replies.
- Failed channel connections.
- Missing booking slots.
- Unavailable WhatsApp templates.
- Broadcast exclusions and failures.
- Reminder and Follow-up outcomes.
- Missing pages or actions.
- Unsaved changes.

Each troubleshooting path identifies the expected state, the smallest useful checks, and when to contact support.

### Contact support

Retain the existing support channels and security warning. Improve the bug-report checklist so it captures:

- Workspace and agent.
- Page and task.
- Approximate timestamp and timezone.
- Reproduction steps.
- Expected and actual results.
- Browser and device.
- Redacted screenshot or short recording.

## Route Strategy

Preserve existing routes for existing public topics.

Add routes for:

- `/start-here/quick-start`
- `/channels/website-widget`
- `/channels/whatsapp`
- `/channels/instagram`
- `/channels/messenger`
- `/automate/build-and-test`

Redirect `/start-here/launch-guide` to `/start-here/quick-start`.

Existing Inbox and Contacts routes remain unchanged even though they appear under the nested Conversations sidebar label.

## Components

Create small reusable components with no code file over 300 lines:

- `DocPrerequisites` for compact requirement lists.
- `DocSuccess` for observable completion checks.
- `DocExample` for worked examples.
- `DocMediaPlaceholder` for visible image and video briefs.

Each component has its own focused styles where needed. Components must use self-explanatory names and avoid code comments.

## Copy Rules

- Use `KiloBot` consistently in customer-facing prose.
- Use exact product labels and title case from the UI.
- Lead with the user outcome.
- Prefer short paragraphs and numbered procedures.
- Explain provider terminology the first time it appears.
- Do not promise approval times controlled by Meta.
- Do not claim unreleased work has shipped.
- Do not expose implementation names, feature-flag keys, internal models, deployment names, or internal cleanup mechanisms.
- Do not link to hidden guide topics.

## Verification

Automated verification covers:

- Exact sidebar order and nesting.
- Getting started contains only Welcome and Quick Start.
- Hidden topics are absent from docs input, sidebar, Welcome, pagination, and search.
- Existing routes remain stable and the Launch Guide redirect exists.
- Every procedural guide contains prerequisites or an explicit reason they are unnecessary.
- Every multi-step guide contains a `You’re done when` success check.
- Media placeholders contain kind, title, capture brief, and final asset path.
- No broken internal links.
- No KiloBot code file exceeds 300 lines.

Run with Node 22:

- Documentation tests.
- Docusaurus typecheck.
- Docusaurus production build.

Perform rendered checks for:

- Desktop light theme.
- Desktop dark theme.
- Mobile navigation.
- Media placeholder layout.
- Nested Conversations sidebar behavior.
- Search exclusion for hidden content.

## Release Handling

This redesign is not added to the public changelog until its production availability date is confirmed.

Until release is confirmed, record implementation status in `CONTINUITY.md`. On confirmed production release, add one concise Docs improvement entry under the correct date in `kilobot-docs/docs/releases/changelog.mdx`.
