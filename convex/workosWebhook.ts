import { WorkOS } from "@workos-inc/node";
import {
  httpAction,
  internalAction,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  ensureUserAccount,
  getTeamByWorkosOrgId,
  removeTeamMembership,
  syncOrgTeamMembershipsFromOrganization,
} from "./teamHelpers";
import { isWorkosOrgAdminRole } from "../shared/teamRoleCatalog";
import {
  parseWorkosInvitationPayload,
  upsertInvitationRecord,
} from "./teamInvitationRecords";
import {
  fetchWorkosUserByEmail,
  fetchWorkosUserById,
} from "./workosClient";

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
      case "invitation.created":
      case "invitation.revoked":
        await syncInvitationFromWebhook(ctx, data);
        break;
      case "invitation.accepted":
        await handleInvitationAccepted(ctx, data);
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
  await ensureUserAccount(ctx, {
    workosUserId,
    email: typeof data?.email === "string" ? data.email : undefined,
    firstName: data?.first_name ?? data?.firstName ?? undefined,
    lastName: data?.last_name ?? data?.lastName ?? undefined,
    profilePictureUrl:
      data?.profile_picture_url ?? data?.profilePictureUrl ?? undefined,
  });
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
    await ctx.scheduler.runAfter(0, internal.orgRoles.provisionOrganizationRolesAction, {
      workosOrgId,
    });
  } else {
    await ctx.db.patch(existing._id, { name, updatedAt: now });
  }

  const org = await ctx.db
    .query("organizations")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", workosOrgId))
    .unique();
  if (org !== null) {
    await syncOrgTeamMembershipsFromOrganization(ctx, org);
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

  const team = await getTeamByWorkosOrgId(ctx, workosOrgId);
  if (team !== null) {
    const memberships = await ctx.db
      .query("teamMemberships")
      .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
      .collect();
    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }
    await ctx.db.delete(team._id);
  }
}

// Membership payloads carry user_id / organization_id and a role with a slug.
// We accept both snake_case (REST) and camelCase (SDK type) variants.
async function applyMembership(ctx: MutationCtx, data: any) {
  const workosUserId: string | undefined = data?.user_id ?? data?.userId;
  const workosOrgId: string | undefined =
    data?.organization_id ?? data?.organizationId;
  const roleSlug: string | undefined = data?.role?.slug ?? data?.role;
  if (!workosUserId || !workosOrgId) return;

  const userId = await ensureUserAccount(ctx, {
    workosUserId,
    email: typeof data?.email === "string" ? data.email : undefined,
  });
  const orgId = await ensureOrganization(ctx, workosOrgId);
  const org = await ctx.db.get(orgId);
  if (org === null) return;

  const isAdmin = isWorkosOrgAdminRole(roleSlug);
  const members = dedupeAppend(org.members, userId);
  const admins = isAdmin
    ? dedupeAppend(org.admins, userId)
    : org.admins.filter((id) => id !== userId);
  await ctx.db.patch(orgId, { members, admins, updatedAt: Date.now() });

  const updatedOrg = await ctx.db.get(orgId);
  if (updatedOrg !== null) {
    await syncOrgTeamMembershipsFromOrganization(ctx, updatedOrg);
  }
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

  const team = await getTeamByWorkosOrgId(ctx, workosOrgId);
  if (team !== null) {
    await removeTeamMembership(ctx, team._id, user._id);
  }
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

async function syncInvitationFromWebhook(ctx: MutationCtx, data: unknown) {
  const parsed = parseWorkosInvitationPayload(data);
  if (parsed === null) {
    return;
  }
  await upsertInvitationRecord(ctx, parsed);
}

async function handleInvitationAccepted(ctx: MutationCtx, data: unknown) {
  const parsed = parseWorkosInvitationPayload(data);
  if (parsed === null) {
    return;
  }

  const normalized = {
    ...parsed,
    state: "accepted" as const,
    acceptedAt: parsed.acceptedAt ?? Date.now(),
  };
  await upsertInvitationRecord(ctx, normalized);

  await ctx.scheduler.runAfter(0, internal.workosWebhook.provisionAcceptedInvitee, {
    data,
  });
}

export const finishInvitationAccepted = internalMutation({
  args: {
    workosUserId: v.string(),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
    workosOrgId: v.optional(v.string()),
    roleSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureUserAccount(ctx, {
      workosUserId: args.workosUserId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      profilePictureUrl: args.profilePictureUrl,
    });

    if (args.workosOrgId) {
      await applyMembership(ctx, {
        user_id: args.workosUserId,
        organization_id: args.workosOrgId,
        email: args.email,
        role: args.roleSlug ? { slug: args.roleSlug } : undefined,
      });
    }
  },
});

export const provisionAcceptedInvitee = internalAction({
  args: {
    data: v.any(),
  },
  handler: async (ctx, { data }) => {
    const parsed = parseWorkosInvitationPayload(data);
    if (parsed === null) {
      return { ok: false as const, reason: "invalid_invitation_payload" as const };
    }

    let workosUserId = parsed.acceptedWorkosUserId;
    let email = parsed.email;
    let firstName: string | undefined;
    let lastName: string | undefined;
    let profilePictureUrl: string | undefined;

    if (workosUserId) {
      try {
        const user = await fetchWorkosUserById(workosUserId);
        email = user.email || email;
        firstName = user.first_name ?? undefined;
        lastName = user.last_name ?? undefined;
        profilePictureUrl = user.profile_picture_url ?? undefined;
      } catch (error) {
        console.warn("invitation.accepted: WorkOS user lookup failed", error);
      }
    } else if (parsed.email) {
      try {
        const user = await fetchWorkosUserByEmail(parsed.email);
        if (user) {
          workosUserId = user.id;
          email = user.email;
          firstName = user.first_name ?? undefined;
          lastName = user.last_name ?? undefined;
          profilePictureUrl = user.profile_picture_url ?? undefined;
        }
      } catch (error) {
        console.warn("invitation.accepted: WorkOS user email lookup failed", error);
      }
    }

    if (!workosUserId) {
      console.warn("invitation.accepted: could not resolve accepted WorkOS user");
      return { ok: false as const, reason: "missing_workos_user" as const };
    }

    await ctx.runMutation(internal.workosWebhook.finishInvitationAccepted, {
      workosUserId,
      email,
      firstName,
      lastName,
      profilePictureUrl,
      workosOrgId: parsed.workosOrgId,
      roleSlug: parsed.roleSlug,
    });

    return { ok: true as const };
  },
});

export const syncAcceptedInvitation = internalMutation({
  args: {
    data: v.any(),
  },
  handler: async (ctx, { data }) => {
    await handleInvitationAccepted(ctx, data);
  },
});

export const syncMembershipFromWebhook = internalMutation({
  args: {
    data: v.any(),
  },
  handler: async (ctx, { data }) => {
    await applyMembership(ctx, data);
  },
});

export const removeMembershipFromWebhook = internalMutation({
  args: {
    data: v.any(),
  },
  handler: async (ctx, { data }) => {
    await removeMembership(ctx, data);
  },
});
