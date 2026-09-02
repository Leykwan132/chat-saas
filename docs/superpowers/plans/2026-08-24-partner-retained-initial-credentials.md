# Partner Retained Initial Credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authorized partners retrieve a directly provisioned customer's encrypted initial password and accurately see completed password resets.

**Architecture:** A dedicated Convex table stores AES-256-GCM material, never plaintext. Direct provisioning encrypts before calling WorkOS; a partner-authorized Node action decrypts only on demand. The existing verified WorkOS webhook sets `passwordResetAt` after `password_reset.succeeded`, while overview rows expose only availability and reset state.

**Tech Stack:** Convex, Node.js crypto, WorkOS Node SDK, React 19, TypeScript, shadcn UI, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-24-partner-retained-initial-credentials-design.md`

## Global Constraints

- Use Node v22 for every test, code-generation, lint, and TypeScript command.
- Use `"use node";` only in action modules using Node crypto; never use `ctx.db` in an action.
- `PARTNER_INITIAL_CREDENTIALS_ENCRYPTION_KEY` is a base64-encoded 32-byte AES-256-GCM key; missing or invalid configuration fails.
- Never store, log, subscribe to, or return plaintext credentials except from authorized create/retrieval actions.
- Never expose reset tokens or replacement passwords.
- Keep files at 300 LOC or fewer, use bounded Convex queries, and add no code comments.
- Legacy invitation rows have no stored credentials and must not claim reset state.

---

## File Structure

- `convex/whiteLabel/customerCredentialEncryption.ts`: encryption/decryption helpers.
- `convex/whiteLabel/customerAccounts.ts`: encrypted-record persistence, retrieval lookup, and customer cleanup.
- `convex/whiteLabel/customerAccountActions.ts`: provision encryption and retrieval action.
- `convex/whiteLabel/passwordResetEvents.ts`: webhook event mutation helper.
- `convex/schema.ts`, `portalOverview.ts`, and `teamDeletion/whiteLabelCleanup.ts`: storage, non-secret subscription state, and organization cleanup.
- `convex/workosWebhook.ts`: one additional verified event dispatch branch.
- `src/lib/whiteLabelApi.ts`, `PartnerCustomerCredentialsDialog.tsx`, `PartnerCustomerList.tsx`, `PartnerOrganizationList.tsx`, and `PartnerPage.tsx`: client references and UI.

### Task 1: Encrypt and persist initial credentials

**Files:**

- Create: `convex/whiteLabel/customerCredentialEncryption.ts`
- Create: `convex/whiteLabel/customerCredentialEncryption.test.ts`
- Modify: `convex/schema.ts:474-494`
- Modify: `convex/whiteLabel/customerAccounts.ts:1-260`
- Modify: `convex/whiteLabel/customerAccountActions.ts:1-120`
- Create: `convex/whiteLabel/customerAccounts.test.ts`

**Interfaces:**

- `encryptInitialCustomerPassword(password: string): EncryptedCustomerCredential`
- `decryptInitialCustomerPassword(credential: EncryptedCustomerCredential): string`
- `persistActiveAccount({ partnerOrganizationId, workosUserId, workosOrganizationMembershipId, email, role, credential }): null`

- [ ] **Step 1: Write failing crypto tests**

Create `customerCredentialEncryption.test.ts` with a base64 32-byte test key. Assert round-trip encryption and no plaintext in `ciphertext`:

```ts
const encrypted = encryptInitialCustomerPassword("InitialPasswordAa1!");
expect(encrypted.ciphertext).not.toContain("InitialPasswordAa1!");
expect(decryptInitialCustomerPassword(encrypted)).toBe("InitialPasswordAa1!");
```

Set an invalid key and assert the exact error `PARTNER_INITIAL_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key.`.

- [ ] **Step 2: Verify the test fails**

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customerCredentialEncryption.test.ts
```

Expected: FAIL because the crypto module is absent.

- [ ] **Step 3: Implement AES-256-GCM helpers**

Use `createCipheriv`, `createDecipheriv`, and fresh 12-byte `randomBytes` IVs. Decode the environment key as base64 and reject a length other than 32. Serialize this exact shape using base64 binary fields:

```ts
export type EncryptedCustomerCredential = {
  ciphertext: string;
  initializationVector: string;
  authenticationTag: string;
  keyVersion: "v1";
};
```

- [ ] **Step 4: Verify crypto passes**

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customerCredentialEncryption.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write failing persistence tests**

In `customerAccounts.test.ts`, persist an active account with encrypted fields and assert one matching credential record exists, has no `initialPassword` property, and uses the same partner-organization/workos-user pair.

- [ ] **Step 6: Verify persistence fails**

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customerAccounts.test.ts
```

Expected: FAIL because no credential table or persistence argument exists.

- [ ] **Step 7: Add schema and atomic persistence**

Add optional `passwordResetAt` to `whiteLabelPartnerOrganizationAccounts`. Add `whiteLabelPartnerCustomerCredentials` with partner organization ID, WorkOS user ID, `ciphertext`, `initializationVector`, `authenticationTag`, `keyVersion: v.literal("v1")`, timestamps, and `by_partnerOrganizationId_and_workosUserId` index. Extend the existing internal persistence mutation to upsert both records in one transaction.

In `createCustomerAccount`, generate then encrypt the password before the WorkOS request. Pass only encrypted fields to persistence. Keep membership/user rollback surrounding persistence failures.

- [ ] **Step 8: Verify persistence passes and commit**

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customerCredentialEncryption.test.ts convex/whiteLabel/customerAccounts.test.ts
git add convex/schema.ts convex/whiteLabel/customerCredentialEncryption.ts convex/whiteLabel/customerCredentialEncryption.test.ts convex/whiteLabel/customerAccounts.ts convex/whiteLabel/customerAccounts.test.ts convex/whiteLabel/customerAccountActions.ts
git commit -m "feat: encrypt partner customer credentials"
```

Expected: tests PASS and commit contains no generated files.

### Task 2: Add authorized retrieval and non-secret overview state

**Files:**

- Modify: `convex/whiteLabel/customerAccounts.ts:1-300`
- Modify: `convex/whiteLabel/customerAccountActions.ts:1-220`
- Modify: `convex/whiteLabel/portalOverview.ts:1-180`
- Modify: `src/lib/whiteLabelApi.ts:35-185`
- Modify: `convex/whiteLabel/customerAccounts.test.ts`
- Modify: `src/pages/PartnerPage.test.ts`

**Interfaces:**

- `getInitialCredentialForPartnerOrganization({ partnerOrganizationId, workosUserId })`
- `getCustomerInitialCredentials({ partnerOrganizationId, workosUserId }) => { email, initialPassword, passwordResetAt }`
- overview customers gain `hasRetainedInitialPassword: boolean` and optional `passwordResetAt`.

- [ ] **Step 1: Write failing access and overview tests**

Add a `convex-test` case: matching partner organization/user returns encrypted data and email; another partner organization returns `null`. Add this source contract:

```ts
expect(portalOverviewSource).toContain("hasRetainedInitialPassword");
expect(portalOverviewSource).toContain("passwordResetAt");
expect(apiSource).toContain("hasRetainedInitialPassword: boolean;");
expect(apiSource).not.toContain("ciphertext");
```

- [ ] **Step 2: Verify failures**

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customerAccounts.test.ts src/pages/PartnerPage.test.ts
```

Expected: FAIL because retrieval and non-secret state are absent.

- [ ] **Step 3: Implement lookup, retrieval action, and overview mapping**

The internal lookup verifies the active account and encrypted record both match the requested organization/user pair, returning `null` if either is absent. The Node action authorizes via `getInvitableOrganization`, invokes the lookup, decrypts, and returns:

```ts
{ email: v.string(), initialPassword: v.string(), passwordResetAt: v.union(v.number(), v.null()) }
```

Throw `Customer credentials are unavailable.` on absent records. Add the action client reference. The overview queries the credential index only to set `hasRetainedInitialPassword`; it exposes neither encrypted material nor initial password. Legacy rows set `hasRetainedInitialPassword: false` and omit reset time.

- [ ] **Step 4: Verify and commit**

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customerAccounts.test.ts convex/whiteLabel/customerAccountActions.test.ts src/pages/PartnerPage.test.ts
git add convex/whiteLabel/customerAccounts.ts convex/whiteLabel/customerAccountActions.ts convex/whiteLabel/portalOverview.ts src/lib/whiteLabelApi.ts convex/whiteLabel/customerAccounts.test.ts convex/whiteLabel/customerAccountActions.test.ts src/pages/PartnerPage.test.ts
git commit -m "feat: retrieve partner customer credentials securely"
```

Expected: tests PASS.

### Task 3: Record reset completion and delete credentials with accounts

**Files:**

- Create: `convex/whiteLabel/passwordResetEvents.ts`
- Create: `convex/whiteLabel/passwordResetEvents.test.ts`
- Modify: `convex/workosWebhook.ts:1-120`
- Modify: `convex/teamDeletion/whiteLabelCleanup.ts:1-150`
- Modify: `convex/teamDeletionCascade.test.ts:330-470`
- Modify: `convex/whiteLabel/customerAccounts.ts:130-260`

**Interfaces:**

- `recordCompletedPasswordReset(ctx, data: unknown): Promise<void>`
- the existing dispatcher handles `password_reset.succeeded` before its event-id record insertion.

- [ ] **Step 1: Write failing webhook and cleanup tests**

Insert direct accounts for `user_reset` and `user_keep`. Dispatch:

```ts
{ eventId: "event_password_reset", eventType: "password_reset.succeeded", data: { user_id: "user_reset" } }
```

Assert only `user_reset` has numeric `passwordResetAt`; replay the event ID and assert the timestamp is unchanged. Extend organization-cascade and customer-removal cases with a credential record and assert it is deleted.

- [ ] **Step 2: Verify failures**

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/passwordResetEvents.test.ts convex/teamDeletionCascade.test.ts convex/whiteLabel/customerAccounts.test.ts
```

Expected: FAIL because neither event handling nor credential cleanup exists.

- [ ] **Step 3: Implement dispatch and cleanup**

Create a focused helper that returns without mutation for malformed event data, otherwise reads non-empty `user_id`, uses `.take(100)` on `by_workosUserId`, and patches matching active accounts with `passwordResetAt` and `updatedAt`. Add exactly:

```ts
case "password_reset.succeeded":
  await recordCompletedPasswordReset(ctx, data);
  break;
```

to the existing signed webhook dispatcher. Do not mark reset in `startCurrentUserPasswordReset`.

Delete a matching credential before direct-account deletion. In organization cleanup, page credential rows by organization before active account rows and preserve the existing deletion cursor loop.

- [ ] **Step 4: Verify and commit**

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/passwordResetEvents.test.ts convex/teamDeletionCascade.test.ts convex/whiteLabel/customerAccounts.test.ts
git add convex/whiteLabel/passwordResetEvents.ts convex/whiteLabel/passwordResetEvents.test.ts convex/workosWebhook.ts convex/teamDeletion/whiteLabelCleanup.ts convex/teamDeletionCascade.test.ts convex/whiteLabel/customerAccounts.ts convex/whiteLabel/customerAccounts.test.ts
git commit -m "feat: track completed customer password resets"
```

Expected: tests PASS.

### Task 4: Show reset status and on-demand credentials in the portal

**Files:**

- Modify: `src/components/partner/PartnerCustomerCredentialsDialog.tsx:1-100`
- Modify: `src/components/partner/PartnerCustomerList.tsx:1-260`
- Modify: `src/components/partner/PartnerOrganizationList.tsx:65-170`
- Modify: `src/pages/PartnerPage.tsx:1-340`
- Modify: `src/lib/whiteLabelApi.ts:105-185`
- Create: `src/components/partner/PartnerCustomerList.test.ts`
- Modify: `src/pages/PartnerPage.test.ts`

**Interfaces:**

- `PartnerCustomerList` consumes `onShowCredentials(partnerOrganizationId, workosUserId): Promise<CustomerCredentials | null>`.
- `CustomerCredentials` gains `passwordResetAt: number | null`.

- [ ] **Step 1: Write failing UI contracts**

Assert the customer list contains `<TableHead>Password reset</TableHead>`, `hasRetainedInitialPassword`, `onShowCredentials`, `customer.passwordResetAt ? "Password has been reset by user" : "Not reset"`, and `event.stopPropagation()`. Assert the credential dialog uses `variant="ghost"` and contains `Initial password — no longer current`. Assert Organization header/name no longer use `text-center` while the remaining organization cells stay centered.

- [ ] **Step 2: Verify failures**

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/partner/PartnerCustomerList.test.ts src/components/partner/PartnerCustomerForms.test.ts src/pages/PartnerPage.test.ts
```

Expected: FAIL because the column, action, and historical label are absent.

- [ ] **Step 3: Implement interaction and states**

Use the new action hook in `PartnerPage` through the current error/toast wrapper and store its result in the existing credentials dialog state. Only rows with `hasRetainedInitialPassword` are keyboard-accessible credential triggers; action-menu events stop propagation so deletion cannot open a dialog. Direct rows show `Password has been reset by user` or `Not reset`; legacy rows show `—`. Dialog copy controls are ghost icon buttons and use the historical label when `passwordResetAt !== null`.

- [ ] **Step 4: Verify, codegen, and commit**

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customerCredentialEncryption.test.ts convex/whiteLabel/customerAccounts.test.ts convex/whiteLabel/customerAccountActions.test.ts convex/whiteLabel/passwordResetEvents.test.ts convex/teamDeletionCascade.test.ts src/components/partner/PartnerCustomerList.test.ts src/components/partner/PartnerCustomerForms.test.ts src/pages/PartnerPage.test.ts src/pages/SettingsPage.test.ts && bunx tsc --noEmit -p convex/tsconfig.json && bunx tsc -b && bunx vite build && git diff --check
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx convex codegen
git add convex/_generated/api.d.ts convex/schema.ts convex/whiteLabel/customerCredentialEncryption.ts convex/whiteLabel/customerCredentialEncryption.test.ts convex/whiteLabel/customerAccounts.ts convex/whiteLabel/customerAccounts.test.ts convex/whiteLabel/customerAccountActions.ts convex/whiteLabel/customerAccountActions.test.ts convex/whiteLabel/passwordResetEvents.ts convex/whiteLabel/passwordResetEvents.test.ts convex/workosWebhook.ts convex/teamDeletion/whiteLabelCleanup.ts convex/teamDeletionCascade.test.ts convex/whiteLabel/portalOverview.ts src/lib/whiteLabelApi.ts src/components/partner/PartnerCustomerCredentialsDialog.tsx src/components/partner/PartnerCustomerList.tsx src/components/partner/PartnerCustomerList.test.ts src/components/partner/PartnerOrganizationList.tsx src/pages/PartnerPage.tsx src/pages/PartnerPage.test.ts CONTINUITY.md
git commit -m "feat: retain partner customer credentials securely"
```

Expected: all checks PASS, apart from Vite's known non-failing chunk-size warning; code generation changes are generated, never hand-edited.
