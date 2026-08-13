import { action } from "../_generated/server";
import {
  googleCalendarConnectionStatusValidator,
  type GoogleCalendarConnectionStatus,
} from "./connectionStatus";
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
