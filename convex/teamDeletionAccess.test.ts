/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import {
  canProcessWorkspaceActivity,
  getWorkspaceAvailability,
} from "./teamDeletion/access";
import { ingestChannelMessage } from "./chat/threads";
import { getEnabledSettingsByPublicKey } from "./webWidgetCore";

const modules = import.meta.glob("./**/*.ts");

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

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

  test("guards delayed AI, import, avatar, and default-auth activity", () => {
    expect(source("./chat/inbox.ts")).toContain(
      "internal.teamDeletion.access.canProcess",
    );
    expect(source("./customerImportPool.ts")).toContain(
      "canProcessWorkspaceActivity(ctx, job.orgId)",
    );
    expect(source("./avatarConversation.ts")).toContain(
      "canProcessWorkspaceActivity(ctx, configuration.orgId)",
    );
    expect(source("./authUtils.ts")).toContain(
      "canProcessWorkspaceActivity(ctx, orgId)",
    );
    expect(source("./workpool.ts")).toContain(
      "assertWorkspaceCanCreateExternalState",
    );
    expect(source("./whatsappTemplateMediaPool.ts")).toContain(
      "internal.teamDeletion.access.canProcess",
    );
  });

  test("blocks public widgets for a deleting workspace", async () => {
    const t = convexTest(schema, modules);
    const publicKey = await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("teams", {
        type: "organizational",
        name: "Deleting",
        workosOrgId: "org_widget_deleting",
        deletionStatus: "deleting",
        deletionStartedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      const agentId = await ctx.db.insert("agents", {
        name: "Agent",
        provider: "openrouter",
        model: "ilmu-mini-v3.3",
        systemPrompt: "Test",
        templateKey: "blank",
        fileSize: 0,
        userId: "user_owner",
        orgId: "org_widget_deleting",
        createdAt: now,
        updatedAt: now,
      });
      const channelId = await ctx.db.insert("channels", {
        orgId: "org_widget_deleting",
        service: "web",
        status: "connected",
        connectedByUserId: "user_owner",
        defaultAgentId: agentId,
        createdAt: now,
        updatedAt: now,
      });
      const publicKey = "pub_deleting";
      await ctx.db.insert("webWidgetSettings", {
        channelId,
        agentId,
        orgId: "org_widget_deleting",
        connectedByUserId: "user_owner",
        publicKey,
        enabled: true,
        agentDisplayName: "Agent",
        createdAt: now,
        updatedAt: now,
      });
      return publicKey;
    });

    await expect(
      t.run((ctx) => getEnabledSettingsByPublicKey(ctx, publicKey)),
    ).rejects.toThrow("Widget not found");
  });

  test("queued Cloudflare uploads stop before creating external data", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("teams", {
        type: "organizational",
        name: "Deleting",
        workosOrgId: "org_upload_deleting",
        deletionStatus: "deleting",
        deletionStartedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    });

    await expect(
      t.action(internal.workpool.cfUploadWorker, {
        entryId: "entry_deleting",
        entryType: "text",
        title: "Title",
        content: "Content",
        orgId: "org_upload_deleting",
      }),
    ).rejects.toThrow("Workspace unavailable");
  });
});
