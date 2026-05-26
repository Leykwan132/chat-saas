import { AuthKit, type AuthFunctions } from "@convex-dev/workos-authkit";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { ensureUserAccount } from "./teamHelpers";

const authFunctions: AuthFunctions = internal.auth;

/** WorkOS events that must be polled + handled beyond the AuthKit defaults. */
const WORKOS_TEAM_EVENT_TYPES = [
  "invitation.created",
  "invitation.accepted",
  "invitation.revoked",
  "organization.created",
  "organization.updated",
  "organization.deleted",
  "organization_membership.created",
  "organization_membership.updated",
  "organization_membership.deleted",
] as const;

export const authKit = new AuthKit<DataModel>(components.workOSAuthKit, {
  authFunctions,
  additionalEventTypes: [...WORKOS_TEAM_EVENT_TYPES],
});

type AuthKitEventArgs = {
  event: string;
  data: Record<string, unknown>;
};

const eventHandlers: Record<
  string,
  (ctx: MutationCtx, args: AuthKitEventArgs) => Promise<void>
> = {
  "user.created": async (ctx, event) => {
    const data = event.data;
    await ensureUserAccount(ctx, {
      workosUserId: String(data.id),
      email: typeof data.email === "string" ? data.email : undefined,
      firstName:
        (typeof data.first_name === "string" ? data.first_name : undefined) ??
        (typeof data.firstName === "string" ? data.firstName : undefined),
      lastName:
        (typeof data.last_name === "string" ? data.last_name : undefined) ??
        (typeof data.lastName === "string" ? data.lastName : undefined),
      profilePictureUrl:
        (typeof data.profile_picture_url === "string"
          ? data.profile_picture_url
          : undefined) ??
        (typeof data.profilePictureUrl === "string"
          ? data.profilePictureUrl
          : undefined),
    });
  },
  "invitation.created": async (ctx, event) => {
    await ctx.runMutation(internal.teamInvitationRecords.syncFromWorkosInvitation, {
      data: event.data,
    });
  },
  "invitation.revoked": async (ctx, event) => {
    await ctx.runMutation(internal.teamInvitationRecords.syncFromWorkosInvitation, {
      data: event.data,
    });
  },
  "invitation.accepted": async (ctx, event) => {
    await ctx.runMutation(internal.workosWebhook.syncAcceptedInvitation, {
      data: event.data,
    });
  },
  "organization_membership.created": async (ctx, event) => {
    await ctx.runMutation(internal.workosWebhook.syncMembershipFromWebhook, {
      data: event.data,
    });
  },
  "organization_membership.updated": async (ctx, event) => {
    await ctx.runMutation(internal.workosWebhook.syncMembershipFromWebhook, {
      data: event.data,
    });
  },
  "organization_membership.deleted": async (ctx, event) => {
    await ctx.runMutation(internal.workosWebhook.removeMembershipFromWebhook, {
      data: event.data,
    });
  },
};

// Wrap handlers in a Proxy to return a no-op async function for any unhandled
// WorkOS webhook event types. This prevents Uncaught TypeErrors when WorkOS sends
// events (e.g. session.created) that are not explicitly handled.
const safeEventHandlers = new Proxy(eventHandlers, {
  get(target, prop) {
    if (prop in target) {
      return target[prop as keyof typeof target];
    }
    return async () => {};
  },
});

export const { authKitEvent } = authKit.events(safeEventHandlers as any);
