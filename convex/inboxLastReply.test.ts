import { expect, test } from "vitest";
import { manualEscalationFixture } from "../tests/manualEscalationFixture";
import { api } from "./_generated/api";

test("last reply author survives incoming messages and ignores failed or revoked replies", async () => {
  const f = await manualEscalationFixture();
  const author = async () => {
    const result = await f.authed.query(
      api.conversations.listInboxSummariesForCurrentOrg,
      {
        agentId: f.agentId,
        paginationOpts: { cursor: null, numItems: 10 },
      },
    );
    return result.page[0]?.lastReplyAuthor;
  };
  expect(await author()).toBeNull();
  await f.t.run(async (ctx) => {
    await ctx.db.insert("messages", {
      orgId: "org",
      conversationId: f.conversationId,
      service: "web",
      orgAddress: "web",
      contactAddress: "visitor",
      direction: "outgoing",
      contentType: "text",
      content: "AI answer",
      agentId: f.agentId,
      status: "sent",
      createdAt: f.now + 1,
    });
    await ctx.db.patch(f.messageId, { createdAt: f.now + 2 });
  });
  expect(await author()).toEqual({ kind: "ai", name: "AI" });
  await f.t.run(async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", "teammate"))
      .unique();
    if (!user) throw new Error("Missing teammate");
    await ctx.db.patch(user._id, { firstName: "Alex", lastName: "Tan" });
    await ctx.db.insert("messages", {
      orgId: "org",
      conversationId: f.conversationId,
      service: "web",
      orgAddress: "web",
      contactAddress: "visitor",
      direction: "outgoing",
      contentType: "text",
      content: "Human answer",
      authorUserId: "teammate",
      status: "delivered",
      createdAt: f.now + 3,
    });
    for (const fields of [
      { status: "failed" as const },
      { status: "sent" as const, revokedAt: f.now + 6 },
    ]) {
      await ctx.db.insert("messages", {
        orgId: "org",
        conversationId: f.conversationId,
        service: "web",
        orgAddress: "web",
        contactAddress: "visitor",
        direction: "outgoing",
        contentType: "text",
        content: "Not a visible reply",
        agentId: f.agentId,
        createdAt: f.now + 5,
        ...fields,
      });
    }
  });
  expect(await author()).toEqual({ kind: "human", name: "Alex Tan" });
});
