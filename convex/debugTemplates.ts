import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const getChannels = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("channels").collect();
  },
});

export const getTemplatesDirect = action({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const channel = await ctx.runQuery(internal.channels.internalGetChannel, {
      channelId: args.channelId,
    });
    if (!channel) throw new Error("Channel not found");
    const isDemo = channel.accessToken === "__whatsapp_demo__";
    const token = isDemo
      ? (process.env.WHATSAPP_DEMO_ACCESS_TOKEN ?? "").trim()
      : (channel.accessToken ?? "").trim();
    const wabaId = channel.wabaId!.trim();
    
    const res = await fetch(
      `https://graph.facebook.com/v22.0/${wabaId}/message_templates?fields=name,status,language,category,components&limit=200`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = await res.json() as any;
    return body.data ?? [];
  },
});
