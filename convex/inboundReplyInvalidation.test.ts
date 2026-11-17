import { afterEach, expect, test, vi } from "vitest";
import { replyFixture } from "./inboundReply.testUtils";
import { internal } from "./_generated/api";
import { triggers } from "./triggers";
import {
  excludeRevokedReplyInput,
  invalidatePendingReply,
} from "./inboundReplyState";
import { finishReplyMedia } from "./inboundReplyQueue";

afterEach(() => vi.useRealTimers());

test.each([
  "closed",
  "disabled",
  "assignedAgentId",
  "assignedUserId",
  "escalation",
])("conversation trigger invalidates pending work on %s", async (scenario) => {
  const f = await replyFixture();
  await f.inbound();
  const state = (await f.coordinator())!;
  await f.t.run(async (raw) => {
    const ctx = triggers.wrapDB(raw);
    const patch =
      scenario === "closed"
        ? { status: "closed" as const }
        : scenario === "disabled"
          ? { assignToAiAgent: false }
          : scenario === "assignedAgentId"
            ? { assignedAgentId: undefined }
            : scenario === "assignedUserId"
              ? { assignedUserId: "teammate" }
              : {
                  escalation: {
                    question: "help",
                    context: "test",
                    escalatedAt: Date.now(),
                  },
                };
    await ctx.db.patch(f.conversationId, patch);
  });
  vi.setSystemTime(state.dueAt);
  await f.t.mutation(internal.inboundReplyQueue.wake, {
    coordinatorId: state._id,
    generation: state.wakeGeneration,
  });
  expect((await f.coordinator())?.activeRunId).toBeUndefined();
  expect((await f.coordinator())?.answeredSequence).toBe(1);
});

test("successful human reply invalidates pending work even before its transaction pauses AI", async () => {
  const f = await replyFixture();
  await f.inbound();
  await f.t.run(async (raw) => {
    const ctx = triggers.wrapDB(raw);
    await ctx.db.insert("messages", {
      orgId: "",
      conversationId: f.conversationId,
      service: "web",
      orgAddress: "web",
      contactAddress: "customer",
      direction: "outgoing",
      contentType: "text",
      content: "Helping you",
      status: "sent",
      createdAt: Date.now(),
    });
  });
  expect((await f.coordinator())?.answeredSequence).toBe(1);
  expect((await f.coordinator())?.wakeWorkId).toBeUndefined();
});

test("revoked input is excluded and a completely revoked group creates no AI run", async () => {
  const f = await replyFixture();
  const messageId = await f.inbound("Remove this");
  const state = (await f.coordinator())!;
  await f.t.run((ctx) =>
    excludeRevokedReplyInput(ctx, f.conversationId, messageId),
  );
  vi.setSystemTime(state.dueAt);
  await f.t.mutation(internal.inboundReplyQueue.wake, {
    coordinatorId: state._id,
    generation: state.wakeGeneration,
  });
  expect(await f.coordinator()).toMatchObject({ answeredSequence: 1 });
  expect((await f.coordinator())?.activeRunId).toBeUndefined();
});

test("late media failure after takeover cannot block a new customer message", async () => {
  const f = await replyFixture();
  const mediaId = await f.inbound("Voice", true);
  await f.t.run((ctx) => invalidatePendingReply(ctx, f.conversationId));
  await f.inbound("New question");
  await f.t.run((ctx) =>
    finishReplyMedia(ctx, f.conversationId, [mediaId], "Old media failed"),
  );
  expect((await f.coordinator())?.lastError).toBeUndefined();
  expect((await f.coordinator())?.wakeWorkId).toBeDefined();
});
