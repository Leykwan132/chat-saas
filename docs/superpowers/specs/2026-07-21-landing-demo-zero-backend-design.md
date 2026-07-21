# Landing Demo Zero-Backend Design

**Date:** 2026-07-21
**Status:** Approved for implementation

## Goal

Guarantee that every interaction inside the public landing workflow demo is client-local. Opening Message Handling, Reminder, Follow-up, guides, calculators, dialogs, selectors, or the local node inspector must not issue a Convex query, mutation, action, permission check, organization lookup, or authentication check.

## Root Cause

The first local-mode fix gated the WhatsApp channel and template queries. It did not establish a complete capability boundary for every shared workflow descendant. The Follow-up view also mounts `WorkflowFollowupGuidesNode`, which calls `usePermissions`; that hook unconditionally calls `teamAccess:getCurrentUserAccess`, so an unauthenticated landing visitor still reaches a protected Convex query.

The problem is architectural rather than specific to one query: shared dashboard workflow components can mount several backend-capable children. Local mode must prevent those capabilities from mounting or must pass Convex's `skip` sentinel explicitly.

## Local Capability Boundary

`WorkflowCanvasDataMode` remains the single required boundary. Its meanings become:

- `authenticated`: shared workflow components may use authenticated Convex capabilities;
- `local`: shared workflow components must remain client-only and cannot mount authenticated capabilities.

The automation provider does not expose an `agentId` in local mode, even if a future caller accidentally supplies one. This blocks history and other agent-scoped descendants that already require an agent ID before mounting.

The landing adapter continues to own graph edits, automation edits, selection, arrangement, and reset in React state. It does not pass an agent ID to the node inspector, so appointment-service and media-management sections remain unmounted.

## Backend-Capable Components

### Follow-up Guides

The visual guide content is separated from permission resolution. Local mode renders the walkthrough and cost calculator with `canManage` set to false and never mounts `usePermissions`. Authenticated mode mounts a small permission-aware child and keeps the existing dashboard CTA behavior.

### Follow-up Audience

The customer-candidate query requires both authenticated mode and a route agent ID. Local mode passes `skip` regardless of the current route, then derives the existing lead-temperature options from local constants and no customer tags.

### WhatsApp Templates

The channel and approved-template queries continue to receive `skip` in local mode. Local mode exposes an empty, settled template collection.

### Template Media Preview

Workflow template dialogs pass an explicit null media override in local mode. `WhatsAppTemplatePreview` does not request a signed public-media URL when an override is supplied. Authenticated callers without an override retain the current signed-URL behavior.

### History, Services, Media, and Writes

Automation history is rendered only when the provider exposes an authenticated agent ID. Appointment services, workflow media reads, upload mutations, and media actions are rendered only when the authenticated product inspector receives an agent ID. The landing inspector receives none. All landing save, add, delete, move, connect, arrange, template, and automation callbacks remain local React-state operations.

## User Experience

The public demo keeps all currently visible interactions:

- Message Handling node editing and graph controls;
- Reminder and Follow-up setup controls;
- audience selection from local lead-temperature options;
- local schedule and activation controls;
- guide walkthrough and cost calculator;
- message dialogs with an empty template state.

Authenticated-only navigation and history remain unavailable. The guide and calculator “Get started” action is disabled in local mode because permission and route access are intentionally absent.

## Backend and Authentication

No Convex function, schema, authorization rule, or authentication utility changes. Protected functions continue rejecting unauthenticated callers. The public demo satisfies the zero-backend rule by never calling them.

## Testing

Implementation follows test-first development. Automated coverage must verify:

- local mode strips the provider's agent ID while authenticated mode preserves it;
- local Follow-up Guides never mounts `usePermissions`;
- authenticated Follow-up Guides retains its permission check and CTA behavior;
- local Follow-up Audience passes `skip` even if a route supplies an agent ID;
- local template channel and template queries remain skipped;
- local template previews cannot request signed media URLs;
- the landing inspector supplies no agent ID and therefore cannot mount service or media capabilities;
- the landing workflow source owns interactions locally and contains no direct Convex hook or API usage;
- dashboard workflow behavior remains authenticated;
- existing Workflow-first, compact-density, Reminder, Follow-up, inspector, and guide interactions remain intact.

Verification includes focused red-green tests, relevant workflow and landing regressions, scoped ESLint, the TypeScript/Vite production build, `git diff --check`, and line-count checks for every touched code module.

## Scope

This guarantee applies to `LandingAppPreviewWorkflow` and the shared workflow descendants it mounts. It does not remove separately feature-gated public landing statistics reads outside the application demo, duplicate the workflow UI, or weaken authenticated product behavior.
