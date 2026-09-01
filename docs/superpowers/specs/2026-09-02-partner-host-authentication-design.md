# Partner-host authentication

## Purpose

Give every connected white-label partner hostname an embedded, partner-branded email-and-password sign-in experience. A person may use the same WorkOS identity in two separate product surfaces:

- `kilobot.app` exposes every native personal and organizational team the user belongs to, with the existing native switching experience. It excludes every partner-managed organization and team.
- An assigned connected partner hostname exposes only that partner organization and teams created within that partner context, all using the partner-managed plan and credit wallet.

The hostname is an authorization boundary. It is not a presentation-only workspace filter.

## Scope

- A connected partner hostname renders a branded `/sign-in` page with email, password, and Sign in controls.
- It renders no sign-up, SSO, social, magic-link, or password-reset controls.
- A successful partner-host sign-in opens `/workspace` on the same hostname.
- `kilobot.app/sign-in` preserves the current AuthKit sign-in experience and opens the user's native Kilobot context. A user whose only workspace is partner-managed completes the existing personal onboarding flow.
- A person may have native Kilobot and partner-managed memberships. A partner hostname returns and authorizes only its assigned partner context; Kilobot returns every native context.
- Creating a team from a partner hostname creates a team managed by the assigned partner organization. It is never listed, selectable, or usable on Kilobot.
- Password-reset email delivery and embedded password reset are deferred. The partner-host UI does not link to the existing WorkOS-hosted reset flow.

## Non-goals

- This phase does not add transactional email, Cloudflare Email Service, or any partner reset-password email.
- This phase does not add partner workspaces to Kilobot's existing organization switcher or native workspaces to a partner hostname. Switching is possible only between teams that belong to the current hostname's product surface.
- This phase does not redirect an authenticated Kilobot user to a partner hostname or vice versa.
- This phase does not change partner organization plan, credit, membership, or branding administration.
- This phase does not accept an arbitrary `returnTo` URL. All post-auth navigation is a same-origin, validated application path.

## Existing state

The SPA currently wraps every hostname in `AuthKitProvider` and `ConvexProviderWithAuthKit`. `/sign-in` immediately calls AuthKit's hosted sign-in. The partner custom-hostname records already contain a hostname, connected state, partner relationship, and optional logo. Partner membership data already maps a WorkOS user to a partner organization.

The current workspace resolver treats a partner-created user as globally partner-scoped. Partner provisioning currently marks the user onboarded, pins their active team to the partner team, and deletes any personal team. That must change: a request needs an authenticated surface claim before the resolver chooses either the personal or partner workspace.

## Architecture

### Authentication gateway

Replace the asset-only Cloudflare Worker deployment with a module Worker that serves static SPA assets for normal requests and owns same-origin `/_partner-auth/*` routes. The Worker is reached by `kilobot.app` and each Cloudflare SaaS custom hostname. `storage.kilobot.app/*` remains a no-script route so R2 traffic bypasses this Worker.

The Worker uses the incoming Cloudflare request hostname, not a client-supplied hostname, to resolve the current surface. It calls a protected Convex HTTP endpoint using a shared service secret. The endpoint returns only the safe information needed by the Worker:

- whether this is the Kilobot hostname or a connected active partner hostname;
- partner ID, partner display name, and logo URL for a connected partner hostname;
- for an authenticated WorkOS user, whether they are an active member of that hostname's partner organization.

The browser never calls this protected endpoint and cannot choose a partner ID or organization ID.

### Session types

Convex must receive a short-lived, hostname-scoped JWT rather than a raw WorkOS access token. The Worker becomes the issuer for this app token and serves its public JWKS. Convex adds that issuer alongside the existing WorkOS issuers.

Every app token includes:

- the WorkOS user ID as `sub`;
- an expiry no longer than five minutes;
- `surface: "kilobot" | "partner"`;
- for partner sessions, the connected hostname, partner ID, and partner organization ID;
- the existing identity fields required for user lookup.

The Worker signs tokens with a private JWK held only as a Cloudflare Worker secret. It seals a host-only, secure, HttpOnly, SameSite=Lax session cookie using a separate encryption key. The cookie is never valid on another hostname and does not contain the app JWT. The SPA obtains a fresh short-lived app token through a same-origin session endpoint and keeps it in memory for the Convex provider.

The Worker validates active membership before issuing or refreshing a partner-surface app token. Convex independently verifies the token's partner organization claim still matches an active local membership and connected hostname before returning partner data. Removing a membership therefore invalidates new tokens immediately and denies existing short-lived tokens at the data boundary.

### Partner-host sign-in

On a custom hostname, `/sign-in` first requests `/_partner-auth/branding`. Until the Worker confirms that the hostname is connected and active, the page shows a centered spinner. A valid response renders:

1. the configured logo when present;
2. `Sign in to {partner name}`;
3. email and password fields;
4. one primary Sign in button.

There is no card-style shell, marketing copy, alternate authentication method, reset link, or link to a different hostname.

The form posts same-origin credentials to `/_partner-auth/login`. The Worker calls WorkOS password authentication with its server-side WorkOS API key, resolves the account against the request hostname, and creates a sealed partner-host session only when the person is an active member of that partner organization. It then returns a success response; the SPA obtains an app token and routes to `/workspace` on the current origin.

Invalid credentials, a normal Kilobot user, an inactive member, an account assigned to a different partner, and an unknown hostname all receive the same generic sign-in failure. This prevents email and partner-membership enumeration.

### Kilobot sign-in

`kilobot.app/sign-in` keeps the existing WorkOS AuthKit route and callback. Once AuthKit has an authenticated WorkOS access token, a same-origin Worker bridge validates it and establishes a sealed Kilobot-surface session. The SPA then switches its Convex authentication source from the raw AuthKit token to the short-lived Worker-issued Kilobot app token.

For a person who has only been created by a partner, that app token still has `surface: "kilobot"`. The backend creates their personal Kilobot context and the current onboarding flow runs as it does for any new personal user. Kilobot otherwise retains every native personal and organizational team the user belongs to. Partner root organizations and teams created through a partner hostname are not returned to the Kilobot switcher, plan queries, billing views, or any other native product API.

Existing Kilobot users retain their current AuthKit experience. At deployment, an existing AuthKit session is bridged on its next app load without forcing a password entry.

### Workspace resolution

`buildAuthContextFromDb` and team helpers receive the verified surface claims through the Convex identity. They resolve workspace access as follows:

- `surface: "partner"`: validate the token's hostname, partner, partner organization, active organization status, and active membership; return the assigned root team and partner-managed teams linked to that root organization. Personal teams, native organizations, and teams managed by another partner organization are rejected.
- `surface: "kilobot"`: resolve the current native personal or organizational team and return every native team to the existing switcher. A team is partner-managed when it is a partner root organization or has a managed-team link; those teams are excluded from every native workspace list and cannot be selected with an active-team override.

The user and team creation path must run personal onboarding only for the Kilobot surface. It must not set onboarding complete merely because the user has a partner membership. Partner provisioning and reconciliation continue to create and maintain the organizational membership, but no longer patch personal onboarding state, force a global active team, or delete a personal team.

A one-time migration repairs existing partner-created users. It preserves all native memberships, clears an active team only when it points to a partner-managed team, and sets `onboarded` to false only when the person has no native Kilobot team. The partner surface bypasses personal onboarding and still opens its assigned organization. A Kilobot user whose only membership was partner-managed then creates a personal team and completes onboarding normally.

### Team creation

The existing Create team flow becomes surface-aware. A Kilobot-surface request keeps the current behavior and creates a native WorkOS organization and local team.

A partner-surface request creates the team through a partner-specific action. The action derives the partner organization from the signed session claim, creates the WorkOS organization and local team, ensures the creator's membership, and persists a managed-team link to the assigned partner organization in the same logical workflow. The client never supplies a partner or parent-organization ID.

Feature gating, plan resolution, and credit accounting for a managed team resolve through its parent partner organization. A partner-created team therefore uses the parent partner plan and wallet; it does not receive native Stripe billing or a personal plan. The partner root organization deletion cascade includes all linked managed teams and their memberships. Deleting a managed team never affects a native team or the underlying WorkOS user.

Every team-specific query, mutation, and action uses one shared surface-aware access assertion. It rejects a native team under a partner token, a partner-managed team under a Kilobot token, and a managed team whose parent differs from the token's partner organization.

### Logout and expiry

Signing out on a partner hostname clears only that hostname's sealed session and in-memory app token. It does not clear a Kilobot session on a separate host. Signing out on Kilobot retains its current AuthKit logout behavior and also clears the Kilobot-surface Worker session.

When an app token expires, the SPA requests a replacement from the same-origin Worker. If the sealed session is absent, expired, invalid, or no longer authorized for that surface, the SPA clears local auth state and returns to that origin's `/sign-in`.

## Interfaces and data

### Worker routes

All Worker routes are same-origin and reject cross-origin browser calls:

- `GET /_partner-auth/branding` returns connected partner name and logo for the request hostname only.
- `POST /_partner-auth/login` accepts email and password only on an active partner hostname.
- `POST /_partner-auth/kilobot-session` accepts the current AuthKit access token only on `kilobot.app` and establishes a Kilobot surface session.
- `GET /_partner-auth/session` returns a fresh short-lived app token for the current host-bound session.
- `POST /_partner-auth/logout` clears the current host-bound session.
- `GET /_partner-auth/jwks` exposes the public key set used by Convex to verify app tokens.

No route returns WorkOS refresh tokens, sealed session contents, private signing material, partner membership lists, or another hostname's brand data.

### Convex boundary

Add a custom JWT provider for the Worker issuer in `convex/auth.config.ts`. The issuer and JWKS URL are explicit environment values; they have no fallback.

Add protected internal/HTTP functions that the Worker can call using a shared secret. They resolve a hostname and enforce the user-to-partner-organization relationship. They do not become public Convex client functions.

The existing white-label partner and organization tables remain the source of truth. No password, refresh token, reset token, or long-lived app session is stored in Convex for this phase.

Add `whiteLabelPartnerManagedTeams` for teams created from a partner hostname. Each row stores its parent `partnerOrganizationId`, `teamId`, creator, and timestamps, with unique lookup by team and indexed lookup by parent organization. The root team remains represented by `whiteLabelPartnerOrganizations`; it is not duplicated in the managed-team table.

### Required configuration

Cloudflare Worker secrets:

- `WORKOS_API_KEY`
- `PARTNER_AUTH_CONVEX_SHARED_SECRET`
- `PARTNER_AUTH_SESSION_ENCRYPTION_KEY`
- `PARTNER_AUTH_JWT_PRIVATE_JWK`
- `CONVEX_PARTNER_AUTH_URL`

Convex environment values:

- `PARTNER_AUTH_CONVEX_SHARED_SECRET`
- `PARTNER_AUTH_JWT_ISSUER`
- `PARTNER_AUTH_JWKS_URL`

The current WorkOS client ID remains configured for AuthKit. No email-sending configuration is required in this phase.

Cloudflare must route the Kilobot application and active custom hostnames to the module Worker. The exact `storage.kilobot.app/*` no-script route remains in place before the broad application route so R2 requests continue to bypass application authentication.

## Error handling and safety

- Only a custom hostname that is both connected in Cloudflare and active in the partner record may render partner branding or attempt partner sign-in.
- The Worker applies a Cloudflare rate-limit rule to `POST /_partner-auth/login` before password authentication reaches WorkOS.
- Credentials, WorkOS refresh tokens, app tokens, sealed cookies, shared secrets, and signing keys are never logged, returned in URLs, or persisted in browser storage.
- All return paths are fixed internal paths; no open redirect is accepted.
- Partner membership and organization status are checked at token issuance and again when Convex resolves the workspace.
- Generic error responses do not disclose whether an email exists, which partner owns it, or whether a membership is suspended.
- A partner-host request cannot become a Kilobot request by modifying a client route, local storage, a team ID, or a request body because the token surface claim is signed and the backend validates it.

## Verification

- Worker tests cover hostname resolution, unknown and disconnected hosts, branding output, generic login failures, cookie attributes, host-bound refresh, logout, rate-limit response handling, and no secret/token logging.
- Tests cover partner password authentication success only for a member assigned to the resolved partner organization.
- Tests cover Kilobot AuthKit bridge success for an existing native user and a partner-created user.
- Convex auth-context tests cover partner token validation, native token exclusion of partner teams, personal onboarding for a partner-created user on Kilobot, and rejection of stale membership and forged surface claims.
- UI tests cover partner brand loading, spinner state, email/password-only controls, no password-reset UI, submission loading, and same-origin workspace routing.
- Regression tests prove partner root and managed teams, their plan, wallet, credits, and organization data never appear in Kilobot while all native teams remain available there; personal billing and onboarding never appear on a partner hostname.
- Run focused Worker/UI/Convex tests, Convex code generation, Node 22 TypeScript, targeted lint, and production build before implementation is considered complete.
