# Server-Owned WhatsApp Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete WhatsApp Embedded Signup from the browser OAuth code while discovering Meta assets and storing the business token exclusively in Convex.

**Architecture:** Keep `whatsappEmbeddedSignup.completeSignup` as the stable public Convex entrypoint, but move Meta Graph operations and signup orchestration into focused modules below 300 lines. The frontend starts completion immediately after receiving the OAuth code; the browser finish event remains only for cancellation and error feedback.

**Tech Stack:** React 19, TypeScript, Convex actions and mutations, Meta Graph API v22.0, Vitest 1.6, Bun, Node 22.

## Global Constraints

- The frontend supplies no WABA ID, phone-number ID, business access token, application secret, or Meta token response.
- `completeSignup` accepts the OAuth code and connection-attempt ID and returns only `{ status: "syncing" }`.
- Meta must expose exactly one WABA target and exactly one phone number; zero or multiple results fail explicitly.
- The business access token is persisted only by the backend channel mutation and is never returned or logged.
- No code file may exceed 300 lines; split the existing oversized signup component and backend module while changing them.
- Use Node v22 for every script and test command.
- Do not deploy Convex or publish a production release.

---

### Task 1: Meta asset discovery

**Files:**
- Create: `convex/whatsappMetaSignup.ts`
- Create: `convex/whatsappMetaSignup.test.ts`

**Interfaces:**
- Produces: `selectSingleWhatsAppBusinessAccountId(response: DebugTokenResponse): string`.
- Produces: `selectSingleWhatsAppPhoneNumber(response: WhatsAppPhoneNumbersResponse): WhatsAppPhoneNumber`.
- Produces: `createWhatsAppMetaSignupClient(credentials): WhatsAppMetaSignupClient` with code exchange, token inspection, phone discovery, WABA subscription, and display-metadata behavior.
- Consumes: server-only `META_APP_ID`, `META_APP_SECRET`, and `META_GRAPH_API_VERSION` values through credentials supplied by the orchestrator.

- [ ] **Step 1: Write failing WABA-selection tests**

Add literal fixtures covering one target, no target, and multiple targets:

```ts
test("selects the only WABA authorized for WhatsApp management", () => {
  expect(selectSingleWhatsAppBusinessAccountId({
    data: {
      granular_scopes: [
        { scope: "whatsapp_business_management", target_ids: ["waba-123"] },
      ],
    },
  })).toBe("waba-123");
});

test.each([
  [{ data: { granular_scopes: [] } }, "exactly one WhatsApp Business Account"],
  [{ data: { granular_scopes: [{ scope: "whatsapp_business_management", target_ids: ["waba-1", "waba-2"] }] } }, "exactly one WhatsApp Business Account"],
])("rejects an ambiguous WABA authorization", (response, message) => {
  expect(() => selectSingleWhatsAppBusinessAccountId(response)).toThrow(message);
});
```

- [ ] **Step 2: Run the WABA tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappMetaSignup.test.ts
```

Expected: FAIL because `convex/whatsappMetaSignup.ts` and its selector do not exist.

- [ ] **Step 3: Implement the WABA selector**

Define the Meta response types and collect unique, non-empty `target_ids` only from `whatsapp_business_management`. Throw `Expected Meta to authorize exactly one WhatsApp Business Account, received N.` unless the unique count is one.

- [ ] **Step 4: Run the WABA tests and verify GREEN**

Run the Task 1 Step 2 command. Expected: all WABA tests pass.

- [ ] **Step 5: Write failing phone-selection tests**

Add literal fixtures for one complete phone row, zero rows, and two rows:

```ts
test("selects the only phone number returned by the WABA", () => {
  expect(selectSingleWhatsAppPhoneNumber({
    data: [{ id: "phone-123", display_phone_number: "+1 555 078 3881" }],
  })).toEqual({ id: "phone-123", display_phone_number: "+1 555 078 3881" });
});
```

The zero and multiple cases must throw `Expected Meta to return exactly one WhatsApp phone number, received N.`

- [ ] **Step 6: Run the phone tests and verify RED**

Run the Task 1 Step 2 command. Expected: FAIL because the phone selector does not exist.

- [ ] **Step 7: Implement the phone selector and Meta client**

Implement the selector, the existing code-exchange request, token inspection through `/{version}/debug_token?input_token=...` authorized by the server-held app access credential, `/{wabaId}/phone_numbers?fields=id,display_phone_number`, and `/{wabaId}/subscribed_apps`. Keep token-bearing URLs and values out of diagnostics.

- [ ] **Step 8: Run discovery tests and verify GREEN**

Run the Task 1 Step 2 command. Expected: every asset-selection test passes.

---

### Task 2: Server-owned completion orchestration

**Files:**
- Create: `convex/whatsappSignupCompletion.ts`
- Create: `convex/whatsappSignupCompletion.test.ts`
- Modify: `convex/whatsappEmbeddedSignup.ts`
- Modify: `convex/channels.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/whatsappConnectionAttempts.test.ts`
- Delete: `convex/whatsappConnectionAttemptFinish.ts`

**Interfaces:**
- Consumes: `WhatsAppMetaSignupClient` from Task 1.
- Produces: `completeWhatsAppSignup(ctx, { code, attemptId }): Promise<{ status: "syncing" }>`.
- Preserves: public `api.whatsappEmbeddedSignup.completeSignup` function reference.
- Changes: `beginConnectionAttempt({ agentId? })` stores optional agent context; `completeSignup` receives no application, WABA, phone, flow-type, or agent arguments.

- [ ] **Step 1: Write failing orchestration tests**

Build an in-memory dependency fixture that records channel creation and token persistence without exposing the token in the return value. Assert that discovery occurs before channel creation and that the observable result is exactly:

```ts
expect(result).toEqual({ status: "syncing" });
expect(state.channel).toMatchObject({
  wabaId: "waba-123",
  phoneNumberId: "phone-123",
  accessToken: "business-token",
});
```

Add a failure fixture where asset discovery throws and assert `state.channel` remains undefined.

- [ ] **Step 2: Run orchestration tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappSignupCompletion.test.ts
```

Expected: FAIL because the completion orchestrator does not exist.

- [ ] **Step 3: Implement the completion orchestrator**

Authenticate the action caller, load and validate the owned open attempt, select server Meta credentials, exchange the code, discover one WABA and phone, update the attempt, call `internalStartPending`, subscribe the app, persist the channel with the token, enqueue coexistence sync, and return only `{ status: "syncing" }`.

On failure, update the attempt to `error`. Call `internalRecordError` only after a phone number has been discovered so no placeholder channel is manufactured for pre-discovery failures. Log step names, counts, IDs, durations, and safe error messages only.

- [ ] **Step 4: Replace the public action contract**

Register the stable entrypoint as:

```ts
export const completeSignup = action({
  args: {
    code: v.string(),
    attemptId: v.id("whatsappConnectionAttempts"),
  },
  handler: completeWhatsAppSignup,
});
```

Remove `recordSignupFinished`, its helper, and browser-payload tests. Add optional `agentId` to connection attempts and pass it into `internalStartPending`. Add the strict existing-agent/WABA guard using indexed, bounded channel reads before insertion or reset.

- [ ] **Step 5: Run backend tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappMetaSignup.test.ts convex/whatsappSignupCompletion.test.ts convex/whatsappConnectionAttempts.test.ts convex/whatsappCoexistence.test.ts
```

Expected: all focused backend tests pass.

- [ ] **Step 6: Verify backend module sizes**

Run:

```bash
wc -l convex/whatsappEmbeddedSignup.ts convex/whatsappMetaSignup.ts convex/whatsappSignupCompletion.ts
```

Expected: every listed code file is at most 300 lines.

---

### Task 3: OAuth-code-driven frontend flow

**Files:**
- Create: `src/lib/whatsappSignupCompletion.ts`
- Create: `src/lib/whatsappSignupCompletion.test.ts`
- Create: `src/hooks/useWhatsAppConnectionFlow.ts`
- Create: `src/hooks/useWhatsAppEmbeddedSignupEvents.ts`
- Modify: `src/components/ConnectWhatsAppButton.tsx`
- Delete: `src/hooks/usePersistWhatsAppSignupFinish.ts`

**Interfaces:**
- Produces: `completeWhatsAppSignupFromCode({ code, attemptPromise, completeSignup }): Promise<{ status: "syncing" }>`.
- Produces: `useWhatsAppConnectionFlow` for connection state, launching, OAuth handling, retry, and dialog dismissal.
- Produces: `useWhatsAppEmbeddedSignupEvents` for Meta `CANCEL` and `ERROR` feedback only.
- Consumes: backend `completeSignup({ code, attemptId })` contract from Task 2.

- [ ] **Step 1: Write the failing OAuth completion test**

Use a deferred attempt promise and an in-memory backend function. Resolve the attempt after the code arrives and assert the backend receives exactly the code and attempt ID:

```ts
expect(received).toEqual({
  code: "oauth-code",
  attemptId: "attempt-123",
});
expect(result).toEqual({ status: "syncing" });
```

No WABA ID, phone-number ID, application ID, flow type, agent ID, or token may appear in `received`.

- [ ] **Step 2: Run the frontend helper test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/whatsappSignupCompletion.test.ts
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the minimal OAuth completion helper**

Await the connection-attempt promise, throw `Connection attempt was not created.` if it resolves without an ID, and invoke the backend with only `{ code, attemptId }`.

- [ ] **Step 4: Run the helper test and verify GREEN**

Run the Task 3 Step 2 command. Expected: the helper test passes.

- [ ] **Step 5: Refactor the connection hook and component**

Move behavioral state out of the oversized component. Call the completion helper immediately inside the successful `FB.login` callback. Remove auth-code refs, finish-data refs, finish persistence, asset-ID logs, and finish-event completion calls. Retain sanitized OAuth diagnostics plus `CANCEL` and `ERROR` handling.

Pass optional route `agentId` only when beginning the connection attempt so the backend persists the agent context before OAuth. Keep the component focused on rendering the button and error dialog.

- [ ] **Step 6: Run focused frontend and backend tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/whatsappSignupCompletion.test.ts convex/whatsappMetaSignup.test.ts convex/whatsappSignupCompletion.test.ts convex/whatsappConnectionAttempts.test.ts convex/whatsappCoexistence.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 7: Verify frontend module sizes**

Run:

```bash
wc -l src/components/ConnectWhatsAppButton.tsx src/hooks/useWhatsAppConnectionFlow.ts src/hooks/useWhatsAppEmbeddedSignupEvents.ts src/lib/whatsappSignupCompletion.ts
```

Expected: every listed code file is at most 300 lines.

---

### Task 4: Integration verification and handoff

**Files:**
- Modify: `CONTINUITY.md`
- Review: `kilobot-docs/docs/releases/changelog.mdx`

**Interfaces:**
- Consumes: all completed tasks.
- Produces: verified local branch state and an updated continuity receipt.

- [ ] **Step 1: Run the complete WhatsApp regression group**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappConnectionAttempts.test.ts convex/whatsappCoexistence.test.ts convex/whatsappUninstall.test.ts convex/whatsappWebhookReceive.test.ts src/lib/whatsappSignupCompletion.test.ts
```

Expected: all selected test files pass.

- [ ] **Step 2: Run TypeScript and production build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: `tsc -b` and Vite build succeed. Existing environment and chunk-size warnings may remain if unchanged.

- [ ] **Step 3: Run Convex code generation if configured**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
```

Expected: generated types succeed when `CONVEX_DEPLOYMENT` is configured; otherwise record the exact configuration blocker and rely on the passing TypeScript build without editing generated files manually.

- [ ] **Step 4: Run structural and secret-boundary checks**

Run:

```bash
git diff --check
rg -n "recordSignupFinished|usePersistWhatsAppSignupFinish|sessionInfoRef|authCodeRef" src convex
rg -n "accessToken|access_token" src/components/ConnectWhatsAppButton.tsx src/hooks/useWhatsAppConnectionFlow.ts src/lib/whatsappSignupCompletion.ts
```

Expected: whitespace check passes; retired finish dependencies have no source references; frontend signup modules contain no access-token handling.

- [ ] **Step 5: Update continuity and release classification**

Record implementation files, test receipts, and the fact that no deployment occurred. This is not yet a confirmed production customer-facing change, so record it in `CONTINUITY.md` and do not add a changelog entry.

- [ ] **Step 6: Review the final diff**

Confirm the action returns status only, no secret is logged, pre-discovery errors do not create channels, all code modules stay under 300 lines, and unrelated user changes are untouched.
