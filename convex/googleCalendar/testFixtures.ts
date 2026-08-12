import type { TestConvex } from "convex-test";
import type { FunctionReference } from "convex/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import schema from "../schema";
import type { GoogleCalendarConnectionState } from "./contracts";

type CalendarTest = TestConvex<typeof schema>;

const googleCalendarInternal = internal as unknown as {
  googleCalendar: {
    connectionStore: {
      reserve: FunctionReference<
        "mutation",
        "internal",
        {
          userId: Id<"users">;
          primaryCalendarId: "primary";
          timeZone: string;
          state: GoogleCalendarConnectionState;
        },
        Id<"googleCalendarConnections">
      >;
    };
    writeStore: {
      reserve: FunctionReference<
        "mutation",
        "internal",
        {
          connectionId: Id<"googleCalendarConnections">;
          calendarEventId?: Id<"calendarEvents">;
          operationKey: string;
          action: "create" | "update" | "delete";
        },
        Id<"googleCalendarWriteOperations">
      >;
    };
  };
};

const fixtureTime = Date.UTC(2026, 7, 13, 9, 0, 0);

export async function createUserAcrossTwoTeams(t: CalendarTest) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      workosUserId: "user_google_calendar",
      email: "calendar@example.com",
      createdAt: fixtureTime,
      updatedAt: fixtureTime,
    });
    const teamIds = await Promise.all(
      ["Personal", "Operations"].map(async (name, index) => {
        const teamId = await ctx.db.insert("teams", {
          type: index === 0 ? "personal" : "organizational",
          name,
          ownerId: userId,
          createdAt: fixtureTime,
          updatedAt: fixtureTime,
        });
        await ctx.db.insert("teamMemberships", {
          teamId,
          userId,
          role: "owner",
          createdAt: fixtureTime,
        });
        return teamId;
      }),
    );
    await ctx.db.patch(userId, { activeTeamId: teamIds[0], updatedAt: fixtureTime });
    return { userId, teamIds };
  });
}

export async function reserveConnection(
  t: CalendarTest,
  userId: Id<"users">,
  primaryCalendarId = "primary",
) {
  return await t.mutation(googleCalendarInternal.googleCalendar.connectionStore.reserve, {
    userId,
    primaryCalendarId: primaryCalendarId as "primary",
    timeZone: "Asia/Kuala_Lumpur",
    state: "connected",
  });
}

export async function readConnection(t: CalendarTest, userId: Id<"users">) {
  return await t.run((ctx) =>
    ctx.db
      .query("googleCalendarConnections")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique(),
  );
}

export async function readConnectionsForUser(t: CalendarTest, userId: Id<"users">) {
  return await t.run((ctx) =>
    ctx.db
      .query("googleCalendarConnections")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(2),
  );
}

export async function reserveWriteOperation(
  t: CalendarTest,
  connectionId: Id<"googleCalendarConnections">,
  operationKey: string,
) {
  return await t.mutation(googleCalendarInternal.googleCalendar.writeStore.reserve, {
    connectionId,
    operationKey,
    action: "create",
  });
}

export async function readWriteOperationsByKey(t: CalendarTest, operationKey: string) {
  return await t.run((ctx) =>
    ctx.db
      .query("googleCalendarWriteOperations")
      .withIndex("by_operationKey", (q) => q.eq("operationKey", operationKey))
      .take(2),
  );
}

export async function insertActiveAndPendingReplacement(t: CalendarTest) {
  const { userId } = await createUserAcrossTwoTeams(t);
  const connectionId = await reserveConnection(t, userId);
  return await t.run(async (ctx) => {
    for (const [state, channelId] of [
      ["active", "channel_active"],
      ["pending", "channel_pending"],
    ] as const) {
      await ctx.db.insert("googleCalendarWatchChannels", {
        connectionId,
        channelId,
        resourceId: `${channelId}_resource`,
        resourceUri: "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        tokenHash: `${channelId}_token_hash`,
        expirationAt: fixtureTime + 86_400_000,
        state,
        createdAt: fixtureTime,
        updatedAt: fixtureTime,
      });
    }
    return await ctx.db
      .query("googleCalendarWatchChannels")
      .withIndex("by_connectionId_and_state_and_expirationAt", (q) =>
        q.eq("connectionId", connectionId),
      )
      .take(2);
  });
}

export async function insertSameGoogleEventForTwoOwnersAndTwoInstances(t: CalendarTest) {
  return await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Calendar team",
      createdAt: fixtureTime,
      updatedAt: fixtureTime,
    });
    const ownerIds = await Promise.all(
      ["first", "second"].map(async (name) => {
        const userId = await ctx.db.insert("users", {
          workosUserId: `user_google_${name}`,
          email: `${name}@example.com`,
          createdAt: fixtureTime,
          updatedAt: fixtureTime,
        });
        await ctx.db.insert("teamMemberships", {
          teamId,
          userId,
          role: "member",
          createdAt: fixtureTime,
        });
        return userId;
      }),
    );
    for (const ownerId of ownerIds) {
      for (const originalStartAt of [fixtureTime, fixtureTime + 86_400_000]) {
        await ctx.db.insert("calendarEvents", {
          teamId,
          title: "Google event",
          startAt: originalStartAt,
          endAt: originalStartAt + 3_600_000,
          timeZone: "UTC",
          status: "confirmed",
          createdBy: ownerId,
          externalProvider: "google",
          externalCalendarId: "primary",
          externalEventId: "recurring_google_event",
          externalOwnerUserId: ownerId,
          externalOrigin: "google",
          externalStatus: "confirmed",
          externalTransparency: "opaque",
          externalCanEdit: false,
          externalRecurringEventId: "recurring_google_event",
          externalOriginalStartAt: originalStartAt,
          externalSyncState: "synced",
          createdAt: fixtureTime,
          updatedAt: fixtureTime,
        });
      }
    }
    return await Promise.all(
      ownerIds.flatMap((ownerId) =>
        [fixtureTime, fixtureTime + 86_400_000].map(async (originalStartAt) =>
          await ctx.db
            .query("calendarEvents")
            .withIndex(
              "by_teamId_and_externalOwnerUserId_and_externalCalendarId_and_externalEventId_and_externalOriginalStartAt",
              (q) =>
                q
                  .eq("teamId", teamId)
                  .eq("externalOwnerUserId", ownerId)
                  .eq("externalCalendarId", "primary")
                  .eq("externalEventId", "recurring_google_event")
                  .eq("externalOriginalStartAt", originalStartAt),
            )
            .unique(),
        ),
      ),
    );
  });
}
