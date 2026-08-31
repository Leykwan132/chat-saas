/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedUsernameContact(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const now = 1_700_000_000_000;
    const channelId = await ctx.db.insert("channels", {
      orgId: "org-123",
      service: "whatsapp",
      phoneNumberId: "phone-123",
      status: "connected",
      connectedByUserId: "user-123",
      createdAt: now,
      updatedAt: now,
    });
    const customerId = await ctx.db.insert("customers", {
      orgId: "org-123",
      service: "whatsapp",
      contactAddress: "US.old",
      whatsappUserId: "US.old",
      whatsappUsername: "@testusername",
      name: "Test User",
      tags: [],
      source: "whatsapp",
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "org-123",
      channelId,
      service: "whatsapp",
      orgAddress: "phone-123",
      contactAddress: "US.old",
      customerId,
      status: "open",
      assignToAiAgent: true,
      threadId: "thread-123",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    return { customerId, conversationId };
  });
}

test("transfers a WhatsApp customer's BSUID and linked conversation", async () => {
  const t = convexTest(schema, modules);
  const { customerId, conversationId } = await seedUsernameContact(t);

  const result = await t.mutation(
    internal.whatsappUserIdChange.apply,
    {
      phoneNumberId: "phone-123",
      previousUserId: "US.old",
      userId: "US.new",
      phone: "16505551111",
    },
  );

  const state = await t.run(async (ctx) => ({
    customer: await ctx.db.get(customerId),
    conversation: await ctx.db.get(conversationId),
  }));

  expect(result).toEqual({ updated: true });
  expect(state.customer).toMatchObject({
    contactAddress: "US.new",
    whatsappUserId: "US.new",
    whatsappUsername: "@testusername",
    phone: "16505551111",
  });
  expect(state.conversation).toMatchObject({
    contactAddress: "US.new",
    customerId,
  });
});

test("does not change a customer when the previous BSUID is unknown", async () => {
  const t = convexTest(schema, modules);
  const { customerId, conversationId } = await seedUsernameContact(t);

  const result = await t.mutation(
    internal.whatsappUserIdChange.apply,
    {
      phoneNumberId: "phone-123",
      previousUserId: "US.missing",
      userId: "US.new",
    },
  );

  const state = await t.run(async (ctx) => ({
    customer: await ctx.db.get(customerId),
    conversation: await ctx.db.get(conversationId),
  }));

  expect(result).toEqual({ updated: false });
  expect(state.customer).toMatchObject({
    contactAddress: "US.old",
    whatsappUserId: "US.old",
    whatsappUsername: "@testusername",
  });
  expect(state.conversation).toMatchObject({ contactAddress: "US.old" });
});
