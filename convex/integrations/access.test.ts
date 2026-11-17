import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";
import { resolveMemberAccess } from "./access";
import {
  ensurePendingHandler,
  approveHandler,
  revokeHandler,
} from "./connections";
import { integrationTestModules as modules } from "../../tests/integrationModules";

const principal = {
  issuer: "https://auth.example",
  subject: "user_test",
  orgId: "org_test",
  consentId: "consent_test",
  clientId: "client_test",
  grantedScopes: ["openid"],
};

describe("integration workspace authorization", () => {
  it("activates consented grants and denies removed members and foreign organizations", async () => {
    const t = convexTest(schema, modules);
    const fixture = await t.run(async (ctx) => {
      const now = Date.now();
      const userId = await ctx.db.insert("users", {
        workosUserId: principal.subject,
        email: "test@example.com",
        createdAt: now,
        updatedAt: now,
      });
      const teamId = await ctx.db.insert("teams", {
        name: "Test",
        type: "organizational",
        workosOrgId: principal.orgId,
        createdAt: now,
        updatedAt: now,
      });
      const memberId = await ctx.db.insert("teamMemberships", {
        userId,
        teamId,
        role: "owner",
        createdAt: now,
      });
      return { memberId };
    });
    await t.run(async (ctx) => {
      const id = await ensurePendingHandler(ctx, { principal });
      expect((await ctx.db.get(id))?.status).toBe("active");
      await ctx.db.patch(id, { status: "pending" });
      await ensurePendingHandler(ctx, { principal });
      expect((await ctx.db.get(id))?.status).toBe("active");
      await approveHandler(ctx, {
        connectionId: id,
        expectedIssuer: principal.issuer,
        expectedSubject: principal.subject,
        expectedOrgId: principal.orgId,
        expectedClientId: principal.clientId,
      });
      expect((await ctx.db.get(id))?.status).toBe("active");
      await expect(
        resolveMemberAccess(ctx, { ...principal, orgId: "org_other" }),
      ).rejects.toThrow();
      await revokeHandler(ctx, { connectionId: id });
      await ensurePendingHandler(ctx, { principal });
      expect((await ctx.db.get(id))?.status).toBe("revoked");
      await ctx.db.delete(fixture.memberId);
      await expect(resolveMemberAccess(ctx, principal)).rejects.toThrow();
    });
  });
});
