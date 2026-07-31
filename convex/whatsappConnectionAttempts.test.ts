/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function createAuthenticatedFixture(subject: string) {
  const t = convexTest(schema, modules);
  const authed = t.withIdentity({ subject });
  await authed.mutation(api.authUtils.upsertUser, {});
  const agentId = await t.run(async (ctx) => {
    return await ctx.db.insert("agents", {
      name: "WhatsApp agent",
      provider: "openrouter",
      model: "test-model",
      systemPrompt: "Help customers",
      templateKey: "blank",
      fileSize: 0,
      userId: subject,
      orgId: "personal",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    });
  });
  return { t, authed, agentId };
}

test("beginConnectionAttempt stores the agent context before OAuth", async () => {
  const { t, authed, agentId } = await createAuthenticatedFixture("user-owner");

  const attemptId = await authed.mutation(
    api.whatsappEmbeddedSignup.beginConnectionAttempt,
    { agentId },
  );

  const attempt = await t.run(async (ctx) => await ctx.db.get(attemptId));
  expect(attempt).toMatchObject({
    connectedByUserId: "user-owner",
    orgId: "",
    agentId,
    status: "started",
  });
  expect(attempt?.wabaId).toBeUndefined();
  expect(attempt?.phoneNumberId).toBeUndefined();
});

test("beginConnectionAttempt rejects a second open attempt", async () => {
  const { authed, agentId } = await createAuthenticatedFixture("user-owner");
  await authed.mutation(api.whatsappEmbeddedSignup.beginConnectionAttempt, {
    agentId,
  });

  await expect(
    authed.mutation(api.whatsappEmbeddedSignup.beginConnectionAttempt, {
      agentId,
    }),
  ).rejects.toThrow(
    "You already have a WhatsApp connection in progress. Cancel it before starting a new one.",
  );
});

test("beginConnectionAttempt rejects agent context outside the workspace", async () => {
  const { t, authed } = await createAuthenticatedFixture("user-owner");
  const otherAgentId = await t.run(async (ctx) => {
    return await ctx.db.insert("agents", {
      name: "Other agent",
      provider: "openrouter",
      model: "test-model",
      systemPrompt: "Help other customers",
      templateKey: "blank",
      fileSize: 0,
      userId: "user-other",
      orgId: "org-other",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    });
  });

  await expect(
    authed.mutation(api.whatsappEmbeddedSignup.beginConnectionAttempt, {
      agentId: otherAgentId,
    }),
  ).rejects.toThrow("Agent not found.");
});
