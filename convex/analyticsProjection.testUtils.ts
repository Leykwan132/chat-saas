/// <reference types="vite/client" />
import aggregateSchema from "../node_modules/@convex-dev/aggregate/dist/component/schema.js";
import { convexTest, type TestConvex } from "convex-test";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { v2ConversationSourceKey } from "./analyticsMetricModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const mockAggregate = {
  public: () =>
    import("../node_modules/@convex-dev/aggregate/dist/component/public.js"),
  "_generated/server": () =>
    import(
      "../node_modules/@convex-dev/aggregate/dist/component/_generated/server.js"
    ),
};

export type AnalyticsProjectionTest = TestConvex<typeof schema>;

export function analyticsProjectionTest(): AnalyticsProjectionTest {
  const test = convexTest(schema, modules);
  test.registerComponent("analyticsMetrics", aggregateSchema, mockAggregate);
  return test;
}

export type AnalyticsProjectionFixture = {
  t: AnalyticsProjectionTest;
  orgId: string;
  channelId: Id<"channels">;
  customerId: Id<"customers">;
  conversationId: Id<"conversations">;
  insertMessage: (
    direction: Doc<"messages">["direction"],
    createdAt: number,
    authorUserId?: string,
    contentType?: Doc<"messages">["contentType"],
  ) => Promise<Id<"messages">>;
  insertTopic: (slug: string) => Promise<Id<"conversationTopics">>;
  replaceAssignments: (
    assignments: Array<{
      topicId: Id<"conversationTopics">;
      rank: number;
      detectedAt: number;
    }>,
  ) => Promise<void>;
  patchConversation: (
    patch: Partial<Doc<"conversations">>,
  ) => Promise<void>;
  patchCustomer: (patch: Partial<Doc<"customers">>) => Promise<void>;
  projectionState: () => Promise<
    Doc<"conversationAnalyticsProjectionStates"> | null
  >;
  metricRows: (
    metric?: Doc<"analyticsMetricEntries">["metric"],
  ) => Promise<Doc<"analyticsMetricEntries">[]>;
  metricBySourceRole: (
    role: string,
  ) => Promise<Doc<"analyticsMetricEntries">>;
  metricBySourceRoleOrNull: (
    role: string,
  ) => Promise<Doc<"analyticsMetricEntries"> | null>;
  runConversationProjection: (observedAt?: number) => Promise<unknown>;
  runTopicProjection: () => Promise<unknown>;
};

export async function createProjectionFixture(
  overrides: {
    assignedUserId?: string;
    status?: Doc<"conversations">["status"];
    tags?: string[];
    leadTemperature?: Doc<"customers">["leadTemperature"];
    service?: Exclude<Doc<"conversations">["service"], "playground">;
  } = {},
): Promise<AnalyticsProjectionFixture> {
  const t = analyticsProjectionTest();
  const orgId = "org-projection";
  const now = 1000;
  const service = overrides.service ?? "whatsapp";
  const ids = await t.run(async (ctx) => {
    const channelId = await ctx.db.insert("channels", {
      orgId,
      service,
      phoneNumberId: "phone-projection",
      accessToken: "token",
      status: "connected",
      connectedByUserId: "user-owner",
      createdAt: now,
      updatedAt: now,
    });
    const customerId = await ctx.db.insert("customers", {
      orgId,
      service,
      contactAddress: "+60123456789",
      tags: [],
      leadTemperature: overrides.leadTemperature,
      source: service,
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId,
      channelId,
      service,
      orgAddress: "phone-projection",
      contactAddress: "+60123456789",
      customerId,
      status: overrides.status ?? "open",
      tags: overrides.tags ?? [],
      assignedUserId: overrides.assignedUserId,
      assignToAiAgent: false,
      threadId: "thread-projection",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(customerId, { lastConversationId: conversationId });
    return { channelId, customerId, conversationId };
  });

  const metricRows = async (
    metric?: Doc<"analyticsMetricEntries">["metric"],
  ) =>
    await t.run(async (ctx) => {
      const rows = await ctx.db
        .query("analyticsMetricEntries")
        .withIndex("by_sourceConversationId", (query) =>
          query.eq("sourceConversationId", ids.conversationId),
        )
        .take(100);
      return metric === undefined
        ? rows
        : rows.filter((row) => row.metric === metric);
    });

  const metricBySourceRoleOrNull = async (role: string) => {
    const sourceKey = v2ConversationSourceKey(ids.conversationId, role);
    return await t.run(async (ctx) =>
      await ctx.db
        .query("analyticsMetricEntries")
        .withIndex("by_sourceKey", (query) =>
          query.eq("sourceKey", sourceKey),
        )
        .unique(),
    );
  };

  return {
    t,
    orgId,
    ...ids,
    insertMessage: async (
      direction,
      createdAt,
      authorUserId,
      contentType = "text",
    ) =>
      await t.run(async (ctx) =>
        await ctx.db.insert("messages", {
          orgId,
          conversationId: ids.conversationId,
          channelId: ids.channelId,
          service,
          orgAddress: "phone-projection",
          contactAddress: "+60123456789",
          direction,
          authorUserId,
          contentType,
          content: `${direction}-${createdAt}`,
          status: direction === "outgoing" ? "sent" : undefined,
          createdAt,
        }),
      ),
    insertTopic: async (slug) =>
      await t.run(async (ctx) =>
        await ctx.db.insert("conversationTopics", {
          orgId,
          name: slug,
          slug,
          totalCount: 0,
          weekCount: 0,
          lastSeenAt: now,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    replaceAssignments: async (assignments) =>
      await t.run(async (ctx) => {
        const existing = await ctx.db
          .query("conversationTopicAssignments")
          .withIndex("by_conversationId", (query) =>
            query.eq("conversationId", ids.conversationId),
          )
          .take(6);
        for (const row of existing) await ctx.db.delete(row._id);
        for (const assignment of assignments) {
          await ctx.db.insert("conversationTopicAssignments", {
            orgId,
            conversationId: ids.conversationId,
            topicId: assignment.topicId,
            confidence: 1,
            rank: assignment.rank,
            detectedAt: assignment.detectedAt,
            createdAt: assignment.detectedAt,
            updatedAt: assignment.detectedAt,
          });
        }
      }),
    patchConversation: async (patch) =>
      await t.run(async (ctx) => {
        await ctx.db.patch(ids.conversationId, patch);
      }),
    patchCustomer: async (patch) =>
      await t.run(async (ctx) => {
        await ctx.db.patch(ids.customerId, patch);
      }),
    projectionState: async () =>
      await t.run(async (ctx) =>
        await ctx.db
          .query("conversationAnalyticsProjectionStates")
          .withIndex("by_conversationId", (query) =>
            query.eq("conversationId", ids.conversationId),
          )
          .unique(),
      ),
    metricRows,
    metricBySourceRole: async (role) => {
      const row = await metricBySourceRoleOrNull(role);
      if (row === null) throw new Error(`Missing metric role ${role}`);
      return row;
    },
    metricBySourceRoleOrNull,
    runConversationProjection: async (observedAt) =>
      await t.mutation(internal.analyticsConversationProjection.run, {
        conversationId: ids.conversationId,
        observedAt,
      }),
    runTopicProjection: async () =>
      await t.mutation(internal.analyticsTopicProjection.run, {
        conversationId: ids.conversationId,
      }),
  };
}
