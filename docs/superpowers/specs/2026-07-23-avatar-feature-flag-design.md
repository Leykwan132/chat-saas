# Avatar Feature Flag Design

## Goal

Gate the complete Avatar product behind the PostHog flag `enable_avatar_feature`.
When the flag is not explicitly enabled, users must not see Avatar navigation or
access dashboard Avatar pages or the public Avatar embed.

## Flag Contract

Add `enableAvatarFeature: 'enable_avatar_feature'` to the centralized
`POSTHOG_FEATURE_FLAGS` object and expose `useEnableAvatarFeature()` using the
existing tri-state `boolean | undefined` contract.

`true` enables Avatar. Both `false` and unresolved states fail closed. Routes
retain a loading state while PostHog resolves so enabled users are not redirected
prematurely.

## Navigation

Extend `NavFeatureOptions` with `enableAvatarFeature`. Build the Avatar tool item
only when this option is true. `AppSidebar` resolves the PostHog state with
`isProductFeatureEnabled` before calling `getNavItems`.

The flag affects only Avatar navigation. Existing permission filtering remains
unchanged and runs after feature selection.

## Route Gates

Create focused route components outside `main.tsx` and route all three Avatar
entry points through them:

- `/dashboard/:agentId/avatar`
- `/dashboard/:agentId/avatar/create`
- `/avatar/embed/:publicKey`

While the flag is unresolved, each gate renders the existing centered loading
spinner.

When disabled:

- Dashboard Avatar routes redirect to `/dashboard/:agentId/inbox` with
  replacement navigation.
- The public embed renders the same neutral “Avatar unavailable” presentation
  used for invalid or disabled public configurations. It does not redirect.

When enabled, the gates render the existing Avatar page components unchanged.

## Backend Boundary

This is a PostHog rollout gate, not an authorization mechanism. Convex Avatar
queries, actions, mutations, and stored configurations remain unchanged.
Existing permissions, public-key validation, and session-capacity checks remain
the backend security boundaries.

## Testing

Source and behavior contracts will verify:

- The exact `enable_avatar_feature` PostHog key and hook.
- Avatar sidebar inclusion only when the resolved flag is true.
- Dashboard gates wait while unresolved, redirect while disabled, and render
  the requested Avatar page while enabled.
- The public gate waits while unresolved, renders “Avatar unavailable” while
  disabled, and renders the embed page while enabled.
- `main.tsx` routes every Avatar entry point through the appropriate gate.
- Existing Avatar tests, scoped lint, the production build, line limits, stale
  direct-route scans, and whitespace checks remain green.
