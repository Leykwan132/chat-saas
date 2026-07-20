import { expect, test } from "vitest";
import type { Doc, Id } from "./_generated/dataModel";
import {
  applyConversationTransitions,
  applyMessageToProjectionState,
  type ConversationAnalyticsProjectionState,
} from "./analyticsProjectionStateModel";
import {
  loadOrCreateProjectionState,
  replaceProjectionState,
} from "./analyticsProjectionState";
import { analyticsProjectionTest } from "./analyticsProjection.testUtils";

function emptyProjectionState(
  conversationId: Id<"conversations">,
  now: number,
): ConversationAnalyticsProjectionState {
  return {
    conversationId,
    createdAt: now,
    updatedAt: now,
  };
}

function message(
  direction: Doc<"messages">["direction"],
  createdAt: number,
  messageId = `message-${createdAt}` as Id<"messages">,
  authorUserId?: string,
) {
  return {
    _id: messageId,
    direction,
    createdAt,
    authorUserId,
  };
}

test("message state keeps minimum timestamps and first human identity", () => {
  const initial = emptyProjectionState(
    "conversation-1" as Id<"conversations">,
    1000,
  );
  const ignoredOutgoing = applyMessageToProjectionState(
    initial,
    message("outgoing", 1100),
  );
  const afterCustomer = applyMessageToProjectionState(
    ignoredOutgoing,
    message("incoming", 1200),
  );
  const afterAi = applyMessageToProjectionState(
    afterCustomer,
    message("outgoing", 1500),
  );
  const afterHuman = applyMessageToProjectionState(
    afterAi,
    message(
      "outgoing",
      1600,
      "human-message" as Id<"messages">,
      "member-1",
    ),
  );
  const afterLateHuman = applyMessageToProjectionState(
    afterHuman,
    message(
      "outgoing",
      1400,
      "late-human-message" as Id<"messages">,
      "member-2",
    ),
  );
  expect(afterLateHuman).toMatchObject({
    firstCustomerMessageAt: 1200,
    firstOutgoingAt: 1400,
    firstHumanOutgoingAt: 1400,
    firstHumanMessageId: "late-human-message",
    firstHumanMemberUserId: "member-2",
  });
});

test("equal human timestamps use message ID as a deterministic tie breaker", () => {
  const initial = {
    ...emptyProjectionState(
      "conversation-1" as Id<"conversations">,
      1000,
    ),
    firstCustomerMessageAt: 1000,
  };
  const laterId = applyMessageToProjectionState(
    initial,
    message("outgoing", 1200, "message-z" as Id<"messages">, "member-1"),
  );
  const earlierId = applyMessageToProjectionState(
    laterId,
    message("outgoing", 1200, "message-a" as Id<"messages">, "member-2"),
  );
  expect(earlierId.firstHumanMessageId).toBe("message-a");
  expect(earlierId.firstHumanMemberUserId).toBe("member-2");
});

test("conversion and drop transitions preserve observation until reversal", () => {
  const initial = emptyProjectionState(
    "conversation-1" as Id<"conversations">,
    1000,
  );
  const active = applyConversationTransitions(initial, {
    converted: true,
    dropped: true,
    now: 2000,
  });
  const retried = applyConversationTransitions(active, {
    converted: true,
    dropped: true,
    now: 3000,
  });
  const reversed = applyConversationTransitions(retried, {
    converted: false,
    dropped: false,
    now: 4000,
  });
  expect(retried.convertedAt).toBe(2000);
  expect(retried.droppedAt).toBe(2000);
  expect(reversed.convertedAt).toBeUndefined();
  expect(reversed.droppedAt).toBeUndefined();
});

test("missing v2 state initializes empty without reading legacy facts", async () => {
  const convex = analyticsProjectionTest();
  const fixture = await convex.run(async (ctx) => {
    const createdAt = 1000;
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "org-state",
      service: "web",
      orgAddress: "widget-state",
      contactAddress: "visitor-state",
      status: "open",
      tags: [],
      assignToAiAgent: false,
      threadId: "thread-state",
      lastMessageAt: 1600,
      unreadCount: 0,
      createdAt,
      updatedAt: createdAt,
    });
    const firstInsertedMessageId = await ctx.db.insert("messages", {
      orgId: "org-state",
      conversationId,
      service: "web",
      orgAddress: "widget-state",
      contactAddress: "visitor-state",
      direction: "outgoing",
      authorUserId: "member-z",
      contentType: "text",
      content: "Later ID",
      createdAt: 1600,
    });
    const secondInsertedMessageId = await ctx.db.insert("messages", {
      orgId: "org-state",
      conversationId,
      service: "web",
      orgAddress: "widget-state",
      contactAddress: "visitor-state",
      direction: "outgoing",
      authorUserId: "member-a",
      contentType: "text",
      content: "Earlier ID",
      createdAt: 1600,
    });
    await ctx.db.insert("conversationAnalyticsFacts", {
      orgId: "org-state",
      conversationId,
      service: "web",
      firstCustomerMessageAt: 1200,
      firstOutgoingAt: 1500,
      firstHumanOutgoingAt: 1600,
      incomingMessageCount: 1,
      outgoingMessageCount: 2,
      humanMessageCount: 2,
      aiMessageCount: 0,
      convertedAt: 1700,
      droppedAt: 1800,
      createdAt,
      updatedAt: 1800,
    });
    return {
      conversationId,
      firstInsertedMessageId,
      secondInsertedMessageId,
      conversation: await ctx.db.get(conversationId),
    };
  });
  if (fixture.conversation === null) {
    throw new Error("Conversation fixture was not created");
  }
  const first = await convex.run(async (ctx) =>
    await loadOrCreateProjectionState(ctx, fixture.conversation!),
  );
  const second = await convex.run(async (ctx) =>
    await loadOrCreateProjectionState(ctx, fixture.conversation!),
  );

  expect(second._id).toBe(first._id);
  expect(first).toMatchObject({
    conversationId: fixture.conversationId,
  });
  expect(first.firstCustomerMessageAt).toBeUndefined();
  expect(first.firstOutgoingAt).toBeUndefined();
  expect(first.firstHumanOutgoingAt).toBeUndefined();
  expect(first.firstHumanMessageId).toBeUndefined();
  expect(first.firstHumanMemberUserId).toBeUndefined();
  expect(first.convertedAt).toBeUndefined();
  expect(first.droppedAt).toBeUndefined();

  await convex.run(async (ctx) =>
    await replaceProjectionState(ctx, first._id, {
      ...first,
      convertedAt: 1900,
      updatedAt: 1900,
    }),
  );
  expect(await convex.run(async (ctx) => await ctx.db.get(first._id)))
    .toMatchObject({ convertedAt: 1900, updatedAt: 1900 });
});
