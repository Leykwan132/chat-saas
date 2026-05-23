import { WorkOS } from "@workos-inc/node";
import { httpAction, internalMutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// POST /webhook/workos
// Verifies the WorkOS-Signature header against WORKOS_WEBHOOK_SECRET, dedupes
// on event.id via the `processedEvents` table, and dispatches the event into
// users / organizations sync mutations. Must respond within 5 seconds — the
// dispatch mutation is small and idempotent so we run it inline.
export const workosWebhook = httpAction(async (ctx, req) => {
  const secret = process.env.WORKOS_WEBHOOK_SECRET;
  if (!secret) {
    console.error("WORKOS_WEBHOOK_SECRET is not configured");
    return new Response("server misconfigured", { status: 500 });
  }

  const sigHeader = req.headers.get("workos-signature");
  if (!sigHeader) {
    return new Response("missing signature", { status: 400 });
  }

  const rawBody = await req.text();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  // Webhook signing key isn't tied to a tenant, so we don't need clientId/apiKey
  // here. We only use the SDK's signature verification helper.
  const workos = new WorkOS(process.env.WORKOS_API_KEY ?? "placeholder");
  let event;
  try {
    event = await workos.webhooks.constructEvent({
      payload: parsed,
      sigHeader,
      secret,
    });
  } catch (err) {
    console.error("WorkOS signature verification failed", err);
    return new Response("invalid signature", { status: 401 });
  }

  try {
    await ctx.runMutation(internal.workosWebhook.dispatch, {
      eventId: event.id,
      eventType: event.event,
      data: event.data as unknown,
    });
  } catch (err) {
    console.error(`Failed to process WorkOS event ${event.id}`, err);
    // 500 lets WorkOS retry. Idempotency is enforced via processedEvents.
    return new Response("processing failed", { status: 500 });
  }

  return new Response(null, { status: 200 });
});

// Internal mutation: dedupe on event.id, then route to per-event sync logic.
// Wrapped in a single transaction so dedupe + state change land atomically.
export const dispatch = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    data: v.any(),
  },
  handler: async (ctx, { eventId, eventType, data }) => {
    const existing = await ctx.db
      .query("processedEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .unique();
    if (existing !== null) {
      return { dedup: true };
    }

    switch (eventType) {
      case "user.created":
      case "user.updated":
        await upsertUser(ctx, data);
        break;
      case "user.deleted":
        await deleteUserByWorkosId(ctx, data?.id);
        break;
      case "organization.created":
      case "organization.updated":
        await upsertOrganization(ctx, data);
        break;
      case "organization.deleted":
        await deleteOrganizationByWorkosId(ctx, data?.id);
        break;
      case "organization_membership.created":
      case "organization_membership.updated":
        await applyMembership(ctx, data);
        break;
      case "organization_membership.deleted":
        await removeMembership(ctx, data);
        break;
      default:
        // Unhandled events are still recorded so retries of the same delivery
        // dedupe correctly.
        break;
    }

    await ctx.db.insert("processedEvents", {
      eventId,
      processedAt: Date.now(),
    });

    return { dedup: false, eventType };
  },
});

// --- Internal helpers (run inside the dispatch transaction) ---

async function upsertUser(ctx: MutationCtx, data: any) {
  const workosUserId: string | undefined = data?.id;
  if (!workosUserId) return;
  const now = Date.now();
  const existing = await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
    .unique();
  const patch = {
    email: data?.email ?? existing?.email ?? "",
    firstName: data?.first_name ?? data?.firstName ?? undefined,
    lastName: data?.last_name ?? data?.lastName ?? undefined,
    profilePictureUrl:
      data?.profile_picture_url ?? data?.profilePictureUrl ?? undefined,
    updatedAt: now,
  };
  if (existing === null) {
    await ctx.db.insert("users", {
      workosUserId,
      ...patch,
      createdAt: now,
    });
  } else {
    await ctx.db.patch(existing._id, patch);
  }
}

async function deleteUserByWorkosId(ctx: MutationCtx, workosUserId?: string) {
  if (!workosUserId) return;
  const user = await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
    .unique();
  if (user === null) return;
  // Scrub the user from every org's members/admins arrays before deleting.
  const orgs = await ctx.db.query("organizations").collect();
  for (const org of orgs) {
    const members = org.members.filter((id) => id !== user._id);
    const admins = org.admins.filter((id) => id !== user._id);
    if (members.length !== org.members.length || admins.length !== org.admins.length) {
      await ctx.db.patch(org._id, { members, admins, updatedAt: Date.now() });
    }
  }
  await ctx.db.delete(user._id);
}

async function upsertOrganization(ctx: MutationCtx, data: any) {
  const workosOrgId: string | undefined = data?.id;
  if (!workosOrgId) return;
  const now = Date.now();
  const name: string = data?.name ?? "Untitled Organization";
  const existing = await ctx.db
    .query("organizations")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", workosOrgId))
    .unique();
  if (existing === null) {
    await ctx.db.insert("organizations", {
      workosOrgId,
      name,
      members: [],
      admins: [],
      plan: "free",
      credits: 500,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await ctx.db.patch(existing._id, { name, updatedAt: now });
  }
}

async function deleteOrganizationByWorkosId(ctx: MutationCtx, workosOrgId?: string) {
  if (!workosOrgId) return;
  const org = await ctx.db
    .query("organizations")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", workosOrgId))
    .unique();
  if (org === null) return;
  await ctx.db.delete(org._id);
}

// Membership payloads carry user_id / organization_id and a role with a slug.
// We accept both snake_case (REST) and camelCase (SDK type) variants.
async function applyMembership(ctx: MutationCtx, data: any) {
  const workosUserId: string | undefined = data?.user_id ?? data?.userId;
  const workosOrgId: string | undefined =
    data?.organization_id ?? data?.organizationId;
  const roleSlug: string | undefined = data?.role?.slug ?? data?.role;
  if (!workosUserId || !workosOrgId) return;

  const userId = await ensureUser(ctx, workosUserId);
  const orgId = await ensureOrganization(ctx, workosOrgId);
  const org = await ctx.db.get(orgId);
  if (org === null) return;

  const isAdmin = roleSlug === "admin";
  const members = dedupeAppend(org.members, userId);
  const admins = isAdmin
    ? dedupeAppend(org.admins, userId)
    : org.admins.filter((id) => id !== userId);
  await ctx.db.patch(orgId, { members, admins, updatedAt: Date.now() });
}

async function removeMembership(ctx: MutationCtx, data: any) {
  const workosUserId: string | undefined = data?.user_id ?? data?.userId;
  const workosOrgId: string | undefined =
    data?.organization_id ?? data?.organizationId;
  if (!workosUserId || !workosOrgId) return;

  const user = await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
    .unique();
  const org = await ctx.db
    .query("organizations")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", workosOrgId))
    .unique();
  if (user === null || org === null) return;

  const members = org.members.filter((id) => id !== user._id);
  const admins = org.admins.filter((id) => id !== user._id);
  await ctx.db.patch(org._id, { members, admins, updatedAt: Date.now() });
}

async function ensureUser(ctx: MutationCtx, workosUserId: string) {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
    .unique();
  if (existing !== null) return existing._id;
  const now = Date.now();
  const userId = await ctx.db.insert("users", {
    workosUserId,
    email: "",
    createdAt: now,
    updatedAt: now,
  });

  return userId;
}

async function ensureOrganization(ctx: MutationCtx, workosOrgId: string) {
  const existing = await ctx.db
    .query("organizations")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", workosOrgId))
    .unique();
  if (existing !== null) return existing._id;
  const now = Date.now();
  return await ctx.db.insert("organizations", {
    workosOrgId,
    name: "Untitled Organization",
    members: [],
    admins: [],
    plan: "free",
    credits: 500,
    createdAt: now,
    updatedAt: now,
  });
}

function dedupeAppend<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list : [...list, item];
}
