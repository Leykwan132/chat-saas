"use node";

import { listMessages, type MessageDoc } from "@convex-dev/agent";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import {
  readInboxMetadataFromProviderMetadata,
  type InboxMediaUnderstandingAsset,
} from "../shared/inboxAttachments";
import { fetchInboundMedia } from "./chat/inboundMediaFetch";
import {
  INBOUND_MEDIA_MODEL,
  understandInboundMedia,
  type InboundMediaResult,
} from "./chat/inboundMediaModel";
import { buildAgent } from "./chat/threads";

const CHUNK_SIZE = 10;

function messageId(doc: MessageDoc): string | undefined {
  const value = doc as MessageDoc & { id?: string; _id?: string };
  return value.id ?? value._id;
}

async function findMessages(
  ctx: Parameters<typeof listMessages>[0],
  threadId: string,
  targetIds: Set<string>,
): Promise<Map<string, MessageDoc>> {
  const found = new Map<string, MessageDoc>();
  let cursor: string | null = null;
  for (let pageIndex = 0; pageIndex < 5 && found.size < targetIds.size; pageIndex += 1) {
    const page = await listMessages(ctx, components.agent, {
      threadId,
      paginationOpts: { numItems: 100, cursor },
    });
    for (const doc of page.page) {
      const id = messageId(doc);
      if (id && targetIds.has(id)) found.set(id, doc);
    }
    if (page.isDone) break;
    cursor = page.continueCursor;
  }
  return found;
}

function mergeAssets(
  existing: InboxMediaUnderstandingAsset[],
  next: InboundMediaResult[],
): InboxMediaUnderstandingAsset[] {
  const assets = new Map(existing.map((asset) => [asset.assetKey, asset]));
  for (const result of next) assets.set(result.assetKey, result);
  return [...assets.values()];
}

function agentFacingContent(
  displayText: string,
  captionResponse: string | undefined,
  assets: InboxMediaUnderstandingAsset[],
): string {
  const lines = displayText.trim()
    ? [`Customer caption: ${displayText.trim()}`]
    : ["Customer attached media without a caption."];
  if (captionResponse) {
    lines.push(`Media response to caption: ${captionResponse}`);
  }
  for (const asset of assets) {
    if (asset.audioTranscript) {
      lines.push(`Audio transcript: ${asset.audioTranscript}`);
    }
    if (asset.audioLanguage) {
      lines.push(`Audio language: ${asset.audioLanguage}`);
    }
    if (asset.imageDescription) {
      lines.push(`Image description: ${asset.imageDescription}`);
    }
    if (asset.visibleImageText) {
      lines.push(`Visible image text: ${asset.visibleImageText}`);
    }
    if (asset.uncertainty) {
      lines.push(`Media uncertainty: ${asset.uncertainty}`);
    }
  }
  return lines.join("\n");
}

export const processBatch = internalAction({
  args: {
    batchId: v.id("inboundMediaBatches"),
    revision: v.number(),
  },
  handler: async (ctx, args) => {
    const claimed = await ctx.runMutation(
      internal.inboundMediaBatch.claimBatch,
      args,
    );
    if (!claimed) return;

    const creditCheck = await ctx.runQuery(
      internal.credits.internalCheckCredits,
      {
        workosUserId: claimed.agent.userId,
        modelId: claimed.agent.model,
      },
    );
    if (!creditCheck.ok) {
      await ctx.runMutation(
        internal.inboundMediaBatch.completeBatchWithoutReply,
        args,
      );
      return;
    }

    try {
      const resultsByPromptMessageId = new Map<string, InboundMediaResult[]>();
      const captionResponseByPromptMessageId = new Map<string, string>();

    for (
      let chunkStart = 0, chunkIndex = 0;
      chunkStart < claimed.items.length;
      chunkStart += CHUNK_SIZE, chunkIndex += 1
    ) {
      const items = claimed.items.slice(chunkStart, chunkStart + CHUNK_SIZE);
      const fetchedSettled = await Promise.allSettled(
        items.map((item) =>
          fetchInboundMedia(item, claimed.accessToken),
        ),
      );
      const media = fetchedSettled.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      if (media.length === 0) continue;

      try {
        const modelResponse = await understandInboundMedia({
          batchId: args.batchId,
          chunk: chunkIndex,
          items,
          media,
        });
        await ctx.runMutation(internal.agentUsage.insertRawUsage, {
          userId: claimed.agent.userId,
          threadId: claimed.conversation.threadId,
          agentId: claimed.agent._id,
          agentName: claimed.agent.name,
          model: INBOUND_MEDIA_MODEL,
          provider: "openrouter",
          usage: modelResponse.usage,
          providerMetadata: modelResponse.providerMetadata,
        });
        const itemByAssetKey = new Map(
          items.map((item) => [item.assetKey, item]),
        );
        for (const result of modelResponse.results) {
          const item = itemByAssetKey.get(result.assetKey);
          if (!item) continue;
          const existing =
            resultsByPromptMessageId.get(item.promptMessageId) ?? [];
          resultsByPromptMessageId.set(item.promptMessageId, [
            ...existing,
            result,
          ]);
          if (modelResponse.captionResponse && item.caption) {
            captionResponseByPromptMessageId.set(
              item.promptMessageId,
              modelResponse.captionResponse,
            );
          }
        }
      } catch (error) {
        console.error("Inbound media understanding chunk failed", {
          batchId: args.batchId,
          chunk: chunkIndex,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const targetIds = new Set(
      claimed.items.map((item) => item.promptMessageId),
    );
    const docs = await findMessages(
      ctx,
      claimed.conversation.threadId,
      targetIds,
    );
    const configuredAgent = buildAgent(claimed.agent, claimed.agent._id);
    for (const promptMessageId of targetIds) {
      const doc = docs.get(promptMessageId);
      const nextResults = resultsByPromptMessageId.get(promptMessageId) ?? [];
      if (!doc || nextResults.length === 0) continue;
      const inbox =
        readInboxMetadataFromProviderMetadata(doc.providerOptions) ??
        readInboxMetadataFromProviderMetadata(doc.providerMetadata);
      const sourceItem = claimed.items.find(
        (item) => item.promptMessageId === promptMessageId,
      );
      const displayText =
        inbox?.displayText ?? sourceItem?.caption ?? doc.text ?? "";
      const assets = mergeAssets(
        inbox?.mediaUnderstanding?.assets ?? [],
        nextResults,
      );
      const captionResponse =
        captionResponseByPromptMessageId.get(promptMessageId);
      const providerMetadata = {
        ...(doc.providerMetadata as Record<string, unknown> | undefined),
        inbox: {
          ...inbox,
          attachments: inbox?.attachments ?? [],
          displayText,
          mediaUnderstanding: {
            model: INBOUND_MEDIA_MODEL,
            processedAt: Date.now(),
            ...(captionResponse ? { captionResponse } : {}),
            assets,
          },
        },
      };
      try {
        await configuredAgent.updateMessage(ctx, {
          messageId: promptMessageId,
          patch: {
            message: {
              role: "user",
              content: agentFacingContent(
                displayText,
                captionResponse,
                assets,
              ),
            },
            status: "success",
          },
        });
        await ctx.runMutation(components.agent.messages.updateMessage, {
          messageId: promptMessageId,
          patch: { providerOptions: providerMetadata },
        });
      } catch (error) {
        console.error("Inbound media thread enrichment failed", {
          batchId: args.batchId,
          promptMessageId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    } catch (error) {
      console.error("Inbound media batch processing failed", {
        batchId: args.batchId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      await ctx.runMutation(
        internal.inboundMediaBatch.finalizeBatchAndEnqueueReply,
        args,
      );
    }
  },
});
