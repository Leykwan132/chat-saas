import { expect, test } from "vitest";
import { manualEscalationFixture } from "../tests/manualEscalationFixture";
import { api } from "./_generated/api";

async function firstHandling(
  f: Awaited<ReturnType<typeof manualEscalationFixture>>,
) {
  const result = await f.authed.query(
    api.conversations.listInboxSummariesForCurrentOrg,
    { agentId: f.agentId, paginationOpts: { cursor: null, numItems: 10 } },
  );
  return result.page[0]?.handling;
}

test("uses current AI assignment instead of the last message sender", async () => {
  const f = await manualEscalationFixture();
  expect(await firstHandling(f)).toBe("ai");
  await f.t.run((ctx) =>
    ctx.db.patch(f.conversationId, {
      assignToAiAgent: false,
      lastMessageSentByAi: true,
    }),
  );
  expect(await firstHandling(f)).toBe("human");
  await f.t.run((ctx) =>
    ctx.db.patch(f.conversationId, {
      assignToAiAgent: true,
      lastMessageSentByAi: false,
    }),
  );
  expect(await firstHandling(f)).toBe("ai");
});
test("escalation takes precedence and resolving resumes the current AI state", async () => {
  const f = await manualEscalationFixture();
  await f.escalate();
  expect(await firstHandling(f)).toBe("attention");
  await f.authed.mutation(api.inboxManualEscalation.deescalate, {
    conversationId: f.conversationId,
  });
  expect(await firstHandling(f)).toBe("ai");
});
test("does not label closed or unassigned conversations as AI handling", async () => {
  const f = await manualEscalationFixture();
  await f.t.run((ctx) => ctx.db.patch(f.conversationId, { status: "closed" }));
  expect(await firstHandling(f)).toBe("human");
  await f.t.run((ctx) =>
    ctx.db.patch(f.conversationId, {
      status: "open",
      assignedAgentId: undefined,
    }),
  );
  const result = await f.authed.query(
    api.conversations.listInboxSummariesForCurrentOrg,
    { paginationOpts: { cursor: null, numItems: 10 } },
  );
  expect(result.page[0]?.handling).toBe("human");
});
test("respects AI audience eligibility rather than the enabled flag alone", async () => {
  const f = await manualEscalationFixture();
  await f.t.run((ctx) =>
    ctx.db.insert("leadAssignmentSettings", {
      agentId: f.agentId,
      method: "manual",
      aiEnabledOnInbound: true,
      aiReplyAudience: "ads",
      updatedAt: Date.now(),
    }),
  );
  expect(await firstHandling(f)).toBe("human");
});
