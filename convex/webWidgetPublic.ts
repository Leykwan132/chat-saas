import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { getEnabledSettingsByPublicKey } from "./webWidgetCore";
import { normalizeWebWidgetExperience } from "../shared/webWidgetExperience";

type VisitorProfileInput = {
  name?: string;
  email?: string;
  phone?: string;
};

function normalizedProfileValue(value: string | undefined) {
  return value?.trim() || undefined;
}

function validateVisitorProfile(
  input: VisitorProfileInput,
  leadForm: ReturnType<typeof normalizeWebWidgetExperience>["leadForm"],
) {
  const profile = {
    name: normalizedProfileValue(input.name),
    email: normalizedProfileValue(input.email),
    phone: normalizedProfileValue(input.phone),
  };
  if (!leadForm.enabled) {
    return profile;
  }
  for (const fieldName of ["name", "email", "phone"] as const) {
    if (leadForm.fields[fieldName].required && !profile[fieldName]) {
      throw new Error(`${fieldName[0].toUpperCase()}${fieldName.slice(1)} is required`);
    }
  }
  if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    throw new Error("Email is invalid");
  }
  return profile;
}

async function getVisitorCustomer(
  ctx: Parameters<typeof getEnabledSettingsByPublicKey>[0],
  publicKey: string,
  visitorId: string,
) {
  const settings = await getEnabledSettingsByPublicKey(ctx, publicKey);
  const customer = await ctx.db
    .query("customers")
    .withIndex("by_orgId_and_service_and_contactAddress", (q) =>
      q.eq("orgId", settings.orgId).eq("service", "web").eq("contactAddress", visitorId),
    )
    .unique();
  return { settings, customer };
}

function publicProfile(customer: Awaited<ReturnType<typeof getVisitorCustomer>>["customer"]) {
  if (customer === null) {
    return null;
  }
  return {
    name: customer.name ?? null,
    email: customer.email ?? null,
    phone: customer.phone ?? null,
  };
}

export const getVisitorProfile = query({
  args: {
    publicKey: v.string(),
    visitorId: v.string(),
  },
  handler: async (ctx, args) => {
    const { customer } = await getVisitorCustomer(ctx, args.publicKey, args.visitorId);
    return publicProfile(customer);
  },
});

export const submitVisitorProfile = mutation({
  args: {
    publicKey: v.string(),
    visitorId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { settings } = await getVisitorCustomer(ctx, args.publicKey, args.visitorId);
    const profile = validateVisitorProfile(args, normalizeWebWidgetExperience(settings).leadForm);
    const customerId = await ctx.runMutation(internal.customers.internalUpsertFromWebhook, {
      orgId: settings.orgId,
      service: "web",
      contactAddress: args.visitorId,
      profileName: profile.name,
      email: profile.email,
      phone: profile.phone,
      userId: settings.connectedByUserId,
      agentId: settings.agentId,
    });
    const customer = await ctx.db.get(customerId);
    if (customer === null) {
      throw new Error("Customer not found");
    }
    return publicProfile(customer);
  },
});
