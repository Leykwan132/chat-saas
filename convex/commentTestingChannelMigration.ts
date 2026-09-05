import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const fakeChannels = [
  {
    service: "instagram" as const,
    displayUsername: "Demo Instagram Page",
    igUserId: "comment-testing-instagram",
  },
  {
    service: "messenger" as const,
    displayUsername: "Demo Facebook Page",
    pageId: "comment-testing-messenger",
  },
];

export const seedCommentTestingChannels = internalMutation({
  args: {
    email: v.string(),
    dryRun: v.boolean(),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .take(2);
    if (users.length !== 1) {
      throw new Error(users.length === 0 ? "User not found" : "More than one user matched the email");
    }

    const user = users[0];
    const personalAgents = await ctx.db
      .query("agents")
      .withIndex("by_userId_and_orgId", (q) =>
        q.eq("userId", user.workosUserId).eq("orgId", ""),
      )
      .order("desc")
      .take(2);
    const agentCandidates = personalAgents.map((agent) => ({ id: agent._id, name: agent.name }));
    const personalAgent = args.agentId === undefined
      ? personalAgents.length === 1 ? personalAgents[0] : null
      : personalAgents.find((agent) => agent._id === args.agentId) ?? null;
    if (personalAgent === null) {
      if (args.dryRun) {
        return { email: user.email, userId: user._id, agentCandidates, dryRun: true, channels: [] };
      }
      throw new Error(personalAgents.length === 0 ? "Personal agent not found" : "Specify one of the personal agent IDs");
    }
    const now = Date.now();
    const result: Array<{
      service: "instagram" | "messenger";
      action: string;
      channelId?: string;
    }> = [];

    for (const fakeChannel of fakeChannels) {
      const existing = fakeChannel.service === "instagram"
        ? await ctx.db
            .query("channels")
            .withIndex("by_igUserId", (q) => q.eq("igUserId", fakeChannel.igUserId))
            .unique()
        : await ctx.db
            .query("channels")
            .withIndex("by_pageId", (q) => q.eq("pageId", fakeChannel.pageId))
            .unique();

      if (existing !== null) {
        if (existing.connectedByUserId !== user.workosUserId || existing.orgId !== "") {
          throw new Error(`Test channel ${fakeChannel.service} belongs to another scope`);
        }
        const needsPatch = existing.status !== "connected" || existing.defaultAgentId !== personalAgent._id;
        if (!args.dryRun && needsPatch) {
          await ctx.db.patch(existing._id, {
            status: "connected",
            defaultAgentId: personalAgent._id,
            updatedAt: now,
          });
        }
        result.push({
          service: fakeChannel.service,
          action: args.dryRun && needsPatch ? "would update" : "existing",
          channelId: existing._id,
        });
        continue;
      }

      if (!args.dryRun) {
        const channelId = await ctx.db.insert("channels", {
          orgId: "",
          service: fakeChannel.service,
          displayUsername: fakeChannel.displayUsername,
          igUserId: fakeChannel.service === "instagram" ? fakeChannel.igUserId : undefined,
          pageId: fakeChannel.service === "messenger" ? fakeChannel.pageId : undefined,
          status: "connected",
          connectedByUserId: user.workosUserId,
          defaultAgentId: personalAgent._id,
          createdAt: now,
          updatedAt: now,
        });
        result.push({ service: fakeChannel.service, action: "created", channelId });
      } else {
        result.push({ service: fakeChannel.service, action: "would create" });
      }
    }

    return {
      email: user.email,
      userId: user._id,
      agentId: personalAgent._id,
      agentCandidates,
      dryRun: args.dryRun,
      channels: result,
    };
  },
});
