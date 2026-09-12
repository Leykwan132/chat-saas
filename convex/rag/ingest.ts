import type { EntryId } from "@convex-dev/rag";
import type { ActionCtx } from "../_generated/server";
import {
  getRag,
  ragKey,
  ragNamespace,
  type KnowledgeEntryType,
} from "./client";

export type RagIngestArgs = {
  agentId: string;
  entryType: KnowledgeEntryType;
  entryId: string;
  title: string;
  text: string;
};

export async function addKnowledgeEntryToRag(
  ctx: ActionCtx,
  args: RagIngestArgs,
): Promise<{ ragEntryId: string; fileSize: number }> {
  const text = args.text.trim();
  if (!text) {
    throw new Error(`No indexable text for ${args.entryType} entry ${args.entryId}`);
  }

  console.log("[convex-rag] add start", {
    agentId: args.agentId,
    entryType: args.entryType,
    entryId: args.entryId,
    namespace: ragNamespace(args.agentId),
    key: ragKey(args.entryType, args.entryId),
    title: args.title,
    textChars: text.length,
  });

  const rag = getRag();
  const { entryId, replacedEntry } = await rag.add(ctx, {
    namespace: ragNamespace(args.agentId),
    key: ragKey(args.entryType, args.entryId),
    title: args.title,
    text,
    filterValues: [{ name: "entryType", value: args.entryType }],
  });

  if (replacedEntry) {
    console.log("[convex-rag] add replacing", {
      oldRagEntryId: replacedEntry.entryId,
      newRagEntryId: entryId,
    });
    await rag.delete(ctx, { entryId: replacedEntry.entryId });
  }

  const fileSize = new Blob([text]).size;
  console.log("[convex-rag] add done", {
    ragEntryId: entryId,
    fileSize,
    replaced: Boolean(replacedEntry),
  });
  return { ragEntryId: entryId, fileSize };
}

export async function deleteKnowledgeEntryFromRag(
  ctx: ActionCtx,
  ragEntryId: string,
): Promise<void> {
  await getRag().delete(ctx, { entryId: ragEntryId as EntryId });
  console.log("[convex-rag] delete done", { ragEntryId });
}

export function qaEntryText(question: string, answer: string) {
  return `Q: ${question.trim()}\nA: ${answer.trim()}`;
}

export function textEntryText(title: string, content: string) {
  return `${title.trim()}\n\n${content.trim()}`;
}

export type KnowledgeEntryPayloadArgs = {
  entryType: KnowledgeEntryType;
  title?: string;
  content?: string;
  fileName?: string;
  question?: string;
  answer?: string;
  extractedText?: string;
};

export function knowledgeEntryPayload(
  args: KnowledgeEntryPayloadArgs,
): { title: string; text: string } {
  switch (args.entryType) {
    case "text":
      return {
        title: args.title?.trim() ?? "",
        text: textEntryText(args.title ?? "", args.content ?? ""),
      };
    case "file":
      return {
        title: args.fileName?.trim() ?? "",
        text: args.extractedText?.trim() ?? "",
      };
    case "qa":
      return {
        title: args.question?.trim() ?? "",
        text: qaEntryText(args.question ?? "", args.answer ?? ""),
      };
    case "web":
      return {
        title: args.title?.trim() ?? "",
        text: args.content?.trim() ?? "",
      };
  }
}
