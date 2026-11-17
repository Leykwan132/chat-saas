# Kilobot MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after user approval. Steps use checkbox syntax for tracking. This is a review draft, not authorization to deploy.

**Goal:** Connect our own read-only MCP server as a personal ChatGPT plugin using WorkOS Connect and the current Kilobot backend.

**Architecture:** Separate MCP Worker → private RPC on existing Kilobot Worker → operation-bound integration HTTP handlers → internal Convex queries. WorkOS supplies OAuth; the current backend enforces live workspace membership and permissions.

**Tech Stack:** TypeScript, Cloudflare Workers/service bindings, official MCP SDK, jose, Zod, WorkOS Connect, existing Convex and Vitest/convex-test.

**Spec:** `docs/superpowers/specs/2026-11-16-kilobot-mcp-design.md` (DRAFT).

## Execution status — 2026-11-16

- User selected staging private connection setup. Both staging Workers deployed with no public routes and integration disabled; Cloudflare saved version metadata confirms the named private service binding. Staging gateway uses `worker/integrations/staging.ts` wrapping the existing private entrypoint, with public HTTP404 and no website assets. Production Worker/Convex unchanged. Hosted token/data-path acceptance remains pending.

- User authorized implementation after reviewing service boundaries. Current Kilobot Worker is the chosen private backend gateway; existing unrelated local changes are preserved on `codex/kilobot-mcp`.
- Tasks 1–4: local contracts, token verification/introspection, named RPC gateway, service assertions, backend approval/revocation, live access checks, paginated tools, durable limits and audit cleanup implemented and under final verification. Installed official MCP SDK 1.32.2, jose 6.2.17 and Workers types 5.20261116.1.
- Task 1 external gate: staging discovery fetched; CIMD/DCR registration not advertised. WorkOS setup/introspection credentials and real consent/refresh tests remain pending. No settings changed.
- Task 5 local gate: real local Workers smoke test demonstrated MCP → named private RPC → signed backend HTTP, with public fetch unable to invoke RPC. Hosted deployment/ChatGPT acceptance remain pending; both checked-in deployment configs disabled.
- Reviewer findings fixed with regressions: missing scopes, pending/failed message exclusion, bounded audit draining, canonical disconnected-channel checks and strict output schemas. Runtime-only redirect incompatibility fixed using manual redirect rejection.
- Deployment instructions and operator-only pilot approval/revoke commands: `docs/integrations/kilobot-mcp-runbook.md`.

## Global Constraints

- Review and approve architecture before product implementation; no external settings changed by this planning task.
- Node 22; every script/test command begins `source "$NVM_DIR/nvm.sh" && nvm use 22 && ...` in the same shell.
- Each code file below 300 lines; split fixtures/tests by responsibility. No unnecessary comments, hidden fallbacks, empty catches, raw token logs or copied OAuth implementation.
- MCP never imports the Convex client or holds a Convex URL/key. Backend assertions never enter general session authentication.
- Organization-backed native test workspaces only; absent org, personal or partner access explicitly denied.
- Dedicated read-only operations, 10/25 search page sizes, 50 messages/page, 128 KiB response, 20 KiB request, 10-second deadline, 30 calls/minute/consent.
- Preserve unrelated working changes. Production availability UNCONFIRMED; no release changelog for this plan or private pilot.

## Review Focus

- Changing active workspace in the website cannot change the OAuth connection's workspace (Task 3).
- A removed member or locally/provider-revoked consent loses access on the next new request (Tasks 2, 3).
- A public request cannot impersonate the private RPC caller or invoke internal data reads (Tasks 2, 4).
- Cross-tenant agent IDs, conversation IDs and cursors reveal no foreign data (Task 3).
- WorkOS outage, missing scope configuration or missing org never falls back to broader access (Tasks 1, 2).

## File responsibilities and shared interfaces

All paths below are proposed new files unless marked modify. Confirm against the repository before execution.

- `shared/integrations/contracts.ts`: Zod operation schemas and serializable results; `IntegrationOperation` discriminated union for the three named tools; `VerifiedMcpPrincipal = {issuer, subject, orgId, consentId, clientId, grantedScopes: string[]}`; `IntegrationResult` discriminated by operation.
- `shared/integrations/assertion.ts`: signed assertion claim validation constants, body hashing and environment contract, no private keys.
- `mcp/{index,server,metadata,auth,workosIntrospection,limits,backendClient}.ts`: transport, tools, discovery, authentication, online validity, SQLite-backed `ConsentRateLimiter` Durable Object and private RPC adapter respectively; named Durable Object export/namespace/migration in MCP Wrangler config.
- `mcp/wrangler.jsonc`: separate MCP deployment and named backend binding.
- `worker/integrations/{entrypoint,assertion,convexClient}.ts`: private backend interface, signing, dedicated backend HTTP client.
- Modify `worker/index.ts`: export named `KilobotIntegrationEntrypoint`; preserve default website handler.
- `convex/integrations/{http,verifyAssertion,access,connections,queries,results,audit}.ts`: HTTP routing, service verification, live access, grant lifecycle, bounded reads, field allowlists and audit retention.
- Modify `convex/http.ts`: delegate route registration to the new module without expanding its existing large implementation. Modify `convex/schema.ts`: register modular tables/indexes; do not add general custom-JWT provider.
- `docs/integrations/kilobot-mcp-runbook.md`: staging setup, WorkOS values, private plugin tests and rollback.
- Colocated `*.test.ts` files, split by authentication, isolation, paging and transport; Workers integration tests use an appropriate Workers test runtime after compatibility qualification.

### Task 1: Validate provider, backend and runtime contracts

**Files:** Create runbook and `shared/integrations/contracts.ts` plus `contracts.test.ts`; modify package manifest/lockfile only after dependency qualification.

**Interfaces:** Produces the shared types above and confirmed environment config names: `MCP_RESOURCE`, `WORKOS_ISSUER`, `WORKOS_JWKS_URL`, `WORKOS_INTROSPECTION_CLIENT_ID`, `WORKOS_INTROSPECTION_CLIENT_SECRET`, `KILOBOT_BACKEND` service binding. Gateway-only `INTEGRATION_SIGNING_KEY`, `INTEGRATION_KEY_ID`, `CONVEX_INTEGRATION_URL`; Convex-only `INTEGRATION_VERIFICATION_JWKS`.

- [ ] Confirm user means the current `kilobot` Worker as the backend. Record discovery evidence and approved pilot users/orgs; revise design if another service exists.
- [ ] Qualify current stable official MCP SDK, jose, and Workers testing support; verify stateless Streamable HTTP can run without a Durable Object session store. Approve library selection before installation.
- [ ] Configure DEVELOPMENT WorkOS only after architecture approval: CIMD, exact staging resource indicator, first-party introspection application. Capture discovery and token claim names without saving secrets/tokens. Test actual hosted consent disclosure; resolve additional Kilobot approval requirement before enabling data reads.
- [ ] Write failing contract tests rejecting missing org, unknown operations, extra identity arguments, query over 200 characters, limit over 25/50 and malformed cursors; accept exact valid inputs. Context accepts `agentLimit` (default 10/max 25) and `agentCursor`; its output supplies accessible agent IDs/names and next cursor.
- [ ] Run `npx vitest run shared/integrations/contracts.test.ts` with Node 22; confirm intended failure, implement strict schemas, rerun to pass.
- [ ] Record refresh/revocation behavior and public-client introspection eligibility. If WorkOS won't introspect the actual client type, revise design explicitly; do not silently use JWT-only revocation semantics.
- [ ] Commit only this task's scoped deliverables after verification.

### Task 2: Verify callers and implement the private backend bridge

**Files:** Shared assertion module; MCP auth/introspection/metadata/backend adapter; Worker integration modules; named export and backend binding config; colocated tests.

**Interfaces:** `verifyMcpAccessToken(token: string, config: AuthConfig): Promise<VerifiedMcpPrincipal>`; `KilobotIntegrationEntrypoint.execute(principal: VerifiedMcpPrincipal, operation: IntegrationOperation): Promise<IntegrationResult>`; `signIntegrationRequest(principal, operation, bodyBytes, config): Promise<string>`. RPC accepts only validated discriminated operations, never arbitrary URLs/function names.

- [ ] Write failing tests for wrong issuer/audience/signature, missing exp/org/sid/client, expired token, disallowed algorithm, agent/M2M identity, inactive introspection, mismatching introspection claims and provider timeout. Mock JWKS/introspection with deterministic test keys.
- [ ] Write failing bridge tests: named RPC callable through test service binding; public default fetch cannot invoke it; operation/body alterations invalidate the signed backend request; keys for staging fail production verification.
- [ ] Run Node 22 scoped tests and confirm failures; implement jose verification, first-party introspection, explicit error mapping and private binding bridge. Enforce 30-second assertion lifetime, 5-second tolerance, fixed `POST /integrations/mcp/read`, operation and body hash. Test wrong method/path and key rotation overlap/removal.
- [ ] Implement public resource discovery, 401 `WWW-Authenticate` challenge, tool authorization metadata and MCP auth error metadata. Unit-test canonical resource URL equality and no user data in unauthenticated responses.
- [ ] Rerun focused suites and Workers runtime bridge smoke check; commit scoped changes.

### Task 3: Enforce grants and workspace isolation in the backend

**Files:** New Convex integration modules/table-definition module; minimal schema/router registration; colocated access/connections/queries/assertion tests. Read Convex guidelines and expert skill before code changes.

**Interfaces:** `verifyIntegrationAssertion(request, config): Promise<{principal: VerifiedMcpPrincipal, operation: IntegrationOperation}>`; `resolveIntegrationAccess(ctx, principal, requiredPermission): Promise<IntegrationAccess>` (internal-only verified principal); internal `executeRead` query returns `IntegrationResult`. `IntegrationAccess` contains verified local user/team IDs, exact org and read-only grant. Separate internal `ensurePendingConnection`, `approvePilotConnection({connectionId, expectedIssuer, expectedSubject, expectedOrgId, expectedClientId})`, `revokePilotConnection({connectionId})` and audit mutations; all Convex functions have args/returns validators. Approval and revocation are explicit operator actions in the pilot runbook, never model-callable tools.

- [ ] Write failing assertion HTTP tests: unsigned requests, changed operation/body, wrong environment/kid, excessive lifetime, missing fields and invalid signatures deny before internal reads.
- [ ] Write convex-test fixtures with users A/B, native orgs A/B, personal/partner teams and a removed member. Assert no first-use grant for ineligible users; no email-only identity mapping or activeTeamId override; inaccessible IDs return generic not-found.
- [ ] Test grant uniqueness on `(issuer, consentId)`, immutable user/client/org binding, pending-only first use, explicit pilot approval, no automatic reactivation of revoked grants, deliberate reapproval of a reused consent ID, member removal, workspace deletion, partner/personal denial and current `chats:read` checks on every read. Grant and membership checks execute in the same query transaction as each data read; initialization never bypasses them.
- [ ] Implement dedicated HTTP verification and internal access/data functions. Reuse pure role and indexed projection logic; do not call browser-session queries with a synthetic identity. Resolve native organization membership from current records, not token role claims.
- [ ] Implement two tables: integration connections indexed by issuer/consent and user; audit rows indexed by timestamp/connection. Persist metadata only; 30-day batched cleanup. Implement operator-only pilot approval/list/revoke and test wrong expected identity/org/client denies approval. Customer self-service approval/list/revoke UI and its session/CSRF checks are a separate mandatory gate before broader availability, not an implied pilot feature.
- [ ] Test bounded indexed search, 50-message paging, correct thread ordering, stale/disconnected chats, foreign/tampered cursors, 128 KiB response budget and metadata-only attachments. Use operation/consent/org/input-bound authenticated cursors; backend signer key separate from OAuth credentials.
- [ ] Run Node 22 integration suites; all pass, indexed queries verified, generated API refreshed through supported tooling in development. Commit scoped changes; no production deployment.

### Task 4: Expose three read-only MCP tools

**Files:** MCP transport/server/limits modules, dedicated Wrangler config and tests; use Task 2 bridge and Task 3 backend contracts.

**Interfaces:** `createKilobotMcpServer(dependencies): McpServer` with `get_connection_context`, `search_conversations`, `get_conversation`; `consumeToolBudget(consentId: string): Promise<{allowed: boolean, retryAfterSeconds: number}>` using durable per-consent state.

- [ ] Write failing protocol tests for initialize, tools/list, strict tools/call, tool auth failure, read-only annotations, unsupported methods and no data under invalid auth. Ensure discovery/tool listing never consumes or exposes a grant.
- [ ] Write failing limits tests across separate Worker requests: request 31 in a 60-second consent window denied; other consents unaffected; body over 20 KiB rejected; backend exceeds 10-second total deadline produces explicit timeout; tool errors contain no secrets.
- [ ] Implement maintained SDK stateless transport, schemas, structured results, authenticated request context and durable limiter. Instantiate per-request server/auth context to prevent identity leakage across concurrent users. Add concurrent A/B regression test.
- [ ] Run Node 22 focused protocol/Workers suites; inspect MCP Worker build to confirm it contains no Convex client, URL or credentials. Scoped lint and diff check pass; commit.

### Task 5: Private plugin staging acceptance and review

**Files:** Runbook acceptance receipts and scoped development deployment configs. Pilot uses the explicit internal approval/list/revoke actions from Task 3; no customer settings UI is included in this pilot.

**Interfaces:** No new data/API contracts. Consumes all prior tasks.

- [ ] Run focused Node 22 tests, scoped lint, Worker dry-run builds and relevant app build. Because implementation is a substantial planned change, run backend/app type checks once at this gate. Require clean scoped diff checks.
- [ ] Deploy compatible development backend first, current Kilobot staging Worker second, MCP staging Worker last. Verify no production bindings, keys, AuthKit environment or Convex URLs cross the staging boundary.
- [ ] Add custom MCP server in ChatGPT Plugins with OAuth and staging URL; create/install personal plugin. Copy any exact callback/client metadata values from ChatGPT's integration configuration; never guess callback URLs.
- [ ] In ChatGPT Work, prove pending connection denies data; operator approves the exact test consent through Task 3 action, then invoke each tool. Verify context discovers agents, correct arguments, bounded results, correct workspace and no business-data writes. Test expired-token renewal, provider/local disconnect, removed membership, revoked consent, reused-consent explicit reapproval and cross-organization attempts with new requests. Capture redacted receipts.
- [ ] Review privacy/consent disclosure and error messages with user. Prove rollback by disabling staging integration; website sign-in/data reads remain functional.
- [ ] Present results and remaining production setup for review. Production domain/WorkOS changes, data enablement, directory submission and release changelog wait for confirmed rollout authorization/availability.

## Self-review

All architecture sections map to Tasks 1–5; identity delivery is explicitly implemented in Task 2 and independently checked in Task 3. Limits and concurrency have Task 4 tests. Source credentials, client shape, native organization mapping and consent disclosure are measured in Task 1 rather than assumed. This plan remains conditional on approval of the proposed Worker gateway and pilot scope.
