import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  GOOGLE_CALENDAR_PROVIDER,
} from "./constants";
import {
  googleCalendarConnectionStateValidator,
  googleCalendarErrorKindValidator,
  googleCalendarExternalOriginValidator,
  googleCalendarExternalStatusValidator,
  googleCalendarExternalSyncStateValidator,
  googleCalendarExternalTransparencyValidator,
  googleCalendarSyncRequestKindValidator,
  googleCalendarSyncRunStateValidator,
  googleCalendarWatchChannelStateValidator,
  googleCalendarWriteActionValidator,
  googleCalendarWriteOperationStateValidator,
} from "./contracts";

export const googleCalendarExternalEventFields = {
  externalOwnerUserId: v.optional(v.id("users")),
  externalOrigin: v.optional(googleCalendarExternalOriginValidator),
  externalStatus: v.optional(googleCalendarExternalStatusValidator),
  externalTransparency: v.optional(googleCalendarExternalTransparencyValidator),
  externalCanEdit: v.optional(v.boolean()),
  externalRecurringEventId: v.optional(v.string()),
  externalOriginalStartAt: v.optional(v.number()),
  externalLastSeenSyncRunId: v.optional(v.id("googleCalendarSyncRuns")),
  externalSyncState: v.optional(googleCalendarExternalSyncStateValidator),
  externalOperationKey: v.optional(v.string()),
};

export const googleCalendarTables = {
  googleCalendarConnections: defineTable({
    userId: v.id("users"),
    workosUserId: v.string(),
    provider: v.literal(GOOGLE_CALENDAR_PROVIDER),
    primaryCalendarId: v.literal("primary"),
    timeZone: v.string(),
    state: googleCalendarConnectionStateValidator,
    syncToken: v.optional(v.string()),
    fullSyncStartAt: v.optional(v.number()),
    fullSyncEndAt: v.optional(v.number()),
    dirtyGeneration: v.number(),
    lastSyncAttemptedAt: v.optional(v.number()),
    lastSuccessfulSyncAt: v.optional(v.number()),
    lastErrorKind: v.optional(googleCalendarErrorKindValidator),
    activeSyncRunId: v.optional(v.id("googleCalendarSyncRuns")),
    activeWatchChannelId: v.optional(v.id("googleCalendarWatchChannels")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_workosUserId", ["workosUserId"])
    .index("by_state", ["state"])
    .index("by_lastSuccessfulSyncAt", ["lastSuccessfulSyncAt"])
    .index("by_activeWatchChannelId", ["activeWatchChannelId"]),
  googleCalendarWatchChannels: defineTable({
    connectionId: v.id("googleCalendarConnections"),
    channelId: v.string(),
    resourceId: v.string(),
    resourceUri: v.string(),
    tokenHash: v.string(),
    expirationAt: v.number(),
    lastMessageNumber: v.optional(v.number()),
    state: googleCalendarWatchChannelStateValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_connectionId", ["connectionId"])
    .index("by_connectionId_and_state_and_expirationAt", [
      "connectionId",
      "state",
      "expirationAt",
    ])
    .index("by_channelId", ["channelId"]),
  googleCalendarSyncRuns: defineTable({
    connectionId: v.id("googleCalendarConnections"),
    state: googleCalendarSyncRunStateValidator,
    requestKind: googleCalendarSyncRequestKindValidator,
    dirtyGeneration: v.number(),
    pageToken: v.optional(v.string()),
    candidateSyncToken: v.optional(v.string()),
    importedCount: v.number(),
    updatedCount: v.number(),
    cancelledCount: v.number(),
    conflictCount: v.number(),
    fullSyncStartAt: v.optional(v.number()),
    fullSyncEndAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    errorKind: v.optional(googleCalendarErrorKindValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_connectionId", ["connectionId"])
    .index("by_connectionId_and_state", ["connectionId", "state"]),
  googleCalendarWriteOperations: defineTable({
    connectionId: v.id("googleCalendarConnections"),
    calendarEventId: v.optional(v.id("calendarEvents")),
    operationKey: v.string(),
    action: googleCalendarWriteActionValidator,
    state: googleCalendarWriteOperationStateValidator,
    externalEventId: v.optional(v.string()),
    payloadBindingVersion: v.optional(v.number()),
    payloadFingerprint: v.optional(v.string()),
    payloadPreconditionEtag: v.optional(v.union(v.string(), v.null())),
    intendedEtag: v.optional(v.union(v.string(), v.null())),
    providerEtag: v.optional(v.string()),
    attemptGeneration: v.optional(v.number()),
    attemptLeaseExpiresAt: v.optional(v.number()),
    attemptPhase: v.optional(v.union(
      v.literal("preparing"),
      v.literal("provider_mutation_started"),
    )),
    providerMutationStartedAt: v.optional(v.number()),
    errorKind: v.optional(googleCalendarErrorKindValidator),
    attemptCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_operationKey", ["operationKey"])
    .index("by_calendarEventId", ["calendarEventId"])
    .index("by_calendarEventId_and_action_and_state", [
      "calendarEventId",
      "action",
      "state",
    ]),
};
