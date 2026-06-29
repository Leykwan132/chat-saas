/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function createPersonalAgent(
  t: ReturnType<typeof convexTest>,
  workosUserId: string,
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: `${workosUserId}@example.com`,
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
    await ctx.db.insert("teamMemberships", {
      teamId,
      userId,
      role: "owner",
      createdAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    const agentId = await ctx.db.insert("agents", {
      name: "Availability Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test prompt",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    return { agentId };
  });
}

test("personal user can initialize their own availability schedule", async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "user-personal-availability";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });

  const userScheduleId = await authed.mutation(api.leadRouting.schedules.addUser, {
    agentId,
    workosUserId,
    timezone: "Asia/Kuala_Lumpur",
  });

  const detail = await authed.query(api.leadRouting.schedules.getForAgentUser, {
    agentId,
    workosUserId,
  });

  expect(detail?.schedule?._id).toBe(userScheduleId);
  expect(detail?.schedule?.timezone).toBe("Asia/Kuala_Lumpur");
  expect(detail?.shifts).toHaveLength(7);
});

test("personal user cannot initialize another user's availability schedule", async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "user-personal-owner";
  const { agentId } = await createPersonalAgent(t, workosUserId);
  const authed = t.withIdentity({ subject: workosUserId });

  await expect(
    authed.mutation(api.leadRouting.schedules.addUser, {
      agentId,
      workosUserId: "user-someone-else",
    }),
  ).rejects.toThrow("Organization required");
});
