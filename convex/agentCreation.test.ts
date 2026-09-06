/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import { DEFAULT_AGENT_MODEL } from "../shared/agentModelDefaults";
import { Permission } from "../shared/permissions";

const modules = import.meta.glob("./**/*.ts");

function initTest() {
  const testInstance = convexTest(schema, modules);
  testInstance.registerComponent("stripe", stripeSchema, {
    public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
    private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () =>
      import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });
  return testInstance;
}

describe("goal-based agent creation", () => {
  test("stores trimmed business context and builds the support prompt", async () => {
    const testInstance = initTest();
    const authed = testInstance.withIdentity({ subject: "goal-agent-owner" });
    const agentId = await authed.mutation(api.agents.create, {
      name: "  Nova  ",
      businessName: "  Northstar Dental  ",
      businessDescription: "  Family dental care.  ",
      goal: "support",
    });
    const agent = await authed.query(api.agents.get, { agentId });

    expect(agent).toMatchObject({
      name: "Nova",
      businessName: "Northstar Dental",
      businessDescription: "Family dental care.",
      goal: "support",
      templateKey: "support",
      model: DEFAULT_AGENT_MODEL,
    });
    expect(agent?.systemPrompt).toContain("Northstar Dental");
    expect(agent?.systemPrompt).toContain("customer support AI agent");
  });

  test("stores a booking description and maps booking to sales compatibility", async () => {
    const testInstance = initTest();
    const authed = testInstance.withIdentity({ subject: "booking-agent-owner" });
    const agentId = await authed.mutation(api.agents.create, {
      name: "Booking Assistant",
      businessName: "Glow Studio",
      businessDescription: "Beauty and wellness appointments.",
      goal: "bookService",
    });
    const agent = await authed.query(api.agents.get, { agentId });

    expect(agent?.businessDescription).toBe("Beauty and wellness appointments.");
    expect(agent?.goal).toBe("bookService");
    expect(agent?.templateKey).toBe("sales");
    expect(agent?.systemPrompt).toContain("Do not claim a booking is confirmed");
    expect(agent?.systemPrompt).toContain("Do not claim that a confirmation email");
  });

  test("rejects an empty business name", async () => {
    const testInstance = initTest();
    const authed = testInstance.withIdentity({ subject: "invalid-business-owner" });

    await expect(
      authed.mutation(api.agents.create, {
        name: "Support",
        businessName: "   ",
        businessDescription: "Customer support services",
        goal: "support",
      }),
    ).rejects.toThrow("Business name is required");
  });

  test("rejects an empty business description", async () => {
    const testInstance = initTest();
    const authed = testInstance.withIdentity({ subject: "invalid-description-owner" });

    await expect(
      authed.mutation(api.agents.create, {
        name: "Support",
        businessName: "Support Co",
        businessDescription: "   ",
        goal: "support",
      }),
    ).rejects.toThrow("Business description is required");
  });

  test("enables the creator's schedule for a new personal agent", async () => {
    const testInstance = initTest();
    const workosUserId = "personal-schedule-owner";
    const agentId = await testInstance
      .withIdentity({ subject: workosUserId })
      .mutation(api.agents.create, {
        name: "Personal Schedule Agent",
        businessName: "Personal Business",
        businessDescription: "Personal availability defaults",
        goal: "support",
      });

    const schedule = await testInstance.run(async (ctx) =>
      await ctx.db
        .query("userSchedules")
        .withIndex("by_agentId_and_workosUserId", (q) =>
          q.eq("agentId", agentId).eq("workosUserId", workosUserId),
        )
        .unique(),
    );

    expect(schedule?.enabled).toBe(true);
  });

  test("enables every current member's schedule for a new organizational agent", async () => {
    const testInstance = initTest();
    const { ownerWorkosUserId, memberWorkosUserId } = await testInstance.run(
      async (ctx) => {
        const now = Date.now();
        const ownerWorkosUserId = "org-schedule-owner";
        const memberWorkosUserId = "org-schedule-member";
        const ownerId = await ctx.db.insert("users", {
          workosUserId: ownerWorkosUserId,
          email: "owner@example.com",
          createdAt: now,
          updatedAt: now,
        });
        const memberId = await ctx.db.insert("users", {
          workosUserId: memberWorkosUserId,
          email: "member@example.com",
          createdAt: now,
          updatedAt: now,
        });
        const teamId = await ctx.db.insert("teams", {
          type: "organizational",
          name: "Schedule Defaults",
          ownerId,
          workosOrgId: "org-schedule-defaults",
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert("teamMemberships", {
          teamId,
          userId: ownerId,
          role: "owner",
          createdAt: now,
        });
        await ctx.db.insert("teamMemberships", {
          teamId,
          userId: memberId,
          role: "member",
          createdAt: now,
        });
        await ctx.db.patch(ownerId, { activeTeamId: teamId, updatedAt: now });
        return { ownerWorkosUserId, memberWorkosUserId };
      },
    );
    const agentId = await testInstance
      .withIdentity({
        subject: ownerWorkosUserId,
        permissions: [Permission.AGENTS_CREATE],
      })
      .mutation(api.agents.create, {
        name: "Organizational Schedule Agent",
        businessName: "Organizational Business",
        businessDescription: "Organizational availability defaults",
        goal: "support",
      });

    const schedules = await testInstance.run(async (ctx) =>
      await ctx.db
        .query("userSchedules")
        .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
        .collect(),
    );

    expect(
      schedules
        .map((schedule) => ({
          workosUserId: schedule.workosUserId,
          enabled: schedule.enabled,
        }))
        .sort((a, b) => a.workosUserId.localeCompare(b.workosUserId)),
    ).toEqual([
      { workosUserId: memberWorkosUserId, enabled: true },
      { workosUserId: ownerWorkosUserId, enabled: true },
    ]);
  });
});
