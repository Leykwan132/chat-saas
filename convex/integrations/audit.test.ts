import { convexTest } from "convex-test";
import { expect, it, vi } from "vitest";
import schema from "../schema";
import { internal } from "../_generated/api";
import { integrationTestModules } from "../../tests/integrationModules";

it("drains all full expired audit batches and preserves fresh records", async () => {
  vi.useFakeTimers();
  try {
    const t = convexTest(schema, integrationTestModules);
    await t.run(async (ctx) => {
      for (let index = 0; index < 201; index++)
        await ctx.db.insert("integrationAudit", {
          consentId: "consent",
          orgId: "org",
          operation: "read",
          outcome: "success",
          createdAt: Date.now() - 31 * 86400000,
        });
      await ctx.db.insert("integrationAudit", {
        consentId: "fresh",
        orgId: "org",
        operation: "read",
        outcome: "success",
        createdAt: Date.now(),
      });
    });
    await t.mutation(internal.integrations.audit.cleanup, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const remaining = await t.run(async (ctx) =>
      ctx.db.query("integrationAudit").take(10),
    );
    expect(remaining.map((row) => row.consentId)).toEqual(["fresh"]);
  } finally {
    vi.useRealTimers();
  }
});
