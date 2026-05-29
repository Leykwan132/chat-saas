import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";

const customerServiceValidator = v.union(
  v.literal("whatsapp"),
  v.literal("instagram"),
  v.literal("messenger"),
  v.literal("manual"),
);

const channelServiceValidator = v.union(
  v.literal("whatsapp"),
  v.literal("instagram"),
  v.literal("messenger"),
);

// Distinct WhatsApp contacts that have a conversation on this channel
// (used for template broadcast recipient pickers).
export const listWhatsAppBroadcastCandidates = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    if (orgId === "personal" || !orgId) {
      return [];
    }
    const channel = await ctx.db.get(args.channelId);
    if (
      channel === null ||
      channel.orgId !== orgId ||
      channel.service !== "whatsapp"
    ) {
      throw new Error("Channel not found");
    }

    const convs = await ctx.db
      .query("conversations")
      .withIndex("by_channel_and_contactAddress", (q) =>
        q.eq("channelId", args.channelId),
      )
      .collect();

    const whatsappConvs = convs.filter((c) => c.service === "whatsapp");
    const bestByPhone = new Map<string, Doc<"conversations">>();
    for (const c of whatsappConvs) {
      const phone = c.contactAddress.trim();
      if (!phone) continue;
      const prev = bestByPhone.get(phone);
      if (
        prev === undefined ||
        (!prev.customerId && c.customerId !== undefined)
      ) {
        bestByPhone.set(phone, c);
      }
    }

    const out: Array<{
      customerId: Id<"customers"> | undefined;
      name: string | undefined;
      phone: string;
    }> = [];

    for (const c of bestByPhone.values()) {
      const phone = c.contactAddress.trim();
      if (c.customerId !== undefined) {
        const cust = await ctx.db.get(c.customerId);
        if (cust !== null && cust.orgId === orgId) {
          out.push({
            customerId: cust._id,
            name: cust.name?.trim() || c.contactName,
            phone: (cust.phone?.trim() || phone) as string,
          });
          continue;
        }
      }
      out.push({
        customerId: undefined,
        name: c.contactName,
        phone,
      });
    }

    out.sort((a, b) =>
      (a.name ?? a.phone).localeCompare(b.name ?? b.phone, undefined, {
        sensitivity: "base",
      }),
    );
    return out;
  },
});

// Name, platform label, and phone for the inbox details sidebar (auth-checked
// via the parent conversation).
export const getSidebarDetailsForConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.orgId !== orgId) {
      return null;
    }

    let customer: Doc<"customers"> | null = null;
    if (conv.customerId !== undefined) {
      const row = await ctx.db.get(conv.customerId);
      if (row !== null && row.orgId === orgId) {
        customer = row;
      }
    }

    const fromCustName = customer?.name?.trim();
    const fromConvName = conv.contactName?.trim();
    const name =
      fromCustName ||
      fromConvName ||
      "Unnamed customer";

    let phone: string | null = null;
    const custPhone = customer?.phone?.trim();
    if (custPhone) {
      phone = custPhone;
    } else if (conv.service === "whatsapp") {
      phone = conv.contactAddress.trim() || null;
    }

    const platformLabel =
      conv.service === "whatsapp"
        ? "WhatsApp"
        : conv.service === "instagram"
          ? "Instagram"
          : conv.service === "messenger"
            ? "Messenger"
            : conv.service === "playground"
              ? "Playground"
              : conv.service;

    return { name, platformLabel, phone, tags: customer?.tags ?? [] };
  },
});

// Paginated list of customers for the caller's org, newest activity first.
export const listForCurrentOrg = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    if (orgId === "personal" || !orgId) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const result = await ctx.db
      .query("customers")
      .withIndex("by_orgId_and_lastSeenAt", (q) => q.eq("orgId", orgId))
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (customer) => {
        let assignedUserId: string | undefined = undefined;
        let assignedAgentId: string | undefined = undefined;
        let assignedAgentName: string | undefined = undefined;
        let assignToAiAgent: boolean | undefined = undefined;

        if (customer.lastConversationId) {
          const conv = await ctx.db.get(customer.lastConversationId);
          if (conv) {
            assignedUserId = conv.assignedUserId;
            assignedAgentId = conv.assignedAgentId;
            assignToAiAgent = conv.assignToAiAgent;
            if (conv.assignedAgentId) {
              const agent = await ctx.db.get(conv.assignedAgentId);
              if (agent) {
                assignedAgentName = agent.name;
              }
            }
          }
        }
        return {
          ...customer,
          assignedUserId,
          assignedAgentId,
          assignedAgentName,
          assignToAiAgent,
        };
      })
    );

    return {
      ...result,
      page,
    };
  },
});

export const getById = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const customer = await ctx.db.get(args.customerId);
    if (customer === null || customer.orgId !== orgId) {
      return null;
    }
    let assignedUserId: string | undefined = undefined;
    let assignedAgentId: string | undefined = undefined;
    let assignedAgentName: string | undefined = undefined;
    let assignToAiAgent: boolean | undefined = undefined;

    if (customer.lastConversationId) {
      const conv = await ctx.db.get(customer.lastConversationId);
      if (conv) {
        assignedUserId = conv.assignedUserId;
        assignedAgentId = conv.assignedAgentId;
        assignToAiAgent = conv.assignToAiAgent;
        if (conv.assignedAgentId) {
          const agent = await ctx.db.get(conv.assignedAgentId);
          if (agent) {
            assignedAgentName = agent.name;
          }
        }
      }
    }
    return {
      ...customer,
      assignedUserId,
      assignedAgentId,
      assignedAgentName,
      assignToAiAgent,
    };
  },
});

// Manual create from the Customers page "Add Customer" button. We never
// auto-merge with an existing WhatsApp row of the same number — too easy to
// merge wrong people in v1.
export const addManually = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    if (orgId === "personal" || !orgId) {
      throw new Error("You must belong to an organization to add customers.");
    }
    const name = args.name.trim();
    if (!name) {
      throw new Error("Customer name is required");
    }
    const now = Date.now();
    return await ctx.db.insert("customers", {
      orgId,
      service: "manual",
      contactAddress: "",
      name,
      email: args.email?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      tags: args.tags ?? [],
      source: "manual",
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Patch editable fields. Used by future inline-edit affordances.
export const update = mutation({
  args: {
    customerId: v.id("customers"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const customer = await ctx.db.get(args.customerId);
    if (customer === null || customer.orgId !== orgId) {
      throw new Error("Customer not found");
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name.trim() || undefined;
    if (args.email !== undefined) patch.email = args.email.trim() || undefined;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.notes !== undefined) patch.notes = args.notes;
    await ctx.db.patch(args.customerId, patch);
  },
});

// Internal helper called from the WhatsApp webhook dispatcher. Inserts on
// first contact, otherwise patches lightly. Refreshes the cached name only
// if the row currently has no name (so we never clobber a user's edit).
// Returns the customerId for the caller to attach to the conversation.
export const internalUpsertFromWebhook = internalMutation({
  args: {
    orgId: v.string(),
    service: channelServiceValidator,
    contactAddress: v.string(),
    profileName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"customers">> => {
    return await upsertCustomer(ctx, args);
  },
});

async function upsertCustomer(
  ctx: MutationCtx,
  args: {
    orgId: string;
    service: "whatsapp" | "instagram" | "messenger";
    contactAddress: string;
    profileName?: string;
    email?: string;
    phone?: string;
  },
): Promise<Id<"customers">> {
  const now = Date.now();
  const existing = await ctx.db
    .query("customers")
    .withIndex("by_orgId_and_service_and_contactAddress", (q) =>
      q
        .eq("orgId", args.orgId)
        .eq("service", args.service)
        .eq("contactAddress", args.contactAddress),
    )
    .unique();

  if (existing === null) {
    return await ctx.db.insert("customers", {
      orgId: args.orgId,
      service: args.service,
      contactAddress: args.contactAddress,
      name: args.profileName,
      email: args.email?.trim() || undefined,
      phone:
        args.phone?.trim() || (args.service === "whatsapp" ? args.contactAddress : undefined),
      tags: [],
      source: args.service,
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  const patch: Record<string, unknown> = {
    lastSeenAt: now,
    updatedAt: now,
  };
  // Only refresh the cached name if we never had one — preserve user edits.
  if (!existing.name && args.profileName) {
    patch.name = args.profileName;
  }
  // Only refresh email/phone if we never had them — preserve user edits.
  if (!existing.email && args.email) {
    patch.email = args.email.trim();
  }
  if (!existing.phone && args.phone) {
    patch.phone = args.phone.trim();
  }
  await ctx.db.patch(existing._id, patch);
  return existing._id;
}

// Sets `lastConversationId` on a customer row. Called from the webhook after
// the conversation upsert returns its id.
export const internalSetLastConversation = internalMutation({
  args: {
    customerId: v.id("customers"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.customerId, {
      lastConversationId: args.conversationId,
      updatedAt: Date.now(),
    });
  },
});

export const addCustomerTag = mutation({
  args: {
    customerId: v.id("customers"),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const customer = await ctx.db.get(args.customerId);
    if (customer === null || customer.orgId !== orgId) {
      throw new Error("Customer not found");
    }
    const normalized = args.tag.trim();
    if (normalized.length === 0) {
      throw new Error("Tag cannot be empty");
    }
    const current = customer.tags ?? [];
    if (current.includes(normalized)) {
      return;
    }
    await ctx.db.patch(args.customerId, {
      tags: [...current, normalized],
      updatedAt: Date.now(),
    });
  },
});

export const removeCustomerTag = mutation({
  args: {
    customerId: v.id("customers"),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const customer = await ctx.db.get(args.customerId);
    if (customer === null || customer.orgId !== orgId) {
      throw new Error("Customer not found");
    }
    const current = customer.tags ?? [];
    await ctx.db.patch(args.customerId, {
      tags: current.filter((t) => t !== args.tag),
      updatedAt: Date.now(),
    });
  },
});

export { customerServiceValidator };
