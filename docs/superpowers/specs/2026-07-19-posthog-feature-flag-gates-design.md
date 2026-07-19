# PostHog Feature Flag Gates Design

## Goal

Use the existing PostHog frontend client to control two product surfaces:

- `show-token-usage` controls the public home-page token-usage statistic.
- `show-saved-replies` controls the complete Quick Replies feature.

The flags are rollout controls. They do not replace permissions or authorize backend access.

## Existing Behavior

The public landing page always mounts `StatsSection`, which always queries lifetime model usage and renders Models Supported, Total Token Used, and Businesses Onboarded.

Quick Replies currently has three user-facing entry points:

- the dashboard sidebar link;
- the picker in the Inbox composer;
- `/dashboard/:agentId/quick-replies`.

The management page and composer picker query Convex only after their components mount.

## Architecture

### Shared flag definitions

A small frontend module will own the exact PostHog keys. Callers will consume named hooks or typed helpers instead of repeating string literals.

The shared API will preserve all three PostHog evaluation states:

- `true`: enabled;
- `false`: disabled;
- `undefined`: not resolved yet.

Ordinary UI surfaces will show a feature only when its value is exactly `true`. This fail-closed behavior prevents a disabled feature from flashing while PostHog loads.

### Token usage gate

`StatsSection` will read `show-token-usage`.

When the flag is `true`:

- the existing lifetime model-usage query runs;
- Total Token Used renders with the existing ticker and formatting;
- the stats grid contains three items.

When the flag is `false` or unresolved:

- the lifetime model-usage query is skipped;
- Total Token Used is omitted;
- Models Supported and Businesses Onboarded remain visible;
- the grid uses a balanced two-column layout at the existing desktop breakpoint.

The enabled appearance and data calculation remain unchanged.

### Quick Replies gates

`show-saved-replies` will control every frontend entry point.

The dashboard sidebar will exclude Quick Replies unless the flag is exactly `true`.

The Inbox composer will not mount the Quick Replies picker unless the flag is exactly `true`. Because the picker owns its Convex query, leaving it unmounted also prevents the query from running.

The direct management route will use a loading-aware route gate:

- unresolved: render a neutral loading state and do not mount `QuickRepliesPage`;
- enabled: render `QuickRepliesPage`;
- disabled: replace the route with a redirect to `/dashboard/:agentId/inbox`.

This prevents premature redirects for enabled users while also preventing disabled users from reaching the page by URL.

Quick Reply records, Convex queries, and mutations remain unchanged. Turning the flag off does not delete data, and turning it back on restores access to existing replies.

## Data Flow

PostHog evaluates flags for the current anonymous or identified browser user through the existing `PostHogProvider`.

Each gated surface subscribes to the shared flag API. Flag changes propagate through React and update the visible surface without a reload.

Convex reads occur only when their gated component is enabled:

- lifetime token aggregation runs only when `show-token-usage` is enabled;
- the composer Quick Replies list runs only when `show-saved-replies` is enabled;
- Quick Replies management reads and mutations are available only after the enabled route mounts the page.

## Loading and Failure Behavior

An unresolved flag is not treated as enabled.

The public stats section and ordinary dashboard controls omit their gated content while flags resolve. This avoids layout flashes and accidental access.

The direct Quick Replies route must distinguish unresolved from disabled so it can wait before deciding whether to render or redirect.

PostHog flag outages therefore fail closed for both features. Existing ungated landing content, Inbox messaging, and dashboard navigation continue to work.

## Testing

Focused tests will verify:

- the two exact PostHog flag keys are centralized;
- token usage is rendered and queried only when `show-token-usage` is enabled;
- the landing stats layout supports both two- and three-item states;
- the sidebar excludes Quick Replies when `show-saved-replies` is not enabled;
- the Inbox composer does not mount its Quick Replies picker when the flag is not enabled;
- the Quick Replies route waits while unresolved, renders when enabled, and redirects to the agent Inbox when disabled;
- existing landing-page and Inbox behavior remains intact outside the gated surfaces.

Implementation will follow red-green-refactor and keep every code file below 300 lines.

## Out of Scope

- changing PostHog flag definitions, rollout rules, or cohorts;
- adding server-side PostHog evaluation;
- deleting or migrating Quick Reply data;
- renaming Quick Replies in the product UI;
- changing Convex authorization or permission rules;
- changing the token total calculation or public landing-page copy.
