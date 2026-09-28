import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => {
  vi.stubEnv("META_APP_ID", "test-app");
  vi.stubEnv("CONVEX_SITE_URL", "https://example.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test("Messenger OAuth starts for an account outside the former allowlist", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "owner",
      email: "owner@example.com",
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
    await ctx.db.patch(userId, { activeTeamId: teamId });
  });

  const owner = t.withIdentity({ subject: "owner", email: "owner@example.com" });
  const { authorizeUrl } = await owner.action(api.messengerAuth.start, {});
  const url = new URL(authorizeUrl);

  expect(url.origin).toBe("https://www.facebook.com");
  expect(url.searchParams.get("client_id")).toBe("test-app");
  expect(url.searchParams.get("redirect_uri")).toBe("https://example.com/auth/messenger/callback");
});
