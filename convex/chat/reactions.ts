import { v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  INBOX_REACTION_EMOJIS,
  MAX_REACTIONS_PER_MESSAGE,
  isAllowedInboxReactionEmoji,
  type InboxReactionSource,
} from "../../shared/messageReactions";

const reactionSourceValidator = v.union(
  v.literal("customer"),
  v.literal("human"),
  v.literal("ai"),
);

export const allowedReactionEmojiValidator = v.union(
  ...INBOX_REACTION_EMOJIS.map((emoji) => v.literal(emoji)),
);

type MessageReaction = NonNullable<Doc<"messages">["reactions"]>[number];

function actorKey(source: InboxReactionSource, key: string): string {
  return `${source}:${key}`;
}

function actorIdentity(args: {
  source: InboxReactionSource;
  actorUserId?: string;
  actorAgentId?: Id<"agents">;
  fallbackActorKey: string;
}): string {
  return (
    args.actorUserId ??
    args.actorAgentId ??
    args.fallbackActorKey
  );
}

async function resolveTargetMessage(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">;
    messageId?: Id<"messages">;
    externalId?: string;
    agentMessageId?: string;
  },
): Promise<Doc<"messages"> | null> {
  let msg: Doc<"messages"> | null = null;
  if (args.messageId !== undefined) {
    msg = await ctx.db.get(args.messageId);
  } else if (args.externalId !== undefined) {
    msg = await ctx.db
      .query("messages")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
  } else if (args.agentMessageId !== undefined) {
    msg = await ctx.db
      .query("messages")
      .withIndex("by_agentMessageId", (q) =>
        q.eq("agentMessageId", args.agentMessageId),
      )
      .unique();
  }
  if (msg === null || msg.conversationId !== args.conversationId) {
    return null;
  }
  return msg;
}

async function patchReaction(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">;
    messageId?: Id<"messages">;
    externalId?: string;
    agentMessageId?: string;
    emoji: string;
    source: InboxReactionSource;
    actorUserId?: string;
    actorAgentId?: Id<"agents">;
    actorName?: string;
    externalReactionMessageId?: string;
  },
): Promise<{
  ok: boolean;
  targetMessageId?: Id<"messages">;
  targetExternalId?: string;
  targetAgentMessageId?: string;
  error?: string;
}> {
  if (args.source !== "customer" && !isAllowedInboxReactionEmoji(args.emoji)) {
    return { ok: false, error: "Unsupported reaction emoji" };
  }
  const target = await resolveTargetMessage(ctx, args);
  if (target === null) {
    return { ok: false, error: "Target message not found" };
  }
  const identity = actorIdentity({
    source: args.source,
    actorUserId: args.actorUserId,
    actorAgentId: args.actorAgentId,
    fallbackActorKey: target.contactAddress,
  });
  const key = actorKey(args.source, identity);
  const now = Date.now();
  const current = target.reactions ?? [];
  const existing = current.find((r) => r.actorKey === key);
  const nextReaction: MessageReaction = {
    emoji: args.emoji,
    source: args.source,
    actorKey: key,
    actorUserId: args.actorUserId,
    actorAgentId: args.actorAgentId,
    actorName: args.actorName,
    externalReactionMessageId: args.externalReactionMessageId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const withoutActor = current.filter((r) => r.actorKey !== key);
  const next = [...withoutActor, nextReaction].slice(-MAX_REACTIONS_PER_MESSAGE);
  await ctx.db.patch(target._id, { reactions: next });
  return {
    ok: true,
    targetMessageId: target._id,
    targetExternalId: target.externalId,
    targetAgentMessageId: target.agentMessageId,
  };
}

async function removeReaction(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">;
    messageId?: Id<"messages">;
    externalId?: string;
    agentMessageId?: string;
    source: InboxReactionSource;
    actorUserId?: string;
    actorAgentId?: Id<"agents">;
    fallbackActorKey?: string;
  },
): Promise<{
  ok: boolean;
  targetMessageId?: Id<"messages">;
  targetExternalId?: string;
  targetAgentMessageId?: string;
  error?: string;
}> {
  const target = await resolveTargetMessage(ctx, args);
  if (target === null) {
    return { ok: false, error: "Target message not found" };
  }
  const identity = actorIdentity({
    source: args.source,
    actorUserId: args.actorUserId,
    actorAgentId: args.actorAgentId,
    fallbackActorKey: args.fallbackActorKey ?? target.contactAddress,
  });
  const key = actorKey(args.source, identity);
  const next = (target.reactions ?? []).filter((r) => r.actorKey !== key);
  await ctx.db.patch(target._id, { reactions: next });
  return {
    ok: true,
    targetMessageId: target._id,
    targetExternalId: target.externalId,
    targetAgentMessageId: target.agentMessageId,
  };
}

export const internalResolveReactionTarget = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")),
    externalId: v.optional(v.string()),
    agentMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let msg: Doc<"messages"> | null = null;
    if (args.messageId !== undefined) {
      msg = await ctx.db.get(args.messageId);
    } else if (args.externalId !== undefined) {
      msg = await ctx.db
        .query("messages")
        .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
        .unique();
    } else if (args.agentMessageId !== undefined) {
      msg = await ctx.db
        .query("messages")
        .withIndex("by_agentMessageId", (q) =>
          q.eq("agentMessageId", args.agentMessageId),
        )
        .unique();
    }
    if (msg === null || msg.conversationId !== args.conversationId) {
      return null;
    }
    return {
      messageId: msg._id,
      externalId: msg.externalId,
      agentMessageId: msg.agentMessageId,
      direction: msg.direction,
      conversationId: msg.conversationId,
    };
  },
});

export const internalGetLatestIncomingReactionTarget = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(50);
    const msg = rows.find((row) => row.direction === "incoming" && row.externalId);
    if (!msg) return null;
    return {
      messageId: msg._id,
      externalId: msg.externalId,
      agentMessageId: msg.agentMessageId,
      conversationId: msg.conversationId,
    };
  },
});

export const internalUpsertReaction = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")),
    externalId: v.optional(v.string()),
    agentMessageId: v.optional(v.string()),
    emoji: v.string(),
    source: reactionSourceValidator,
    actorUserId: v.optional(v.string()),
    actorAgentId: v.optional(v.id("agents")),
    actorName: v.optional(v.string()),
    externalReactionMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await patchReaction(ctx, args);
  },
});

export const internalRemoveReaction = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")),
    externalId: v.optional(v.string()),
    agentMessageId: v.optional(v.string()),
    source: reactionSourceValidator,
    actorUserId: v.optional(v.string()),
    actorAgentId: v.optional(v.id("agents")),
    fallbackActorKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await removeReaction(ctx, args);
  },
});
