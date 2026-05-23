import { AuthKit, type AuthFunctions } from "@convex-dev/workos-authkit";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

const authFunctions: AuthFunctions = internal.auth;

export const authKit = new AuthKit<DataModel>(components.workOSAuthKit, {
  authFunctions,
});

const eventHandlers = {
  "user.created": async (ctx: any, event: any) => {
    const now = Date.now();
    await ctx.db.insert("users", {
      workosUserId: event.data.id,
      email: event.data.email,
      firstName: event.data.firstName ?? undefined,
      lastName: event.data.lastName ?? undefined,
      profilePictureUrl: event.data.profilePictureUrl ?? undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
};

// Wrap handlers in a Proxy to return a no-op async function for any unhandled
// WorkOS webhook event types. This prevents Uncaught TypeErrors when WorkOS sends
// events (e.g. session.created, organization_membership.created) that are not explicitly handled.
const safeEventHandlers = new Proxy(eventHandlers, {
  get(target, prop) {
    if (prop in target) {
      return target[prop as keyof typeof target];
    }
    return async () => {};
  },
});

export const { authKitEvent } = authKit.events(safeEventHandlers as any);