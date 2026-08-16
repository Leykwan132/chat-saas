/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { customerSearchText } from "./customerSearch";

const modules = import.meta.glob("./**/*.ts");

test("normalizes every customer identity field into searchable text", () => {
  expect(customerSearchText({
    name: "  Jessica Lee ",
    email: "JESSICA@EXAMPLE.COM",
    phone: "+60 12-345 6789",
    contactAddress: "wa:60123456789",
  })).toBe("jessica lee jessica@example.com +60 12-345 6789 wa:60123456789");
});

test("manual customer creation writes the search projection atomically", async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "customer-search-writer";
  const agentId = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "writer@example.com",
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
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    return await ctx.db.insert("agents", {
      name: "Customer Agent",
      provider: "openrouter",
      model: "test/model",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
  });
  const authed = t.withIdentity({ subject: workosUserId });

  const customerId = await authed.mutation(api.customers.addManually, {
    agentId,
    name: "Jessica Writer",
    email: "Writer@Example.com",
    phone: "+60129999999",
  });

  const customer = await t.run(async (ctx) => await ctx.db.get(customerId));
  expect(customer?.searchText).toBe(
    "jessica writer writer@example.com +60129999999",
  );
  expect(customer).toMatchObject({ agentId, userId: workosUserId });
  const listed = await authed.query(api.customers.listForCurrentOrg, {
    agentId,
    paginationOpts: { numItems: 10, cursor: null },
  });
  expect(listed.page.map((row) => row._id)).toContain(customerId);
});

test("CSV imports retain the agent and personal owner scope", async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "customer-import-writer";
  const { agentId, batchId } = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "importer@example.com",
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
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    const agentId = await ctx.db.insert("agents", {
      name: "Import Agent",
      provider: "openrouter",
      model: "test/model",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: workosUserId,
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const jobId = await ctx.db.insert("customerImportJobs", {
      orgId: "",
      agentId,
      status: "processing",
      fileName: "customers.csv",
      totalRows: 1,
      processedRows: 0,
      failedRows: 0,
      skippedRows: 0,
      fieldMapping: { name: "Name" },
      tags: [],
      createdBy: workosUserId,
      createdAt: now,
      updatedAt: now,
    });
    const batchId = await ctx.db.insert("customerImportRows", {
      jobId,
      batchIndex: 0,
      rows: [{ Name: "Imported Writer" }],
      status: "pending",
      processedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    });
    return { agentId, batchId };
  });

  await t.mutation(internal.customerImportPool.importBatchWorker, { batchId });

  const customer = await t.run(async (ctx) => await ctx.db
    .query("customers")
    .withIndex("by_userId_and_agentId_and_lastSeenAt", (q) => q
      .eq("userId", workosUserId)
      .eq("agentId", agentId))
    .unique());
  expect(customer).toMatchObject({ name: "Imported Writer", agentId, userId: workosUserId });
});
