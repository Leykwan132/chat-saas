import { v } from "convex/values";
import { action } from "../_generated/server";
import { getAuthContext } from "../authUtils";
import {
  googleCalendarConnectionStatusValidator,
  type GoogleCalendarConnectionStatus,
} from "./connectionStatus";
import { createUserScopedPipesWidgetToken } from "./connectionWorkos";
import {
  disconnectGoogleCalendarConnection,
  googleCalendarConnectionDependencies,
  reconcileGoogleCalendarConnection,
  refreshGoogleCalendarConnection,
} from "./connectionRuntime";

export const reconcileCurrentConnection = action({
  args: {},
  returns: googleCalendarConnectionStatusValidator,
  handler: async (ctx): Promise<GoogleCalendarConnectionStatus> => {
    return await reconcileGoogleCalendarConnection(
      ctx,
      googleCalendarConnectionDependencies(ctx),
    );
  },
});

export const refreshCurrentConnection = action({
  args: {},
  returns: googleCalendarConnectionStatusValidator,
  handler: async (ctx): Promise<GoogleCalendarConnectionStatus> => {
    return await refreshGoogleCalendarConnection(
      ctx,
      googleCalendarConnectionDependencies(ctx),
    );
  },
});

export const getCurrentPipesWidgetToken = action({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    const auth = await getAuthContext(ctx);
    return await createUserScopedPipesWidgetToken(auth.userId);
  },
});

export const disconnectCurrentConnection = action({
  args: {},
  returns: googleCalendarConnectionStatusValidator,
  handler: async (ctx): Promise<GoogleCalendarConnectionStatus> => {
    return await disconnectGoogleCalendarConnection(
      ctx,
      googleCalendarConnectionDependencies(ctx),
    );
  },
});
