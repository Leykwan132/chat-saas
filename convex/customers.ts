import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthContext, PERSONAL_ORG_FALLBACK } from "./authUtils";
import { logConversationEvent } from "./conversationLogs";

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

function assertNotLeadTemperatureTag(tag: string) {
  const normalized = tag.trim().toLowerCase();
  if (["hot", "warm", "cold"].includes(normalized)) {
    throw new Error(`Tag name "${tag}" is reserved for lead temperature status.`);
  }
}

async function getAgentForBroadcast(
  ctx: QueryCtx,
  agentId: Id<"agents">,
) {
  const { userId, orgId } = await getAuthContext(ctx);
  const agent = await ctx.db.get(agentId);
  if (agent === null) {
    return null;
  }

  const normalizedOrgId =
    !orgId || orgId === "personal" ? PERSONAL_ORG_FALLBACK : orgId;
  const agentOrgId =
    !agent.orgId || agent.orgId === "personal"
      ? PERSONAL_ORG_FALLBACK
      : agent.orgId;

  if (agentOrgId !== PERSONAL_ORG_FALLBACK) {
    if (agentOrgId === normalizedOrgId) {
      return agent;
    }
    return null;
  }

  if (agent.userId !== userId) {
    return null;
  }

  return agent;
}

function resolveBroadcastPhone(customer: Doc<"customers">): string | null {
  const phone = customer.phone?.trim();
  if (phone) {
    return phone;
  }
  if (customer.service === "whatsapp") {
    const addr = customer.contactAddress.trim();
    if (addr) {
      return addr;
    }
  }
  return null;
}

// Org customer list for WhatsApp broadcast recipient pickers (scoped via agent auth).
export const listForAgentBroadcast = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    if (orgId === "personal" || !orgId) {
      return [];
    }

    const agent = await getAgentForBroadcast(ctx, args.agentId);
    if (agent === null) {
      throw new Error("Agent not found");
    }

    const rows = await ctx.db
      .query("customers")
      .withIndex("by_orgId_and_lastSeenAt", (q) => q.eq("orgId", orgId))
      .order("desc")
      .collect();

    const out: Array<{
      customerId: Id<"customers">;
      name: string | undefined;
      phone: string;
      tags: string[];
      leadTemperature: "Hot" | "Warm" | "Cold" | undefined;
      service: Doc<"customers">["service"];
      email: string | undefined;
      assignedUserId: string | undefined;
      assignToAiAgent: boolean | undefined;
      assignedAgentName: string | undefined;
    }> = [];

    for (const cust of rows) {
      const phone = resolveBroadcastPhone(cust);
      if (!phone) {
        continue;
      }

      let assignedUserId: string | undefined = undefined;
      let assignToAiAgent: boolean | undefined = undefined;
      let assignedAgentName: string | undefined = undefined;

      if (cust.lastConversationId !== undefined) {
        const conv = await ctx.db.get(cust.lastConversationId);
        if (conv !== null && conv.orgId === orgId) {
          assignedUserId = conv.assignedUserId;
          assignToAiAgent = conv.assignToAiAgent;
          if (conv.assignedAgentId !== undefined) {
            const assignedAgent = await ctx.db.get(conv.assignedAgentId);
            if (assignedAgent !== null) {
              assignedAgentName = assignedAgent.name;
            }
          }
        }
      }

      out.push({
        customerId: cust._id,
        name: cust.name?.trim() || undefined,
        phone,
        tags: cust.tags ?? [],
        leadTemperature: cust.leadTemperature,
        service: cust.service,
        email: cust.email?.trim() || undefined,
        assignedUserId,
        assignToAiAgent,
        assignedAgentName,
      });
    }

    out.sort((a, b) =>
      (a.name ?? a.phone ?? "").localeCompare(b.name ?? b.phone ?? "", undefined, {
        sensitivity: "base",
      }),
    );
    return out;
  },
});

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
      tags: string[];
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
            tags: cust.tags ?? [],
          });
          continue;
        }
      }
      out.push({
        customerId: undefined,
        name: c.contactName,
        phone,
        tags: [],
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

    return {
      customerId: customer?._id ?? null,
      name,
      platformLabel,
      phone,
      email: customer?.email ?? null,
      tags: customer?.tags ?? [],
      leadTemperature: customer?.leadTemperature,
    };
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
    leadTemperature: v.optional(v.union(v.literal("Hot"), v.literal("Warm"), v.literal("Cold"))),
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
    const tags = args.tags ?? [];
    for (const tag of tags) {
      assertNotLeadTemperatureTag(tag);
    }
    return await ctx.db.insert("customers", {
      orgId,
      service: "manual",
      contactAddress: "",
      name,
      email: args.email?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      tags: tags.map((t) => t.trim()).filter(Boolean),
      leadTemperature: args.leadTemperature,
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
    phone: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    leadTemperature: v.optional(v.union(v.literal("Hot"), v.literal("Warm"), v.literal("Cold"), v.null())),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const customer = await ctx.db.get(args.customerId);
    if (customer === null || customer.orgId !== orgId) {
      throw new Error("Customer not found");
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    const changes: Record<string, { from: string | null; to: string | null }> = {};

    if (args.name !== undefined) {
      const trimmedName = args.name.trim();
      const currentName = customer.name?.trim() ?? "";
      if (trimmedName !== currentName) {
        changes.name = {
          from: customer.name ?? null,
          to: trimmedName || null,
        };
        patch.name = trimmedName || undefined;
      }
    }

    if (args.email !== undefined) {
      const trimmedEmail = args.email.trim();
      const currentEmail = customer.email?.trim() ?? "";
      if (trimmedEmail !== currentEmail) {
        changes.email = {
          from: customer.email ?? null,
          to: trimmedEmail || null,
        };
        patch.email = trimmedEmail || undefined;
      }
    }

    if (args.phone !== undefined) {
      const trimmedPhone = args.phone.trim();
      const currentPhone = customer.phone?.trim() ?? "";
      if (trimmedPhone !== currentPhone) {
        changes.phone = {
          from: customer.phone ?? null,
          to: trimmedPhone || null,
        };
        patch.phone = trimmedPhone || undefined;
      }
    }

    if (args.tags !== undefined) {
      for (const tag of args.tags) {
        assertNotLeadTemperatureTag(tag);
      }
      patch.tags = args.tags.map((t) => t.trim()).filter(Boolean);
    }
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.leadTemperature !== undefined) {
      patch.leadTemperature = args.leadTemperature === null ? undefined : args.leadTemperature;
    }
    await ctx.db.patch(args.customerId, patch);

    // Get conversationId for logging if not provided
    let conversationId = args.conversationId;
    if ((Object.keys(changes).length > 0 || (args.leadTemperature !== undefined && args.leadTemperature !== customer.leadTemperature)) && !conversationId) {
      const conv = await ctx.db
        .query("conversations")
        .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
        .first();
      conversationId = conv?._id;
    }

    if (conversationId) {
      if (Object.keys(changes).length > 0) {
        await logConversationEvent(ctx, {
          conversationId,
          action: "user_details_changed",
          metadata: {
            changes,
          },
        });
      }

      if (args.leadTemperature !== undefined && args.leadTemperature !== customer.leadTemperature) {
        await logConversationEvent(ctx, {
          conversationId,
          action: "lead_status_changed",
          metadata: {
            from: customer.leadTemperature ?? null,
            to: args.leadTemperature ?? null,
          },
        });
      }
    }
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

function isSyntheticEmail(email?: string): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return lower.endsWith("@facebook.com") || lower.endsWith("@instagram.com");
}

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

  const inputEmail = args.email && !isSyntheticEmail(args.email) ? args.email.trim() : undefined;

  if (existing === null) {
    return await ctx.db.insert("customers", {
      orgId: args.orgId,
      service: args.service,
      contactAddress: args.contactAddress,
      name: args.profileName,
      email: inputEmail,
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
  if (!existing.email && inputEmail) {
    patch.email = inputEmail;
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
    conversationId: v.optional(v.id("conversations")),
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
    assertNotLeadTemperatureTag(normalized);
    const current = customer.tags ?? [];
    if (current.includes(normalized)) {
      return;
    }
    await ctx.db.patch(args.customerId, {
      tags: [...current, normalized],
      updatedAt: Date.now(),
    });

    let conversationId = args.conversationId;
    if (!conversationId) {
      const conv = await ctx.db
        .query("conversations")
        .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
        .first();
      conversationId = conv?._id;
    }
    if (conversationId) {
      await logConversationEvent(ctx, {
        conversationId,
        action: "tag_added",
        metadata: { tag: normalized },
      });
    }
  },
});

export const removeCustomerTag = mutation({
  args: {
    customerId: v.id("customers"),
    tag: v.string(),
    conversationId: v.optional(v.id("conversations")),
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

    let conversationId = args.conversationId;
    if (!conversationId) {
      const conv = await ctx.db
        .query("conversations")
        .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
        .first();
      conversationId = conv?._id;
    }
    if (conversationId) {
      await logConversationEvent(ctx, {
        conversationId,
        action: "tag_removed",
        metadata: { tag: args.tag },
      });
    }
  },
});

// Lead temperature tags managed by AI sync labeling or manual edits.
export const LEAD_TEMPERATURE_TAGS = ["Hot", "Warm", "Cold"] as const;
export type LeadTemperature = (typeof LEAD_TEMPERATURE_TAGS)[number];

export const internalSetLeadTemperature = internalMutation({
  args: {
    customerId: v.id("customers"),
    temperature: v.union(v.literal("Hot"), v.literal("Warm"), v.literal("Cold")),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) return;
    // Remove any existing lead temperature tags.
    const filtered = (customer.tags ?? []).filter(
      (t) => !(LEAD_TEMPERATURE_TAGS as readonly string[]).includes(t),
    );
    await ctx.db.patch(args.customerId, {
      leadTemperature: args.temperature,
      tags: filtered,
      updatedAt: Date.now(),
    });
  },
});

export const backfillLeadTemperature = mutation({
  args: {},
  handler: async (ctx) => {
    const customers = await ctx.db.query("customers").collect();
    let updatedCount = 0;
    for (const customer of customers) {
      const tags = customer.tags ?? [];
      const tempTag = tags.find((t) =>
        (LEAD_TEMPERATURE_TAGS as readonly string[]).includes(t)
      ) as LeadTemperature | undefined;

      if (tempTag || customer.leadTemperature === undefined) {
        const newTemp = tempTag || customer.leadTemperature;
        const filteredTags = tags.filter(
          (t) => !(LEAD_TEMPERATURE_TAGS as readonly string[]).includes(t)
        );
        
        if (newTemp !== customer.leadTemperature || filteredTags.length !== tags.length) {
          await ctx.db.patch(customer._id, {
            leadTemperature: newTemp,
            tags: filteredTags,
            updatedAt: Date.now(),
          });
          updatedCount++;
        }
      }
    }
    return { processed: customers.length, updated: updatedCount };
  },
});

export { customerServiceValidator };
