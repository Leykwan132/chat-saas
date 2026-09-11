"use node";

import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { action } from "../_generated/server";
import { getAuthContext } from "../authUtils";
import { createWorkOSClient } from "../workosClient";
import {
  isNativeAuthHostname,
  parsePasswordResetOrigin,
} from "../../shared/passwordResetReturn";

export const startCurrentUserPasswordReset = action({
  args: {
    origin: v.string(),
  },
  returns: v.object({ passwordResetToken: v.string() }),
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const account: { email: string } | null = await ctx.runQuery(
      internal.whiteLabel.customerAccounts.getPasswordAccountForWorkosUser,
      { workosUserId: auth.userId },
    );
    if (account === null) {
      throw new Error("Password reset is unavailable for this account.");
    }
    const { hostname } = parsePasswordResetOrigin(args.origin);
    if (!isNativeAuthHostname(hostname)) {
      const branding = await ctx.runQuery(
        api.whiteLabel.partnerAuthGateway.getBrandingForHostname,
        { hostname },
      );
      if (branding === null) {
        throw new Error("Password reset is unavailable for this domain.");
      }
    }
    const workos = createWorkOSClient();
    const passwordReset = await workos.userManagement.createPasswordReset({
      email: account.email,
    });
    if (!passwordReset.passwordResetToken) {
      throw new Error("Unable to start password reset.");
    }
    return {
      passwordResetToken: passwordReset.passwordResetToken,
    };
  },
});

export const confirmPasswordReset = action({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const token = args.token.trim();
    if (!token) {
      throw new Error("This password reset link is invalid.");
    }
    if (args.newPassword.length < 8) {
      throw new Error("Use a password with at least 8 characters.");
    }
    const workos = createWorkOSClient();
    await workos.userManagement.resetPassword({
      token,
      newPassword: args.newPassword,
    });
    return null;
  },
});
