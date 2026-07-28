/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import {
  canProcessWorkspaceActivity,
  getWorkspaceAvailability,
} from "./teamDeletion/access";
import { ingestChannelMessage } from "./chat/threads";

const modules = import.meta.glob("./**/*.ts");

describe("team deletion access", () => {
  test("classifies Personal, active, deleting, and missing workspaces", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("teams", {
        type: "organizational",
        name: "Active",
        workosOrgId: "org_active",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("teams", {
        type: "organizational",
        name: "Deleting",
        workosOrgId: "org_deleting",
        deletionStatus: "deleting",
        deletionStartedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    });

    await t.run(async (ctx) => {
      expect(await getWorkspaceAvailability(ctx, "")).toBe("personal");
      expect(await getWorkspaceAvailability(ctx, "org_active")).toBe("active");
      expect(await getWorkspaceAvailability(ctx, "org_deleting")).toBe(
        "deleting",
      );
      expect(await getWorkspaceAvailability(ctx, "org_missing")).toBe(
        "missing",
      );
      expect(await canProcessWorkspaceActivity(ctx, "")).toBe(true);
      expect(
        await canProcessWorkspaceActivity(ctx, "org_deleting"),
      ).toBe(false);
      expect(await canProcessWorkspaceActivity(ctx, "org_missing")).toBe(
        false,
      );
    });
  });

  test("rejects channel ingestion before any workspace write", async () => {
    const t = convexTest(schema, modules);
    const channelId = await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("teams", {
        type: "organizational",
        name: "Deleting",
        workosOrgId: "org_deleting",
        deletionStatus: "deleting",
        deletionStartedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      return await ctx.db.insert("channels", {
        orgId: "org_deleting",
        service: "web",
        status: "connected",
        connectedByUserId: "user_owner",
        createdAt: now,
        updatedAt: now,
      });
    });

    await expect(
      t.run((ctx) =>
        ingestChannelMessage(ctx, {
          channelId,
          contactAddress: "visitor",
          direction: "incoming",
          content: "Hello",
          contentType: "text",
          timestampMs: Date.now(),
        }),
      ),
    ).rejects.toThrow("Workspace unavailable");

    await t.run(async (ctx) => {
      expect(await ctx.db.query("customers").take(1)).toEqual([]);
      expect(await ctx.db.query("conversations").take(1)).toEqual([]);
      expect(await ctx.db.query("messages").take(1)).toEqual([]);
    });
  });
});
