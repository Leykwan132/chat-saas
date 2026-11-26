import { expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { manualEscalationFixture } from "../tests/manualEscalationFixture";

vi.mock("./conversationLogs", () => ({ logConversationEvent: vi.fn() }));

test("exclusion survives AI reassignment and can be removed independently", async () => {
  const f = await manualEscalationFixture();
  const eligible = () =>
    f.t.query(internal.leadRouting.audience.canReplyToConversation, {
      conversationId: f.conversationId,
    });
  await f.authed.mutation(api.conversationAiExclusion.setExcluded, {
    conversationId: f.conversationId,
    excluded: true,
  });
  await f.authed.mutation(api.conversations.setConversationAiEnabled, {
    conversationId: f.conversationId,
    enabled: true,
  });
  expect(await eligible()).toBe(false);
  await f.authed.mutation(api.conversationAiExclusion.setExcluded, {
    conversationId: f.conversationId,
    excluded: false,
  });
  expect(await eligible()).toBe(true);
});

test("cannot change another organization's conversation", async () => {
  const f = await manualEscalationFixture();
  await f.t.run((ctx) =>
    ctx.db.patch(f.conversationId, { orgId: "another-org" }),
  );
  await expect(
    f.authed.mutation(api.conversationAiExclusion.setExcluded, {
      conversationId: f.conversationId,
      excluded: true,
    }),
  ).rejects.toThrow("Conversation not found");
});

test("requires chat assignment permission", async () => {
  const f = await manualEscalationFixture();
  await f.t.run(async (ctx) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", "org"))
      .unique();
    if (!team) throw new Error("Missing fixture team");
    await ctx.db.patch(team._id, {
      memberPermissions: ["chats:read"],
    });
  });
  await expect(
    f.authed.mutation(api.conversationAiExclusion.setExcluded, {
      conversationId: f.conversationId,
      excluded: true,
    }),
  ).rejects.toThrow("Forbidden");
});
