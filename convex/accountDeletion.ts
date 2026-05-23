import { WorkOS } from "@workos-inc/node";
import Stripe from "stripe";
import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  type ActionCtx,
} from "./_generated/server";
import { components, internal } from "./_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { getAuthContext } from "./authUtils";

const stripeClient = new StripeSubscriptions(components.stripe, {});

type DeletionPlan = {
  stripeEntityIds: string[];
  orgsToDelete: string[];
  orgsToLeave: string[];
};

export const getDeletionPlan = internalQuery({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }): Promise<DeletionPlan> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
      .unique();
    if (user === null) {
      throw new Error("User not found");
    }

    const orgs = await ctx.db.query("organizations").collect();
    const memberOrgs = orgs.filter((org) => org.members.includes(user._id));

    const orgsToDelete: string[] = [];
    const orgsToLeave: string[] = [];
    for (const org of memberOrgs) {
      if (org.members.length === 1) {
        orgsToDelete.push(org.workosOrgId);
      } else {
        orgsToLeave.push(org.workosOrgId);
      }
    }

    const stripeEntityIds = [workosUserId, ...orgsToDelete];

    return { stripeEntityIds, orgsToDelete, orgsToLeave };
  },
});

async function deleteKnowledgeForAgent(
  ctx: MutationCtx,
  agentId: Id<"agents">,
) {
  const entryTables = [
    "textEntries",
    "fileEntries",
    "webEntries",
    "qaEntries",
  ] as const;

  for (const table of entryTables) {
    const entries = await ctx.db
      .query(table)
      .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
      .collect();
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }
  }
}

async function deleteOrgData(ctx: MutationCtx, workosOrgId: string) {
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_orgId", (q) => q.eq("orgId", workosOrgId))
    .collect();
  for (const message of messages) {
    await ctx.db.delete(message._id);
  }

  const conversations = await ctx.db
    .query("conversations")
    .withIndex("by_orgId_and_lastMessageAt", (q) => q.eq("orgId", workosOrgId))
    .collect();
  for (const conversation of conversations) {
    await ctx.db.delete(conversation._id);
  }

  const customers = await ctx.db
    .query("customers")
    .withIndex("by_orgId_and_lastSeenAt", (q) => q.eq("orgId", workosOrgId))
    .collect();
  for (const customer of customers) {
    await ctx.db.delete(customer._id);
  }

  const channels = await ctx.db.query("channels").collect();
  for (const channel of channels) {
    if (channel.orgId === workosOrgId) {
      await ctx.db.delete(channel._id);
    }
  }

  const agents = await ctx.db
    .query("agents")
    .withIndex("by_orgId", (q) => q.eq("orgId", workosOrgId))
    .collect();
  for (const agent of agents) {
    await deleteKnowledgeForAgent(ctx, agent._id);
    await ctx.db.delete(agent._id);
  }

  const creditLogs = await ctx.db
    .query("creditLogs")
    .withIndex("by_orgId", (q) => q.eq("orgId", workosOrgId))
    .collect();
  for (const log of creditLogs) {
    await ctx.db.delete(log._id);
  }

  const mediaUploads = await ctx.db.query("mediaUploads").collect();
  for (const upload of mediaUploads) {
    if (upload.orgId === workosOrgId) {
      await ctx.db.delete(upload._id);
    }
  }

  const oauthSessions = await ctx.db.query("oauthSessions").collect();
  for (const session of oauthSessions) {
    if (session.orgId === workosOrgId) {
      await ctx.db.delete(session._id);
    }
  }
}

async function deleteUserAgents(ctx: MutationCtx, workosUserId: string) {
  const agents = await ctx.db
    .query("agents")
    .withIndex("by_userId", (q) => q.eq("userId", workosUserId))
    .collect();
  for (const agent of agents) {
    await deleteKnowledgeForAgent(ctx, agent._id);
    await ctx.db.delete(agent._id);
  }
}

async function deletePersonalWorkspaceData(
  ctx: MutationCtx,
  workosUserId: string,
  convexUserId: Id<"users">,
) {
  const personalOrgId = "";

  const conversations = await ctx.db
    .query("conversations")
    .withIndex("by_orgId_and_lastMessageAt", (q) => q.eq("orgId", personalOrgId))
    .collect();
  for (const conversation of conversations) {
    if (conversation.assignedUserId !== workosUserId) continue;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", conversation._id),
      )
      .collect();
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    await ctx.db.delete(conversation._id);
  }

  const creditLogs = await ctx.db
    .query("creditLogs")
    .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", convexUserId))
    .collect();
  for (const log of creditLogs) {
    if (log.orgId === personalOrgId) {
      await ctx.db.delete(log._id);
    }
  }

  const mediaUploads = await ctx.db
    .query("mediaUploads")
    .withIndex("by_orgId_userId", (q) =>
      q.eq("orgId", personalOrgId).eq("userId", workosUserId),
    )
    .collect();
  for (const upload of mediaUploads) {
    await ctx.db.delete(upload._id);
  }

  const oauthSessions = await ctx.db.query("oauthSessions").collect();
  for (const session of oauthSessions) {
    if (session.userId === workosUserId) {
      await ctx.db.delete(session._id);
    }
  }
}

export const purgeConvexData = internalMutation({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
      .unique();
    if (user === null) return;

    const orgs = await ctx.db.query("organizations").collect();
    const memberOrgs = orgs.filter((org) => org.members.includes(user._id));
    const orgsToDelete = memberOrgs.filter((org) => org.members.length === 1);

    await deleteUserAgents(ctx, workosUserId);
    await deletePersonalWorkspaceData(ctx, workosUserId, user._id);

    for (const org of orgsToDelete) {
      await deleteOrgData(ctx, org.workosOrgId);
      await ctx.db.delete(org._id);
    }

    for (const org of memberOrgs) {
      if (orgsToDelete.some((o) => o._id === org._id)) continue;
      const members = org.members.filter((id) => id !== user._id);
      const admins = org.admins.filter((id) => id !== user._id);
      await ctx.db.patch(org._id, {
        members,
        admins,
        updatedAt: Date.now(),
      });
    }

    const remainingCreditLogs = await ctx.db
      .query("creditLogs")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", user._id))
      .collect();
    for (const log of remainingCreditLogs) {
      await ctx.db.delete(log._id);
    }

    await ctx.db.delete(user._id);
  },
});

async function cleanupStripeForEntity(ctx: ActionCtx, entityId: string) {
  const subscription = await ctx.runQuery(
    components.stripe.public.getSubscriptionByOrgId,
    { orgId: entityId },
  );

  if (subscription?.stripeSubscriptionId) {
    try {
      await stripeClient.cancelSubscription(ctx, {
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        cancelAtPeriodEnd: false,
      });
    } catch (err) {
      console.warn(`Failed to cancel Stripe subscription for ${entityId}:`, err);
    }
  }

  const customer = await ctx.runQuery(
    components.stripe.public.getCustomerByUserId,
    { userId: entityId },
  );

  if (customer?.stripeCustomerId) {
    try {
      const stripe = new Stripe(stripeClient.apiKey);
      await stripe.customers.del(customer.stripeCustomerId);
    } catch (err) {
      console.warn(`Failed to delete Stripe customer for ${entityId}:`, err);
    }
  }
}

async function workosFetch(
  apiKey: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`https://api.workos.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

async function removeWorkOsMembership(
  apiKey: string,
  workosUserId: string,
  organizationId: string,
) {
  const listRes = await workosFetch(
    apiKey,
    `/user_management/organization_memberships?user_id=${encodeURIComponent(workosUserId)}&organization_id=${encodeURIComponent(organizationId)}`,
  );
  if (!listRes.ok) {
    const text = await listRes.text();
    throw new Error(`Failed to list WorkOS memberships: ${text.slice(0, 200)}`);
  }

  const payload = (await listRes.json()) as {
    data?: Array<{ id: string }>;
  };

  for (const membership of payload.data ?? []) {
    const deleteRes = await workosFetch(
      apiKey,
      `/user_management/organization_memberships/${membership.id}`,
      { method: "DELETE" },
    );
    if (!deleteRes.ok) {
      const text = await deleteRes.text();
      throw new Error(`Failed to remove WorkOS membership: ${text.slice(0, 200)}`);
    }
  }
}

async function deleteWorkOsOrganization(apiKey: string, organizationId: string) {
  const res = await workosFetch(apiKey, `/organizations/${organizationId}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Failed to delete WorkOS organization: ${text.slice(0, 200)}`);
  }
}

async function deleteWorkOsUser(apiKey: string, workosUserId: string) {
  const workos = new WorkOS(apiKey);
  await workos.userManagement.deleteUser(workosUserId);
}

export const deleteAccount = action({
  args: {
    confirmation: v.literal("DELETE"),
  },
  handler: async (ctx, _args) => {
    const { userId: workosUserId } = await getAuthContext(ctx);

    const apiKey = process.env.WORKOS_API_KEY;
    if (!apiKey) {
      throw new Error("WORKOS_API_KEY is not configured");
    }

    const plan = await ctx.runQuery(internal.accountDeletion.getDeletionPlan, {
      workosUserId,
    });

    for (const entityId of plan.stripeEntityIds) {
      await cleanupStripeForEntity(ctx, entityId);
    }

    await ctx.runMutation(internal.accountDeletion.purgeConvexData, {
      workosUserId,
    });

    for (const orgId of plan.orgsToLeave) {
      await removeWorkOsMembership(apiKey, workosUserId, orgId);
    }

    for (const orgId of plan.orgsToDelete) {
      await deleteWorkOsOrganization(apiKey, orgId);
    }

    await deleteWorkOsUser(apiKey, workosUserId);

    return { success: true };
  },
});
