import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

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

// Detect common conversation topics for Growth plan workspaces and above.
crons.interval(
  "conversation topic detection",
  { hours: 24 },
  internal.analyticsTopics.runDailyTopicDetection,
  {},
);

// Analyze customer sentiment for Growth plan workspaces and above.
crons.interval(
  "conversation sentiment analysis",
  { hours: 24 },
  internal.analyticsSentiment.runDailySentimentAnalysis,
  {},
);

export default crons;
