import { afterEach, expect, test, vi } from "vitest";
import { replyFixture } from "./inboundReply.testUtils";
import { internal } from "./_generated/api";

afterEach(() => vi.useRealTimers());

test.each([undefined, "Transcription failed"])(
  "media completion signals readiness or explicit failure: %s",
  async (error) => {
    const f = await replyFixture();
    const promptMessageId = await f.inbound("Voice", true);
    const batchId = await f.t.run(async (ctx) => {
      const now = Date.now();
      const batchId = await ctx.db.insert("inboundMediaBatches", {
        conversationId: f.conversationId,
        agentId: f.agentId,
        state: "processing",
        revision: 1,
        firstItemAt: now,
        latestItemAt: now,
        processAfter: now,
        latestPromptMessageId: promptMessageId,
        latestExternalId: "voice",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("inboundMediaBatchItems", {
        batchId,
        conversationId: f.conversationId,
        assetKey: "voice",
        externalId: "voice",
        promptMessageId,
        ordinal: 0,
        kind: "audio",
        service: "whatsapp",
        createdAt: now,
      });
      return batchId;
    });
    await f.t.mutation(
      internal.inboundMediaBatch.finalizeBatchAndEnqueueReply,
      { batchId, revision: 1, error },
    );
    const inputs = await f.t.run((ctx) =>
      ctx.db.query("inboundReplyInputs").take(10),
    );
    expect(inputs[0]?.readiness).toBe(error ? "failed" : "ready");
    expect((await f.coordinator())?.lastError).toBe(error);
    expect(
      await f.t.run((ctx) => ctx.db.query("inboundReplyRuns").take(10)),
    ).toHaveLength(0);
  },
);
