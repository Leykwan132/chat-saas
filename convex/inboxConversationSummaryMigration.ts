import { Migrations } from "@convex-dev/migrations";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { DataModel, Doc } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import {
  buildInboxConversationSummary,
  upsertInboxConversationSummary,
} from "./inboxConversationSummary";

const migrations = new Migrations<DataModel>(components.migrations);

export const backfillInboxConversationSummaries = migrations.define({
  table: "conversations",
  batchSize: 25,
  migrateOne: async (ctx, conversation) => {
    await upsertInboxConversationSummary(ctx, conversation._id);
  },
});

export const runBackfillInboxConversationSummaries = migrations.runner(
  internal.inboxConversationSummaryMigration.backfillInboxConversationSummaries,
);

function summaryMatches(
  stored: Doc<"inboxConversationSummaries">,
  expected: Exclude<
    Awaited<ReturnType<typeof buildInboxConversationSummary>>,
    null
  >,
) {
  const { _id, _creationTime, ...storedFields } = stored;
  const canonicalize = (summary: Record<string, unknown>) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(summary).sort(([left], [right]) => left.localeCompare(right)),
      ),
    );
  return canonicalize(storedFields) === canonicalize(expected);
}

export async function reconcileInboxConversationSummaryPage(
  ctx: MutationCtx,
  paginationOpts: { cursor: string | null; numItems: number },
  repair: boolean,
) {
  const page = await ctx.db.query("conversations").paginate(paginationOpts);
  let missing = 0;
  let duplicate = 0;
  let stale = 0;
  let repaired = 0;
  for (const conversation of page.page) {
    const expected = await buildInboxConversationSummary(ctx, conversation._id);
    const stored = await ctx.db
      .query("inboxConversationSummaries")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conversation._id))
      .collect();
    const isMissing = expected !== null && stored.length === 0;
    const isDuplicate = stored.length > 1;
    const isStale =
      (expected === null && stored.length > 0) ||
      (expected !== null && stored.length === 1 && !summaryMatches(stored[0]!, expected));
    missing += Number(isMissing);
    duplicate += Number(isDuplicate);
    stale += Number(isStale);
    if (!repair || (!isMissing && !isDuplicate && !isStale)) {
      continue;
    }
    for (const summary of stored) {
      await ctx.db.delete(summary._id);
    }
    if (expected !== null) {
      await ctx.db.insert("inboxConversationSummaries", expected);
    }
    repaired += 1;
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

export const reconcileInboxConversationSummaries = internalMutation({
  args: {
    paginationOpts: paginationOptsValidator,
    repair: v.boolean(),
  },
  handler: async (ctx, args) =>
    await reconcileInboxConversationSummaryPage(ctx, args.paginationOpts, args.repair),
});
