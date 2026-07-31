/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("recordSignupFinished persists the browser FINISH payload before OAuth completes", async () => {
  const t = convexTest(schema, modules);
  const authed = t.withIdentity({ subject: "user-finish" });
  await authed.mutation(api.authUtils.upsertUser, {});

  const attemptId = await t.run(async (ctx) => {
    return await ctx.db.insert("whatsappConnectionAttempts", {
      orgId: "personal",
      connectedByUserId: "user-finish",
      status: "started",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    });
  });

  await authed.mutation(
    api.whatsappEmbeddedSignup.recordSignupFinished,
    {
      attemptId,
      wabaId: "waba-finish",
      phoneNumberId: "phone-finish",
    },
  );

  const attempt = await t.run(async (ctx) => await ctx.db.get(attemptId));
  expect(attempt?.status).toBe("signup_finished");
  expect(attempt?.wabaId).toBe("waba-finish");
  expect(attempt?.phoneNumberId).toBe("phone-finish");
  expect(attempt?.signupFinishedAt).toBeTypeOf("number");
});

test("recordSignupFinished is idempotent and rejects another user", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "user-owner" });
  const stranger = t.withIdentity({ subject: "user-stranger" });
  await owner.mutation(api.authUtils.upsertUser, {});
  await stranger.mutation(api.authUtils.upsertUser, {});

  const attemptId = await t.run(async (ctx) => {
    return await ctx.db.insert("whatsappConnectionAttempts", {
      orgId: "personal",
      connectedByUserId: "user-owner",
      status: "started",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    });
  });
  const payload = {
    attemptId,
    wabaId: "waba-owner",
    phoneNumberId: "phone-owner",
  };

  await owner.mutation(api.whatsappEmbeddedSignup.recordSignupFinished, payload);
  const first = await t.run(async (ctx) => await ctx.db.get(attemptId));
  await owner.mutation(api.whatsappEmbeddedSignup.recordSignupFinished, payload);
  const second = await t.run(async (ctx) => await ctx.db.get(attemptId));

  expect(second?.signupFinishedAt).toBe(first?.signupFinishedAt);
  await expect(
    stranger.mutation(api.whatsappEmbeddedSignup.recordSignupFinished, payload),
  ).rejects.toThrow("Not allowed to update this connection attempt.");
});
