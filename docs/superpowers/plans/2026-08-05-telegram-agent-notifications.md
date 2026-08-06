# Telegram Agent Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add globally reusable Telegram phone verification, up to five enabled or disabled recipients per agent, per-recipient test sends, and Telegram delivery for human escalation and appointment lifecycle events.

**Architecture:** Store Telegram identity and verification state once per canonical phone number, while a separate agent-recipient row controls whether that agent may deliver notifications. The existing authenticated Telegram HTTP endpoint will bind `/start` tokens to private chats and verify self-shared contacts; event mutations will enqueue bounded delivery jobs through a dedicated Workpool whose workers recheck current subscription and recipient state before calling Telegram.

**Tech Stack:** Convex schema/functions/HTTP actions, `@convex-dev/workpool` 0.4.8, Web Crypto, Telegram Bot API, React 19, `react-phone-number-input` 3.4.17, shadcn UI, Vitest, `convex-test`, Bun, Node.js 22.

## Global Constraints

- Run every script in the same shell as `source ~/.nvm/nvm.sh && nvm use 22`; Node.js 22 is mandatory.
- Keep every code file below 300 lines and split by responsibility before a file approaches that limit.
- Do not add explanatory code comments; use descriptive names and focused modules.
- Store phone numbers as 8–15 international digits beginning with 1–9; remove punctuation, `+`, and one leading `00`, but never infer a missing country code in the backend.
- Cap every agent at five saved subscription rows, including disabled rows; removing a row frees its slot.
- Verification tokens contain 32 random bytes, use base64url in the link, store only a SHA-256 hash, do not expire, and become invalid after verification or regeneration.
- A verified recipient is reusable by every agent subscription without another `/start` or contact share.
- Send all Telegram messages through `NOTIFICATION_BOT_TOKEN`; use `NOTIFICATION_BOT_USERNAME=notifications_kilobot` only when constructing links.
- Require `TELEGRAM_WEBHOOK_SECRET` on `POST /webhook/telegram` and accept only private-chat self-contact shares whose normalized phone matches the pending recipient.
- Never log raw phone numbers, verification tokens, webhook secrets, complete Telegram updates, customer phone numbers, transcripts, or hidden AI context.
- Test messages are available only to enabled, verified rows and reserve a 30-second per-subscription rate-limit window before calling Telegram.
- Event delivery is bounded to five enabled subscriptions, uses a dedicated Workpool, and rechecks subscription and recipient eligibility inside each worker.
- Do not deploy Convex, change deployment environment values, register a Telegram webhook, push, or update the production changelog without separate authorization.
- Preserve the unrelated local `convex/_generated/api.d.ts` changes and `docs/superpowers/plans/2026-08-03-workflow-booking-availability-row-alignment.md` file when syncing commits to the desktop branch.

---

### Task 1: Telegram domain types, phone normalization, schema, and Workpool registration

**Files:**
- Create: `convex/telegramNotifications/validators.ts`
- Create: `convex/telegramNotifications/phone.ts`
- Create: `convex/telegramNotifications/phone.test.ts`
- Create: `convex/telegramNotifications/pool.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/convex.config.ts`
- Generated: `convex/_generated/api.d.ts`
- Generated: `convex/_generated/dataModel.d.ts`

**Interfaces:**
- Produces: `normalizeTelegramPhone(value: string): string`.
- Produces: `telegramRecipientStatusValidator` with `pending | verified | blocked`.
- Produces: `telegramSubscriptionStatusValidator` with `enabled | disabled`.
- Produces: `telegramNotificationWorkpool`, configured with `maxParallelism: 3` and action retries enabled.
- Produces: tables `telegramNotificationRecipients` and `agentTelegramNotificationSubscriptions` with the indexes named below.

- [ ] **Step 1: Write failing phone-normalization tests**

```ts
import { expect, test } from "vitest";
import { normalizeTelegramPhone } from "./phone";

test.each([
  ["60129499394", "60129499394"],
  ["+60 12-949 9394", "60129499394"],
  ["0060129499394", "60129499394"],
])("normalizes %s", (input, expected) => {
  expect(normalizeTelegramPhone(input)).toBe(expected);
});

test.each(["0129499394", "1234567", "+", "0060abc"])(
  "rejects non-international input %s",
  (input) => expect(() => normalizeTelegramPhone(input)).toThrow("international phone number"),
);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramNotifications/phone.test.ts
```

Expected: FAIL because `convex/telegramNotifications/phone.ts` does not exist.

- [ ] **Step 3: Implement validators and the authoritative normalizer**

```ts
import { v } from "convex/values";

export const telegramRecipientStatusValidator = v.union(
  v.literal("pending"),
  v.literal("verified"),
  v.literal("blocked"),
);

export const telegramSubscriptionStatusValidator = v.union(
  v.literal("enabled"),
  v.literal("disabled"),
);
```

```ts
export function normalizeTelegramPhone(value: string): string {
  const trimmed = value.trim();
  const hasInternationalPrefix =
    trimmed.startsWith("+") || trimmed.startsWith("00") || /^[1-9]/.test(trimmed);
  if (
    /[A-Za-z]/.test(trimmed) ||
    (trimmed.includes("+") && !trimmed.startsWith("+")) ||
    !hasInternationalPrefix
  ) {
    throw new Error("Enter an international phone number with its country code");
  }
  const digits = trimmed.replace(/\D/g, "").replace(/^00/, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    throw new Error("Enter an international phone number with its country code");
  }
  return digits;
}
```

Keep the local-number rejection explicit: `0129499394` must not become an international value merely because punctuation was stripped.

- [ ] **Step 4: Add both tables and exact indexes to `convex/schema.ts`**

Import the shared validators near the existing schema validator imports:

```ts
import {
  telegramRecipientStatusValidator,
  telegramSubscriptionStatusValidator,
} from "./telegramNotifications/validators";
```

```ts
telegramNotificationRecipients: defineTable({
  phoneDigits: v.string(),
  status: telegramRecipientStatusValidator,
  verificationTokenHash: v.optional(v.string()),
  verificationChatId: v.optional(v.string()),
  telegramChatId: v.optional(v.string()),
  telegramUserId: v.optional(v.string()),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  verifiedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_phoneDigits", ["phoneDigits"])
  .index("by_verificationTokenHash", ["verificationTokenHash"])
  .index("by_verificationChatId_and_updatedAt", ["verificationChatId", "updatedAt"])
  .index("by_telegramChatId", ["telegramChatId"])
  .index("by_telegramUserId", ["telegramUserId"]),
agentTelegramNotificationSubscriptions: defineTable({
  agentId: v.id("agents"),
  recipientId: v.id("telegramNotificationRecipients"),
  status: telegramSubscriptionStatusValidator,
  lastTestSentAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_agentId", ["agentId"])
  .index("by_agentId_and_status", ["agentId", "status"])
  .index("by_agentId_and_recipientId", ["agentId", "recipientId"])
  .index("by_recipientId", ["recipientId"]),
```

- [ ] **Step 5: Register and instantiate the dedicated Workpool**

Add this component in `convex/convex.config.ts`:

```ts
app.use(workpool, { name: "telegramNotificationWorkpool" });
```

Create `convex/telegramNotifications/pool.ts`:

```ts
import { Workpool } from "@convex-dev/workpool";
import { components } from "../_generated/api";

export const telegramNotificationWorkpool = new Workpool(
  components.telegramNotificationWorkpool,
  { maxParallelism: 3, retryActionsByDefault: true },
);
```

- [ ] **Step 6: Run the focused test, code generation, and whitespace check**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramNotifications/phone.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
git diff --check
```

Expected: phone tests PASS, code generation succeeds, and whitespace check is clean.

- [ ] **Step 7: Commit the domain foundation**

```bash
git add convex/telegramNotifications/validators.ts convex/telegramNotifications/phone.ts convex/telegramNotifications/phone.test.ts convex/telegramNotifications/pool.ts convex/schema.ts convex/convex.config.ts convex/_generated/api.d.ts convex/_generated/dataModel.d.ts
git commit -m "Add Telegram notification data model"
```

### Task 2: Recipient and agent-subscription management

**Files:**
- Create: `convex/telegramNotifications/config.ts`
- Create: `convex/telegramNotifications/token.ts`
- Create: `convex/telegramNotifications/subscriptionAccess.ts`
- Create: `convex/telegramNotifications/subscriptions.ts`
- Create: `convex/telegramNotifications/subscriptions.test.ts`
- Modify: `convex/agents.ts`
- Modify: `convex/teamDeletion/localDescendants.ts`
- Generated: `convex/_generated/api.d.ts`

**Interfaces:**
- Produces: `createVerificationToken(): Promise<{ rawToken: string; tokenHash: string }>` and `hashVerificationToken(rawToken: string): Promise<string>`.
- Produces: `requireNotificationBotToken(environment)` and `requireNotificationBotUsername(environment)` from one environment boundary.
- Produces public APIs `listForAgent`, `add`, `regenerateVerificationLink`, `setEnabled`, and `remove` under `api.telegramNotifications.subscriptions`.
- `add({ agentId, phone })` returns `{ subscriptionId, state: "connected" }` for a verified recipient or `{ subscriptionId, state: "pending", verificationUrl }` otherwise.
- `listForAgent({ agentId })` returns at most five rows with `subscriptionId`, authorized `phoneNumber` display in `+<digits>` form, `state`, `enabled`, `canSendTest`, and `lastTestSentAt` but never Telegram IDs or token hashes.
- Produces: `deleteSubscriptionsForAgent(ctx: MutationCtx, agentId: Id<"agents">): Promise<void>`.

- [ ] **Step 1: Write failing Convex tests for subscription behavior**

Create fixtures for a personal agent owner, another user, and two agents. Cover these exact assertions:

```ts
const first = await owner.mutation(api.telegramNotifications.subscriptions.add, {
  agentId: firstAgentId,
  phone: "+60 12-949 9394",
});
expect(first.state).toBe("pending");
expect(first).toHaveProperty("verificationUrl");

await expect(owner.mutation(api.telegramNotifications.subscriptions.add, {
  agentId: firstAgentId,
  phone: "60129499394",
})).rejects.toThrow("already added");

await expect(owner.mutation(api.telegramNotifications.subscriptions.add, {
  agentId: firstAgentId,
  phone: "60111111116",
})).rejects.toThrow("five Telegram recipients");

await expect(otherUser.query(api.telegramNotifications.subscriptions.listForAgent, {
  agentId: firstAgentId,
})).rejects.toThrow("Agent not found");
```

Also seed the first recipient as `verified`, add the same phone to the second agent, and assert `state === "connected"` with no `verificationUrl`. Remove the second-agent subscription and assert that the recipient document and first-agent subscription remain.

Assert the generated start value contains exactly 43 base64url characters, only its SHA-256 hash is stored, and the raw token never appears in either table.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramNotifications/subscriptions.test.ts
```

Expected: FAIL because the subscription functions do not exist.

- [ ] **Step 3: Implement token and environment helpers**

```ts
function bytesToBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function hashVerificationToken(rawToken: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(rawToken),
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function createVerificationToken() {
  const rawToken = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  return { rawToken, tokenHash: await hashVerificationToken(rawToken) };
}
```

`config.ts` must fail closed:

```ts
export function requireNotificationBotUsername(environment: Record<string, string | undefined>) {
  const username = environment.NOTIFICATION_BOT_USERNAME?.trim().replace(/^@/, "");
  if (!username) throw new Error("NOTIFICATION_BOT_USERNAME is not configured");
  return username;
}

export function requireNotificationBotToken(environment: Record<string, string | undefined>) {
  const token = environment.NOTIFICATION_BOT_TOKEN?.trim();
  if (!token) throw new Error("NOTIFICATION_BOT_TOKEN is not configured");
  return token;
}

export function buildTelegramVerificationUrl(username: string, rawToken: string) {
  return `https://t.me/${username}?start=${rawToken}`;
}
```

- [ ] **Step 4: Implement bounded management functions and derived row states**

Use `assertManageableAgent` for every public query or mutation. Use only indexed reads with `.unique()` for phone and agent-recipient identity, and `.take(6)` when enforcing the five-row limit. Adding a new or existing pending recipient creates an enabled subscription and rotates the recipient-level token. Adding a verified recipient creates the subscription without touching its verification fields. Regenerating for a blocked recipient must clear `telegramChatId`, `telegramUserId`, and stale names, change the recipient to `pending`, and store the replacement token hash before returning the new link.

Derive UI state with this priority:

```ts
function subscriptionState(
  subscriptionStatus: "enabled" | "disabled",
  recipientStatus: "pending" | "verified" | "blocked",
) {
  if (subscriptionStatus === "disabled") return "disabled" as const;
  if (recipientStatus === "blocked") return "blocked" as const;
  if (recipientStatus === "verified") return "connected" as const;
  return "pending" as const;
}
```

Return the canonical number to the authorized manager as `phoneNumber: "+" + recipient.phoneDigits`. Do not expose it through errors or logs, and do not return `verificationTokenHash`, `verificationChatId`, `telegramChatId`, or `telegramUserId`.

- [ ] **Step 5: Implement subscription cleanup for both agent-deletion paths**

```ts
export async function deleteSubscriptionsForAgent(
  ctx: MutationCtx,
  agentId: Id<"agents">,
) {
  const subscriptions = await ctx.db
    .query("agentTelegramNotificationSubscriptions")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .take(5);
  for (const subscription of subscriptions) {
    await ctx.db.delete(subscription._id);
  }
}
```

Call this before `ctx.db.delete(args.agentId)` in `convex/agents.ts` and inside `deleteAgentPage` in `convex/teamDeletion/localDescendants.ts`. Never delete shared recipient rows from either path.

- [ ] **Step 6: Run tests and code generation**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramNotifications/subscriptions.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
git diff --check
```

Expected: subscription tests PASS, generated API contains `telegramNotifications/subscriptions`, and whitespace check is clean.

- [ ] **Step 7: Commit recipient management**

```bash
git add convex/telegramNotifications/config.ts convex/telegramNotifications/token.ts convex/telegramNotifications/subscriptionAccess.ts convex/telegramNotifications/subscriptions.ts convex/telegramNotifications/subscriptions.test.ts convex/agents.ts convex/teamDeletion/localDescendants.ts convex/_generated/api.d.ts
git commit -m "Add Telegram recipient subscriptions"
```

### Task 3: Token-based Telegram webhook verification

**Files:**
- Create: `convex/telegramNotifications/telegramApi.ts`
- Create: `convex/telegramNotifications/updateParser.ts`
- Create: `convex/telegramNotifications/verification.ts`
- Modify: `convex/telegramWebhook.ts`
- Modify: `convex/telegramWebhook.test.ts`
- Generated: `convex/_generated/api.d.ts`

**Interfaces:**
- Produces: `parseTelegramUpdate(update: unknown): TelegramPrivateMessageUpdate | null` with string chat and user IDs.
- Produces: `sendTelegramMessage(botToken, request): Promise<{ messageId?: number }>` with safe error classification.
- Produces internal mutations `bindVerificationChat` and `verifySharedContact`.
- Keeps `telegramWebhook` as the stable `httpAction` imported by `convex/http.ts`.

- [ ] **Step 1: Replace development-trigger tests with failing verification-flow tests**

Keep authentication and malformed-JSON tests, then add these cases:

```ts
expect(parseTelegramUpdate({
  update_id: 101,
  message: {
    text: "/start abc_def-123",
    chat: { id: 300, type: "private" },
    from: { id: 400 },
  },
})).toMatchObject({
  updateId: 101,
  chatId: "300",
  senderId: "400",
  text: "/start abc_def-123",
});
```

Use `convex-test` to seed a pending recipient and assert:

- `/start` with the correct token hash writes `verificationChatId` and sends the contact keyboard.
- Unknown, already-used, and malformed tokens receive one generic invalid-link message.
- A matching self-contact share verifies the recipient, stores chat/user/name fields, clears token/session fields, and makes every enabled subscription connected.
- `contact.user_id !== message.from.id`, mismatched phone, non-private messages, and contacts without a bound pending recipient never verify.
- Logs contain only update ID, event kind, and booleans; no test phone, raw token, or complete update appears.

- [ ] **Step 2: Run the focused webhook tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramWebhook.test.ts
```

Expected: FAIL because token parsing and verification mutations are not implemented.

- [ ] **Step 3: Implement the narrow Telegram API client**

```ts
export type TelegramSendRequest = {
  chatId: string;
  text: string;
  replyMarkup?: Record<string, unknown>;
};

export class TelegramDeliveryError extends Error {
  constructor(
    public readonly kind: "blocked" | "unavailable" | "transient" | "permanent",
    message: string,
  ) {
    super(message);
  }
}
```

`sendTelegramMessage` must POST JSON to `sendMessage`, parse `{ ok, result, error_code, description }`, never include the token in thrown messages, classify HTTP 429/5xx as `transient`, classify bot-blocked and chat-not-found responses as `blocked` or `unavailable`, and classify other 4xx responses as `permanent`.

- [ ] **Step 4: Implement recipient-level verification mutations**

`bindVerificationChat({ tokenHash, chatId })` must:

1. Look up the recipient through `by_verificationTokenHash`.
2. Require `status === "pending"` and an exact stored hash.
3. Clear any other recipient currently bound to the same chat using `by_verificationChatId_and_updatedAt` with a bounded `.take(10)`.
4. Store `verificationChatId` and `updatedAt` on the selected recipient.
5. Return `{ accepted: true }` or `{ accepted: false }` without recipient details.

`verifySharedContact` must accept string chat/sender/contact-user IDs and the raw Telegram phone/name fields. It normalizes the phone server-side, finds the newest pending recipient bound to that chat, requires self-contact ownership and exact phone equality, then atomically patches:

```ts
{
  status: "verified",
  telegramChatId: args.chatId,
  telegramUserId: args.senderId,
  firstName: args.firstName,
  lastName: args.lastName,
  verifiedAt: now,
  verificationTokenHash: undefined,
  verificationChatId: undefined,
  updatedAt: now,
}
```

- [ ] **Step 5: Refactor `convex/telegramWebhook.ts` into a stable thin entrypoint**

The authenticated handler must:

1. Parse JSON once.
2. Emit one redacted log record.
3. For exact `/start <token>`, hash the token, call `bindVerificationChat`, and send either the friendly contact keyboard or the generic invalid-link message.
4. For a contact, call `verifySharedContact` and send `Your notifications are ready!` only after a successful match.
5. Return HTTP 200 for processed Telegram updates, 400 for invalid JSON, 401 for secret mismatch, and 500 when the server secret is absent.

Delete the exact `Hi` trigger and all raw request/message/contact logging. Keep `convex/http.ts` unchanged because its route already points at `telegramWebhook`.
Move `requireNotificationBotToken` out of `convex/telegramWebhook.ts` and import the shared helper from `config.ts` so webhook, test-send, and worker paths cannot diverge.

- [ ] **Step 6: Run tests, code generation, and the 300-line check**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramWebhook.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
wc -l convex/telegramWebhook.ts convex/telegramNotifications/*.ts
git diff --check
```

Expected: webhook tests PASS, every listed code file is below 300 lines, and whitespace check is clean.

- [ ] **Step 7: Commit the verification flow**

```bash
git add convex/telegramNotifications/telegramApi.ts convex/telegramNotifications/updateParser.ts convex/telegramNotifications/verification.ts convex/telegramWebhook.ts convex/telegramWebhook.test.ts convex/_generated/api.d.ts
git commit -m "Verify Telegram notification recipients"
```

### Task 4: Authorized and rate-limited test messages

**Files:**
- Create: `convex/telegramNotifications/testMessage.ts`
- Create: `convex/telegramNotifications/testMessage.test.ts`
- Modify: `convex/telegramNotifications/subscriptionAccess.ts`
- Generated: `convex/_generated/api.d.ts`

**Interfaces:**
- Produces public action `send({ subscriptionId }): Promise<{ sent: true }>` under `api.telegramNotifications.testMessage`.
- Produces internal mutation `reserve` returning `{ subscriptionId, recipientId, chatId, agentName }` only to the action.
- Produces internal mutation `markRecipientBlocked({ recipientId })`.

- [ ] **Step 1: Write failing test-send tests**

Seed one verified recipient and enabled subscription, mock `fetch`, and assert the exact outbound body:

```ts
expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
  chat_id: "7499620613",
  text: "✅ Test notification\n\nNotifications from Support Agent are connected and ready.",
});
```

Also assert:

- The same subscription cannot reserve twice within 30 seconds.
- A reservation succeeds after `lastTestSentAt` is older than 30 seconds.
- Pending, blocked, disabled, removed, chatless, cross-agent, and unauthenticated cases fail before `fetch`.
- A Telegram blocked-chat response changes the shared recipient to `blocked`.
- No phone number appears in thrown errors or logs.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramNotifications/testMessage.test.ts
```

Expected: FAIL because `testMessage.send` does not exist.

- [ ] **Step 3: Implement atomic reservation and delivery**

The reservation mutation must call `assertManageableAgent` through the subscription’s `agentId`, re-read the recipient, verify enabled/verified/chat-present state, reject `lastTestSentAt > Date.now() - 30_000`, and patch the timestamp before returning the private chat context.

The action must use `requireNotificationBotToken(process.env)` and `sendTelegramMessage`. On `blocked` or `unavailable`, call `markRecipientBlocked` and throw `Telegram is no longer connected for this phone number.` On transient or permanent errors, return a safe failure message without provider payloads.

- [ ] **Step 4: Run tests and code generation**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramNotifications/testMessage.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
git diff --check
```

Expected: test-send tests PASS and whitespace check is clean.

- [ ] **Step 5: Commit test delivery**

```bash
git add convex/telegramNotifications/testMessage.ts convex/telegramNotifications/testMessage.test.ts convex/telegramNotifications/subscriptionAccess.ts convex/_generated/api.d.ts
git commit -m "Add Telegram notification test sends"
```

### Task 5: Bounded notification dispatch and message formatting

**Files:**
- Create: `convex/telegramNotifications/eventPayload.ts`
- Create: `convex/telegramNotifications/messageFormatter.ts`
- Create: `convex/telegramNotifications/dispatch.ts`
- Create: `convex/telegramNotifications/worker.ts`
- Create: `convex/telegramNotifications/delivery.test.ts`
- Generated: `convex/_generated/api.d.ts`

**Interfaces:**
- Produces discriminated `TelegramNotificationEvent` kinds `human_escalation`, `appointment_booked`, `appointment_updated`, and `appointment_cancelled`.
- Produces: `formatTelegramNotification(event: TelegramNotificationEvent): string`.
- Produces: `enqueueTelegramNotification(ctx, { agentId, event }): Promise<number>`.
- Produces internal query `getDeliveryContext({ subscriptionId })` and internal action `sendNotification({ subscriptionId, event })`.

- [ ] **Step 1: Write failing formatter and eligibility tests**

Use fixed timestamps and `Intl.DateTimeFormat("en-MY", { timeZone: event.timeZone, ... })` to assert complete plain-text messages. The appointment test must include the event title, agent name, customer name, localized date/time, and calendar link while excluding the customer phone and raw custom-field record. The escalation test must include the question and inbox link while excluding escalation context.

Seed six subscriptions and assert delivery resolution takes only the five enabled rows for the target agent. Assert that another agent’s subscription plus disabled, pending, blocked, removed, and chatless recipients are skipped.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramNotifications/delivery.test.ts
```

Expected: FAIL because the event, formatter, dispatch, and worker modules do not exist.

- [ ] **Step 3: Define the exact event union and validators**

```ts
export type TelegramNotificationEvent =
  | {
      kind: "human_escalation";
      agentName: string;
      customerName: string;
      question: string;
      dashboardUrl: string;
    }
  | {
      kind: "appointment_booked" | "appointment_updated" | "appointment_cancelled";
      agentName: string;
      serviceName: string;
      customerName: string;
      startAt: number;
      endAt: number;
      timeZone: string;
      dashboardUrl: string;
    };
```

Mirror this union with Convex validators. All string fields must be trimmed and bounded before enqueue: names at 100 characters and the escalation question at 300 characters.

- [ ] **Step 4: Implement the bounded dispatch entrypoint**

```ts
export async function enqueueTelegramNotification(
  ctx: MutationCtx,
  args: { agentId: Id<"agents">; event: TelegramNotificationEvent },
) {
  const subscriptions = await ctx.db
    .query("agentTelegramNotificationSubscriptions")
    .withIndex("by_agentId_and_status", (q) =>
      q.eq("agentId", args.agentId).eq("status", "enabled"),
    )
    .take(5);
  for (const subscription of subscriptions) {
    await telegramNotificationWorkpool.enqueueAction(
      ctx,
      internal.telegramNotifications.worker.sendNotification,
      { subscriptionId: subscription._id, event: args.event },
    );
  }
  return subscriptions.length;
}
```

- [ ] **Step 5: Implement worker rechecks and safe Telegram error handling**

`getDeliveryContext` must return a skip result unless the subscription still exists and is enabled and its recipient is verified with a chat ID. `sendNotification` must format plain text, use `NOTIFICATION_BOT_TOKEN`, mark the recipient blocked for blocked/unavailable responses, return a skipped result for permanent failures, and throw a safe error for transient failures so Workpool retries it. Do not add an application outbox or delivery-history table.

- [ ] **Step 6: Run tests, code generation, and line checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramNotifications/delivery.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
wc -l convex/telegramNotifications/eventPayload.ts convex/telegramNotifications/messageFormatter.ts convex/telegramNotifications/dispatch.ts convex/telegramNotifications/worker.ts
git diff --check
```

Expected: delivery tests PASS, every code file is below 300 lines, and whitespace check is clean.

- [ ] **Step 7: Commit dispatch infrastructure**

```bash
git add convex/telegramNotifications/eventPayload.ts convex/telegramNotifications/messageFormatter.ts convex/telegramNotifications/dispatch.ts convex/telegramNotifications/worker.ts convex/telegramNotifications/delivery.test.ts convex/_generated/api.d.ts
git commit -m "Add Telegram notification dispatch"
```

### Task 6: Human-escalation notification integration

**Files:**
- Create: `convex/telegramNotifications/appUrls.ts`
- Create: `convex/telegramNotifications/escalationEvent.ts`
- Create: `convex/telegramNotifications/escalationEvent.test.ts`
- Modify: `convex/chat/inbox.ts`
- Modify: `convex/escalation.test.ts`

**Interfaces:**
- Produces: `enqueueHumanEscalationNotification(ctx, { agent, conversation, question }): Promise<number>`.
- Consumes: `enqueueTelegramNotification` and the `human_escalation` event union from Task 5.

- [ ] **Step 1: Write failing escalation-event tests**

Assert that the event builder:

- Uses `customer.name` only when available and otherwise says `Customer`; it never falls back to `customer.phone` or `conversation.contactAddress`.
- Trims and caps the escalation question at 300 characters.
- Builds `${APP_BASE_URL}/dashboard/${agentId}/inbox` with duplicate slashes removed from the base.
- Enqueues only after `internalEscalateConversation` writes `requires_user_input` and `escalation_raised`.
- Does not enqueue when escalation is unavailable or the conversation has no assigned agent.

Set `process.env.APP_BASE_URL = "https://app.example.com"` in event tests and restore the previous value after each file.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramNotifications/escalationEvent.test.ts convex/escalation.test.ts
```

Expected: FAIL because the escalation event helper and integration call do not exist.

- [ ] **Step 3: Implement strict dashboard URL and event construction**

```ts
export function requireAppBaseUrl(environment: Record<string, string | undefined>) {
  const value = environment.APP_BASE_URL?.trim().replace(/\/+$/, "");
  if (!value) throw new Error("APP_BASE_URL is not configured");
  return value;
}
```

`enqueueHumanEscalationNotification` loads `conversation.customerId` when present, derives a safe customer name, creates the inbox URL, and delegates to `enqueueTelegramNotification`.

- [ ] **Step 4: Call the helper at the escalation state boundary**

In `internalEscalateConversation`, call the helper after the conversation patch, action log, and analytics-dirty write succeed:

```ts
await enqueueHumanEscalationNotification(ctx, {
  agent,
  conversation: conv,
  question: args.question,
});
```

Do not include `args.context` in the notification payload.

- [ ] **Step 5: Run focused tests and whitespace checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramNotifications/escalationEvent.test.ts convex/escalation.test.ts
git diff --check
```

Expected: escalation notification and existing lifecycle tests PASS.

- [ ] **Step 6: Commit escalation integration**

```bash
git add convex/telegramNotifications/appUrls.ts convex/telegramNotifications/escalationEvent.ts convex/telegramNotifications/escalationEvent.test.ts convex/chat/inbox.ts convex/escalation.test.ts
git commit -m "Notify Telegram recipients on escalation"
```

### Task 7: Appointment booking, update, and cancellation integration

**Files:**
- Create: `convex/telegramNotifications/appointmentEvent.ts`
- Create: `convex/telegramNotifications/appointmentChange.ts`
- Create: `convex/telegramNotifications/appointmentEvent.test.ts`
- Modify: `convex/appointmentBooking/bookingEvents.ts`
- Modify: `convex/appointmentBooking/updateAppointment.ts`
- Modify: `convex/appointmentBooking/cancellations.ts`
- Modify: `convex/appointmentBooking/statusTransition.ts`
- Modify: `convex/calendarEvents.ts`
- Modify: `convex/calendarManualBooking.test.ts`
- Modify: `convex/appointmentBookingCancel.test.ts`
- Modify: `convex/appointmentBookingStatusTransition.test.ts`
- Modify: `convex/calendarEvents.test.ts`

**Interfaces:**
- Produces: `enqueueAppointmentNotification(ctx, { appointmentId, kind }): Promise<number>`.
- Produces: `classifyAppointmentChange(previous, requested): "appointment_updated" | "appointment_cancelled" | null`.
- Consumes: appointment event variants and `enqueueTelegramNotification` from Task 5.

- [ ] **Step 1: Write failing appointment-event and transition tests**

Cover these exact cases:

- AI and staff/manual booking creation enqueue `appointment_booked` through `handleBookingCreated`.
- AI rescheduling enqueues one `appointment_updated`.
- Calendar edits enqueue `appointment_updated` only when title, schedule, assignee, customer details, status, or remarks materially change.
- A transition from non-cancelled to cancelled enqueues only `appointment_cancelled`.
- Rewriting an already-cancelled event does not enqueue another cancellation.
- `cancelBookingSession` discarding an edit does not notify because the original appointment is unchanged.
- Status changes to `completed`, `no_show`, or back to `booked` enqueue `appointment_updated` only when the stored status changes.
- Generic calendar events without `agentId` do not enqueue.
- Message payloads use participant display name, service name/title, schedule, timezone, and the agent calendar URL; they never include customer phone or full custom-field data.

Set `process.env.APP_BASE_URL = "https://app.example.com"` in these tests and restore the previous value afterward.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramNotifications/appointmentEvent.test.ts convex/calendarManualBooking.test.ts convex/appointmentBookingCancel.test.ts convex/appointmentBookingStatusTransition.test.ts convex/calendarEvents.test.ts
```

Expected: FAIL because appointment notifications are not integrated.

- [ ] **Step 3: Implement appointment snapshot construction**

`enqueueAppointmentNotification` must load the event, skip when `agentId` is missing, then load the agent, appointment service, and at most 50 participants through `by_eventId`. Use the customer participant’s display name or `Customer`; never use its email when it is a phone-like contact address. Build `${APP_BASE_URL}/dashboard/${agentId}/calendar` and enqueue the bounded snapshot.

- [ ] **Step 4: Centralize material-change classification**

```ts
export function classifyAppointmentChange(
  previous: Pick<Doc<"calendarEvents">, "status" | "title" | "startAt" | "endAt" | "timeZone" | "remarks">,
  next: Partial<Pick<Doc<"calendarEvents">, "status" | "title" | "startAt" | "endAt" | "timeZone" | "remarks">> & {
    participantsChanged?: boolean;
    customerFieldsChanged?: boolean;
  },
) {
  if (next.status === "cancelled" && previous.status !== "cancelled") {
    return "appointment_cancelled" as const;
  }
  const changed = next.participantsChanged || next.customerFieldsChanged ||
    (["status", "title", "startAt", "endAt", "timeZone", "remarks"] as const)
      .some((key) => next[key] !== undefined && next[key] !== previous[key]);
  return changed ? "appointment_updated" as const : null;
}
```

- [ ] **Step 5: Integrate every authoritative booking transition once**

- In `handleBookingCreated`, enqueue `appointment_booked` after reminder scheduling is requested.
- In `updateBookingAppointment`, enqueue `appointment_updated` after event, participant, session, conversation, and reminder updates.
- In each true-cancellation branch of `cancelBookingSession`, enqueue `appointment_cancelled` after the event becomes cancelled; do not call it when merely abandoning an edit.
- In `updateAppointmentBookingStatus`, compare the old session/event state and enqueue cancellation or update only after both rows and reminders are updated.
- In `calendarEvents.update`, classify against the pre-write event and the actual participant/customer-field changes, then enqueue exactly one event after all writes and conversation logging.
- Replace the touched booking-session `.collect()` in `calendarEvents.update` with a bounded `.take(100)` while preserving its existing selection logic.
- Do not send notification events from `calendarEvents.remove`; deletion remains distinct from cancellation.

- [ ] **Step 6: Run appointment and delivery regressions**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramNotifications/appointmentEvent.test.ts convex/telegramNotifications/delivery.test.ts convex/calendarManualBooking.test.ts convex/appointmentBookingCancel.test.ts convex/appointmentBookingStatusTransition.test.ts convex/calendarEvents.test.ts
git diff --check
```

Expected: all focused appointment and Telegram delivery tests PASS with no duplicate cancellation case.

- [ ] **Step 7: Commit appointment integrations**

```bash
git add convex/telegramNotifications/appointmentEvent.ts convex/telegramNotifications/appointmentChange.ts convex/telegramNotifications/appointmentEvent.test.ts convex/appointmentBooking/bookingEvents.ts convex/appointmentBooking/updateAppointment.ts convex/appointmentBooking/cancellations.ts convex/appointmentBooking/statusTransition.ts convex/calendarEvents.ts convex/calendarManualBooking.test.ts convex/appointmentBookingCancel.test.ts convex/appointmentBookingStatusTransition.test.ts convex/calendarEvents.test.ts
git commit -m "Notify Telegram recipients on booking changes"
```

### Task 8: Agent Setup recipient-management UI

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Create: `src/components/agent-setup/TelegramPhoneInput.tsx`
- Create: `src/components/agent-setup/TelegramNotificationRecipientRow.tsx`
- Create: `src/components/agent-setup/TelegramNotificationsPanel.tsx`
- Create: `src/components/agent-setup/telegramNotificationPresentation.ts`
- Create: `src/components/agent-setup/TelegramNotificationsPanel.test.tsx`
- Modify: `src/components/agent-setup/AgentSetupPanels.tsx`
- Modify: `src/components/agent-setup/AgentSetupPanels.test.ts`

**Interfaces:**
- Produces: `<TelegramNotificationsPanel agentId={agentId} />` in the existing Agent Setup right-side settings column.
- Consumes: `api.telegramNotifications.subscriptions.*` and `api.telegramNotifications.testMessage.send`.
- Uses `react-phone-number-input` to emit E.164 values while the backend normalizer remains authoritative.

- [ ] **Step 1: Install the country-aware phone input dependency**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun add react-phone-number-input@3.4.17
```

Expected: `package.json` and `bun.lock` add the MIT-licensed package with built-in TypeScript declarations.

- [ ] **Step 2: Write failing presentation and placement tests**

Test derived row controls:

```ts
expect(actionsForTelegramRow({ state: "connected", enabled: true })).toEqual([
  "test",
  "disable",
  "remove",
]);
expect(actionsForTelegramRow({ state: "pending", enabled: true })).toEqual([
  "copy_link",
  "disable",
  "remove",
]);
expect(actionsForTelegramRow({ state: "blocked", enabled: true })).toEqual([
  "reconnect",
  "disable",
  "remove",
]);
expect(actionsForTelegramRow({ state: "disabled", enabled: false })).toEqual([
  "enable",
  "remove",
]);
```

Add a source contract asserting `AgentSetupPanels.tsx` renders `<TelegramNotificationsPanel agentId={agentId} />` after `AgentSetupRoutingPanel` in the same aside.

- [ ] **Step 3: Run UI tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-setup/TelegramNotificationsPanel.test.tsx src/components/agent-setup/AgentSetupPanels.test.ts
```

Expected: FAIL because the panel and presentation helper do not exist.

- [ ] **Step 4: Implement the phone input and compact recipient rows**

`TelegramPhoneInput` wraps the package’s country-select input, imports `react-phone-number-input/style.css`, uses `international`, and returns an E.164 string such as `+60129499394`. Do not set a default country; the user must choose one or type an explicit international number.

Each row displays the authorized `+<digits>` phone number, one `Pending`, `Connected`, `Blocked`, or `Disabled` badge, and only the actions from `actionsForTelegramRow`. Use a destructive confirmation dialog before remove. Show per-row busy state so one operation does not disable unrelated recipients.

- [ ] **Step 5: Implement panel data and actions**

The panel must:

- Query `listForAgent` and display `n of 5 phone numbers`.
- Disable Add at five rows or while the submitted phone is empty.
- On pending add or reconnect, call the mutation, immediately copy `verificationUrl` with `navigator.clipboard.writeText`, and toast `Telegram verification link copied`.
- On connected add, toast `Phone number connected` without showing a link.
- Call the test action only for connected enabled rows and toast `Test notification sent` on success.
- Enable, disable, and remove through their mutations, showing safe backend errors through Sonner.
- Explain once: `Verified phone numbers reconnect automatically when added to another agent.`

- [ ] **Step 6: Add the panel to Agent Setup and run focused UI verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-setup/TelegramNotificationsPanel.test.tsx src/components/agent-setup/AgentSetupPanels.test.ts src/pages/InstructionsPage.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/agent-setup/TelegramPhoneInput.tsx src/components/agent-setup/TelegramNotificationRecipientRow.tsx src/components/agent-setup/TelegramNotificationsPanel.tsx src/components/agent-setup/telegramNotificationPresentation.ts src/components/agent-setup/AgentSetupPanels.tsx
wc -l src/components/agent-setup/TelegramPhoneInput.tsx src/components/agent-setup/TelegramNotificationRecipientRow.tsx src/components/agent-setup/TelegramNotificationsPanel.tsx
git diff --check
```

Expected: focused tests and scoped lint PASS, every new component is below 300 lines, and whitespace check is clean.

- [ ] **Step 7: Commit the Agent Setup UI**

```bash
git add package.json bun.lock src/components/agent-setup/TelegramPhoneInput.tsx src/components/agent-setup/TelegramNotificationRecipientRow.tsx src/components/agent-setup/TelegramNotificationsPanel.tsx src/components/agent-setup/telegramNotificationPresentation.ts src/components/agent-setup/TelegramNotificationsPanel.test.tsx src/components/agent-setup/AgentSetupPanels.tsx src/components/agent-setup/AgentSetupPanels.test.ts
git commit -m "Add Telegram notification settings"
```

### Task 9: Integrated verification and handoff

**Files:**
- Modify: `CONTINUITY.md`
- Modify only if production deployment is separately confirmed: `kilobot-docs/docs/releases/changelog.mdx`

**Interfaces:**
- Verifies every public and internal contract added in Tasks 1–8.
- Leaves deployment environment changes, webhook registration, production deployment, push, and changelog publication untouched unless separately authorized.

- [ ] **Step 1: Run the complete focused Telegram and event suite**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramNotifications/phone.test.ts convex/telegramNotifications/subscriptions.test.ts convex/telegramNotifications/testMessage.test.ts convex/telegramNotifications/delivery.test.ts convex/telegramNotifications/escalationEvent.test.ts convex/telegramNotifications/appointmentEvent.test.ts convex/telegramWebhook.test.ts convex/escalation.test.ts convex/calendarManualBooking.test.ts convex/appointmentBookingCancel.test.ts convex/appointmentBookingStatusTransition.test.ts convex/calendarEvents.test.ts src/components/agent-setup/TelegramNotificationsPanel.test.tsx src/components/agent-setup/AgentSetupPanels.test.ts src/pages/InstructionsPage.test.ts
```

Expected: all focused tests PASS.

- [ ] **Step 2: Run code generation, TypeScript, build, line, and whitespace checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
rg --files convex/telegramNotifications src/components/agent-setup | rg '\.(ts|tsx)$' | xargs wc -l
git diff --check
```

Expected: code generation, TypeScript, and production build succeed; every changed code file remains below 300 lines; whitespace check is clean.

- [ ] **Step 3: Review privacy, authorization, and bounded-query contracts**

Run:

```bash
rg -n "phoneDigits|verificationTokenHash|verificationChatId|telegramChatId|telegramUserId" convex/telegramNotifications convex/telegramWebhook.ts
rg -n "console\.(log|error)|\.collect\(|\.filter\(" convex/telegramNotifications convex/telegramWebhook.ts
rg -n --pcre2 '(^|[^A-Z_])BOT_TOKEN([^A-Z_]|$)|NOTIFICATION_BOT_TOKEN|TELEGRAM_WEBHOOK_SECRET' convex/telegramNotifications convex/telegramWebhook.ts
```

Expected:

- Verification hashes and Telegram chat/user IDs appear only in storage/internal verification code, not public list results or log arguments; the formatted phone number appears only in the authorized settings result and UI.
- No unbounded `.collect()` or database `.filter()` exists in the Telegram feature.
- Every outbound send uses `NOTIFICATION_BOT_TOKEN`; the standalone legacy `BOT_TOKEN` name does not appear.
- Webhook logs contain no message text, phone, token, or complete update.

- [ ] **Step 4: Record the verified local result in continuity**

Update `CONTINUITY.md` with the exact tests/build run, feature state, local commit/branch, and the fact that deployment, webhook registration, and production availability remain unconfirmed. Do not add a changelog entry.

- [ ] **Step 5: Commit the verified implementation state**

```bash
git add convex/_generated/api.d.ts convex/_generated/dataModel.d.ts CONTINUITY.md
git commit -m "Verify Telegram agent notifications"
```

- [ ] **Step 6: Prepare but do not execute the development webhook handoff**

After separate deployment authorization, the operator will configure the same deployment and register the notification bot with commands shaped like:

```bash
npx convex env set NOTIFICATION_BOT_TOKEN 'ROTATED_NOTIFICATION_BOT_TOKEN'
npx convex env set NOTIFICATION_BOT_USERNAME 'notifications_kilobot'
npx convex env set TELEGRAM_WEBHOOK_SECRET 'GENERATED_WEBHOOK_SECRET'
curl -sS -X POST "https://api.telegram.org/botROTATED_NOTIFICATION_BOT_TOKEN/setWebhook" \
  -d "url=https://outstanding-rabbit-215.convex.site/webhook/telegram" \
  -d "secret_token=GENERATED_WEBHOOK_SECRET"
curl -sS "https://api.telegram.org/botROTATED_NOTIFICATION_BOT_TOKEN/getWebhookInfo"
```

These are handoff templates only. Never place a real bot token or webhook secret in Git, logs, the plan, or a shell command shown back to the user.
