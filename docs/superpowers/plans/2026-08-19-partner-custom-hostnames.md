# Partner Custom Hostnames Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each approved partner connect one branded subdomain through a gated, zero-downtime Cloudflare Custom Hostnames workflow.

**Architecture:** Convex persists the domain lifecycle and schedules checks only after the partner confirms each external DNS change. A Node-only Cloudflare action module creates and polls custom hostnames using the Cloudflare SDK, while a separate V8 module owns authorization, state transitions, and persisted safe setup instructions. The Branding tab renders that durable state in a shadcn Dialog and shows the public preview URL only after certificate and DNS cutover verification.

**Tech Stack:** React 19, TypeScript, shadcn/ui Dialog, Convex, convex-test, Vitest, Cloudflare Node SDK v6, Node DNS resolver.

**Spec:** `docs/superpowers/specs/2026-08-19-partner-custom-hostnames-design.md`

## Global Constraints

- Run every script through Node v22: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && …`.
- Keep all code files under 300 lines and split by responsibility.
- Use object-form Convex functions with `args` and `returns` validators.
- Keep Cloudflare credentials in Convex environment variables only; never return them to the client.
- Support CNAME-compatible subdomains only; reject apex and `kilobot.app` hostnames.
- Use the existing Cloudflare SDK with `CLOUDFLARE_API_TOKEN` and the supplied zone configuration.
- Do not mutate customer DNS. Customer confirmation starts polling; it does not bypass a provider or DNS check.
- Do not stage or commit worktree changes because this checkout contains user-owned in-progress changes.
- This feature is unshipped; update `CONTINUITY.md`, not the production changelog.

---

## File Structure

- `convex/schema.ts` — migration-safe domain lifecycle fields and setup-state validator.
- `convex/whiteLabel/customHostnameState.ts` — hostname validation, DNS record construction, provider-status mapping, and deterministic state transitions.
- `convex/whiteLabel/customHostnameState.test.ts` — pure lifecycle helper tests.
- `convex/whiteLabel/customHostnameData.ts` — internal persistence/query functions and public confirmation mutations.
- `convex/whiteLabel/customHostnameData.test.ts` — partner authorization, persisted state, and scheduler tests using convex-test.
- `convex/whiteLabel/customHostnameActions.ts` — Node-only Cloudflare SDK calls, Node DNS verification, and scheduled polling actions.
- `convex/whiteLabel/customHostnameActions.test.ts` — SDK-boundary and polling-result tests with mocked Cloudflare responses.
- `convex/whiteLabel/portal.ts` — branding-only save mutation and a sanitized richer domain response through the existing profile query.
- `src/lib/whiteLabelApi.ts` — client reference types for domain lifecycle queries, actions, and confirmations.
- `src/components/partner/PartnerCustomDomainDialog.tsx` — gated six-step Dialog with copy and confirmation controls.
- `src/components/partner/PartnerBrandingTab.tsx` — logo save plus custom-domain summary and dialog entry point.
- `src/pages/PartnerPage.tsx` — domain action/mutation wiring and branding save separation.
- `src/pages/PartnerPage.test.ts` — UI contract coverage for domain wizard gating and connected-only preview.

### Task 1: Define the durable domain lifecycle

**Files:**
- Modify: `convex/schema.ts:239-248,509-521`
- Create: `convex/whiteLabel/customHostnameState.ts`
- Create: `convex/whiteLabel/customHostnameState.test.ts`

**Interfaces:**
- Produces `CustomHostnameSetupState`, `normalizeCustomHostname`, `getDelegatedDcvRecord`, `getCutoverRecord`, `isCloudflareReady`, and `getNextSetupState`.
- Consumed by `customHostnameData.ts`, `customHostnameActions.ts`, `portal.ts`, and the React API contract.

- [ ] **Step 1: Write the failing lifecycle-helper tests**

```ts
test("accepts a subdomain and rejects apex, protocol, and the SaaS zone", () => {
  expect(normalizeCustomHostname("App.Partner.com")).toBe("app.partner.com");
  expect(() => normalizeCustomHostname("partner.com")).toThrow("subdomain");
  expect(() => normalizeCustomHostname("https://app.partner.com")).toThrow("hostname");
  expect(() => normalizeCustomHostname("kilobot.app")).toThrow("subdomain");
});

test("builds the hostname-specific delegated DCV CNAME", () => {
  expect(getDelegatedDcvRecord("app.partner.com", "dcv.cloudflare.com")).toEqual({
    name: "_acme-challenge.app.partner.com",
    type: "CNAME",
    value: "app.partner.com.dcv.cloudflare.com",
  });
});

test("requires active hostname and certificate before cutover", () => {
  expect(isCloudflareReady({ hostnameStatus: "active", certificateStatus: "pending" })).toBe(false);
  expect(isCloudflareReady({ hostnameStatus: "active", certificateStatus: "active" })).toBe(true);
});
```

- [ ] **Step 2: Run the new helper test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customHostnameState.test.ts`

Expected: FAIL because `customHostnameState.ts` does not exist.

- [ ] **Step 3: Add migration-safe schema fields and pure helpers**

Add a `whiteLabelCustomHostnameSetupStateValidator` with these literal states:

```ts
v.union(
  v.literal("draft"),
  v.literal("ownership_pending"),
  v.literal("ownership_checking"),
  v.literal("dcv_pending"),
  v.literal("certificate_checking"),
  v.literal("cutover_pending"),
  v.literal("connection_checking"),
  v.literal("connected"),
  v.literal("failed"),
)
```

Add only optional fields to `whiteLabelPartnerDomains`:

```ts
setupState: v.optional(whiteLabelCustomHostnameSetupStateValidator),
ownershipRecordName: v.optional(v.string()),
ownershipRecordType: v.optional(v.literal("TXT")),
ownershipRecordValue: v.optional(v.string()),
delegatedDcvRecordName: v.optional(v.string()),
delegatedDcvRecordTarget: v.optional(v.string()),
hostnameStatus: v.optional(v.string()),
certificateStatus: v.optional(v.string()),
pollGeneration: v.optional(v.number()),
pollAttempt: v.optional(v.number()),
lastCheckedAt: v.optional(v.number()),
ownershipConfirmedAt: v.optional(v.number()),
dcvConfirmedAt: v.optional(v.number()),
cutoverConfirmedAt: v.optional(v.number()),
connectedAt: v.optional(v.number()),
```

Implement the pure helper module without database or Cloudflare imports. It must normalize lower-case input, require at least three DNS labels, reject `kilobot.app` and its subdomains, produce `_acme-challenge.<hostname>` with `<hostname>.<delegation-target>`, produce `<hostname> CNAME kilobot.app`, and accept readiness only when both provider statuses are exactly `active`.

- [ ] **Step 4: Run helper tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customHostnameState.test.ts`

Expected: PASS with all lifecycle helper tests green.

### Task 2: Persist setup state and schedule only partner-confirmed checks

**Files:**
- Create: `convex/whiteLabel/customHostnameData.ts`
- Create: `convex/whiteLabel/customHostnameData.test.ts`
- Modify: `convex/whiteLabel/portal.ts:48-76,220-281`
- Modify: `convex/schema.ts:509-521`

**Interfaces:**
- Consumes `CustomHostnameSetupState` helpers from Task 1 and `assertCurrentPartnerAccess` from `access.ts`.
- Produces public mutations `confirmOwnershipDns`, `confirmDelegatedDcvDns`, `confirmCutoverDns`; internal query `getDomainForPolling`; internal mutations `reserveDomain`, `persistCreatedHostname`, `applyHostnameSnapshot`, and `markPollingFailure`.
- Produces `PartnerCustomDomain` for `getCurrentPartner` with safe setup instructions, current state, status labels, and `previewUrl` only when connected.

- [ ] **Step 1: Write failing Convex authorization and scheduler tests**

```ts
test("only the owning partner can start ownership polling", async () => {
  const owner = fixture.client.withIdentity({ subject: "partner-owner", orgId: "org-owner" });
  const other = fixture.client.withIdentity({ subject: "another-user", orgId: "org-other" });
  await expect(other.mutation(api.whiteLabel.customHostnameData.confirmOwnershipDns, {}))
    .rejects.toThrow("Partner access");
  await owner.mutation(api.whiteLabel.customHostnameData.confirmOwnershipDns, {});
  expect(await fixture.domain()).toMatchObject({ setupState: "ownership_checking", pollGeneration: 1, pollAttempt: 0 });
});

test("cutover cannot be confirmed before certificate readiness", async () => {
  await expect(fixture.owner.mutation(api.whiteLabel.customHostnameData.confirmCutoverDns, {}))
    .rejects.toThrow("certificate");
});
```

- [ ] **Step 2: Run the Convex state test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customHostnameData.test.ts`

Expected: FAIL because the public mutations and internal lifecycle functions do not exist.

- [ ] **Step 3: Implement the V8 data module**

Use `assertCurrentPartnerAccess` in every public mutation. A confirmation mutation must reject an invalid predecessor state, increment `pollGeneration`, reset `pollAttempt` to `0`, set the checking state, set the matching confirmation timestamp, and schedule exactly one internal action:

```ts
await ctx.scheduler.runAfter(
  0,
  internal.whiteLabel.customHostnameActions.pollCustomHostname,
  { domainId: domain._id, generation: nextGeneration },
);
```

Use `by_partnerId` for the current partner's one domain and `by_hostname` when reserving a new hostname. `reserveDomain` rejects a hostname associated with another partner, rejects a connected domain replacement, and writes a `draft` record before the Cloudflare action call. `persistCreatedHostname` saves the Cloudflare ID, ownership TXT record, delegated record, and switches to `ownership_pending`.

`applyHostnameSnapshot` accepts `expectedGeneration`, ignores stale scheduled actions, records safe provider statuses and the latest expected validation error, and advances only through these transitions:

```ts
ownership_checking -> dcv_pending
certificate_checking -> cutover_pending
connection_checking -> connected
```

Only `connection_checking` may set high-level `status: "active"`; every other non-terminal setup state keeps it `pending`. The public profile response must expose a `previewUrl` only when setup state is `connected` and use `null`, never `undefined`, for unavailable values.

- [ ] **Step 4: Run Convex state tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customHostnameData.test.ts`

Expected: PASS for owner-only access, state gating, and scheduled-function registration.

### Task 3: Add Cloudflare creation, polling, and DNS-cutover verification

**Files:**
- Create: `convex/whiteLabel/customHostnameActions.ts`
- Create: `convex/whiteLabel/customHostnameActions.test.ts`
- Modify: `convex/whiteLabel/customHostnameData.ts`

**Interfaces:**
- Consumes Task 2 internal functions and Task 1 helpers.
- Produces public action `createCustomHostname` and internal actions `hydrateCustomHostnameDetails` and `pollCustomHostname`.
- Reads `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_FALLBACK_ORIGIN`, and `CLOUDFLARE_DCV_DELEGATION_TARGET` only in the Node action module.

- [ ] **Step 1: Write failing provider-boundary tests**

```ts
test("creates a DV TXT custom hostname and persists the ownership TXT record", async () => {
  cloudflareCreate.mockResolvedValue({
    id: "cf-hostname",
    hostname: "app.partner.com",
    status: "pending",
    ownership_verification: { type: "txt", name: "_cf-custom-hostname.app.partner.com", value: "ownership-token" },
    ssl: { status: "pending" },
  });

  await owner.action(api.whiteLabel.customHostnameActions.createCustomHostname, { hostname: "app.partner.com" });

  expect(cloudflareCreate).toHaveBeenCalledWith(expect.objectContaining({
    hostname: "app.partner.com",
    ssl: { method: "txt", type: "dv" },
  }));
});

test("does not mark cutover connected until DNS and Cloudflare are active", async () => {
  cloudflareGet.mockResolvedValue({ status: "active", ssl: { status: "active" } });
  resolveCname.mockResolvedValue(["wrong-origin.example"]);
  await pollConnection(domainId, generation);
  expect(await fixture.domain()).not.toMatchObject({ setupState: "connected" });
});
```

- [ ] **Step 2: Run provider-boundary tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customHostnameActions.test.ts`

Expected: FAIL because the action module and provider boundary are absent.

- [ ] **Step 3: Implement the Node-only action module**

Start the file with `"use node";` and export actions only. Construct a dedicated Cloudflare client from `process.env.CLOUDFLARE_API_TOKEN`; do not reuse the AI Search client in `convex/cloudflare.ts`.

`createCustomHostname` must declare `returns: v.null()`, authenticate through an internal query, reserve the domain through `internal.whiteLabel.customHostnameData.reserveDomain`, and call:

```ts
await client.customHostnames.create({
  zone_id: process.env.CLOUDFLARE_ZONE_ID!,
  hostname,
  ssl: { method: "txt", type: "dv" },
});
```

Persist the returned Cloudflare ID immediately. If the create response includes `ownership_verification`, persist its TXT `type`, `name`, and `value`; otherwise schedule `hydrateCustomHostnameDetails` after 5 seconds to call `get` and persist that ownership record. `hydrateCustomHostnameDetails` does not start readiness polling or advance a DNS stage. Treat the expected pre-cutover `custom hostname does not CNAME to this zone` verification error as waiting state, not failure.

`pollCustomHostname` must load the domain via an internal query, exit if `generation` is stale or its setup state is not a checking state, then call `client.customHostnames.get(domain.cloudflareHostnameId, { zone_id })`. It must:

- advance ownership after Cloudflare reports hostname `status: "active"`;
- advance certificate readiness only after hostname `status` and `ssl.status` are both `active`;
- for `connection_checking`, call `resolveCname(hostname)` from `node:dns/promises`, normalize trailing dots, require a returned CNAME equal to `CLOUDFLARE_FALLBACK_ORIGIN`, and then require the same active provider statuses;
- schedule the next check in 60 seconds when still pending and `pollAttempt < 60`;
- persist a recoverable failure at attempt 60 or on an unexpected provider error, leaving retry to an explicit partner confirmation.

Pass `{ domainId, generation }` unchanged into every rescheduled action. The persisted generation guard prevents duplicate or stale schedules from changing a later setup attempt.

- [ ] **Step 4: Run provider-boundary tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customHostnameActions.test.ts`

Expected: PASS for create payload, delayed detail retrieval, active-status gating, expected pending error handling, CNAME verification, retry limit, and stale generation handling.

### Task 4: Expose the domain lifecycle to the partner UI

**Files:**
- Modify: `src/lib/whiteLabelApi.ts`
- Modify: `src/pages/PartnerPage.tsx`
- Modify: `src/components/partner/PartnerBrandingTab.tsx`
- Create: `src/components/partner/PartnerCustomDomainDialog.tsx`
- Modify: `src/pages/PartnerPage.test.ts`

**Interfaces:**
- Consumes `PartnerCustomDomain` from Task 2 and action/mutation references from Task 3.
- Produces a Branding experience that saves logo/name separately from custom-hostname setup.

- [ ] **Step 1: Write failing UI contract tests**

```ts
test("opens custom hostname setup from Branding and keeps future steps muted", () => {
  expect(brandingSource).toContain("Set up custom domain");
  expect(dialogSource).toContain('setupState === "ownership_pending"');
  expect(dialogSource).toContain("I've added this record");
  expect(dialogSource).toContain("data-[available=false]:opacity-50");
});

test("only exposes the preview link after a connected domain", () => {
  expect(dialogSource).toContain('domain.setupState === "connected"');
  expect(dialogSource).toContain("navigator.clipboard.writeText");
  expect(brandingSource).not.toContain('id="partner-hostname"');
});
```

- [ ] **Step 2: Run the UI contract test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/PartnerPage.test.ts`

Expected: FAIL because the custom-domain Dialog and references do not exist.

- [ ] **Step 3: Add API references and the modular Dialog**

Expand `PartnerProfile.domain` to the safe lifecycle shape:

```ts
type PartnerCustomDomain = {
  hostname: string;
  status: "pending" | "active" | "suspended" | "failed";
  setupState: CustomHostnameSetupState | null;
  ownershipRecord: { name: string; type: "TXT"; value: string } | null;
  delegatedDcvRecord: { name: string; type: "CNAME"; value: string } | null;
  cutoverRecord: { name: string; type: "CNAME"; value: string } | null;
  hostnameStatus: string | null;
  certificateStatus: string | null;
  validationError: string | null;
  previewUrl: string | null;
};
```

Add `createCustomHostname` as an action reference and the three confirmation mutations as mutation references. In `PartnerPage`, remove local `hostname` state and remove `hostname` from the branding-save payload. Keep logo upload behavior unchanged.

Implement `PartnerCustomDomainDialog` with the existing `Dialog` primitives, an accessible title and description, and six visual step rows. Use normal `text-sm` controls, subtle `rounded-lg border` styling, no shadows, and no oversized card radius. The three record steps must copy `"${type} ${name} ${value}"` with `navigator.clipboard.writeText` and show a toast. A Done button invokes the matching confirmation mutation and disables while the request is in flight. It may not run a browser polling interval; reactive `getCurrentPartner` data renders persisted server progress.

The connected row exposes a `Copy preview link` button only for a non-null `previewUrl`. The Branding surface otherwise shows `Set up custom domain`, pending status, or connected hostname without an editable hostname input.

- [ ] **Step 4: Run UI contract tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/PartnerPage.test.ts`

Expected: PASS for the established Partner Programme contracts plus the new domain setup controls.

### Task 5: Configure deployment and perform end-to-end verification

**Files:**
- Modify: `CONTINUITY.md`
- Verify: `docs/superpowers/specs/2026-08-19-partner-custom-hostnames-design.md`
- Verify: `docs/superpowers/plans/2026-08-19-partner-custom-hostnames.md`

**Interfaces:**
- Consumes the deployed Convex functions from Tasks 1-4.
- Produces a deployed feature with the four required server environment variables and a documented verification receipt.

- [ ] **Step 1: Set the four Convex deployment environment variables**

Set these in the target Convex deployment, using the real token only at the terminal or dashboard:

```bash
CLOUDFLARE_API_TOKEN=<zone-scoped-token-with-SSL-and-Certificates-Write>
CLOUDFLARE_ZONE_ID=035ecbd6fa20503d15a5e0681e1a9909
CLOUDFLARE_FALLBACK_ORIGIN=kilobot.app
CLOUDFLARE_DCV_DELEGATION_TARGET=a6627bf9414e7423.dcv.cloudflare.com
```

Confirm Cloudflare Custom Hostnames has `kilobot.app` configured as its fallback origin before testing the wizard.

- [ ] **Step 2: Run all new focused tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run \
  convex/whiteLabel/customHostnameState.test.ts \
  convex/whiteLabel/customHostnameData.test.ts \
  convex/whiteLabel/customHostnameActions.test.ts \
  src/pages/PartnerPage.test.ts
```

Expected: PASS with no failing custom-hostname or Partner Programme tests.

- [ ] **Step 3: Run static verification and deploy Convex functions**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx tsc --noEmit
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx convex dev --once
git diff --check
```

Expected: TypeScript and diff checks pass, and Convex reports functions ready. If unrelated pre-existing type errors block deployment, record their exact modules and do not use `--typecheck=disable` as a substitute for fixing this feature's errors.

- [ ] **Step 4: Smoke-test the intended partner lifecycle**

Use a non-production partner subdomain and confirm each invariant:

1. Creation sends `ssl.method: "txt"` and `ssl.type: "dv"` and shows the ownership TXT record.
2. No scheduled check exists before a partner clicks the matching Done button.
3. Ownership Done starts checking and unlocks DCV only after Cloudflare reports active hostname status.
4. DCV Done starts certificate checks and unlocks cutover only after both Cloudflare statuses are active.
5. Cutover Done validates the CNAME to `kilobot.app` before Connected appears.
6. Connected branding exposes only the copyable `https://<hostname>` preview link.

- [ ] **Step 5: Record the result without publishing a release note**

Update `CONTINUITY.md` with the deployment result, the verification commands, and any environment/deployment blocker. Do not add a `kilobot-docs` changelog entry until production availability is confirmed.
