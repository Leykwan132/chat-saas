import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import { getCustomerAgentForCurrentWorkspace } from "./customerAgentScope";
import { logConversationEvent } from "./conversationLogs";
import { customerSearchText } from "./customerSearch";
import { markConversationAnalyticsDirty } from "./analyticsDirtyRequest";
import { customerRecipientLabel } from "./customerRecipientPresentation";
import { customerPhonePresentation } from "../shared/customerPhonePresentation";

const customerServiceValidator = v.union(
  v.literal("whatsapp"),
  v.literal("instagram"),
  v.literal("messenger"),
  v.literal("web"),
  v.literal("avatar"),
  v.literal("manual"),
);

const channelServiceValidator = v.union(
  v.literal("whatsapp"),
  v.literal("instagram"),
  v.literal("messenger"),
  v.literal("web"),
  v.literal("avatar"),
);

function assertNotLeadTemperatureTag(tag: string) {
  const normalized = tag.trim().toLowerCase();
  if (["hot", "warm", "cold"].includes(normalized)) {
    throw new Error(`Tag name "${tag}" is reserved for lead temperature status.`);
  }
}

// Org customer list for WhatsApp broadcast recipient pickers (scoped via agent auth).
export const listForAgentBroadcast = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);

    const agent = await getCustomerAgentForCurrentWorkspace(ctx, args.agentId);
    if (agent === null) {
      throw new Error("Agent not found");
    }

    const rows = await ctx.db
      .query("customers")
      .withIndex("by_orgId_and_lastSeenAt", (q) => q.eq("orgId", resolvedOrgId))
      .order("desc")
      .collect();

    const out: Array<{
      customerId: Id<"customers">;
      name: string | undefined;
      phone: string;
      recipientLabel: string;
      tags: string[];
      leadTemperature: "Hot" | "Warm" | "Cold" | undefined;
      service: Doc<"customers">["service"];
      email: string | undefined;
      assignedUserId: string | undefined;
      assignToAiAgent: boolean | undefined;
      assignedAgentName: string | undefined;
    }> = [];

    for (const cust of rows) {
      const recipientLabel = customerRecipientLabel(cust);
      if (!recipientLabel) {
        continue;
      }
      const phone =
        cust.phone?.trim() ||
        (cust.whatsappUserId ? "" : cust.contactAddress.trim());

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
        recipientLabel,
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
      (a.name ?? a.recipientLabel).localeCompare(b.name ?? b.recipientLabel, undefined, {
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
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const channel = await ctx.db.get(args.channelId);
    if (
      channel === null ||
      channel.orgId !== resolvedOrgId ||
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
      recipientLabel: string;
      tags: string[];
    }> = [];

    for (const c of bestByPhone.values()) {
      const phone = c.contactAddress.trim();
      if (c.customerId !== undefined) {
        const cust = await ctx.db.get(c.customerId);
        if (cust !== null && cust.orgId === resolvedOrgId) {
          out.push({
            customerId: cust._id,
            name: cust.name?.trim() || c.contactName,
            phone: (cust.phone?.trim() || phone) as string,
            recipientLabel: customerRecipientLabel(cust),
            tags: cust.tags ?? [],
          });
          continue;
        }
      }
      out.push({
        customerId: undefined,
        name: c.contactName,
        phone,
        recipientLabel: phone,
        tags: [],
      });
    }

    out.sort((a, b) =>
      (a.name ?? a.recipientLabel).localeCompare(b.name ?? b.recipientLabel, undefined, {
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

    const phone = customer
      ? customerPhonePresentation(customer)
      : conv.service === "whatsapp"
        ? customerPhonePresentation({ contactAddress: conv.contactAddress })
        : null;

    const platformLabel =
      conv.service === "whatsapp"
        ? "WhatsApp"
        : conv.service === "instagram"
          ? "Instagram"
          : conv.service === "messenger"
            ? "Messenger"
            : conv.service === "avatar"
              ? "Avatar"
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
  args: {
    paginationOpts: paginationOptsValidator,
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const isPersonal = !orgId || orgId === "personal";

    // Scope by (userId + agentId) for personal, (orgId + agentId) for team.
    // When agentId is provided, use the compound index so the DB filters by
    // agent directly. Otherwise fall back to the scope-only index.
    let result;
    if (isPersonal && args.agentId !== undefined) {
      result = await ctx.db
        .query("customers")
        .withIndex("by_userId_and_agentId_and_lastSeenAt", (q) =>
          q.eq("userId", userId).eq("agentId", args.agentId!),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (isPersonal) {
      result = await ctx.db
        .query("customers")
        .withIndex("by_orgId_and_lastSeenAt", (q) => q.eq("orgId", ""))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.agentId !== undefined) {
      result = await ctx.db
        .query("customers")
        .withIndex("by_orgId_and_agentId_and_lastSeenAt", (q) =>
          q.eq("orgId", orgId).eq("agentId", args.agentId!),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db
        .query("customers")
        .withIndex("by_orgId_and_lastSeenAt", (q) => q.eq("orgId", orgId))
        .order("desc")
        .paginate(args.paginationOpts);
    }

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
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const customer = await ctx.db.get(args.customerId);

    if (customer === null || customer.orgId !== resolvedOrgId) {
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
    agentId: v.id("agents"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    customFields: v.optional(v.record(v.string(), v.string())),
    tags: v.optional(v.array(v.string())),
    leadTemperature: v.optional(v.union(v.literal("Hot"), v.literal("Warm"), v.literal("Cold"))),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const agent = await getCustomerAgentForCurrentWorkspace(ctx, args.agentId);
    if (agent === null) {
      throw new Error("Agent not found");
    }
    const name = args.name.trim();
    if (!name) {
      throw new Error("Customer name is required");
    }
    const now = Date.now();
    const tags = args.tags ?? [];
    const email = args.email?.trim() || undefined;
    const phone = args.phone?.trim() || undefined;
    for (const tag of tags) {
      assertNotLeadTemperatureTag(tag);
    }
    return await ctx.db.insert("customers", {
      orgId: resolvedOrgId,
      userId,
      agentId: agent._id,
      service: "manual",
      contactAddress: "",
      name,
      email,
      phone,
      searchText: customerSearchText({ name, email, phone, contactAddress: "" }),
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
    customFields: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const customer = await ctx.db.get(args.customerId);
    if (customer === null || customer.orgId !== resolvedOrgId) {
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
    if (args.customFields !== undefined) {
      patch.customFields = args.customFields;
    }
    if (args.name !== undefined || args.email !== undefined || args.phone !== undefined) {
      patch.searchText = customerSearchText({
        name: args.name === undefined ? customer.name : args.name.trim() || undefined,
        email: args.email === undefined ? customer.email : args.email.trim() || undefined,
        phone: args.phone === undefined ? customer.phone : args.phone.trim() || undefined,
        contactAddress: customer.contactAddress,
      });
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
      if (
        args.leadTemperature !== undefined &&
        args.leadTemperature !== customer.leadTemperature
      ) {
        await markConversationAnalyticsDirty(ctx, { conversationId });
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
    whatsappUserId: v.optional(v.string()),
    whatsappUsername: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    customFields: v.optional(v.record(v.string(), v.string())),
    userId: v.optional(v.string()),
    agentId: v.optional(v.id("agents")),
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
    service: "whatsapp" | "instagram" | "messenger" | "web" | "avatar";
    contactAddress: string;
    profileName?: string;
    whatsappUserId?: string;
    whatsappUsername?: string;
    email?: string;
    phone?: string;
    customFields?: Record<string, string>;
    userId?: string;
    agentId?: Id<"agents">;
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
  const whatsappUserId =
    args.service === "whatsapp" ? args.whatsappUserId?.trim() || undefined : undefined;
  const whatsappUsername =
    args.service === "whatsapp" ? args.whatsappUsername?.trim() || undefined : undefined;

  let resolvedName = args.profileName?.trim();
  if (args.service === "whatsapp" && (!resolvedName || resolvedName === "")) {
    if (whatsappUserId) {
      resolvedName = whatsappUsername ?? args.contactAddress.trim();
    } else {
      const rawPhone = args.phone?.trim() || args.contactAddress.trim();
      resolvedName = rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`;
    }
  }

  if (existing === null) {
    const phone =
      args.phone?.trim() ||
      (args.service === "whatsapp" && !whatsappUserId
        ? args.contactAddress
        : undefined);
    return await ctx.db.insert("customers", {
      orgId: args.orgId,
      userId: args.userId,
      agentId: args.agentId,
      service: args.service,
      contactAddress: args.contactAddress,
      whatsappUserId,
      whatsappUsername,
      name: resolvedName,
      email: inputEmail,
      phone,
      customFields:
        Object.keys(args.customFields ?? {}).length > 0
          ? args.customFields
          : undefined,
      searchText: customerSearchText({
        name: resolvedName,
        email: inputEmail,
        phone,
        contactAddress: args.contactAddress,
      }),
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
  if (!existing.name && resolvedName) {
    patch.name = resolvedName;
  }
  // Only refresh email/phone if we never had them — preserve user edits.
  if (!existing.email && inputEmail) {
    patch.email = inputEmail;
  }
  if (!existing.phone && args.phone) {
    patch.phone = args.phone.trim();
  }
  if (whatsappUserId && existing.whatsappUserId !== whatsappUserId) {
    patch.whatsappUserId = whatsappUserId;
  }
  if (whatsappUsername && existing.whatsappUsername !== whatsappUsername) {
    patch.whatsappUsername = whatsappUsername;
  }
  if (Object.keys(args.customFields ?? {}).length > 0) {
    patch.customFields = { ...existing.customFields, ...args.customFields };
  }
  patch.searchText = customerSearchText({
    name: (patch.name as string | undefined) ?? existing.name,
    email: (patch.email as string | undefined) ?? existing.email,
    phone: (patch.phone as string | undefined) ?? existing.phone,
    contactAddress: existing.contactAddress,
  });
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
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const customer = await ctx.db.get(args.customerId);
    if (customer === null || customer.orgId !== resolvedOrgId) {
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
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const customer = await ctx.db.get(args.customerId);
    if (customer === null || customer.orgId !== resolvedOrgId) {
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
    if (customer.lastConversationId !== undefined) {
      if (customer.leadTemperature !== args.temperature) {
        await logConversationEvent(ctx, {
          conversationId: customer.lastConversationId,
          action: "lead_status_changed",
          metadata: {
            from: customer.leadTemperature ?? null,
            to: args.temperature,
            source: "ai_sync_labeling",
          },
        });
      }
      if (customer.leadTemperature !== args.temperature) {
        await markConversationAnalyticsDirty(ctx, {
          conversationId: customer.lastConversationId,
        });
      }
    }
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

export const countForCurrentOrg = query({
  args: {},
  handler: async (ctx) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_orgId_and_lastSeenAt", (q) => q.eq("orgId", resolvedOrgId))
      .collect();
    return customers.length;
  },
});

export const countFilteredForCurrentOrg = query({
  args: {
    search: v.string(),
    selectedFilters: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_orgId_and_lastSeenAt", (q) => q.eq("orgId", resolvedOrgId))
      .collect();
      
    const q = args.search.trim().toLowerCase();
    const activePlatforms = args.selectedFilters.filter(f => f.startsWith('platform:')).map(f => f.slice(9));
    const activeTags = args.selectedFilters.filter(f => f.startsWith('tag:')).map(f => f.slice(4));
    const activeLeads = args.selectedFilters.filter(f => f.startsWith('lead:')).map(f => f.slice(5));
    
    const filtered = customers.filter((c) => {
      if (activePlatforms.length > 0) {
        if (!activePlatforms.includes(c.service)) return false;
      }
      if (activeTags.length > 0) {
        if (!c.tags || !c.tags.some(t => activeTags.includes(t))) return false;
      }
      if (activeLeads.length > 0) {
        if (!c.leadTemperature || !activeLeads.includes(c.leadTemperature)) return false;
      }
      if (!q) return true;
      const haystack = [c.name, c.email, c.phone, c.contactAddress]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
    
    return filtered.length;
  },
});

export const deleteCustomer = mutation({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const customer = await ctx.db.get(args.customerId);
    if (customer === null || customer.orgId !== resolvedOrgId) {
      throw new Error("Customer not found or access denied");
    }

    // 1. Delete linked conversations and their associated records
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .collect();

    for (const conv of conversations) {
      // 1a. Delete messages in this conversation
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversationId_and_createdAt", (q) =>
          q.eq("conversationId", conv._id)
        )
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }

      // 1b. Delete analytics facts
      const facts = await ctx.db
        .query("conversationAnalyticsFacts")
        .withIndex("by_conversationId", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const fact of facts) {
        await ctx.db.delete(fact._id);
      }

      // 1c. Delete topic assignments
      const topicAssignments = await ctx.db
        .query("conversationTopicAssignments")
        .withIndex("by_conversationId", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const assignment of topicAssignments) {
        await ctx.db.delete(assignment._id);
      }

      // 1d. Delete appointment booking sessions
      const bookingSessions = await ctx.db
        .query("appointmentBookingSessions")
        .withIndex("by_conversationId", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const session of bookingSessions) {
        await ctx.db.delete(session._id);
      }

      // 1e. Delete conversation logs
      const logs = await ctx.db
        .query("conversationLogs")
        .withIndex("by_conversationId_and_performedAt", (q) =>
          q.eq("conversationId", conv._id)
        )
        .collect();
      for (const log of logs) {
        await ctx.db.delete(log._id);
      }

      // Finally, delete the conversation document
      await ctx.db.delete(conv._id);
    }

    // 2. Delete customer document
    await ctx.db.delete(args.customerId);

    return { success: true };
  },
});

export { customerServiceValidator };
