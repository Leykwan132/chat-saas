import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { triggers } from "./triggers";
import type { Doc } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");
const HOUR_MS = 3_600_000;
const receivedAt = 1_790_000_000_000;

async function fixture(sourceType: "ad" | "post" = "ad") {
  const t = convexTest(schema, modules);
  const conversationId = await t.run((ctx) => ctx.db.insert("conversations", {
    orgId: "org-test", service: "whatsapp", orgAddress: "phone-test",
    contactAddress: "60123456789", status: "open", assignToAiAgent: false,
    threadId: "thread-test", lastMessageAt: receivedAt, unreadCount: 0,
    createdAt: receivedAt, updatedAt: receivedAt,
  }));
  async function insert(overrides: Partial<Doc<"messages">>) {
    return t.run((ctx) => triggers.wrapDB(ctx).db.insert("messages", {
      orgId: "org-test", service: "whatsapp", conversationId,
      orgAddress: "phone-test", contactAddress: "60123456789", contentType: "text",
      content: "Hello", direction: "outgoing", status: "sent",
      externalId: "wamid.test",
      createdAt: receivedAt + HOUR_MS, ...overrides,
    }));
  }
  const referralId = await insert({
    direction: "incoming", createdAt: receivedAt,
    whatsappReferral: { sourceType, sourceId: "source-test" },
  });
  const conversation = () => t.run((ctx) => ctx.db.get(conversationId));
  return { t, conversationId, referralId, insert, conversation };
}

test.each(["ad", "post"] as const)("%s referral stays pending until a successful reply", async (sourceType) => {
  const f = await fixture(sourceType);
  expect((await f.conversation())?.whatsappFreeMessagingWindow).toBeUndefined();
  expect((await f.conversation())?.whatsappReferralEntry?.replyDeadlineAt).toBe(receivedAt + 24 * HOUR_MS);
  const replyMessageId = await f.insert({});
  expect((await f.conversation())?.whatsappFreeMessagingWindow).toEqual({
    sourceMessageId: f.referralId, replyMessageId, startedAt: receivedAt + HOUR_MS,
    expiresAt: receivedAt + 73 * HOUR_MS, confirmed: false,
  });
});

test("queued, failed, and late replies do not open a free window", async () => {
  const f = await fixture();
  await f.insert({ status: "queued" });
  await f.insert({ status: "failed" });
  await f.insert({ createdAt: receivedAt + 24 * HOUR_MS });
  expect((await f.conversation())?.whatsappFreeMessagingWindow).toBeUndefined();
});

test("ordinary incoming messages and subsequent replies preserve the original expiry", async () => {
  const f = await fixture();
  await f.insert({});
  const initial = (await f.conversation())?.whatsappFreeMessagingWindow;
  await f.insert({ direction: "incoming", createdAt: receivedAt + 2 * HOUR_MS });
  await f.insert({ createdAt: receivedAt + 3 * HOUR_MS });
  expect((await f.conversation())?.whatsappFreeMessagingWindow).toEqual(initial);
});

test("Meta free-entry-point pricing confirms the window without restarting it", async () => {
  const f = await fixture();
  const replyId = await f.insert({});
  const receiptMetadata = { source: "whatsapp_status" as const, pricing: {
    billable: false, pricingModel: "PMP", type: "free_entry_point", category: "service",
    recordedAt: receivedAt + 2 * HOUR_MS,
  } };
  await f.t.run((ctx) => triggers.wrapDB(ctx).db.patch(replyId, { status: "delivered", receiptMetadata }));
  await f.t.run((ctx) => triggers.wrapDB(ctx).db.patch(replyId, { status: "read", receiptMetadata }));
  expect((await f.conversation())?.whatsappFreeMessagingWindow).toMatchObject({
    expiresAt: receivedAt + 73 * HOUR_MS, confirmed: true,
  });
});

test("failed opening reply or contradictory pricing clears the estimated window", async () => {
  const f = await fixture();
  const failedId = await f.insert({});
  await f.t.run((ctx) => triggers.wrapDB(ctx).db.patch(failedId, { status: "failed" }));
  expect((await f.conversation())?.whatsappFreeMessagingWindow).toBeUndefined();
  const billedId = await f.insert({});
  await f.t.run((ctx) => triggers.wrapDB(ctx).db.patch(billedId, { receiptMetadata: {
    source: "whatsapp_status", pricing: { billable: true, pricingModel: "PMP", type: "regular", category: "service", recordedAt: receivedAt + HOUR_MS },
  } }));
  expect((await f.conversation())?.whatsappFreeMessagingWindow).toBeUndefined();
});

test("expired windows require a new referral and a qualifying reply", async () => {
  const f = await fixture();
  await f.insert({});
  await f.insert({ createdAt: receivedAt + 80 * HOUR_MS });
  expect((await f.conversation())?.whatsappFreeMessagingWindow?.expiresAt).toBe(receivedAt + 73 * HOUR_MS);
  const sourceMessageId = await f.insert({ direction: "incoming", createdAt: receivedAt + 81 * HOUR_MS,
    whatsappReferral: { sourceType: "post", sourceId: "new-source" },
  });
  await f.insert({ createdAt: receivedAt + 82 * HOUR_MS });
  expect((await f.conversation())?.whatsappFreeMessagingWindow).toMatchObject({
    sourceMessageId, expiresAt: receivedAt + 154 * HOUR_MS,
  });
});

test("a queued reply sent after its eligibility deadline does not activate", async () => {
  const f = await fixture();
  const replyId = await f.insert({ status: "queued" });
  await f.t.run((ctx) => triggers.wrapDB(ctx).db.patch(replyId, {
    status: "sent", statusUpdatedAt: receivedAt + 25 * HOUR_MS,
  }));
  expect((await f.conversation())?.whatsappFreeMessagingWindow).toBeUndefined();
});

test("an internal message without a provider message ID cannot activate the window", async () => {
  const f = await fixture();
  await f.insert({ externalId: undefined });
  expect((await f.conversation())?.whatsappFreeMessagingWindow).toBeUndefined();
});

test("a rejected entry does not reopen on another ordinary reply", async () => {
  const f = await fixture();
  const replyId = await f.insert({});
  await f.t.run((ctx) => triggers.wrapDB(ctx).db.patch(replyId, { receiptMetadata: {
    source: "whatsapp_status", pricing: { billable: true, pricingModel: "PMP", type: "regular", category: "service", recordedAt: receivedAt + HOUR_MS },
  } }));
  await f.insert({ createdAt: receivedAt + 2 * HOUR_MS });
  expect((await f.conversation())?.whatsappFreeMessagingWindow).toBeUndefined();
});
