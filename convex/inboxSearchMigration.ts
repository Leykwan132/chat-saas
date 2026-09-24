import { Migrations } from "@convex-dev/migrations";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { DataModel, Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./triggers";
import {
  buildInboxChatSearchDocument,
  buildInboxMessageSearchDocument,
  upsertInboxChatSearchDocument,
  upsertInboxMessageSearchDocument,
} from "./inboxSearchProjection";

const migrations = new Migrations<DataModel>(components.migrations);

export const backfillInboxChatSearchDocuments = migrations.define({
  table: "inboxConversationSummaries",
  batchSize: 25,
  migrateOne: async (ctx, summary) => {
    await upsertInboxChatSearchDocument(ctx, summary.conversationId);
  },
});

export const backfillInboxMessageSearchDocuments = migrations.define({
  table: "messages",
  batchSize: 25,
  migrateOne: async (ctx, message) => {
    await upsertInboxMessageSearchDocument(ctx, message._id);
  },
});

export const runBackfillInboxSearchDocuments = migrations.runner([
  internal.inboxSearchMigration.backfillInboxChatSearchDocuments,
  internal.inboxSearchMigration.backfillInboxMessageSearchDocuments,
]);

function documentsMatch(
  stored: Doc<"inboxChatSearchDocuments"> | Doc<"inboxMessageSearchDocuments">,
  expected: Exclude<
    Awaited<ReturnType<typeof buildInboxChatSearchDocument>>,
    null
  > | Exclude<
    Awaited<ReturnType<typeof buildInboxMessageSearchDocument>>,
    null
  >,
) {
  const { _id, _creationTime, ...storedFields } = stored;
  const canonicalize = (document: Record<string, unknown>) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(document).sort(([left], [right]) => left.localeCompare(right)),
      ),
    );
  return canonicalize(storedFields) === canonicalize(expected);
}

async function reconcileDocument(
  ctx: MutationCtx,
  stored: Array<Doc<"inboxChatSearchDocuments">> | Array<Doc<"inboxMessageSearchDocuments">>,
  expected: Exclude<
    Awaited<ReturnType<typeof buildInboxChatSearchDocument>>,
    null
  > | Exclude<
    Awaited<ReturnType<typeof buildInboxMessageSearchDocument>>,
    null
  > | null,
  repair: boolean,
) {
  const missing = expected !== null && stored.length === 0;
  const duplicate = stored.length > 1;
  const stale =
    (expected === null && stored.length > 0) ||
    (expected !== null && stored.length === 1 && !documentsMatch(stored[0]!, expected));
  if (repair && (missing || duplicate || stale)) {
    for (const document of stored) {
      await ctx.db.delete(document._id);
    }
    if (expected !== null) {
      if ("messageId" in expected) {
        await ctx.db.insert("inboxMessageSearchDocuments", expected);
      } else {
        await ctx.db.insert("inboxChatSearchDocuments", expected);
      }
    }
  }
  return { missing, duplicate, stale, repaired: Number(repair && (missing || duplicate || stale)) };
}

export async function reconcileInboxSearchDocumentsPage(
  ctx: MutationCtx,
  paginationOpts: { cursor: string | null; numItems: number },
  repair: boolean,
) {
  const page = await ctx.db.query("inboxConversationSummaries").paginate(paginationOpts);
  let missing = 0;
  let duplicate = 0;
  let stale = 0;
  let repaired = 0;
  for (const summary of page.page) {
    const chatStored = await ctx.db
      .query("inboxChatSearchDocuments")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", summary.conversationId))
      .collect();
    const chatResult = await reconcileDocument(
      ctx,
      chatStored,
      await buildInboxChatSearchDocument(ctx, summary.conversationId),
      repair,
    );
    missing += Number(chatResult.missing);
    duplicate += Number(chatResult.duplicate);
    stale += Number(chatResult.stale);
    repaired += chatResult.repaired;
    const messages = ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", summary.conversationId),
      );
    for await (const message of messages) {
      const messageStored = await ctx.db
        .query("inboxMessageSearchDocuments")
        .withIndex("by_messageId", (q) => q.eq("messageId", message._id))
        .collect();
      const messageResult = await reconcileDocument(
        ctx,
        messageStored,
        await buildInboxMessageSearchDocument(ctx, message._id),
        repair,
      );
      missing += Number(messageResult.missing);
      duplicate += Number(messageResult.duplicate);
      stale += Number(messageResult.stale);
      repaired += messageResult.repaired;
    }
  }
  return {
    continueCursor: page.continueCursor,
    isDone: page.isDone,
    scanned: page.page.length,
    missing,
    duplicate,
    stale,
    repaired,
  };
}

export const reconcileInboxSearchDocuments = mutation({
  args: { paginationOpts: paginationOptsValidator, repair: v.boolean() },
  handler: async (ctx, args) =>
    await reconcileInboxSearchDocumentsPage(ctx, args.paginationOpts, args.repair),
});
