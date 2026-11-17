import { expect, it } from "vitest";
import { internal, components } from "../_generated/api";
import { fixture, principal } from "../../tests/integrationFixture";

async function personalFixture() {
  const setup = await fixture();
  const ids = await setup.t.run(async (ctx) => {
    const now = Date.now();
    const personalTeamId = await ctx.db.insert("teams", {
      name: "Personal",
      type: "personal",
      ownerId: setup.ids.userId,
      createdAt: now,
      updatedAt: now,
    });
    const agentFields = {
      name: "Personal support",
      provider: "openrouter" as const,
      model: "test",
      systemPrompt: "Private",
      templateKey: "blank" as const,
      fileSize: 0,
      userId: principal.subject,
      createdAt: now,
      updatedAt: now,
    };
    const personalAgentId = await ctx.db.insert("agents", {
      ...agentFields,
      orgId: "",
    });
    const otherAgentId = await ctx.db.insert("agents", {
      ...agentFields,
      orgId: "",
      userId: "user_other",
    });
    const personalChannelId = await ctx.db.insert("channels", {
      orgId: "",
      service: "whatsapp",
      status: "connected",
      connectedByUserId: principal.subject,
      conversationCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(setup.ids.conversationId, {
      orgId: "",
      assignedAgentId: personalAgentId,
      channelId: personalChannelId,
    });
    const { upsertInboxConversationSummary } =
      await import("../inboxConversationSummary");
    const { upsertInboxChatSearchDocument } =
      await import("../inboxSearchProjection");
    await upsertInboxConversationSummary(ctx, setup.ids.conversationId);
    await upsertInboxChatSearchDocument(ctx, setup.ids.conversationId);
    return { personalTeamId, personalAgentId, otherAgentId, personalChannelId };
  });
  return { ...setup, personal: ids };
}

it("discovers both workspaces with labels and paginates without other owners", async () => {
  const { t, ids, personal } = await personalFixture();
  const found: string[] = [];
  let agentCursor: string | null = null;
  for (let page = 0; page < 6; page++) {
    const result = JSON.parse(
      await t.query(internal.integrations.queries.executeRead, {
        principal,
        operation: {
          operation: "get_connection_context",
          agentLimit: 1,
          agentCursor,
        },
      }),
    );
    for (const item of result.items) {
      found.push(item.agentId);
      expect(item.name).toMatch(/^(Test|Personal) \/ /);
    }
    agentCursor = result.nextCursor;
    if (!agentCursor) break;
  }
  expect(found).toEqual([ids.agentId, personal.personalAgentId]);
});

it("searches personal conversations and rejects another personal agent", async () => {
  const { t, ids, personal } = await personalFixture();
  const operation = {
    operation: "search_conversations" as const,
    agentId: personal.personalAgentId,
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
  expect(result.workspace.name).toBe("Personal");
  await expect(
    t.query(internal.integrations.queries.executeRead, {
      principal,
      operation: { ...operation, agentId: personal.otherAgentId },
    }),
  ).rejects.toThrow("NOT_FOUND");
  await t.run(async (ctx) => {
    await ctx.db.patch(ids.conversationId, { userId: "user_other" });
  });
  const hidden = JSON.parse(
    await t.query(internal.integrations.queries.executeRead, {
      principal,
      operation,
    }),
  );
  expect(hidden.items).toEqual([]);
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
});

it("rechecks personal team ownership and channel ownership", async () => {
  const { t, ids, personal } = await personalFixture();
  const args = {
    principal,
    operation: {
      operation: "get_conversation" as const,
      conversationId: ids.conversationId,
      limit: 50,
    },
  };
  await t.run(async (ctx) => {
    await ctx.db.patch(personal.personalChannelId, {
      connectedByUserId: "user_other",
    });
  });
  await expect(
    t.query(internal.integrations.queries.executeRead, args),
  ).rejects.toThrow("NOT_FOUND");
  await t.run(async (ctx) => {
    await ctx.db.patch(personal.personalChannelId, {
      connectedByUserId: principal.subject,
    });
    await ctx.db.patch(personal.personalTeamId, { deletionStatus: "deleting" });
  });
  await expect(
    t.query(internal.integrations.queries.executeRead, args),
  ).rejects.toThrow("NOT_FOUND");
});

it("reads successful personal messages through the existing connection", async () => {
  const { t, ids } = await personalFixture();
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
          message: { role: "user", content: "Personal question" },
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
  expect(result.workspace.name).toBe("Personal");
  expect(result.items.map((item: { text: string }) => item.text)).toEqual([
    "Personal question",
  ]);
});
