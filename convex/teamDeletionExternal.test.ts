/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("disconnect phase disables channels before clearing credentials", async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Delete",
      workosOrgId: "org_delete",
      deletionStatus: "deleting",
      deletionStartedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const channelId = await ctx.db.insert("channels", {
      orgId: "org_delete",
      service: "whatsapp",
      status: "connected",
      accessToken: "secret",
      connectedByUserId: "user_owner",
      createdAt: now,
      updatedAt: now,
    });
    const jobId = await ctx.db.insert("teamDeletionJobs", {
      teamId,
      workosOrgId: "org_delete",
      source: "stripe",
      phase: "stopWork",
      createdAt: now,
      updatedAt: now,
    });
    return { channelId, jobId };
  });

  await t.mutation(
    internal.teamDeletion.externalState.prepareWorkspace,
    { jobId: fixture.jobId },
  );
  await t.run(async (ctx) => {
    const channel = await ctx.db.get(fixture.channelId);
    expect(channel?.status).toBe("disconnected");
    expect(channel?.accessToken).toBe("secret");
  });

  await t.mutation(
    internal.teamDeletion.externalState.clearChannelCredentials,
    { jobId: fixture.jobId },
  );
  await t.run(async (ctx) => {
    const channel = await ctx.db.get(fixture.channelId);
    expect(channel?.status).toBe("disconnected");
    expect(channel?.accessToken).toBeUndefined();
  });
});

test("phase recording is idempotent and advances in order", async () => {
  const t = convexTest(schema, modules);
  const jobId = await t.run(async (ctx) => {
    const now = Date.now();
    const teamId = await ctx.db.insert("teams", {
      type: "organizational",
      name: "Delete",
      workosOrgId: "org_delete",
      deletionStatus: "deleting",
      deletionStartedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.insert("teamDeletionJobs", {
      teamId,
      workosOrgId: "org_delete",
      source: "stripe",
      phase: "stopWork",
      createdAt: now,
      updatedAt: now,
    });
  });

  await t.mutation(
    internal.teamDeletion.worker.recordPhaseResult,
    {
      jobId,
      expectedPhase: "stopWork",
      done: true,
    },
  );
  await t.mutation(
    internal.teamDeletion.worker.recordPhaseResult,
    {
      jobId,
      expectedPhase: "stopWork",
      done: true,
    },
  );
  await t.run(async (ctx) => {
    expect((await ctx.db.get(jobId))?.phase).toBe("disconnectChannels");
  });
});
