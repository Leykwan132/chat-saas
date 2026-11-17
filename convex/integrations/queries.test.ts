import { describe, expect, it } from "vitest";
import { internal, components } from "../_generated/api";
import { fixture, principal } from "../../tests/integrationFixture";

describe("integration data isolation", () => {
  it("returns only successful customer/assistant messages", async () => {
    const { t, approve, ids } = await fixture();
    await approve();
    await t.run(async (ctx) => {
      const thread = await ctx.runMutation(
        components.agent.threads.createThread,
        { userId: principal.subject },
      );
      await ctx.db.patch(ids.conversationId, { threadId: thread._id });
      await ctx.runMutation(components.agent.messages.addMessages, {
        threadId: thread._id,
        messages: [
          {
            message: { role: "user", content: "Customer question" },
            status: "success",
          },
          {
            message: { role: "assistant", content: "Successful reply" },
            status: "success",
          },
          {
            message: { role: "assistant", content: "Failed reply" },
            status: "failed",
            error: "failed",
          },
          {
            message: { role: "assistant", content: "Pending reply" },
            status: "pending",
          },
          {
            message: { role: "system", content: "Secret instructions" },
            status: "success",
          },
        ],
      });
    });
    const result = JSON.parse(
      await t.query(internal.integrations.queries.executeRead, {
        principal,
        operation: {
          operation: "get_conversation",
          conversationId: ids.conversationId,
          limit: 50,
        },
      }),
    );
    expect(result.items.map((item: { text: string }) => item.text)).toEqual([
      "Successful reply",
      "Customer question",
    ]);
  });
  it("exposes agent discovery after consent without manual approval", async () => {
    const { t, ids } = await fixture();
    const args = {
      principal,
      operation: {
        operation: "get_connection_context" as const,
        agentLimit: 10,
      },
    };
    const result = JSON.parse(
      await t.query(internal.integrations.queries.executeRead, args),
    );
    expect(result.items).toEqual([
      {
        agentId: ids.agentId,
        name: "Test / Support",
        capability: "conversations:read",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("Secret system prompt");
    expect(JSON.stringify(result)).not.toContain(ids.foreignAgentId);
  });
  it("searches only the consent workspace and rechecks live membership", async () => {
    const { t, approve, ids } = await fixture();
    await approve();
    const operation = {
      operation: "search_conversations" as const,
      agentId: ids.agentId,
      query: "refund",
      limit: 10,
    };
    const result = JSON.parse(
      await t.query(internal.integrations.queries.executeRead, {
        principal,
        operation,
      }),
    );
    expect(result.items[0].conversationId).toBe(ids.conversationId);
    await t.run(async (ctx) => {
      await ctx.db.patch(ids.channelId, { status: "disconnected" });
    });
    const disconnected = JSON.parse(
      await t.query(internal.integrations.queries.executeRead, {
        principal,
        operation,
      }),
    );
    expect(disconnected.items).toEqual([]);
    await expect(
      t.query(internal.integrations.queries.executeRead, {
        principal,
        operation: { ...operation, agentId: ids.foreignAgentId },
      }),
    ).rejects.toThrow("NOT_FOUND");
    await t.run(async (ctx) => {
      await ctx.db.delete(ids.memberId);
    });
    await expect(
      t.query(internal.integrations.queries.executeRead, {
        principal,
        operation,
      }),
    ).rejects.toThrow("WORKSPACE_UNAVAILABLE");
  });
  it("blocks revoked grants and current permission removal without changing the token", async () => {
    const { t, approve, ids, connectionId } = await fixture();
    await approve();
    const args = {
      principal,
      operation: {
        operation: "get_connection_context" as const,
        agentLimit: 10,
      },
    };
    await t.mutation(internal.integrations.connections.revokePilotConnection, {
      connectionId,
    });
    await t.mutation(
      internal.integrations.connections.ensurePendingConnection,
      { principal },
    );
    await expect(
      t.query(internal.integrations.queries.executeRead, args),
    ).rejects.toThrow("CONNECTION_APPROVAL_REQUIRED");
    await approve();
    await t.run(async (ctx) => {
      await ctx.db.patch(ids.teamId, { memberPermissions: [] });
    });
    await expect(
      t.query(internal.integrations.queries.executeRead, args),
    ).rejects.toThrow("PERMISSION_DENIED");
  });
  it("rejects mismatching approval, deleted workspaces and foreign conversation IDs", async () => {
    const { t, approve, ids, connectionId } = await fixture();
    await expect(
      t.mutation(internal.integrations.connections.approvePilotConnection, {
        connectionId,
        expectedIssuer: principal.issuer,
        expectedSubject: "user_other",
        expectedOrgId: principal.orgId,
        expectedClientId: principal.clientId,
      }),
    ).rejects.toThrow("CONNECTION_MISMATCH");
    await approve();
    await t.run(async (ctx) => {
      await ctx.db.patch(ids.conversationId, { orgId: "org_foreign" });
    });
    await expect(
      t.query(internal.integrations.queries.executeRead, {
        principal,
        operation: {
          operation: "get_conversation",
          conversationId: ids.conversationId,
          limit: 50,
        },
      }),
    ).rejects.toThrow("NOT_FOUND");
    await t.run(async (ctx) => {
      await ctx.db.patch(ids.teamId, { deletionStatus: "deleting" });
    });
    await expect(
      t.query(internal.integrations.queries.executeRead, {
        principal,
        operation: { operation: "get_connection_context", agentLimit: 10 },
      }),
    ).rejects.toThrow("WORKSPACE_UNAVAILABLE");
  });
});
