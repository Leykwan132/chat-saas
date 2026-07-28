"use node";

import { WorkOS } from "@workos-inc/node";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { buildAgent } from "../chat/threads";
import { deleteFromCF } from "../cloudflare";
import { r2 } from "../media/r2";
import { getWorkOSApiKey } from "../workosClient";

const PAGE_SIZE = 20;
const STAGES = [
  "threads",
  "mediaUploads",
  "quickReplies",
  "templateMedia",
  "textEntries",
  "fileEntries",
  "webEntries",
  "qaEntries",
  "widgetStorage",
] as const;

type ExternalStage = (typeof STAGES)[number];
type Page<T> = {
  page: T[];
  isDone: boolean;
  continueCursor: string;
};

type ExternalPageResult = {
  done: boolean;
  cursor?: string;
};

function decodeCursor(cursor?: string): {
  stage: ExternalStage;
  pageCursor: string | null;
} {
  if (!cursor) return { stage: STAGES[0], pageCursor: null };
  const separator = cursor.indexOf(":");
  const stage = cursor.slice(0, separator) as ExternalStage;
  if (!STAGES.includes(stage)) {
    throw new Error(`Invalid external deletion stage: ${stage}`);
  }
  return {
    stage,
    pageCursor: cursor.slice(separator + 1) || null,
  };
}

function advance(
  stage: ExternalStage,
  page: Pick<Page<unknown>, "isDone" | "continueCursor">,
): ExternalPageResult {
  if (!page.isDone) {
    return { done: false, cursor: `${stage}:${page.continueCursor}` };
  }
  const nextStage = STAGES[STAGES.indexOf(stage) + 1];
  return nextStage
    ? { done: false, cursor: `${nextStage}:` }
    : { done: true };
}

async function deleteThreadPage(
  ctx: ActionCtx,
  jobId: Id<"teamDeletionJobs">,
  pageCursor: string | null,
): Promise<Page<unknown>> {
  const page: Page<{
    threadId: string;
    agentId?: Id<"agents">;
  }> | null = await ctx.runQuery(
    internal.teamDeletion.externalState.getThreadPage,
    { jobId, paginationOpts: { numItems: PAGE_SIZE, cursor: pageCursor } },
  );
  if (!page) return { page: [], isDone: true, continueCursor: "" };
  for (const item of page.page) {
    if (!item.agentId) {
      throw new Error(`Agent not found for thread ${item.threadId}`);
    }
    const agent: Doc<"agents"> | null = await ctx.runQuery(
      internal.teamDeletion.externalState.getAgent,
      { agentId: item.agentId },
    );
    if (!agent) {
      throw new Error(`Agent ${item.agentId} not found`);
    }
    await buildAgent(agent, item.agentId).deleteThreadAsync(ctx, {
      threadId: item.threadId,
    });
  }
  return page;
}

async function deleteR2Keys(
  ctx: ActionCtx,
  keys: string[],
): Promise<void> {
  for (const key of [...new Set(keys.filter(Boolean))]) {
    await r2.deleteObject(ctx, key);
  }
}

async function deleteMediaUploadPage(
  ctx: ActionCtx,
  jobId: Id<"teamDeletionJobs">,
  pageCursor: string | null,
): Promise<Page<unknown>> {
  const page: Page<{ r2Key?: string }> | null = await ctx.runQuery(
    internal.teamDeletion.externalState.getMediaUploadPage,
    { jobId, paginationOpts: { numItems: PAGE_SIZE, cursor: pageCursor } },
  );
  if (!page) return { page: [], isDone: true, continueCursor: "" };
  await deleteR2Keys(
    ctx,
    page.page.flatMap((row) => row.r2Key ? [row.r2Key] : []),
  );
  return page;
}

async function deleteQuickReplyPage(
  ctx: ActionCtx,
  jobId: Id<"teamDeletionJobs">,
  pageCursor: string | null,
): Promise<Page<unknown>> {
  const page: Page<{ r2Key?: string; r2Keys?: string[] }> | null =
    await ctx.runQuery(
      internal.teamDeletion.externalState.getQuickReplyPage,
      { jobId, paginationOpts: { numItems: PAGE_SIZE, cursor: pageCursor } },
    );
  if (!page) return { page: [], isDone: true, continueCursor: "" };
  await deleteR2Keys(ctx, page.page.flatMap((row) => [
    ...(row.r2Key ? [row.r2Key] : []),
    ...(row.r2Keys ?? []),
  ]));
  return page;
}

async function deleteTemplateMediaPage(
  ctx: ActionCtx,
  jobId: Id<"teamDeletionJobs">,
  pageCursor: string | null,
): Promise<Page<unknown>> {
  const page: Page<{ r2Key: string }> | null = await ctx.runQuery(
    internal.teamDeletion.externalState.getTemplateMediaPage,
    { jobId, paginationOpts: { numItems: PAGE_SIZE, cursor: pageCursor } },
  );
  if (!page) return { page: [], isDone: true, continueCursor: "" };
  await deleteR2Keys(ctx, page.page.map((row) => row.r2Key));
  return page;
}

async function deleteKnowledgePage(
  ctx: ActionCtx,
  jobId: Id<"teamDeletionJobs">,
  stage: Extract<
    ExternalStage,
    "textEntries" | "fileEntries" | "webEntries" | "qaEntries"
  >,
  pageCursor: string | null,
): Promise<Page<unknown>> {
  const page: Page<{ cfItemId?: string }> | null = await ctx.runQuery(
    internal.teamDeletion.externalState.getKnowledgePage,
    {
      jobId,
      table: stage,
      paginationOpts: { numItems: PAGE_SIZE, cursor: pageCursor },
    },
  );
  if (!page) return { page: [], isDone: true, continueCursor: "" };
  for (const row of page.page) {
    if (row.cfItemId) await deleteFromCF(row.cfItemId);
  }
  return page;
}

async function deleteWidgetStoragePage(
  ctx: ActionCtx,
  jobId: Id<"teamDeletionJobs">,
  pageCursor: string | null,
): Promise<Page<unknown>> {
  const page: Page<{ iconStorageId?: Id<"_storage"> }> | null =
    await ctx.runQuery(
      internal.teamDeletion.externalState.getWidgetStoragePage,
      { jobId, paginationOpts: { numItems: PAGE_SIZE, cursor: pageCursor } },
    );
  if (!page) return { page: [], isDone: true, continueCursor: "" };
  const storageIds = page.page.flatMap((row) =>
    row.iconStorageId ? [row.iconStorageId] : [],
  );
  if (storageIds.length > 0) {
    await ctx.runMutation(
      internal.teamDeletion.externalState.deleteStorageObjects,
      { storageIds },
    );
  }
  return page;
}

export async function deleteExternalPage(
  ctx: ActionCtx,
  jobId: Id<"teamDeletionJobs">,
  cursor?: string,
): Promise<ExternalPageResult> {
  const { stage, pageCursor } = decodeCursor(cursor);
  let page: Page<unknown>;
  if (stage === "threads") {
    page = await deleteThreadPage(ctx, jobId, pageCursor);
  } else if (stage === "mediaUploads") {
    page = await deleteMediaUploadPage(ctx, jobId, pageCursor);
  } else if (stage === "quickReplies") {
    page = await deleteQuickReplyPage(ctx, jobId, pageCursor);
  } else if (stage === "templateMedia") {
    page = await deleteTemplateMediaPage(ctx, jobId, pageCursor);
  } else if (stage === "widgetStorage") {
    page = await deleteWidgetStoragePage(ctx, jobId, pageCursor);
  } else {
    page = await deleteKnowledgePage(ctx, jobId, stage, pageCursor);
  }
  return advance(stage, page);
}

export async function deleteWorkosOrganization(
  workosOrgId: string,
): Promise<void> {
  try {
    const workos = new WorkOS(getWorkOSApiKey());
    await workos.organizations.deleteOrganization(workosOrgId);
  } catch (error) {
    const status = (error as { status?: number; statusCode?: number }).status ??
      (error as { statusCode?: number }).statusCode;
    if (status === 404) return;
    throw error;
  }
}
