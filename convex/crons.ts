import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { parseAdvancedAnalyticsCronUtc } from "./analyticsCronSchedule";

const crons = cronJobs();
const advancedAnalyticsCronSchedule = parseAdvancedAnalyticsCronUtc(
  process.env.ADVANCED_ANALYTICS_CRON_UTC,
);

// Refresh long-lived Instagram tokens daily. Each token is valid for 60 days
// but can be refreshed any time after it is 24 hours old, so we sweep every
// 24 hours and refresh any tokens expiring within the next 7 days.
//
// Messenger Page tokens issued via FB Login for Business do not expire, so
// they are intentionally not refreshed here.
crons.interval(
  "refresh instagram tokens",
  { hours: 24 },
  internal.instagramConnect.refreshExpiringTokens,
  {},
);

// Scan and schedule pending follow-ups once daily.
crons.interval(
  "automated follow-up check scan",
  { hours: 24 },
  internal.whatsappFollowUp.runDailyFollowUpScan,
  {},
);

crons.interval(
  "dispatch dirty conversation analytics",
  { minutes: 15 },
  internal.analyticsDirtyDispatcher.dispatchDue,
  {},
);

crons.daily(
  "combined advanced analytics",
  advancedAnalyticsCronSchedule,
  internal.analyticsInsights.runDailyAnalysis,
  {},
);



export default crons;
