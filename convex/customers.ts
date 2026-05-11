import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
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

// Paginated list of customers for the caller's org, newest activity first.
export const listForCurrentOrg = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    if (orgId === "personal" || !orgId) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    return await ctx.db
      .query("customers")
      .withIndex("by_orgId_and_lastSeenAt", (q) => q.eq("orgId", orgId))
      .order("desc")
      .paginate(args.paginationOpts);
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
      phone:
        args.service === "whatsapp" ? args.contactAddress : undefined,
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

export { customerServiceValidator };
