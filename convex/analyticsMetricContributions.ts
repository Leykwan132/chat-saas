import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export type AnalyticsMetricContribution = Omit<
  Doc<"analyticsMetricEntries">,
  "_id" | "_creationTime" | "createdAt" | "updatedAt"
>;

const comparableFields = [
  "namespace",
  "sortKey",
  "value",
  "metric",
  "orgId",
  "memberUserId",
  "service",
  "channelId",
  "topicId",
  "sourceConversationId",
  "sourceMessageId",
  "sourceKey",
] as const;

function contributionMatches(
  current: Doc<"analyticsMetricEntries">,
  desired: AnalyticsMetricContribution,
): boolean {
  return comparableFields.every((field) => current[field] === desired[field]);
}

async function metricContributionBySourceKey(
  ctx: MutationCtx,
  sourceKey: string,
) {
  return await ctx.db
    .query("analyticsMetricEntries")
    .withIndex("by_sourceKey", (query) => query.eq("sourceKey", sourceKey))
    .unique();
}

export async function ensureMetricContribution(
  ctx: MutationCtx,
  desired: AnalyticsMetricContribution,
) {
  const current = await metricContributionBySourceKey(ctx, desired.sourceKey);
  const now = Date.now();
  if (current === null) {
    return await ctx.db.insert("analyticsMetricEntries", {
      ...desired,
      createdAt: now,
      updatedAt: now,
    });
  }
  if (contributionMatches(current, desired)) return current._id;
  await ctx.db.patch(current._id, { ...desired, updatedAt: now });
  return current._id;
}

export const replaceMetricContribution = ensureMetricContribution;

export async function removeMetricContribution(
  ctx: MutationCtx,
  sourceKey: string,
) {
  const current = await metricContributionBySourceKey(ctx, sourceKey);
  if (current === null) return false;
  await ctx.db.delete(current._id);
  return true;
}

export async function reconcileMetricContributions(
  ctx: MutationCtx,
  desired: readonly AnalyticsMetricContribution[],
  sourceKeys: readonly string[],
) {
  const desiredBySourceKey = new Map(
    desired.map((entry) => [entry.sourceKey, entry] as const),
  );
  for (const sourceKey of sourceKeys) {
    const contribution = desiredBySourceKey.get(sourceKey);
    if (contribution === undefined) {
      await removeMetricContribution(ctx, sourceKey);
    } else {
      await ensureMetricContribution(ctx, contribution);
    }
  }
}
