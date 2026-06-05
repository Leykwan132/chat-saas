import { v } from "convex/values";
import { Workpool } from "@convex-dev/workpool";
import { components, internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { ingestChannelMessage } from "./chat/threads";

export const followUpPool = new Workpool(
  components.followUpWorkpool,
  { maxParallelism: 3 }, // Meta Graph API rate limit safety
);

const WHATSAPP_DEMO_ACCESS_SENTINEL = "__whatsapp_demo__";
const DEFAULT_GRAPH_VERSION = "v22.0";

function graphBase(): string {
  const version = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  return `https://graph.facebook.com/${version}`;
}

function resolveAccessToken(channel: Doc<"channels">): string {
  const isDemo = channel.accessToken === WHATSAPP_DEMO_ACCESS_SENTINEL;
  const token = isDemo
    ? (process.env.WHATSAPP_DEMO_ACCESS_TOKEN ?? "").trim()
    : (channel.accessToken ?? "").trim();
  if (!token) {
    throw new Error(
      isDemo
        ? "Set WHATSAPP_DEMO_ACCESS_TOKEN on your Convex deployment to use the demo WhatsApp channel."
        : "WhatsApp channel has no access token. Reconnect in Channels.",
    );
  }
  return token;
}

export const followUpWorker = internalAction({
  args: {
    customerId: v.id("customers"),
    ruleId: v.id("followUpRules"),
    expectedTime: v.number(),
    scheduledLastMessageAt: v.number(),
  },
  handler: async (ctx, args): Promise<
    | { skipped: true; reason: string }
    | {
        ok: true;
        externalId: string | undefined;
        templateName: string;
        templateLanguage: string;
        attemptNumber: number;
      }
  > => {
    const context: {
      customer: Doc<"customers">;
      rule: Doc<"followUpRules">;
      conversation: Doc<"conversations">;
      channel: Doc<"channels">;
    } | null = await ctx.runQuery(
      internal.followUpQueries.getFollowUpWorkerContext,
      { customerId: args.customerId, ruleId: args.ruleId }
    );
    if (!context) {
      return { skipped: true, reason: "Context not found" };
    }
    const { customer, rule, conversation, channel } = context;

    if (!customer.followUpPending) {
      return { skipped: true, reason: "Customer is no longer pending follow-up" };
    }

    if (conversation.status === "closed") {
      return { skipped: true, reason: "Conversation is closed" };
    }

    if (conversation.lastMessageAt !== args.scheduledLastMessageAt) {
      return { skipped: true, reason: "Conversation has new activity" };
    }

    if (!rule.isActive) {
      return { skipped: true, reason: "Follow-up rule is inactive" };
    }

    if (Date.now() < args.expectedTime - 5000) {
      return { skipped: true, reason: "Expected follow-up time has not been reached" };
    }

    const nextAttemptNumber = (customer.followUpAttempt ?? 0) + 1;
    const attemptConfig = rule.attempts.find((a: any) => a.attemptNumber === nextAttemptNumber);
    if (!attemptConfig) {
      return { skipped: true, reason: `No configuration found for attempt number ${nextAttemptNumber}` };
    }

    const token = resolveAccessToken(channel);
    const phoneNumberId = channel.phoneNumberId?.trim();
    if (!phoneNumberId) {
      throw new Error("Phone number ID is missing for this channel.");
    }
    const to = customer.contactAddress.trim() || customer.phone?.trim();
    if (!to) {
      throw new Error(`Customer ${customer._id} has no valid contact address`);
    }

    const skipSend = process.env.SKIP_MESSAGE_TEMPLATE_SEND === "true";
    if (skipSend) {
      return {
        ok: true,
        externalId: "demo-followup-" + Math.random().toString(36).slice(2, 9),
        templateName: attemptConfig.templateName,
        templateLanguage: attemptConfig.templateLanguage,
        attemptNumber: nextAttemptNumber,
      };
    }

    const url = `${graphBase()}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: attemptConfig.templateName.trim(),
          language: { code: attemptConfig.templateLanguage.trim() },
        },
      }),
    });

    const text = await res.text();
    let body: any = null;
    try {
      body = text.length ? JSON.parse(text) : null;
    } catch {}

    if (!res.ok) {
      const errMsg = body?.error?.message ?? `HTTP ${res.status}: ${text}`;
      throw new Error(errMsg);
    }

    const externalId = body?.messages?.[0]?.id;
    return {
      ok: true,
      externalId,
      templateName: attemptConfig.templateName,
      templateLanguage: attemptConfig.templateLanguage,
      attemptNumber: nextAttemptNumber,
    };
  },
});

export const followUpComplete = internalMutation({
  args: {
    workId: v.string(),
    context: v.object({
      customerId: v.id("customers"),
      ruleId: v.id("followUpRules"),
      attemptNumber: v.number(),
      expectedTime: v.number(),
      scheduledLastMessageAt: v.number(),
    }),
    result: v.union(
      v.object({ kind: v.literal("success"), returnValue: v.any() }),
      v.object({ kind: v.literal("failed"), error: v.string() }),
      v.object({ kind: v.literal("canceled") }),
    ),
  },
  handler: async (ctx, args) => {
    const { customerId, ruleId, attemptNumber } = args.context;
    const customer = await ctx.db.get(customerId);
    if (!customer) return;

    const isSuccess = args.result.kind === "success" && args.result.returnValue?.ok;
    
    if (args.result.kind === "success" && args.result.returnValue?.skipped) {
      await ctx.db.patch(customerId, {
        followUpPending: false,
        followUpPendingRuleId: undefined,
        followUpScheduledAt: undefined,
        updatedAt: Date.now(),
      });
      return;
    }

    if (args.result.kind === "canceled") {
      await ctx.db.patch(customerId, {
        followUpPending: false,
        followUpPendingRuleId: undefined,
        followUpScheduledAt: undefined,
        updatedAt: Date.now(),
      });
      return;
    }

    const rule = await ctx.db.get(ruleId);
    if (!rule) return;

    if (isSuccess && args.result.kind === "success") {
      const { externalId, templateName, templateLanguage } = args.result.returnValue;

      const unitMyr = Number(
        process.env.WHATSAPP_BROADCAST_ESTIMATE_MYR_PER_MESSAGE?.trim() ?? "0.3467"
      );
      const rateMyr = Number.isFinite(unitMyr) && unitMyr >= 0 ? unitMyr : 0.3467;

      await ctx.db.insert("followUpSends", {
        ruleId,
        orgId: rule.orgId,
        recipientPhone: customer.contactAddress,
        recipientName: customer.name ?? undefined,
        attemptNumber,
        templateName,
        templateLanguage,
        sentAt: Date.now(),
        status: "sent",
        estCostMyr: rateMyr,
      });

      await ctx.db.patch(ruleId, {
        messagesSentCount: (rule.messagesSentCount ?? 0) + 1,
        updatedAt: Date.now(),
      });

      try {
        await ingestChannelMessage(ctx, {
          channelId: rule.channelId,
          externalId,
          contactAddress: customer.contactAddress,
          contactName: customer.name ?? undefined,
          direction: "outgoing",
          content: `Follow-up Template: ${templateName}`,
          contentType: "text",
          timestampMs: Date.now(),
          assignedAgentId: rule.agentId,
          authorUserId: rule.createdBy,
        });
      } catch (err) {
        console.error("Failed to ingest outgoing follow-up message record:", err);
      }

      const nextAttempt = attemptNumber;
      const hasMoreAttempts = nextAttempt < rule.maxAttempts;

      if (hasMoreAttempts) {
        await ctx.runMutation(internal.whatsappFollowUp.scheduleNextAttempt as any, {
          customerId,
          ruleId,
          nextAttemptNumber: nextAttempt + 1,
        });
      } else {
        await ctx.db.patch(customerId, {
          followUpAttempt: nextAttempt,
          followUpPending: false,
          followUpPendingRuleId: undefined,
          followUpScheduledAt: undefined,
          updatedAt: Date.now(),
        });
      }
    } else {
      const errorMsg = args.result.kind === "failed" ? args.result.error : "Unknown error";

      await ctx.db.insert("followUpSends", {
        ruleId,
        orgId: rule.orgId,
        recipientPhone: customer.contactAddress,
        recipientName: customer.name ?? undefined,
        attemptNumber,
        templateName: rule.attempts.find((a) => a.attemptNumber === attemptNumber)?.templateName ?? "Unknown",
        templateLanguage: rule.attempts.find((a) => a.attemptNumber === attemptNumber)?.templateLanguage ?? "en",
        sentAt: Date.now(),
        status: "failed",
        estCostMyr: 0,
        errorMessage: errorMsg,
      });

      await ctx.db.patch(customerId, {
        followUpPending: false,
        followUpPendingRuleId: undefined,
        followUpScheduledAt: undefined,
        updatedAt: Date.now(),
      });
    }
  },
});
