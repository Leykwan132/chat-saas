"use node";

import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { cfDeletePool } from "../workpool";
import {
  generateFilePreviewKey,
  knowledgeFileMimeType,
  r2,
} from "../media/r2";
import {
  assertWorkspaceCanCreateExternalState,
  createWorkspaceExternalState,
} from "../teamDeletion/externalGuard";
import { addKnowledgeEntryToRag, knowledgeEntryPayload } from "./ingest";
import { downloadCfItemBytes, readCfItemChunksText } from "./cfFetch";
import { textFromFileBytes } from "./fileBytesText";
import { shouldBackfillFile, shouldBackfillTextOrQa } from "./backfillPlan";

export async function dropLegacyCfItem(
  ctx: ActionCtx,
  cfItemId: string | undefined,
) {
  if (!cfItemId) return;
  await cfDeletePool.enqueueAction(
    ctx,
    internal.workpool.cfDeleteWorker,
    { cfItemId },
    {
      onComplete: internal.knowledgeBase.cfDeleteComplete,
      context: { entryId: cfItemId, entryType: "qaIndex" },
      retry: true,
    },
  );
}

export async function indexTextEntry(ctx: ActionCtx, entryId: string) {
  const entry = await ctx.runQuery(internal.knowledgeBase.internalGetTextEntry, {
    entryId: entryId as never,
  });
  if (!entry || !shouldBackfillTextOrQa(entry)) return;
  const payload = knowledgeEntryPayload({
    entryType: "text",
    title: entry.title,
    content: entry.content,
  });
  if (!payload.text.trim()) return;
  const rag = await addKnowledgeEntryToRag(ctx, {
    agentId: entry.agentId,
    entryType: "text",
    entryId,
    ...payload,
  });
  await ctx.runMutation(internal.knowledgeBase.internalCompleteTextEntry, {
    entryId: entryId as never,
    ragEntryId: rag.ragEntryId,
    fileSize: rag.fileSize,
  });
  await dropLegacyCfItem(ctx, entry.cfItemId);
}

export async function indexQaEntry(ctx: ActionCtx, entryId: string) {
  const entry = await ctx.runQuery(internal.knowledgeBase.internalGetQAEntry, {
    entryId: entryId as never,
  });
  if (!entry || !shouldBackfillTextOrQa(entry)) return;
  const payload = knowledgeEntryPayload({
    entryType: "qa",
    question: entry.question,
    answer: entry.answer,
  });
  if (!payload.text.trim()) return;
  const rag = await addKnowledgeEntryToRag(ctx, {
    agentId: entry.agentId,
    entryType: "qa",
    entryId,
    ...payload,
  });
  await ctx.runMutation(internal.knowledgeBase.internalCompleteQAEntry, {
    entryId: entryId as never,
    ragEntryId: rag.ragEntryId,
    fileSize: rag.fileSize,
  });
  await dropLegacyCfItem(ctx, entry.cfItemId);
}

export async function indexFileEntry(ctx: ActionCtx, entryId: string) {
  const entry = await ctx.runQuery(internal.knowledgeBase.internalGetFileEntry, {
    entryId: entryId as never,
  });
  if (!entry || !shouldBackfillFile(entry)) return;

  let extractedText = entry.extractedText?.trim() || undefined;
  let previewR2Key = entry.previewR2Key;
  const bytes = entry.cfItemId ? await downloadCfItemBytes(entry.cfItemId) : null;

  if (bytes && !extractedText) {
    extractedText = await textFromFileBytes(entry.fileName, bytes);
  }
  if (!extractedText && entry.cfItemId) {
    extractedText = (await readCfItemChunksText(entry.cfItemId)) ?? undefined;
  }
  if (!extractedText) {
    throw new Error(`No indexable file text for ${entryId}`);
  }

  if (bytes && entry.orgId && !previewR2Key) {
    previewR2Key = await storeFilePreview(
      ctx,
      entry.orgId,
      entry.agentId,
      entryId,
      entry.fileName,
      bytes,
    );
  }

  const payload = knowledgeEntryPayload({
    entryType: "file",
    fileName: entry.fileName,
    extractedText,
  });
  const rag = await addKnowledgeEntryToRag(ctx, {
    agentId: entry.agentId,
    entryType: "file",
    entryId,
    ...payload,
  });
  await ctx.runMutation(internal.knowledgeBase.internalCompleteFileEntry, {
    entryId: entryId as never,
    ragEntryId: rag.ragEntryId,
    fileSize: rag.fileSize,
    extractedText,
    previewR2Key,
  });
  await dropLegacyCfItem(ctx, entry.cfItemId);
}

async function storeFilePreview(
  ctx: ActionCtx,
  orgId: string,
  agentId: string,
  entryId: string,
  fileName: string,
  bytes: ArrayBuffer,
) {
  await assertWorkspaceCanCreateExternalState(ctx, orgId);
  const key = generateFilePreviewKey(orgId, agentId, entryId, fileName);
  const previewBlob = new Blob([bytes], { type: knowledgeFileMimeType(fileName) });
  try {
    await createWorkspaceExternalState(
      ctx,
      orgId,
      "r2",
      async () => {
        await r2.store(ctx, previewBlob, { key });
        return key;
      },
      async (createdKey) => await r2.deleteObject(ctx, createdKey),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("already exists")) throw error;
  }
  return key;
}
