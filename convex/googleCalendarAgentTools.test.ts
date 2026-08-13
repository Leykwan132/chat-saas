/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import type { FunctionReference } from "convex/server";
import type { ToolSet } from "ai";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import {
  executeDeleteCalendarEvent,
  executeListCalendarEvents,
  executeUpdateCalendarEvent,
  registerGoogleCalendarTools,
  type GoogleCalendarAgentToolDependencies,
} from "./googleCalendar/agentTools";
import { buildWorkflowBackendHandlingBlock } from "./chat/workflowPrompt";

const modules = import.meta.glob("./**/*.ts");
type CalendarTest = TestConvex<typeof schema>;
type MutationRef = FunctionReference<"mutation", "internal", Record<string, unknown>, unknown>;
const googleInternal = internal as unknown as {
  googleCalendar: {
    agentToolList: { prepareList: MutationRef };
    agentToolMutate: { guardEvent: MutationRef };
  };
};
const startAt = Date.UTC(2026, 6, 1, 9, 0, 0);
const endAt = startAt + 60 * 60 * 1000;

function createTest() {
  return convexTest(schema, modules);
}

async function createAgentFixture(t: CalendarTest) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "agent-cal-owner",
      email: "agent-cal-owner@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal",
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", { teamId, userId, role: "owner", createdAt: now });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    const agentId = await ctx.db.insert("agents", {
      name: "Booking Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: "agent-cal-owner",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "+60111111111",
      contactName: "Customer",
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "thread-agent-cal",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const otherConversationId = await ctx.db.insert("conversations", {
      orgId: "",
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "+60222222222",
      contactName: "Other",
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "thread-agent-cal-other",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    return { userId, teamId, agentId, conversationId, otherConversationId, now };
  });
}

function toolDependencies(t: CalendarTest): GoogleCalendarAgentToolDependencies {
  const stores = googleInternal.googleCalendar;
  return {
    prepareList: (args) => t.mutation(stores.agentToolList.prepareList, args) as never,
    guardEvent: (args) => t.mutation(stores.agentToolMutate.guardEvent, args) as never,
    refresh: async () => undefined,
  };
}

test("agent calendar reads expose only busy intervals", async () => {
  const t = createTest();
  const fixture = await createAgentFixture(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("calendarEvents", {
      teamId: fixture.teamId,
      title: "Private interview",
      description: "Candidate compensation discussion",
      location: "Private office",
      link: "https://meet.google.com/private",
      startAt,
      endAt,
      timeZone: "UTC",
      status: "confirmed",
      createdBy: fixture.userId,
      externalProvider: "google",
      externalCalendarId: "primary",
      externalEventId: "private_google_event",
      externalOwnerUserId: fixture.userId,
      externalOrigin: "google",
      externalStatus: "confirmed",
      externalTransparency: "opaque",
      externalCanEdit: true,
      externalSyncState: "synced",
      createdAt: fixture.now,
      updatedAt: fixture.now,
    });
  });

  const result = await executeListCalendarEvents(
    {
      conversationId: fixture.conversationId,
      rangeStartAt: startAt - 60 * 60 * 1000,
      rangeEndAt: endAt + 60 * 60 * 1000,
    },
    toolDependencies(t),
  );

  expect(result).toEqual([{ startAt, endAt, busy: true }]);
  expect(JSON.stringify(result)).not.toContain("Private interview");
});

test("agent update rejects a Kilobot event from another conversation", async () => {
  const t = createTest();
  const fixture = await createAgentFixture(t);
  const otherConversationEventId = await t.run(async (ctx) => {
    return await ctx.db.insert("calendarEvents", {
      teamId: fixture.teamId,
      title: "Other conversation booking",
      startAt,
      endAt,
      timeZone: "UTC",
      status: "confirmed",
      createdBy: fixture.userId,
      agentId: fixture.agentId,
      conversationId: fixture.otherConversationId,
      externalOrigin: "kilobot",
      createdAt: fixture.now,
      updatedAt: fixture.now,
    });
  });

  expect(
    await executeUpdateCalendarEvent(
      {
        conversationId: fixture.conversationId,
        eventId: otherConversationEventId,
        startAt,
        confirmed: true,
      },
      toolDependencies(t),
    ),
  ).toMatchObject({ kind: "forbidden" });
});

test("agent update rejects a Google-originated event in the active conversation", async () => {
  const t = createTest();
  const fixture = await createAgentFixture(t);
  const googleEventId = await t.run(async (ctx) => {
    return await ctx.db.insert("calendarEvents", {
      teamId: fixture.teamId,
      title: "Private interview",
      startAt,
      endAt,
      timeZone: "UTC",
      status: "confirmed",
      createdBy: fixture.userId,
      conversationId: fixture.conversationId,
      externalOrigin: "google",
      createdAt: fixture.now,
      updatedAt: fixture.now,
    });
  });

  expect(
    await executeUpdateCalendarEvent(
      {
        conversationId: fixture.conversationId,
        eventId: googleEventId,
        startAt,
        confirmed: true,
      },
      toolDependencies(t),
    ),
  ).toMatchObject({ kind: "forbidden" });
});

test("agent cancellation requires an explicit current cancellation request", async () => {
  const t = createTest();
  const fixture = await createAgentFixture(t);
  const eventId = await t.run(async (ctx) => {
    return await ctx.db.insert("calendarEvents", {
      teamId: fixture.teamId,
      title: "Consultation",
      startAt,
      endAt,
      timeZone: "UTC",
      status: "confirmed",
      createdBy: fixture.userId,
      agentId: fixture.agentId,
      conversationId: fixture.conversationId,
      externalOrigin: "kilobot",
      createdAt: fixture.now,
      updatedAt: fixture.now,
    });
  });

  expect(
    await executeDeleteCalendarEvent(
      {
        conversationId: fixture.conversationId,
        eventId,
        confirmed: false,
      },
      toolDependencies(t),
    ),
  ).toMatchObject({ kind: "invalid_request" });
});

test("google calendar tools are absent outside booking-capable conversations", () => {
  const tools: ToolSet = {};
  registerGoogleCalendarTools({
    tools,
    conversationId: "jd7conversation" as Id<"conversations">,
    eligible: false,
  });
  expect(tools).not.toHaveProperty("listCalendarEvents");
  expect(tools).not.toHaveProperty("updateCalendarEvent");
  expect(tools).not.toHaveProperty("deleteCalendarEvent");
});

test("structured calendar failures do not allow the prompt to claim success", () => {
  const block = buildWorkflowBackendHandlingBlock();
  expect(block).toContain("Do not claim that an action was completed unless the workflow or system confirms it");
  expect(block).toContain("needs_reauthorization");
  expect(block).toContain("forbidden");
  expect(block).toContain("invalid_request");
  expect(block).toContain("do not claim success");
});
