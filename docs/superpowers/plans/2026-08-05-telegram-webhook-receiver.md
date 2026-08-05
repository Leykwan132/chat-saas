# Telegram Webhook Receiver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Receive authenticated Telegram updates at the Convex site URL and log safe delivery metadata for connectivity verification.

**Architecture:** Keep request parsing and safe metadata extraction in `convex/telegramWebhook.ts`, where it can be tested without Convex runtime setup. Register its HTTP action from the existing router at `/webhook/telegram`.

**Tech Stack:** Convex HTTP actions, TypeScript, Vitest.

## Global Constraints

- Use Node.js v22 for every test command.
- Require the `TELEGRAM_WEBHOOK_SECRET` deployment environment value and Telegram’s `X-Telegram-Bot-Api-Secret-Token` request header.
- Log only update ID, event type, chat ID, and sender ID; never log message text or the raw request body.
- Perform no database writes and send no bot messages.
- Keep every new code module below 300 lines and add no code comments.

---

### Task 1: Add the testable Telegram request handler

**Files:**
- Create: `convex/telegramWebhook.ts`
- Create: `convex/telegramWebhook.test.ts`

**Interfaces:**
- Produces: `handleTelegramWebhookRequest(request: Request, expectedSecret: string | undefined): Promise<Response>`.
- Produces: `telegramWebhook`, an `httpAction` that calls `handleTelegramWebhookRequest` with `process.env.TELEGRAM_WEBHOOK_SECRET`.
- Consumes: Telegram JSON `Update` payloads and the `X-Telegram-Bot-Api-Secret-Token` header.

- [ ] **Step 1: Write the failing test**

```ts
test("accepts an authenticated update and logs only delivery metadata", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const response = await handleTelegramWebhookRequest(
    new Request("https://example.com/webhook/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "test-secret",
      },
      body: JSON.stringify({
        update_id: 101,
        message: {
          message_id: 2,
          text: "private message",
          chat: { id: 300 },
          from: { id: 400 },
        },
      }),
    }),
    "test-secret",
  );

  expect(response.status).toBe(200);
  expect(log).toHaveBeenCalledWith("[telegram-webhook] received", {
    updateId: 101,
    eventType: "message",
    chatId: 300,
    senderId: 400,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramWebhook.test.ts`

Expected: FAIL because `convex/telegramWebhook.ts` and its request handler do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function handleTelegramWebhookRequest(
  request: Request,
  expectedSecret: string | undefined,
): Promise<Response> {
  if (!expectedSecret) return new Response("server misconfigured", { status: 500 });
  if (request.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) {
    return new Response("unauthorized", { status: 401 });
  }

  try {
    const update = JSON.parse(await request.text()) as unknown;
    console.log("[telegram-webhook] received", extractTelegramWebhookMetadata(update));
    return new Response(null, { status: 200 });
  } catch {
    return new Response("invalid json", { status: 400 });
  }
}
```

Implement `extractTelegramWebhookMetadata` with record guards so it returns the four logged fields and never reads or logs message text.

- [ ] **Step 4: Add rejection tests and verify green**

```ts
test("rejects a request whose secret header does not match", async () => {
  const response = await handleTelegramWebhookRequest(
    new Request("https://example.com/webhook/telegram", { method: "POST" }),
    "test-secret",
  );
  expect(response.status).toBe(401);
});

test("rejects malformed JSON after authenticating the request", async () => {
  const response = await handleTelegramWebhookRequest(
    new Request("https://example.com/webhook/telegram", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": "test-secret" },
      body: "{",
    }),
    "test-secret",
  );
  expect(response.status).toBe(400);
});
```

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/telegramWebhook.test.ts`

Expected: PASS.

### Task 2: Register the public HTTP route

**Files:**
- Modify: `convex/http.ts`

**Interfaces:**
- Consumes: `telegramWebhook` from `./telegramWebhook`.
- Produces: `POST https://outstanding-rabbit-215.convex.site/webhook/telegram` after Convex deployment.

- [ ] **Step 1: Register the route**

```ts
import { telegramWebhook } from "./telegramWebhook";

http.route({
  path: "/webhook/telegram",
  method: "POST",
  handler: telegramWebhook,
});
```

- [ ] **Step 2: Verify route and type safety**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npx tsc --noEmit && bunx vitest run convex/telegramWebhook.test.ts && git diff --check`

Expected: all checks pass.

- [ ] **Step 3: Set the deployment secret and deploy when authorized**

```zsh
npx convex env set TELEGRAM_WEBHOOK_SECRET '<the generated secret>'
npx convex deploy
```

Then register `https://outstanding-rabbit-215.convex.site/webhook/telegram` with Telegram using the same secret as `secret_token`.
