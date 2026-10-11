import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { triggers } from "./triggers";
import type { Doc } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");
const receivedAt = 1_790_000_000_000;

async function fixture() {
  const t = convexTest(schema, modules);
  const customerId = await t.run((ctx) => ctx.db.insert("customers", {
    orgId: "org-test", service: "whatsapp", source: "whatsapp",
    contactAddress: "60123456789", tags: [], firstSeenAt: receivedAt,
    lastSeenAt: receivedAt, createdAt: receivedAt, updatedAt: receivedAt,
  }));
  const conversationId = await t.run((ctx) => ctx.db.insert("conversations", {
    orgId: "org-test", service: "whatsapp", orgAddress: "phone-test",
    contactAddress: "60123456789", customerId, status: "open",
    assignToAiAgent: false, threadId: "thread-test", lastMessageAt: receivedAt,
    unreadCount: 0, createdAt: receivedAt, updatedAt: receivedAt,
  }));
  const insert = (overrides: Partial<Doc<"messages">> = {}) => t.run((ctx) =>
    triggers.wrapDB(ctx).db.insert("messages", {
      orgId: "org-test", service: "whatsapp", conversationId,
      orgAddress: "phone-test", contactAddress: "60123456789",
      contentType: "text", content: "Hello", direction: "incoming",
      createdAt: receivedAt, ...overrides,
    }));
  const customer = () => t.run((ctx) => ctx.db.get(customerId));
  return { t, customerId, conversationId, insert, customer };
}

test.each(["ad", "post"] as const)("persists %s details when referral is attached after ingestion", async (sourceType) => {
  const f = await fixture();
  const messageId = await f.insert();
  await f.t.run((ctx) => triggers.wrapDB(ctx).db.patch(messageId, {
    whatsappReferral: {
      sourceType, sourceId: "ad-a", sourceUrl: "https://fb.me/ad-a",
      headline: "Summer offer", body: "Save today", imageUrl: "https://example.com/ad.jpg",
      videoUrl: "https://example.com/ad.mp4", thumbnailUrl: "https://example.com/thumb.jpg",
      mediaType: "video", clickId: "click-a",
    },
  }));
  expect(await f.customer()).toMatchObject({
    firstReferral: { service: "whatsapp", messageId, receivedAt, referral: {
      sourceType, sourceId: "ad-a", sourceUrl: "https://fb.me/ad-a",
      headline: "Summer offer", body: "Save today", imageUrl: "https://example.com/ad.jpg",
      videoUrl: "https://example.com/ad.mp4", thumbnailUrl: "https://example.com/thumb.jpg",
      mediaType: "video", clickId: "click-a",
    } },
    latestReferral: { messageId, receivedAt, referral: { sourceType, sourceId: "ad-a" } },
  });
});

test("ordinary messages and delivery updates preserve attribution", async () => {
  const f = await fixture();
  const messageId = await f.insert({ whatsappReferral: { sourceType: "ad", sourceId: "ad-a" } });
  const initial = await f.customer();
  await f.insert({ createdAt: receivedAt + 1000 });
  await f.insert({ direction: "outgoing", createdAt: receivedAt + 2000 });
  await f.t.run((ctx) => triggers.wrapDB(ctx).db.patch(messageId, { status: "read" }));
  expect(await f.customer()).toEqual(initial);
});

test("later referral changes latest source while earlier arrival corrects first source", async () => {
  const f = await fixture();
  const firstId = await f.insert({ whatsappReferral: { sourceType: "ad", sourceId: "ad-a" } });
  const latestId = await f.insert({ createdAt: receivedAt + 2000,
    whatsappReferral: { sourceType: "post", sourceId: "post-b" } });
  expect(await f.customer()).toMatchObject({
    firstReferral: { messageId: firstId, referral: { sourceId: "ad-a" } },
    latestReferral: { messageId: latestId, referral: { sourceId: "post-b" } },
  });
  const earlierId = await f.insert({ createdAt: receivedAt - 1000,
    whatsappReferral: { sourceType: "ad", sourceId: "ad-before" } });
  expect(await f.customer()).toMatchObject({
    firstReferral: { messageId: earlierId, receivedAt: receivedAt - 1000 },
    latestReferral: { messageId: latestId, receivedAt: receivedAt + 2000 },
  });
});

test("missing referral and outgoing referral do not invent a customer source", async () => {
  const f = await fixture();
  await f.insert();
  await f.insert({ direction: "outgoing", whatsappReferral: { sourceType: "ad" } });
  expect(await f.customer()).not.toHaveProperty("firstReferral");
  expect(await f.customer()).not.toHaveProperty("latestReferral");
});

test("the same customer keeps attribution across separate conversations", async () => {
  const f = await fixture();
  const firstId = await f.insert({ whatsappReferral: { sourceType: "ad", sourceId: "ad-a" } });
  const conversationId = await f.t.run(async (ctx) => {
    const conversation = await ctx.db.get(f.conversationId);
    if (!conversation) throw new Error("Missing test conversation");
    const { _id, _creationTime, ...fields } = conversation;
    void _id;
    void _creationTime;
    return ctx.db.insert("conversations", { ...fields, threadId: "second-thread" });
  });
  const latestId = await f.insert({ conversationId, createdAt: receivedAt + 1000,
    whatsappReferral: { sourceType: "ad", sourceId: "ad-b" } });
  expect(await f.customer()).toMatchObject({
    firstReferral: { messageId: firstId, referral: { sourceId: "ad-a" } },
    latestReferral: { messageId: latestId, referral: { sourceId: "ad-b" } },
  });
});

test("split parts of the same referral preserve the original evidence message", async () => {
  const f = await fixture();
  const messageId = await f.insert({ externalId: "same-message",
    whatsappReferral: { sourceType: "ad", sourceId: "ad-a" } });
  const initial = await f.customer();
  await f.insert({ externalId: "same-message", contentType: "image",
    whatsappReferral: { sourceType: "ad", sourceId: "ad-a" } });
  expect(await f.customer()).toEqual(initial);
  expect(await f.customer()).toMatchObject({
    firstReferral: { messageId }, latestReferral: { messageId },
  });
});

test("remembers an ad even when first and latest referrals are posts", async () => {
  const f = await fixture();
  await f.insert({ whatsappReferral: { sourceType: "post", sourceId: "post-a" } });
  const adId = await f.insert({ createdAt: receivedAt + 1000,
    whatsappReferral: { sourceType: "ad", sourceId: "ad-b" } });
  await f.insert({ createdAt: receivedAt + 2000,
    whatsappReferral: { sourceType: "post", sourceId: "post-c" } });
  expect(await f.customer()).toMatchObject({
    firstReferral: { referral: { sourceId: "post-a" } },
    latestReferral: { referral: { sourceId: "post-c" } },
    latestAdReferral: { messageId: adId, referral: { sourceType: "ad", sourceId: "ad-b" } },
  });
});
