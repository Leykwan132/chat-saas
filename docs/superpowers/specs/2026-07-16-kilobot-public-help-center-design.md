# KiloBot Public Help Center Design

## Outcome

Replace the stock Docusaurus starter in `kilobot-docs` with a public, searchable help center at `https://docs.kilobot.app`. The site must look and read like KiloBot, explain the complete product model, and give new and existing users task-oriented paths through setup, messaging, bookings, teamwork, and reporting.

## Selected approach

Use a hybrid information architecture:

- A short Launch Guide gives new workspace owners the fastest safe path to a working agent.
- Concept pages explain how workspaces, agents, conversations, contacts, workflows, channels, services, availability, and bookings relate.
- Feature guides mirror the product navigation so existing users can find the page that matches the screen they are using.

This is preferred over a pure feature mirror because it teaches prerequisites and outcomes, and over a tutorial-only site because returning users need direct reference pages.

## Audience and scope

The first release serves workspace owners, administrators, managers, and day-to-day teammates. It covers:

- Workspace and agent setup
- Agent behavior and testing
- Knowledge Base
- Workflow message handling, conditions, actions, reminders, and follow-ups
- Website, WhatsApp, Instagram, and Messenger channels
- Services, team availability, Calendar, and booking lifecycle
- Inbox, Contacts, Quick Replies, Message Templates, and Broadcast
- Lead Assignment, Analytics, teams, roles, permissions, usage, and billing
- Troubleshooting and support

External developer APIs and integration SDK reference are not part of this release.

## Navigation

The documentation sidebar uses these top-level groups:

1. Start here
2. Build your AI agent
3. Automate conversations
4. Connect channels
5. Manage bookings
6. Engage customers
7. Manage your team
8. Measure and improve
9. Troubleshooting and support

The home page leads with a large search entry, followed by the Launch Guide and task cards for the major product areas. Every guide has a concise purpose statement, prerequisites where needed, numbered procedures, expected outcomes, and related links.

## Visual system

The docs reuse KiloBot's current design language:

- Geist-style sans typography and Gilda Display for the KiloBot wordmark
- Neutral white and near-black surfaces with semantic muted borders
- Compact 14–15px navigation, restrained radii, no decorative shadows
- Black primary actions in light mode and white primary actions in dark mode
- KiloBot's round monochrome icon and wordmark
- Subtle grid texture and small multicolor launch accent only on the home page
- Full light and dark mode support

The docs retain Docusaurus accessibility, responsive sidebar, table of contents, keyboard navigation, focus indicators, and code highlighting.

## Search and public delivery

Use `@cmfcmf/docusaurus-search-local` to generate a self-hosted search index during the Docusaurus build. Search must index docs and the custom home page without requiring a third-party search account.

Configure the site URL as `https://docs.kilobot.app`, disable the starter blog, add canonical metadata, generate sitemap/robots output through Docusaurus, and fail builds on broken links.

## Product entry points

Add a Docs link to KiloBot's public desktop and mobile navigation, Product footer, and authenticated support menu. All links open `https://docs.kilobot.app` as a normal same-tab destination. The help center provides a `Back to KiloBot` action to `https://kilobot.app` and a `Go to dashboard` action to `https://kilobot.app/workspace`.

## Content rules

- Use the exact labels visible in the current product.
- Describe only behavior verified in the repository.
- Explain dependencies explicitly, such as Services plus Availability before AI booking.
- Use admonitions for prerequisites, costs, approval requirements, and irreversible effects.
- Avoid internal architecture, implementation names, and operational error details.
- Avoid screenshots in the first release so documentation does not become stale immediately; leave the structure ready for task-specific screenshots later.

## Verification

Automated structural tests verify the required docs tree, front matter, sidebar groups, production URLs, search plugin, and KiloBot entry links. Verification also includes the docs test command, TypeScript check, production Docusaurus build, the relevant main-app tests, targeted lint, broken-link enforcement, line-count checks, and `git diff --check` under Node 22.
