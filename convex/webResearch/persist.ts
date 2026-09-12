import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { r2 } from "../media/r2";
import { mediaDeletePool } from "../mediaPools";
import {
  assertWorkspaceCanCreateExternalState,
  createWorkspaceExternalState,
} from "../teamDeletion/externalGuard";
import { addKnowledgeEntryToRag } from "../rag/ingest";
import { requireResearchMarkdown } from "./markdown";
import { generateWebMarkdownKey } from "./markdownKey";

export async function persistWebMarkdown(
  ctx: ActionCtx,
  args: {
    entryId: string;
    url: string;
    agentId: string;
    orgId: string;
    markdown: string;
    previousMarkdownR2Key?: string;
  },
) {
  await assertWorkspaceCanCreateExternalState(ctx, args.orgId);
  const markdown = requireResearchMarkdown(args.markdown);
  const markdownBlob = new Blob([markdown], { type: "text/markdown" });
  const fileSize = markdownBlob.size;
  const markdownR2Key = generateWebMarkdownKey(
    args.orgId,
    args.agentId,
    args.entryId,
  );

  console.log("[web-research] storing r2", {
    entryId: args.entryId,
    url: args.url,
    markdownR2Key,
    fileSize,
    markdownChars: markdown.length,
  });

  await createWorkspaceExternalState(
    ctx,
    args.orgId,
    "r2",
    async () => {
      await r2.store(ctx, markdownBlob, { key: markdownR2Key });
      return markdownR2Key;
    },
    async (createdKey) => await r2.deleteObject(ctx, createdKey),
  );

  await ctx.runMutation(internal.webResearch.store.markEmbedding, {
    entryId: args.entryId as never,
    markdownR2Key,
    fileSize,
  });

  if (
    args.previousMarkdownR2Key &&
    args.previousMarkdownR2Key !== markdownR2Key
  ) {
    await mediaDeletePool.enqueueAction(
      ctx,
      internal.workpool.mediaDeleteWorker,
      { r2Key: args.previousMarkdownR2Key },
      { retry: true },
    );
  }

  console.log("[web-research] embedding start", {
    entryId: args.entryId,
    url: args.url,
    markdownR2Key,
  });

  const { ragEntryId } = await addKnowledgeEntryToRag(ctx, {
    agentId: args.agentId,
    entryType: "web",
    entryId: args.entryId,
    title: args.url,
    text: markdown,
  });

  return { url: args.url, ragEntryId, fileSize, markdownR2Key };
}
