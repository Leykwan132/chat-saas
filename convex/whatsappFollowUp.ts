import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { getAuthContext, PERSONAL_ORG_FALLBACK, resolveChannelOrgId } from "./authUtils";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { followUpPool } from "./followUpPool";
import { checkAiFeature, getTeamStripePlanHelper } from "./plans";

async function assertFollowUpsAvailable(
  ctx: QueryCtx | MutationCtx,
  orgId: string,
  userId: string,
) {
  try {
    const stripeInfo = await getTeamStripePlanHelper(ctx, { workosOrgId: orgId, userId });
    if (checkAiFeature(stripeInfo.plan, "follow_ups")) {
      return;
    }
  } catch {
    // Fall through to the plan error below for missing or inactive billing.
  }
  throw new Error("Follow-ups are not available on your plan.");
}

async function assertAgentInOrg(
  ctx: QueryCtx | MutationCtx,
  agentId: Id<"agents">,
  orgId: string,
  userId: string,
) {
  const agent = await ctx.db.get(agentId);
  if (agent === null) {
    throw new Error("Agent not found");
  }
  const normalizedOrgId =
    !orgId || orgId === "personal" ? PERSONAL_ORG_FALLBACK : orgId;
  const agentOrgId =
    !agent.orgId || agent.orgId === "personal"
      ? PERSONAL_ORG_FALLBACK
      : agent.orgId;
  if (agentOrgId !== PERSONAL_ORG_FALLBACK) {
    if (agentOrgId !== normalizedOrgId) {
      throw new Error("Agent not found");
    }
    return agent;
  }
  if (agent.userId !== userId) {
    throw new Error("Agent not found");
  }
  return agent;
}

export const createFollowUpRule = mutation({
  args: {
    agentId: v.id("agents"),
    channelId: v.id("channels"),
    name: v.string(),
    attempts: v.array(
      v.object({
        attemptNumber: v.number(),
        templateName: v.string(),
        templateLanguage: v.string(),
      })
    ),
    maxAttempts: v.number(),
    triggerDelayHours: v.number(),
    intervalHours: v.number(),
    audienceLeadTemperatures: v.array(
      v.union(v.literal("Hot"), v.literal("Warm"), v.literal("Cold"))
    ),
    audienceTags: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    estimatedCostPerCustomer: v.number(),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    if (!orgId || !userId) {
      throw new Error("Unauthorized");
    }
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    await assertFollowUpsAvailable(ctx, orgId, userId);
    await assertAgentInOrg(ctx, args.agentId, orgId, userId);

    // Security check: verify channel belongs to the resolvedOrgId
    const channel = await ctx.db.get(args.channelId);
    if (channel === null || channel.orgId !== resolvedOrgId) {
      throw new Error("Channel not found");
    }

    const name = args.name.trim();
    if (!name) {
      throw new Error("Rule name is required");
    }

    if (args.maxAttempts < 1 || args.maxAttempts > 10) {
      throw new Error("Max attempts must be between 1 and 10");
    }

    if (args.attempts.length !== args.maxAttempts) {
      throw new Error("Attempts config length must match maxAttempts");
    }

    const now = Date.now();
    return await ctx.db.insert("followUpRules", {
      agentId: args.agentId,
      orgId: resolvedOrgId,
      channelId: args.channelId,
      name,
      attempts: args.attempts,
      maxAttempts: args.maxAttempts,
      triggerDelayHours: args.triggerDelayHours,
      intervalHours: args.intervalHours,
      audienceLeadTemperatures: args.audienceLeadTemperatures,
      audienceTags: args.audienceTags,
      isActive: args.isActive,
      messagesSentCount: 0,
      repliesReceivedCount: 0,
      estimatedCostPerCustomer: args.estimatedCostPerCustomer,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listFollowUpRules = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    if (!orgId || !userId) {
      return [];
    }
    await assertAgentInOrg(ctx, args.agentId, orgId, userId);

    return await ctx.db
      .query("followUpRules")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();
  },
});

export const getFollowUpRule = query({
  args: { id: v.id("followUpRules") },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    if (!orgId || !userId) {
      return null;
    }
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const rule = await ctx.db.get(args.id);
    if (rule === null || rule.orgId !== resolvedOrgId) {
      return null;
    }
    await assertAgentInOrg(ctx, rule.agentId, orgId, userId);
    return rule;
  },
});

const followUpAttemptValidator = v.object({
  attemptNumber: v.number(),
  templateName: v.string(),
  templateLanguage: v.string(),
});

export const updateFollowUpRule = mutation({
  args: {
    id: v.id("followUpRules"),
    name: v.string(),
    attempts: v.array(followUpAttemptValidator),
    maxAttempts: v.number(),
    triggerDelayHours: v.number(),
    intervalHours: v.number(),
    audienceLeadTemperatures: v.array(
      v.union(v.literal("Hot"), v.literal("Warm"), v.literal("Cold")),
    ),
    audienceTags: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    estimatedCostPerCustomer: v.number(),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    if (!orgId || !userId) {
      throw new Error("Unauthorized");
    }
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const rule = await ctx.db.get(args.id);
    if (rule === null || rule.orgId !== resolvedOrgId) {
      throw new Error("Follow-up rule not found");
    }
    if (args.isActive) {
      await assertFollowUpsAvailable(ctx, orgId, userId);
    }

    const name = args.name.trim();
    if (!name) {
      throw new Error("Rule name is required");
    }

    if (args.maxAttempts < 1 || args.maxAttempts > 10) {
      throw new Error("Max attempts must be between 1 and 10");
    }

    if (args.attempts.length !== args.maxAttempts) {
      throw new Error("Attempts config length must match maxAttempts");
    }

    const invalidAttempts = args.attempts.filter((att) => !att.templateName.trim());
    if (invalidAttempts.length > 0) {
      throw new Error("Please select a template for all attempts");
    }

    if (args.audienceLeadTemperatures.length === 0 && (args.audienceTags?.length ?? 0) === 0) {
      throw new Error("Select at least one audience filter");
    }

    await ctx.db.patch(args.id, {
      name,
      attempts: args.attempts.map((att) => ({
        attemptNumber: att.attemptNumber,
        templateName: att.templateName.trim(),
        templateLanguage: att.templateLanguage.trim(),
      })),
      maxAttempts: args.maxAttempts,
      triggerDelayHours: args.triggerDelayHours,
      intervalHours: args.intervalHours,
      audienceLeadTemperatures: args.audienceLeadTemperatures,
      audienceTags: args.audienceTags,
      isActive: args.isActive,
      estimatedCostPerCustomer: args.estimatedCostPerCustomer,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const deleteFollowUpRule = mutation({
  args: { id: v.id("followUpRules") },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    if (!orgId || !userId) {
      throw new Error("Unauthorized");
    }
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const rule = await ctx.db.get(args.id);
    if (rule === null || rule.orgId !== resolvedOrgId) {
      throw new Error("Follow-up rule not found");
    }
    await ctx.db.delete(args.id);
    return true;
  },
});

export const setFollowUpRuleActive = mutation({
  args: {
    id: v.id("followUpRules"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    if (!orgId || !userId) {
      throw new Error("Unauthorized");
    }
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const rule = await ctx.db.get(args.id);
    if (rule === null || rule.orgId !== resolvedOrgId) {
      throw new Error("Follow-up rule not found");
    }
    if (args.isActive) {
      await assertFollowUpsAvailable(ctx, orgId, userId);
    }
    await ctx.db.patch(args.id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });
    return true;
  },
});

const followUpSendStatusValidator = v.union(
  v.literal("sent"),
  v.literal("delivered"),
  v.literal("failed"),
);

/** Per-send log rows for follow-up detail (historical sends). */
export const listFollowUpSendsForRule = query({
  args: { ruleId: v.id("followUpRules") },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    if (!orgId || !userId) {
      return null;
    }
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);

    const rule = await ctx.db.get(args.ruleId);
    if (rule === null || rule.orgId !== resolvedOrgId) {
      return null;
    }
    await assertAgentInOrg(ctx, rule.agentId, orgId, userId);

    const rows = await ctx.db
      .query("followUpSends")
      .withIndex("by_ruleId_and_sentAt", (q) => q.eq("ruleId", args.ruleId))
      .order("desc")
      .take(500);

    return rows.map((row) => ({
      _id: row._id,
      phone: row.recipientPhone,
      name: row.recipientName,
      attemptNumber: row.attemptNumber,
      templateName: row.templateName,
      templateLanguage: row.templateLanguage,
      sentAt: row.sentAt,
      status: row.status,
      deliveryLabel:
        row.status === "delivered"
          ? "Delivered"
          : row.status === "failed"
            ? "Failed"
            : "Sent",
      estCostMyr: row.estCostMyr,
      errorMessage: row.errorMessage,
    }));
  },
});

/** Called by the follow-up sender when a template message is dispatched. */
export const recordFollowUpSend = internalMutation({
  args: {
    ruleId: v.id("followUpRules"),
    orgId: v.string(),
    recipientPhone: v.string(),
    recipientName: v.optional(v.string()),
    attemptNumber: v.number(),
    templateName: v.string(),
    templateLanguage: v.string(),
    sentAt: v.number(),
    status: followUpSendStatusValidator,
    estCostMyr: v.number(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.ruleId);
    if (rule === null || rule.orgId !== args.orgId) {
      return;
    }

    await ctx.db.insert("followUpSends", {
      ruleId: args.ruleId,
      orgId: args.orgId,
      recipientPhone: args.recipientPhone.trim(),
      recipientName: args.recipientName?.trim() || undefined,
      attemptNumber: args.attemptNumber,
      templateName: args.templateName.trim(),
      templateLanguage: args.templateLanguage.trim(),
      sentAt: args.sentAt,
      status: args.status,
      estCostMyr: args.estCostMyr,
      errorMessage: args.errorMessage,
    });

    const sentDelta = args.status === "failed" ? 0 : 1;
    await ctx.db.patch(args.ruleId, {
      messagesSentCount: (rule.messagesSentCount ?? 0) + sentDelta,
      updatedAt: Date.now(),
    });
  },
});



export const runDailyFollowUpScan = internalMutation({
  args: {},
  handler: async (ctx) => {
    const activeRules = await ctx.db
      .query("followUpRules")
      .collect();
    
    const activeRulesFiltered = activeRules.filter((r) => r.isActive);
    let scheduledCount = 0;

    for (const rule of activeRulesFiltered) {
      const customers = await ctx.db
        .query("customers")
        .withIndex("by_orgId_and_lastSeenAt", (q) => q.eq("orgId", rule.orgId))
        .collect();

      for (const customer of customers) {
        if (!customer.leadTemperature || !rule.audienceLeadTemperatures.includes(customer.leadTemperature)) {
          continue;
        }

        if (rule.audienceTags && rule.audienceTags.length > 0) {
          const hasMatchingTag = customer.tags.some((t) => rule.audienceTags!.includes(t));
          if (!hasMatchingTag) {
            continue;
          }
        }

        if (customer.followUpPending === true) {
          continue;
        }

        const currentAttempt = customer.followUpAttempt ?? 0;
        if (currentAttempt >= rule.maxAttempts) {
          continue;
        }

        if (!customer.lastConversationId) {
          continue;
        }
        const conversation = await ctx.db.get(customer.lastConversationId);
        if (!conversation) {
          continue;
        }

        if (conversation.channelId !== rule.channelId) {
          continue;
        }
        if (conversation.status === "closed") {
          continue;
        }

        const lastMsgAt = conversation.lastMessageAt;
        const lastCustMsgAt = conversation.lastCustomerMessageAt;
        const lastMessageWasOutbound = !lastCustMsgAt || lastCustMsgAt < lastMsgAt;
        if (!lastMessageWasOutbound) {
          continue;
        }

        const delayHours = currentAttempt === 0 ? rule.triggerDelayHours : rule.intervalHours;
        const expectedTime = lastMsgAt + delayHours * 3600 * 1000;

        await ctx.db.patch(customer._id, {
          followUpPending: true,
          followUpPendingRuleId: rule._id,
          followUpScheduledAt: expectedTime,
          updatedAt: Date.now(),
        });

        await followUpPool.enqueueAction(
          ctx,
          internal.followUpPool.followUpWorker as any,
          {
            customerId: customer._id,
            ruleId: rule._id,
            expectedTime,
            scheduledLastMessageAt: lastMsgAt,
          },
          {
            onComplete: internal.followUpPool.followUpComplete as any,
            context: {
              customerId: customer._id,
              ruleId: rule._id,
              attemptNumber: currentAttempt + 1,
              expectedTime,
              scheduledLastMessageAt: lastMsgAt,
            },
            runAt: expectedTime,
          }
        );

        scheduledCount++;
      }
    }

    return { scheduledCount };
  },
});

export const scheduleNextAttempt = internalMutation({
  args: {
    customerId: v.id("customers"),
    ruleId: v.id("followUpRules"),
    nextAttemptNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) return;
    const rule = await ctx.db.get(args.ruleId);
    if (!rule || !rule.isActive) return;

    const nextExpectedTime = Date.now() + rule.intervalHours * 3600 * 1000;

    await ctx.db.patch(args.customerId, {
      followUpAttempt: args.nextAttemptNumber - 1,
      followUpPending: true,
      followUpPendingRuleId: args.ruleId,
      followUpScheduledAt: nextExpectedTime,
      updatedAt: Date.now(),
    });

    await followUpPool.enqueueAction(
      ctx,
      internal.followUpPool.followUpWorker as any,
      {
        customerId: args.customerId,
        ruleId: args.ruleId,
        expectedTime: nextExpectedTime,
        scheduledLastMessageAt: Date.now(),
      },
      {
        onComplete: internal.followUpPool.followUpComplete as any,
        context: {
          customerId: args.customerId,
          ruleId: args.ruleId,
          attemptNumber: args.nextAttemptNumber,
          expectedTime: nextExpectedTime,
          scheduledLastMessageAt: Date.now(),
        },
        runAt: nextExpectedTime,
      }
    );
  },
});


