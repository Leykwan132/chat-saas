import { AuthKit, type AuthFunctions } from "@convex-dev/workos-authkit";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { getDefaultUserCredits } from "./credits";

const authFunctions: AuthFunctions = internal.auth;

export const authKit = new AuthKit<DataModel>(components.workOSAuthKit, {
  authFunctions,
});

export const { authKitEvent } = authKit.events({
  "user.created": async (ctx, event) => {
    const now = Date.now();
    const defaultCredits = getDefaultUserCredits();
    const userId = await ctx.db.insert("users", {
      workosUserId: event.data.id,
      email: event.data.email,
      firstName: event.data.firstName ?? undefined,
      lastName: event.data.lastName ?? undefined,
      profilePictureUrl: event.data.profilePictureUrl ?? undefined,
      credits: defaultCredits,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("creditLogs", {
      userId,
      amount: defaultCredits,
      type: "grant",
      balanceBefore: 0,
      balanceAfter: defaultCredits,
      reason: "Initial sign-up credit grant",
      createdAt: now,
    });
  },
});