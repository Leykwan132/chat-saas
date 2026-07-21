# Landing Workflow Local Data Design

**Date:** 2026-07-21
**Status:** Approved for implementation

## Goal

Keep the public landing workflow demo interactive when visitors open Reminder or Follow-up without requiring authentication, organization membership, or channel data.

## Root Cause

The landing demo renders the shared `WorkflowCanvas`. Switching from Message Handling to Reminder or Follow-up mounts the shared automation dialogs, even while those dialogs are closed. Both dialogs call `useWorkflowWhatsappTemplates`, which currently runs `channels:listForCurrentOrg` unconditionally. The Convex function correctly rejects an unauthenticated public visitor, and the uncaught query error reaches the route error boundary.

## Data Boundary

`WorkflowCanvas` receives one required data mode:

- `authenticated` for the dashboard workflow page;
- `local` for the public landing demo.

The mode is required rather than inferred from `agentId`. This keeps the public-data boundary explicit at every canvas entrypoint and prevents a future authenticated canvas without an agent ID from silently behaving like a demo.

`WorkflowAutomationStateProvider` exposes the mode to the Reminder and Follow-up dialogs. Each dialog passes it into `useWorkflowWhatsappTemplates`.

## Query Behavior

In authenticated mode, `useWorkflowWhatsappTemplates` keeps its current behavior:

- query the current organization's channels;
- select the WhatsApp channel;
- query that channel's locally stored approved templates;
- expose the current loading state and WhatsApp channel count.

In local mode, the hook passes `skip` to every organization-scoped Convex query. It returns an empty approved-template collection, a zero WhatsApp-channel count, and a non-loading state.

The Convex functions and their authentication checks do not change. Public safety comes from not mounting an authenticated data request in the public mode, not from weakening backend authorization.

## User Experience

The landing workflow toolbar continues to switch among Message Handling, Reminder, and Follow-up. Reminder and Follow-up setup nodes and their controls remain interactive. If a visitor opens a message-template selector, it shows the existing empty state because the public demo has no organization templates.

The dashboard workflow continues to load real organization channels and approved templates exactly as before.

## Scope

This change is limited to the shared workflow canvas data-mode contract, its automation state context, the two WhatsApp-template dialog consumers, and the two canvas entrypoints. It does not change workflow persistence, node density, landing navigation defaults, template records, organization resolution, or any Convex authorization rule.

## Testing

Implementation follows test-first development. Automated coverage must verify:

- the landing workflow canvas explicitly requests local mode;
- the dashboard workflow canvas explicitly requests authenticated mode;
- the required mode is propagated through workflow automation state;
- both Reminder and Follow-up template consumers pass the mode to the shared template hook;
- local mode skips the organization channel query and reports a settled empty result;
- authenticated mode retains the current organization-channel and approved-template query path;
- existing landing Workflow-first and compact-density contracts remain intact.

Verification includes focused red-green tests, the relevant workflow and landing regression suites, scoped lint, `git diff --check`, and line-count checks for every touched code module.
