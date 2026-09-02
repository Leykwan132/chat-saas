# Partner-host Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Authenticate customers on their connected partner hostname with email and password while keeping Kilobot and every partner-managed workspace strictly separate.

**Architecture:** A Cloudflare Worker issues short-lived, signed surface JWTs after resolving the request hostname and verifying the WorkOS account. Convex validates those tokens and chooses only the teams permitted on that surface. Partner-created teams are explicitly linked to their parent partner organization, so native Kilobot APIs can exclude them completely.

**Tech Stack:** React 19, React Router 7, Vite/Cloudflare Workers, Convex, WorkOS AuthKit/User Management, Vitest, convex-test.

**Spec:** `docs/superpowers/specs/2026-09-02-partner-host-authentication-design.md`

## Global Constraints

- Use Node 22 for every command: `source ~/.nvm/nvm.sh && nvm use 22`.
- Keep every production code file under 300 lines; split by responsibility.
- Do not add a password-reset UI or transactional email in this phase.
- Never log, persist in browser storage, or place in URLs a password, refresh token, session cookie, or signing key.
- Partner-root and partner-created teams are inaccessible from `kilobot.app`; native teams are inaccessible from partner hostnames.
- `storage.kilobot.app/*` remains a no-script Cloudflare route.

---

### Task 1: Partner-managed team records and pure access helpers

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/whiteLabel/managedTeams.ts`
- Create: `convex/whiteLabel/managedTeams.test.ts`
- Modify: `convex/whiteLabel/planResolver.ts`

**Interfaces:**
- Produces `getPartnerOrganizationForManagedTeam(ctx, teamId)` returning the root `whiteLabelPartnerOrganizations` row for either a root or child team, or `null`.
- Produces `assertManagedTeamBelongsToPartner(ctx, teamId, partnerOrganizationId)`.
- Adds `whiteLabelPartnerManagedTeams` with `partnerOrganizationId`, `teamId`, `createdByUserId`, `createdAt`, `updatedAt`; indexes `by_teamId` and `by_partnerOrganizationId`.

- [ ] **Step 1: Write failing ownership tests**

```ts
expect(await getPartnerOrganizationForManagedTeam(ctx, rootTeamId)).toMatchObject({ _id: partnerOrganizationId });
expect(await getPartnerOrganizationForManagedTeam(ctx, childTeamId)).toMatchObject({ _id: partnerOrganizationId });
await expect(assertManagedTeamBelongsToPartner(ctx, childTeamId, otherOrganizationId)).rejects.toThrow("Partner-managed team is unavailable");
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whiteLabel/managedTeams.test.ts`

- [ ] **Step 3: Add the table and helpers**

Use `withIndex("by_teamId", ...)` for child lookup and `withIndex("by_teamId", ...)` on `whiteLabelPartnerOrganizations` for root lookup. Do not scan either table. Return the root record for both cases.

- [ ] **Step 4: Make plan resolution use the root partner record for child teams**

`getWhiteLabelPlanForTeam` must call `getPartnerOrganizationForManagedTeam`; it then resolves the plan by that returned root ID.

- [ ] **Step 5: Re-run focused tests and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whiteLabel/managedTeams.test.ts convex/whiteLabel/managedWorkspace.test.ts`

Commit: `git add convex/schema.ts convex/whiteLabel/managedTeams.ts convex/whiteLabel/managedTeams.test.ts convex/whiteLabel/planResolver.ts && git commit -m "feat: model partner managed teams"`

### Task 2: Surface claims and hostname resolution

**Files:**
- Modify: `convex/auth.config.ts`
- Modify: `convex/http.ts`
- Create: `convex/whiteLabel/partnerAuthGateway.ts`
- Create: `convex/whiteLabel/partnerAuthGateway.test.ts`

**Interfaces:**
- Produces bounded hostname branding resolution and authenticated user-to-host membership resolution consumed by the Worker.
- Produces `PartnerAuthSurface = { kind: "kilobot" } | { kind: "partner"; hostname: string; partnerId: Id<"whiteLabelPartners">; partnerOrganizationId: Id<"whiteLabelPartnerOrganizations"> }`.
- Adds the Worker JWT issuer/JWKS provider to `convex/auth.config.ts`; no environment fallback is permitted.

- [ ] **Step 1: Write failing hostname and membership resolver tests**

```ts
expect(await resolveHostname("app.example.com")).toEqual({ kind: "partner", hostname: "app.example.com", partnerId, partnerOrganizationId });
expect(await resolveMember(workosUserId, hostname)).toEqual({ allowed: true, surface });
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whiteLabel/partnerAuthGateway.test.ts`

- [ ] **Step 3: Implement bounded resolver functions**

Normalize hostname to lowercase and return only name/logo/status IDs needed by the Worker. The branding resolver may be public; the membership resolver requires the caller's WorkOS access token. Disconnected or inactive hostnames return the same non-authorizing result as unknown hosts.

- [ ] **Step 4: Add the custom JWT provider**

Configure the Worker issuer and JWKS URL from `PARTNER_AUTH_JWT_ISSUER` and `PARTNER_AUTH_JWKS_URL`; preserve both existing WorkOS providers.

- [ ] **Step 5: Re-run focused tests and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whiteLabel/partnerAuthGateway.test.ts`

Commit: `git add convex/auth.config.ts convex/http.ts convex/whiteLabel/partnerAuthGateway.ts convex/whiteLabel/partnerAuthGateway.test.ts && git commit -m "feat: resolve partner auth surfaces"`

### Task 3: Cloudflare authentication gateway

**Files:**
- Modify: `wrangler.jsonc`
- Create: `src/worker.ts`
- Create: `src/partnerAuth/workerCrypto.ts`
- Create: `src/partnerAuth/workerSession.ts`
- Create: `src/partnerAuth/workerRoutes.ts`
- Create: `src/partnerAuth/workerRoutes.test.ts`

**Interfaces:**
- `GET /_partner-auth/branding`, `POST /_partner-auth/login`, `POST /_partner-auth/kilobot-session`, `GET /_partner-auth/session`, `POST /_partner-auth/logout`, and `GET /_partner-auth/jwks`.
- `issueSurfaceToken(surface, user)` returns a five-minute RS256 JWT.
- Session cookie is host-only, `HttpOnly`, `Secure`, `SameSite=Lax`, and contains sealed WorkOS refresh/session data, never the JWT.

- [ ] **Step 1: Write failing Worker route tests**

```ts
expect(response.headers.get("set-cookie")).toContain("HttpOnly");
expect(response.headers.get("set-cookie")).toContain("SameSite=Lax");
expect(await branding("unknown.example.com")).toMatchObject({ status: 404 });
expect(await login("app.example.com", nativeUser)).toMatchObject({ status: 401 });
expect((await session("app.example.com")).token).toContain(".");
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/partnerAuth/workerRoutes.test.ts`

- [ ] **Step 3: Implement crypto and session modules**

Use Web Crypto with the required `PARTNER_AUTH_SESSION_ENCRYPTION_KEY` to seal cookie payloads and `PARTNER_AUTH_JWT_PRIVATE_JWK` to sign JWTs. Export only the public JWK at the JWKS endpoint. Validate the request hostname and call Task 2's protected Convex routes before issuing any partner token.

- [ ] **Step 4: Implement partner password and Kilobot bridge routes**

Partner login calls WorkOS password authentication server-side, verifies the active member belongs to the resolved partner organization, then sets the host-local session. Kilobot bridge accepts a current AuthKit access token only on `kilobot.app`, validates it against WorkOS, and creates a `kind: "kilobot"` session. Return identical login failure bodies for bad credentials, non-members, and unknown hosts.

- [ ] **Step 5: Route non-auth traffic to SPA assets and commit**

`src/worker.ts` dispatches only `/_partner-auth/*`; every other request delegates to the configured asset binding. Keep the storage no-script route out of Worker code.

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/partnerAuth/workerRoutes.test.ts`

Commit: `git add wrangler.jsonc src/worker.ts src/partnerAuth && git commit -m "feat: add partner auth worker gateway"`

### Task 4: Scoped React auth and branded partner sign-in

**Files:**
- Create: `src/partnerAuth/ScopedAuthProvider.tsx`
- Create: `src/partnerAuth/usePartnerBrand.ts`
- Create: `src/pages/PartnerSignInPage.tsx`
- Create: `src/pages/PartnerSignInPage.test.tsx`
- Modify: `src/pages/SignInPage.tsx`
- Modify: `src/router/AppRouteComponents.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- `useScopedAuth()` implements Convex's `{ isLoading, isAuthenticated, fetchAccessToken }` contract using `/_partner-auth/session`.
- `PartnerSignInPage` posts `{ email, password }` only to same-origin `/_partner-auth/login` and navigates to `/workspace` after token availability.

- [ ] **Step 1: Write failing UI tests**

```tsx
expect(screen.getByRole("heading", { name: "Sign in to Acme" })).toBeVisible();
expect(screen.getByLabelText("Email")).toBeVisible();
expect(screen.queryByText("Forgot password?")).toBeNull();
expect(screen.queryByText("Continue with Google")).toBeNull();
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/PartnerSignInPage.test.tsx`

- [ ] **Step 3: Add provider and route selection**

Resolve branding through the same-origin Worker endpoint. On a connected partner host render `PartnerSignInPage`; on `kilobot.app` retain the current AuthKit redirect. Replace `ConvexProviderWithAuthKit` with a thin provider adapter that chooses AuthKit bridge/native token or Worker scoped token without writing tokens to storage.

- [ ] **Step 4: Add loading and failure UX**

Show a centered spinner while hostname branding or session refresh is unresolved. Disable Sign in with the inline spinner during submission. Show one generic credential failure message.

- [ ] **Step 5: Re-run focused tests and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/PartnerSignInPage.test.tsx`

Commit: `git add src/partnerAuth src/pages/PartnerSignInPage.tsx src/pages/PartnerSignInPage.test.tsx src/pages/SignInPage.tsx src/router/AppRouteComponents.tsx src/main.tsx && git commit -m "feat: add branded partner sign in"`

### Task 5: Enforce surface-aware workspace and team access

**Files:**
- Modify: `convex/authUtils.ts`
- Modify: `convex/teamHelpers.ts`
- Modify: `convex/teams.ts`
- Modify: `convex/whiteLabel/customerWorkspace.ts`
- Create: `convex/whiteLabel/surfaceWorkspaceAccess.test.ts`

**Interfaces:**
- `getAuthSurface(identity)` reads signed `surface`, hostname, partner, and partner-organization claims.
- `getActiveTeamForSurface(ctx, user, surface)` and `assertTeamInSurface(ctx, user, teamId, surface)` replace global partner-customer forcing.

- [ ] **Step 1: Write failing surface isolation tests**

```ts
expect(await partnerClient.query(api.teams.listForCurrentUser, {})).toEqual([root, partnerChild]);
expect(await kilobotClient.query(api.teams.listForCurrentUser, {})).toEqual([personal, nativeOrg]);
await expect(kilobotClient.mutation(api.teams.switchActiveTeam, { teamId: partnerChild._id })).rejects.toThrow("Team is unavailable on this hostname");
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whiteLabel/surfaceWorkspaceAccess.test.ts`

- [ ] **Step 3: Parse claims and resolve teams by surface**

Partner claims may return only their root organization plus managed children with a membership. Kilobot claims may return every membership except any team resolved by Task 1 as partner-managed. Reject active-team overrides outside that filtered set.

- [ ] **Step 4: Stop global partner onboarding and personal-team deletion**

`reconcilePartnerCustomerWorkspace` only maintains the partner membership. It does not mark onboarding complete, patch global active team, or delete a personal team. Native user creation creates a personal team only for a Kilobot surface.

- [ ] **Step 5: Re-run focused tests and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whiteLabel/surfaceWorkspaceAccess.test.ts convex/whiteLabel/customerWorkspaceAccess.test.ts`

Commit: `git add convex/authUtils.ts convex/teamHelpers.ts convex/teams.ts convex/whiteLabel/customerWorkspace.ts convex/whiteLabel/surfaceWorkspaceAccess.test.ts && git commit -m "feat: isolate workspace access by hostname"`

### Task 6: Create and govern partner-managed teams

**Files:**
- Modify: `convex/organizationsAdmin.ts`
- Modify: `convex/teams.ts`
- Modify: `convex/whiteLabel/planResolver.ts`
- Create: `convex/whiteLabel/managedTeamCreation.test.ts`
- Modify: `convex/teamDeletion/request.ts`

**Interfaces:**
- Partner surface `createTeamForCurrentUser` derives parent organization from claims and inserts a managed-team link.
- Native surface preserves the existing WorkOS/Stripe team creation behavior.

- [ ] **Step 1: Write failing create-team tests**

```ts
const created = await partnerClient.action(api.organizationsAdmin.createTeamForCurrentUser, createArgs);
expect(await getPartnerOrganizationForManagedTeam(ctx, created.teamId)).toMatchObject({ _id: partnerOrganizationId });
await expect(kilobotClient.query(api.teams.getTeamDetail, { teamId: created.teamId })).resolves.toBeNull();
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whiteLabel/managedTeamCreation.test.ts`

- [ ] **Step 3: Split native and partner creation handlers**

Keep WorkOS organization creation shared. The partner persistence path reads the authenticated claim, creates the local team and owner membership, then inserts `whiteLabelPartnerManagedTeams`. It resolves plan limits and credits from the parent partner organization and never reads the creator's Stripe subscription.

- [ ] **Step 4: Cascade partner-root deletion safely**

Extend the existing partner organization deletion workflow to batch-delete managed-team links, memberships, and teams before deleting the root. Do not delete WorkOS users. Ensure deleting one managed team cannot delete another native or partner team.

- [ ] **Step 5: Re-run focused tests and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whiteLabel/managedTeamCreation.test.ts convex/whiteLabel/managedWorkspace.test.ts`

Commit: `git add convex/organizationsAdmin.ts convex/teams.ts convex/whiteLabel/planResolver.ts convex/whiteLabel/managedTeamCreation.test.ts convex/teamDeletion/request.ts && git commit -m "feat: create teams within partner workspaces"`

### Task 7: Backfill, configuration, and final verification

**Files:**
- Create: `convex/whiteLabel/surfaceWorkspaceMigration.ts`
- Create: `convex/whiteLabel/surfaceWorkspaceMigration.test.ts`
- Modify: `wrangler.jsonc`
- Modify: `CONTINUITY.md`

- [ ] **Step 1: Write failing migration tests**

```ts
await runMigrationBatch();
expect(user.activeTeamId).not.toBe(partnerTeamId);
expect(user.onboarded).toBe(false);
expect(await getPersonalTeamForUser(ctx, user._id)).toBeNull();
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whiteLabel/surfaceWorkspaceMigration.test.ts`

- [ ] **Step 3: Implement bounded migration batches**

Use the migration component with a stable batch size. For each user whose active team is partner-managed, clear only that active team. Set `onboarded` false only if the user has no native membership. Preserve all native teams and partner memberships.

- [ ] **Step 4: Document and configure deployment prerequisites**

Set Worker secrets `WORKOS_API_KEY`, `PARTNER_AUTH_SESSION_ENCRYPTION_KEY`, and `PARTNER_AUTH_JWT_PRIVATE_JWK`; set Worker configuration `WORKOS_CLIENT_ID` and `CONVEX_URL`; set Convex `PARTNER_AUTH_JWT_ISSUER` and `PARTNER_AUTH_JWKS_URL`. Configure the Worker application route and retain `storage.kilobot.app/*` as no-script. Configure a Cloudflare rate-limit rule for `POST /_partner-auth/login`.

- [ ] **Step 5: Run full required verification and commit**

Run:
`source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen`

`source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whiteLabel src/pages/PartnerSignInPage.test.tsx src/partnerAuth/workerRoutes.test.ts`

`source ~/.nvm/nvm.sh && nvm use 22 && bun run build`

`source ~/.nvm/nvm.sh && nvm use 22 && bun run lint`

Commit: `git add convex/whiteLabel/surfaceWorkspaceMigration.ts convex/whiteLabel/surfaceWorkspaceMigration.test.ts wrangler.jsonc CONTINUITY.md && git commit -m "feat: migrate partner workspace surfaces"`

## Plan Review

- Partner-host UI, hostname validation, secure cookies, scoped JWTs, native AuthKit bridge, existing-user migration, native/partner team isolation, managed-team creation, deletion, rate limiting, and no-reset scope map to Tasks 1–7.
- The plan contains no unresolved implementation placeholders and all named interfaces are introduced before their consumers.
- The final task runs Convex code generation, focused tests, build, and lint under Node 22.
