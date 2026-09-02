/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { deleteDescendantPage } from "./teamDeletion/localDescendants";
import { deleteLocalPage } from "./teamDeletion/local";
import { finalizeTeamDeletion } from "./teamDeletion/verify";
import { deleteWhiteLabelPartnerOrganizationPage } from "./teamDeletion/whiteLabelCleanup";

const modules = import.meta.glob("./**/*.ts");

test("deletes team data and preserves account and unrelated workspace data", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const ownerId = await ctx.db.insert("users", {
      workosUserId: "user_owner",
      email: "owner@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const personalTeamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal",
      ownerId,
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Delete me",
      ownerId,
      workosOrgId: "org_delete",
      deletionStatus: "deleting",
      deletionStartedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      teamId,
      userId: ownerId,
      role: "owner",
      createdAt: now,
    });
    await ctx.db.patch(ownerId, { activeTeamId: personalTeamId });
    await ctx.db.insert("userCreditPeriods", {
      userId: ownerId,
      periodStart: now,
      periodEnd: now + 1000,
      grantedCredits: 50,
      usedCredits: 0,
      createdAt: now,
      updatedAt: now,
    });

    const agentId = await ctx.db.insert("agents", {
      name: "Delete agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: "user_owner",
      orgId: "org_delete",
      createdAt: now,
      updatedAt: now,
    });
    const workflowId = await ctx.db.insert("workflows", {
      agentId,
      orgId: "org_delete",
      userId: "user_owner",
      name: "Delete workflow",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("workflowNodes", {
      workflowId,
      kind: "start",
      title: "Start",
      positionX: 0,
      positionY: 0,
      createdAt: now,
      updatedAt: now,
    });
    const scheduleId = await ctx.db.insert("userSchedules", {
      agentId,
      workosUserId: "user_owner",
      mode: "scheduled",
      manualStatus: "available",
      timezone: "Asia/Kuala_Lumpur",
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("userShifts", {
      userScheduleId: scheduleId,
      dayOfWeek: 1,
      startMinutes: 540,
      endMinutes: 1020,
    });
    const channelId = await ctx.db.insert("channels", {
      orgId: "org_delete",
      service: "web",
      status: "disconnected",
      connectedByUserId: "user_owner",
      defaultAgentId: agentId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("webWidgetSettings", {
      channelId,
      agentId,
      orgId: "org_delete",
      connectedByUserId: "user_owner",
      publicKey: "widget_delete",
      enabled: false,
      agentDisplayName: "Delete agent",
      createdAt: now,
      updatedAt: now,
    });
    const customerId = await ctx.db.insert("customers", {
      orgId: "org_delete",
      agentId,
      service: "web",
      contactAddress: "visitor",
      tags: [],
      source: "web",
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "org_delete",
      channelId,
      service: "web",
      orgAddress: "web",
      contactAddress: "visitor",
      customerId,
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "thread_delete",
      lastMessageAt: now,
      unreadCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("messages", {
      orgId: "org_delete",
      conversationId,
      channelId,
      service: "web",
      orgAddress: "web",
      contactAddress: "visitor",
      direction: "incoming",
      contentType: "text",
      content: "Delete",
      createdAt: now,
    });
    const batchId = await ctx.db.insert("inboundMediaBatches", {
      conversationId,
      agentId,
      state: "pending",
      revision: 1,
      firstItemAt: now,
      latestItemAt: now,
      processAfter: now,
      latestPromptMessageId: "prompt",
      latestExternalId: "external",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("inboundMediaBatchItems", {
      batchId,
      conversationId,
      assetKey: "asset",
      externalId: "external",
      promptMessageId: "prompt",
      ordinal: 0,
      kind: "image",
      service: "whatsapp",
      providerUrl: "https://example.com/image.png",
      createdAt: now,
    });
    await ctx.db.insert("quickReplies", {
      teamId,
      title: "Delete",
      text: "Delete",
      createdAt: now,
      updatedAt: now,
    });

    const controlTeamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Keep me",
      workosOrgId: "org_keep",
      createdAt: now,
      updatedAt: now,
    });
    const controlAgentId = await ctx.db.insert("agents", {
      name: "Keep agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: "user_control",
      orgId: "org_keep",
      createdAt: now,
      updatedAt: now,
    });
    const jobId = await ctx.db.insert("teamDeletionJobs", {
      teamId,
      workosOrgId: "org_delete",
      source: "stripe",
      phase: "localData",
      createdAt: now,
      updatedAt: now,
    });
    return {
      controlAgentId,
      controlTeamId,
      jobId,
      ownerId,
      personalTeamId,
      teamId,
    };
  });

  await t.run(async (ctx) => {
    let cursor: string | undefined;
    for (let page = 0; page < 100; page += 1) {
      const result = await deleteLocalPage(
        ctx,
        {
          teamId: fixture.teamId,
          orgId: "org_delete",
          workosOrgId: "org_delete",
        },
        cursor,
      );
      if (result.done) break;
      cursor = result.cursor;
      if (page === 99) throw new Error("Deletion did not converge");
    }
    expect(await finalizeTeamDeletion(ctx, fixture.jobId)).toBe(true);
  });

  await t.run(async (ctx) => {
    expect(await ctx.db.get(fixture.teamId)).toBeNull();
    expect(await ctx.db.get(fixture.jobId)).toBeNull();
    expect(await ctx.db.query("agents").withIndex("by_orgId", (q) =>
      q.eq("orgId", "org_delete"),
    ).take(1)).toEqual([]);
    expect(await ctx.db.query("messages").withIndex("by_orgId", (q) =>
      q.eq("orgId", "org_delete"),
    ).take(1)).toEqual([]);
    expect(await ctx.db.query("workflowNodes").take(1)).toEqual([]);
    expect(await ctx.db.query("inboundMediaBatchItems").take(1)).toEqual([]);
    expect(await ctx.db.get(fixture.ownerId)).not.toBeNull();
    expect(await ctx.db.get(fixture.personalTeamId)).not.toBeNull();
    expect(await ctx.db.query("userCreditPeriods").take(1)).toHaveLength(1);
    expect(await ctx.db.get(fixture.controlTeamId)).not.toBeNull();
    expect(await ctx.db.get(fixture.controlAgentId)).not.toBeNull();
  });
});

test("deletes descendants beyond the first parent page", async () => {
  const t = convexTest(schema, modules);
  const usageId = await t.run(async (ctx) => {
    const now = Date.now();
    let lastAgentId;
    for (let index = 0; index < 51; index += 1) {
      lastAgentId = await ctx.db.insert("agents", {
        name: `Agent ${index}`,
        provider: "openrouter",
        userId: "user_owner",
        orgId: "org_many",
        model: "ilmu-mini-v3.3",
        systemPrompt: "Test",
        templateKey: "blank",
        fileSize: 0,
        createdAt: now + index,
        updatedAt: now + index,
      });
    }
    return await ctx.db.insert("rawAgentUsage", {
      agentId: lastAgentId!,
      userId: "user_owner",
      model: "ilmu-mini-v3.3",
      provider: "openrouter",
      usage: {
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
      },
      createdAt: now,
    });
  });

  for (let page = 0; page < 100; page += 1) {
    const deleted = await t.run(async (ctx) =>
      await deleteDescendantPage(ctx, "org_many"),
    );
    if (!deleted) break;
  }

  await t.run(async (ctx) => {
    expect(await ctx.db.get(usageId)).toBeNull();
    expect(
      await ctx.db
        .query("agents")
        .withIndex("by_orgId", (q) => q.eq("orgId", "org_many"))
        .first(),
    ).toBeNull();
  });
});

test("deletes all partner organization records during workspace cleanup", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "user_partner",
      email: "partner@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Customer workspace",
      workosOrgId: "org_customer",
      createdAt: now,
      updatedAt: now,
    });
    const partnerId = await ctx.db.insert("whiteLabelPartners", {
      name: "Partner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const organizationId = await ctx.db.insert("whiteLabelPartnerOrganizations", {
      partnerId,
      teamId,
      status: "active",
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerOrganizationAccounts", {
      partnerOrganizationId: organizationId,
      workosUserId: "user_customer",
      workosOrganizationMembershipId: "om_customer",
      email: "customer@example.com",
      role: "member",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamInvitationRecords", {
      workosInvitationId: "inv_customer",
      email: "invitee@example.com",
      workosOrgId: "org_customer",
      state: "pending",
      workosCreatedAt: new Date(now).toISOString(),
      workosUpdatedAt: new Date(now).toISOString(),
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerOrganizationPlans", {
      partnerOrganizationId: organizationId,
      activePlanKey: "starter",
      creditPlanKey: "starter",
      updatedByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerOrganizationPlanAssignments", {
      partnerOrganizationId: organizationId,
      planKey: "starter",
      appliesAt: now,
      assignedByUserId: userId,
      createdAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerOrganizationCreditPeriods", {
      partnerOrganizationId: organizationId,
      planKey: "starter",
      periodStart: now,
      periodEnd: now + 1000,
      grantedCredits: 2000,
      usedCredits: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerOrganizationCreditGrants", {
      partnerOrganizationId: organizationId,
      grantedCredits: 10,
      usedCredits: 0,
      grantedByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerOrganizationCreditBalances", {
      partnerOrganizationId: organizationId,
      manualGrantedCredits: 10,
      manualUsedCredits: 0,
      grantCount: 1,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerOrganizationCreditLedger", {
      partnerOrganizationId: organizationId,
      event: "manual_grant",
      credits: 10,
      actorUserId: userId,
      createdAt: now,
    });
    return { organizationId, teamId };
  });

  for (let page = 0; page < 20; page += 1) {
    const deleted = await t.run(async (ctx) =>
      deleteWhiteLabelPartnerOrganizationPage(ctx, {
        teamId: fixture.teamId,
        workosOrgId: "org_customer",
      }),
    );
    if (!deleted) break;
  }

  await t.run(async (ctx) => {
    expect(await ctx.db.get(fixture.organizationId)).toBeNull();
    expect(
      await ctx.db
        .query("whiteLabelPartnerOrganizationAccounts")
        .withIndex("by_partnerOrganizationId", (q) =>
          q.eq("partnerOrganizationId", fixture.organizationId),
        )
        .take(1),
    ).toEqual([]);
    expect(
      await ctx.db
        .query("teamInvitationRecords")
        .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", "org_customer"))
        .take(1),
    ).toEqual([]);
  });
});
