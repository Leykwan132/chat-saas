import { query } from "../_generated/server";
import { getAuthContext } from "../authUtils";
import {
  googleCalendarConnectionStatus,
  googleCalendarConnectionStatusValidator,
} from "./connectionStatus";

export const getCurrentConnectionStatus = query({
  args: {},
  returns: googleCalendarConnectionStatusValidator,
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);
    const connection = await ctx.db
      .query("googleCalendarConnections")
      .withIndex("by_userId", (q) => q.eq("userId", auth.userDbId))
      .unique();
    return googleCalendarConnectionStatus(connection);
  },
});
