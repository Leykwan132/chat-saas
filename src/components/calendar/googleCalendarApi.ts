import type { FunctionReference } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { GoogleCalendarConnectionStatus } from "./googleCalendarUi";

type GoogleCalendarClientApi = {
  connectionQueries: {
    getCurrentConnectionStatus: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      GoogleCalendarConnectionStatus
    >;
  };
  connectionActions: {
    reconcileCurrentConnection: FunctionReference<
      "action",
      "public",
      Record<string, never>,
      GoogleCalendarConnectionStatus
    >;
    refreshCurrentConnection: FunctionReference<
      "action",
      "public",
      Record<string, never>,
      GoogleCalendarConnectionStatus
    >;
    disconnectCurrentConnection: FunctionReference<
      "action",
      "public",
      Record<string, never>,
      GoogleCalendarConnectionStatus
    >;
    getCurrentAuthorizeUrl: FunctionReference<
      "action",
      "public",
      Record<string, never>,
      { url: string }
    >;
  };
};

export const googleCalendarApi = (
  api as unknown as { googleCalendar: GoogleCalendarClientApi }
).googleCalendar;
